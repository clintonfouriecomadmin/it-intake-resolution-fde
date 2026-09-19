"use client";

import { useEffect, useState } from "react";

const CATEGORIES = ["hardware", "software", "network", "access", "erp", "other"];
const PRIORITIES = ["low", "medium", "high"];
const TECHNICIANS = ["Sipho", "Dee"];

interface QueueItem {
  ticket: {
    id: string;
    raw_text: string;
    submitter: string | null;
    channel: string | null;
    submitted_urgency: string | null;
    created_at: string;
  };
  classification: {
    category: string;
    extracted_issue: string;
    confidence: number;
  };
  queue: "standard" | "priority";
  reason: string;
}

interface EditState {
  category: string;
  priority: string;
  assigned_to: string;
  notes: string;
}

export default function ReviewPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [reviewerName, setReviewerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadQueue() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/review-queue");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load queue");

      setItems(data.queue);
      setEdits((prev) => {
        const next = { ...prev };
        for (const item of data.queue as QueueItem[]) {
          if (!next[item.ticket.id]) {
            next[item.ticket.id] = {
              category: item.classification.category,
              priority: item.ticket.submitted_urgency === "high" ? "high" : "medium",
              assigned_to: TECHNICIANS[0],
              notes: "",
            };
          }
        }
        return next;
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  function updateEdit(ticketId: string, patch: Partial<EditState>) {
    setEdits((prev) => ({ ...prev, [ticketId]: { ...prev[ticketId], ...patch } }));
  }

  async function submitReview(ticketId: string) {
    if (!reviewerName.trim()) {
      setErrorMsg("Enter your name at the top before approving anything.");
      return;
    }

    const edit = edits[ticketId];
    setSubmittingId(ticketId);
    setErrorMsg("");

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: ticketId,
          reviewer_name: reviewerName.trim(),
          category: edit.category,
          priority: edit.priority,
          assigned_to: edit.assigned_to,
          notes: edit.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");

      // Remove from the visible queue immediately rather than refetching —
      // keeps the reviewer's flow moving through the list without a reload.
      setItems((prev) => prev.filter((i) => i.ticket.id !== ticketId));
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 800 }}>
      <h1>Review Queue</h1>
      <p style={{ color: "#666" }}>
        Every ticket here needs a human decision on priority and assignment —
        the system never sets these on its own, regardless of AI confidence.
      </p>

      <div style={{ marginBottom: "1.5rem" }}>
        <label>
          Reviewing as:{" "}
          <input
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Your name"
          />
        </label>
      </div>

      {errorMsg && <p style={{ color: "crimson" }}>Error: {errorMsg}</p>}
      {loading && <p>Loading queue…</p>}
      {!loading && items.length === 0 && <p>Nothing pending review right now.</p>}

      {items.map((item) => {
        const edit = edits[item.ticket.id];
        if (!edit) return null;

        return (
          <div
            key={item.ticket.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: "1rem",
              marginBottom: "1rem",
              borderLeft:
                item.queue === "priority" ? "4px solid crimson" : "4px solid #ccc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {item.queue === "priority" ? "🔺 Priority" : "Standard"}
              </strong>
              <span style={{ color: "#666", fontSize: "0.9em" }}>
                {new Date(item.ticket.created_at).toLocaleString()}
              </span>
            </div>

            <p style={{ fontStyle: "italic" }}>&ldquo;{item.ticket.raw_text}&rdquo;</p>
            <p style={{ fontSize: "0.9em", color: "#666" }}>
              Submitted by {item.ticket.submitter || "unknown"} via{" "}
              {item.ticket.channel || "unknown channel"}
            </p>

            <p>
              <strong>AI suggested category:</strong> {item.classification.category}{" "}
              ({(item.classification.confidence * 100).toFixed(0)}% confidence)
            </p>
            <p>
              <strong>AI extracted issue:</strong> {item.classification.extracted_issue}
            </p>
            <p style={{ color: "#666" }}>
              <strong>Routing reason:</strong> {item.reason}
            </p>

            <hr />

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <label>
                Category
                <br />
                <select
                  value={edit.category}
                  onChange={(e) => updateEdit(item.ticket.id, { category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Priority
                <br />
                <select
                  value={edit.priority}
                  onChange={(e) => updateEdit(item.ticket.id, { priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Assign to
                <br />
                <select
                  value={edit.assigned_to}
                  onChange={(e) => updateEdit(item.ticket.id, { assigned_to: e.target.value })}
                >
                  {TECHNICIANS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Notes (optional)
              <br />
              <input
                value={edit.notes}
                onChange={(e) => updateEdit(item.ticket.id, { notes: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>

            <div style={{ marginTop: "0.75rem" }}>
              <button
                onClick={() => submitReview(item.ticket.id)}
                disabled={submittingId === item.ticket.id}
              >
                {submittingId === item.ticket.id
                  ? "Submitting…"
                  : edit.category !== item.classification.category
                  ? "Override & Approve"
                  : "Approve"}
              </button>
            </div>
          </div>
        );
      })}
    </main>
  );
}
