/**
 * /app/dashboard — Upcoming Events (daily driver)
 *
 * Server Component: targeted fetch — only upcoming/today bookings and
 * active event types. Attribution reporting lives at /app/analytics.
 */

import { createServerClient } from "@/lib/supabase";
import BookingsDashboardClient from "@/components/dashboard/BookingsDashboardClient";
import type { UpcomingBooking } from "@/components/dashboard/BookingsDashboardClient";
import GettingStartedPanel from "@/components/dashboard/GettingStartedPanel";
import type { SetupStatus } from "@/components/dashboard/GettingStartedPanel";

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

  // ── Setup status for Getting Started panel ────────────────────────────────
  const [
    { data: calAccounts },
    { data: hostSettings },
    { data: schedules },
  ] = await Promise.all([
    db.from("calendar_accounts").select("provider, email"),
    db.from("host_settings").select("google_refresh_token, microsoft_refresh_token, zoom_access_token, booking_base_url").single(),
    db.from("availability_schedules").select("id").limit(1),
  ]);

  const calendarAccounts = (calAccounts ?? []) as Array<{ provider: "google" | "microsoft"; email: string | null }>;

  // Legacy fallback: tokens may be in host_settings instead of calendar_accounts
  const legacyGoogle = !!(hostSettings?.google_refresh_token) &&
    !calendarAccounts.find(a => a.provider === "google");
  const legacyMicrosoft = !!(hostSettings?.microsoft_refresh_token) &&
    !calendarAccounts.find(a => a.provider === "microsoft");
  if (legacyGoogle) calendarAccounts.push({ provider: "google", email: null });
  if (legacyMicrosoft) calendarAccounts.push({ provider: "microsoft", email: null });

  const setupStatus: SetupStatus = {
    calendarConnected: calendarAccounts.length > 0,
    calendarAccounts,
    availabilitySet: (schedules ?? []).length > 0,
    zoomConnected: !!(hostSettings?.zoom_access_token),
    customDomainSet: !!(hostSettings?.booking_base_url),
  };

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

      <GettingStartedPanel status={setupStatus} />

      <BookingsDashboardClient
        bookings={bookings}
        todayISO={todayISO}
      />
    </main>
  );
}
