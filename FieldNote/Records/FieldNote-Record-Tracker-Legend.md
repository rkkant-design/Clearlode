# FieldNote Record Tracker — legend & how to use

Import `FieldNote-Record-Tracker.csv` into Google Sheets, Airtable or Notion. One row = one deployment record (or candidate). Three example rows (the Batch-1 spotlight records) are pre-filled; a blank `FN-CS-004` row shows the empty shape.

---

## Evidence grade — what A / B / C / D mean
The grade rates **how well-substantiated the evidence is** — it is *separate* from how relevant the deployment is. Grade the strongest claim in the record; note weaker claims inline.

| Grade | Meaning | Typical source | Permitted language |
|---|---|---|---|
| **A** | **Independent production evidence** — a named organisation, a disclosed method, and a measurable result **with a baseline**. The gold standard; rare. | Independent benchmark/study with methodology + baseline | "Observed in production" (state the scope) |
| **B** | **Named case study, credible research, or first-party disclosure with real numbers** and a clear methodology. Strong, but self-reported or single-lens. | Engineering blog with method; earnings call; official press with figures | "Reported" / "disclosed" |
| **C** | **Vendor case study, single-source interview, or company account** — plausible but not independently confirmed, and **usually no baseline**. | Vendor "customers" page; one practitioner interview | "Vendor states" / "company reports" |
| **D** | **Announcement, demo, anecdote, or a conflicted / undisclosed-method source.** An early signal only — cite *with* the caveat. | Press release with no data; a competitor's "test"; a demo | "Early signal — not independently verified" |

**Rules:** confidence never raises relevance. Corroboration across independent sources can raise a grade (e.g. C → B). A conflict of interest lowers it (a competitor's benchmark is D even if it has a number). Always capture the **baseline** and **period**, or mark them missing.

---

## Status (production pipeline)
- **Candidate** — on the list, not started
- **Drafting** — being written up
- **Needs source** — a claim can't be tied to a working URL; blocked until fixed
- **In review** — awaiting the editor's second-reviewer sign-off
- **Published** — signed off, in the library
- **Parked** — insufficient/uncorroborated evidence; not worth it now

## Workflow key
**1** = order-status / tracking · **2** = tier-1 FAQ deflection / chatbot · **3** = agent-assist / copilot

## Evidence type
Company-reported · Vendor · Independent · Interview — *label it; never launder a vendor claim into fact.*

## Corroboration
Single-source · Corroborated (2+ independent sources) · Independently-confirmed

## Metric hygiene (put the right word in Key_outcome)
Deflection ≠ Resolution ≠ Containment ≠ Handle-rate. Record which one the source actually means, plus the baseline and period, or "not disclosed."

---

## Column definitions
| Column | What goes in it |
|---|---|
| ID | FN-CS-### (sequential) |
| Status | pipeline stage (above) |
| Owner | analyst producing it |
| Reviewer | editor who signs off |
| Time_min | minutes to produce (track the economics) |
| Right_of_reply | N/A · Pending · Sent · Received |
| Company / Industry | who deployed it |
| Workflow | 1 / 2 / 3 |
| Deployment | one-line description |
| Stage | exploration · pilot · limited production · full production · scaled · rolled back |
| Technology | model/pattern if disclosed, else "not named" |
| Key_outcome | the headline claim — with the metric word, baseline & period |
| Baseline | Yes · Partial · No |
| Cost_disclosed | Yes · No · Partial |
| Evidence_type | Company / Vendor / Independent / Interview |
| Grade | A / B / C / D |
| Corroboration | Single · Corroborated · Independently-confirmed |
| Source_URLs | every claim's source link |
| Challenge | what went wrong / surprised them |
| Lesson_with_condition | the transferable takeaway **and** where it does/doesn't apply |
| Boundaries_gaps | missing data, conflicts, limits — kept visible |
| Notes | anything else (e.g. "spotlight", "vendor cross-customer") |

**Definition of "decision-ready" (before Status → Published):** every material claim sourced, dated & graded · baselines present or marked missing · ≥1 boundary stated · conflicts noted · reviewer signed off.
