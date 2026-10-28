# FieldNote — Customer Support · Source Register + Candidate Deployments (Layer 1 harvest)

> ⚠️ **PARTLY OUT OF SCOPE under the firsthand rule (2026-09-23).** This batch is MIXED. **Keep only** rows whose source is the practitioner's *own public words* — company engineering blogs, the company's own press (e.g. Klarna's PR), YouTube talks, podcasts, X. **Ignore** vendor case studies (Zendesk / Salesforce / Sierra / Forethought / Decagon-about-customers) and journalist press (DPD, Commonwealth Bank, Cursor). The current in-scope harvest is **`FieldNote-CS-Firsthand-Harvest.md`**.

_Compiled 2026-09-22 from three research passes (vendor case studies · talks/podcasts/blogs · earnings & disclosures). ~41 deduped candidate deployments. Work this list top-down by evidence grade. Verify every claim against its URL before it becomes a record. Grades: A independent production evidence w/ baseline · B named case/eng-blog/first-party disclosure w/ numbers · C vendor case study, usually no baseline · D announcement only._

## Normalize these metrics before anything goes in the library
Vendors use these interchangeably but they are NOT the same — record which one each source means:
- **Deflection** = share of contacts the bot handled so no human was needed (denominator varies!).
- **Resolution / autonomous resolution** = share actually solved (stricter than deflection).
- **Containment** = share kept inside the bot (may include abandons — weakest).
- **Handle rate** = share the AI touched (not necessarily resolved).
- **AHT / handle time**, **FCR** (first-contact resolution), **CSAT/NPS**, **cost per contact**.
Always capture the **baseline** and the **period**, or mark "not disclosed."

---

## (A) SOURCE REGISTER

### Aggregator indexes — START HERE (each links to primary sources)
- ZenML LLMOps Database — https://www.zenml.io/llmops-database — hundreds of tagged production LLM case studies, many CS; each cites its original blog/talk.
- Evidently AI, "55 real-world LLM applications" — https://www.evidentlyai.com/blog/llm-applications

### Vendor case-study libraries
- Zendesk — https://www.zendesk.com/why-zendesk/customers/
- Intercom / Fin — https://fin.ai/customers
- Salesforce Agentforce — https://www.salesforce.com/agentforce/customer-stories/
- Sierra — https://sierra.ai/customers
- Decagon — https://decagon.ai/case-studies
- Ada — https://www.ada.cx/case-studies/
- Forethought — https://forethought.ai/customers
- Cognigy (NiCE) — https://www.cognigy.com/customer-success-stories
- (also exist: Kore.ai, Gorgias, Gladly, Yellow.ai, Sprinklr, Kustomer, Ultimate)

### Engineering / company blogs (recurring real deployment write-ups)
- DoorDash — https://careersatdoordash.com/blog
- Shopify — https://shopify.engineering
- Instacart — https://tech.instacart.com
- Airbnb — https://medium.com/airbnb-engineering
- Uber — https://www.uber.com/blog
- Wayfair — https://www.aboutwayfair.com/careers/tech-blog
- Wealthsimple — https://medium.com/wealthsimple
- Intercom — https://www.intercom.com/blog
- Yelp (via ByteByteGo) — https://blog.bytebytego.com/p/how-yelp-built-yelp-assistant

### Talks & podcasts
- AI Engineer (conf + YouTube) — https://ai.engineer
- Intercom "Future Proof" (Fin build) — https://www.youtube.com/watch?v=mKUQFQobHAg
- No Priors — Decagon's Jesse Zhang — https://open.spotify.com/episode/2YB6c2t8fENRd1BqLdBBkD
- a16z — "Can AI agents finally fix customer support?" — https://a16z.com/podcast/can-ai-agents-finally-fix-customer-support/
- MLOps.community — https://mlops.community/podcast

### Primary / press / independent (high-evidence)
- Klarna newsroom — https://www.klarna.com/international/press
- Octopus Energy press — https://octopus.energy/press/
- Salesforce newsroom (Agentforce) — https://www.salesforce.com/news/stories/agentforce-customer-success-stories/
- Microsoft customer stories — https://www.microsoft.com/en/customers/
- ServiceNow earnings transcripts (Bell Canada) — https://www.fool.com/earnings/call-transcripts/
- ABC News (Commonwealth Bank reversal) — https://www.abc.net.au/news/2025-08-21/cba-backtracks-on-ai-job-cuts-as-chatbot-lifts-call-volumes/105679492

---

## (B) BUILD THESE FIRST — the differentiator records (claim-vs-reality / disclosed failure)
These three are the highest-value records because they show what a vendor case study never will:
1. **Klarna** — win AND walk-back. 2.3M chats/≈700 FTEs, 11→2 min, ~$40M (first-party press, Feb 2024) → then rehired humans for complex cases. Cluster the press release with the reversal coverage. Grade B.
2. **Commonwealth Bank of Australia** — voice-bot cut ~2,000 calls/wk and 45 roles → reversed: call volumes rose, waits blew out, roles reinstated (independent press, ABC, Aug 2025). Grade B. A rare disclosed failure.
3. **Intercom Fin** — vendor aggregate 67% resolution across 40M+ convos vs independent 500-ticket test ~38%. The gap IS the record. Grade C (vendor) + independent counter-test.

---

## (C) CANDIDATE DEPLOYMENTS
WF: 1 order-status · 2 deflection/chatbot · 3 agent-assist. Status column for you to work.

| # | Company | WF | Outcome (baseline?) | Grade | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Klarna | 2 | 2.3M chats/mo ≈700 FTEs; 11→2 min; −25% repeat; ~$40M; **later walked back** | B | https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/ | |
| 2 | Commonwealth Bank | 2 | voice-bot cut ~2k calls/wk & 45 roles → **reversed, roles reinstated** | B | https://www.abc.net.au/news/2025-08-21/cba-backtracks-on-ai-job-cuts-as-chatbot-lifts-call-volumes/105679492 | |
| 3 | Octopus Energy (Arlo) | 2 | ~8k emails/wk = 4% of UK email; 76% CSAT vs 72% human (3-mo trial) | B | https://octopus.energy/press/more-news-press-releases/octopus-energy-s-ai-trial-wins-customer-approval/ | |
| 4 | Air India (AI.g) | 2 | ~4M queries; 97% sessions automated; ~30k Q/day; "$ millions/yr" | B | https://www.microsoft.com/en/customers/story/19768-air-india-azure-open-ai-service | |
| 5 | Bell Canada (ServiceNow) | 2 | deflecting >3M support calls/yr; 90% of dispatch tasks automated (no baseline) | B | https://www.fool.com/earnings/call-transcripts/2025/10/30/servicenow-now-q3-2025-earnings-call-transcript/ | |
| 6 | Vodafone (SuperTOBi) | 2 | ~60M interactions/mo; 63% resolved no-human; NPS +8 | B- | https://www.genesys.com/en-gb/customer-stories/vodafone | |
| 7 | DoorDash (Dasher support) | 2 | hallucinations −90%; severe compliance issues −99%; 2-tier guardrail + LLM-judge | B | https://careersatdoordash.com/blog/large-language-modules-based-dasher-support-automation/ | |
| 8 | DoorDash (eval flywheel) | 2 | sim + LLM-as-judge eval before prod | B | https://careersatdoordash.com/blog/doordash-simulation-evaluation-flywheel-to-develop-llm-chatbots-at-scale/ | |
| 9 | Shopify (Sidekick) | 3 | agentic loop; **reward-hacking** pitfall forced judge+validator fixes | B | https://shopify.engineering/building-production-ready-agentic-systems | |
| 10 | Wayfair (Wilma) | 3 | agent response 12% faster; +2–5% policy adherence; 1 prompt → 40+ templates | B | https://www.aboutwayfair.com/careers/tech-blog/the-evolution-of-wilma-wayfairs-customer-service-agent-copilot | |
| 11 | Instacart | 2 | LACE automated eval (5 dims); precision-vs-pragmatism lesson | B | https://tech.instacart.com/turbocharging-customer-support-chatbot-development-with-llm-based-automated-evaluation-6a269aae56b2 | |
| 12 | Yelp (Assistant) | 2 | prod RAG latency 10s→3.5s; "retrieval is never done" | B | https://blog.bytebytego.com/p/how-yelp-built-yelp-assistant | |
| 13 | Airbnb | 2/3 | Automation Platform v2 rebuilt for LLM support apps (qualitative) | B | https://medium.com/airbnb-engineering/automation-platform-v2-improving-conversational-ai-at-airbnb-d86c9386e0cb | |
| 14 | Uber (Agentic-RAG) | 2 | enhanced agentic-RAG for support precision (qualitative) | B | https://www.uber.com/us/en/blog/enhanced-agentic-rag/ | |
| 15 | Wealthsimple | 2/3 | self-hosted triage; Ada agent ≈10 FTEs of workload | B- | https://medium.com/wealthsimple/get-to-know-our-llm-gateway-and-how-it-provides-a-secure-and-reliable-space-to-use-generative-ai-4fd6eeb6d74d | |
| 16 | Intercom (Fin) | 2 | vendor 67% avg resolution (40M+ convos) vs **independent ~38%** | C | https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes | |
| 17 | Duolingo | 2 | 80% deflection (vs ~30% prior vendor — baseline given) | B- | https://decagon.ai/case-studies/duolingo | |
| 18 | YNAB | 2 | deflection 25%→70% (baseline given) | B- | https://forethought.ai/case-studies/ynab-replaced-a-basic-chatbot-with-forethought-and-saw-deflection-jump-from-25-to-70 | |
| 19 | Curology | 2 | chat 5%→80% of tickets; 65% cost reduction (baseline given) | B- | https://decagon.ai/case-studies/curology | |
| 20 | Databox | 2 | Fin 55% deflection; CSAT 30%→71%; +40% new revenue (baseline given) | B- | https://fin.ai/customers/databox | |
| 21 | Dott | 1 | automated resolution 32%→77% (baseline given) | C+ | https://www.ada.cx/case-study/dott/ | |
| 22 | Rippling | 2 | chat deflection 38%→50% (baseline given) | C+ | https://decagon.ai/case-studies/rippling | |
| 23 | Agibank | 1 | 22,500 loan-status inquiries/mo at 75% deflection | C+ | https://www.salesforce.com/customer-stories/agibank/agentic-loan-support | |
| 24 | TransferGo | 1 | 74% AI handle rate; +38% dept efficiency (no baseline) | C | https://www.zendesk.com/customer/transfergo/ | |
| 25 | Chime | 1/2 | 70% chat & voice resolution (no baseline) | C | https://decagon.ai/case-studies/chime | |
| 26 | Openreach (BT) | 1 | 35% fewer missed appointments; 4.7/5 Trustpilot (no baseline) | C | https://www.cognigy.com/case-study/openreach | |
| 27 | Grammarly | 2 | 87% deflection; 4.2 CSAT; 1.5-wk implementation (no baseline) | C | https://forethought.ai/case-studies/grammarly-achieves-87-deflection-and-4-2-csat-early-with-forethought | |
| 28 | Deezer | 2 | ~30% automated resolution day-one; AI on 85% of contacts (no baseline) | C | https://www.ada.cx/case-study/deezer/ | |
| 29 | GoFundMe | 2 | +20% CSAT (no baseline) | C | https://www.ada.cx/case-study/gofundme/ | |
| 30 | Wiley | 2 | +40% self-service efficiency; 213% ROI (no baseline) | C | https://www.salesforce.com/customer-stories/wiley/ | |
| 31 | Bayer | 2 | 19,000 users in 2 mo; 80%+ satisfaction; 8 languages (no baseline) | C | https://www.cognigy.com/en/case-study/bayer | |
| 32 | ClassPass | 2 | 95% cost reduction; ~10x deflection (no baseline) | C | https://decagon.ai/case-studies/classpass | |
| 33 | Hunter Douglas | 2 | AI AOV +85%; $1M revenue from AI-handled convos (no baseline) | C | https://decagon.ai/case-studies/hunter-douglas | |
| 34 | Jigsaw | 3 | copilot: handling −18%, response −20%, first-assignment −26% (no baseline) | C | https://www.zendesk.com/customer/jigsaw/ | |
| 35 | Achievers | 3 | triage-assisted tier-1 hit 93% FCR (no baseline) | C | https://forethought.ai/case-studies/achievers | |
| 36 | Trustpilot | 3 | Agentforce: 99% support backlog reduction (no baseline) | C | https://www.salesforce.com/customer-stories/trustpilot | |
| 37 | Rocket Mortgage | 2 | Sierra agent 4x higher conversion (no baseline) | C | https://sierra.ai/blog/ai-agents-in-action-rocket-mortgage | |
| 38 | OpenTable | 2 | Agentforce handled 73% of web queries after 3 wks (no baseline) | C | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ | |
| 39 | 1-800Accountant | 2 | 70% of chats autonomously resolved during tax week (no baseline) | C | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ | |
| 40 | Best Buy | 3 | agent-assist: issues resolved up to 90s faster (baseline: manual summaries) | C | https://cloud.google.com/blog/products/ai-machine-learning/introducing-customer-engagement-suite-with-google-ai | |
| 41 | Verizon | 3 | Gemini assist for 28,000 reps; 96% assist accuracy (Google-cited) | C | https://www.cxtoday.com/contact-center/verizon-teams-up-with-google-to-give-28000-customer-support-reps-a-personal-research-assistant/ | |

---

## Coverage gaps → where interviews add the most
- **Deflection is over-covered (~25 rows); order-status (1) and agent-assist (3) are thin.** Vendors market deflection hardest. Prioritise **practitioner interviews** for order-status and agent-assist, where public evidence is weakest.
- **Baselines missing on ~28 of 41.** The whole value-add is closing that gap — via interviews and by clustering corroborating sources.
- **Vendor-heavy.** Balance with the eng-blog (B-grade) and disclosed (B) records, and label vendor rows as vendor-reported.

## Recommended first ~25 records to build
The 3 spotlight (Klarna, CBA, Intercom Fin) + all B/B- rows (#3–15, 17–20) + a spread of the with-baseline vendor rows (#21–23) + 3–4 deflection C-rows for breadth. Then let interviews fill order-status & agent-assist.
