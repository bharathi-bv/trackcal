/**
 * /app/dashboard — Upcoming Events (daily driver)
 *
 * Server Component: targeted fetch — only upcoming/today bookings and
 * active event types. Attribution reporting lives at /app/analytics.
 */

import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase";
import DashboardNav from "@/components/dashboard/DashboardNav";
import BookingsDashboardClient from "@/components/dashboard/BookingsDashboardClient";

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

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const todayISO = toISODate(new Date());
  const db = createServerClient();

  const [{ data: upcomingBookings }, { data: eventTypes }, { data: hostSettings }] =
    await Promise.all([
      db
        .from("bookings")
        .select("id, date, time, name, email, status, event_slug")
        .in("status", ["confirmed", "pending"])
        .gte("date", todayISO)
        .order("date", { ascending: true })
        .order("time", { ascending: true }),
      db
        .from("event_types")
        .select("id, name, slug, duration, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      db
        .from("host_settings")
        .select("google_refresh_token, microsoft_refresh_token, booking_base_url")
        .limit(1)
        .maybeSingle(),
    ]);

  const bookings: UpcomingBooking[] = upcomingBookings ?? [];
  const activeEventTypes: EventType[] = eventTypes ?? [];

  // Build base URL for meeting links
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl =
    hostSettings?.booking_base_url?.trim().replace(/\/+$/, "") ||
    (host
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://citacal.com");

  return (
    <div style={{ minHeight: "100vh" }}>
      <DashboardNav
        activeTab="bookings"
        activeLinks={activeEventTypes.length}
        email=""
      />

      <main
        className="dashboard-main"
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
        }}
      >
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
            Upcoming confirmed and pending meetings.
          </p>
        </div>

        <BookingsDashboardClient
          bookings={bookings}
          activeEventTypes={activeEventTypes}
          baseUrl={baseUrl}
          todayISO={todayISO}
        />
      </main>
    </div>
  );
}
