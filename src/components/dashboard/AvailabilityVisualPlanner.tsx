"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AvailabilitySchedule, DateOverride } from "@/lib/availability-schedules";
import {
  DEFAULT_AVAILABILITY_BLOCKERS,
  DEFAULT_WEEKLY_AVAILABILITY,
  normalizeAvailabilityBlockers,
  normalizeWeeklyAvailability,
  type AvailabilityBlockers,
  type WeeklyAvailability,
} from "@/lib/event-type-config";
import { DateOverrideModal, type DateOverrideLocal, formatHourShort } from "@/components/dashboard/DateOverrideModal";

// ── Constants ──────────────────────────────────────────────────────────────────

type ScheduleWithUsage = AvailabilitySchedule & { usage_count?: number };

type PlannerState = {
  id: string | "new" | null;
  name: string;
  weekly_availability: WeeklyAvailability;
  blockers: AvailabilityBlockers;
  date_overrides: DateOverrideLocal[];
  is_default: boolean;
};

const DAY_COLUMNS = [
  { key: "1", label: "Mon" },
  { key: "2", label: "Tue" },
  { key: "3", label: "Wed" },
  { key: "4", label: "Thu" },
  { key: "5", label: "Fri" },
  { key: "6", label: "Sat" },
  { key: "0", label: "Sun" },
] as const;

// 15-min slot grid
const SLOTS_PER_HOUR = 4;
const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR; // 96
const ROW_H = 14; // px per 15-min slot
const GRID_SCROLL_H = 548; // visible height of scroll container (~7am–7pm approx)

// Labels shown at full hours only; render text every 3 hours
const LABEL_HOURS = new Set([0, 3, 6, 9, 12, 15, 18, 21]);

function slotLabel(slot: number): string | null {
  if (slot % SLOTS_PER_HOUR !== 0) return null; // not a full hour
  const hour = slot / SLOTS_PER_HOUR;
  if (!LABEL_HOURS.has(hour)) return null; // only every 3 hours
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h12} ${suffix}`;
}

// Unavailable pattern — matches the booking grid (ThreeDaySlotPicker line 679)
const UNAVAILABLE_BG =
  "repeating-linear-gradient(45deg, transparent, transparent 4px, #f4f4f4 4px, #f4f4f4 8px)";

// ── Slot ↔ Range helpers ────────────────────────────────────────────────────────

function rangesToSlots(ranges: Array<{ start_hour: number; end_hour: number }>): boolean[] {
  const slots = Array.from({ length: TOTAL_SLOTS }, () => false);
  ranges.forEach((range) => {
    const startSlot = Math.round(range.start_hour * SLOTS_PER_HOUR);
    const endSlot = Math.round(range.end_hour * SLOTS_PER_HOUR);
    for (let s = startSlot; s < endSlot; s++) {
      if (s >= 0 && s < TOTAL_SLOTS) slots[s] = true;
    }
  });
  return slots;
}

function slotsToRanges(slots: boolean[]): Array<{ start_hour: number; end_hour: number }> {
  const ranges: Array<{ start_hour: number; end_hour: number }> = [];
  let start: number | null = null;
  for (let s = 0; s <= TOTAL_SLOTS; s++) {
    const active = s < TOTAL_SLOTS ? slots[s] : false;
    if (active && start === null) start = s;
    if (!active && start !== null) {
      ranges.push({ start_hour: start / SLOTS_PER_HOUR, end_hour: s / SLOTS_PER_HOUR });
      start = null;
    }
  }
  return ranges;
}

function getDaySlots(weeklyAvailability: WeeklyAvailability, dayKey: string): boolean[] {
  const day = weeklyAvailability[dayKey];
  if (!day?.enabled || !Array.isArray(day.ranges)) return Array.from({ length: TOTAL_SLOTS }, () => false);
  return rangesToSlots(day.ranges);
}

function withDaySlots(weeklyAvailability: WeeklyAvailability, dayKey: string, slots: boolean[]): WeeklyAvailability {
  const ranges = slotsToRanges(slots);
  const first = ranges[0] ?? { start_hour: 9, end_hour: 17 };
  const last = ranges[ranges.length - 1] ?? first;
  return {
    ...weeklyAvailability,
    [dayKey]: {
      enabled: ranges.length > 0,
      start_hour: first.start_hour,
      end_hour: last.end_hour,
      ranges,
    },
  };
}

// Convert DateOverride[] (DB) ↔ DateOverrideLocal[] (with React id keys)
function overridesToLocal(overrides: DateOverride[]): DateOverrideLocal[] {
  return overrides.map((o) => ({
    date: o.date,
    ranges: o.ranges.map((r, i) => ({ id: `${o.date}-${i}-${r.start_hour}`, ...r })),
  }));
}

function localToOverrides(overrides: DateOverrideLocal[]): DateOverride[] {
  return overrides.map(({ date, ranges }) => ({
    date,
    ranges: ranges.map(({ id: _, ...r }) => r),
  }));
}

function formatOverrideRanges(ranges: { start_hour: number; end_hour: number }[]): string {
  if (ranges.length === 0) return "Unavailable";
  return ranges.map((r) => `${formatHourShort(r.start_hour)}–${formatHourShort(r.end_hour)}`).join(", ");
}

// ── State helpers ───────────────────────────────────────────────────────────────

function createDefaultPlannerState(isDefault: boolean): PlannerState {
  return {
    id: "new",
    name: "Working hours",
    weekly_availability: DEFAULT_WEEKLY_AVAILABILITY,
    blockers: DEFAULT_AVAILABILITY_BLOCKERS,
    date_overrides: [],
    is_default: isDefault,
  };
}

function plannerStateFromSchedule(schedule: AvailabilitySchedule): PlannerState {
  let weeklyAvailability = normalizeWeeklyAvailability(schedule.weekly_availability);
  const blockers = normalizeAvailabilityBlockers(schedule.blockers);
  blockers.weekdays.forEach((day) => {
    weeklyAvailability = withDaySlots(weeklyAvailability, String(day), Array.from({ length: TOTAL_SLOTS }, () => false));
  });
  return {
    id: schedule.id,
    name: schedule.name,
    weekly_availability: weeklyAvailability,
    blockers: { dates: blockers.dates, weekdays: [] },
    date_overrides: overridesToLocal(Array.isArray(schedule.date_overrides) ? schedule.date_overrides : []),
    is_default: schedule.is_default,
  };
}

// ── VisualHourGrid ──────────────────────────────────────────────────────────────

function VisualHourGrid({
  weeklyAvailability,
  timezone,
  onChange,
}: {
  weeklyAvailability: WeeklyAvailability;
  timezone: string;
  onChange: (value: WeeklyAvailability) => void;
}) {
  const [dragMode, setDragMode] = React.useState<"add" | "remove" | null>(null);
  const [isMouseDown, setIsMouseDown] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const scrolledRef = React.useRef(false);

  // Auto-scroll to 7am on mount
  React.useEffect(() => {
    if (!scrollRef.current || scrolledRef.current) return;
    scrolledRef.current = true;
    scrollRef.current.scrollTop = 7 * SLOTS_PER_HOUR * ROW_H - 20;
  }, []);

  React.useEffect(() => {
    function handleMouseUp() {
      setIsMouseDown(false);
      setDragMode(null);
    }
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  function applyCell(dayKey: string, slot: number, nextActive: boolean) {
    const currentSlots = getDaySlots(weeklyAvailability, dayKey);
    if (currentSlots[slot] === nextActive) return;
    const nextSlots = [...currentSlots];
    nextSlots[slot] = nextActive;
    onChange(withDaySlots(weeklyAvailability, dayKey, nextSlots));
  }

  function handleMouseDown(dayKey: string, slot: number) {
    const currentSlots = getDaySlots(weeklyAvailability, dayKey);
    const nextMode = currentSlots[slot] ? "remove" : "add";
    setIsMouseDown(true);
    setDragMode(nextMode);
    applyCell(dayKey, slot, nextMode === "add");
  }

  function handleMouseEnter(dayKey: string, slot: number) {
    if (!isMouseDown || !dragMode) return;
    applyCell(dayKey, slot, dragMode === "add");
  }

  return (
    <div
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        background: "var(--surface-page)",
      }}
    >
      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))",
          borderBottom: "1px solid var(--border-default)",
          background: "var(--surface-subtle)",
        }}
      >
        <div
          style={{
            padding: "10px 8px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <span>Time</span>
          <span style={{ fontSize: 10, marginTop: 2, color: "var(--text-tertiary)", opacity: 0.8 }}>
            {timezone.replace(/_/g, " ")}
          </span>
        </div>
        {DAY_COLUMNS.map((column) => (
          <div
            key={column.key}
            style={{
              padding: "10px 6px",
              borderLeft: "1px solid var(--border-default)",
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {column.label}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        style={{ maxHeight: GRID_SCROLL_H, overflowY: "auto" }}
      >
        {Array.from({ length: TOTAL_SLOTS }, (_, slot) => {
          const isFullHour = slot % SLOTS_PER_HOUR === 0;
          const label = slotLabel(slot);
          const isHourBoundary = isFullHour && slot !== 0;

          return (
            <div
              key={slot}
              style={{
                display: "grid",
                gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))",
                height: ROW_H,
                borderTop: isHourBoundary ? "1px solid var(--border-subtle)" : undefined,
              }}
            >
              {/* Time label */}
              <div
                style={{
                  borderRight: "1px solid var(--border-default)",
                  position: "relative",
                  overflow: "visible",
                }}
              >
                {label && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      left: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>

              {/* Day cells */}
              {DAY_COLUMNS.map((column) => {
                const active = getDaySlots(weeklyAvailability, column.key)[slot];
                return (
                  <button
                    key={`${column.key}-${slot}`}
                    type="button"
                    onMouseDown={() => handleMouseDown(column.key, slot)}
                    onMouseEnter={() => handleMouseEnter(column.key, slot)}
                    style={{
                      border: "none",
                      borderLeft: "1px solid rgba(0,0,0,0.06)",
                      background: active ? "#ffffff" : UNAVAILABLE_BG,
                      cursor: "pointer",
                      padding: 0,
                      display: "block",
                    }}
                    aria-label={`${column.label} ${slot / SLOTS_PER_HOUR}:${(slot % SLOTS_PER_HOUR) * 15} ${active ? "available" : "unavailable"}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function AvailabilityVisualPlanner({
  initialSchedules,
}: {
  initialSchedules: AvailabilitySchedule[];
}) {
  const router = useRouter();
  const [schedules, setSchedules] = React.useState<ScheduleWithUsage[]>(initialSchedules);
  const [planner, setPlanner] = React.useState<PlannerState>(() => {
    const selected = initialSchedules.find((s) => s.is_default) ?? initialSchedules[0] ?? null;
    return selected ? plannerStateFromSchedule(selected) : createDefaultPlannerState(true);
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingBlockedDate, setPendingBlockedDate] = React.useState("");
  const [showOverrideModal, setShowOverrideModal] = React.useState(false);
  const [overrideModalInitial, setOverrideModalInitial] = React.useState<DateOverrideLocal[]>([]);

  // Browser timezone for display
  const timezone = React.useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; }
  }, []);

  React.useEffect(() => {
    fetch("/api/availability-schedules")
      .then((r) => r.json())
      .then((data: { schedules?: ScheduleWithUsage[] }) => {
        if (data.schedules) setSchedules(data.schedules);
      })
      .catch(() => {});
  }, []);

  function selectSchedule(schedule: AvailabilitySchedule) {
    setPlanner(plannerStateFromSchedule(schedule));
    setError(null);
  }

  function startNewSchedule() {
    setPlanner(createDefaultPlannerState(schedules.length === 0));
    setError(null);
  }

  async function refreshSchedules(nextSelectedId?: string | null) {
    const res = await fetch("/api/availability-schedules");
    const data = (await res.json().catch(() => ({}))) as { schedules?: ScheduleWithUsage[] };
    const nextSchedules = data.schedules ?? [];
    setSchedules(nextSchedules);
    const selected =
      (nextSelectedId ? nextSchedules.find((s) => s.id === nextSelectedId) : null) ??
      nextSchedules.find((s) => s.is_default) ??
      nextSchedules[0] ??
      null;
    setPlanner(selected ? plannerStateFromSchedule(selected) : createDefaultPlannerState(true));
  }

  async function saveSchedule() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: planner.name.trim(),
        weekly_availability: planner.weekly_availability,
        blocked_dates: planner.blockers.dates,
        blocked_weekdays: planner.blockers.weekdays,
        date_overrides: localToOverrides(planner.date_overrides),
        is_default: planner.is_default,
      };
      const res =
        planner.id === "new" || planner.id === null
          ? await fetch("/api/availability-schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
          : await fetch(`/api/availability-schedules/${planner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to save schedule");
      const nextId = typeof (data as { schedule?: { id?: string } }).schedule?.id === "string"
        ? (data as { schedule: { id: string } }).schedule.id
        : planner.id;
      await refreshSchedules(nextId ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSchedule(schedule: ScheduleWithUsage) {
    if (!confirm(`Delete "${schedule.name}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/availability-schedules/${schedule.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to delete schedule");
      }
      await refreshSchedules(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
    }
  }

  async function setDefaultSchedule(schedule: ScheduleWithUsage) {
    setError(null);
    try {
      const res = await fetch(`/api/availability-schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to set default");
      }
      await refreshSchedules(schedule.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set default");
    }
  }

  function addBlockedDate() {
    if (!pendingBlockedDate) return;
    setPlanner((curr) => ({
      ...curr,
      blockers: { ...curr.blockers, dates: [...new Set([...curr.blockers.dates, pendingBlockedDate])].sort() },
    }));
    setPendingBlockedDate("");
  }

  function removeBlockedDate(date: string) {
    setPlanner((curr) => ({
      ...curr,
      blockers: { ...curr.blockers, dates: curr.blockers.dates.filter((d) => d !== date) },
    }));
  }

  function handleOverrideApply(incoming: DateOverrideLocal[]) {
    setPlanner((curr) => {
      const incomingDates = new Set(incoming.map((o) => o.date));
      const existing = curr.date_overrides.filter((o) => !incomingDates.has(o.date));
      return {
        ...curr,
        date_overrides: [...existing, ...incoming].sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
    setShowOverrideModal(false);
  }

  const selectedScheduleRecord = planner.id && planner.id !== "new"
    ? schedules.find((s) => s.id === planner.id) ?? null
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Schedule selector */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          padding: "var(--space-5)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          background: "var(--surface-page)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Visual beta</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
              Paint availability directly on the grid. 15-min precision. Scroll the grid to see all hours.
            </p>
          </div>
          <button type="button" className="tc-btn tc-btn--primary" onClick={startNewSchedule}>
            + New schedule
          </button>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", overflowX: "auto", paddingBottom: 2 }}>
          {schedules.map((schedule) => {
            const selected = planner.id === schedule.id;
            return (
              <button
                key={schedule.id}
                type="button"
                onClick={() => selectSchedule(schedule)}
                style={{
                  minWidth: 220,
                  textAlign: "left",
                  border: `1px solid ${selected ? "rgba(74, 158, 255, 0.4)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "12px 14px",
                  background: selected ? "rgba(74, 158, 255, 0.05)" : "var(--surface-subtle)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{schedule.name}</span>
                  {schedule.is_default ? <span className="tc-pill tc-pill--neutral" style={{ fontSize: 10 }}>Default</span> : null}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
                  {(schedule.usage_count ?? 0) > 0
                    ? `${schedule.usage_count} booking link${schedule.usage_count === 1 ? "" : "s"}`
                    : "Unused"}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Editor */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          padding: "var(--space-6)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          background: "var(--surface-page)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
            {planner.id === "new" ? "New schedule" : planner.name}
          </h3>
          {selectedScheduleRecord?.usage_count ? (
            <span className="tc-pill tc-pill--neutral">{selectedScheduleRecord.usage_count} booking links</span>
          ) : null}
        </div>

        {error ? (
          <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.28)", background: "rgba(239,68,68,0.06)", color: "#dc2626", fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="tc-form-field" style={{ marginBottom: 0, maxWidth: 420 }}>
            <label className="tc-form-label">Schedule name</label>
            <input
              className="tc-input"
              value={planner.name}
              onChange={(e) => setPlanner((curr) => ({ ...curr, name: e.target.value }))}
              placeholder="Working hours"
            />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Weekly grid</div>
            <p style={{ margin: "4px 0 10px", fontSize: 12, color: "var(--text-tertiary)" }}>
              Click or drag to mark hours as available (white) or unavailable (hatched). Scroll for off-hours.
            </p>
          </div>

          <VisualHourGrid
            weeklyAvailability={planner.weekly_availability}
            timezone={timezone}
            onChange={(weekly_availability) => setPlanner((curr) => ({ ...curr, weekly_availability }))}
          />

          {/* Blocked dates + Date overrides */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Blocked dates</div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
                  Fully block a specific date (holiday, OOO, etc.).
                </p>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <input
                  className="tc-input"
                  type="date"
                  value={pendingBlockedDate}
                  onChange={(e) => setPendingBlockedDate(e.target.value)}
                  style={{ maxWidth: 200 }}
                />
                <button type="button" className="tc-btn tc-btn--secondary" onClick={addBlockedDate}>
                  Add
                </button>
              </div>
              {planner.blockers.dates.length > 0 ? (
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  {planner.blockers.dates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      className="tc-btn tc-btn--ghost tc-btn--sm"
                      onClick={() => removeBlockedDate(date)}
                    >
                      {date} ×
                    </button>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No blocked dates</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Date overrides</div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
                    Different hours for a specific date (e.g. shorter day before a holiday).
                  </p>
                </div>
                <button
                  type="button"
                  className="tc-btn tc-btn--secondary tc-btn--sm"
                  onClick={() => {
                    setOverrideModalInitial([]);
                    setShowOverrideModal(true);
                  }}
                >
                  + Add
                </button>
              </div>

              {planner.date_overrides.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {planner.date_overrides.map((override) => (
                    <div
                      key={override.date}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)",
                        padding: "10px 12px", borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-default)", background: "var(--surface-subtle)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{override.date}</div>
                        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                          {formatOverrideRanges(override.ranges)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button
                          type="button"
                          className="tc-btn tc-btn--ghost tc-btn--sm"
                          onClick={() => {
                            setOverrideModalInitial([override]);
                            setShowOverrideModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="tc-btn tc-btn--ghost tc-btn--sm"
                          style={{ color: "var(--color-danger, #ef4444)" }}
                          onClick={() =>
                            setPlanner((curr) => ({
                              ...curr,
                              date_overrides: curr.date_overrides.filter((o) => o.date !== override.date),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No date overrides yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-primary)" }}>
            <input
              type="checkbox"
              checked={planner.is_default}
              onChange={(e) => setPlanner((curr) => ({ ...curr, is_default: e.target.checked }))}
              style={{ accentColor: "var(--blue-500)" }}
            />
            Set as default schedule
          </label>

          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {selectedScheduleRecord && !selectedScheduleRecord.is_default && !selectedScheduleRecord.usage_count ? (
              <button
                type="button"
                className="tc-btn tc-btn--ghost"
                style={{ color: "var(--color-danger, #ef4444)" }}
                onClick={() => deleteSchedule(selectedScheduleRecord)}
              >
                Delete schedule
              </button>
            ) : null}
            {selectedScheduleRecord && !selectedScheduleRecord.is_default ? (
              <button type="button" className="tc-btn tc-btn--ghost" onClick={() => setDefaultSchedule(selectedScheduleRecord)}>
                Set default
              </button>
            ) : null}
            <button
              type="button"
              className="tc-btn tc-btn--ghost"
              onClick={() => {
                const curr = planner.id && planner.id !== "new"
                  ? schedules.find((s) => s.id === planner.id) ?? null
                  : null;
                setPlanner(curr ? plannerStateFromSchedule(curr) : createDefaultPlannerState(schedules.length === 0));
                setError(null);
              }}
              disabled={saving}
            >
              Reset
            </button>
            <button type="button" className="tc-btn tc-btn--primary" onClick={saveSchedule} disabled={saving}>
              {saving ? "Saving..." : "Save schedule"}
            </button>
          </div>
        </div>
      </section>

      {showOverrideModal && (
        <DateOverrideModal
          initialOverrides={overrideModalInitial}
          onApply={handleOverrideApply}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
    </div>
  );
}
