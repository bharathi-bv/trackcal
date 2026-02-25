"use client";

import * as React from "react";
import { useBookingStore } from "@/store/bookingStore";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesToLabel(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad2(hour12)}:${pad2(m)} ${period}`;
}

function buildSlots(startHour = 9, endHour = 17, interval = 30) {
  const slots: string[] = [];
  for (let t = startHour * 60; t < endHour * 60; t += interval) {
    slots.push(minutesToLabel(t));
  }
  return slots;
}

export default function TimeSlotSelector() {
  const { selectedDate, selectedTime, setTime } = useBookingStore();
  const slots = React.useMemo(() => buildSlots(9, 17, 30), []);

  if (!selectedDate) return null;

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
