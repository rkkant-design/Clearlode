# 0001. Ingestion pipeline as a source first cascade

**Date**: 2026-10-01
**Status**: Proposed

## Summary

Build the content pipeline so that cost rises only as confidence rises. Start from a curated registry of trusted sources, filter on cheap signals first, and spend the capable model only on the few videos that survive. A human scrub stays mandatory before anything publishes. This keeps our processing cost low and keeps every published record verified.

## Context

FieldNote needs records at volume without blowing the processing budget or the trust bar. Open keyword search over YouTube returns mostly noise (tutorials, influencers, vendor demos). Transcribing and running the capable model on all of it spends the most expensive tokens on the least promising inputs. We saw this live: a keyword search for customer support AI returned shorts, influencer clips, and an ad, almost no firsthand enterprise content.

Two hard constraints shape the design. The YouTube Data API has a daily quota (about 10000 units per day, and a search call costs 100 units), so broad search is both noisy and expensive on quota. And nothing may publish unverified (see AGENTS.md): every number carries a quote and a timestamp, and a human confirms it. The pipeline must cut cost early and keep a human in the loop at the end.

Not deciding means one of two bad outcomes: a runaway token bill, or a thin library that never reaches the launch target of roughly 40 to 60 verified records.

## Requirements

**User stories**:
- As a curator, I want new firsthand candidate videos surfaced from trusted sources, so that I do not hand search.
- As a curator, I want the noise filtered cheaply, so that I only review real candidates.
- As the business, I want processing cost bounded per record, so that margins hold.
- As a reader, I want every published record verified, so that I can trust it.

**Acceptance criteria**:
- **AC-1**: Discovery lists new videos from the registry using metadata only, with no model call.
- **AC-2**: The cheap gate uses free captions plus a small model and drops any video that is not a firsthand, named company, customer support deployment, recording a reason for each drop.
- **AC-3**: Extraction runs the capable model only on gate passers, grounds every populated field with a verbatim quote and a timestamp, and sets any unstated value to not_disclosed. A claim with no quote fails validation.
- **AC-4**: No record reaches published without a human scrub approval.
- **AC-5**: Processing cost per published record stays within a configured budget, and the daily YouTube quota is never exceeded.
- **AC-6**: A video is processed at most once (dedupe by video id), and gate and extraction results are cached.

## Options considered

### Option 1: Source first cascade

A curated registry seeds discovery. Each stage is cheaper than the next: metadata discover, then a cheap gate on free captions, then capable extraction only on passers, then human scrub, then publish.

**Pros**:
- Cheapest path, the expensive model runs on well under 20 percent of discovered videos.
- Highest firsthand yield, because the registry is already trusted sources.
- Protects the YouTube quota (listing a channel or playlist costs far less than search).

**Cons**:
- The registry needs upkeep (hit rate tracking and retiering).
- Misses a good source until someone adds it to the registry.

### Option 2: Keyword first crawl

Search YouTube broadly on AI keywords, then filter the results.

**Pros**:
- Wide reach with no registry to maintain.

**Cons**:
- About 90 percent noise, so most spend is wasted.
- Burns search quota fast (100 units per search call).
- Spends the capable model on junk, and still has poor firsthand yield.

### Option 3: Buy vendor case study feeds or third party datasets

Ingest ready made case study collections.

**Pros**:
- Immediate volume.

**Cons**:
- Not firsthand, so it is out of scope by our core rule.
- No control over quality, and licensing cost.

## Decision

**Chosen option**: Option 1: Source first cascade.

Build the pipeline as six stages where cost rises only as confidence rises: Registry, Discover, Cheap gate, Extract, Scrub, Publish.

## Rationale

The two forces that decide this are processing cost and the firsthand rule. Option 2 fails both: it wastes the capable model on noise and lowers firsthand yield, the opposite of what the budget and the trust bar need. Option 3 fails the firsthand rule outright. Option 1 spends cheap signals first (metadata, free captions, a small model) and reserves the capable model for the small set that is likely to become a record, which is the only option that holds both the budget and the quota while keeping yield high. The human scrub at the end is non negotiable regardless of option, so it is kept as the final stage.

## Feature design

**Data model sketch**:
- `sources` (id, type[youtube_channel|playlist|podcast|x], url, tier[A|B], domain, hit_rate, active)
- `videos` (video_id PK, source_id FK, title, description, channel, duration_s, published_at, views, status, gate_reason)
- `transcripts` (video_id FK, text, lines jsonb[ts,text], captions_source[creator|auto|whisper])
- `records` (id FN-CS-NNNN, video_id FK, company, industry, workflow text[], speaker, grade, status, fresh_date, last_reviewed)
- `claims` (id, record_id FK, field, quote, timestamp, metric_type)
- `record_chunks` (id, record_id FK, text, timestamp, embedding vector)
- `entities` (id, company, canonical) for dedupe of one company across many videos

**State transitions**:
- video: `discovered` → `gated_out` | `passed` → `extracted` → `in_review` → `published` | `archived`
- record: `candidate` → `in_review` → `published` | `hold`

**Stage surface** (internal jobs, no public write):

| Stage | Trigger | Key inputs | Key outputs | Auth | Key failures |
|---|---|---|---|---|---|
| Discover | schedule | registry Tier A | new video rows | internal | quota exhausted |
| Cheap gate | new video | free captions + small model | pass or gated_out + reason + fields present | internal | captions disabled |
| Extract | passed | transcript + schema (capable model) | record + claim rows | internal | unsourced claim |
| Embed | new record | record text | record_chunks vectors | internal | none critical |
| Scrub | human | record beside source | approve to published | curator | reject to hold |

**Value sourcing**:

| Action | Value produced | Source |
|---|---|---|
| Discover | video metadata | YouTube Data API |
| Cheap gate | firsthand yes or no, company, speaker | small model over free captions |
| Extract | each record field | capable model grounded in the transcript |
| Extract | any unstated field | not_disclosed (never invented) |
| Scrub | evidence grade A to D | the human reviewer |
| Accounting | cost per record | sum of token usage per video divided by published count |

**Key invariants**:
- A record is never published without a scrub approval.
- Every claim row has a non empty quote and a timestamp.
- A video id is unique and processed once.
- The capable model runs only on rows with status `passed`.

**Security model**: internal pipeline, curator and admin roles write, readers see only published records. No public write path.

**Configuration required**:
- `YOUTUBE_API_KEY`: discovery.
- `BEDROCK_GATE_MODEL`, `BEDROCK_EXTRACT_MODEL`, `BEDROCK_EMBED_MODEL`: the two model tiers plus embeddings.
- `MAX_TOKENS_PER_RECORD`: per record processing budget.
- `MONTHLY_TOKEN_CAP`: hard cap that raises an alert before the limit.

**Critical test scenarios**:
- Happy path: a registry video that is a firsthand customer support deployment flows discover, gate pass, extract, scrub, publish, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
- Failure case: a tutorial video is gated out with a recorded reason and never reaches extraction, verifies **AC-2**, **AC-5**.
- Quota guard: discovery stops before the daily unit cap is reached, verifies **AC-5**.
- Dedupe: a video already seen is skipped, verifies **AC-6**.
- Grounding: an extracted field with no quote fails validation, and absent fields render as not_disclosed, verifies **AC-3**.

## Build plan

1. Create the schema and migration for sources, videos, transcripts, records, claims, record_chunks, entities, satisfies **AC-6** and is the foundation for the rest.
2. Build the Discover job (YouTube Data API, list channels and playlists not search, metadata filter, quota budget, dedupe by video id), satisfies **AC-1**, **AC-5**, **AC-6**.
3. Build caption retrieval (free captions first, Whisper fallback when captions are disabled) with caching, satisfies **AC-2**, **AC-6**.
4. Build the Cheap gate (small model classifier that records pass or reject, a reason, and which fields are present), satisfies **AC-2**.
5. Build Extraction (capable model to the record schema, a quote and timestamp per field, not_disclosed for absent values, validation that rejects any unsourced claim, prompt caching of the schema), satisfies **AC-3**.
6. Build the embed step into pgvector for the chatbot (supports the Ask assistant, not an AC here).
7. Build the Scrub review queue (record shown beside its source, approve flips status to published), satisfies **AC-4**.
8. Build cost accounting with budget and quota alerts, satisfies **AC-5**.

## Consequences

**Positive**:
- Bounded processing cost and a safe YouTube quota.
- High firsthand yield because discovery starts from trusted sources.
- The human gate is preserved, so trust holds.

**Negative / tradeoffs**:
- The registry needs ongoing upkeep (hit rate tracking and retiering).
- Off registry sources are missed until someone adds them.
- Two model tiers to maintain and tune.

**Neutral**:
- New infrastructure (Lambda, Step Functions, Aurora with pgvector, Bedrock). This pipeline runs on the AWS migration, so it depends on that spec.
- YouTube caption access is fragile and may need a managed transcription fallback in production.

## Follow-up

- [ ] Confirm the small model for the gate and the capable model for extraction on Bedrock.
- [ ] Decide the production caption method (captions API vs managed transcription) given YouTube restrictions.
- [ ] Write the AWS migration spec (scope feature 10) that this pipeline runs on.

## References

**Project sources**:
- `AGENTS.md`, the firsthand rule, no claim without a quote, metric hygiene, and the two token economies.
- `docs/scope/scope.md`, feature 9 (this spec governs it).
- `Strategy/FieldNote-Functional-Spec.html`, the end to end workflow.
- `Records/FieldNote-Source-Registry.html`, the registry tiers and the cheap gate pass rule.

**Practices & standards**:
- Source first filtering, cheapest signal first.
- Human in the loop review before publish.
- Idempotent processing keyed by video id.
