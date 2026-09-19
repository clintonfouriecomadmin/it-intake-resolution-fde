"use client";

import { useState, FormEvent } from "react";

const CHANNELS = ["email", "teams", "walk_up", "form"];
const URGENCY_OPTIONS = ["low", "medium", "high"];

type Status = "idle" | "submitting" | "done" | "error";

interface ClassificationRow {
  category: string;
  extracted_issue: string;
  confidence: number;
}

interface RoutingDecision {
  queue: "standard" | "priority";
  reason: string;
}

export default function IntakePage() {
  const [rawText, setRawText] = useState("");
  const [submitter, setSubmitter] = useState("");
  const [channel, setChannel] = useState("form");
  const [submittedUrgency, setSubmittedUrgency] = useState("medium");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ClassificationRow | null>(null);
  const [routing, setRouting] = useState<RoutingDecision | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    setResult(null);
    setRouting(null);

    try {
      const ticketRes = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          submitter,
          channel,
          submitted_urgency: submittedUrgency,
        }),
      });
      const ticketData = await ticketRes.json();
      if (!ticketRes.ok) throw new Error(ticketData.error || "Failed to create ticket");

      const classifyRes = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: ticketData.ticket.id,
          raw_text: rawText,
        }),
      });
      const classifyData = await classifyRes.json();
      if (!classifyRes.ok) throw new Error(classifyData.error || "Classification failed");

      setResult(classifyData.classification);

      const resolveRes = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketData.ticket.id }),
      });
      const resolveData = await resolveRes.json();
      if (!resolveRes.ok) throw new Error(resolveData.error || "Routing failed");

      setRouting(resolveData.decision);
      setStatus("done");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 600 }}>
      <h1>IT Ticket Intake</h1>
      <p style={{ color: "#666" }}>
        Describe the issue however it comes to mind — you don&apos;t need to
        format it neatly.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label>
            What&apos;s going on?
            <br />
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              required
              rows={5}
              style={{ width: "100%" }}
              placeholder='e.g. "Printer on 2nd floor keeps jamming, also I can&apos;t get into the ERP system to close month-end"'
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Your name
            <br />
            <input
              value={submitter}
              onChange={(e) => setSubmitter(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Channel
            <br />
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            How urgent do you think this is?
            <br />
            <select
              value={submittedUrgency}
              onChange={(e) => setSubmittedUrgency(e.target.value)}
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Submitting..." : "Submit ticket"}
        </button>
      </form>

      {status === "error" && (
        <p style={{ color: "crimson", marginTop: "1rem" }}>Error: {errorMsg}</p>
      )}

      {status === "done" && result && (
        <div
          style={{
            marginTop: "1.5rem",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: "1rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Classification result</h2>
          <p>
            <strong>Category:</strong> {result.category}
          </p>
          <p>
            <strong>What we understood:</strong> {result.extracted_issue}
          </p>
          <p>
            <strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%
          </p>
          {routing && (
            <>
              <hr />
              <p>
                <strong>Queue:</strong>{" "}
                {routing.queue === "priority" ? "🔺 Priority review" : "Standard queue"}
              </p>
              <p style={{ color: "#666", marginBottom: 0 }}>{routing.reason}</p>
              <p style={{ fontStyle: "italic", color: "#666" }}>
                Either way, a human still sets priority, assigns a
                technician, and approves any escalation — this system never
                closes a ticket unsupervised. The review queue itself is
                built in M4.
              </p>
            </>
          )}
        </div>
      )}
    </main>
  );
}
