"use client";

/**
 * ThreeDaySlotPicker — rebuilt with absolute-overlay blocks
 *
 * Key fixes vs previous version:
 * 1. Blocked stripes: rendered as column-level position:absolute overlays so
 *    the repeating-linear-gradient is one continuous block — no cuts at row
 *    boundaries when slot_increment < 60.
 * 2. Time labels: hour marks show time on line 1 ("09:00") + AM/PM on line 2.
 *    Uniform across all rows — no inconsistent wrapping.
 * 3. Grey flash: slots are cached by ISO date key; slotsMap is never cleared
 *    on navigation — only days not yet in cache trigger a fetch.
 */

import * as React from "react";
import { useBookingStore } from "@/store/bookingStore";

const HOUR_HEIGHT = 48; // px per visual hour
const LABEL_WIDTH = 52; // px for time-label column

// ── Helpers ────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minsToLabel(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

type RowEntry = {
  timeStr: string;
  totalMins: number;
  isHour: boolean;
  isHalfHour: boolean;
};

function buildRows(start_hour: number, end_hour: number, slot_increment: number): RowEntry[] {
  const rows: RowEntry[] = [];
  for (let t = start_hour * 60; t + slot_increment <= end_hour * 60; t += slot_increment) {
    const m = t % 60;
    rows.push({
      timeStr: minsToLabel(t),
      totalMins: t,
      isHour: m === 0,
      isHalfHour: m === 30,
    });
  }
  return rows;
}

function getThreeDays(anchor: string): string[] {
  const base = new Date(anchor + "T00:00:00");
  return [0, 1, 2].map((offset) => {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    return toISODate(d);
  });
}

function formatDayHeader(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isToday: d.getTime() === today.getTime(),
  };
}

function formatRange(days: string[]): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(days[0])} – ${fmt(days[days.length - 1])}`;
}

/**
 * Compute contiguous ranges of unavailable rows for column-level hatched overlays.
 * A row is "covered" (treated as available space) if it falls within the duration
 * window of an available starting slot.
 */
function computeUnavailableBlocks(
  allRows: RowEntry[],
  daySlots: string[],
  rowsPerDuration: number
): { startIdx: number; endIdx: number }[] {
  const blocks: { startIdx: number; endIdx: number }[] = [];
  let blockStart = -1;

  for (let i = 0; i < allRows.length; i++) {
    let isCovered = daySlots.includes(allRows[i].timeStr);

    // If not a direct start slot, check if it's within the duration window
    // of a preceding available start slot.
    if (!isCovered) {
      for (let si = Math.max(0, i - rowsPerDuration + 1); si < i; si++) {
        if (daySlots.includes(allRows[si].timeStr)) {
          isCovered = true;
          break;
        }
      }
    }

    if (!isCovered) {
      if (blockStart === -1) blockStart = i;
    } else {
      if (blockStart !== -1) {
        blocks.push({ startIdx: blockStart, endIdx: i });
        blockStart = -1;
      }
    }
  }
  if (blockStart !== -1) {
    blocks.push({ startIdx: blockStart, endIdx: allRows.length });
  }
  return blocks;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ThreeDaySlotPicker({
  anchorDate,
  onAnchorChange,
  eventSlug,
  start_hour = 9,
  end_hour = 17,
  slot_increment = 30,
  duration = 30,
}: {
  anchorDate: string;
  onAnchorChange: (iso: string) => void;
  eventSlug?: string;
  start_hour?: number;
  end_hour?: number;
  slot_increment?: number;
  duration?: number;
}) {
  const { selectedDate, selectedTime, setDate, setTime } = useBookingStore();

  // slotsMap is a cache — never cleared on navigate (prevents grey flash)
  const [slotsMap, setSlotsMap] = React.useState<Record<string, string[]>>({});
  const [loadingSet, setLoadingSet] = React.useState<Set<string>>(new Set());
  const [hover, setHover] = React.useState<{ day: string; rowIdx: number } | null>(null);
  const [now, setNow] = React.useState<Date>(() => new Date());

  // Track which days have been fetched (ref = synchronous, no stale closure issue)
  const fetchedDaysRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 1 visual hour = HOUR_HEIGHT; each slot row is proportionally sized
  const ROW_HEIGHT = Math.max(20, Math.round((HOUR_HEIGHT * slot_increment) / 60));
  const rowsPerDuration = Math.max(1, Math.round(duration / slot_increment));

  const allRows = React.useMemo(
    () => buildRows(start_hour, end_hour, slot_increment),
    [start_hour, end_hour, slot_increment]
  );

  const days = React.useMemo(() => getThreeDays(anchorDate), [anchorDate]);

  const todayISO = toISODate(new Date());
  const canGoPrev = anchorDate > todayISO;

  function prevDays() {
    if (!canGoPrev) return;
    const base = new Date(anchorDate + "T00:00:00");
    base.setDate(base.getDate() - 3);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidate = base < today ? today : base;
    onAnchorChange(toISODate(candidate));
  }

  function nextDays() {
    const base = new Date(anchorDate + "T00:00:00");
    base.setDate(base.getDate() + 3);
    onAnchorChange(toISODate(base));
  }

  // Fetch availability — only for days not already in the cache
  React.useEffect(() => {
    const uncached = days.filter((day) => !fetchedDaysRef.current.has(day));
    if (uncached.length === 0) return;

    setLoadingSet((prev) => {
      const next = new Set(prev);
      uncached.forEach((d) => next.add(d));
      return next;
    });
    setHover(null);

    uncached.forEach((day) => {
      fetchedDaysRef.current.add(day); // mark immediately to prevent duplicate fetches
      const url = `/api/availability?date=${day}${eventSlug ? `&event=${eventSlug}` : ""}`;
      fetch(url)
        .then((r) => r.json())
        .then((data: { slots: string[] | null }) => {
          const fetched = Array.isArray(data.slots) ? data.slots : allRows.map((r) => r.timeStr);
          setSlotsMap((prev) => ({ ...prev, [day]: fetched }));
        })
        .catch(() => {
          // On error: treat all slots as available (graceful degradation)
          setSlotsMap((prev) => ({ ...prev, [day]: allRows.map((r) => r.timeStr) }));
        })
        .finally(() => {
          setLoadingSet((prev) => {
            const next = new Set(prev);
            next.delete(day);
            return next;
          });
        });
    });
  }, [anchorDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRowIdx =
    selectedTime ? allRows.findIndex((r) => r.timeStr === selectedTime) : -1;

  // Current-time line position
  const totalGridHeight = allRows.length * ROW_HEIGHT;
  const startMins = start_hour * 60;
  const endMins = end_hour * 60;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = ((nowMins - startMins) / (endMins - startMins)) * totalGridHeight;
  const showCurrentTime = nowMins > startMins && nowMins < endMins;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 260 }}>
        {/* ── Navigation ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-3)",
            paddingLeft: LABEL_WIDTH,
          }}
        >
          <button
            className="btn btn-ghost btn-sm"
            onClick={prevDays}
            disabled={!canGoPrev}
            style={{ fontSize: 12, opacity: canGoPrev ? 1 : 0.3 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600 }}>
            {formatRange(days)}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={nextDays} style={{ fontSize: 12 }}>
            Next →
          </button>
        </div>

        {/* ── Day headers ── */}
        <div style={{ display: "flex", borderBottom: "2px solid var(--border-default)" }}>
          <div style={{ width: LABEL_WIDTH, flexShrink: 0 }} />
          {days.map((day) => {
            const { weekday, date, isToday } = formatDayHeader(day);
            const isBooked = selectedDate === day;
            const accentColor = isBooked
              ? "var(--blue-400)"
              : isToday
              ? "var(--blue-500)"
              : undefined;

            return (
              <div
                key={day}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "var(--space-2) 0",
                  gap: 2,
                  borderLeft: "1px solid var(--border-default)",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    color: accentColor ?? "var(--text-tertiary)",
                  }}
                >
                  {isToday ? "TODAY" : weekday}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: isBooked || isToday ? 800 : 500,
                    color: accentColor ?? "var(--text-primary)",
                  }}
                >
                  {date}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Slot grid ── */}
        <div
          style={{ overflowY: "auto", maxHeight: 340 }}
          onMouseLeave={() => setHover(null)}
        >
          <div style={{ display: "flex" }}>
            {/* ── Time label column ── */}
            <div style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
              {allRows.map((row, rowIdx) => {
                // Split "09:00 AM" into ["09:00", "AM"] for two-line rendering
                const [timePart, period] = row.isHour
                  ? minsToLabel(row.totalMins).split(" ")
                  : ["", ""];

                return (
                  <div
                    key={row.timeStr}
                    style={{
                      height: ROW_HEIGHT,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      justifyContent: "flex-start",
                      paddingTop: 2,
                      paddingRight: 8,
                      fontSize: 9,
                      color: "var(--text-tertiary)",
                      fontWeight: 500,
                      userSelect: "none",
                      lineHeight: 1.2,
                      borderTop:
                        rowIdx === 0
                          ? "none"
                          : row.isHour
                          ? "1px solid var(--border-default)"
                          : row.isHalfHour
                          ? "1px solid #e5e5e5"
                          : "none",
                    }}
                  >
                    {row.isHour && (
                      <>
                        <span>{timePart}</span>
                        <span>{period}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Day columns ── */}
            {days.map((day) => {
              const isLoadingDay = loadingSet.has(day);
              const daySlots = slotsMap[day] ?? [];
              const { isToday } = formatDayHeader(day);

              const hoverStart = hover?.day === day ? hover.rowIdx : -1;
              const selStart = selectedDate === day ? selectedRowIdx : -1;
              const overlayH = rowsPerDuration * ROW_HEIGHT;

              // Column-level unavailable block overlays (continuous stripe pattern)
              const unavailableBlocks = !isLoadingDay
                ? computeUnavailableBlocks(allRows, daySlots, rowsPerDuration)
                : [];

              return (
                <div
                  key={day}
                  style={{
                    flex: 1,
                    borderLeft: "1px solid var(--border-default)",
                    position: "relative",
                  }}
                >
                  {/* ── Row cells: grid lines + pointer events ── */}
                  {allRows.map((row, rowIdx) => {
                    const isAvailable = !isLoadingDay && daySlots.includes(row.timeStr);
                    return (
                      <div
                        key={row.timeStr}
                        style={{
                          height: ROW_HEIGHT,
                          // Loading: grey; loaded: transparent (overlays paint on top)
                          background: isLoadingDay ? "var(--surface-subtle)" : "transparent",
                          borderTop:
                            rowIdx === 0
                              ? "none"
                              : row.isHour
                              ? "1px solid var(--border-default)"
                              : row.isHalfHour
                              ? "1px solid #e5e5e5"
                              : "none",
                          cursor: isAvailable ? "pointer" : "default",
                        }}
                        onMouseEnter={() => {
                          if (isAvailable) setHover({ day, rowIdx });
                          else if (hover?.day === day) setHover(null);
                        }}
                        onClick={() => {
                          if (isAvailable) {
                            setDate(day);
                            setTime(row.timeStr);
                          }
                        }}
                      />
                    );
                  })}

                  {/* ── Unavailable blocks: column-level continuous hatched overlay ──
                      Placed after row cells in DOM so they paint on top of transparent rows.
                      pointerEvents:none lets hover/click pass through to row cells. */}
                  {unavailableBlocks.map(({ startIdx, endIdx }) => (
                    <div
                      key={startIdx}
                      style={{
                        position: "absolute",
                        top: startIdx * ROW_HEIGHT,
                        height: (endIdx - startIdx) * ROW_HEIGHT,
                        left: 0,
                        right: 0,
                        background:
                          "repeating-linear-gradient(45deg, transparent, transparent 4px, #f4f4f4 4px, #f4f4f4 8px)",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    />
                  ))}

                  {/* ── Current time red line (today column only) ── */}
                  {isToday && showCurrentTime && (
                    <div
                      style={{
                        position: "absolute",
                        top: currentTimeTop,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: "#ef4444",
                        pointerEvents: "none",
                        zIndex: 4,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: -3,
                          top: -3,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ef4444",
                        }}
                      />
                    </div>
                  )}

                  {/* ── Hover overlay ── */}
                  {hoverStart >= 0 && selStart < 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: hoverStart * ROW_HEIGHT,
                        height: overlayH,
                        left: 3,
                        right: 3,
                        background: "rgba(74,158,255,0.16)",
                        borderRadius: "var(--radius-md)",
                        pointerEvents: "none",
                        zIndex: 3,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        padding: "0 7px",
                      }}
                    >
                      {overlayH >= 20 && (
                        <span
                          style={{ fontSize: 10, fontWeight: 600, color: "var(--blue-500)", lineHeight: 1.3 }}
                        >
                          {allRows[hoverStart]?.timeStr}
                          {" – "}
                          {minsToLabel((allRows[hoverStart]?.totalMins ?? 0) + duration)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* ── Selected overlay ── */}
                  {selStart >= 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: selStart * ROW_HEIGHT,
                        height: overlayH,
                        left: 3,
                        right: 3,
                        background: "var(--blue-400)",
                        borderRadius: "var(--radius-md)",
                        pointerEvents: "none",
                        zIndex: 3,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        padding: "0 7px",
                      }}
                    >
                      {overlayH >= 20 && (
                        <span
                          style={{ fontSize: 10, fontWeight: 700, color: "white", lineHeight: 1.3 }}
                        >
                          {allRows[selStart]?.timeStr}
                          {" – "}
                          {minsToLabel((allRows[selStart]?.totalMins ?? 0) + duration)} ✓
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Out-of-view selection indicator */}
        {selectedDate && selectedTime && !days.includes(selectedDate) && (
          <div
            style={{
              marginTop: "var(--space-3)",
              paddingLeft: LABEL_WIDTH,
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Selected:</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--blue-400)" }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              at {selectedTime}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
