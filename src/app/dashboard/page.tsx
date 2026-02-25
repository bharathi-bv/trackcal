/**
 * /dashboard — Attribution dashboard (Phase 6 version)
 *
 * Server Component: auth check + data fetching happen server-side.
 * No loading spinners, no client-side state — page arrives fully rendered.
 *
 * Auth: createAuthServerClient() reads session from cookies (set by middleware).
 * Data: createServerClient() uses service_role key, bypasses RLS.
 *       Phase 7 will add workspace scoping once bookings have workspace_id.
 */

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import SignOutButton from "@/components/auth/SignOutButton";

// ── Types ───────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  created_at: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  gclid: string | null;
  fbclid: string | null;
  li_fat_id: string | null;
  ttclid: string | null;
  msclkid: string | null;
  status: string;
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: "var(--space-6)" }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
        {label}
      </span>
      <span
        style={{
          display: "block",
          fontSize: 36,
          fontWeight: 800,
          color: "var(--text-primary)",
          lineHeight: 1.1,
          marginTop: "var(--space-2)",
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: "var(--space-1)", display: "block" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function ClickIdCell({ booking }: { booking: Booking }) {
  if (booking.gclid)
    return <span style={{ fontFamily: "monospace", fontSize: 11 }}>gclid:{booking.gclid.slice(0, 12)}…</span>;
  if (booking.fbclid)
    return <span style={{ fontFamily: "monospace", fontSize: 11 }}>fbclid:{booking.fbclid.slice(0, 12)}…</span>;
  if (booking.li_fat_id)
    return <span style={{ fontFamily: "monospace", fontSize: 11 }}>li:{booking.li_fat_id.slice(0, 12)}…</span>;
  if (booking.ttclid)
    return <span style={{ fontFamily: "monospace", fontSize: 11 }}>ttclid:{booking.ttclid.slice(0, 12)}…</span>;
  if (booking.msclkid)
    return <span style={{ fontFamily: "monospace", fontSize: 11 }}>msclkid:{booking.msclkid.slice(0, 12)}…</span>;
  return <span style={{ color: "var(--text-disabled)" }}>—</span>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // 1. Verify the user is authenticated
  const supabaseAuth = await createAuthServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect("/auth/login");

  // 2. Fetch data with service_role (bypasses RLS — workspace scoping in Phase 7)
  const db = createServerClient();

  const [{ data: bookings }, { data: hostSettings }] = await Promise.all([
    db.from("bookings").select("*").order("created_at", { ascending: false }),
    db.from("host_settings").select("google_refresh_token").limit(1).maybeSingle(),
  ]);

  const allBookings: Booking[] = bookings ?? [];
  const calendarConnected = Boolean(hostSettings?.google_refresh_token);

  // 3. Compute stats
  const d = new Date();
  const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayBookings = allBookings.filter((b) => b.date === todayISO).length;

  const sourceCounts: Record<string, number> = {};
  allBookings.forEach((b) => {
    if (b.utm_source) sourceCounts[b.utm_source] = (sourceCounts[b.utm_source] ?? 0) + 1;
  });
  const topSource =
    Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      {/* ── Nav ── */}
      <nav
        style={{
          background: "white",
          borderBottom: "1px solid var(--border-default)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 var(--space-6)",
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
            TrackCal
          </span>
          <div style={{ flex: 1 }} />

          {/* Calendar connection status + action */}
          {calendarConnected ? (
            <span className="badge badge-green" style={{ fontSize: 12 }}>
              Calendar connected
            </span>
          ) : (
            <a href="/api/auth/google" className="btn btn-secondary btn-sm">
              Connect Google Calendar
            </a>
          )}

          <span
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.email}
          </span>

          <SignOutButton />
        </div>
      </nav>

      {/* ── Main ── */}
      <main
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
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Bookings
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginTop: "var(--space-1)",
            }}
          >
            Every booking with full attribution — source, campaign, and click IDs.
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-4)",
            marginBottom: "var(--space-8)",
          }}
        >
          <StatCard label="Total Bookings" value={String(allBookings.length)} />
          <StatCard label="Today" value={String(todayBookings)} sub={todayISO} />
          <StatCard
            label="Top Source"
            value={topSource}
            sub={
              sourceCounts[topSource]
                ? `${sourceCounts[topSource]} booking${sourceCounts[topSource] === 1 ? "" : "s"}`
                : undefined
            }
          />
        </div>

        {/* Bookings table */}
        <div className="card">
          <div
            className="card-header"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <h2 className="card-title">All Bookings</h2>
            <a href="/book" className="btn btn-ghost-accent btn-sm">
              View booking page →
            </a>
          </div>

          {allBookings.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Campaign</th>
                    <th>Medium</th>
                    <th>Click ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allBookings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{b.date}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{b.time}</td>
                      <td style={{ fontWeight: 500 }}>{b.name}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{b.email}</td>
                      <td>
                        {b.utm_source ? (
                          <span className="badge badge-blue">{b.utm_source}</span>
                        ) : (
                          <span style={{ color: "var(--text-disabled)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 13 }}>{b.utm_campaign ?? "—"}</td>
                      <td style={{ fontSize: 13 }}>{b.utm_medium ?? "—"}</td>
                      <td style={{ color: "var(--text-tertiary)" }}>
                        <ClickIdCell booking={b} />
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            b.status === "confirmed" ? "badge-green" : "badge-amber"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: "var(--space-12)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-4)",
              }}
            >
              <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
                No bookings yet. Share your booking link to get started.
              </p>
              <a href="/book" className="btn btn-ghost-accent btn-sm">
                View booking page →
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
