"use client";

import * as React from "react";
import Link from "next/link";
import MeetingLinksClient from "./MeetingLinksClient";
import BookingCalendarClient from "./BookingCalendarClient";

type UpcomingBooking = {
  id: string;
  date: string;
  time: string;
  name: string;
  email: string;
  status: string;
  event_slug: string | null;
};

type EventType = {
  id: string;
  name: string;
  slug: string;
  duration: number;
  is_active: boolean;
};

function formatDateLabel(iso: string) {
  const [y, mo, da] = iso.split("-").map(Number);
  return new Date(y, mo - 1, da).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: "Confirmed", cls: "tc-pill--success" },
    pending:   { label: "Pending",   cls: "tc-pill--warning" },
    cancelled: { label: "Cancelled", cls: "tc-pill--danger"  },
    no_show:   { label: "No Show",   cls: "tc-pill--neutral" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "tc-pill--neutral" };
  return <span className={`tc-pill ${cls}`}>{label}</span>;
}

function BookingRow({ booking }: { booking: UpcomingBooking }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-3) 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-secondary)",
          width: 76,
          flexShrink: 0,
        }}
      >
        {booking.time}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            display: "block",
          }}
        >
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
      <StatusBadge status={booking.status} />
    </div>
  );
}

export default function BookingsDashboardClient({
  bookings,
  activeEventTypes,
  baseUrl,
  todayISO,
}: {
  bookings: UpcomingBooking[];
  activeEventTypes: EventType[];
  baseUrl: string;
  todayISO: string;
}) {
  const [selectedDate, setSelectedDate] = React.useState<string>(todayISO);

  const selectedBookings = React.useMemo(
    () => bookings.filter((b) => b.date === selectedDate),
    [bookings, selectedDate]
  );

  const isToday = selectedDate === todayISO;
  const isPast  = selectedDate < todayISO;
  const hasAnyUpcoming = bookings.length > 0;

  const dateLabel = isToday
    ? `Today — ${formatDateLabel(selectedDate)}`
    : isPast
    ? `Past — ${formatDateLabel(selectedDate)}`
    : `Upcoming — ${formatDateLabel(selectedDate)}`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 260px",
        gap: "var(--space-6)",
        alignItems: "start",
      }}
    >
      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

        {/* Selected-date meetings card */}
        <div
          className="tc-card"
          style={{
            padding: "var(--space-5) var(--space-6)",
            opacity: isToday ? 0.72 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: selectedBookings.length > 0 ? "var(--space-4)" : 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              {dateLabel}
            </span>
            <span
              className={`tc-pill ${
                selectedBookings.length > 0 ? "tc-pill--primary" : "tc-pill--neutral"
              }`}
            >
              {selectedBookings.length} meeting
              {selectedBookings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {selectedBookings.length > 0 ? (
            <div>
              {selectedBookings.map((b, i) => (
                <div
                  key={b.id}
                  style={i === selectedBookings.length - 1 ? { borderBottom: "none" } : {}}
                >
                  <BookingRow booking={b} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
              No meetings {isToday ? "today" : "on this day"}.
            </p>
          )}
        </div>

        {/* Empty state — no upcoming bookings at all */}
        {!hasAnyUpcoming && (
          <div
            className="tc-card"
            style={{
              padding: "var(--space-10) var(--space-6)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
              No upcoming meetings. Share a meeting link below to get bookings.
            </p>
            <Link href="/app/analytics" className="tc-btn tc-btn--ghost tc-btn--sm">
              View all past bookings →
            </Link>
          </div>
        )}

        {/* Active Meeting Links */}
        <div className="tc-card" style={{ padding: "var(--space-5) var(--space-6)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-4)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Active Meeting Links
            </span>
            <Link href="/app/dashboard/event-types" className="tc-btn tc-btn--ghost tc-btn--sm">
              Manage
            </Link>
          </div>
          <MeetingLinksClient eventTypes={activeEventTypes} baseUrl={baseUrl} />
        </div>
      </div>

      {/* ── Right column — sticky interactive calendar ───────────────────── */}
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
