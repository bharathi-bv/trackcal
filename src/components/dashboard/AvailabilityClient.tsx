"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MultiCalendarState } from "@/lib/calendar-connections";
import type { AvailabilitySchedule } from "@/lib/availability-schedules";

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

type TimeRange = { start_hour: number; end_hour: number };
type EditRange = { id: string; start_hour: number; end_hour: number; days: DayKey[] };

const DEFAULT_RANGES: EditRange[] = [
  { id: "default", start_hour: 9, end_hour: 17, days: ["mon", "tue", "wed", "thu", "fri"] },
];

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

function scheduleSummary(schedule: AvailabilitySchedule): string {
  const wa = schedule.weekly_availability as Record<string, { enabled?: boolean; start_hour?: number; end_hour?: number; ranges?: { start_hour: number; end_hour: number }[] }>;
  const enabledDays = DAYS.filter((d) => wa[d.key]?.enabled);
  if (enabledDays.length === 0) return "No days available";
  const hours = enabledDays[0];
  const dayConfig = wa[hours.key];
  const startH = dayConfig?.ranges?.[0]?.start_hour ?? dayConfig?.start_hour ?? 9;
  const endH = dayConfig?.ranges?.[0]?.end_hour ?? dayConfig?.end_hour ?? 17;
  const dayLabels = enabledDays.map((d) => d.short).join(", ");
  return `${dayLabels} · ${formatHour(startH)}–${formatHour(endH)}`;
}

function getEditRanges(schedule: AvailabilitySchedule): EditRange[] {
  const wa = schedule.weekly_availability as Record<string, { enabled?: boolean; start_hour?: number; end_hour?: number; ranges?: TimeRange[] }>;
  // Group per-day ranges by their times
  const map = new Map<string, EditRange>();
  DAYS.forEach((d) => {
    const cfg = wa[d.key];
    if (!cfg?.enabled) return;
    const dayRanges = cfg.ranges?.length ? cfg.ranges : [{ start_hour: cfg.start_hour ?? 9, end_hour: cfg.end_hour ?? 17 }];
    dayRanges.forEach((r) => {
      const key = `${r.start_hour}-${r.end_hour}`;
      if (map.has(key)) {
        map.get(key)!.days.push(d.key);
      } else {
        map.set(key, { id: key, start_hour: r.start_hour, end_hour: r.end_hour, days: [d.key] });
      }
    });
  });
  return map.size > 0 ? Array.from(map.values()) : [...DEFAULT_RANGES];
}

// ── Calendar icons ─────────────────────────────────────────────────────────────

function GoogleCalIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* White background */}
      <rect x="5" y="5" width="38" height="38" rx="4" fill="white" stroke="#DADCE0" strokeWidth="1.5"/>
      {/* Blue header */}
      <path d="M5 9a4 4 0 014-4h30a4 4 0 014 4v8H5V9z" fill="#1a73e8"/>
      {/* Ring binders */}
      <rect x="15" y="2" width="4" height="9" rx="2" fill="#1a73e8"/>
      <rect x="29" y="2" width="4" height="9" rx="2" fill="#1a73e8"/>
      {/* "31" */}
      <text x="24" y="37" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1a73e8" fontFamily="sans-serif">31</text>
      {/* Google color dots */}
      <circle cx="14" cy="28" r="2.5" fill="#EA4335"/>
      <circle cx="24" cy="28" r="2.5" fill="#4285F4"/>
      <circle cx="34" cy="28" r="2.5" fill="#34A853"/>
    </svg>
  );
}

function OutlookIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Blue background */}
      <rect x="4" y="4" width="40" height="40" rx="7" fill="#0078D4"/>
      {/* White envelope/calendar body */}
      <rect x="14" y="13" width="20" height="22" rx="3" fill="white" opacity="0.15"/>
      {/* White calendar header */}
      <rect x="14" y="13" width="20" height="8" rx="3" fill="white" opacity="0.95"/>
      <rect x="14" y="17" width="20" height="4" fill="white" opacity="0.95"/>
      {/* Binders */}
      <rect x="19" y="10" width="3" height="7" rx="1.5" fill="white"/>
      <rect x="26" y="10" width="3" height="7" rx="1.5" fill="white"/>
      {/* Calendar grid */}
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
  const defaultTab = searchParams.get("tab") === "calendar" ? "calendar" : "schedules";
  const [tab, setTab] = React.useState<"schedules" | "calendar">(defaultTab);
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

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

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Page header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
          Availability
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 4 }}>
          Manage your working hours and connected calendars.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", marginBottom: "var(--space-8)", gap: 0 }}>
        {(["schedules", "calendar"] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            style={{
              background: "none",
              border: "none",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: tab === t ? 600 : 500,
              color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)",
              borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              transition: "color 0.12s",
            }}
          >
            {t === "schedules" ? "Schedules" : "Calendar settings"}
          </button>
        ))}
      </div>

      {tab === "schedules" ? (
        <SchedulesTab initialSchedules={initialSchedules} />
      ) : (
        <CalendarTab initial={initialCalendar} onRefresh={() => router.refresh()} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULES TAB
// ══════════════════════════════════════════════════════════════════════════════

function SchedulesTab({ initialSchedules }: { initialSchedules: AvailabilitySchedule[] }) {
  const router = useRouter();
  const [schedules, setSchedules] = React.useState(initialSchedules);
  const [editingId, setEditingId] = React.useState<string | "new" | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = React.useState("");
  const [editRanges, setEditRanges] = React.useState<EditRange[]>(DEFAULT_RANGES);
  const [editIsDefault, setEditIsDefault] = React.useState(false);

  function startNew() {
    setEditingId("new");
    setEditName("Working hours");
    setEditRanges([{ id: "r1", start_hour: 9, end_hour: 17, days: ["mon", "tue", "wed", "thu", "fri"] }]);
    setEditIsDefault(schedules.length === 0);
    setError(null);
  }

  function startEdit(s: AvailabilitySchedule) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditRanges(getEditRanges(s));
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
    const perDay: Record<string, { enabled: boolean; ranges: TimeRange[] }> = {};
    DAYS.forEach((d) => { perDay[d.key] = { enabled: false, ranges: [] }; });
    editRanges.forEach((r) => {
      r.days.forEach((day) => {
        perDay[day].enabled = true;
        perDay[day].ranges.push({ start_hour: r.start_hour, end_hour: r.end_hour });
      });
    });
    const weekly_availability = perDay;
    try {
      let res: Response;
      if (editingId === "new") {
        res = await fetch("/api/availability-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), weekly_availability, is_default: editIsDefault }),
        });
      } else {
        res = await fetch(`/api/availability-schedules/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), weekly_availability, is_default: editIsDefault }),
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

  const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {schedules.length === 0 && editingId !== "new" && (
        <div style={{ textAlign: "center", padding: "var(--space-10) 0", color: "var(--color-text-muted)", fontSize: 14 }}>
          No schedules yet. Create one to define your working hours.
        </div>
      )}

      {/* Schedule cards */}
      {schedules.map((s) => (
        <div key={s.id}>
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4) var(--space-5)",
              background: "var(--color-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-4)",
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
              <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>
                {scheduleSummary(s)}
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
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
              ranges={editRanges}
              isDefault={editIsDefault}
              canUnsetDefault={!s.is_default}
              saving={saving}
              error={error}
              hourOptions={HOUR_OPTIONS}
              onNameChange={setEditName}
              onRangesChange={setEditRanges}
              onIsDefaultChange={setEditIsDefault}
              onSave={handleSave}
              onCancel={cancelEdit}
            />
          )}
        </div>
      ))}

      {/* New schedule form */}
      {editingId === "new" && (
        <ScheduleEditPanel
          name={editName}
          ranges={editRanges}
          isDefault={editIsDefault}
          canUnsetDefault={false}
          saving={saving}
          error={error}
          hourOptions={HOUR_OPTIONS}
          onNameChange={setEditName}
          onRangesChange={setEditRanges}
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

function ScheduleEditPanel({
  name, ranges, isDefault, canUnsetDefault, saving, error, hourOptions,
  onNameChange, onRangesChange, onIsDefaultChange, onSave, onCancel,
}: {
  name: string;
  ranges: EditRange[];
  isDefault: boolean;
  canUnsetDefault: boolean;
  saving: boolean;
  error: string | null;
  hourOptions: number[];
  onNameChange: (v: string) => void;
  onRangesChange: (v: EditRange[]) => void;
  onIsDefaultChange: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  function addRange() {
    const id = `r${Date.now()}`;
    onRangesChange([...ranges, { id, start_hour: 9, end_hour: 17, days: [] }]);
  }

  function removeRange(id: string) {
    onRangesChange(ranges.filter((r) => r.id !== id));
  }

  function updateRange(id: string, patch: Partial<EditRange>) {
    onRangesChange(ranges.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function toggleDay(rangeId: string, day: DayKey) {
    const range = ranges.find((r) => r.id === rangeId)!;
    const days = range.days.includes(day)
      ? range.days.filter((d) => d !== day)
      : [...range.days, day];
    updateRange(rangeId, { days });
  }

  return (
    <div style={{
      border: "1px solid var(--color-primary)", borderRadius: "var(--radius-lg)",
      padding: "var(--space-5)", background: "var(--color-surface)", marginTop: "var(--space-2)",
    }}>
      {/* Name */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <label style={labelStyle}>Schedule name</label>
        <input value={name} onChange={(e) => onNameChange(e.target.value)} style={inputStyle} placeholder="e.g. Working hours" />
      </div>

      {/* Ranges */}
      <div style={{ marginBottom: "var(--space-5)" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>Working hours</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {ranges.map((range) => (
            <div key={range.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "12px 14px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", background: "var(--color-surface-subtle)" }}>
              {/* Time selects */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div className="tc-select-wrap" style={{ minWidth: 96 }}>
                  <select
                    value={range.start_hour}
                    onChange={(e) => updateRange(range.id, { start_hour: Number(e.target.value) })}
                    className="tc-input"
                    style={{ fontSize: 13, padding: "4px 28px 4px 8px", height: 34 }}
                  >
                    {hourOptions.slice(0, 24).map((h) => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>to</span>
                <div className="tc-select-wrap" style={{ minWidth: 96 }}>
                  <select
                    value={range.end_hour}
                    onChange={(e) => updateRange(range.id, { end_hour: Number(e.target.value) })}
                    className="tc-input"
                    style={{ fontSize: 13, padding: "4px 28px 4px 8px", height: 34 }}
                  >
                    {hourOptions.slice(1).map((h) => (
                      <option key={h} value={h} disabled={h <= range.start_hour}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }} />
                {ranges.length > 1 && (
                  <button
                    onClick={() => removeRange(range.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 18, lineHeight: 1, padding: 2 }}
                  >×</button>
                )}
              </div>
              {/* Day toggles */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAYS.map((d) => {
                  const active = range.days.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      onClick={() => toggleDay(range.id, d.key)}
                      style={{
                        width: 34, height: 28, borderRadius: "var(--radius-sm)",
                        border: `1px solid ${active ? "var(--color-primary)" : "var(--border-subtle)"}`,
                        background: active ? "var(--color-primary)" : "var(--color-surface)",
                        color: active ? "white" : "var(--color-text-muted)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                        fontFamily: "var(--font-sans)", transition: "all 0.12s",
                      }}
                    >
                      {d.short.slice(0, 2)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addRange}
          style={{ marginTop: "var(--space-2)", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-primary)", fontFamily: "var(--font-sans)", padding: 0, fontWeight: 500 }}
        >
          + Add time range
        </button>
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
  );
}

// ── Color palette for calendar accounts ───────────────────────────────────────

const ACCOUNT_COLORS = [
  "#4a9eff", // blue
  "#7c3aed", // purple
  "#059669", // green
  "#d97706", // amber
  "#dc2626", // red
  "#0891b2", // teal
  "#db2777", // pink
  "#ea580c", // orange
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

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════

function CalendarTab({ initial, onRefresh }: { initial: MultiCalendarState; onRefresh: () => void }) {
  const [accounts, setAccounts] = React.useState(initial.accounts);
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
            <a href="/api/auth/google?from=integrations" style={providerBtn}><GoogleCalIcon /><span>Google Calendar</span></a>
            <a href="/api/auth/microsoft?from=integrations" style={providerBtn}><OutlookIcon /><span>Outlook Calendar</span></a>
          </div>
        </div>
      )}

      {/* ── Connected accounts ── */}
      {!noneConnected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Accounts row */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Connected calendars</div>
              <div ref={menuRef} style={{ position: "relative" }}>
                <button onClick={() => setShowConnectMenu((o) => !o)} style={{ ...outlineBtn, fontSize: 12, padding: "5px 12px" }}>
                  + Connect calendar
                </button>
                {showConnectMenu && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--color-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "var(--space-1)", zIndex: 500, minWidth: 200 }}>
                    <a href="/api/auth/google?from=integrations" style={menuItemStyle}><GoogleCalIcon size={24} /><span style={{ fontSize: 13 }}>Google Calendar</span></a>
                    <a href="/api/auth/microsoft?from=integrations" style={menuItemStyle}><OutlookIcon size={24} /><span style={{ fontSize: 13 }}>Outlook Calendar</span></a>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              {accounts.map((account, i) => {
                const color = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length];
                const label = account.provider === "google" ? "Google Calendar" : "Outlook Calendar";
                return (
                  <div key={account.id} style={{ flex: "0 0 auto", width: 260 }}>
                    <CalendarProviderCard
                      id={account.id}
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
            </div>
          </div>

          {/* Add events to */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>Add events to</div>
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
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6 }}>New bookings will be added to this calendar.</div>
          </div>

          {/* Weekly view — full width */}
          <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--color-surface)" }}>
            <WeeklyCalendarView accounts={accounts} />
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarProviderCard({
  id: _id, provider, email, calendars, selectedIds, color, disconnecting,
  onDisconnect, onSaveIds,
}: {
  id: string;
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
        {/* Color dot */}
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        {/* Provider icon (small) */}
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

      {/* Calendar picker */}
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

const START_HOUR = 7;
const END_HOUR = 22;
const PX_PER_HOUR = 32;
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR;
const TIME_COL_W = 36;

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

function WeeklyCalendarView({ accounts }: { accounts: import("@/lib/calendar-connections").MultiCalendarState["accounts"] }) {
  const [weekStart, setWeekStart] = React.useState(() => getMonday(new Date()));
  const [busyData, setBusyData] = React.useState<AccountBusy[]>([]);
  const [loading, setLoading] = React.useState(false);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  React.useEffect(() => {
    if (accounts.length === 0) return;
    setLoading(true);
    fetch(`/api/calendar-freebusy?weekStart=${toISODate(weekStart)}`)
      .then((r) => r.json())
      .then((data: { accounts?: AccountBusy[] }) => setBusyData(data.accounts ?? []))
      .catch(() => setBusyData([]))
      .finally(() => setLoading(false));
  }, [weekStart, accounts.length]);

  // accountId → color map
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
          const sh = bStart.getHours() + bStart.getMinutes() / 60;
          const eh = bEnd.getHours() + bEnd.getMinutes() / 60;
          const cs = Math.max(sh, START_HOUR);
          const ce = Math.min(eh, END_HOUR);
          if (cs >= ce) continue;
          result.push({ day: dayIdx, top: (cs - START_HOUR) * PX_PER_HOUR, height: (ce - cs) * PX_PER_HOUR, color });
        }
      }
    }
    return result;
  }, [busyData, colorMap, weekStart]);

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
    const now = new Date();
    const t = (now.getHours() + now.getMinutes() / 60 - START_HOUR) * PX_PER_HOUR;
    return t >= 0 && t <= TOTAL_HEIGHT ? t : null;
  })();
  const todayIdx = days.findIndex((d) => d.toDateString() === today.toDateString());

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
        <button
          onClick={() => setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "2px 6px" }}
        >‹</button>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
          {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{days[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <button
          onClick={() => setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1, padding: "2px 6px" }}
        >›</button>
      </div>

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

      {/* Time grid */}
      <div style={{ overflowY: "auto", position: "relative" }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, fontSize: 12, color: "var(--color-text-muted)" }}>
            Loading…
          </div>
        )}
        <div style={{ display: "flex", height: TOTAL_HEIGHT }}>
          {/* Time axis */}
          <div style={{ width: TIME_COL_W, flexShrink: 0, position: "relative" }}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
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

function writeOptionStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    padding: "var(--space-4) var(--space-5)",
    border: `1px solid ${active ? "var(--color-primary)" : "var(--border-subtle)"}`,
    borderRadius: "var(--radius-lg)",
    background: active ? "var(--color-primary-light)" : "var(--color-surface)",
    cursor: "pointer",
    transition: "border-color 0.12s, background 0.12s",
  };
}
