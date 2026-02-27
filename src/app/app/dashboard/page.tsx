/**
 * /app/dashboard — Upcoming Events (daily driver)
 *
 * Server Component: fast, targeted fetches — only upcoming/today bookings
 * and active event types. No heavy attribution data load.
 *
 * Attribution reporting lives at /app/analytics.
 */

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import DashboardNav from "@/components/dashboard/DashboardNav";
import MeetingLinksClient from "@/components/dashboard/MeetingLinksClient";

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

/**
 * Format "Mon Mar 3" from "2026-03-03"
 */
function formatDateLabel(iso: string) {
  const [y, mo, da] = iso.split("-").map(Number);
  return new Date(y, mo - 1, da).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: "Confirmed", cls: "badge-green" },
    pending: { label: "Pending", cls: "badge-amber" },
    cancelled: { label: "Cancelled", cls: "badge-red" },
    no_show: { label: "No Show", cls: "badge-default" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "badge-default" };
  return <span className={`badge ${cls}`}>{label}</span>;
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // 1. Auth
  const supabaseAuth = await createAuthServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect("/login");

  // 2. Fetch — targeted: only upcoming bookings + active event types
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
      db.from("host_settings").select("google_refresh_token").limit(1).maybeSingle(),
    ]);

  const bookings: UpcomingBooking[] = upcomingBookings ?? [];
  const activeEventTypes: EventType[] = eventTypes ?? [];
  const calendarConnected = Boolean(hostSettings?.google_refresh_token);

  // 3. Partition bookings into today vs future-by-date
  const todayBookings = bookings.filter((b) => b.date === todayISO);
  const futureBookings = bookings.filter((b) => b.date > todayISO);

  // Group future bookings by date using a Map to preserve sort order
  const futureByDate = new Map<string, UpcomingBooking[]>();
  for (const booking of futureBookings) {
    const group = futureByDate.get(booking.date) ?? [];
    group.push(booking);
    futureByDate.set(booking.date, group);
  }

  const hasAnyUpcoming = bookings.length > 0;

  // 4. Build base URL for meeting links
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://trackcal-tau.vercel.app";

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <DashboardNav
        activeTab="bookings"
        calendarConnected={calendarConnected}
        email={user.email ?? ""}
      />

      <main
        className="dashboard-main"
        style={{
          maxWidth: 1100,
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

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* ── Today ─────────────────────────────────────────────────────── */}
          <div className="card" style={{ padding: "var(--space-5) var(--space-6)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: todayBookings.length > 0 ? "var(--space-4)" : 0,
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
                Today — {formatDateLabel(todayISO)}
              </span>
              <span
                className={`badge ${todayBookings.length > 0 ? "badge-blue" : "badge-default"}`}
              >
                {todayBookings.length} meeting{todayBookings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {todayBookings.length > 0 ? (
              <div>
                {todayBookings.map((b, i) => (
                  <div
                    key={b.id}
                    style={i === todayBookings.length - 1 ? { borderBottom: "none" } : {}}
                  >
                    <BookingRow booking={b} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
                No meetings today.
              </p>
            )}
          </div>

          {/* ── Upcoming ──────────────────────────────────────────────────── */}
          {futureByDate.size > 0 && (
            <div className="card" style={{ padding: "var(--space-5) var(--space-6)" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  display: "block",
                  marginBottom: "var(--space-4)",
                }}
              >
                Upcoming
              </span>

              {Array.from(futureByDate.entries()).map(([date, dayBookings]) => (
                <div key={date} style={{ marginBottom: "var(--space-5)" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      marginBottom: "var(--space-2)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                    }}
                  >
                    {formatDateLabel(date)}
                    <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>
                      — {dayBookings.length} meeting{dayBookings.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ paddingLeft: "var(--space-4)" }}>
                    {dayBookings.map((b, i) => (
                      <div
                        key={b.id}
                        style={i === dayBookings.length - 1 ? { borderBottom: "none" } : {}}
                      >
                        <BookingRow booking={b} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {!hasAnyUpcoming && (
            <div
              className="card"
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
              <a href="/app/analytics" className="btn btn-ghost btn-sm">
                View all past bookings →
              </a>
            </div>
          )}

          {/* ── Active Meeting Links ───────────────────────────────────────── */}
          <div className="card" style={{ padding: "var(--space-5) var(--space-6)" }}>
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
              <a href="/app/dashboard/event-types" className="btn btn-ghost btn-sm">
                Manage
              </a>
            </div>
            <MeetingLinksClient eventTypes={activeEventTypes} baseUrl={baseUrl} />
          </div>
        </div>
      </main>
    </div>
  );
}
