# Clearlode / FieldNote

**FieldNote** (a Trueinfo Labs product) is a firsthand enterprise AI **deployment-evidence library**: learn from what named companies actually did with AI, with the evidence and the caveats intact. Launch domain is **customer support**, now also **software engineering**.

Every record is a named operator from a named company describing their own deployment. Records carry an evidence grade (A to D), quotes with timestamps that deep-link into the source video, and a clearly separated analyst layer (alternatives, cost drivers, ROI framework, readiness, metric definitions) labelled as analysis rather than the operator's own claims.

## Repository layout

- `neo_edge/` — the running product (two apps that share one Supabase database)
  - `admin application/` — FieldNote Curator Console. Vite admin frontend (`src/`) plus a Node/Express backend (`server/`) that runs the discovery pipeline: source-first fetch, the firsthand intake gate, full-transcript extraction, grading, quote timestamping, the analyst enrichment step, and auto-publish on approve.
  - `user application/` — the consumer app. Next.js frontend (`frontend/`) plus an Express backend (`backend/`) that serves the published-only library, record detail, implementation playbooks, Benchmarks, Compare Deployments, Company Explorer, and function tabs.
- `FieldNote/` — strategy memos, prototypes, record harvests, the SQL schema, AWS architecture, and the HTML artifacts.

## Setup

`.env` files and `node_modules/` are intentionally **not** committed. For each app:

1. Copy the template and fill in your own credentials:
   - `neo_edge/admin application/.env.example` → `.env`
   - `neo_edge/user application/backend/.env.example` → `backend/.env`
   - add `frontend/.env.local` with `NEXT_PUBLIC_API_BASE_URL`
2. Install dependencies and run:

```bash
# admin backend (:5000)  and  admin frontend (:3001)
cd "neo_edge/admin application" && npm install && npm run server
cd "neo_edge/admin application" && npm install && npm run dev

# consumer backend (:5001)  and  consumer app (:3000)
cd "neo_edge/user application/backend"  && npm install && npm start
cd "neo_edge/user application/frontend" && npm install && npm run dev
```

Credentials required: Supabase (URL + key), OpenAI (extraction + enrichment), RapidAPI (YouTube + transcripts), and optionally Neo4j.
