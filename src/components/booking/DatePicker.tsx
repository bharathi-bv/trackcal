"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBookingStore } from "@/store/bookingStore";

function toISODate(date: Date) {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

export default function DatePicker() {
  const { selectedDate, setDate } = useBookingStore();
  const [open, setOpen] = React.useState(false);

  const selected = selectedDate ? new Date(selectedDate) : undefined;

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            {selectedDate ? selectedDate : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (!d) return;
              setDate(toISODate(d));
              setOpen(false);
            }}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {selectedDate && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          Selected: <span className="font-medium">{selectedDate}</span>
        </div>
      )}
    </div>
  );
}