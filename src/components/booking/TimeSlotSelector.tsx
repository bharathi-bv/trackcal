"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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

  if (!selectedDate) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Select a date first to see available times.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((t) => {
          const active = selectedTime === t;
          return (
            <Button
              key={t}
              type="button"
              variant={active ? "default" : "outline"}
              className="h-10 w-full justify-center"
              onClick={() => setTime(t)}
              aria-pressed={active}
            >
              {t}
            </Button>
          );
        })}
      </div>

      {selectedTime ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          Selected time: <span className="font-medium">{selectedTime}</span>
        </div>
      ) : (
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          Pick a time to continue.
        </div>
      )}
    </div>
  );
}