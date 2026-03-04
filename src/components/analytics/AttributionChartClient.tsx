"use client";

import { useState } from "react";

type GroupBy = "source" | "campaign" | "medium";
type Entry = { label: string; count: number };

export default function AttributionChartClient({
  bySource,
  byCampaign,
  byMedium,
}: {
  bySource: Entry[];
  byCampaign: Entry[];
  byMedium: Entry[];
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("source");

  const dataMap: Record<GroupBy, Entry[]> = { source: bySource, campaign: byCampaign, medium: byMedium };
  const data = dataMap[groupBy].slice(0, 15);
  const max = Math.max(...data.map((d) => d.count), 1);
  const hasAny = bySource.length > 0 || byCampaign.length > 0 || byMedium.length > 0;

  return (
    <div>
      {/* Group by toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>Group by</span>
        {(["source", "campaign", "medium"] as GroupBy[]).map((g) => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            style={{
              padding: "3px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: "var(--radius-full)",
              border: `1px solid ${groupBy === g ? "var(--blue-400)" : "var(--border-default)"}`,
              background: groupBy === g ? "rgba(74,158,255,0.10)" : "transparent",
              color: groupBy === g ? "var(--blue-400)" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {!hasAny ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0, textAlign: "center", padding: "var(--space-8) 0" }}>
          No attributed bookings yet. Add UTM parameters to your booking links.
        </p>
      ) : data.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>No data for this group.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {data.map(({ label, count }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <span
                style={{
                  width: 130,
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  flexShrink: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {label || "(not set)"}
              </span>
              <div
                style={{
                  flex: 1,
                  background: "var(--surface-subtle)",
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                  height: 8,
                }}
              >
                <div
                  style={{
                    width: `${Math.max((count / max) * 100, 2)}%`,
                    background: "linear-gradient(90deg, #7b6cf6, var(--blue-400))",
                    height: "100%",
                    borderRadius: "var(--radius-full)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span
                style={{
                  minWidth: 32,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
