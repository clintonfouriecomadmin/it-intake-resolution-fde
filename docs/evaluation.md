# Evaluation — Confidence Threshold, Failure Modes, and What Actually Broke

This isn't a theoretical write-up. Everything below is grounded in real
tests run against a working build in M6, including two real bugs found and
fixed — not a hypothetical "here's how we'd test this" document.

## Confidence Threshold Methodology

The routing threshold (`CONFIDENCE_THRESHOLD = 0.75` in `lib/routing.ts`) is
currently a placeholder chosen by judgment, not tuned against a labeled
dataset — there isn't enough real ticket volume yet to do that properly.
What it's calibrated against instead is the specific failure pattern from
discovery: a categorisation the classifier isn't confident about should get
a second (human) look before anything is decided on top of it, same as a
high-stakes category always does.

**Important nuance found during testing:** confidence measures the model's
certainty about *its own categorisation*, not the inherent classifiability
of the input. Submitting deliberately nonsensical text ("asdf") produced a
confident classification of "unclear/nonsensical input" — the model was
correctly, confidently sure that the input was garbage. This is desirable
behaviour, not a gap: the ticket still lands in the standard queue (since
it's not high-stakes) for a human to make sense of, which is the right
outcome for genuinely ambiguous input. The threshold is not a general input-
quality filter and shouldn't be read as one.

## Failure Modes Tested (M6)

| Test | Result | Action taken |
|---|---|---|
| Garbage/near-empty input ("asdf") | Confidently categorised as unclear/nonsensical | None needed — correct behaviour, documented above |
| Buried-lede ticket (trivial complaint + serious issue at the end) | Extraction caught the real issue; correctly routed to priority queue | None needed — this is the core scenario the project was built around, and it worked |
| Simulated Gemini outage (invalid API key) | **Bug found:** ticket was created in `tickets` but classification failed with a 401, and the old code wrote nothing further — the ticket became permanently invisible to `/review` and `/dashboard`. Confirmed via direct inspection of the `classifications` table. | **Fixed.** `/api/classify` now inserts a fallback classification (category `other`, confidence `0`) on any AI failure instead of aborting. Confidence `0` guarantees the existing threshold rule routes it to the priority queue — no new routing logic needed, just a guarantee that a classification always exists. |
| Missing required fields (empty POST body) | **Bug found:** an entirely empty request body caused `request.json()` to throw uncaught, returning a bare 500 instead of a clean validation error. | **Fixed.** Added `lib/http.ts` with a shared `parseJsonBody` helper; every POST route now returns a proper 400 on unparseable input. |
| Reviewer override | Audit log correctly recorded `action: "reviewer_overrode"`; ticket disappeared from the queue as expected | None needed |

## Why the Gemini-outage bug mattered more than it looks

The project's entire premise is preventing a serious issue from silently
disappearing — that was Alex's stated problem in discovery, caused there by
a human triage gap. The exact same failure shape reappeared here, just
caused by an AI outage instead: a ticket existed, was never surfaced to a
human, and there was no error visible anywhere in the product to indicate
it needed attention. That's a more convincing argument for "design for
failure" than any amount of describing the principle in a README — the
system had to actually fail this way, get caught, and get fixed.

## Known Limitations Not Yet Addressed

- If the Supabase write itself fails (database outage) during the fallback
  path, a ticket could still end up orphaned. Not fixed here — a database
  outage is a rarer, different failure class than an LLM API outage, and
  addressing both in the same pass would have blurred what M6 was testing.
- No retry/backoff on transient Gemini errors (e.g. a momentary 503) before
  falling back — currently any failure, transient or not, goes straight to
  the fallback path. Acceptable for a portfolio-scale system; a production
  version would likely retry once before treating it as a true outage.
- The confidence threshold (0.75) has not been tuned against real labeled
  data, per the methodology note above.

## Production Hardening — Deliberately Out of Scope Here

The fallback classification (M6) solves the correctness problem: no ticket
is ever silently lost. It does not solve resilience or availability —
running on a single LLM provider with no retry queue means the priority
queue itself takes the hit every time Gemini has an outage or rate-limits.
Two changes would address that in a production version of this system,
neither implemented here since the point of this build is the AI/human
decision boundary, not distributed-systems infrastructure:

- **Multi-provider failover** — try a primary model (e.g. Gemini), and on
  failure attempt a secondary provider (e.g. Claude) before falling back to
  the confidence-0 human-routing path. This turns a single vendor's outage
  into a transient blip instead of a guaranteed priority-queue spike, at the
  cost of maintaining prompt/schema parity across two providers.
- **A message queue in front of classification** (RabbitMQ, SQS, or similar)
  instead of a synchronous request/response call from `/api/classify` —
  decouples ticket intake from classification entirely, enables exponential
  backoff retries, and gives a dead-letter queue for tickets that fail
  repeatedly, rather than routing every single failure straight to human
  review on the first attempt.

Both are standard patterns for hardening an AI-in-the-loop pipeline at
production scale. They're named here rather than built to keep this
project's scope matched to what a weekend-plus-evenings portfolio build can
credibly demonstrate — the correctness fix (M6) is the one that mattered
for proving the AI/human boundary holds under failure; the availability
improvements above are the natural next step if this went to production.

## Note on Test Data

Several tickets created during the Gemini-outage test (before the fix)
remain permanently orphaned in the database under the old behaviour —
they exist in `tickets` with no matching `classifications` row. These are
harmless leftover test data, not evidence of an ongoing issue; they can be
deleted directly from the Supabase table editor if a clean demo state is
wanted before recording a walkthrough.
