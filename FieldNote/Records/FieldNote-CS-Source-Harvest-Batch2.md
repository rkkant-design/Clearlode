# FieldNote — Customer Support · Source Harvest BATCH 2 (+ YouTube & X)

> ⚠️ **PARTLY OUT OF SCOPE under the firsthand rule (2026-09-23).** **Keep only** firsthand rows — YouTube talks, podcasts, X, company's own posts. **Ignore** vendor case studies and journalist press (incl. the DPD & Cursor failure rows, which were press-sourced). The **X-Leads** list stays useful (people to approach for right-of-reply). Current in-scope harvest: **`FieldNote-CS-Firsthand-Harvest.md`**.

_Compiled 2026-09-22 from three passes: YouTube · X/Twitter · new-companies. All NEW vs Batch 1 (~40 companies excluded). Grades: A independent+baseline · B reputable press / primary w/ numbers · C vendor/practitioner claim, usually no baseline · D vague/projected/marketing. Same rules: verify each claim against its URL before it becomes a record; label vendor-reported; mark missing baselines; normalize the metric (deflection ≠ resolution ≠ containment)._

---

## BUILD NEXT — the differentiator records (disclosed failures)
Independently press-documented failures. Highest-value records — no vendor case study prints these.
1. **DPD** (parcel delivery) — disabled its AI chatbot (Jan 2024) after it **swore at a customer and wrote a poem calling itself "useless"** and DPD the "worst delivery service." Grade B. https://www.itv.com/news/2024-01-19/dpd-disables-ai-chatbot-after-customer-service-bot-appears-to-go-rogue
2. **Cursor / Anysphere** (dev tools) — support bot "Sam" **hallucinated a login/one-device policy that didn't exist** (Apr 2025); spread on Reddit/HN and **triggered subscription cancellations**; company relabeled AI replies. Grade B. https://www.theregister.com/2025/04/18/cursor_ai_support_bot_lies/

---

## (A) SOURCE REGISTER — new channels to add

### YouTube (the big unlock: AWS re:Invent "BIZ" track = named operators + numbers on stage)
- **AWS Events channel** — re:Invent breakout "BIZ" track (Amazon Connect customer sessions). START HERE. https://www.youtube.com/@AWSEventsChannel
- AWS re:Invent 2024 Business-Apps playlist — https://www.youtube.com/playlist?list=PL2yQDdvlhXf8ME7oJDTz2vhcfGepYa-j7
- AWS re:Invent 2025 breakouts — https://www.youtube.com/playlist?list=PL2yQDdvlhXf9gdFFBcDPUHAJS7kkIkIet (Zepz, Petco, Traeger, Cochlear, So Energy flagged in AWS's 2025 blog — pull these next)
- AWS Contact Center blog (text index mapping company → session → video) — https://aws.amazon.com/blogs/contact-center/
- Google Cloud — CCAI customer stories (Home Depot, M&S, Macy's) — https://www.youtube.com/@googlecloud
- Salesforce (Agentforce stories) · Zendesk AI Summit/Relate · Sierra Summit 2025 · NiCE Cognigy (Lufthansa/Bosch) · Cresta webinars (agent-assist)

### X / Twitter — practitioner accounts (mostly for LEADS; content gated, treat as anecdotal)
- **@dimitrimasin / @GradientLabsAI** (fintech support agents) · **@stevehind** (Lorikeet) · **@MattiSchroder** (Commslayer) · vendor: @SierraPlatform, @fin_ai, @MavenAGI, @ultiai, @gorgiasio
- Search patterns (run on web, X blocks fetch): `site:x.com "deflection rate" OR "resolution rate" support AI <company>` · `<founder> AI support agent resolved tickets thread` · higher yield: **X posts quoted inside articles** (CX Today, SignalFire, Fintech Futures)

---

## (B) CANDIDATE DEPLOYMENTS — Batch 2 (deduped, graded)
WF: 1 order-status · 2 deflection/chatbot · 3 agent-assist.

| Company | WF | Outcome (baseline?) | Grade | Source | URL |
|---|---|---|---|---|---|
| Air Canada | 1,2 | 78% inquiries self-served; calls −15%; cargo productivity +20%; ~190 FTE ≈ C$4.7M savings | B | re:Invent 2024 talk (S. Cosgrove + AWS) | https://www.youtube.com/watch?v=VX6DDLa7UyI |
| Pearson | 3 | $2.5M savings; CSAT 94%; NPS 42→47 (baseline given) | B | re:Invent 2024 BIZ215 (Shantel Love, VP CS) | https://www.youtube.com/watch?v=sdpgkzyMlGs |
| State Farm | 1,2 | self-service resolution ~0.5%→30%+; transfers down (verify figure on-screen) | B/C | re:Invent 2024 BIZ221 | https://www.youtube.com/watch?v=LBeQoHRshZY |
| Cisco | 2,3 | 145,000 support cases resolved autonomously in FY26 (no per-case quality/baseline) | C+ | Q4 FY26 earnings (Chuck Robbins) via CX Today | https://www.cxtoday.com/service-management-connectivity/cisco-agentic-ai-145000-support-cases/ |
| NatWest | 2,3 | Amazon Q agent-assist pilot; "Cora" ~11M convos in 2024, ~half no-human (press, not on-screen) | C | re:Invent 2024 + AWS blog | https://www.youtube.com/watch?v=zbrLI6ktTcg |
| US Bank | 3 | Amazon Q in Connect + Claude real-time assist; **pilot, no metrics disclosed** (honesty datapoint) | C | AWS/ZenML | https://www.zenml.io/llmops-database/real-time-ai-agent-assistance-in-contact-center-operations |
| Frontdoor | 3 | Amazon Q pilot to cut agent ramp via next-best-response (no baseline) | C | re:Invent 2024 | https://www.youtube.com/watch?v=CiV8infVNFw |
| Coinbase | 2 | consolidated phone+chat into one omnichannel stack; relaunched 7 countries; cut disconnects | C | re:Invent 2024 BIZ217 | https://www.youtube.com/watch?v=_PDj7na0EXw |
| Home Depot | 1,2 | "Magic Apron" concierge + AI phone agent; call-containment cited +185% (Google-framed; verify) | C | Google Cloud story | https://www.youtube.com/watch?v=c8t_KZeqfVw |
| Brinks Home | 3 | transfers **30%→8%** (baseline); 92% FCR; NPS +30; ~50% cost cut | C | Cresta case study | https://cresta.com/customers/brinks-home |
| Fisher & Paykel | 2 | self-service **40%→70%** (baseline given) | C | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| Shoe Carnival | 2 | escalations **75%→35%** (baseline); handles 40% of calls | C | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| Accolade | 3 | after-call work reduced >50% (no baseline) | C | Observe.AI | https://www.observe.ai/customers/accolade-drives-member-engagement-with-over-50-reduction-in-after-call-work |
| Snap Finance | 3 | AHT −40% (no baseline) | C | Cresta | https://cresta.com/customer-stories |
| Achieve | 3 | after-call work −75%; 3x ROI (no baseline) | C | Cresta | https://cresta.com/customer-stories |
| Aptive Environmental | 3 | 46% call-save rate; $2.37M revenue (no baseline) | C | Cresta | https://cresta.com/customer-stories |
| Engine | 1 | cancellation automation: AHT −15%; ~$2M/yr savings (no baseline) | C | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| Saks | 1 | Agentforce handles routine order-status/returns (no number) | D | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| Engie | 2 | FAQ agent "assisting 83%" of billing users (no baseline) | C | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| El Jannah | 2 | 60% of inbound requests handled (no baseline) | C | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| Grupo Falabella | 2 | WhatsApp service interactions to 71% in 3 weeks (no baseline) | C | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| OluKai | 2 | 70% automated resolution; 4.5/5 CSAT; −50% cancellations (no baseline) | C | Sierra | https://sierra.ai/customers |
| SoFi | 2 | +33 NPS points (no baseline) | C | Sierra | https://sierra.ai/customers |
| Sonos | 2 | tier-1 product support; automation "up to 90%" (no baseline) | C | Sierra | https://sierra.ai/customers |
| MeUndies | 2 | 80% containment; support capacity +3.7x in peak (no baseline) | C | Forethought | https://forethought.ai/customers |
| ActiveCampaign | 2 | deflects >60% of chat tickets (no baseline) | C | Forethought | https://forethought.ai/customers |
| YAZIO | 2 | 80% ticket deflection; CSAT held 6 months (no baseline) | C | Forethought | https://forethought.ai/customers |
| Lime | 2 | −77% response time (no baseline) | C | Forethought | https://forethought.ai/customers |
| Vercel | 2 | −31% support tickets via iterative rollout (no CSAT baseline) | C | own eng team, via X | https://x.com/vercel/status/1831054564193439985 |
| Singapore Airlines | 3 | Agentforce summarizes interactions; "reduces response times" (no number) | D | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| Finnair | 2 | TARGET to automate 80% of CS questions (projected, not achieved) | D | Salesforce | https://www.salesforce.com/news/stories/agentforce-customer-success-stories/ |
| reMarkable | 2 | "Mark" FAQ agent ~35% cases; CSAT on par; 18k convos (marketing short) | D | Salesforce | https://www.youtube.com/shorts/dIAU7dnSwQY |

_Tangential (contact-center analytics/WFM, not the 3 core workflows) — noted, not prioritised: Toyota (Contact Lens theming), Fujitsu (AI WFM/QM), Adobe (qualitative), Kawasaki/CaixaBank (Agentforce, no numbers)._

---

## (C) X-LEADS — outreach / right-of-reply list (NOT records yet)
Named, reachable practitioners who already posted a specific claim → warm targets to confirm the baseline (doubles as design-partner intro). Claims here are anecdotal (C/D) until confirmed.

| Person | Role / company | Their claim | Handle / URL |
|---|---|---|---|
| **Dimitri Masin** | CEO, Gradient Labs (ex-Monzo); customers Wise, Plum, LHV | "20+ pt resolution gains, 98% CSAT" | @GradientLabsAI · https://x.com/GradientLabsAI/status/1999456697882988746 |
| **Steve Hind** | Co-founder, Lorikeet (ex-Stripe); Airwallex, Linktree | complex/regulated support; 100% automated QA | @stevehind · https://x.com/stevehind/status/1841827314323358172 |
| **Sarung Tripathi** | VP CX, Together AI | client hit "96% automation" via proactive support | via https://www.signalfire.com/blog/ai-agents-for-customer-support |
| **Aaron Lee** | CEO, Smith.ai | across 5,000+ customers, ~20% of AI calls ask for a human | via https://www.signalfire.com/blog/ai-agents-for-customer-support |
| **Max Al Farakh** | Founder team, Jitbit | 70 of 104 tickets one-shotted; honest failure notes | https://www.jitbit.com/news/ai-answered-support-tickets-for-a-week/ |
| **Jamie Hopper** | Customer Service Mgr, Pockit | ticket backlog −95% in 3 months (2021) | @ultiai · https://x.com/ultiai/status/1404753003274461191 |
| **Matti Schröder** | Founder, Commslayer | removed ~80% of tickets in ~5 min setup | @MattiSchroder · https://x.com/MattiSchroder/status/2011868721288266034 |
| **Nate B Jones** | AI News & Strategy Daily | agent closed 51/52 tickets, then killed upstream process → 52→19 next week | https://agentconn.com/blog/agent-closed-51-support-tickets-2026/ |
| **Ty Given** | Founder, The CX Collective | "AI amplifies broken systems" — agent-assist/handoff failure mode | (quoted in CX Today / SignalFire) |

**Excluded (unverified):** the "78% deflection → billing customers churned 1.7×" thread — repeated across sites but no original author/company traceable. Do not use until sourced.

---

## Coverage notes
- **Order-status (WF1) is still genuinely thin** even after YouTube — Air Canada, State Farm, Home Depot, Saks, Engine are the closest, none a pure order-tracking talk. WF1 records will lean on the **X-leads / right-of-reply**, not desk research.
- **Strongest new evidence:** the AWS re:Invent BIZ talks (Air Canada, Pearson — named operators, numbers) and the two disclosed failures (DPD, Cursor). **Next highest-yield move:** pull the re:Invent **2025** Connect breakouts (Zepz "−30% contacts," Petco, Traeger, Cochlear, So Energy).
- **Provenance risk:** 11+ rows share one Salesforce success-stories page; Cresta rows share one page. Treat all vendor C/D as marketing claims until primary-confirmed.
