"use client";

import * as React from "react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
] as const;

type BookingStatus = (typeof STATUS_OPTIONS)[number]["value"];

export default function BookingStatusSelect({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const [value, setValue] = React.useState(status);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);

  async function onChange(next: string) {
    setValue(next);
    setError(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next as BookingStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      const label = STATUS_OPTIONS.find((o) => o.value === next)?.label ?? next;
      toast.success(`Status set to ${label}`);
    } catch {
      setError(true);
      setValue(status);
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select
        className="select"
        style={{ height: 28, fontSize: 12, paddingTop: 0, paddingBottom: 0, minWidth: 112 }}
        value={value}
        disabled={saving}
        onChange={(e) => onChange(e.target.value)}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {saving && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Saving…</span>}
    </div>
  );
}
