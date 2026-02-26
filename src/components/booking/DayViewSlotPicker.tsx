"use client";

import * as React from "react";
import { useBookingStore } from "@/store/bookingStore";

// ROW_HEIGHT controls how tall each slot-increment row is (px)
const ROW_HEIGHT = 56;

// Format minutes-since-midnight as "HH:MM AM/PM"
function minsToLabel(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

// Build the list of rows for the day view
function buildRows(
  start_hour: number,
  end_hour: number,
  slot_increment: number
): { timeStr: string; isHourBoundary: boolean; hourLabel: string }[] {
  const rows = [];
  for (let t = start_hour * 60; t + slot_increment <= end_hour * 60; t += slot_increment) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    rows.push({
      timeStr: minsToLabel(t),
      isHourBoundary: m === 0,
      hourLabel: m === 0 ? minsToLabel(t) : "",
    });
  }
  return rows;
}

export default function DayViewSlotPicker({
  eventSlug,
  start_hour = 9,
  end_hour = 17,
  slot_increment = 30,
  duration = 30,
}: {
  eventSlug?: string;
  start_hour?: number;
  end_hour?: number;
  slot_increment?: number;
  duration?: number;
}) {
  const { selectedDate, selectedTime, setTime } = useBookingStore();

  const [slots, setSlots] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hoverSlot, setHoverSlot] = React.useState<string | null>(null);

  // How many rows the event block occupies
  const rowsPerDuration = Math.max(1, Math.round(duration / slot_increment));

  const allRows = React.useMemo(
    () => buildRows(start_hour, end_hour, slot_increment),
    [start_hour, end_hour, slot_increment]
  );

  // Fetch available slots whenever the selected date changes
  React.useEffect(() => {
    if (!selectedDate) return;

    setLoading(true);
    setSlots([]);
    setTime(null);

    const url = `/api/availability?date=${selectedDate}${eventSlug ? `&event=${eventSlug}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: { slots: string[] | null }) => {
        if (Array.isArray(data.slots)) {
          setSlots(data.slots);
        } else {
          // Calendar not connected — treat all rows as available so dev/demo still works
          setSlots(allRows.map((r) => r.timeStr));
        }
      })
      .catch(() => setSlots(allRows.map((r) => r.timeStr)))
      .finally(() => setLoading(false));
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedDate) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 200,
          color: "var(--text-tertiary)",
          fontSize: 14,
        }}
      >
        Select a date to see available times
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "var(--space-3) var(--space-4)" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: ROW_HEIGHT - 4, marginBottom: 4, borderRadius: "var(--radius-md)" }}
          />
        ))}
      </div>
    );
  }

  const hoverIndex = hoverSlot ? allRows.findIndex((r) => r.timeStr === hoverSlot) : -1;
  const selectedIndex = selectedTime
    ? allRows.findIndex((r) => r.timeStr === selectedTime)
    : -1;

  const totalHeight = allRows.length * ROW_HEIGHT;

  // Left offset for the time label column
  const LABEL_WIDTH = 60;

  return (
    // Outer scrollable container — fixed max height so the mini-calendar stays visible
    <div style={{ overflowY: "auto", maxHeight: 440 }}>
      {/* Inner — position:relative so overlay blocks can be absolutely placed */}
      <div style={{ position: "relative", height: totalHeight }}>
        {/* ── Grid rows ── */}
        {allRows.map((row, i) => {
          const isAvailable = slots.includes(row.timeStr);

          return (
            <div
              key={row.timeStr}
              style={{
                position: "absolute",
                top: i * ROW_HEIGHT,
                left: 0,
                right: 0,
                height: ROW_HEIGHT,
                display: "flex",
                cursor: isAvailable ? "pointer" : "default",
              }}
              onMouseEnter={() => isAvailable && setHoverSlot(row.timeStr)}
              onMouseLeave={() => setHoverSlot(null)}
              onClick={() => isAvailable && setTime(row.timeStr)}
            >
              {/* Time label */}
              <div
                style={{
                  width: LABEL_WIDTH,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "flex-start",
                  paddingTop: 6,
                  paddingRight: 10,
                  justifyContent: "flex-end",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontWeight: 500,
                  userSelect: "none",
                }}
              >
                {row.isHourBoundary ? row.hourLabel : ""}
              </div>

              {/* Row cell */}
              <div
                style={{
                  flex: 1,
                  borderTop: row.isHourBoundary
                    ? "1px solid var(--border-default)"
                    : "1px solid #f0f0f0",
                  background: isAvailable
                    ? "transparent"
                    : // Subtle diagonal stripe for busy/unavailable slots
                      "repeating-linear-gradient(45deg, transparent, transparent 4px, var(--surface-subtle) 4px, var(--surface-subtle) 8px)",
                }}
              />
            </div>
          );
        })}

        {/* ── Hover block (semi-transparent blue) ── */}
        {hoverIndex >= 0 && hoverIndex !== selectedIndex && (
          <div
            style={{
              position: "absolute",
              top: hoverIndex * ROW_HEIGHT,
              left: LABEL_WIDTH,
              right: 0,
              height: rowsPerDuration * ROW_HEIGHT,
              background: "rgba(74, 158, 255, 0.18)",
              border: "1.5px solid rgba(74, 158, 255, 0.45)",
              borderRadius: "var(--radius-md)",
              pointerEvents: "none",
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              paddingLeft: "var(--space-3)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--blue-500)",
              }}
            >
              {hoverSlot}
            </span>
          </div>
        )}

        {/* ── Selected block (solid blue) ── */}
        {selectedIndex >= 0 && (
          <div
            style={{
              position: "absolute",
              top: selectedIndex * ROW_HEIGHT,
              left: LABEL_WIDTH,
              right: 0,
              height: rowsPerDuration * ROW_HEIGHT,
              background: "var(--blue-400)",
              borderRadius: "var(--radius-md)",
              pointerEvents: "none",
              zIndex: 4,
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              paddingLeft: "var(--space-3)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
              {selectedTime}
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>✓</span>
          </div>
        )}
      </div>
    </div>
  );
}
