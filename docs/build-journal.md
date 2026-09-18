# Build Journal

Chronological log of real decisions, pivots, and lessons — written as the
project happens, not reconstructed afterward.

---

## M0 — Discovery (2026-09-18)

Ran a structured discovery interview against a fictional but grounded
stakeholder (Alex Nkosi, IT Ops Director) instead of starting from an
assumed spec. The single most useful thing that came out of it wasn't the
workflow diagram — it was the AI responsibility boundary table. Going in, I
assumed confidence score would drive most routing decisions. It doesn't:
Alex was explicit that priority, assignment, and escalation require human
approval regardless of how confident the model is. That's a policy decision,
not a tuning parameter, and it reshaped the whole routing design before any
code existed.

Decision: encode that boundary directly in `lib/routing.ts` as constants,
not just as a note in the discovery brief, so it can't quietly drift as the
build progresses.

## M1 — Environment Setup (2026-09-18)

Scaffolded the repo structure, stub API routes, and Supabase schema before
touching real logic. Kept `lib/classification.ts` and `lib/routing.ts`
separate files on purpose — the split itself is the point of the project,
so the code structure should make it physically impossible to accidentally
let the classifier's confidence score authorise an action it's not supposed
to.

Seed data (`supabase/seed.sql`) uses the actual "buried lede" ticket pattern
from the discovery interview (printer complaint with an ERP outage buried in
the last line) rather than clean synthetic examples — the whole point is to
prove the system handles messy input, so the demo data should be messy too.

## M2 — Intake + Classification (2026-09-18)

Switched the classification provider from the originally planned Claude API
to Google Gemini (`gemini-3.1-flash-lite` via `@google/genai`) — already had
an active API key from Google AI Studio, so this removed a setup step
without changing the architecture. The classification interface
(`ClassificationResult`) is provider-agnostic by design; swapping providers
later would mean rewriting `lib/classification.ts` only, nothing downstream.

The harder decision wasn't which model — it was resisting the urge to have
`/api/classify` also decide routing while I was already in that file. Kept
it strictly to categorisation + extraction, per the M0 scope boundary.
Routing stays entirely in `lib/routing.ts` / `/api/resolve`, built in M3.
This is the actual discipline the project is meant to demonstrate, so it
has to hold in the code, not just in the docs.

Used Gemini's structured output (`responseSchema`) rather than asking for
JSON in a plain prompt and hoping — this removes an entire class of parsing
failures. Where parsing does still fail (malformed response), the route
returns a 502 rather than a fabricated classification. Per the discovery
brief, a failed or low-confidence classification should be treated the same
as "route to human" once M3 adds that logic — never silently guess.

