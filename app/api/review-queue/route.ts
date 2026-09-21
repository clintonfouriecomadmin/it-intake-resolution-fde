// M4: builds the review queue by joining tickets, their latest
// classification, and their audit trail — in application code rather than a
// SQL view, since this is small-scale and the logic is easier to follow
// here than hidden in a view.
//
// A ticket is "pending" if it has a system routing decision (queued_standard
// or queued_priority) but no human decision yet. Once a human:<name> entry
// exists for a ticket, it drops out of the queue.

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const supabase = getServiceClient();

  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (ticketsError) {
    return NextResponse.json({ error: ticketsError.message }, { status: 500 });
  }

  const ticketIds = (tickets ?? []).map((t) => t.id);
  if (ticketIds.length === 0) {
    return NextResponse.json({ queue: [] });
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
    // classifications already sorted desc, so first hit per ticket is latest
    if (!latestClassificationByTicket.has(c.ticket_id)) {
      latestClassificationByTicket.set(c.ticket_id, c);
    }
  }

  const auditByTicket = new Map<string, any[]>();
  for (const a of auditRows ?? []) {
    if (!auditByTicket.has(a.ticket_id)) auditByTicket.set(a.ticket_id, []);
    auditByTicket.get(a.ticket_id)!.push(a);
  }

  const queue: any[] = [];

  for (const ticket of tickets ?? []) {
    const classification = latestClassificationByTicket.get(ticket.id);
    if (!classification) continue; // not classified yet — nothing to review

    const auditEntries = auditByTicket.get(ticket.id) ?? [];
    const systemDecision = [...auditEntries]
      .reverse()
      .find((a) => a.decided_by === "system");
    const alreadyReviewed = auditEntries.some((a) =>
      String(a.decided_by).startsWith("human:")
    );

    if (!systemDecision || alreadyReviewed) continue;

    queue.push({
      ticket,
      classification,
      queue: systemDecision.action === "queued_priority" ? "priority" : "standard",
      reason: systemDecision.notes,
    });
  }

  // Priority items surfaced first.
  queue.sort((a, b) => {
    if (a.queue === b.queue) return 0;
    return a.queue === "priority" ? -1 : 1;
  });

  return NextResponse.json({ queue });
}
