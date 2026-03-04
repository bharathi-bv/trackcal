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

function normalizeStatus(value: string): BookingStatus {
  if (value === "no-show") return "no_show";
  if (value === "pending" || value === "cancelled" || value === "no_show") {
    return value;
  }
  return "confirmed";
}

export default function BookingStatusSelect({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const [value, setValue] = React.useState<BookingStatus>(() => normalizeStatus(status));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setValue(normalizeStatus(status));
  }, [status]);

  async function onChange(next: string) {
    const previous = value;
    const normalizedNext = normalizeStatus(next);
    if (normalizedNext === "cancelled") {
      const confirmed = window.confirm("Cancel this booking?");
      if (!confirmed) return;
    }

    setValue(normalizedNext);
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: normalizedNext }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update status");
      }
      const persisted = normalizeStatus(typeof data.status === "string" ? data.status : normalizedNext);
      setValue(persisted);
      const label = STATUS_OPTIONS.find((o) => o.value === persisted)?.label ?? persisted;
      toast.success(`Status set to ${label}`);
    } catch (err) {
      setValue(previous);
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div className="tc-select-wrap" style={{ minWidth: 112 }}>
        <select
          className="tc-input"
          style={{ height: 28, fontSize: 12, paddingTop: 0, paddingBottom: 0 }}
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
      </div>
      {saving && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Saving…</span>}
    </div>
  );
}
