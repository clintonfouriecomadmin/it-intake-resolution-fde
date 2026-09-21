# IT Intake & Resolution

Ticket triage system for a manufacturing company's IT helpdesk — classifies
messy incoming tickets, routes low-stakes ones automatically, and escalates
anything high-stakes or low-confidence to a human review queue with a full
audit trail.

Built as a portfolio project demonstrating Forward-Deployed Engineering
practices: deterministic-vs-AI decision splitting, human-in-the-loop design,
and grounding in a real (simulated) stakeholder discovery process.

**Status:** M8 — case study site built, project complete.

- Live demo: _add your Vercel URL here_
- Case study: _add your GitHub Pages URL here_
- [Discovery Brief](docs/discovery-brief.md)
- [Architecture](docs/architecture.md)
- [Evaluation](docs/evaluation.md)
- [Build Journal](docs/build-journal.md)

## Stack

Next.js (App Router) on Vercel · Supabase (Postgres) · Google Gemini
(`gemini-3.1-flash-lite` via the `@google/genai` SDK) for classification
only · deterministic routing logic in code, no AI involved in routing
decisions.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Gemini keys
npm run dev
```

Run `supabase/schema.sql` then `supabase/seed.sql` in the Supabase SQL editor
before testing locally.
