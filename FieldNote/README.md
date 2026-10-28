# FieldNote — project folder

**FieldNote** (a Trueinfo Labs product) — an enterprise AI **deployment-evidence library**: learn from what other companies actually did with AI, with the evidence and the caveats intact. Launch domain: **Customer Support**.
_Name history: Clarion → Clearlode → FieldNote. Name not yet cleared (collides with the "Field Notes" notebook brand) — run domain + in-class trademark checks before external use._

> **Direction note.** The project pivoted (per the pitch deck) from an *AI-adoption decision platform for publishers* to the *deployment-evidence library* above. Folders **Operating-Kit** and **Records** reflect the **current** direction. **Strategy**, **Prototype** and **Use-Case-Dossier** were largely built for the earlier publisher concept (renamed to FieldNote) — kept for reference, partly superseded.

Published artifacts live on claude.ai (links below). This folder holds the working files plus the **source HTML of every artifact**, so you have a local copy of everything. Artifacts are **private** — open each page's Share menu before sending a link.

---

## Project workflow files (JS Mastery skills structure, added 2026-10-01)
| File | What it is |
|---|---|
| `AGENTS.md` | Global project context for any AI agent: stack, repo layout, commands, and the conventions that must not bend (firsthand rule, grades, scrub, rights, token economies). |
| `CLAUDE.md` | One-line pointer to AGENTS.md + the scope plan. |
| `docs/scope/scope.md` | **Living development plan** — at-a-glance table + features grouped by phase (0 Validate → 1 Library → 2 Automate → 3 Scale) with per-feature status. Update it as work moves. |
| `docs/specs/0001-ingestion-pipeline-source-first-cascade.md` | **Architecture spec** (the `architect` phase) — the source-first ingestion cascade: requirements, options, decision, data model, stage surface, build plan, consequences. Governs scope feature 9. |
| `docs/specs/0002-adopt-aws-production-stack.md` | **Architecture spec** — adopt AWS for production by adapting NEO (Bedrock + Aurora/pgvector + Cognito + Lambda/Step Functions, us-east-1, Netlify fallback): options, decision, proposed stack, migration plan, consequences. Governs scope feature 10. |
| `docs/specs/0003-synthetic-profile-pilot-eval.md` | **Feature spec** — the VidCi-style pilot adapted for FieldNote: records stay real, buyers + questions are synthetic. A gold question set + recovery check prove the retrieval/grounding/personalization engine (right records, zero fabrication, out-of-corpus refusal, per-role fit) vs an ungrounded baseline. Governs scope feature 14. |

These follow the [jsmastery-pro/skills](https://github.com/jsmastery-pro/skills) workflow (state lives in files, not chat). The nine skills are installed at `~/.claude/skills/`, so `/scope`, `/audit`, `/architect`, `/develop`, `/check`, `/test`, `/document`, `/sync`, `/debug` are available. `docs/reviews/` (check) is created on demand.

---

## Strategy/  — the business case (earlier publisher framing; reference)
| File | What it is | Live link |
|---|---|---|
| `FieldNote-Launch-Scope.html` | **⭐ SIGNABLE SCOPE CONTRACT (CURRENT)** — locks Phase 0: launch definition, in/out of scope, record quality bar, acceptance criteria, success gate, locked decisions, change control + sign-off block. | https://claude.ai/artifact/RKuJTdZs6NKfnMVEiG8gSW |
| `FieldNote-Execution-Plan.html` | **⭐ PHASED WORKFLOW / TEAM PLAN (CURRENT)** — 6 phases (Mobilize→Scale), owner-tagged tasks across 2 parallel tracks (Eng/Content), exit gates, roster (PL/EL/BE/FE/CU/RV), standing rules. Hand to the team. | https://claude.ai/artifact/Mx53QgeH3srm2S27d6VAwi |
| `FieldNote-Oct-Delivery-Plan.html` | **⭐ GO-LIVE PLAN v2 (CURRENT)** — adapt NEO→AWS + strict firsthand-CS, ~40–60 verified records by 31 Oct: two parallel tracks, keep/add/migrate map, week-by-week, risks + stack-fallback. | https://claude.ai/artifact/JgSLCfPLPLieSF4MDTcvWF |
| `FieldNote-Functional-Spec.html` | **⭐ THE BUILD SPEC (CURRENT)** — source-first ingestion workflow (diagram), record schema, 9 modules + functional requirements, two token economies, architecture, metrics/gate, phased roadmap. | https://claude.ai/artifact/CfUmaAqsX4nbC7rTRHjdRS |
| `FieldNote-Build-Case.html` | **⭐ THE PITCH FOR A SKEPTICAL BOSS (CURRENT)** — validated problem, moat, honest pros/cons, every blocker → override, and a cheap ~6-week go/no-go test. Reflects the deployment-library direction. | https://claude.ai/artifact/Sfro3hUipCMDHY3TQQZTCV |
| `FieldNote-Strategy-Memo.html` | Full market-entry plan (positioning, market, competitors, gap, pricing, sizing, risks) | https://claude.ai/artifact/VBL2ic6WPAc1ietywVtjYN |
| `FieldNote-AWS-Architecture.html` | AWS reference architecture, phased by build stage | https://claude.ai/artifact/4bZtZZAzBZJVcqfzB66gg5 |
| `Fieldnote_Strategy_and_Foundation_Deck_v2.pptx` | The pitch deck that defined the current deployment-library direction | — |

## Operating-Kit/  — how to actually run it (CURRENT)
| File | What it is | Live link |
|---|---|---|
| `FieldNote-Starter-Kit.html` | Record template + editorial method + taxonomy v0 + rights policy (Customer Support) | https://claude.ai/artifact/G13RJZUEGfML8bqPegZ72d |
| `FieldNote-Interview-Kit.html` | Where/how to find & interview practitioners; outreach templates + guide (optional Layer 2) | https://claude.ai/artifact/FDwDbi9eMEnywMmmCNNnym |
| `FieldNote-Work-Plan.html` | One-page two-week team work plan (interviews optional) | https://claude.ai/artifact/KE5GtMSZYLeJ8muBzkUdHc |

## Records/  — the content engine (CURRENT)
| File | What it is | Live link |
|---|---|---|
| `FieldNote-CS-Firsthand-Harvest.md` | **⭐ THE IN-SCOPE HARVEST** — ~21 FIRSTHAND records (named operators on video/podcast) + standing firsthand sources | — |
| `FieldNote-CS-Source-Harvest.md` | Batch 1 — ⚠️ mostly OUT of scope under the firsthand rule (keep only company-blog/talk/podcast/X rows). Reference. | — |
| `FieldNote-CS-Source-Harvest-Batch2.md` | Batch 2 — ⚠️ mostly OUT of scope; **X-Leads list still useful** for outreach. Reference. | — |
| `FieldNote-Record-Tracker.xlsx` | **Production tracker (use this)** — Excel; firsthand evidence-types, Timestamp + Speaker/role columns, dropdowns, Legend tab; **21 firsthand candidates pre-loaded** | — |
| `FieldNote-Record-Tracker.csv` | Same tracker as CSV (alt for Airtable/Notion import) | — |
| `FieldNote-Record-Tracker-Legend.md` | Grade A–D definitions, statuses, column defs | — |
| `FieldNote-Records-Firsthand.html` | **The 3 firsthand worked records** (the gold standard): Klarna (CEO), Chime (COO), Lightspeed (VP Support) — all from the operators' own words | https://claude.ai/artifact/X8RYdjuSiu4kK9oWkWZeCP |

## Data-Model/
| File | What it is |
|---|---|
| `fieldnote_schema.sql` | PostgreSQL schema. NOTE: modelled for the earlier "development × customer" concept — **re-centre on the deployment-record ontology** before building. |

## Prototype/
| File | What it is |
|---|---|
| `FieldNote-App.html` | **⭐⭐ ENTERPRISE SAAS APP (CURRENT — the main prototype)** — full app shell (dark sidebar nav + global search + topbar) with **Dashboard** (KPIs, recommended, coverage bars), **Library** (search/facets/sort), **record detail** (tiers + notes + export/print + related), **Compare** (side-by-side matrix, up to 3), **Collections** (save/shortlist), **Benchmarks** (grade distribution + outcome highlights), grounded **Ask** assistant, **Methodology**. 3 real verified records (Klarna/Chime/Nubank) + 3 candidates. localStorage-backed. Artifact: https://claude.ai/artifact/U8kcH4CuASoWFx4sLYS3VF |
| `FieldNote-Flow-Prototype.html` | Earlier single-flow prototype (home/library/record/chat, editorial design). Superseded by FieldNote-App.html. Artifact: https://claude.ai/artifact/WDhhFu3HnpdZoy3XVh47HG |
| `FieldNote_Interactive_Prototype.html` | The earlier full SPA prototype I edited (rename→FieldNote, bug fixes, positioning, LS shim). Superseded by the flow prototype for the current direction. |
| `FieldNote_Interactive_Prototype (1).html` | A **second, larger** copy (84 KB vs 58 KB) — likely a newer download. ⚠️ **Confirm which is canonical**; I only edited the non-"(1)" file. |

## Use-Case-Dossier/  — earlier publisher-decision concept (reference)
| File | What it is |
|---|---|
| `FieldNote-Use-Case-Dossier.pdf` / `.html` | Evidence-backed "what to do about this AI development" dossier (publisher recommendations) |
| `individual-pdfs/` | The same 6 recommendations as separate per-stakeholder PDFs |

## _Archive/  — superseded
| File | Why archived |
|---|---|
| `Clarion-Strategy-Memo.pdf` | Old Clarion-named strategy PDF (superseded by the FieldNote memo artifact) |
| `old-clearlode-prototype.html` | The earlier, simpler Clearlode prototype (superseded by the SPA) |

---

## Where to start (current direction)
1. Read `Operating-Kit/FieldNote-Work-Plan.html` and hand it to the team.
2. Give every analyst `Operating-Kit/FieldNote-Starter-Kit.html` + `Records/FieldNote-Records-Batch1.html` as the "this is good" standard.
3. Work `Records/FieldNote-CS-Source-Harvest.md` top-down, logging each record in `FieldNote-Record-Tracker.csv`.
