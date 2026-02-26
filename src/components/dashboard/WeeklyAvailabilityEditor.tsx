"use client";

import type { WeeklyAvailability } from "@/lib/event-type-config";

const DAYS: Array<{ key: string; label: string; short: string }> = [
  { key: "0", label: "Sunday", short: "Sun" },
  { key: "1", label: "Monday", short: "Mon" },
  { key: "2", label: "Tuesday", short: "Tue" },
  { key: "3", label: "Wednesday", short: "Wed" },
  { key: "4", label: "Thursday", short: "Thu" },
  { key: "5", label: "Friday", short: "Fri" },
  { key: "6", label: "Saturday", short: "Sat" },
];

function hourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

export default function WeeklyAvailabilityEditor({
  value,
  onChange,
}: {
  value: WeeklyAvailability;
  onChange: (v: WeeklyAvailability) => void;
}) {
  function updateDay(dayKey: string, patch: Partial<WeeklyAvailability[string]>) {
    onChange({
      ...value,
      [dayKey]: { ...value[dayKey], ...patch },
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {DAYS.map((day) => {
        const row = value[day.key];
        return (
          <div
            key={day.key}
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr 16px 1fr",
              gap: "var(--space-2)",
              alignItems: "center",
              padding: "var(--space-2) var(--space-3)",
              background: row.enabled ? "var(--surface-page)" : "var(--surface-subtle)",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${row.enabled ? "var(--border-default)" : "var(--border-subtle)"}`,
              opacity: row.enabled ? 1 : 0.55,
              transition: "opacity 0.15s, background 0.15s",
            }}
          >
            <label
              style={{
                fontSize: 13,
                color: row.enabled ? "var(--text-primary)" : "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontWeight: row.enabled ? 600 : 400,
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => updateDay(day.key, { enabled: e.target.checked })}
                style={{ accentColor: "var(--blue-400)", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
              />
              {day.label}
            </label>
            <select
              className="select"
              disabled={!row.enabled}
              value={row.start_hour}
              onChange={(e) => updateDay(day.key, { start_hour: Number(e.target.value) })}
              style={{ fontSize: 12 }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{hourLabel(i)}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}>–</span>
            <select
              className="select"
              disabled={!row.enabled}
              value={row.end_hour}
              onChange={(e) => updateDay(day.key, { end_hour: Number(e.target.value) })}
              style={{ fontSize: 12 }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{hourLabel(i)}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
