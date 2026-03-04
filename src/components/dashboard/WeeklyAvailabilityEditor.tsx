"use client";

import * as React from "react";
import {
  type AvailabilityBlockers,
  type AvailabilityRange,
  type WeeklyAvailability,
} from "@/lib/event-type-config";

const DAYS: Array<{ key: string; label: string; short: string }> = [
  { key: "0", label: "Sunday", short: "Sun" },
  { key: "1", label: "Monday", short: "Mon" },
  { key: "2", label: "Tuesday", short: "Tue" },
  { key: "3", label: "Wednesday", short: "Wed" },
  { key: "4", label: "Thursday", short: "Thu" },
  { key: "5", label: "Friday", short: "Fri" },
  { key: "6", label: "Saturday", short: "Sat" },
];

function hourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const period = normalized >= 12 ? "PM" : "AM";
  const h12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${h12}:00 ${period}`;
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarGrid(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatRange(range: AvailabilityRange) {
  return `${hourLabel(range.start_hour)}-${hourLabel(range.end_hour)}`;
}

function hasAvailabilityOnDate(
  date: Date,
  weeklyAvailability: WeeklyAvailability,
  blockers: AvailabilityBlockers
) {
  const iso = toIsoDate(date);
  const weekday = date.getDay();
  if (blockers.dates.includes(iso) || blockers.weekdays.includes(weekday)) {
    return "blocked" as const;
  }
  const row = weeklyAvailability[String(weekday)];
  if (!row?.enabled || row.ranges.length === 0) {
    return "unavailable" as const;
  }
  return "available" as const;
}

export default function WeeklyAvailabilityEditor({
  value,
  onChange,
  blockers,
  onBlockersChange,
  showBlockers = true,
}: {
  value: WeeklyAvailability;
  onChange: (value: WeeklyAvailability) => void;
  blockers: AvailabilityBlockers;
  onBlockersChange: (value: AvailabilityBlockers) => void;
  showBlockers?: boolean;
}) {
  const [pendingDate, setPendingDate] = React.useState("");
  const [showCalendarPreview, setShowCalendarPreview] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  function updateDay(dayKey: string, updater: (current: WeeklyAvailability[string]) => WeeklyAvailability[string]) {
    onChange({
      ...value,
      [dayKey]: updater(value[dayKey]),
    });
  }

  function setDayEnabled(dayKey: string, enabled: boolean) {
    updateDay(dayKey, (current) => {
      const ranges =
        enabled && current.ranges.length === 0
          ? [{ start_hour: current.start_hour ?? 9, end_hour: current.end_hour ?? 17 }]
          : current.ranges;
      return {
        ...current,
        enabled,
        ranges,
      };
    });
  }

  function updateRange(dayKey: string, index: number, patch: Partial<AvailabilityRange>) {
    updateDay(dayKey, (current) => {
      const ranges = current.ranges.map((range, rangeIndex) =>
        rangeIndex === index ? { ...range, ...patch } : range
      );
      const sorted = [...ranges].sort((a, b) => a.start_hour - b.start_hour);
      return {
        ...current,
        start_hour: sorted[0]?.start_hour ?? current.start_hour,
        end_hour: sorted[sorted.length - 1]?.end_hour ?? current.end_hour,
        ranges: sorted,
      };
    });
  }

  function addRange(dayKey: string) {
    updateDay(dayKey, (current) => {
      const lastRange = current.ranges[current.ranges.length - 1];
      const nextRange = lastRange
        ? lastRange.end_hour < 24
          ? {
              start_hour: Math.min(23, lastRange.end_hour),
              end_hour: Math.min(24, lastRange.end_hour + 1),
            }
          : lastRange.start_hour > 0
            ? {
                start_hour: Math.max(0, lastRange.start_hour - 1),
                end_hour: lastRange.start_hour,
              }
            : { start_hour: 9, end_hour: 10 }
        : { start_hour: 9, end_hour: 17 };
      const ranges = [...current.ranges, nextRange].sort((a, b) => a.start_hour - b.start_hour);
      return {
        ...current,
        enabled: true,
        start_hour: ranges[0]?.start_hour ?? current.start_hour,
        end_hour: ranges[ranges.length - 1]?.end_hour ?? current.end_hour,
        ranges,
      };
    });
  }

  function removeRange(dayKey: string, index: number) {
    updateDay(dayKey, (current) => {
      const ranges = current.ranges.filter((_, rangeIndex) => rangeIndex !== index);
      return {
        ...current,
        enabled: ranges.length > 0,
        start_hour: ranges[0]?.start_hour ?? current.start_hour,
        end_hour: ranges[ranges.length - 1]?.end_hour ?? current.end_hour,
        ranges,
      };
    });
  }

  function toggleBlockedWeekday(day: number) {
    const exists = blockers.weekdays.includes(day);
    onBlockersChange({
      ...blockers,
      weekdays: exists
        ? blockers.weekdays.filter((value) => value !== day)
        : [...blockers.weekdays, day].sort((a, b) => a - b),
    });
  }

  function addBlockedDate() {
    if (!pendingDate) return;
    if (blockers.dates.includes(pendingDate)) {
      setPendingDate("");
      return;
    }
    onBlockersChange({
      ...blockers,
      dates: [...blockers.dates, pendingDate].sort(),
    });
    setPendingDate("");
  }

  function removeBlockedDate(date: string) {
    onBlockersChange({
      ...blockers,
      dates: blockers.dates.filter((value) => value !== date),
    });
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const cells = buildCalendarGrid(year, month);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {DAYS.map((day) => {
          const row = value[day.key];
          return (
            <div
              key={day.key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-4)",
                background: row.enabled ? "var(--surface-page)" : "var(--surface-subtle)",
                borderRadius: "var(--radius-lg)",
                border: `1px solid ${row.enabled ? "var(--border-default)" : "var(--border-subtle)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-3)",
                  flexWrap: "wrap",
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
                    fontWeight: row.enabled ? 700 : 500,
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) => setDayEnabled(day.key, event.target.checked)}
                    style={{
                      accentColor: "var(--blue-400)",
                      width: 14,
                      height: 14,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                  {day.label}
                </label>

                {row.enabled && (
                  <button
                    type="button"
                    className="tc-btn tc-btn--ghost tc-btn--sm"
                    onClick={() => addRange(day.key)}
                  >
                    + Add time range
                  </button>
                )}
              </div>

              {!row.enabled ? (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
                  Unavailable
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {row.ranges.map((range, index) => (
                    <div
                      key={`${day.key}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 16px minmax(0, 1fr) auto",
                        gap: "var(--space-2)",
                        alignItems: "center",
                      }}
                    >
                      <div className="tc-select-wrap">
                        <select
                          className="tc-input"
                          value={range.start_hour}
                          onChange={(event) =>
                            updateRange(day.key, index, {
                              start_hour: Number(event.target.value),
                            })
                          }
                          style={{ fontSize: 12 }}
                        >
                          {Array.from({ length: 24 }, (_, hour) => (
                            <option key={hour} value={hour}>
                              {hourLabel(hour)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span
                        style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}
                      >
                        -
                      </span>
                      <div className="tc-select-wrap">
                        <select
                          className="tc-input"
                          value={range.end_hour}
                          onChange={(event) =>
                            updateRange(day.key, index, {
                              end_hour: Number(event.target.value),
                            })
                          }
                          style={{ fontSize: 12 }}
                        >
                          {Array.from({ length: 24 }, (_, hour) => (
                            <option key={hour + 1} value={hour + 1}>
                              {hourLabel(hour + 1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="tc-btn tc-btn--ghost tc-btn--sm"
                        onClick={() => removeRange(day.key, index)}
                        style={{ color: "var(--error)" }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showBlockers && <div
        className="tc-card"
        style={{
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Blockers
          </h4>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
            Block out recurring weekdays or one-off dates without deleting your base schedule.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
            Blocked weekdays
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {DAYS.map((day) => {
              const active = blockers.weekdays.includes(Number(day.key));
              return (
                <button
                  key={`blocked-${day.key}`}
                  type="button"
                  className="tc-btn tc-btn--sm"
                  onClick={() => toggleBlockedWeekday(Number(day.key))}
                  style={{
                    background: active ? "rgba(239, 68, 68, 0.12)" : "var(--surface-subtle)",
                    color: active ? "var(--error)" : "var(--text-secondary)",
                    border: `1px solid ${active ? "rgba(239, 68, 68, 0.28)" : "var(--border-default)"}`,
                  }}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
            Blocked dates
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <input
              type="date"
              className="tc-input"
              value={pendingDate}
              onChange={(event) => setPendingDate(event.target.value)}
              style={{ width: 180 }}
            />
            <button type="button" className="tc-btn tc-btn--secondary tc-btn--sm" onClick={addBlockedDate}>
              Add blocked date
            </button>
          </div>
          {blockers.dates.length > 0 && (
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {blockers.dates.map((date) => (
                <button
                  key={date}
                  type="button"
                  className="tc-btn tc-btn--ghost tc-btn--sm"
                  onClick={() => removeBlockedDate(date)}
                  style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    color: "var(--error)",
                    border: "1px solid rgba(239, 68, 68, 0.18)",
                  }}
                >
                  {date} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>}

      <div
        className="tc-card"
        style={{
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Monthly calendar preview
            </h4>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              Preview which days are available, blocked, or closed this month.
            </p>
          </div>
          <button
            type="button"
            className="tc-btn tc-btn--ghost tc-btn--sm"
            onClick={() => setShowCalendarPreview((current) => !current)}
          >
            {showCalendarPreview ? "Hide calendar view" : "Show calendar view"}
          </button>
        </div>

        {showCalendarPreview && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-3)",
              }}
            >
              <button
                type="button"
                className="tc-btn tc-btn--ghost tc-btn--sm"
                onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              >
                ‹
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                {formatMonthYear(viewMonth)}
              </span>
              <button
                type="button"
                className="tc-btn tc-btn--ghost tc-btn--sm"
                onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              >
                ›
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
              {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((label) => (
                <div
                  key={label}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textAlign: "center",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </div>
              ))}
              {cells.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} style={{ minHeight: 74 }} />;
                }
                const state = hasAvailabilityOnDate(date, value, blockers);
                const row = value[String(date.getDay())];
                const label =
                  state === "available" && row?.enabled
                    ? row.ranges.slice(0, 2).map(formatRange).join(" • ")
                    : state === "blocked"
                      ? "Blocked"
                      : "Closed";
                return (
                  <div
                    key={toIsoDate(date)}
                    style={{
                      minHeight: 74,
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)",
                      padding: "10px 8px",
                      background:
                        state === "available"
                          ? "rgba(59, 130, 246, 0.1)"
                          : state === "blocked"
                            ? "rgba(239, 68, 68, 0.1)"
                            : "var(--surface-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                      {date.getDate()}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              {[
                { label: "Available", color: "rgba(59, 130, 246, 0.1)" },
                { label: "Blocked", color: "rgba(239, 68, 68, 0.1)" },
                { label: "Closed", color: "var(--surface-subtle)" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: item.color,
                      border: "1px solid var(--border-default)",
                    }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
