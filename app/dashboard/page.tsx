"use client";

import { useEffect, useState } from "react";

interface Metrics {
  totalTickets: number;
  classifiedCount: number;
  priorityCount: number;
  standardCount: number;
  reviewedCount: number;
  pendingCount: number;
  avgConfidence: number | null;
  avgPriorityReviewMinutes: number | null;
  avgStandardReviewMinutes: number | null;
  priorityReviewedCount: number;
  priorityWithinTargetCount: number;
  priorityWithinTargetPct: number | null;
  targetMinutes: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadMetrics() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/metrics", { cache: "no-store" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMetrics(data.metrics);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 800 }}>
      <h1>Dashboard</h1>
      <p>
        <button type="button" onClick={loadMetrics} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </p>

      {loading && !metrics && <p>Loading…</p>}
      {errorMsg && <p style={{ color: "crimson" }}>Error: {errorMsg}</p>}

      {metrics && (
        <>
          <HeadlineMetric metrics={metrics} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "1rem",
              marginTop: "1.5rem",
            }}
          >
            <StatCard label="Total tickets" value={metrics.totalTickets} />
            <StatCard label="Classified" value={metrics.classifiedCount} />
            <StatCard label="Priority queue" value={metrics.priorityCount} />
            <StatCard label="Standard queue" value={metrics.standardCount} />
            <StatCard label="Reviewed" value={metrics.reviewedCount} />
            <StatCard label="Pending review" value={metrics.pendingCount} />
            <StatCard
              label="Avg. classifier confidence"
              value={
                metrics.avgConfidence !== null
                  ? `${(metrics.avgConfidence * 100).toFixed(0)}%`
                  : "—"
              }
            />
            <StatCard
              label="Avg. standard-queue review time"
              value={formatMinutes(metrics.avgStandardReviewMinutes)}
            />
          </div>

          <p style={{ color: "#666", marginTop: "2rem", fontSize: "0.9em" }}>
            Every number here is derived directly from the audit log — see{" "}
            <code>/api/metrics</code>. Nothing is tracked in a separate
            metrics table that could drift out of sync with what actually
            happened.
          </p>
        </>
      )}
    </main>
  );
}

function HeadlineMetric({ metrics }: { metrics: Metrics }) {
  const {
    priorityReviewedCount,
    priorityWithinTargetCount,
    priorityWithinTargetPct,
    avgPriorityReviewMinutes,
    targetMinutes,
  } = metrics;

  if (priorityReviewedCount === 0) {
    return (
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Priority tickets reviewed within {targetMinutes} min</h2>
        <p style={{ color: "#666" }}>
          No priority tickets have been reviewed yet — submit and review a
          few to populate this.
        </p>
      </div>
    );
  }

  const pct = priorityWithinTargetPct ?? 0;
  const onTarget = pct >= 100;

  return (
    <div style={{ ...panelStyle, borderColor: onTarget ? "#2a7" : "#d33" }}>
      <h2 style={{ marginTop: 0 }}>
        Priority tickets reviewed within {targetMinutes} min
      </h2>
      <p style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0.25rem 0" }}>
        {pct.toFixed(0)}%
      </p>
      <p style={{ color: "#666", margin: 0 }}>
        {priorityWithinTargetCount} of {priorityReviewedCount} priority
        tickets · avg. review time {formatMinutes(avgPriorityReviewMinutes)}
      </p>
      <p style={{ color: "#666", fontSize: "0.9em", marginTop: "0.5rem" }}>
        This is the actual success criteria from discovery (section 7 of the
        discovery brief) — not a generic volume metric.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={panelStyle}>
      <p style={{ color: "#666", margin: 0, fontSize: "0.85em" }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.25rem 0 0" }}>
        {value}
      </p>
    </div>
  );
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  return `${minutes.toFixed(1)} min`;
}

const panelStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 6,
  padding: "1rem",
};
