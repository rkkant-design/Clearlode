# FieldNote scope

Living development plan. Status lives here, not in chat. Update it as features move. See [AGENTS.md](../../AGENTS.md) for stack and conventions.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Editorial method and evidence grades | 0 Validate | existing |
| 2 | Source registry | 0 Validate | done |
| 3 | Firsthand records corpus | 0 Validate | in-progress |
| 4 | Validation test and go/no go gate | 0 Validate | planned |
| 5 | Name clearance | 0 Validate | planned |
| 6 | Interactive prototype (workspace app) | 1 Library | done |
| 7 | Record transcript and source excerpts | 1 Library | done |
| 8 | Grounded Ask assistant | 1 Library | in-progress |
| 9 | Ingestion pipeline (source first cascade) | 2 Automate | planned |
| 10 | NEO to AWS migration | 2 Automate | planned |
| 11 | Scrub review tooling | 2 Automate | planned |
| 12 | Freshness automation and versioning | 3 Scale | planned |
| 13 | New workflows, then new domains | 3 Scale | planned |
| 14 | Synthetic profile pilot and grounding eval | 0 Validate | planned |

## Phase 0 Validate

### 1. Editorial method and evidence grades  (existing)

Intent: a repeatable way to turn a firsthand source into a trustworthy record.

Done when: grades A to D, the firsthand rule, metric hygiene, and the rights policy are written and applied to real records.

- [x] Starter kit with the record template and editorial method
- [x] Grades and scrub checklist defined

Spec: Operating-Kit/FieldNote-Starter-Kit.html

### 2. Source registry  (done)

Intent: know where firsthand customer support records come from before crawling.

Done when: a ranked registry exists with tiers and a cheap gate rule a curator can run.

- [x] Tier A and Tier B channels listed with expected yield
- [x] Cheap gate pass rule and keyword signals written

Spec: Records/FieldNote-Source-Registry.html

### 3. Firsthand records corpus  (in-progress)

Intent: a small set of verified records that proves the method and seeds the library.

Done when: roughly 40 to 60 verified records exist, each passing the quality bar.

- [x] 3 verified records scrubbed (Klarna, Chime, Nubank)
- [ ] scrub the current candidates (Lightspeed, Cisco, Playtomic)
- [ ] reach ~40 verified records

Code: Records/ (harvest, tracker, sample scrub). Spec: Strategy/FieldNote-Launch-Scope.html

### 4. Validation test and go/no go gate  (planned)

Intent: prove demand before building the automated pipeline.

Done when: the records plus a role page are in front of 10 to 15 customer support leaders and the gate is measured.

- [ ] put the prototype and ~20 records in front of real users
- [ ] measure repeat use, decision impact, willingness to pay
- [ ] record the go or no go decision

Spec: Strategy/FieldNote-Build-Case.html

### 5. Name clearance  (planned)

Intent: confirm the FieldNote name is usable before external launch.

Done when: domain and in class trademark checks are complete, or a rename is decided.

- [ ] run domain and trademark checks
- [ ] decide keep or rename

### 14. Synthetic profile pilot and grounding eval  (planned, from spec 0003)

Intent: prove the retrieval, grounding, and personalization engine on the real corpus before the build, using synthetic buyers and a gold question set (the records stay real; only the buyers and questions are synthetic).

Done when: the recovery check passes on an adequate corpus (right records surfaced, every claim grounded, cited, out of corpus questions refused, different roles get different fitted records) and a blind baseline beats an ungrounded model.

- [ ] author synthetic buyer profiles and the gold question set
- [ ] build the harness, recovery report, personalization check, baseline compare
- [ ] run once the corpus reaches the minimum size (feature 3)

Spec: docs/specs/0003-synthetic-profile-pilot-eval.md

## Phase 1 Library

### 6. Interactive prototype (workspace app)  (done)

Intent: a clickable product that shows the full user flow on the real records.

Done when: a user can pick a role, browse and filter the library, open a tiered record, compare deployments, save a shortlist, and read benchmarks.

- [x] app shell with sidebar nav and global search
- [x] dashboard, library, record detail, compare, collections, benchmarks, methodology
- [x] localStorage for role, saved, compare, notes, recently viewed

Code: Prototype/FieldNote-App.html. Spec: Strategy/FieldNote-Functional-Spec.html

### 7. Record transcript and source excerpts  (done)

Intent: show the proof behind the quotes inside each record.

Done when: a record shows a timestamped transcript excerpt (spoken sources) or first party excerpts (written sources), with a link to the original and a rights note.

- [x] transcript section with real captured lines (Klarna)
- [x] first party excerpt fallback for written sources (Chime, Nubank)

Code: Prototype/FieldNote-App.html

### 8. Grounded Ask assistant  (in-progress)

Intent: let a user ask in plain language and get answers only from verified records.

Done when: answers come only from the corpus, are cited, refuse out of corpus questions, and cost the user no tokens.

- [x] deterministic grounded stand in in the prototype (cited, refuses out of corpus)
- [ ] production RAG on Bedrock, server side, rate capped

Code: Prototype/FieldNote-App.html. Spec: Strategy/FieldNote-Functional-Spec.html

## Phase 2 Automate

### 9. Ingestion pipeline (source first cascade)  (planned)

Intent: produce records cheaply at volume while protecting our processing budget.

Done when: registry crawl, metadata discover, cheap gate, capable model extract, human scrub, and publish run as a cascade.

- [ ] discovery on YouTube metadata only, no model
- [ ] cheap gate on free captions plus a small model
- [ ] extraction to the record schema, every field grounded
- [ ] human scrub queue, nothing auto publishes

Spec: docs/specs/0001-ingestion-pipeline-source-first-cascade.md

### 10. NEO to AWS migration  (planned)

Intent: move the working NEO app onto AWS as FieldNote.

Done when: Aurora with pgvector holds records, Bedrock serves the chatbot and extraction, and the app runs on AWS. Netlify fallback stays available.

- [ ] provision Aurora and Bedrock
- [ ] swap OpenAI for Bedrock
- [ ] port ingestion to Lambda plus Step Functions

Spec: docs/specs/0002-adopt-aws-production-stack.md

### 11. Scrub review tooling  (planned)

Intent: give the curator a screen to confirm a draft before it becomes verified.

Done when: a reviewer sees the extracted record beside its source, confirms quotes and timestamps, grades it, and publishes.

- [ ] review queue with record beside source
- [ ] approve to flip status to verified

Spec: Strategy/FieldNote-Functional-Spec.html

## Phase 3 Scale

### 12. Freshness automation and versioning  (planned)

Intent: keep records current as models and claims change.

Done when: records carry dates, decay flags, and a re review cadence.

- [ ] date and last reviewed on every record
- [ ] decay flag and re review queue

### 13. New workflows, then new domains  (planned)

Intent: widen coverage only where users pull.

Done when: a new customer support workflow, then a new domain (document processing or software engineering), is added with real records.

- [ ] add the next customer support workflow
- [ ] evaluate the next domain

## Legend

Status
- existing: predates this plan, already in place.
- planned: not started.
- in-progress: started, not finished.
- done: complete and verified.

Phase
- 0 Validate: prove the method and the demand before building.
- 1 Library: the user facing product, prototype first, then production.
- 2 Automate: the ingestion pipeline and the AWS build.
- 3 Scale: freshness, more workflows, more domains.

## /scope complete

Planning decisions
- The product is self serve and firsthand only. Launch domain is customer support. See AGENTS.md for the rules that must not bend.
- The build adapts the existing NEO app onto AWS rather than a fresh build. Netlify is the launch fallback.
- Launch is quality over volume: roughly 40 to 60 verified records, not 1000.
- The workflow taxonomy is tier 1 deflection, agent assist, and disputes and transactions. Order status was dropped because our records are fintech, not retail. A record can span more than one workflow.

Next steps
- Scrub the remaining candidates toward the ~40 record target (feature 3).
- Run the validation test and record the gate decision (feature 4).
- Only after the gate passes, start the ingestion pipeline and the AWS migration (features 9 and 10).

Open questions
- Name clearance for FieldNote (feature 5).
- Whether to unify the strategy document design with the app design.
