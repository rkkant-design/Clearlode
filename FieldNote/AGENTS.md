# FieldNote

Project context for AI agents. Keep this file short and global. Area specific rules, when they exist, live in nested AGENTS.md files listed under Context files.

## Project

FieldNote is a self serve library of firsthand enterprise AI deployment records. It shows what other companies actually did with AI, with the evidence and the caveats intact. The launch domain is customer support. It is a Trueinfo Labs product. Name history: Clarion, then Clearlode, then FieldNote. The name is not yet cleared (it collides with the Field Notes notebook brand), so run a domain and trademark check before any external use.

## Stack

Current work is prototypes and strategy documents. There is no running backend yet.

- Prototype: a single HTML file with vanilla JavaScript. No build step, no framework, no package install. State persists in localStorage with a try or catch fallback to memory. The only external load is Google Fonts. Open the file directly in a browser.
- Planned production: adapt the existing NEO app (Netlify plus OpenAI) into FieldNote on AWS. Bedrock for the chatbot and extraction, Aurora Serverless v2 with pgvector for records and search, Cognito for auth, Lambda plus Step Functions for ingestion. Netlify stays as a launch fallback if the AWS migration runs long.
- Data model: Data-Model/fieldnote_schema.sql (Postgres plus pgvector). It still models the earlier concept and needs recentring on the deployment record ontology before the build.

## Repository layout

- Strategy/ business case, functional spec, delivery plan, execution plan, launch scope, AWS architecture, pitch deck.
- Operating-Kit/ record template, editorial method, taxonomy, rights policy, work plan.
- Records/ the content engine: firsthand harvest, record tracker (xlsx plus csv), source registry, sample scrub, worked records.
- Data-Model/ the SQL schema.
- Prototype/ the interactive app. Prototype/FieldNote-App.html is the current main prototype.
- Use-Case-Dossier/ and _Archive/ earlier concept material, kept for reference.

README.md indexes every file with its live artifact link.

## Commands

- No build or test harness yet. Prototypes run as a single HTML file opened in a browser.
- The record tracker is generated with openpyxl (python -m pip install openpyxl).
- This environment has no Node and no pandas. Generate spreadsheets with openpyxl, not pandas.

## Conventions

These rules are the product. Do not bend them.

- Firsthand only. A record exists only when a named person from a named company describes their own deployment in their own public words (a talk, an interview, a podcast, or the company own public writing). Vendor case studies, press articles, and analyst reports are out. Test: would that person recognise this as their own public statement.
- No claim without a source. Every number, model, or architecture detail carries a verbatim quote and a timestamp. Anything unstated is recorded as not_disclosed and shown as such. Never fabricate a quote, a metric, or a timestamp.
- Human scrub before publish. A person confirms every quote against the source, logs the timestamp, checks the metric definitions, and assigns the grade. Nothing reaches the library unverified.
- Evidence grades A to D. A is independent production evidence with a baseline. B is first party disclosure with numbers. C is directional with no baseline. D is an announcement or a claim later walked back.
- Metric hygiene. Deflection, resolution, containment, and handle rate are different things. Never blend them into one number.
- Rights posture. Short excerpt plus link plus timestamp, attributed, transformative research and commentary. Never host or republish the media.
- Two token economies, kept separate. Processing cost is ours (source first cascade, free captions, a cheap model gate before the capable model, caching). The consumption loop costs the user zero tokens (pre computed records, any AI runs server side on our budget, cited, capped).

## Design

- Current app (Prototype/FieldNote-App.html): an enterprise workspace shell. Cool neutral canvas, dark charcoal sidebar, one emerald accent (#177A5C light, #43C79C dark). Inter for the interface, Fraunces for the wordmark and large numbers, IBM Plex Mono for labels. Full dark mode. Give every icon an explicit size so no inline SVG falls back to its default size.
- The strategy documents use an earlier identity (ivory paper, pine green, Fraunces). They are not yet unified with the app.

## Context files

- [docs/scope/scope.md](docs/scope/scope.md) (living development plan and feature status)
