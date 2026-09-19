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

## M3 — Deterministic Routing (2026-09-19)

Caught a real modeling mistake before it compounded. The M1 scaffold of
`lib/routing.ts` used `"auto_resolve"` as one of two outcomes, alongside
`"human_review"`. Going back to re-read the discovery brief while
implementing this properly, that's wrong: Alex was explicit that priority,
assignment, and escalation always require human approval, regardless of
confidence. Nothing in this system is supposed to close a ticket
unsupervised — full stop.

So there's no "auto_resolve" outcome at all. What the routing logic actually
decides is which of two human queues a ticket lands in: a standard queue for
routine review at normal pace, or a priority queue when the category is
high-stakes (ERP, access) or the classifier's confidence is too low to trust
even the categorisation. Renamed the routing outcome to `queue: "standard" |
"priority"` and updated the audit log vocabulary to match (`queued_standard`
/ `queued_priority`, `decided_by: "system"` rather than `"ai"`, since routing
is plain rule-based code, not a model call).

This is worth being honest about rather than quietly fixing and forgetting:
it's an easy mistake to make when a system shape looks like a natural
"auto vs. escalate" binary but the actual stakeholder constraint is more
specific than that. Re-reading the source interview instead of working from
my own summary of it is what caught it.

Also decided the confidence threshold (0.75) triggers a priority-queue
routing even for otherwise low-stakes categories, not just high-stakes ones
— a low-confidence categorisation is itself the failure mode that caused the
original buried-ERP-ticket incident in discovery, so it gets the same
treatment as a high-stakes category. This threshold is a placeholder;
justifying or tuning it belongs in `docs/evaluation.md` (M6), not decided
silently in code.

## M4 — HITL Review Queue (2026-09-19)

Deliberately did not add a `status` column to the `tickets` table to track
"pending review." The queue is derived at query time from the audit trail
instead: a ticket is pending if it has a system routing decision but no
`human:<name>` entry yet. This is slightly more work per request but means
the audit log stays the single source of truth — there's no separate status
field that could drift out of sync with what the log actually says happened.

`/api/review` requires a `reviewer_name` on every submission — there's no
anonymous "approve" button. The point of the audit trail is being able to
answer "who decided this," and an unnamed approval would defeat that.

The review UI defaults each ticket's priority from the submitter's own
self-rated urgency, not from the AI classification — the classifier was
explicitly scoped to category and issue extraction only (see M2), and the
UI needed to actually respect that boundary rather than quietly prefilling
priority from a confidence score. The reviewer can override it either way.

## M5 — Dashboard & Metrics (2026-09-19)

Deliberately made the headline metric "% of priority tickets reviewed
within 15 minutes," not a generic ticket-volume count. It would have been
easy to lead with "tickets processed" because it's the biggest, most
satisfying-looking number — but that number says nothing about whether the
actual problem from discovery (serious issues sitting for hours) is fixed.
The 15-minute target and the framing came directly from Alex's own success
criteria in section 7 of the discovery brief, not from a generic
"time-to-resolution" template.

Split average review time by queue (priority vs. standard) rather than one
blended average, for the same reason — a blended number would let a slow
priority-queue outcome hide behind a fast standard queue, which defeats the
point of having two queues at all.

Computed everything in `/api/metrics` from the same tables the review queue
already reads, instead of a separate metrics/events table. At this scale
that's the right tradeoff — one less thing that can drift out of sync with
the audit log, at the cost of recomputing on every dashboard load. Worth
revisiting if ticket volume ever got large enough for that to matter, which
it deliberately hasn't been asked to here.

