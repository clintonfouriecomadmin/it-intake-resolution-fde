// M5: computes dashboard metrics from the same tickets/classifications/
// audit_log tables the review queue reads — no separate metrics table, so
// there's nothing to keep in sync.
//
// Headline metric is time-to-human-review for PRIORITY tickets specifically,
// because that's the actual success criteria from the discovery interview
// (docs/discovery-brief.md, section 7) — not generic ticket volume, and not
// an average across all tickets, which would dilute exactly the number Alex
// cares about with routine low-stakes tickets that were never at risk.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TARGET_MINUTES = 15;

export async function GET() {
  const supabase = getServiceClient();

  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select("*");

  if (ticketsError) {
    return NextResponse.json({ error: ticketsError.message }, { status: 500 });
  }

  const ticketIds = (tickets ?? []).map((t) => t.id);
  if (ticketIds.length === 0) {
    return NextResponse.json({ metrics: emptyMetrics() });
  }

  const { data: classifications, error: classError } = await supabase
    .from("classifications")
    .select("*")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: false });

  if (classError) {
    return NextResponse.json({ error: classError.message }, { status: 500 });
  }

  const { data: auditRows, error: auditError } = await supabase
    .from("audit_log")
    .select("*")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: true });

  if (auditError) {
    return NextResponse.json({ error: auditError.message }, { status: 500 });
  }

  const latestClassificationByTicket = new Map<string, any>();
  for (const c of classifications ?? []) {
    if (!latestClassificationByTicket.has(c.ticket_id)) {
      latestClassificationByTicket.set(c.ticket_id, c);
    }
  }

  const auditByTicket = new Map<string, any[]>();
  for (const a of auditRows ?? []) {
    if (!auditByTicket.has(a.ticket_id)) auditByTicket.set(a.ticket_id, []);
    auditByTicket.get(a.ticket_id)!.push(a);
  }

  let classifiedCount = 0;
  let priorityCount = 0;
  let standardCount = 0;
  let reviewedCount = 0;
  let confidenceSum = 0;

  const priorityReviewMinutes: number[] = [];
  const standardReviewMinutes: number[] = [];

  for (const ticket of tickets ?? []) {
    const classification = latestClassificationByTicket.get(ticket.id);
    if (!classification) continue;

    classifiedCount += 1;
    confidenceSum += Number(classification.confidence);

    const auditEntries = auditByTicket.get(ticket.id) ?? [];
    const systemDecision = auditEntries.find((a) => a.decided_by === "system");
    const humanDecision = auditEntries.find((a) =>
      String(a.decided_by).startsWith("human:")
    );

    if (!systemDecision) continue;

    const isPriority = systemDecision.action === "queued_priority";
    if (isPriority) priorityCount += 1;
    else standardCount += 1;

    if (humanDecision) {
      reviewedCount += 1;
      const minutes =
        (new Date(humanDecision.created_at).getTime() -
          new Date(systemDecision.created_at).getTime()) /
        60000;

      if (isPriority) priorityReviewMinutes.push(minutes);
      else standardReviewMinutes.push(minutes);
    }
  }

  const priorityWithinTarget = priorityReviewMinutes.filter(
    (m) => m <= TARGET_MINUTES
  ).length;

  const metrics = {
    totalTickets: (tickets ?? []).length,
    classifiedCount,
    priorityCount,
    standardCount,
    reviewedCount,
    pendingCount: classifiedCount - reviewedCount,
    avgConfidence: classifiedCount > 0 ? confidenceSum / classifiedCount : null,
    avgPriorityReviewMinutes: average(priorityReviewMinutes),
    avgStandardReviewMinutes: average(standardReviewMinutes),
    priorityReviewedCount: priorityReviewMinutes.length,
    priorityWithinTargetCount: priorityWithinTarget,
    priorityWithinTargetPct:
      priorityReviewMinutes.length > 0
        ? (priorityWithinTarget / priorityReviewMinutes.length) * 100
        : null,
    targetMinutes: TARGET_MINUTES,
  };

  return NextResponse.json({ metrics });
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function emptyMetrics() {
  return {
    totalTickets: 0,
    classifiedCount: 0,
    priorityCount: 0,
    standardCount: 0,
    reviewedCount: 0,
    pendingCount: 0,
    avgConfidence: null,
    avgPriorityReviewMinutes: null,
    avgStandardReviewMinutes: null,
    priorityReviewedCount: 0,
    priorityWithinTargetCount: 0,
    priorityWithinTargetPct: null,
    targetMinutes: TARGET_MINUTES,
  };
}
