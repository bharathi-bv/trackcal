/**
 * /app/dashboard — Upcoming Events (daily driver)
 *
 * Server Component: targeted fetch — only upcoming/today bookings and
 * active event types. Attribution reporting lives at /app/analytics.
 */

import { createServerClient } from "@/lib/supabase";
import BookingsDashboardClient from "@/components/dashboard/BookingsDashboardClient";
import type { UpcomingBooking } from "@/components/dashboard/BookingsDashboardClient";

export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build YYYY-MM-DD from local wall clock — avoids UTC off-by-one for UTC+
 * timezones (e.g. midnight IST = previous day UTC).
 */
function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const today = new Date();
  const todayISO = toISODate(today);
  // Fetch 60 days back → 60 days forward so the calendar can show counts for the full window
  const rangeStart = toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 60));
  const rangeEnd   = toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60));

  const db = createServerClient();

  const { data: windowBookings } = await db
    .from("bookings")
    .select("id, date, time, name, email, status, event_slug")
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  const bookings: UpcomingBooking[] = windowBookings ?? [];

  return (
    <main className="dashboard-main">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Bookings
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            marginTop: "var(--space-1)",
            fontWeight: 500,
          }}
        >
          Yesterday, today, and tomorrow&apos;s meetings.
        </p>
      </div>

      <BookingsDashboardClient
        bookings={bookings}
        todayISO={todayISO}
      />
    </main>
  );
}
