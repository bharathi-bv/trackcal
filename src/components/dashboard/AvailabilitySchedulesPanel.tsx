"use client";

import * as React from "react";
import WeeklyAvailabilityEditor from "@/components/dashboard/WeeklyAvailabilityEditor";
import {
  DEFAULT_AVAILABILITY_BLOCKERS,
  DEFAULT_WEEKLY_AVAILABILITY,
  normalizeAvailabilityBlockers,
  normalizeWeeklyAvailability,
  type AvailabilityBlockers,
  type WeeklyAvailability,
} from "@/lib/event-type-config";
import type { AvailabilitySchedule } from "@/components/dashboard/EventTypesClient";

type ScheduleFormState = {
  name: string;
  weekly_availability: WeeklyAvailability;
  blockers: AvailabilityBlockers;
  is_default: boolean;
};

const DEFAULT_FORM: ScheduleFormState = {
  name: "",
  weekly_availability: DEFAULT_WEEKLY_AVAILABILITY,
  blockers: DEFAULT_AVAILABILITY_BLOCKERS,
  is_default: false,
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatHourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const h12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${h12}${suffix.toLowerCase()}`;
}

function summarizeDayRanges(weekly: WeeklyAvailability, dayIndex: number) {
  const row = weekly[String(dayIndex)];
  if (!row?.enabled || row.ranges.length === 0) return "Off";
  return row.ranges
    .map((range) => `${formatHourLabel(range.start_hour)}-${formatHourLabel(range.end_hour)}`)
    .join(" • ");
}

function summarizeAvailability(weekly: WeeklyAvailability) {
  const lines = DAY_LABELS.map((label, index) => {
    const summary = summarizeDayRanges(weekly, index);
    return summary === "Off" ? null : `${label} ${summary}`;
  }).filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join(" • ") : "No open hours";
}

function summarizeBlockers(blockers: AvailabilityBlockers) {
  const parts: string[] = [];
  if (blockers.weekdays.length > 0) {
    parts.push(`Blocked weekdays: ${blockers.weekdays.map((day) => DAY_LABELS[day]).join(", ")}`);
  }
  if (blockers.dates.length > 0) {
    parts.push(
      `Blocked dates: ${blockers.dates.slice(0, 2).join(", ")}${
        blockers.dates.length > 2 ? ` +${blockers.dates.length - 2} more` : ""
      }`
    );
  }
  return parts.join(" • ");
}

export default function AvailabilitySchedulesPanel({
  schedules,
  usageCounts,
  onSchedulesChange,
}: {
  schedules: AvailabilitySchedule[];
  usageCounts: Record<string, number>;
  onSchedulesChange: (next: AvailabilitySchedule[]) => void;
}) {
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<AvailabilitySchedule | null>(null);
  const [form, setForm] = React.useState<ScheduleFormState>(DEFAULT_FORM);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({
      ...DEFAULT_FORM,
      blockers: {
        dates: [...DEFAULT_AVAILABILITY_BLOCKERS.dates],
        weekdays: [...DEFAULT_AVAILABILITY_BLOCKERS.weekdays],
      },
      is_default: schedules.length === 0,
    });
    setError(null);
    setShowModal(true);
  }

  function openEdit(schedule: AvailabilitySchedule) {
    setEditing(schedule);
    setForm({
      name: schedule.name,
      weekly_availability: normalizeWeeklyAvailability(schedule.weekly_availability),
      blockers: normalizeAvailabilityBlockers(schedule.blockers),
      is_default: schedule.is_default,
    });
    setError(null);
    setShowModal(true);
  }

  function openDuplicate(schedule: AvailabilitySchedule) {
    setEditing(null);
    setForm({
      name: `${schedule.name} Copy`,
      weekly_availability: normalizeWeeklyAvailability(schedule.weekly_availability),
      blockers: normalizeAvailabilityBlockers(schedule.blockers),
      is_default: false,
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editing ? `/api/availability-schedules/${editing.id}` : "/api/availability-schedules",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            weekly_availability: form.weekly_availability,
            blocked_dates: form.blockers.dates,
            blocked_weekdays: form.blockers.weekdays,
            is_default: form.is_default,
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        schedule?: AvailabilitySchedule;
      };
      if (!res.ok || !data.schedule) {
        throw new Error(data.error || "Failed to save schedule.");
      }

      const nextSchedules = editing
        ? schedules.map((schedule) =>
            schedule.id === editing.id ? data.schedule! : form.is_default ? { ...schedule, is_default: false } : schedule
          )
        : [
            ...schedules.map((schedule) =>
              form.is_default ? { ...schedule, is_default: false } : schedule
            ),
            data.schedule,
          ];
      onSchedulesChange(nextSchedules);
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(schedule: AvailabilitySchedule) {
    if (!confirm(`Delete "${schedule.name}"?`)) return;
    try {
      const res = await fetch(`/api/availability-schedules/${schedule.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to delete schedule.");
      }
      onSchedulesChange(schedules.filter((row) => row.id !== schedule.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete schedule.");
    }
  }

  async function handleSetDefault(schedule: AvailabilitySchedule) {
    try {
      const res = await fetch(`/api/availability-schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        schedule?: AvailabilitySchedule;
      };
      if (!res.ok || !data.schedule) {
        throw new Error(data.error || "Failed to update default schedule.");
      }
      onSchedulesChange(
        schedules.map((row) =>
          row.id === schedule.id ? data.schedule! : { ...row, is_default: false }
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update default schedule.");
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div
          className="tc-card"
          style={{
            padding: "var(--space-5) var(--space-6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Availability schedules
            </p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              Reuse one schedule across multiple meeting links, or set a custom schedule per link.
            </p>
          </div>
          <button type="button" className="tc-btn tc-btn--primary" onClick={openCreate}>
            + New availability
          </button>
        </div>

        {schedules.length === 0 ? (
          <div className="tc-card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
              No availability schedules yet.
            </p>
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="tc-card"
              style={{
                padding: "var(--space-5) var(--space-6)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "var(--space-4)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {schedule.name}
                    </h3>
                    {schedule.is_default && (
                      <span className="tc-pill tc-pill--success" style={{ fontSize: 10 }}>
                        Default
                      </span>
                    )}
                    <span className="tc-pill tc-pill--neutral" style={{ fontSize: 10 }}>
                      {usageCounts[schedule.id] ?? 0} meeting link{(usageCounts[schedule.id] ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      margin: "6px 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {summarizeAvailability(schedule.weekly_availability)}
                  </p>
                  {summarizeBlockers(schedule.blockers) && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                        margin: "6px 0 0",
                        lineHeight: 1.5,
                      }}
                    >
                      {summarizeBlockers(schedule.blockers)}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  {!schedule.is_default && (
                    <button
                      type="button"
                      className="tc-btn tc-btn--ghost tc-btn--sm"
                      onClick={() => handleSetDefault(schedule)}
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    className="tc-btn tc-btn--secondary tc-btn--sm"
                    onClick={() => openEdit(schedule)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tc-btn tc-btn--ghost tc-btn--sm"
                    onClick={() => openDuplicate(schedule)}
                  >
                    Duplicate
                  </button>
                  {!schedule.is_default && (
                    <button
                      type="button"
                      className="tc-btn tc-btn--ghost tc-btn--sm"
                      style={{ color: "var(--error)" }}
                      onClick={() => handleDelete(schedule)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "var(--space-2)" }}>
                {DAY_LABELS.map((day, dayIndex) => (
                  <div
                    key={day}
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-md)",
                      background: schedule.blockers.weekdays.includes(dayIndex)
                        ? "rgba(239, 68, 68, 0.08)"
                        : schedule.weekly_availability[String(dayIndex)]?.enabled
                          ? "var(--blue-50)"
                          : "var(--surface-subtle)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{day}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4, lineHeight: 1.45 }}>
                      {summarizeDayRanges(schedule.weekly_availability, dayIndex)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(15, 23, 42, 0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-6)",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="tc-card"
            style={{
              width: "100%",
              maxWidth: 860,
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                {editing ? "Edit availability" : "New availability"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
                Saved schedules can be reused across multiple meeting links.
              </p>
            </div>

            <div className="tc-form-field">
              <label className="tc-form-label">Schedule name</label>
              <input
                type="text"
                className="tc-input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Sales team hours"
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(event) =>
                  setForm((current) => ({ ...current, is_default: event.target.checked }))
                }
              />
              Make this the default schedule for new meeting links
            </label>

            <WeeklyAvailabilityEditor
              value={form.weekly_availability}
              onChange={(weekly_availability) => setForm((current) => ({ ...current, weekly_availability }))}
              blockers={form.blockers}
              onBlockersChange={(blockers) => setForm((current) => ({ ...current, blockers }))}
            />

            {error && <p style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>{error}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <button type="button" className="tc-btn tc-btn--ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="button" className="tc-btn tc-btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
