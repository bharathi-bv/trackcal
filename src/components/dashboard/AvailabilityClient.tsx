"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MultiCalendarState } from "@/lib/calendar-connections";
import type { AvailabilitySchedule } from "@/lib/availability-schedules";
import TimezonePicker from "@/components/booking/TimezonePicker";
import { DateOverrideModal, TimePicker, type DateOverrideLocal, formatHourShort as formatHourShortShared } from "@/components/dashboard/DateOverrideModal";

// ── Types ─────────────────────────────────────────────────────────────────────

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

// DB stores weekly_availability with numeric keys "0"=Sunday … "6"=Saturday.
const DAY_TO_NUM: Record<DayKey, string> = {
  sun: "0", mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6",
};

type DayCfg = { enabled?: boolean; start_hour?: number; end_hour?: number; ranges?: { start_hour: number; end_hour: number }[] };

function getDayConfig(wa: Record<string, DayCfg>, key: DayKey): DayCfg | undefined {
  return wa[key] ?? wa[DAY_TO_NUM[key]];
}

type TimeRange = { start_hour: number; end_hour: number };

// Per-day edit model (Calendly-style)
type DayEdit = {
  key: DayKey;
  enabled: boolean;
  ranges: { id: string; start_hour: number; end_hour: number }[];
};

// DateOverrideLocal is imported from shared DateOverrideModal.tsx

type ScheduleWithUsage = AvailabilitySchedule & { usage_count?: number };

function normalizeDateOverridesFromSchedule(raw: unknown): DateOverrideLocal[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<{ date: string; ranges: { start_hour: number; end_hour: number }[] }>)
    .filter((item) => item && typeof item.date === "string" && Array.isArray(item.ranges))
    .map((item) => ({
      date: item.date,
      ranges: item.ranges.map((r, i) => ({
        id: `${item.date}-${i}-${r.start_hour}`,
        start_hour: r.start_hour ?? 9,
        end_hour: r.end_hour ?? 17,
      })),
    }))
    .filter((o) => o.ranges.length > 0);
}

function formatOverrideDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function defaultDayEdit(): DayEdit[] {
  return DAYS.map((d) => ({
    key: d.key,
    enabled: ["mon", "tue", "wed", "thu", "fri"].includes(d.key),
    ranges: [{ id: `${d.key}-0`, start_hour: 9, end_hour: 17 }],
  }));
}

function scheduleToEditDays(s: AvailabilitySchedule): DayEdit[] {
  const wa = s.weekly_availability as Record<string, DayCfg>;
  return DAYS.map((d) => {
    const cfg = getDayConfig(wa, d.key);
    const enabled = isDayEnabled(cfg);
    const rawRanges = cfg?.ranges?.length
      ? cfg.ranges
      : cfg?.start_hour !== undefined
        ? [{ start_hour: cfg.start_hour, end_hour: cfg.end_hour ?? 17 }]
        : [{ start_hour: 9, end_hour: 17 }];
    return {
      key: d.key,
      enabled,
      ranges: enabled
        ? rawRanges.map((r, i) => ({ id: `${d.key}-${i}-${r.start_hour}`, start_hour: r.start_hour, end_hour: r.end_hour }))
        : [{ id: `${d.key}-0`, start_hour: 9, end_hour: 17 }],
    };
  });
}

function dayEditToPerDay(days: DayEdit[]): Record<string, { enabled: boolean; ranges: TimeRange[] }> {
  const perDay: Record<string, { enabled: boolean; ranges: TimeRange[] }> = {};
  for (let i = 0; i <= 6; i++) { perDay[String(i)] = { enabled: false, ranges: [] }; }
  days.forEach((d) => {
    const numKey = DAY_TO_NUM[d.key];
    perDay[numKey].enabled = d.enabled;
    if (d.enabled) {
      perDay[numKey].ranges = d.ranges.map((r) => ({ start_hour: r.start_hour, end_hour: r.end_hour }));
    }
  });
  return perDay;
}

const formatHourShort = formatHourShortShared;

function isDayEnabled(cfg: DayCfg | undefined): boolean {
  if (!cfg) return false;
  if ("enabled" in cfg) return Boolean(cfg.enabled);
  return cfg.start_hour !== undefined || (cfg.ranges !== undefined && cfg.ranges.length > 0);
}

// ── Calendar icons ─────────────────────────────────────────────────────────────

function GoogleCalIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="38" height="38" rx="4" fill="white" stroke="#DADCE0" strokeWidth="1.5"/>
      <path d="M5 9a4 4 0 014-4h30a4 4 0 014 4v8H5V9z" fill="#1a73e8"/>
      <rect x="15" y="2" width="4" height="9" rx="2" fill="#1a73e8"/>
      <rect x="29" y="2" width="4" height="9" rx="2" fill="#1a73e8"/>
      <text x="24" y="37" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1a73e8" fontFamily="sans-serif">31</text>
      <circle cx="14" cy="28" r="2.5" fill="#EA4335"/>
      <circle cx="24" cy="28" r="2.5" fill="#4285F4"/>
      <circle cx="34" cy="28" r="2.5" fill="#34A853"/>
    </svg>
  );
}

function OutlookIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="7" fill="#0078D4"/>
      <rect x="14" y="13" width="20" height="22" rx="3" fill="white" opacity="0.15"/>
      <rect x="14" y="13" width="20" height="8" rx="3" fill="white" opacity="0.95"/>
      <rect x="14" y="17" width="20" height="4" fill="white" opacity="0.95"/>
      <rect x="19" y="10" width="3" height="7" rx="1.5" fill="white"/>
      <rect x="26" y="10" width="3" height="7" rx="1.5" fill="white"/>
      <rect x="16" y="25" width="5" height="4" rx="1" fill="white" opacity="0.8"/>
      <rect x="23" y="25" width="5" height="4" rx="1" fill="white" opacity="0.8"/>
      <rect x="16" y="31" width="5" height="3" rx="1" fill="white" opacity="0.6"/>
      <rect x="23" y="31" width="5" height="3" rx="1" fill="white" opacity="0.6"/>
    </svg>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  const [pct, setPct] = React.useState(100);

  React.useEffect(() => {
    const start = Date.now();
    const dur = 5000;
    let raf: number;
    function tick() {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / dur) * 100);
      setPct(remaining);
      if (remaining > 0) { raf = requestAnimationFrame(tick); }
      else { onClose(); }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onClose]);

  const isSuccess = type === "success";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "var(--color-surface)",
      border: `1px solid ${isSuccess ? "#86efac" : "#fca5a5"}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      minWidth: 280, maxWidth: 380, overflow: "hidden",
    }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: isSuccess ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isSuccess
            ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 3v4M6 8.5v.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
          }
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", flex: 1 }}>{message}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, padding: "2px 4px" }}>×</button>
      </div>
      <div style={{ height: 3, background: isSuccess ? "#dcfce7" : "#fee2e2" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: isSuccess ? "#16a34a" : "#dc2626" }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AvailabilityClient({
  initialCalendar,
  initialSchedules,
}: {
  initialCalendar: MultiCalendarState;
  initialSchedules: AvailabilitySchedule[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const defaultTab = requestedTab === "calendar" ? "calendar" : "schedules";
  const [tab, setTab] = React.useState<"schedules" | "calendar">(defaultTab);
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const [accounts, setAccounts] = React.useState(initialCalendar.accounts);
  const [timezone, setTimezone] = React.useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; }
  });
  // Track which schedule to preview in calendar (defaults to default schedule)
  const [selectedScheduleId, setSelectedScheduleId] = React.useState<string | null>(
    () => initialSchedules.find((s) => s.is_default)?.id ?? initialSchedules[0]?.id ?? null
  );

  React.useEffect(() => {
    const connected = searchParams.get("calendar_connected");
    const error = searchParams.get("calendar_error");
    if (connected) {
      setToast({ message: `${connected === "microsoft" ? "Outlook" : "Google"} Calendar connected successfully`, type: "success" });
      const params = new URLSearchParams(searchParams.toString());
      params.delete("calendar_connected");
      router.replace(`/app/availability?${params.toString()}`, { scroll: false });
    } else if (error) {
      setToast({
        message: error === "access_denied" ? "Access denied — please allow the requested permissions."
          : error === "exchange_failed" ? "Calendar connection failed. Please try again."
          : `Calendar error: ${error}`,
        type: "error"
      });
      const params = new URLSearchParams(searchParams.toString());
      params.delete("calendar_error");
      router.replace(`/app/availability?${params.toString()}`, { scroll: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function switchTab(t: "schedules" | "calendar") {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.replace(`/app/availability?${params.toString()}`, { scroll: false });
  }

  const selectedSchedule = initialSchedules.find((s) => s.id === selectedScheduleId) ?? initialSchedules.find((s) => s.is_default) ?? initialSchedules[0];

  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* Left column: header, tabs, tab content */}
      <div style={{ flex: "1 1 0%", minWidth: 0, maxWidth: 980 }}>
        {/* Header */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Availability</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 4 }}>Manage your working hours and connected calendars.</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", marginBottom: "var(--space-8)", gap: 0 }}>
          {([
            { key: "schedules", label: "Schedules" },
            { key: "calendar", label: "Calendar settings" },
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => switchTab(item.key)}
              style={{
                background: "none",
                border: "none",
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: tab === item.key ? 600 : 500,
                color: tab === item.key ? "var(--color-primary)" : "var(--color-text-muted)",
                borderBottom: tab === item.key ? "2px solid var(--color-primary)" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "color 0.12s",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "schedules" ? (
          <>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 0, marginBottom: 16 }}>
              The working hours of the selected schedule are shown in the calendar preview.
            </p>
            <SchedulesTab
              initialSchedules={initialSchedules}
              selectedId={selectedScheduleId}
              onSelect={setSelectedScheduleId}
            />
          </>
        ) : tab === "calendar" ? (
          <CalendarTab accounts={accounts} setAccounts={setAccounts} onRefresh={() => router.refresh()} />
        ) : null}
      </div>

      {/* Right column: sticky calendar — top offset accounts for nav bar height (62px) + page padding (24px) */}
      <div style={{
        flex: "0 0 620px",
        minWidth: 620,
        maxWidth: 620,
        alignSelf: "flex-start",
        marginTop: 92,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--color-surface)",
        position: "sticky",
        top: 24,
      }}>
        <WeeklyCalendarView
          accounts={accounts}
          timezone={timezone}
          onTimezoneChange={setTimezone}
          selectedSchedule={selectedSchedule}
        />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULES TAB
// ══════════════════════════════════════════════════════════════════════════════

function SchedulesTab({
  initialSchedules,
  selectedId,
  onSelect,
}: {
  initialSchedules: AvailabilitySchedule[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [schedules, setSchedules] = React.useState<ScheduleWithUsage[]>(initialSchedules);
  const [editingId, setEditingId] = React.useState<string | "new" | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Edit form state — Calendly-style per-day
  const [editName, setEditName] = React.useState("");
  const [editDays, setEditDays] = React.useState<DayEdit[]>(defaultDayEdit());
  const [editDateOverrides, setEditDateOverrides] = React.useState<DateOverrideLocal[]>([]);
  const [editIsDefault, setEditIsDefault] = React.useState(false);

  // Fetch usage counts from API on mount
  React.useEffect(() => {
    fetch("/api/availability-schedules")
      .then((r) => r.json())
      .then((data: { schedules?: ScheduleWithUsage[] }) => {
        if (data.schedules) setSchedules(data.schedules);
      })
      .catch(() => {});
  }, []);

  function startNew() {
    setEditingId("new");
    setEditName("Working hours");
    setEditDays(defaultDayEdit());
    setEditDateOverrides([]);
    setEditIsDefault(schedules.length === 0);
    setError(null);
  }

  function startEdit(s: AvailabilitySchedule) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditDays(scheduleToEditDays(s));
    setEditDateOverrides(normalizeDateOverridesFromSchedule(s.date_overrides));
    setEditIsDefault(s.is_default);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this schedule? Any booking links using it will switch to the default.")) return;
    try {
      const res = await fetch(`/api/availability-schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Delete failed");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/availability-schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      router.refresh();
      const updated = await fetch("/api/availability-schedules").then((r) => r.json());
      if (updated.schedules) setSchedules(updated.schedules);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set default");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const weekly_availability = dayEditToPerDay(editDays);
    try {
      let res: Response;
      const body = {
        name: editName.trim(),
        weekly_availability,
        is_default: editIsDefault,
        date_overrides: editDateOverrides.map((o) => ({
          date: o.date,
          ranges: o.ranges.map(({ start_hour, end_hour }) => ({ start_hour, end_hour })),
        })),
      };
      if (editingId === "new") {
        res = await fetch("/api/availability-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/availability-schedules/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      const updated = await fetch("/api/availability-schedules").then((r) => r.json());
      if (updated.schedules) setSchedules(updated.schedules);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {schedules.length === 0 && editingId !== "new" && (
        <div style={{ textAlign: "center", padding: "var(--space-10) 0", color: "var(--color-text-muted)", fontSize: 14 }}>
          No schedules yet. Create one to define your working hours.
        </div>
      )}

      {/* Schedule cards */}
      {schedules.map((s) => {
        const isSelected = selectedId === s.id;
        return (
          <div key={s.id}>
            <div
              onClick={() => editingId === null && onSelect(s.id)}
              style={{
                border: "1px solid var(--border-subtle)",
                borderLeft: isSelected ? "3px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: isSelected ? "var(--space-4) var(--space-5) var(--space-4) calc(var(--space-5) - 2px)" : "var(--space-4) var(--space-5)",
                background: isSelected ? "rgba(74,158,255,0.03)" : "var(--color-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-4)",
                cursor: editingId === null ? "pointer" : "default",
                transition: "border-color 0.12s, background 0.12s",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{s.name}</span>
                  {s.is_default && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", background: "var(--color-primary-light)", borderRadius: 4, padding: "2px 7px" }}>
                      Default
                    </span>
                  )}
                </div>
                {(s.usage_count ?? 0) > 0 && (
                  <div style={{ fontSize: 11, color: "var(--color-primary)", marginTop: 3 }}>
                    Active on {s.usage_count} booking link{s.usage_count !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {!s.is_default && (
                  <button
                    onClick={() => handleSetDefault(s.id)}
                    style={{ ...ghostBtn, fontSize: 12 }}
                  >
                    Set default
                  </button>
                )}
                <button onClick={() => startEdit(s)} style={ghostBtn}>Edit</button>
                {schedules.length > 1 && (
                  <button onClick={() => handleDelete(s.id)} style={{ ...ghostBtn, color: "#dc2626" }}>Delete</button>
                )}
              </div>
            </div>

            {/* Inline edit panel */}
            {editingId === s.id && (
              <ScheduleEditPanel
                name={editName}
                days={editDays}
                dateOverrides={editDateOverrides}
                isDefault={editIsDefault}
                canUnsetDefault={!s.is_default}
                saving={saving}
                error={error}
                onNameChange={setEditName}
                onDaysChange={setEditDays}
                onDateOverridesChange={setEditDateOverrides}
                onIsDefaultChange={setEditIsDefault}
                onSave={handleSave}
                onCancel={cancelEdit}
              />
            )}
          </div>
        );
      })}

      {/* New schedule form */}
      {editingId === "new" && (
        <ScheduleEditPanel
          name={editName}
          days={editDays}
          dateOverrides={editDateOverrides}
          isDefault={editIsDefault}
          canUnsetDefault={false}
          saving={saving}
          error={error}
          onNameChange={setEditName}
          onDaysChange={setEditDays}
          onDateOverridesChange={setEditDateOverrides}
          onIsDefaultChange={setEditIsDefault}
          onSave={handleSave}
          onCancel={cancelEdit}
        />
      )}

      {editingId === null && (
        <button onClick={startNew} style={outlineBtn}>
          + New schedule
        </button>
      )}
    </div>
  );
}

// ── Schedule edit panel — Calendly-style per-day rows ──────────────────────────

function ScheduleEditPanel({
  name, days, dateOverrides, isDefault, canUnsetDefault, saving, error,
  onNameChange, onDaysChange, onDateOverridesChange, onIsDefaultChange, onSave, onCancel,
}: {
  name: string;
  days: DayEdit[];
  dateOverrides: DateOverrideLocal[];
  isDefault: boolean;
  canUnsetDefault: boolean;
  saving: boolean;
  error: string | null;
  onNameChange: (v: string) => void;
  onDaysChange: (v: DayEdit[]) => void;
  onDateOverridesChange: (v: DateOverrideLocal[]) => void;
  onIsDefaultChange: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  // 15-min increment options: 0, 0.25, 0.5, … 23.75 for start; 0.25 … 24 for end
  const [showOverrideModal, setShowOverrideModal] = React.useState(false);
  const [editingOverrideDate, setEditingOverrideDate] = React.useState<string | null>(null);

  function toggleDay(key: DayKey) {
    onDaysChange(days.map((d) =>
      d.key !== key ? d : {
        ...d,
        enabled: !d.enabled,
        ranges: d.ranges.length ? d.ranges : [{ id: `${key}-0`, start_hour: 9, end_hour: 17 }],
      }
    ));
  }

  function addRange(key: DayKey) {
    onDaysChange(days.map((d) =>
      d.key !== key ? d : {
        ...d,
        enabled: true,
        ranges: [...d.ranges, { id: `${key}-${Date.now()}`, start_hour: 9, end_hour: 17 }],
      }
    ));
  }

  function removeRange(key: DayKey, rangeId: string) {
    onDaysChange(days.map((d) => {
      if (d.key !== key) return d;
      const remaining = d.ranges.filter((r) => r.id !== rangeId);
      return { ...d, ranges: remaining.length ? remaining : [{ id: `${key}-0`, start_hour: 9, end_hour: 17 }], enabled: remaining.length > 0 };
    }));
  }

  function updateRange(key: DayKey, rangeId: string, patch: { start_hour?: number; end_hour?: number }) {
    onDaysChange(days.map((d) =>
      d.key !== key ? d : {
        ...d,
        ranges: d.ranges.map((r) => r.id === rangeId ? { ...r, ...patch } : r),
      }
    ));
  }

  function copyToAll(key: DayKey) {
    const src = days.find((d) => d.key === key);
    if (!src) return;
    onDaysChange(days.map((d) =>
      d.key === key ? d : {
        ...d,
        enabled: src.enabled,
        ranges: src.ranges.map((r, i) => ({ ...r, id: `${d.key}-copy-${i}` })),
      }
    ));
  }

  function removeOverride(date: string) {
    onDateOverridesChange(dateOverrides.filter((o) => o.date !== date));
  }

  function handleApplyOverride(incoming: DateOverrideLocal[]) {
    const merged = [...dateOverrides];
    for (const inc of incoming) {
      const idx = merged.findIndex((o) => o.date === inc.date);
      if (idx >= 0) merged[idx] = inc;
      else merged.push(inc);
    }
    merged.sort((a, b) => a.date.localeCompare(b.date));
    onDateOverridesChange(merged);
    setShowOverrideModal(false);
    setEditingOverrideDate(null);
  }

  const editingOverride = editingOverrideDate
    ? dateOverrides.find((o) => o.date === editingOverrideDate) ?? null
    : null;

  return (
    <>
    <div style={{
      border: "1px solid var(--color-primary)", borderRadius: "var(--radius-lg)",
      padding: "var(--space-5)", background: "var(--color-surface)", marginTop: "var(--space-2)",
    }}>
      {/* Name */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <label style={labelStyle}>Schedule name</label>
        <input value={name} onChange={(e) => onNameChange(e.target.value)} style={inputStyle} placeholder="e.g. Working hours" />
      </div>

      {/* Per-day rows */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>Weekly hours</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {DAYS.map((d, di) => {
            const dayEdit = days.find((de) => de.key === d.key)!;
            return (
              <div key={d.key} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 0",
                borderTop: di === 0 ? "1px solid var(--border-subtle)" : "none",
                borderBottom: "1px solid var(--border-subtle)",
              }}>
                {/* Toggle + day label */}
                <div style={{ width: 72, display: "flex", alignItems: "center", gap: 8, paddingTop: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleDay(d.key)}
                    style={{
                      width: 32, height: 18, borderRadius: 9,
                      border: "none",
                      background: dayEdit.enabled ? "var(--color-primary)" : "#d1d5db",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: 2, left: dayEdit.enabled ? 14 : 2,
                      width: 14, height: 14, borderRadius: "50%",
                      background: "white",
                      transition: "left 0.15s",
                    }} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{d.short}</span>
                </div>

                {/* Ranges or unavailable */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!dayEdit.enabled ? (
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: "32px" }}>Unavailable</span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {dayEdit.ranges.map((range, rangeIdx) => {
                        const isLast = rangeIdx === dayEdit.ranges.length - 1;
                        const endBeforeStart = range.end_hour <= range.start_hour;
                        return (
                          <div key={range.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0, flexShrink: 0 }}>
                                <TimePicker
                                  value={range.start_hour}
                                  onChange={(v) => updateRange(d.key, range.id, { start_hour: v })}
                                />
                                <span style={{ fontSize: 13, color: "var(--color-text-muted)", paddingTop: 8, flexShrink: 0 }}>–</span>
                                <TimePicker
                                  value={range.end_hour}
                                  onChange={(v) => updateRange(d.key, range.id, { end_hour: v })}
                                  minFh={range.start_hour}
                                  isEndTime
                                />
                              </div>
                              {/* × always shown; + and copy on last range */}
                              <div style={{ display: "flex", alignItems: "center", gap: 4, paddingTop: 3, flexShrink: 0 }}>
                                <button
                                  onClick={() => removeRange(d.key, range.id)}
                                  title="Remove range"
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}
                                >×</button>
                                {isLast && (
                                  <>
                                    <button
                                      onClick={() => addRange(d.key)}
                                      title="Add time range"
                                      style={{ background: "none", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}
                                    >+</button>
                                    <button
                                      onClick={() => copyToAll(d.key)}
                                      title="Copy to all days"
                                      style={{ background: "none", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--color-text-muted)", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, flexShrink: 0 }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3 11V3h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {endBeforeStart && (
                              <div style={{ fontSize: 11, color: "#9ca3af", paddingLeft: 1 }}>
                                End time must be after start time
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date-specific availability */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Date-specific availability</div>
          <button
            onClick={() => { setEditingOverrideDate(null); setShowOverrideModal(true); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-primary)", fontFamily: "var(--font-sans)", fontWeight: 500, padding: 0 }}
          >
            + Add hours
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: dateOverrides.length ? 10 : 0 }}>
          Override your weekly hours for specific dates.
        </div>
        {dateOverrides.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dateOverrides.map((o) => (
              <div key={o.date} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", background: "var(--color-surface-subtle)" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", minWidth: 100 }}>
                  {formatOverrideDate(o.date)}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", flex: 1 }}>
                  {o.ranges.map((r) => `${formatHourShort(r.start_hour)}–${formatHourShort(r.end_hour)}`).join(", ")}
                </span>
                <button
                  onClick={() => { setEditingOverrideDate(o.date); setShowOverrideModal(true); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: 12, fontFamily: "var(--font-sans)", padding: "2px 4px" }}
                >Edit</button>
                <button onClick={() => removeOverride(o.date)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "2px 4px" }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Default toggle */}
      {canUnsetDefault && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: "var(--space-4)", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => onIsDefaultChange(e.target.checked)}
            style={{ accentColor: "var(--color-primary)" }}
          />
          <span style={{ color: "var(--color-text-primary)" }}>Set as default schedule</span>
        </label>
      )}

      {error && <div style={{ fontSize: 13, color: "#dc2626", marginBottom: "var(--space-3)" }}>{error}</div>}

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button onClick={onSave} disabled={saving} style={primaryBtn}>{saving ? "Saving…" : "Save"}</button>
        <button onClick={onCancel} disabled={saving} style={ghostBtn}>Cancel</button>
      </div>
    </div>

    {showOverrideModal && (
      <DateOverrideModal
        initialOverrides={editingOverride ? [editingOverride] : []}
        onApply={handleApplyOverride}
        onClose={() => { setShowOverrideModal(false); setEditingOverrideDate(null); }}
      />
    )}
    </>
  );
}

// ── Date Override Modal ────────────────────────────────────────────────────────
// DateOverrideModal is imported from ./DateOverrideModal


// ── Color palette for calendar accounts ───────────────────────────────────────

const ACCOUNT_COLORS = [
  "#4a9eff",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#ea580c",
];

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getHourInTZ(date: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "numeric", hour12: false, timeZone: tz,
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h + m / 60;
  } catch {
    return date.getHours() + date.getMinutes() / 60;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════

function CalendarTab({
  accounts, setAccounts, onRefresh,
}: {
  accounts: MultiCalendarState["accounts"];
  setAccounts: React.Dispatch<React.SetStateAction<MultiCalendarState["accounts"]>>;
  onRefresh: () => void;
}) {
  const [showConnectMenu, setShowConnectMenu] = React.useState(false);
  const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null);
  const [settingWriteId, setSettingWriteId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const noneConnected = accounts.length === 0;

  React.useEffect(() => {
    function outside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowConnectMenu(false);
    }
    if (showConnectMenu) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [showConnectMenu]);

  async function handleDisconnect(id: string, label: string) {
    if (!confirm(`Disconnect ${label}? It will no longer be checked for conflicts.`)) return;
    setDisconnectingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/calendar-accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Disconnect failed");
      setAccounts((prev) => {
        const remaining = prev.filter((a) => a.id !== id);
        const hadWrite = prev.find((a) => a.id === id)?.isWrite;
        if (hadWrite && remaining.length > 0 && !remaining.some((a) => a.isWrite)) {
          return remaining.map((a, i) => (i === 0 ? { ...a, isWrite: true } : a));
        }
        return remaining;
      });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnectingId(null);
    }
  }

  async function handleSetWrite(id: string) {
    const account = accounts.find((a) => a.id === id);
    const label = account?.email ?? (account?.provider === "google" ? "Google Calendar" : "Outlook Calendar");
    if (!confirm(`Switch the "add events to" calendar to ${label}? New bookings will be added here.`)) return;
    setSettingWriteId(id);
    setError(null);
    try {
      const res = await fetch(`/api/calendar-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_write: true }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setAccounts((prev) => prev.map((a) => ({ ...a, isWrite: a.id === id })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSettingWriteId(null);
    }
  }

  async function handleSaveCalendarIds(id: string, ids: string[]) {
    const res = await fetch(`/api/calendar-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendar_ids: ids }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selectedCalendarIds: ids } : a))
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {noneConnected && (
        <div style={{
          border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-xl)",
          padding: "var(--space-10)", textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)",
        }}>
          <div style={{ fontSize: 32 }}>📅</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>Connect a calendar</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", maxWidth: 360 }}>
              CitaCal checks your calendar for busy times and adds events when a booking is confirmed.
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/api/auth/google?from=integrations" style={providerBtn}><GoogleCalIcon /><span>Google Calendar</span></Link>
            <Link href="/api/auth/microsoft?from=integrations" style={providerBtn}><OutlookIcon /><span>Outlook Calendar</span></Link>
          </div>
        </div>
      )}

      {/* ── Connected accounts ── */}
      {!noneConnected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Accounts row */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Connected calendars</div>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: "var(--space-3)", marginTop: 0 }}>
              All connected calendars are checked for busy times to prevent double-bookings.
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              {accounts.map((account, i) => {
                const color = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length];
                const label = account.provider === "google" ? "Google Calendar" : "Outlook Calendar";
                return (
                  <div key={account.id} style={{ flex: "0 0 auto", width: 260 }}>
                    <CalendarProviderCard
                      provider={account.provider}
                      email={account.email}
                      calendars={account.calendars}
                      selectedIds={account.selectedCalendarIds}
                      color={color}
                      disconnecting={disconnectingId === account.id}
                      onDisconnect={() => handleDisconnect(account.id, `${label}${account.email ? ` (${account.email})` : ""}`)}
                      onSaveIds={(ids) => handleSaveCalendarIds(account.id, ids)}
                    />
                  </div>
                );
              })}
              {/* Connect button — same width as calendar cards */}
              <div ref={menuRef} style={{ position: "relative", flex: "0 0 auto", width: 260 }}>
                <button
                  onClick={() => setShowConnectMenu((o) => !o)}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "8px 12px",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    color: "var(--color-text-muted)",
                    fontSize: 13, fontWeight: 500,
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                  }}
                >
                  + Connect calendar
                </button>
                {showConnectMenu && (
                  <div style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", background: "var(--color-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "var(--space-1)", zIndex: 500, minWidth: 200 }}>
                    <Link href="/api/auth/google?from=integrations" style={menuItemStyle}><GoogleCalIcon size={24} /><span style={{ fontSize: 13 }}>Google Calendar</span></Link>
                    <Link href="/api/auth/microsoft?from=integrations" style={menuItemStyle}><OutlookIcon size={24} /><span style={{ fontSize: 13 }}>Outlook Calendar</span></Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add events to */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Add events to</div>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: "var(--space-3)", marginTop: 0 }}>
              New bookings will be added to this calendar.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {accounts.map((account, i) => {
                const color = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length];
                return (
                  <label key={account.id} style={{
                    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                    padding: "6px 12px", borderRadius: "var(--radius-md)",
                    border: `1px solid ${account.isWrite ? color + "80" : "var(--border-subtle)"}`,
                    background: account.isWrite ? color + "10" : "transparent",
                    fontSize: 12,
                  }}>
                    <input
                      type="radio"
                      name="write_account"
                      checked={account.isWrite}
                      onChange={() => !settingWriteId && handleSetWrite(account.id)}
                      style={{ accentColor: color }}
                    />
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ color: "var(--color-text-primary)" }}>
                      {account.email ?? (account.provider === "google" ? "Google" : "Outlook")}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarProviderCard({
  provider, email, calendars, selectedIds, color, disconnecting,
  onDisconnect, onSaveIds,
}: {
  provider: "google" | "microsoft";
  email: string | null;
  calendars: Array<{ id: string; name: string; isPrimary: boolean }>;
  selectedIds: string[];
  color: string;
  disconnecting: boolean;
  onDisconnect: () => void;
  onSaveIds: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [localIds, setLocalIds] = React.useState(selectedIds);
  const [saving, setSaving] = React.useState(false);

  const checkedCount = localIds.length;

  async function save() {
    setSaving(true);
    try { await onSaveIds(localIds); } finally { setSaving(false); setExpanded(false); }
  }

  function toggleId(id: string) {
    setLocalIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  return (
    <div style={{
      border: `1px solid ${expanded ? color + "60" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-md)",
      background: "var(--color-surface)",
      overflow: "hidden",
      transition: "border-color 0.12s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ flexShrink: 0, transform: "scale(0.7)", transformOrigin: "left center", width: 22, height: 22 }}>
          {provider === "google" ? <GoogleCalIcon /> : <OutlookIcon />}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {email ?? (provider === "google" ? "Google Calendar" : "Outlook Calendar")}
          </div>
          {calendars.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: color, cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {checkedCount} calendar{checkedCount !== 1 ? "s" : ""} {expanded ? "▲" : "▼"}
            </button>
          )}
        </div>
        <button
          onClick={onDisconnect}
          disabled={disconnecting}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "2px 4px", fontSize: 14, lineHeight: 1, flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      {expanded && calendars.length > 0 && (
        <div style={{ borderTop: `1px solid ${color}30`, padding: "8px 10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {calendars.map((cal) => (
              <label key={cal.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={localIds.includes(cal.id)}
                  onChange={() => toggleId(cal.id)}
                  style={{ accentColor: color, width: 13, height: 13 }}
                />
                <span style={{ color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cal.name}{cal.isPrimary && <span style={{ color: "var(--color-text-muted)", marginLeft: 4 }}>(primary)</span>}
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={save} disabled={saving} style={{ ...primaryBtn, padding: "4px 10px", fontSize: 12, background: color }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setLocalIds(selectedIds); setExpanded(false); }} style={{ ...ghostBtn, padding: "4px 10px", fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WEEKLY CALENDAR VIEW
// ══════════════════════════════════════════════════════════════════════════════

const START_HOUR = 0;
const END_HOUR = 24;
const PX_PER_HOUR = 44;
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR; // 1056
const TIME_COL_W = 40;
const CALENDAR_MAX_HEIGHT = 520; // scrollable viewport height

type BusyInterval = { start: string; end: string };
type AccountBusy = { accountId: string; busy: BusyInterval[] };

type Block = { day: number; top: number; height: number; color: string };
type LanedBlock = Block & { lane: number; totalLanes: number };

function assignLanesForDay(dayBlocks: Block[]): LanedBlock[] {
  if (dayBlocks.length === 0) return [];
  const sorted = [...dayBlocks].sort((a, b) => a.top - b.top);
  const laneEnds: number[] = [];
  const laned = sorted.map((block) => {
    let lane = laneEnds.findIndex((end) => end <= block.top);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = block.top + block.height;
    return { ...block, lane };
  });
  const totalLanes = laneEnds.length;
  return laned.map((b) => ({ ...b, totalLanes }));
}

function WeeklyCalendarView({ accounts, timezone, onTimezoneChange, selectedSchedule }: {
  accounts: import("@/lib/calendar-connections").MultiCalendarState["accounts"];
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  selectedSchedule?: AvailabilitySchedule;
}) {
  const [weekStart, setWeekStart] = React.useState(() => getMonday(new Date()));
  const [busyData, setBusyData] = React.useState<AccountBusy[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Tick every minute so the current-time line moves in real time
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Auto-scroll to show current time centered in viewport
  React.useEffect(() => {
    if (!scrollRef.current) return;
    const nowHour = getHourInTZ(new Date(), timezone);
    const nowPx = (nowHour - START_HOUR) * PX_PER_HOUR;
    const scrollTo = Math.max(0, nowPx - CALENDAR_MAX_HEIGHT / 2);
    scrollRef.current.scrollTop = scrollTo;
  }, [timezone]);

  React.useEffect(() => {
    if (accounts.length === 0) return;
    setLoading(true);
    fetch(`/api/calendar-freebusy?weekStart=${toISODate(weekStart)}`)
      .then((r) => r.json())
      .then((data: { accounts?: AccountBusy[] }) => setBusyData(data.accounts ?? []))
      .catch(() => setBusyData([]))
      .finally(() => setLoading(false));
  }, [weekStart, accounts.length]);

  const colorMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach((a, i) => { map[a.id] = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]; });
    return map;
  }, [accounts]);

  const blocks = React.useMemo((): Block[] => {
    const result: Block[] = [];
    for (const ab of busyData) {
      const color = colorMap[ab.accountId] ?? "#aaa";
      for (const interval of ab.busy) {
        const start = new Date(interval.start);
        const end = new Date(interval.end);
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
          const dayStart = new Date(weekStart);
          dayStart.setDate(dayStart.getDate() + dayIdx);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          const bStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
          const bEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
          if (bStart >= bEnd) continue;
          const sh = getHourInTZ(bStart, timezone);
          const eh = getHourInTZ(bEnd, timezone);
          const cs = Math.max(sh, START_HOUR);
          const ce = Math.min(eh, END_HOUR);
          if (cs >= ce) continue;
          result.push({ day: dayIdx, top: (cs - START_HOUR) * PX_PER_HOUR, height: (ce - cs) * PX_PER_HOUR, color });
        }
      }
    }
    return result;
  }, [busyData, colorMap, weekStart, timezone]);

  const lanedBlocks = React.useMemo((): LanedBlock[] => {
    const byDay = new Map<number, Block[]>();
    for (const b of blocks) {
      if (!byDay.has(b.day)) byDay.set(b.day, []);
      byDay.get(b.day)!.push(b);
    }
    const result: LanedBlock[] = [];
    for (const [, dayBlocks] of byDay) {
      result.push(...assignLanesForDay(dayBlocks));
    }
    return result;
  }, [blocks]);

  const today = React.useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const nowTop = (() => {
    const nowHour = getHourInTZ(now, timezone);
    const t = (nowHour - START_HOUR) * PX_PER_HOUR;
    return t >= 0 && t <= TOTAL_HEIGHT ? t : null;
  })();
  const todayIdx = days.findIndex((d) => d.toDateString() === today.toDateString());

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div>
      {/* Header with month label + Today button */}
      {(() => {
        const sm = weekStart.getMonth(), em = days[6].getMonth();
        const sy = weekStart.getFullYear(), cy = new Date().getFullYear();
        const label = sm === em
          ? `${MONTHS[sm]}${sy !== cy ? " " + sy : ""}`
          : `${SHORT[sm]} – ${SHORT[em]}${sy !== cy ? " " + sy : ""}`;
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "2px 6px" }}
              >‹</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", minWidth: 120, textAlign: "center" }}>{label}</span>
              <button
                onClick={() => setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "2px 6px" }}
              >›</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TimezonePicker value={timezone} onChange={onTimezoneChange} />
              <button
                onClick={() => setWeekStart(getMonday(new Date()))}
                style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", background: "var(--color-primary-light, rgba(74,158,255,0.08))", border: "1px solid rgba(74,158,255,0.25)", borderRadius: "var(--radius-sm)", padding: "3px 10px", cursor: "pointer", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}
              >
                Today
              </button>
            </div>
          </div>
        );
      })()}

      {/* Day labels */}
      <div style={{ display: "flex", paddingLeft: TIME_COL_W, borderBottom: "1px solid var(--border-subtle)" }}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} style={{ flex: 1, textAlign: "center", padding: "5px 0", fontSize: 11 }}>
            <div style={{ color: todayIdx === i ? "var(--color-primary)" : "var(--color-text-muted)", fontWeight: 600 }}>{d}</div>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", lineHeight: "20px", margin: "1px auto 0",
              background: todayIdx === i ? "var(--color-primary)" : "transparent",
              color: todayIdx === i ? "#fff" : "var(--color-text-primary)",
              fontSize: 11, fontWeight: todayIdx === i ? 700 : 400,
            }}>
              {days[i].getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        style={{ overflowY: "auto", maxHeight: CALENDAR_MAX_HEIGHT, position: "relative" }}
      >
        {loading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, fontSize: 12, color: "var(--color-text-muted)" }}>
            Loading…
          </div>
        )}
        <div style={{ display: "flex", height: TOTAL_HEIGHT }}>
          {/* Time axis */}
          <div style={{ width: TIME_COL_W, flexShrink: 0, position: "relative" }}>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
              const h = START_HOUR + i;
              const label = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
              return (
                <div key={h} style={{ position: "absolute", top: i * PX_PER_HOUR - 7, right: 6, fontSize: 9, color: "var(--color-text-muted)", textAlign: "right", lineHeight: 1 }}>
                  {label}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          <div style={{ flex: 1, position: "relative" }}>
            {/* Hour lines */}
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, top: i * PX_PER_HOUR, height: 1, background: "var(--border-subtle)", zIndex: 1 }} />
            ))}
            {/* Day column borders */}
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} style={{
                position: "absolute", top: 0, bottom: 0,
                left: `${(i / 7) * 100}%`, width: `${100 / 7}%`,
                borderRight: i < 6 ? "1px solid var(--border-subtle)" : "none",
                background: todayIdx === i ? "rgba(74,158,255,0.03)" : "transparent",
              }} />
            ))}

            {/* Availability schedule dim — hours outside working hours (date overrides take precedence) */}
            {(() => {
              const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
              if (!selectedSchedule) return null;
              const wa = selectedSchedule.weekly_availability as Record<string, DayCfg>;
              const dateOverrides = (selectedSchedule.date_overrides ?? []) as { date: string; ranges: { start_hour: number; end_hour: number }[] }[];
              return DAY_KEYS.map((dk, dayIdx) => {
                const dimStyle = (top: number, height: number, key: string) => (
                  <div key={key} style={{ position: "absolute", top, left: `${(dayIdx / 7) * 100}%`, width: `${100 / 7}%`, height, background: "rgba(0,0,0,0.045)", zIndex: 2, pointerEvents: "none" }} />
                );
                // Check for a date-specific override for this calendar column
                const dayISO = toISODate(days[dayIdx]);
                const override = dateOverrides.find((o) => o.date === dayISO);
                let ranges: { start_hour: number; end_hour: number }[];
                if (override) {
                  // Highlight the override column with a faint blue tint
                  ranges = override.ranges.length ? override.ranges : [];
                  if (ranges.length === 0) return dimStyle(0, TOTAL_HEIGHT, `dim-all-${dayIdx}`);
                } else {
                  const cfg = getDayConfig(wa, dk);
                  const enabled = isDayEnabled(cfg);
                  if (!enabled) return dimStyle(0, TOTAL_HEIGHT, `dim-all-${dayIdx}`);
                  ranges = cfg!.ranges?.length ? cfg!.ranges : [{ start_hour: cfg!.start_hour ?? 9, end_hour: cfg!.end_hour ?? 17 }];
                }
                const sorted = [...ranges].sort((a, b) => a.start_hour - b.start_hour);
                const overlays: React.ReactNode[] = [];
                if (override) {
                  // Faint blue backdrop on override days so they're visually distinct
                  overlays.push(<div key={`override-bg-${dayIdx}`} style={{ position: "absolute", top: 0, left: `${(dayIdx / 7) * 100}%`, width: `${100 / 7}%`, height: TOTAL_HEIGHT, background: "rgba(74,158,255,0.04)", zIndex: 2, pointerEvents: "none" }} />);
                }
                if (sorted[0].start_hour > START_HOUR)
                  overlays.push(dimStyle(0, (sorted[0].start_hour - START_HOUR) * PX_PER_HOUR, `dim-before-${dayIdx}`));
                for (let ri = 1; ri < sorted.length; ri++) {
                  const gS = sorted[ri - 1].end_hour, gE = sorted[ri].start_hour;
                  if (gE > gS) overlays.push(dimStyle((gS - START_HOUR) * PX_PER_HOUR, (gE - gS) * PX_PER_HOUR, `dim-gap-${dayIdx}-${ri}`));
                }
                const last = sorted[sorted.length - 1];
                if (last.end_hour < END_HOUR)
                  overlays.push(dimStyle((last.end_hour - START_HOUR) * PX_PER_HOUR, (END_HOUR - last.end_hour) * PX_PER_HOUR, `dim-after-${dayIdx}`));
                return overlays;
              });
            })()}

            {/* Busy blocks with lane support */}
            {lanedBlocks.map((b, i) => {
              const dayW = `calc(100% / 7)`;
              const laneW = `calc(${dayW} / ${b.totalLanes} - 2px)`;
              const laneLeft = `calc(${b.day} * ${dayW} + ${b.lane} * (${dayW} / ${b.totalLanes}) + 1px)`;
              return (
                <div key={i} style={{
                  position: "absolute",
                  top: b.top,
                  height: Math.max(b.height, 3),
                  left: laneLeft,
                  width: laneW,
                  background: `repeating-linear-gradient(-45deg, ${b.color}44, ${b.color}44 3px, transparent 3px, transparent 7px), ${b.color}18`,
                  border: `1px solid ${b.color}55`,
                  borderRadius: 3,
                  zIndex: 3,
                }} />
              );
            })}

            {/* Current time line */}
            {nowTop !== null && todayIdx >= 0 && (
              <div style={{
                position: "absolute",
                top: nowTop,
                left: `calc(${todayIdx} * (100% / 7))`,
                width: `calc(100% / 7)`,
                height: 2,
                background: "#ef4444",
                zIndex: 5,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", position: "absolute", left: -3, top: -3 }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-text-primary)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 14,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-sans)",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};

const ghostBtn: React.CSSProperties = {
  background: "none",
  color: "var(--color-text-muted)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};

const outlineBtn: React.CSSProperties = {
  background: "none",
  color: "var(--color-text-primary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};

const providerBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 20px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-lg)",
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  transition: "border-color 0.12s",
};

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  textDecoration: "none",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};
