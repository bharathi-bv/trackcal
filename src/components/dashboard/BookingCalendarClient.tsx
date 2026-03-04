"use client";

import * as React from "react";

type Booking = { date: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_LONG = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildGrid(year: number, month: number): (string | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(mondayOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISODate(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function BookingCalendarClient({
  bookings,
  selectedDate,
  onDateSelect,
}: {
  bookings: Booking[];
  selectedDate?: string | null;
  onDateSelect?: (date: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth());

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const countMap = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) m.set(b.date, (m.get(b.date) ?? 0) + 1);
    return m;
  }, [bookings]);

  const grid = React.useMemo(() => buildGrid(year, month), [year, month]);

  const rows = React.useMemo(() => {
    const r: (string | null)[][] = [];
    for (let i = 0; i < grid.length; i += 7) r.push(grid.slice(i, i + 7));
    return r;
  }, [grid]);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthTotal = React.useMemo(
    () => bookings.filter((b) => b.date.startsWith(monthPrefix)).length,
    [bookings, monthPrefix]
  );

  const maxCount = Math.max(1, ...grid.filter(Boolean).map((d) => countMap.get(d!) ?? 0));

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const btnStyle: React.CSSProperties = {
    background: "none",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    width: 26,
    height: 26,
    cursor: "pointer",
    fontSize: 14,
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <div className="tc-card" style={{ padding: "var(--space-4)" }}>
      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <button type="button" onClick={prevMonth} style={btnStyle} aria-label="Previous month">‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            {MONTHS_LONG[month]} {year}
          </div>
          <div style={{ fontSize: 10, color: monthTotal > 0 ? "var(--color-primary)" : "var(--text-tertiary)", fontWeight: 600, marginTop: 1 }}>
            {monthTotal > 0 ? `${monthTotal} meeting${monthTotal !== 1 ? "s" : ""}` : "No meetings"}
          </div>
        </div>
        <button type="button" onClick={nextMonth} style={btnStyle} aria-label="Next month">›</button>
      </div>

      {/* Day-of-week headers + "Wk" column */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr) 26px", gap: 2, marginBottom: 2 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em", padding: "2px 0 3px" }}>
            {d}
          </div>
        ))}
        <div style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.04em", padding: "2px 0 3px" }}>
          Wk
        </div>
      </div>

      {/* Rows */}
      {rows.map((row, rowIdx) => {
        const weekTotal = row
          .filter(Boolean)
          .reduce((sum, iso) => sum + (countMap.get(iso!) ?? 0), 0);

        return (
          <div
            key={rowIdx}
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr) 26px", gap: 2, marginBottom: 2 }}
          >
            {row.map((iso, i) => {
              if (!iso) return <div key={`pad-${rowIdx}-${i}`} />;
              const count = countMap.get(iso) ?? 0;
              const isToday = iso === todayStr;
              const isSelected = iso === selectedDate;
              const isPast = iso < todayStr;
              const intensity = count > 0 ? Math.max(0.15, count / maxCount) : 0;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onDateSelect?.(iso)}
                  title={count > 0 ? `${count} booking${count !== 1 ? "s" : ""}` : formatDayTitle(iso)}
                  style={{
                    borderRadius: "var(--radius-md)",
                    padding: "5px 3px 4px",
                    minHeight: 38,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    background: isSelected
                      ? "var(--color-primary-light)"
                      : isToday
                      ? "var(--blue-50)"
                      : count > 0
                      ? `rgba(123,108,246,${intensity * 0.13})`
                      : "transparent",
                    border: isSelected
                      ? "1.5px solid var(--color-primary)"
                      : isToday
                      ? "1.5px solid var(--blue-400)"
                      : "1px solid transparent",
                    cursor: "pointer",
                    transition: "background 0.12s, border-color 0.12s",
                  }}
                >
                  <span style={{
                    fontSize: 11,
                    fontWeight: isSelected || isToday ? 700 : 500,
                    color: isSelected
                      ? "var(--color-primary)"
                      : isToday
                      ? "var(--blue-500)"
                      : isPast
                      ? "var(--text-tertiary)"
                      : "var(--text-secondary)",
                    lineHeight: 1,
                  }}>
                    {Number(iso.slice(8))}
                  </span>
                  {count > 0 && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      lineHeight: 1,
                      background: isSelected ? "var(--color-primary)" : "var(--blue-400)",
                      color: "#fff",
                      borderRadius: "var(--radius-full)",
                      minWidth: 14,
                      height: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Weekly total */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: weekTotal > 0 ? 700 : 400,
              color: weekTotal > 0 ? "var(--color-primary)" : "var(--text-tertiary)",
              borderLeft: "1px solid var(--border-subtle)",
            }}>
              {weekTotal > 0 ? weekTotal : "—"}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: "var(--space-2) 0 0", textAlign: "center" }}>
        Click any date to view meetings
      </p>
    </div>
  );
}

function formatDayTitle(iso: string) {
  const [y, mo, da] = iso.split("-").map(Number);
  return new Date(y, mo - 1, da).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
