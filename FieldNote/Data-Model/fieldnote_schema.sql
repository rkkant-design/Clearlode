-- ============================================================================
-- FieldNote — data model (PostgreSQL 15+ / Aurora Serverless v2)
-- A Trueinfo Labs product. Companion to the AWS reference architecture.
--
-- Core entities (from the market-entry plan):
--   organization  -> "Organization profile"  (also the tenant / customer)
--   development   -> "Development"            (a verified AI signal)
--   use_case      -> "Use case"               (reusable library item)
--   decision      -> "Decision"               (the rendered decision CARD: development x org)
--   outcome       -> "Outcome"                (what happened after the decision)
-- Supporting: source, evidence, taxonomy_term, tags, brief, activity, audit, users, subscription.
--
-- Conventions: UUID PKs, timestamptz everywhere, updated_at via trigger,
-- shared corpus (development/use_case/source/taxonomy) is GLOBAL; everything
-- customer-specific carries org_id and should be protected with RLS (see end).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector: embeddings / semantic search
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- fuzzy / trigram text matching
CREATE EXTENSION IF NOT EXISTS citext;      -- case-insensitive email

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
CREATE TYPE evidence_grade      AS ENUM ('A','B','C','D');                                  -- A=independent prod evidence ... D=unverified
CREATE TYPE adoption_complexity AS ENUM ('low','medium','high');
CREATE TYPE verdict             AS ENUM ('ignore','monitor','investigate','pilot','adopt','replace');
CREATE TYPE dev_status          AS ENUM ('ingested','classified','in_review','approved','published','archived'); -- editorial lifecycle
CREATE TYPE decision_status     AS ENUM ('open','investigating','piloting','adopted','rejected','parked','superseded'); -- customer lifecycle
CREATE TYPE term_type           AS ENUM ('industry','function','workflow','capability','segment');
CREATE TYPE claim_type          AS ENUM ('capability_release','benchmark','pricing','partnership','regulation','research','vendor_claim','other');
CREATE TYPE data_sensitivity    AS ENUM ('low','medium','high');
CREATE TYPE org_size_band       AS ENUM ('micro','small','mid','large','enterprise');
CREATE TYPE user_role           AS ENUM ('owner','admin','analyst','member','viewer');       -- 'analyst' = internal FieldNote curator
CREATE TYPE subscription_tier   AS ENUM ('pilot','professional','business','enterprise');
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled');
CREATE TYPE activity_type       AS ENUM ('viewed','saved','dismissed','shared','acted','commented');

-- Reusable updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Taxonomy (the proprietary classification — a moat asset)
-- ---------------------------------------------------------------------------
CREATE TABLE taxonomy_term (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        term_type   NOT NULL,
  name        text        NOT NULL,
  slug        text        NOT NULL,
  parent_id   uuid        REFERENCES taxonomy_term(id) ON DELETE SET NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, slug)
);

-- ---------------------------------------------------------------------------
-- Approved-source register (copyright / robots / trust policy per source)
-- ---------------------------------------------------------------------------
CREATE TABLE source (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  url           text,
  kind          text,                       -- vendor_blog | news | research | regulator | benchmark | ...
  license_terms text,
  robots_policy text,
  default_grade evidence_grade,             -- default evidence grade for claims from this source
  is_active     boolean NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ORGANIZATION  (= "Organization profile" AND the tenant/customer account)
-- ---------------------------------------------------------------------------
CREATE TABLE organization (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  industry_id      uuid REFERENCES taxonomy_term(id),   -- primary industry (type='industry')
  size_band        org_size_band,
  geography        text,                                 -- country / region (drives data residency)
  tech_environment jsonb   NOT NULL DEFAULT '{}'::jsonb, -- stack, cloud, key systems
  data_sensitivity data_sensitivity,
  priorities       jsonb   NOT NULL DEFAULT '[]'::jsonb, -- stated business priorities
  constraints      jsonb   NOT NULL DEFAULT '[]'::jsonb, -- budget / regulatory / other limits
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE app_user (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid REFERENCES organization(id) ON DELETE CASCADE, -- NULL for internal FieldNote analysts
  email        citext UNIQUE NOT NULL,
  full_name    text,
  role         user_role NOT NULL DEFAULT 'member',
  cognito_sub  text UNIQUE,                 -- link to Amazon Cognito identity
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz
);
CREATE INDEX idx_user_org ON app_user(org_id);

CREATE TABLE subscription (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  tier                   subscription_tier NOT NULL,
  status                 subscription_status NOT NULL DEFAULT 'trialing',
  seats                  int NOT NULL DEFAULT 1,
  stripe_customer_id     text,              -- billing lives in Stripe (external)
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_org ON subscription(org_id);
CREATE TRIGGER trg_sub_updated BEFORE UPDATE ON subscription FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- DEVELOPMENT  (a verified AI signal — shared corpus, not org-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE development (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  summary        text,
  url            text,
  source_id      uuid REFERENCES source(id),
  publisher      text,
  published_at   date,
  access_date    date,                                   -- when we captured it (citation hygiene)
  claim_type     claim_type NOT NULL DEFAULT 'other',
  evidence_grade evidence_grade,                          -- rolled-up grade for the development
  status         dev_status NOT NULL DEFAULT 'ingested',
  raw_s3_uri     text,                                    -- raw capture in S3 (provenance)
  embedding      vector(1024),                            -- Bedrock/Titan embedding (dim depends on model)
  created_by     uuid REFERENCES app_user(id),            -- internal analyst
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  search_tsv     tsvector GENERATED ALWAYS AS
                   (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,''))) STORED
);
CREATE INDEX idx_dev_status      ON development(status);
CREATE INDEX idx_dev_published   ON development(published_at DESC);
CREATE INDEX idx_dev_search      ON development USING gin(search_tsv);
CREATE INDEX idx_dev_embedding   ON development USING hnsw (embedding vector_cosine_ops);
CREATE TRIGGER trg_dev_updated BEFORE UPDATE ON development FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Claim-level evidence behind a development (drives the A/B/C/D grade)
CREATE TABLE evidence (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id uuid NOT NULL REFERENCES development(id) ON DELETE CASCADE,
  source_id      uuid REFERENCES source(id),
  url            text,
  excerpt        text,
  method         text,                                    -- how the claim was substantiated
  grade          evidence_grade NOT NULL,
  pub_date       date,
  access_date    date,
  corroborated   boolean NOT NULL DEFAULT false,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidence_dev ON evidence(development_id);

-- Development <-> taxonomy tags (industry / function / workflow / capability / segment)
CREATE TABLE development_tag (
  development_id uuid REFERENCES development(id) ON DELETE CASCADE,
  term_id        uuid REFERENCES taxonomy_term(id) ON DELETE CASCADE,
  PRIMARY KEY (development_id, term_id)
);

-- ---------------------------------------------------------------------------
-- USE_CASE  (reusable library item — shared corpus)
-- ---------------------------------------------------------------------------
CREATE TABLE use_case (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  description      text,
  input_desc       text,                                  -- "input"
  output_desc      text,                                  -- "output"
  human_role       text,                                  -- where a human stays in the loop
  requirements     jsonb NOT NULL DEFAULT '[]'::jsonb,     -- data / integration / controls
  risks            jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_measures jsonb NOT NULL DEFAULT '[]'::jsonb,
  embedding        vector(1024),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_uc_embedding ON use_case USING hnsw (embedding vector_cosine_ops);
CREATE TRIGGER trg_uc_updated BEFORE UPDATE ON use_case FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE use_case_tag (
  use_case_id uuid REFERENCES use_case(id) ON DELETE CASCADE,
  term_id     uuid REFERENCES taxonomy_term(id) ON DELETE CASCADE,
  PRIMARY KEY (use_case_id, term_id)
);

-- A development may surface several possible use cases
CREATE TABLE development_use_case (
  development_id uuid REFERENCES development(id) ON DELETE CASCADE,
  use_case_id    uuid REFERENCES use_case(id) ON DELETE CASCADE,
  PRIMARY KEY (development_id, use_case_id)
);

-- ---------------------------------------------------------------------------
-- DECISION  (the rendered decision CARD: a development analyzed for one org)
--   Carries the org-specific analysis fields shown on the card PLUS the
--   customer's decision lifecycle. One card per (org, development).
-- ---------------------------------------------------------------------------
CREATE TABLE decision (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  development_id      uuid NOT NULL REFERENCES development(id) ON DELETE RESTRICT,
  use_case_id         uuid REFERENCES use_case(id),          -- primary suggested use case
  title               text,                                   -- denormalized card title
  company_relevance   text,
  expected_value      text,                                   -- no ROI number before baseline (per plan)
  requirements        text,
  risks               text,
  success_measures    text,
  adoption_complexity adoption_complexity,
  evidence_grade      evidence_grade,                         -- grade at time of recommendation
  verdict             verdict NOT NULL DEFAULT 'monitor',      -- recommended action
  rationale           text,
  assumptions         text,
  status              decision_status NOT NULL DEFAULT 'open', -- customer lifecycle
  owner_user_id       uuid REFERENCES app_user(id),            -- customer-side owner
  next_review_date    date,
  -- editorial / trust
  created_by          uuid REFERENCES app_user(id),            -- internal analyst
  reviewed_by         uuid REFERENCES app_user(id),
  reviewed_at         timestamptz,
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, development_id)
);
CREATE INDEX idx_decision_org        ON decision(org_id);
CREATE INDEX idx_decision_status     ON decision(org_id, status);
CREATE INDEX idx_decision_dev        ON decision(development_id);
CREATE INDEX idx_decision_review     ON decision(org_id, next_review_date);
CREATE TRIGGER trg_decision_updated BEFORE UPDATE ON decision FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- OUTCOME  (what actually happened — the claims-vs-outcomes moat)
-- ---------------------------------------------------------------------------
CREATE TABLE outcome (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id         uuid NOT NULL REFERENCES decision(id) ON DELETE CASCADE,
  pilot_result        text,
  metric_movement     jsonb NOT NULL DEFAULT '{}'::jsonb,      -- {metric: {before, after, unit}}
  implementation_cost numeric(14,2),
  decision_change     text,                                    -- did the recommendation change?
  lessons             text,
  recorded_by         uuid REFERENCES app_user(id),
  recorded_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outcome_decision ON outcome(decision_id);

-- ---------------------------------------------------------------------------
-- BRIEF  (weekly executive brief) + items
-- ---------------------------------------------------------------------------
CREATE TABLE brief (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end   date NOT NULL,
  s3_uri       text,                                          -- rendered brief (PDF/HTML) in S3
  generated_at timestamptz,
  sent_at      timestamptz,                                   -- via SES
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_brief_org ON brief(org_id, period_end DESC);

CREATE TABLE brief_item (
  brief_id    uuid REFERENCES brief(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES decision(id) ON DELETE CASCADE,
  position    int NOT NULL DEFAULT 0,
  PRIMARY KEY (brief_id, decision_id)
);

-- ---------------------------------------------------------------------------
-- WATCHLIST (org tracks vendors / topics / taxonomy terms)
-- ---------------------------------------------------------------------------
CREATE TABLE watchlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  term_id    uuid REFERENCES taxonomy_term(id),              -- or...
  keyword    text,                                           -- ...a free-text watch
  created_by uuid REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_watchlist_org ON watchlist(org_id);

-- ---------------------------------------------------------------------------
-- ACTIVITY (engagement tracking — "opened / saved / dismissed / acted")
--   Powers the go-to-market and success metrics in the plan.
-- ---------------------------------------------------------------------------
CREATE TABLE activity_event (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES app_user(id),
  decision_id    uuid REFERENCES decision(id) ON DELETE SET NULL,
  development_id uuid REFERENCES development(id) ON DELETE SET NULL,
  type           activity_type NOT NULL,
  meta           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_org_time ON activity_event(org_id, created_at DESC);
CREATE INDEX idx_activity_decision ON activity_event(decision_id);

-- ---------------------------------------------------------------------------
-- AUDIT LOG (correction history / trust requirement)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id           bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES app_user(id),
  action       text NOT NULL,                                -- created | updated | published | graded | corrected ...
  entity_type  text NOT NULL,                                -- 'development' | 'decision' | ...
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Multi-tenant isolation (recommended): enable RLS on org-scoped tables and
-- set the tenant per request, e.g.  SET app.current_org = '<org uuid>';
-- Example for one table — repeat for decision/brief/activity/subscription/...
-- ---------------------------------------------------------------------------
-- ALTER TABLE decision ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY decision_tenant ON decision USING (org_id = current_setting('app.current_org')::uuid);
-- (development / use_case / source / taxonomy_term stay global — no RLS.)

-- ============================================================================
-- End of schema.
-- ============================================================================
