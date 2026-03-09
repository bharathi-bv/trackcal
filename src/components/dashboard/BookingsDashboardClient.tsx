"use client";

import * as React from "react";
import BookingCalendarClient from "./BookingCalendarClient";

export type UpcomingBooking = {
  id: string;
  date: string;
  time: string;
  name: string;
  email: string;
  status: string;
  event_slug: string | null;
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function adjacentISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoFromDate(new Date(y, m - 1, d + delta));
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000
  );
}

function sectionLabel(iso: string, todayISO: string): string {
  const diff = daysBetween(todayISO, iso);
  if (diff === -1) return "Yesterday";
  if (diff === 0)  return "Today";
  if (diff === 1)  return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ── Status select ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending",   label: "Pending"   },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show",   label: "No Show"   },
];

const STATUS_STYLE: Record<string, { color: string; background: string; border: string }> = {
  confirmed: { color: "#2d9969",  background: "rgba(61,170,122,0.10)",  border: "rgba(61,170,122,0.25)"  },
  pending:   { color: "#b45309",  background: "rgba(217,119,6,0.10)",   border: "rgba(217,119,6,0.25)"   },
  cancelled: { color: "#dc2626",  background: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.22)"   },
  no_show:   { color: "#6b7280",  background: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.20)" },
};

function StatusSelect({
  bookingId,
  value,
  onChange,
}: {
  bookingId: string;
  value: string;
  onChange: (id: string, newStatus: string) => void;
}) {
  const s = STATUS_STYLE[value] ?? STATUS_STYLE.no_show;
  return (
    <select
      value={value}
      onChange={(e) => onChange(bookingId, e.target.value)}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 22px 3px 8px",
        borderRadius: 999,
        border: `1px solid ${s.border}`,
        background: s.background,
        color: s.color,
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 7px center",
        fontFamily: "var(--font-sans)",
        flexShrink: 0,
      }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ── Booking row ───────────────────────────────────────────────────────────────

function BookingRow({
  booking,
  status,
  onStatusChange,
  dimmed,
}: {
  booking: UpcomingBooking;
  status: string;
  onStatusChange: (id: string, newStatus: string) => void;
  dimmed: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) 0",
        borderBottom: "1px solid var(--border-subtle)",
        opacity: dimmed ? 0.5 : 1,
        transition: "opacity 0.12s",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-secondary)",
          width: 72,
          flexShrink: 0,
        }}
      >
        {booking.time}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
          {booking.name}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {booking.email}
        </span>
      </div>
      <StatusSelect bookingId={booking.id} value={status} onChange={onStatusChange} />
    </div>
  );
}

// ── Day section ───────────────────────────────────────────────────────────────

function DaySection({
  label,
  dateISO,
  todayISO,
  bookings,
  statuses,
  onStatusChange,
}: {
  label: string;
  dateISO: string;
  todayISO: string;
  bookings: UpcomingBooking[];
  statuses: Record<string, string>;
  onStatusChange: (id: string, newStatus: string) => void;
}) {
  const isPast = dateISO < todayISO;
  const dayBookings = bookings.filter((b) => b.date === dateISO);

  return (
    <div className="tc-card" style={{ padding: "var(--space-5) var(--space-6)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: dayBookings.length > 0 ? "var(--space-3)" : 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: isPast ? "var(--text-tertiary)" : "var(--text-secondary)",
          }}
        >
          {label}
        </span>
        <span className={`tc-pill ${dayBookings.length > 0 && !isPast ? "tc-pill--primary" : "tc-pill--neutral"}`}>
          {dayBookings.length} meeting{dayBookings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {dayBookings.length > 0 ? (
        <div>
          {dayBookings.map((b, i) => (
            <div key={b.id} style={i === dayBookings.length - 1 ? { borderBottom: "none" } : {}}>
              <BookingRow
                booking={b}
                status={statuses[b.id] ?? b.status}
                onStatusChange={onStatusChange}
                dimmed={isPast}
              />
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          No meetings {label.toLowerCase()}.
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookingsDashboardClient({
  bookings,
  todayISO,
}: {
  bookings: UpcomingBooking[];
  todayISO: string;
}) {
  const [selectedDate, setSelectedDate] = React.useState<string>(todayISO);

  const [statuses, setStatuses] = React.useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    bookings.forEach((b) => { m[b.id] = b.status; });
    return m;
  });

  async function handleStatusChange(bookingId: string, newStatus: string) {
    setStatuses((prev) => ({ ...prev, [bookingId]: newStatus }));
    try {
      await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // best-effort
    }
  }

  const prevISO = adjacentISO(selectedDate, -1);
  const nextISO = adjacentISO(selectedDate, +1);

  const sections = [
    { dateISO: prevISO,      label: sectionLabel(prevISO, todayISO)      },
    { dateISO: selectedDate, label: sectionLabel(selectedDate, todayISO) },
    { dateISO: nextISO,      label: sectionLabel(nextISO, todayISO)      },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 260px",
        gap: "var(--space-6)",
        alignItems: "start",
      }}
    >
      {/* ── Left: sliding 3-day view ──────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {sections.map((section) => (
          <DaySection
            key={section.dateISO}
            label={section.label}
            dateISO={section.dateISO}
            todayISO={todayISO}
            bookings={bookings}
            statuses={statuses}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* ── Right: sticky calendar ─────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: "78px" }}>
        <BookingCalendarClient
          bookings={bookings}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      </div>
    </div>
  );
}
