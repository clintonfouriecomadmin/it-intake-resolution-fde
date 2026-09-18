# IT Intake & Resolution

Ticket triage system for a manufacturing company's IT helpdesk — classifies
messy incoming tickets, routes low-stakes ones automatically, and escalates
anything high-stakes or low-confidence to a human review queue with a full
audit trail.

Built as a portfolio project demonstrating Forward-Deployed Engineering
practices: deterministic-vs-AI decision splitting, human-in-the-loop design,
and grounding in a real (simulated) stakeholder discovery process.

**Status:** M2 — intake form and Gemini classification working end-to-end.
Routing/auto-resolution not yet built (M3).

- Live demo: _added in M8_
- Case study: _added in M8_
- [Discovery Brief](docs/discovery-brief.md)
- [Architecture](docs/architecture.md) — _added in M7_
- [Build Journal](docs/build-journal.md) — _added throughout_

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
