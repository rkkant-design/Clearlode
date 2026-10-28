# 0003. Synthetic profile pilot and grounding eval

**Date**: 2026-10-08
**Status**: Proposed

## Summary

A pilot that proves FieldNote's retrieval, grounding, and personalization engine works, before real users and before the AWS build. It borrows VidCi's method (synthetic data plus a recovery check) with one flip that matters: VidCi plants a synthetic dataset and tests its generator, FieldNote keeps the records real and makes only the buyers and the questions synthetic. A gold question set with known correct records, citations, and caveats drives the recovery check. A blind comparison against an ungrounded model stands in for value.

## Context

The build case asks for a cheap test before the pipeline and the AWS spend. VidCi proved its generator on synthetic planted data with a recovery check that confirmed the planted signals showed up. FieldNote cannot copy that directly. Its records must be real and firsthand, that is the whole moat, so a synthetic records corpus is off the table: a strong result on fake records would prove nothing a buyer would trust. What can be synthetic is the demand side, the buyer profiles and the questions they ask.

The forces: a small real corpus (3 verified records now, the eval needs more), the firsthand and no fabrication rules in AGENTS.md, the need to prove the engine before building the pipeline (spec 0001) on AWS (spec 0002), and a separate need this spec does not cover, proving real demand with real customer support leaders. Not deciding leaves the engine judged only by eyeballing the prototype, which is where a hallucination in front of a real buyer gets found at the worst time.

## Requirements

**User stories**:
- As the team, we want proof the retrieval and grounding engine works on real records before we build the pipeline, so we do not build on a weak core.
- As the team, we want proof the assistant never fabricates and refuses out of corpus questions, so trust holds.
- As the team, we want proof different buyer profiles get different, correctly fitted records, so personalization is real, not cosmetic.
- As the team, we want a blind comparison against an ungrounded model, so we can show the value over the status quo.

**Acceptance criteria**:
- **AC-1**: A set of synthetic buyer profiles exists with the fields in Feature design, covering the launch roles, industries, maturities, goals, constraints, and workflows.
- **AC-2**: A gold question set exists, authored by a human reviewer and not by the model under test, each question tagged to a buyer profile and marked in_corpus or out_of_corpus. An in_corpus question carries the expected record ids, expected citations, the expected metric and its caveat, and the expected fit note; an out_of_corpus question carries the expected refusal. Each question may name distractor records that must not be returned.
- **AC-3**: The harness runs each question through the engine blind (the engine never receives the expected answer) and records the retrieved records, the answer, the citations, whether it refused, and the surfaced fit.
- **AC-4**: The recovery check reports, per question and overall: retrieval precision and recall, grounding fidelity (every claim in the answer traces to a real record claim with a quote and timestamp, and fabricated claims are counted), citation correctness, out of corpus refusal rate, and whether the expected caveat surfaced.
- **AC-5**: A personalization check reports, for the same question asked by different profiles, whether the surfaced and prioritized records differ correctly per profile, not identical and not random.
- **AC-6**: A blind baseline comparison runs the same questions through an ungrounded model, and a blind judge (a human, or a separate model, never the model under test) scores FieldNote's grounded cited answer against the ungrounded answer on accuracy and defensibility.
- **AC-7**: The report states the limits plainly: it validates the engine, not demand; a result on a small corpus does not generalize; synthetic buyers are not real willingness to pay.
- **AC-8**: A corpus adequacy gate: the harness refuses to issue an engine quality verdict until the corpus holds at least a configured minimum of verified records (default 20), because retrieval over 3 records is not meaningful.

## Options considered

### Option 1: Synthetic buyers and a gold question set over the real corpus

Keep the records real, make the buyers and questions synthetic, drive a recovery check and a baseline comparison.

**Pros**:
- Proves the engine honestly without fabricating records.
- Cheap and reproducible, reruns on every change.
- Catches hallucination and weak personalization before the build.

**Cons**:
- Needs a real corpus of adequate size first.
- Does not prove demand.
- Authoring the gold set is human work.

### Option 2: Copy VidCi literally, synthesize a fake records corpus with planted signals

**Pros**:
- Retrieval could be tested at any volume immediately.

**Cons**:
- Fabricated records break the firsthand rule and the moat.
- A strong result on fake records proves nothing a buyer would trust. Fatal for FieldNote.

### Option 3: Skip the synthetic eval, go straight to real users

**Pros**:
- Tests demand directly.

**Cons**:
- A hallucination or a mis retrieval is found in front of a real buyer, the most expensive place.
- No cheap pre check, and the build case gate still needs an engine that works.

## Decision

**Chosen option**: Option 1: synthetic buyers and a gold question set over the real corpus, with a recovery check and a blind baseline comparison.

## Rationale

The firsthand rule rules out Option 2 outright, and that is exactly the difference from VidCi. Option 3 is still needed for demand, but it is the wrong first test for the engine: finding a hallucination in front of a real customer support leader is the costliest outcome, so the engine should be proven cheaply first. Option 1 is the only path that proves the engine honestly, keeps the records real, and yields a baseline comparison that stands in for value, while gating on corpus size so the result means something.

## Feature design

**Data model sketch** (a light eval store; it can start as JSON fixtures plus a results file, mirroring VidCi's worker, no backend required):

| Entity | Key fields | Rules |
|---|---|---|
| `profiles` | id, role, industry, company_size, maturity, goal, constraints[], decision_stage, workflows[] | synthetic, no real personal data |
| `questions` | id, profile_id, text, kind (in_corpus or out_of_corpus), expected_record_ids[], expected_citations[], expected_metric, expected_caveat, expected_fit, distractor_record_ids[] | authored by a human reviewer |
| `runs` | id, corpus_version, engine_version, created_at | one per eval run |
| `answers` | id, run_id, question_id, retrieved_record_ids[], answer_text, citations[], refused, surfaced_fit | the engine output, captured blind |
| `grades` | answer_id, retrieval_precision, retrieval_recall, grounded, fabricated_claims, citation_correct, refusal_correct, caveat_present | the recovery check |
| `baseline_answers` | question_id, run_id, ungrounded_text | the status quo output |
| `baseline_judgments` | question_id, run_id, winner (fieldnote, ungrounded, or tie), judge, note | the blind judge |

**State transitions**:
- question: kind is in_corpus or out_of_corpus (fixed at authoring).
- answer: refused is true or false.

**Interface surface** (an internal harness, no public API):

| Command | Inputs | Outputs |
|---|---|---|
| load | profiles.json, questions.json | validated profile and question sets |
| run | the real corpus, profiles, questions | answers captured blind |
| recovery report | answers plus the gold labels | per question and overall grades |
| personalization check | one question across profiles | a difference report |
| baseline compare | questions, the ungrounded model, the judge | baseline judgments |

**Value sourcing**:

| Action | Value produced | Source |
|---|---|---|
| recovery report | retrieval precision and recall | retrieved_record_ids compared to expected_record_ids |
| recovery report | grounded, fabricated_claims | each answer claim checked against the record's real claims (quote and timestamp); a claim with no backing record claim is a fabrication |
| recovery report | refusal_correct | refused equals (kind is out_of_corpus) |
| recovery report | caveat_present | the expected_caveat concept appears in the answer |
| baseline compare | winner | the blind judge |
| corpus gate | adequacy | count of verified records compared to MIN_RECORDS |

**Key invariants**:
- The gold set is authored by a human reviewer, never generated by the model under test.
- The engine runs blind: it never receives the expected answer.
- Grounding is checked against real record claims only. A claim with no backing record claim is a fabrication, is counted, and fails the run.
- No synthetic records enter the corpus. The corpus is the real verified set only.

**Security model**: synthetic profiles carry no real personal data. Records are the existing public firsthand excerpts under the current rights posture.

**Configuration required**:
- `MIN_RECORDS`: the corpus adequacy gate, default 20.
- `UNGROUNDED_MODEL`: the baseline model for the comparison.
- `JUDGE`: a human for the pilot, or a separate model for regression, never the model under test.
- `N_PROFILES`, `N_QUESTIONS`: the target counts.

**Critical test scenarios**:
- Happy path: a known in_corpus question returns the expected record with the correct citation and caveat, verifies **AC-3**, **AC-4**.
- Hallucination guard: an out_of_corpus question is refused, and a temptation question whose answer is almost in a record but not stated returns not_disclosed rather than a fabricated number, verifies **AC-4**.
- Personalization: the same question from a fintech Head of CX and a retail Support Ops surfaces different, correctly prioritized records, verifies **AC-5**.
- Baseline: on a factual question where the ungrounded model guesses, the blind judge prefers FieldNote's cited answer, verifies **AC-6**.
- Corpus gate: with fewer than MIN_RECORDS verified records, the harness reports corpus too small and issues no engine quality verdict, verifies **AC-8**.

## Build plan

1. Define the synthetic profile schema and author the seed profiles as fixtures, satisfies **AC-1**.
2. Define the gold question set schema and author it over the real corpus by a human reviewer, covering in_corpus, out_of_corpus, temptation, and distractor cases, satisfies **AC-2**.
3. Build the harness to run questions blind through the engine and capture its output, satisfies **AC-3**.
4. Build the recovery report (retrieval, grounding, citations, refusal, caveat), satisfies **AC-4**.
5. Build the personalization check across profiles, satisfies **AC-5**.
6. Build the blind baseline comparison, satisfies **AC-6**.
7. Add the limits statement and the corpus adequacy gate, satisfies **AC-7**, **AC-8**.

## Consequences

**Positive**:
- The engine is proven cheaply and honestly before the pipeline and AWS spend.
- Hallucination and weak personalization are caught early.
- A reusable eval that reruns on every change, and a defensible value comparison.

**Negative / tradeoffs**:
- Needs a real corpus of adequate size first, so it depends on scope feature 3.
- Authoring the gold set is human effort.
- Synthetic buyers and a model judge are proxies, not the real market.

**Neutral**:
- The harness can start as scripts over JSON fixtures with no backend, mirroring VidCi's worker, and move onto the AWS stack later.
- It does not replace the build case gate with real users (scope feature 4); it complements it.

## Follow-up

- [ ] Set MIN_RECORDS and the profile and question counts with the team.
- [ ] Decide the blind judge (a human for the pilot, a separate model for regression).
- [ ] Reach the corpus size this eval needs (scope feature 3).
- [ ] Relate this to scope feature 4 (the real user gate) and feature 8 (the Ask assistant).

## References

**Project sources**:
- `AGENTS.md`, the firsthand rule, no fabrication, and metric hygiene.
- `docs/scope/scope.md`, features 3, 4, and 8.
- `docs/specs/0001-ingestion-pipeline-source-first-cascade.md`, the pipeline this eval protects.
- `Strategy/FieldNote-Build-Case.html`, the demand gate this complements.
- `Strategy/FieldNote-Functional-Spec.html`, the engine under test.
- The VidCi pilot method (`vidci/docs/specs/0002-data-model-and-pilot-dataset.md` in the sibling project) as the template this adapts.

**Practices & standards**:
- Gold set evaluation and blind evaluation (no contamination between the author of the answer and the model under test).
- Baseline comparison against the status quo.
- Evaluation driven development (the Nubank lesson, the eval suite is the product).
