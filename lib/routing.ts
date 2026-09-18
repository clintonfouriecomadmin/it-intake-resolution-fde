// Deterministic routing logic — NO AI calls in this file.
//
// This encodes the AI responsibility boundary agreed with the stakeholder
// in M0 (docs/discovery-brief.md, section 6). Confidence score alone never
// authorises auto-execution of anything except categorisation and issue
// extraction. Priority, assignment, and escalation always route to the
// human review queue, regardless of how confident the classifier is.

import { ClassificationResult, TicketCategory } from "./classification";

// Categories that are always treated as high-stakes per the discovery
// interview (section 3): ERP-wide outages, production-floor systems,
// security issues near month-end, and anything with exec/site-manager
// involvement. Hardcoded here rather than left to the model's judgment.
export const HIGH_STAKES_CATEGORIES: TicketCategory[] = ["erp", "access"];

export const ACTIONS_ELIGIBLE_FOR_AUTO_EXECUTION = [
  "categorise",
  "extract_issue",
] as const;

export const ACTIONS_REQUIRING_HUMAN_APPROVAL = [
  "assign_technician",
  "set_priority",
  "escalate",
  "request_missing_info",
] as const;

export type RoutingDecision = {
  route: "auto_resolve" | "human_review";
  reason: string;
};

export function decideRouting(
  classification: ClassificationResult
): RoutingDecision {
  // M3: implement the full rule set. Skeleton below shows the two
  // conditions already known from discovery — flesh out thresholds
  // and additional rules during M3.

  if (HIGH_STAKES_CATEGORIES.includes(classification.category)) {
    return {
      route: "human_review",
      reason: `Category '${classification.category}' is always high-stakes per discovery brief`,
    };
  }

  // Placeholder confidence threshold — revisit and justify in
  // docs/evaluation.md during M3/M6.
  const CONFIDENCE_THRESHOLD = 0.75;
  if (classification.confidence < CONFIDENCE_THRESHOLD) {
    return {
      route: "human_review",
      reason: `Confidence ${classification.confidence} below threshold ${CONFIDENCE_THRESHOLD}`,
    };
  }

  return {
    route: "auto_resolve",
    reason: "Low-stakes category, confidence above threshold",
  };
}
