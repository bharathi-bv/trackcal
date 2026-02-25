"use client";

import * as React from "react";
import { useBookingStore } from "@/store/bookingStore";

// Fallback slots used when Google Calendar isn't connected yet.
// Keeps the UI functional during dev / before OAuth setup.
function buildDefaultSlots(): string[] {
  const slots: string[] = [];
  for (let t = 9 * 60; t < 17 * 60; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    slots.push(`${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`);
  }
  return slots;
}

export default function TimeSlotSelector() {
  const { selectedDate, selectedTime, setTime } = useBookingStore();

  const [slots, setSlots] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Fetch real availability from Google Calendar whenever the selected date changes.
  // Falls back to default slots if Calendar isn't connected.
  React.useEffect(() => {
    if (!selectedDate) return;

    setLoading(true);
    setSlots([]);
    setTime(null); // clear any previously selected time for the old date

    fetch(`/api/availability?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: { slots: string[] | null }) => {
        if (Array.isArray(data.slots)) {
          setSlots(data.slots);
        } else {
          // Calendar not connected — use hardcoded defaults so dev/demo still works
          setSlots(buildDefaultSlots());
        }
      })
      .catch(() => setSlots(buildDefaultSlots()))
      .finally(() => setLoading(false));
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedDate) return null;

  // Skeleton while fetching
  if (loading) {
    return (
      <div className="time-slots">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 40, borderRadius: "var(--radius-md)" }}
          />
        ))}
      </div>
    );
  }

  // No slots available on this date (all booked / outside working hours)
  if (slots.length === 0) {
    return (
      <p
        style={{
          fontSize: 13,
          color: "var(--text-tertiary)",
          textAlign: "center",
          padding: "var(--space-4) 0",
        }}
      >
        No available slots on this date.
      </p>
    );
  }

  return (
    <div className="time-slots">
      {slots.map((t) => (
        <button
          key={t}
          type="button"
          className={`time-slot${selectedTime === t ? " time-slot-selected" : ""}`}
          onClick={() => setTime(t)}
          aria-pressed={selectedTime === t}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
