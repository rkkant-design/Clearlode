# 0002. Adopt AWS as the production stack by adapting NEO

**Date**: 2026-10-01
**Status**: Proposed

## Summary

Move FieldNote to production by adapting the existing NEO app onto AWS, not by rebuilding it. Keep NEO's working application logic, swap its infrastructure to managed AWS services, and replace its OpenAI dependency with Amazon Bedrock. Run in us-east-1 for the widest Bedrock model availability. Netlify stays live as a launch fallback if the migration runs long. This is the foundation the ingestion pipeline (spec 0001) runs on.

## Context

NEO is a working web app on Netlify that already does the core job: it ingests YouTube videos, extracts structured records, serves a filtered feed, and runs a grounded chatbot. Its chatbot is currently broken only because its OpenAI account ran out of credits, which shows the risk of a single external model vendor on a consumer billing path.

FieldNote needs a production home that an enterprise buyer trusts, that removes the OpenAI fragility, and that can hold the records plus the vector search the chatbot needs. The sponsor chose AWS for the robustness and the enterprise trust story (see Strategy/FieldNote-Oct-Delivery-Plan.html). The forces that shape the choice: a hard go live target of end of October, a small team, the need for managed services (no platform engineering function to run orchestration), and the fact that NEO already works so a rebuild would waste its value.

Not deciding leaves the project on a fragile consumer stack with no agreed path to the production posture the sponsor wants.

## Options considered

### Option 1: Adapt NEO onto AWS

Keep NEO's app code, move hosting, data, models, and ingestion to managed AWS services, and swap OpenAI for Bedrock.

**Pros**:
- Reuses a working app, so the fastest route to the enterprise posture.
- Removes the OpenAI billing fragility by moving to Bedrock.
- Managed services only, so no orchestration burden on a small team.

**Cons**:
- AWS is slower to stand up than Netlify, so it pressures the October date.
- Two environments live at once during the cutover.

### Option 2: Rebuild fresh on AWS

Build FieldNote from scratch on AWS to the functional spec.

**Pros**:
- Cleanest long term codebase.

**Cons**:
- 8 to 12 weeks, so it misses end of October.
- Throws away NEO, which already works.

### Option 3: Stay on Netlify plus OpenAI, add a managed Postgres with pgvector

Keep NEO where it is, add a hosted Postgres (for example a managed Postgres with pgvector) for records and search.

**Pros**:
- Fastest of all, lowest schedule risk.

**Cons**:
- Keeps the single vendor model fragility unless the model layer is also changed.
- Not the enterprise trust posture the sponsor chose.
- This is kept as the launch fallback, not the target.

### Option 4: Keep OpenAI, only move the database to AWS

A half step: AWS for data, OpenAI for models.

**Pros**:
- Small change.

**Cons**:
- Leaves the out of credits fragility in place.
- Splits the stack across two clouds for no clear gain.

## Decision

**Chosen option**: Option 1: Adapt NEO onto AWS.

Keep NEO's application logic, host and run it on managed AWS services in us-east-1, and replace OpenAI with Amazon Bedrock. Netlify stays as the launch fallback.

## Rationale

The two forces that decide this are the October date and the enterprise trust posture the sponsor wants. Option 2 satisfies the posture but not the date. Option 3 satisfies the date but not the posture, and keeps the vendor fragility, so it is the fallback rather than the target. Option 4 gains little and keeps the fragility. Option 1 is the only choice that reuses the working app (which protects the date), reaches the AWS posture, and removes the OpenAI billing risk by moving to Bedrock. Managed services are chosen throughout because a small team has no capacity to operate orchestration itself. us-east-1 is chosen because Bedrock model availability (Claude and embeddings) is widest and earliest there, and FieldNote records are public firsthand material, so strict data residency is not a launch constraint (noted for later if European buyers require EU residency).

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Region | us-east-1 | Widest and earliest Bedrock model availability (Claude, embeddings). |
| Frontend hosting | AWS Amplify Hosting (App Runner if NEO is a server app) | Closest managed match to Netlify for a web app, CDN included, fast cutover. |
| App and job compute | Lambda plus Step Functions | Serverless, scales to zero, no orchestration platform to run. Note the serverless tradeoffs below. |
| Primary database and search | Aurora Serverless v2 (PostgreSQL) with pgvector | Relational for records, pgvector for the chatbot retrieval, scales to zero. |
| Models | Amazon Bedrock (Claude for extraction and chat, a Bedrock embeddings model) | Managed model access, removes the OpenAI billing fragility. Bedrock Knowledge Bases is an option for managed retrieval. |
| Auth | Amazon Cognito | Managed auth for the thin reader app and curator roles. |
| Object storage | Amazon S3 | Raw captions and assets. Never store files in the database. |
| Orchestration | Amazon EventBridge plus Step Functions | Scheduled discovery and the human in the loop scrub (task token pattern). |
| Observability | Amazon CloudWatch (logs, metrics, alarms) | Native, added from day one, with the token budget and quota alerts from spec 0001. |

## Migration plan

**Strategy**: strangler. Stand up AWS in parallel, move pieces across, keep Netlify live until AWS passes QA.

**Phases**:
1. Stand up the AWS core in parallel: Aurora with pgvector, Bedrock access, Cognito, S3, CloudWatch.
2. Port the record data and swap the chatbot and extraction from OpenAI to Bedrock. This also fixes the current out of credits break.
3. Move ingestion to Lambda plus Step Functions per spec 0001.
4. Cut the frontend over to Amplify Hosting.

**Rollback**: Netlify plus the current stack stays live through the cutover. If any phase fails or the date is at risk, launch on the Netlify fallback and complete the AWS cutover in early November.

**Risks**: AWS setup drag against the October date; Bedrock model availability in region must be confirmed; Lambda to Aurora needs a connection strategy (RDS Proxy or the Aurora Data API) because serverless functions do not hold persistent Postgres connections.

## Consequences

**Positive**:
- The enterprise trust posture the sponsor wants, on managed services.
- Bedrock removes the single vendor billing fragility that broke NEO's chatbot.
- Scales to zero when idle, which suits a small early corpus.

**Negative / tradeoffs**:
- AWS is slower to stand up than Netlify, so the October date carries real risk (the fallback exists for this reason).
- Serverless brings cold starts and no persistent database connections, so Lambda to Aurora needs RDS Proxy or the Data API.
- More services to operate than a single Netlify app.

**Neutral**:
- us-east-1 means US data residency. Fine for public records now, revisit if EU residency is required.
- Spec 0001 (the ingestion pipeline) runs on this stack and depends on it.

## Follow-up

- [ ] Confirm the Claude model ids available on Bedrock in us-east-1 for extraction and chat, and the embeddings model.
- [ ] Decide the Lambda to Aurora connection method (RDS Proxy or the Aurora Data API).
- [ ] Confirm whether NEO's frontend is a static SPA or a server app, to settle Amplify Hosting vs App Runner.
- [ ] Keep the Netlify fallback live until AWS passes QA.

## References

**Project sources**:
- `AGENTS.md`, the planned production stack and the conventions.
- `docs/scope/scope.md`, feature 10 (this spec governs it) and feature 9 (depends on it).
- `docs/specs/0001-ingestion-pipeline-source-first-cascade.md`, the pipeline that runs on this stack.
- `Strategy/FieldNote-Oct-Delivery-Plan.html`, the delivery decisions and the fallback.
- `Strategy/FieldNote-AWS-Architecture.html`, the earlier AWS reference architecture.

**Practices & standards**:
- Monolith first, managed services over self run orchestration.
- Serverless tradeoffs stated explicitly (cold start, no persistent connections).
- Strangler migration with a live fallback and a rollback path.
- Defer multiple regions until product market fit requires it.
