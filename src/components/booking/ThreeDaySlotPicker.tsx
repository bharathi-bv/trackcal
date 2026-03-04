"use client";

/**
 * ThreeDaySlotPicker — now shows 5 days side-by-side.
 *
 * Timezone behaviour:
 *   - The API returns slot times in the HOST's local timezone (e.g. "09:00 AM IST")
 *     plus the host's IANA timezone key.
 *   - The component receives the VIEWER's selected timezone (`viewerTimezone`).
 *   - Time index labels and hover/selected overlays both show the CONVERTED time
 *     in the viewer's timezone so the grid always reflects the timezone they chose.
 *   - The stored/clicked value stays as the host-TZ string ("09:00 AM") because
 *     that's what the backend needs to create the calendar event correctly.
 *
 * Stripe fix: blocked ranges are column-level position:absolute overlays so the
 * repeating-linear-gradient is one continuous block, not per-row cuts.
 */

import * as React from "react";
import { useBookingStore } from "@/store/bookingStore";
import type { TeamAvailabilitySlotMeta } from "@/lib/team-scheduling";

const HOUR_HEIGHT = 48; // px per visual hour
const LABEL_WIDTH = 52; // px for time-label column
const DAY_COUNT = 5;

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

/**
 * Convert a host-TZ slot (date + minutes-from-midnight) to a display string
 * in the viewer's timezone.
 *
 * Works by:
 *   1. Computing host-TZ midnight as a UTC timestamp (using locale trick for DST safety)
 *   2. Adding totalMins to get the slot's UTC instant
 *   3. Formatting that UTC instant in the viewer's timezone
 *
 * Returns the original minsToLabel fallback if anything throws.
 */
function slotToViewerTime(
  dateISO: string,
  totalMins: number,
  hostTimezone: string,
  viewerTimezone: string
): string {
  if (hostTimezone === viewerTimezone) return minsToLabel(totalMins);
  try {
    const ref = new Date(`${dateISO}T12:00:00Z`);
    const utcTs = new Date(ref.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
    const hostTs = new Date(ref.toLocaleString("en-US", { timeZone: hostTimezone })).getTime();
    const hostOffsetMs = hostTs - utcTs; // positive for UTC+ zones

    // Host midnight as UTC timestamp
    const hostMidnightUTC =
      new Date(`${dateISO}T00:00:00Z`).getTime() - hostOffsetMs;
    const slotUTC = new Date(hostMidnightUTC + totalMins * 60 * 1000);

    // Format in viewer timezone — drop :00 for whole hours (e.g. "9 AM" not "9:00 AM")
    const full = slotUTC.toLocaleTimeString("en-US", {
      timeZone: viewerTimezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return full.replace(/:00 /, " "); // "9:00 AM" → "9 AM", "3:30 AM" unchanged
  } catch {
    return minsToLabel(totalMins);
  }
}

type RowEntry = {
  timeStr: string; // host-TZ label, stored on click ("09:00 AM")
  totalMins: number;
  isHour: boolean;
  isHalfHour: boolean;
};

type SlotMetaLookup = Record<string, TeamAvailabilitySlotMeta>;

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

function getDays(anchor: string, count: number): string[] {
  const base = new Date(anchor + "T00:00:00");
  return Array.from({ length: count }, (_, offset) => {
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
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  return `${fmt(days[0])} – ${fmt(days[days.length - 1])}`;
}

/** Compute contiguous unavailable row ranges for column-level hatched overlays. */
function computeUnavailableBlocks(
  allRows: RowEntry[],
  daySlots: string[],
  rowsPerDuration: number
): { startIdx: number; endIdx: number }[] {
  const blocks: { startIdx: number; endIdx: number }[] = [];
  let blockStart = -1;

  for (let i = 0; i < allRows.length; i++) {
    let isCovered = daySlots.includes(allRows[i].timeStr);
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
  if (blockStart !== -1) blocks.push({ startIdx: blockStart, endIdx: allRows.length });
  return blocks;
}

/**
 * Convert a UTC busy interval into pixel coordinates within the host-TZ grid.
 * Returns null if the interval doesn't overlap this day's visible grid at all.
 */
function utcIntervalToRowRange(
  utcStart: string,
  utcEnd: string,
  dateISO: string,
  hostTimezone: string,
  start_hour: number,
  end_hour: number,
  allRows: RowEntry[],
  ROW_HEIGHT: number
): { topPx: number; heightPx: number } | null {
  try {
    const ref = new Date(`${dateISO}T12:00:00Z`);
    const utcTs = new Date(ref.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
    const hostTs = new Date(ref.toLocaleString("en-US", { timeZone: hostTimezone })).getTime();
    const hostOffsetMs = hostTs - utcTs;

    const hostMidnightUTC = new Date(`${dateISO}T00:00:00Z`).getTime() - hostOffsetMs;
    const gridStartMs = hostMidnightUTC + start_hour * 3_600_000;
    const gridEndMs = hostMidnightUTC + end_hour * 3_600_000;
    const gridTotalMs = gridEndMs - gridStartMs;
    const gridHeightPx = allRows.length * ROW_HEIGHT;

    const intervalStartMs = new Date(utcStart).getTime();
    const intervalEndMs = new Date(utcEnd).getTime();

    if (intervalEndMs <= gridStartMs || intervalStartMs >= gridEndMs) return null;

    const clampedStart = Math.max(intervalStartMs, gridStartMs);
    const clampedEnd = Math.min(intervalEndMs, gridEndMs);

    const topPx = ((clampedStart - gridStartMs) / gridTotalMs) * gridHeightPx;
    const heightPx = Math.max(
      ROW_HEIGHT / 2,
      ((clampedEnd - clampedStart) / gridTotalMs) * gridHeightPx
    );

    return { topPx, heightPx };
  } catch {
    return null;
  }
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
  viewerTimezone = "UTC",
  dayCount,
  onHostTimezoneChange,
  visitorBusy,
}: {
  anchorDate: string;
  onAnchorChange: (iso: string) => void;
  eventSlug?: string;
  start_hour?: number;
  end_hour?: number;
  slot_increment?: number;
  duration?: number;
  viewerTimezone?: string;
  dayCount?: number;
  onHostTimezoneChange?: (tz: string) => void;
  /** Visitor's calendar busy intervals keyed by date ISO, UTC strings. */
  visitorBusy?: Record<string, { start: string; end: string }[]>;
}) {
  const { selectedDate, selectedTime, setDate, setTime } = useBookingStore();

  const count = dayCount ?? DAY_COUNT;

  const [slotsMap, setSlotsMap] = React.useState<Record<string, string[]>>({});
  const [slotMetaMap, setSlotMetaMap] = React.useState<Record<string, SlotMetaLookup>>({});
  const [loadingSet, setLoadingSet] = React.useState<Set<string>>(new Set());
  const [hostTimezone, setHostTimezone] = React.useState<string>("UTC");
  const [hover, setHover] = React.useState<{ day: string; rowIdx: number } | null>(null);
  const [now, setNow] = React.useState<Date>(() => new Date());
  const [availabilityTiersEnabled, setAvailabilityTiersEnabled] = React.useState(false);
  const [fallbackMinimumHostCount, setFallbackMinimumHostCount] = React.useState<number | null>(null);
  const [preferredMinimumHostCount, setPreferredMinimumHostCount] = React.useState<number | null>(null);

  const fetchedDaysRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const ROW_HEIGHT = Math.max(20, Math.round((HOUR_HEIGHT * slot_increment) / 60));
  const rowsPerDuration = Math.max(1, Math.round(duration / slot_increment));

  const allRows = React.useMemo(
    () => buildRows(start_hour, end_hour, slot_increment),
    [start_hour, end_hour, slot_increment]
  );

  const days = React.useMemo(() => getDays(anchorDate, count), [anchorDate, count]);

  const todayISO = toISODate(new Date());
  const canGoPrev = anchorDate > todayISO;

  function prevDays() {
    if (!canGoPrev) return;
    const base = new Date(anchorDate + "T00:00:00");
    base.setDate(base.getDate() - count);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidate = base < today ? today : base;
    onAnchorChange(toISODate(candidate));
  }

  function nextDays() {
    const base = new Date(anchorDate + "T00:00:00");
    base.setDate(base.getDate() + count);
    onAnchorChange(toISODate(base));
  }

  // Fetch availability in batches and prefetch the next window.
  // Cache by date key, never clear (prevents grey flash on navigate).
  React.useEffect(() => {
    let cancelled = false;

    const fallbackSlots = allRows.map((r) => r.timeStr);

    async function fetchBatch(targetDays: string[], showLoading: boolean) {
      const uncached = targetDays.filter((day) => !fetchedDaysRef.current.has(day));
      if (uncached.length === 0) return;

      uncached.forEach((day) => fetchedDaysRef.current.add(day));

      if (showLoading) {
        setLoadingSet((prev) => {
          const next = new Set(prev);
          uncached.forEach((d) => next.add(d));
          return next;
        });
        setHover(null);
      }

      const params = new URLSearchParams();
      params.set("dates", uncached.join(","));
      if (eventSlug) params.set("event", eventSlug);

      try {
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = (await res.json()) as {
          slotsByDate?: Record<string, string[] | null>;
          slotMetaByDate?: Record<string, TeamAvailabilitySlotMeta[]>;
          hostTimezone?: string;
          availabilityTiersEnabled?: boolean;
          preferredMinimumHostCount?: number;
          fallbackMinimumHostCount?: number | null;
        };

        if (cancelled) return;
        if (data.hostTimezone) {
          setHostTimezone(data.hostTimezone);
          onHostTimezoneChange?.(data.hostTimezone);
        }

        setAvailabilityTiersEnabled(Boolean(data.availabilityTiersEnabled));
        setPreferredMinimumHostCount(
          typeof data.preferredMinimumHostCount === "number"
            ? data.preferredMinimumHostCount
            : null
        );
        setFallbackMinimumHostCount(data.fallbackMinimumHostCount ?? null);

        setSlotsMap((prev) => {
          const next = { ...prev };
          uncached.forEach((day) => {
            const slots = data.slotsByDate?.[day];
            next[day] = Array.isArray(slots) ? slots : fallbackSlots;
          });
          return next;
        });
        setSlotMetaMap((prev) => {
          const next = { ...prev };
          uncached.forEach((day) => {
            const meta = data.slotMetaByDate?.[day] ?? [];
            next[day] = Object.fromEntries(meta.map((slot) => [slot.time, slot]));
          });
          return next;
        });
      } catch {
        if (cancelled) return;
        setSlotsMap((prev) => {
          const next = { ...prev };
          uncached.forEach((day) => {
            next[day] = fallbackSlots;
          });
          return next;
        });
        setSlotMetaMap((prev) => {
          const next = { ...prev };
          uncached.forEach((day) => {
            next[day] = {};
          });
          return next;
        });
      } finally {
        if (showLoading && !cancelled) {
          setLoadingSet((prev) => {
            const next = new Set(prev);
            uncached.forEach((d) => next.delete(d));
            return next;
          });
        }
      }
    }

    void fetchBatch(days, true);

    const nextStart = new Date(anchorDate + "T00:00:00");
    nextStart.setDate(nextStart.getDate() + count);
    void fetchBatch(getDays(toISODate(nextStart), count), false);

    return () => {
      cancelled = true;
    };
  }, [allRows, anchorDate, count, days, eventSlug, onHostTimezoneChange]);

  const selectedRowIdx =
    selectedTime ? allRows.findIndex((r) => r.timeStr === selectedTime) : -1;

  // Current-time line position
  const totalGridHeight = allRows.length * ROW_HEIGHT;
  const startMins = start_hour * 60;
  const endMins = end_hour * 60;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = ((nowMins - startMins) / (endMins - startMins)) * totalGridHeight;
  const showCurrentTime = nowMins > startMins && nowMins < endMins;

  // Reference date for time index conversion (use first visible day for consistency)
  const refDateISO = days[0] ?? todayISO;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: LABEL_WIDTH + count * 60 }}>
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
            className="tc-btn tc-btn--ghost tc-btn--sm"
            onClick={prevDays}
            disabled={!canGoPrev}
            style={{ fontSize: 12, opacity: canGoPrev ? 1 : 0.3 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600 }}>
            {formatRange(days)}
          </span>
          <button className="tc-btn tc-btn--ghost tc-btn--sm" onClick={nextDays} style={{ fontSize: 12 }}>
            Next →
          </button>
        </div>

        {availabilityTiersEnabled && (
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "var(--space-3)",
              paddingLeft: LABEL_WIDTH,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                padding: "4px 8px",
                borderRadius: "var(--radius-full)",
                background: "rgba(34,197,94,0.14)",
                border: "1px solid rgba(34,197,94,0.20)",
              }}
            >
              Preferred: all {preferredMinimumHostCount ?? 0} hosts available
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                padding: "4px 8px",
                borderRadius: "var(--radius-full)",
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.18)",
              }}
            >
              Also available: at least {fallbackMinimumHostCount ?? 0} hosts
            </span>
          </div>
        )}

        {/* ── Slot grid (headers sticky inside scroll container so columns always align) ── */}
        <div
          style={{ overflowY: "auto", maxHeight: 380 }}
          onMouseLeave={() => setHover(null)}
        >
          {/* Sticky day headers — inside the scroll container to prevent scrollbar offset misalignment */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: "var(--surface-page)",
              display: "flex",
              borderBottom: "2px solid var(--border-default)",
            }}
          >
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
                      fontSize: 13,
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

          <div style={{ display: "flex" }}>
            {/* ── Time label column ──
                Shows the viewer-TZ equivalent of each host-TZ hour mark.
                Format: "9 AM" for whole hours, "3:30 AM" for offset hours. */}
            <div style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
              {allRows.map((row, rowIdx) => {
                const label = row.isHour
                  ? slotToViewerTime(refDateISO, row.totalMins, hostTimezone, viewerTimezone)
                  : "";

                return (
                  <div
                    key={row.timeStr}
                    style={{
                      height: ROW_HEIGHT,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                      paddingTop: 2,
                      paddingRight: 7,
                      fontSize: 9,
                      color: "var(--text-tertiary)",
                      fontWeight: 500,
                      userSelect: "none",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
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
                    {label}
                  </div>
                );
              })}
            </div>

            {/* ── Day columns ── */}
            {days.map((day) => {
              const isLoadingDay = loadingSet.has(day);
              const daySlots = slotsMap[day] ?? [];
              const daySlotMeta = slotMetaMap[day] ?? {};
              const { isToday } = formatDayHeader(day);

              const hoverStart = hover?.day === day ? hover.rowIdx : -1;
              const selStart = selectedDate === day ? selectedRowIdx : -1;
              const overlayH = rowsPerDuration * ROW_HEIGHT;

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
                  {/* Row cells — transparent bg, handle events */}
                  {allRows.map((row, rowIdx) => {
                    const isAvailable = !isLoadingDay && daySlots.includes(row.timeStr);
                    const slotMeta = daySlotMeta[row.timeStr];
                    const tier = availabilityTiersEnabled ? slotMeta?.tier : null;
                    return (
                      <div
                        key={row.timeStr}
                        style={{
                          height: ROW_HEIGHT,
                          background:
                            tier === "preferred"
                              ? "rgba(34,197,94,0.08)"
                              : tier === "other"
                                ? "rgba(59,130,246,0.07)"
                                : "transparent",
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
                            setTime(row.timeStr); // store host-TZ time for backend
                          }
                        }}
                      />
                    );
                  })}

                  {/* Unavailable blocks — continuous hatched overlay per column */}
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

                  {/* Visitor calendar busy overlays — semi-transparent lavender, pointer-events: none */}
                  {(visitorBusy?.[day] ?? []).map((interval, idx) => {
                    const range = utcIntervalToRowRange(
                      interval.start,
                      interval.end,
                      day,
                      hostTimezone,
                      start_hour,
                      end_hour,
                      allRows,
                      ROW_HEIGHT
                    );
                    if (!range) return null;
                    return (
                      <div
                        key={`vb-${idx}`}
                        style={{
                          position: "absolute",
                          top: range.topPx,
                          height: range.heightPx,
                          left: 1,
                          right: 1,
                          background: "rgba(123,108,246,0.14)",
                          border: "1px solid rgba(123,108,246,0.32)",
                          borderRadius: 4,
                          pointerEvents: "none",
                          zIndex: 2,
                          display: "flex",
                          alignItems: "flex-start",
                          padding: "2px 5px",
                          overflow: "hidden",
                        }}
                      >
                        {range.heightPx >= 14 && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "rgba(109,40,217,0.85)",
                              lineHeight: 1.2,
                              userSelect: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Busy
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Skeleton shimmer — shown while fetching this day's slots */}
                  {isLoadingDay && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 5,
                        overflow: "hidden",
                        pointerEvents: "none",
                      }}
                    >
                      {/* Repeating shimmer bars */}
                      {Array.from({ length: Math.floor(allRows.length / 2) }).map((_, i) => (
                        <div
                          key={i}
                          className="skeleton"
                          style={{
                            position: "absolute",
                            left: 4,
                            right: 4,
                            top: i * ROW_HEIGHT * 2 + 4,
                            height: ROW_HEIGHT - 6,
                            borderRadius: 5,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Current time red line (today only) */}
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

                  {/* Hover overlay — shows viewer-TZ time */}
                  {hoverStart >= 0 && selStart < 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: hoverStart * ROW_HEIGHT,
                        height: overlayH,
                        left: 3,
                        right: 3,
                        background:
                          daySlotMeta[allRows[hoverStart]?.timeStr ?? ""]?.tier === "preferred"
                            ? "rgba(34,197,94,0.18)"
                            : daySlotMeta[allRows[hoverStart]?.timeStr ?? ""]?.tier === "other"
                              ? "rgba(59,130,246,0.16)"
                              : "rgba(74,158,255,0.16)",
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
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color:
                              daySlotMeta[allRows[hoverStart]?.timeStr ?? ""]?.tier === "preferred"
                                ? "#15803d"
                                : "var(--blue-500)",
                            lineHeight: 1.3,
                          }}
                        >
                          {slotToViewerTime(
                            day,
                            allRows[hoverStart]?.totalMins ?? 0,
                            hostTimezone,
                            viewerTimezone
                          )}
                          {" – "}
                          {slotToViewerTime(
                            day,
                            (allRows[hoverStart]?.totalMins ?? 0) + duration,
                            hostTimezone,
                            viewerTimezone
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Selected overlay — shows viewer-TZ time */}
                  {selStart >= 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: selStart * ROW_HEIGHT,
                        height: overlayH,
                        left: 3,
                        right: 3,
                        background:
                          daySlotMeta[allRows[selStart]?.timeStr ?? ""]?.tier === "preferred"
                            ? "rgba(21,128,61,0.86)"
                            : daySlotMeta[allRows[selStart]?.timeStr ?? ""]?.tier === "other"
                              ? "rgba(37,99,235,0.86)"
                              : "var(--blue-400)",
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
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "white",
                            lineHeight: 1.3,
                          }}
                        >
                          {slotToViewerTime(
                            day,
                            allRows[selStart]?.totalMins ?? 0,
                            hostTimezone,
                            viewerTimezone
                          )}
                          {" – "}
                          {slotToViewerTime(
                            day,
                            (allRows[selStart]?.totalMins ?? 0) + duration,
                            hostTimezone,
                            viewerTimezone
                          )}{" "}
                          ✓
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
              at{" "}
              {slotToViewerTime(
                selectedDate,
                allRows.find((r) => r.timeStr === selectedTime)?.totalMins ?? 0,
                hostTimezone,
                viewerTimezone
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
