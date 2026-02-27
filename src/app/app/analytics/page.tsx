/**
 * /app/analytics — Full attribution analytics
 *
 * Server Component: auth + data fetching server-side.
 * Filters live in URL search params — no client state needed.
 * CSV export delegates to CsvExportButton (client component).
 *
 * Moved here from /app/dashboard so the dashboard can be a
 * lightweight "upcoming events" daily driver.
 */

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import DashboardNav from "@/components/dashboard/DashboardNav";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import BookingStatusSelect from "@/components/dashboard/BookingStatusSelect";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type FilterParams = {
  date_from?: string;
  date_to?: string;
  source?: string;
  campaign?: string;
  status?: string;
  q?: string;
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: "var(--space-5) var(--space-6)" }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          display: "block",
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "block",
          fontSize: 30,
          fontWeight: 800,
          color: "var(--text-primary)",
          lineHeight: 1.1,
          marginTop: "var(--space-2)",
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: "var(--space-1)",
            display: "block",
          }}
        >
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

function SourceChart({ sourceCounts }: { sourceCounts: Record<string, number> }) {
  const entries = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const max = entries[0][1];

  return (
    <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
          Bookings by Source
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {entries.length} source{entries.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {entries.map(([source, count]) => (
          <div key={source} style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <span
              style={{
                width: 88,
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 600,
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {source}
            </span>
            <div
              style={{
                flex: 1,
                background: "var(--surface-subtle)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                height: 8,
              }}
            >
              <div
                style={{
                  width: `${Math.max((count / max) * 100, 3)}%`,
                  background: "linear-gradient(90deg, var(--blue-400), var(--blue-300))",
                  height: "100%",
                  borderRadius: "var(--radius-full)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <span
              style={{
                minWidth: 28,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-primary)",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<FilterParams>;
}) {
  // 1. Auth
  const supabaseAuth = await createAuthServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect("/login");

  // 2. Fetch
  const db = createServerClient();
  const [{ data: bookings }, { data: hostSettings }] = await Promise.all([
    db.from("bookings").select("*").order("created_at", { ascending: false }),
    db.from("host_settings").select("google_refresh_token").limit(1).maybeSingle(),
  ]);

  const allBookings: Booking[] = bookings ?? [];
  const calendarConnected = Boolean(hostSettings?.google_refresh_token);

  // 3. Resolve filters from URL params
  const params = await searchParams;
  let filtered = allBookings;
  if (params.date_from) filtered = filtered.filter((b) => b.date >= params.date_from!);
  if (params.date_to) filtered = filtered.filter((b) => b.date <= params.date_to!);
  if (params.source) filtered = filtered.filter((b) => b.utm_source === params.source);
  if (params.campaign)
    filtered = filtered.filter((b) =>
      b.utm_campaign?.toLowerCase().includes(params.campaign!.toLowerCase())
    );
  if (params.status) filtered = filtered.filter((b) => b.status === params.status);
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        (b.utm_campaign ?? "").toLowerCase().includes(q)
    );
  }

  const hasFilters = !!(
    params.date_from ||
    params.date_to ||
    params.source ||
    params.campaign ||
    params.status ||
    params.q
  );

  // 4. Stats (computed from filtered set)
  const d = new Date();
  const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayCount = filtered.filter((b) => b.date === todayISO).length;

  const sourceCounts: Record<string, number> = {};
  filtered.forEach((b) => {
    if (b.utm_source) sourceCounts[b.utm_source] = (sourceCounts[b.utm_source] ?? 0) + 1;
  });
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const attributedCount = filtered.filter((b) => Boolean(b.utm_source)).length;
  const clickIdCount = filtered.filter(
    (b) => Boolean(b.gclid || b.fbclid || b.li_fat_id || b.ttclid || b.msclkid)
  ).length;
  const attributionCoverage =
    filtered.length > 0 ? `${Math.round((attributedCount / filtered.length) * 100)}%` : "0%";
  const clickIdCoverage =
    filtered.length > 0 ? `${Math.round((clickIdCount / filtered.length) * 100)}%` : "0%";

  // Source options for filter dropdown (from all bookings, not filtered)
  const uniqueSources = [
    ...new Set(allBookings.map((b) => b.utm_source).filter(Boolean) as string[]),
  ].sort();

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <DashboardNav
        activeTab="analytics"
        calendarConnected={calendarConnected}
        email={user.email ?? ""}
      />

      {/* ── Main ── */}
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
            Analytics
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              marginTop: "var(--space-1)",
              fontWeight: 500,
            }}
          >
            Every booking with full attribution — source, campaign, and click IDs.
          </p>
        </div>

        {/* Stats */}
        <div
          className="dashboard-stats-grid"
          style={{
            display: "grid",
            gap: "var(--space-4)",
            marginBottom: "var(--space-6)",
          }}
        >
          <StatCard
            label={hasFilters ? "Filtered Bookings" : "Total Bookings"}
            value={String(filtered.length)}
            sub={hasFilters ? `of ${allBookings.length} total` : undefined}
          />
          <StatCard label="Today" value={String(todayCount)} sub={todayISO} />
          <StatCard
            label="Top Source"
            value={topSource}
            sub={
              sourceCounts[topSource]
                ? `${sourceCounts[topSource]} booking${sourceCounts[topSource] === 1 ? "" : "s"}`
                : undefined
            }
          />
          <StatCard label="Attribution Coverage" value={attributionCoverage} sub={`${attributedCount} with source`} />
          <StatCard label="Click ID Capture" value={clickIdCoverage} sub={`${clickIdCount} with click id`} />
        </div>

        {/* Source chart — only renders when attribution data exists */}
        <SourceChart sourceCounts={sourceCounts} />

        {/* Bookings table */}
        <div className="card">
          <div
            className="card-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "var(--space-3)",
            }}
          >
            <h2 className="card-title">All Bookings</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <CsvExportButton bookings={filtered} />
              <a href="/book" className="btn btn-ghost-accent btn-sm">
                View booking page →
              </a>
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              padding: "var(--space-4) var(--space-6)",
              borderBottom: "1px solid var(--border-default)",
              background: hasFilters ? "var(--blue-50)" : undefined,
            }}
          >
            <form
              method="GET"
              action="/app/analytics"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-3)",
                alignItems: "flex-end",
              }}
            >
              <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
                <label className="form-label" style={{ fontSize: 11 }}>From</label>
                <input
                  type="date"
                  name="date_from"
                  className="input"
                  style={{ height: 34, fontSize: 13 }}
                  defaultValue={params.date_from ?? ""}
                />
              </div>

              <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
                <label className="form-label" style={{ fontSize: 11 }}>To</label>
                <input
                  type="date"
                  name="date_to"
                  className="input"
                  style={{ height: 34, fontSize: 13 }}
                  defaultValue={params.date_to ?? ""}
                />
              </div>

              {uniqueSources.length > 0 && (
                <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Source</label>
                  <select
                    name="source"
                    className="select"
                    style={{ height: 34, fontSize: 13 }}
                    defaultValue={params.source ?? ""}
                  >
                    <option value="">All sources</option>
                    {uniqueSources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Campaign</label>
                <input
                  type="text"
                  name="campaign"
                  className="input"
                  style={{ height: 34, fontSize: 13 }}
                  placeholder="e.g. q1-demo"
                  defaultValue={params.campaign ?? ""}
                />
              </div>

              <div className="form-field" style={{ margin: 0, minWidth: 150 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Status</label>
                <select
                  name="status"
                  className="select"
                  style={{ height: 34, fontSize: 13 }}
                  defaultValue={params.status ?? ""}
                >
                  <option value="">All statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>

              <div className="form-field" style={{ margin: 0, minWidth: 170 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Search</label>
                <input
                  type="text"
                  name="q"
                  className="input"
                  style={{ height: 34, fontSize: 13 }}
                  placeholder="Name, email, campaign"
                  defaultValue={params.q ?? ""}
                />
              </div>

              <div style={{ display: "flex", gap: "var(--space-2)", paddingBottom: 1 }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Filter
                </button>
                {hasFilters && (
                  <a href="/app/analytics" className="btn btn-ghost btn-sm">
                    Clear
                  </a>
                )}
              </div>
            </form>
          </div>

          {filtered.length > 0 ? (
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
                  {filtered.map((b) => (
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
                        <BookingStatusSelect bookingId={b.id} status={b.status} />
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
                {hasFilters
                  ? "No bookings match the current filters."
                  : "No bookings yet. Share your booking link to get started."}
              </p>
              {hasFilters ? (
                <a href="/app/analytics" className="btn btn-ghost btn-sm">
                  Clear filters
                </a>
              ) : (
                <a href="/book" className="btn btn-ghost-accent btn-sm">
                  View booking page →
                </a>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
