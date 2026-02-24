"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function DatePicker() {
  const [date, setDate] = React.useState<Date | undefined>();

  return (
    <div className="space-y-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            {date ? formatDate(date) : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {date && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          Selected: <span className="font-medium">{formatDate(date)}</span>
        </div>
      )}
    </div>
  );
}