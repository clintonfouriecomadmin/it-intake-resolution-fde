// Deterministic routing logic — NO AI calls in this file.
//
// This encodes the AI responsibility boundary agreed with the stakeholder
// in M0 (docs/discovery-brief.md, section 6): priority, assignment, and
// escalation ALWAYS require human approval, regardless of classification
// confidence. There is no fully-automated resolution path in this system —
// what varies is which queue a ticket lands in, i.e. how urgently a human
// needs to look at it.
//
// (Note: an earlier version of this file used "auto_resolve" as an outcome,
// which implied the system could close a ticket unsupervised. That
// contradicted the discovery interview and was corrected in M3 — see
// docs/build-journal.md.)

import { ClassificationResult, TicketCategory } from "./classification";

// Categories that are always treated as high-stakes per the discovery
// interview (section 3): ERP-wide outages and access/security issues near
// month-end. Hardcoded here rather than left to the model's judgment.
export const HIGH_STAKES_CATEGORIES: TicketCategory[] = ["erp", "access"];

// Below this confidence, a low-stakes-looking category still gets bumped to
// the priority queue for a human to double-check the categorisation itself —
// this is the guard against a repeat of the "buried ERP line" incident from
// discovery, where a misread ticket sat for half a day.
const CONFIDENCE_THRESHOLD = 0.75;

export type Queue = "standard" | "priority";

export interface RoutingDecision {
  queue: Queue;
  reason: string;
}

export function decideRouting(
  classification: ClassificationResult
): RoutingDecision {
  if (HIGH_STAKES_CATEGORIES.includes(classification.category)) {
    return {
      queue: "priority",
      reason: `Category '${classification.category}' is always high-stakes per discovery brief section 3`,
    };
  }

  if (classification.confidence < CONFIDENCE_THRESHOLD) {
    return {
      queue: "priority",
      reason: `Confidence ${classification.confidence.toFixed(
        2
      )} below threshold ${CONFIDENCE_THRESHOLD} — categorisation itself needs a human check`,
    };
  }

  return {
    queue: "standard",
    reason: "Low-stakes category, confidence above threshold",
  };
}
