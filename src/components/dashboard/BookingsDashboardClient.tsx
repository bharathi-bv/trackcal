"use client";

import * as React from "react";
import BookingCalendarClient from "./BookingCalendarClient";

export type UpcomingBooking = {
  id: string;
  date: string;
  time: string;
  name: string;
  email: string;
  status: string;
  event_slug: string | null;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const PX_PER_HOUR = 64;
const GRID_START   = 7;   // 7 AM
const GRID_END     = 21;  // 9 PM
const GRID_HOURS   = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);
const TOTAL_HEIGHT = (GRID_END - GRID_START) * PX_PER_HOUR;
const GUTTER_W     = 52;
const GRID_MAX_H   = 580;

const DAYS_SHORT  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type ViewMode = "schedule" | "day" | "week" | "month";

// ── Date helpers ──────────────────────────────────────────────────────────────

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function adjacentISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoFromDate(new Date(y, m - 1, d + delta));
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000
  );
}

function getMondayISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + offset);
  return isoFromDate(date);
}

function sectionLabel(iso: string, todayISO: string): string {
  const diff = daysBetween(todayISO, iso);
  if (diff === -1) return "Yesterday";
  if (diff === 0)  return "Today";
  if (diff === 1)  return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function parseHour(timeStr: string): number {
  const parts = timeStr.trim().split(" ");
  const period = (parts[1] ?? "AM").toUpperCase();
  const [hStr, mStr] = (parts[0] ?? "").split(":");
  let h = parseInt(hStr ?? "0");
  const m = parseInt(mStr ?? "0");
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h + m / 60;
}

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// ── Lane assignment (prevents overlapping blocks in day/week view) ─────────────

type LanedBooking = { booking: UpcomingBooking; lane: number; totalLanes: number };

const SLOT_HOURS = 50 / PX_PER_HOUR; // approx height of one event block in hours

function assignLanes(dayBookings: UpcomingBooking[]): LanedBooking[] {
  const sorted = [...dayBookings].sort((a, b) => parseHour(a.time) - parseHour(b.time));
  const laneFreeAt: number[] = []; // when each lane becomes free
  const assignments: { booking: UpcomingBooking; lane: number }[] = [];

  for (const booking of sorted) {
    const start = parseHour(booking.time);
    let lane = laneFreeAt.findIndex((t) => t <= start);
    if (lane === -1) lane = laneFreeAt.length;
    laneFreeAt[lane] = start + SLOT_HOURS;
    assignments.push({ booking, lane });
  }

  const totalLanes = Math.max(1, laneFreeAt.length);
  return assignments.map((a) => ({ ...a, totalLanes }));
}

// ── Status styles ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending",   label: "Pending"   },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show",   label: "No Show"   },
];

const STATUS_STYLE: Record<string, { color: string; background: string; border: string }> = {
  confirmed: { color: "#2d9969",  background: "rgba(61,170,122,0.10)",  border: "rgba(61,170,122,0.25)"  },
  pending:   { color: "#b45309",  background: "rgba(217,119,6,0.10)",   border: "rgba(217,119,6,0.25)"   },
  cancelled: { color: "#dc2626",  background: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.22)"   },
  no_show:   { color: "#6b7280",  background: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.20)" },
};

// Lighter, more vibrant block colors for calendar event cards (Day / Week views)
const BLOCK_COLOR: Record<string, string> = {
  confirmed: "#34d399",  // emerald-400
  pending:   "#fbbf24",  // amber-400
  cancelled: "#f87171",  // red-400
  no_show:   "#94a3b8",  // slate-400
};

function StatusSelect({
  bookingId, value, onChange,
}: {
  bookingId: string; value: string; onChange: (id: string, s: string) => void;
}) {
  const s = STATUS_STYLE[value] ?? STATUS_STYLE.no_show;
  return (
    <select
      value={value}
      onChange={(e) => onChange(bookingId, e.target.value)}
      style={{
        fontSize: 11, fontWeight: 600, padding: "3px 22px 3px 8px",
        borderRadius: 999, border: `1px solid ${s.border}`,
        background: s.background, color: s.color,
        cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 7px center",
        fontFamily: "var(--font-sans)", flexShrink: 0,
      }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ── Schedule view sub-components ──────────────────────────────────────────────

function BookingRow({
  booking, status, onStatusChange, dimmed,
}: {
  booking: UpcomingBooking; status: string;
  onStatusChange: (id: string, s: string) => void; dimmed: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-3)",
      padding: "var(--space-3) 0", borderBottom: "1px solid var(--border-subtle)",
      opacity: dimmed ? 0.5 : 1, transition: "opacity 0.12s",
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", width: 72, flexShrink: 0 }}>
        {booking.time}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block" }}>{booking.name}</span>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {booking.email}
        </span>
      </div>
      <StatusSelect bookingId={booking.id} value={status} onChange={onStatusChange} />
    </div>
  );
}

function DaySection({
  label, dateISO, todayISO, bookings, statuses, onStatusChange,
}: {
  label: string; dateISO: string; todayISO: string; bookings: UpcomingBooking[];
  statuses: Record<string, string>; onStatusChange: (id: string, s: string) => void;
}) {
  const isPast = dateISO < todayISO;
  const dayBookings = bookings.filter((b) => b.date === dateISO);
  return (
    <div className="tc-card" style={{ padding: "var(--space-5) var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: dayBookings.length > 0 ? "var(--space-3)" : 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: isPast ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
          {label}
        </span>
        <span className={`tc-pill ${dayBookings.length > 0 && !isPast ? "tc-pill--primary" : "tc-pill--neutral"}`}>
          {dayBookings.length} meeting{dayBookings.length !== 1 ? "s" : ""}
        </span>
      </div>
      {dayBookings.length > 0 ? (
        <div>
          {dayBookings.map((b, i) => (
            <div key={b.id} style={i === dayBookings.length - 1 ? { borderBottom: "none" } : {}}>
              <BookingRow booking={b} status={statuses[b.id] ?? b.status} onStatusChange={onStatusChange} dimmed={isPast} />
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          No meetings {label.toLowerCase()}.
        </p>
      )}
    </div>
  );
}

// ── Booking block (Day / Week views) ──────────────────────────────────────────

function BookingBlock({
  booking, status, onStatusChange, lane, totalLanes,
}: {
  booking: UpcomingBooking; status: string;
  onStatusChange: (id: string, s: string) => void;
  lane: number; totalLanes: number;
}) {
  const hour = Math.max(GRID_START, Math.min(GRID_END - 0.75, parseHour(booking.time)));
  const topPx = (hour - GRID_START) * PX_PER_HOUR;
  const blockBg = BLOCK_COLOR[status] ?? BLOCK_COLOR.confirmed;
  const pct = 100 / totalLanes;
  const narrow = totalLanes > 1;

  return (
    <div
      style={{
        position: "absolute",
        top: topPx + 1,
        left: `calc(${lane * pct}% + 3px)`,
        width: `calc(${pct}% - 6px)`,
        minHeight: 50,
        borderRadius: 5,
        background: blockBg,
        boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        padding: "5px 7px",
        overflow: "hidden",
        zIndex: 1,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.45)", lineHeight: 1.2, whiteSpace: "nowrap" }}>{booking.time}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.75)", lineHeight: 1.3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {booking.name}
      </div>
      {!narrow && booking.event_slug && (
        <div style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", lineHeight: 1.2, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {booking.event_slug.replace(/-/g, " ")}
        </div>
      )}
      {!narrow && (
        <div style={{ marginTop: 5 }}>
          <select
            value={status}
            onChange={(e) => { e.stopPropagation(); onStatusChange(booking.id, e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 10, fontWeight: 600,
              padding: "2px 18px 2px 6px",
              borderRadius: 4,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "rgba(0,0,0,0.12)",
              color: "rgba(0,0,0,0.70)",
              cursor: "pointer", outline: "none",
              appearance: "none", WebkitAppearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='rgba(0,0,0,0.5)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 5px center",
              fontFamily: "var(--font-sans)",
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Time grid (shared by Day + Week) ─────────────────────────────────────────

function TimeGrid({
  days, bookings, statuses, onStatusChange, todayISO,
}: {
  days: string[];
  bookings: UpcomingBooking[];
  statuses: Record<string, string>;
  onStatusChange: (id: string, s: string) => void;
  todayISO: string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to 8 AM on mount / when days change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - GRID_START) * PX_PER_HOUR;
    }
  }, [days.length]);

  return (
    <div>
      {/* Day header row */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ width: GUTTER_W, flexShrink: 0 }} />
        {days.map((iso) => {
          const [y, m, d] = iso.split("-").map(Number);
          const date = new Date(y, m - 1, d);
          const dow = date.getDay();
          const dayName = DAYS_SHORT[dow === 0 ? 6 : dow - 1];
          const isToday = iso === todayISO;
          return (
            <div key={iso} style={{ flex: 1, textAlign: "center", padding: "10px 4px", borderLeft: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? "var(--color-primary)" : "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {dayName}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 700, lineHeight: 1.1, marginTop: 3,
                color: isToday ? "#fff" : "var(--text-primary)",
                background: isToday ? "var(--color-primary)" : "transparent",
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "3px auto 0",
              }}>
                {d}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time body */}
      <div ref={scrollRef} style={{ maxHeight: GRID_MAX_H, overflowY: "auto" }}>
        <div style={{ display: "flex", height: TOTAL_HEIGHT }}>
          {/* Hour gutter */}
          <div style={{ width: GUTTER_W, flexShrink: 0, position: "relative" }}>
            {GRID_HOURS.map((h) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: (h - GRID_START) * PX_PER_HOUR - 8,
                  right: 10,
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  lineHeight: 1,
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {hourLabel(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((iso) => {
            const dayBookings = bookings.filter((b) => b.date === iso);
            const isToday = iso === todayISO;
            return (
              <div
                key={iso}
                style={{
                  flex: 1,
                  position: "relative",
                  borderLeft: "1px solid var(--border-subtle)",
                  background: isToday ? "rgba(74,158,255,0.018)" : "transparent",
                }}
              >
                {GRID_HOURS.map((h) => (
                  <React.Fragment key={h}>
                    <div style={{ position: "absolute", top: (h - GRID_START) * PX_PER_HOUR, left: 0, right: 0, borderTop: "1px solid var(--border-subtle)" }} />
                    <div style={{ position: "absolute", top: (h - GRID_START + 0.5) * PX_PER_HOUR, left: 0, right: 0, borderTop: "1px dashed var(--border-subtle)", opacity: 0.5 }} />
                  </React.Fragment>
                ))}
                {assignLanes(dayBookings).map(({ booking: b, lane, totalLanes }) => (
                  <BookingBlock
                    key={b.id}
                    booking={b}
                    status={statuses[b.id] ?? b.status}
                    onStatusChange={onStatusChange}
                    lane={lane}
                    totalLanes={totalLanes}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────

function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(mondayOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function MonthGrid({
  focusDate, bookings, statuses, onStatusChange, todayISO, onDayClick,
}: {
  focusDate: string;
  bookings: UpcomingBooking[];
  statuses: Record<string, string>;
  onStatusChange: (id: string, s: string) => void;
  todayISO: string;
  onDayClick: (iso: string) => void;
}) {
  const [y, m] = focusDate.split("-").map(Number);
  const grid = buildMonthGrid(y, m - 1);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));

  const bookingsByDate = React.useMemo(() => {
    const map = new Map<string, UpcomingBooking[]>();
    for (const b of bookings) {
      if (!map.has(b.date)) map.set(b.date, []);
      map.get(b.date)!.push(b);
    }
    return map;
  }, [bookings]);

  // Flat grid: header + all cells in one container → guaranteed alignment
  const allCells = [...grid];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border-subtle)" }}>
      {/* Day-of-week headers */}
      {DAYS_SHORT.map((d) => (
        <div
          key={d}
          style={{
            background: "var(--surface-subtle, #fafafa)",
            textAlign: "center", fontSize: 11, fontWeight: 700,
            color: "var(--text-tertiary)", padding: "10px 0",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}
        >
          {d}
        </div>
      ))}

      {/* Calendar day cells */}
      {allCells.map((iso, i) => {
        if (!iso) {
          return (
            <div
              key={`pad-${i}`}
              style={{ minHeight: 110, background: "rgba(0,0,0,0.018)" }}
            />
          );
        }
        const dayBookings = bookingsByDate.get(iso) ?? [];
        const isToday = iso === todayISO;
        const isPast = iso < todayISO;
        const dayNum = Number(iso.slice(8));
        const visible = dayBookings.slice(0, 3);
        const overflow = dayBookings.length - visible.length;
        return (
          <div
            key={iso}
            onClick={() => onDayClick(iso)}
            style={{
              minHeight: 110, padding: "7px 8px",
              background: isToday ? "rgba(74,158,255,0.04)" : "var(--surface-page, #fff)",
              cursor: "pointer",
              transition: "background 0.1s",
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: isToday ? 700 : 500,
              color: isToday ? "#fff" : isPast ? "var(--text-tertiary)" : "var(--text-primary)",
              background: isToday ? "var(--color-primary)" : "transparent",
              width: 26, height: 26, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 5,
            }}>
              {dayNum}
            </div>
            {visible.map((b) => {
              const s = STATUS_STYLE[statuses[b.id] ?? b.status] ?? STATUS_STYLE.confirmed;
              return (
                <div key={b.id} style={{
                  fontSize: 10, fontWeight: 600,
                  color: "#fff",
                  background: s.color,
                  borderRadius: 3, padding: "2px 5px", marginBottom: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {b.time} · {b.name}
                </div>
              );
            })}
            {overflow > 0 && (
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-primary)", marginTop: 2 }}>
                +{overflow} more
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── View toolbar ──────────────────────────────────────────────────────────────

const NAV_BTN: React.CSSProperties = {
  background: "none", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)", width: 28, height: 28,
  cursor: "pointer", fontSize: 16, color: "var(--text-secondary)",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, fontFamily: "var(--font-sans)",
};

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: "schedule", label: "Schedule" },
  { key: "day",      label: "Day"      },
  { key: "week",     label: "Week"     },
  { key: "month",    label: "Month"    },
];

function ViewToolbar({
  view, onViewChange, focusDate, onPrev, onNext, onToday, todayISO,
}: {
  view: ViewMode; onViewChange: (v: ViewMode) => void;
  focusDate: string; onPrev: () => void; onNext: () => void; onToday: () => void;
  todayISO: string;
}) {
  let dateLabel = "";
  if (view === "day") {
    const [y, m, d] = focusDate.split("-").map(Number);
    dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } else if (view === "week") {
    const mon = getMondayISO(focusDate);
    const sun = adjacentISO(mon, 6);
    const [my, mm, md] = mon.split("-").map(Number);
    const [sy, sm, sd] = sun.split("-").map(Number);
    const start = new Date(my, mm - 1, md).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const end   = new Date(sy, sm - 1, sd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    dateLabel = `${start} – ${end}`;
  } else if (view === "month") {
    const [y, m] = focusDate.split("-").map(Number);
    dateLabel = `${MONTHS_LONG[m - 1]} ${y}`;
  }

  const showNav = view !== "schedule";
  const isAtToday = (() => {
    if (view === "day") return focusDate === todayISO;
    if (view === "week") return getMondayISO(focusDate) === getMondayISO(todayISO);
    if (view === "month") return focusDate.slice(0, 7) === todayISO.slice(0, 7);
    return false;
  })();

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)",
      gap: 12, flexWrap: "wrap",
    }}>
      {/* Left: nav + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {showNav && (
          <>
            <button onClick={onPrev} style={NAV_BTN} aria-label="Previous">‹</button>
            <button onClick={onNext} style={NAV_BTN} aria-label="Next">›</button>
          </>
        )}
        {dateLabel && (
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{dateLabel}</span>
        )}
        {showNav && !isAtToday && (
          <button
            onClick={onToday}
            style={{
              fontSize: 11, fontWeight: 600, color: "var(--color-primary)",
              background: "rgba(74,158,255,0.08)", border: "1px solid rgba(74,158,255,0.25)",
              borderRadius: "var(--radius-sm)", padding: "3px 10px",
              cursor: "pointer", fontFamily: "var(--font-sans)",
            }}
          >
            Today
          </button>
        )}
      </div>

      {/* Right: view toggle */}
      <div style={{
        display: "flex", background: "var(--surface-subtle)",
        border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
        overflow: "hidden", flexShrink: 0,
      }}>
        {VIEWS.map(({ key, label }, i) => (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            style={{
              fontSize: 12, fontWeight: 600, padding: "5px 14px",
              background: view === key ? "var(--color-primary)" : "transparent",
              color: view === key ? "#fff" : "var(--text-secondary)",
              border: "none",
              borderRight: i < VIEWS.length - 1 ? "1px solid var(--border-default)" : "none",
              cursor: "pointer", fontFamily: "var(--font-sans)",
              transition: "background 0.12s, color 0.12s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookingsDashboardClient({
  bookings,
  todayISO,
}: {
  bookings: UpcomingBooking[];
  todayISO: string;
}) {
  const [view, setView] = React.useState<ViewMode>("schedule");
  const [focusDate, setFocusDate] = React.useState<string>(todayISO);

  const [statuses, setStatuses] = React.useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    bookings.forEach((b) => { m[b.id] = b.status; });
    return m;
  });

  async function handleStatusChange(bookingId: string, newStatus: string) {
    setStatuses((prev) => ({ ...prev, [bookingId]: newStatus }));
    try {
      await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // best-effort
    }
  }

  function handlePrev() {
    if (view === "day") {
      setFocusDate((d) => adjacentISO(d, -1));
    } else if (view === "week") {
      setFocusDate((d) => adjacentISO(d, -7));
    } else if (view === "month") {
      setFocusDate((d) => {
        const [y, mo] = d.split("-").map(Number);
        return isoFromDate(new Date(y, mo - 2, 1));
      });
    }
  }

  function handleNext() {
    if (view === "day") {
      setFocusDate((d) => adjacentISO(d, 1));
    } else if (view === "week") {
      setFocusDate((d) => adjacentISO(d, 7));
    } else if (view === "month") {
      setFocusDate((d) => {
        const [y, mo] = d.split("-").map(Number);
        return isoFromDate(new Date(y, mo, 1));
      });
    }
  }

  function handleToday() {
    setFocusDate(todayISO);
  }

  // The 7 days to show in week view
  const weekDays = React.useMemo(() => {
    const monday = getMondayISO(focusDate);
    return Array.from({ length: 7 }, (_, i) => adjacentISO(monday, i));
  }, [focusDate]);

  // Schedule view sections: yesterday / today / tomorrow relative to focusDate
  const scheduleSections = [
    { dateISO: adjacentISO(focusDate, -1), label: sectionLabel(adjacentISO(focusDate, -1), todayISO) },
    { dateISO: focusDate,                  label: sectionLabel(focusDate, todayISO)                   },
    { dateISO: adjacentISO(focusDate, +1), label: sectionLabel(adjacentISO(focusDate, +1), todayISO)  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* Toolbar — always visible */}
      <div className="tc-card" style={{ padding: 0, overflow: "hidden" }}>
        <ViewToolbar
          view={view} onViewChange={setView}
          focusDate={focusDate} onPrev={handlePrev} onNext={handleNext}
          onToday={handleToday} todayISO={todayISO}
        />
      </div>

      {/* ── Schedule view ─────────────────────────────────────── */}
      {view === "schedule" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "var(--space-6)", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {scheduleSections.map((sec) => (
              <DaySection
                key={sec.dateISO}
                label={sec.label}
                dateISO={sec.dateISO}
                todayISO={todayISO}
                bookings={bookings}
                statuses={statuses}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
          <div style={{ position: "sticky", top: "78px" }}>
            <BookingCalendarClient
              bookings={bookings}
              selectedDate={focusDate}
              onDateSelect={setFocusDate}
            />
          </div>
        </div>
      )}

      {/* ── Day view ──────────────────────────────────────────── */}
      {view === "day" && (
        <div className="tc-card" style={{ padding: 0, overflow: "hidden" }}>
          <TimeGrid
            days={[focusDate]}
            bookings={bookings}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            todayISO={todayISO}
          />
        </div>
      )}

      {/* ── Week view ─────────────────────────────────────────── */}
      {view === "week" && (
        <div className="tc-card" style={{ padding: 0, overflow: "hidden" }}>
          <TimeGrid
            days={weekDays}
            bookings={bookings}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            todayISO={todayISO}
          />
        </div>
      )}

      {/* ── Month view ────────────────────────────────────────── */}
      {view === "month" && (
        <div className="tc-card" style={{ padding: 0, overflow: "hidden" }}>
          <MonthGrid
            focusDate={focusDate}
            bookings={bookings}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            todayISO={todayISO}
            onDayClick={(iso) => { setFocusDate(iso); setView("day"); }}
          />
        </div>
      )}

    </div>
  );
}
