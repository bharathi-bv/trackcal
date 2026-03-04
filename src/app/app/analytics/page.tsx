/**
 * /app/analytics — Analytics with 4 tabs:
 *   volume      — Volume & Pipeline + Team workload
 *   attribution — UTM breakdown (interactive group-by) + bookings table
 *   quality     — Meeting quality: no-show rates, cancellation patterns
 *   patterns    — Time patterns: day of week, hour of day, lead time
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import {
  buildPublicBookingPath,
  ensureHostPublicSlug,
} from "@/lib/public-booking-links";
import DashboardNav from "@/components/dashboard/DashboardNav";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import BookingStatusSelect from "@/components/dashboard/BookingStatusSelect";
import AttributionChartClient from "@/components/analytics/AttributionChartClient";
import VolumeChartClient from "@/components/analytics/VolumeChartClient";

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

type BookingChartRow = {
  id: string;
  date: string;
  created_at: string;
  time: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  status: string;
  assigned_to: string | null;
  event_slug: string | null;
};

type FilterParams = {
  tab?: string;
  date_from?: string;
  date_to?: string;
  source?: string;
  campaign?: string;
  status?: string;
  q?: string;
  page?: string;
};

const ANALYTICS_PAGE_SIZE = 100;
const BOOKING_COLUMNS =
  "id, created_at, date, time, name, email, phone, utm_source, utm_campaign, utm_medium, gclid, fbclid, li_fat_id, ttclid, msclkid, status";

// ── Tabs ──────────────────────────────────────────────────────────────────────

const ANALYTICS_TABS = [
  { id: "volume",      label: "Volume & Pipeline" },
  { id: "attribution", label: "Attribution"        },
  { id: "quality",     label: "Meeting Quality"    },
  { id: "patterns",    label: "Time Patterns"      },
] as const;

type AnalyticsTabId = (typeof ANALYTICS_TABS)[number]["id"];

// ── Filter helpers ────────────────────────────────────────────────────────────

type FilterableQuery = {
  gte: (c: string, v: string) => FilterableQuery;
  lte: (c: string, v: string) => FilterableQuery;
  eq: (c: string, v: string) => FilterableQuery;
  ilike: (c: string, v: string) => FilterableQuery;
  or: (f: string) => FilterableQuery;
};

function applyBookingFilters<T extends FilterableQuery>(q: T, p: FilterParams): T {
  let next: FilterableQuery = q;
  if (p.date_from) next = next.gte("date", p.date_from);
  if (p.date_to) next = next.lte("date", p.date_to);
  if (p.source) next = next.eq("utm_source", p.source);
  if (p.campaign) next = next.ilike("utm_campaign", `%${p.campaign.trim()}%`);
  if (p.status) next = next.eq("status", p.status);
  if (p.q?.trim()) {
    const q2 = p.q.trim().replace(/,/g, " ");
    next = next.or(`name.ilike.%${q2}%,email.ilike.%${q2}%,utm_campaign.ilike.%${q2}%`);
  }
  return next as T;
}

function buildHref(params: FilterParams, overrides: Partial<FilterParams> = {}) {
  const m = { ...params, ...overrides };
  const qp = new URLSearchParams();
  if (m.tab && m.tab !== "volume") qp.set("tab", m.tab);
  if (m.date_from) qp.set("date_from", m.date_from);
  if (m.date_to) qp.set("date_to", m.date_to);
  if (m.source) qp.set("source", m.source);
  if (m.campaign) qp.set("campaign", m.campaign);
  if (m.status) qp.set("status", m.status);
  if (m.q) qp.set("q", m.q);
  if (m.page && Number(m.page) > 1) qp.set("page", m.page);
  const qs = qp.toString();
  return qs ? `/app/analytics?${qs}` : "/app/analytics";
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function getHour(timeStr: string): number {
  const parts = timeStr.trim().split(" ");
  const h = Number(parts[0].split(":")[0]);
  const mer = (parts[1] ?? "").toUpperCase();
  if (mer === "PM" && h !== 12) return h + 12;
  if (mer === "AM" && h === 12) return 0;
  return h;
}

function getLeadDays(createdAt: string, bookingDate: string): number {
  const created = new Date(createdAt.split("T")[0]);
  const [y, m, d] = bookingDate.split("-").map(Number);
  const booked = new Date(y, m - 1, d);
  return Math.max(0, Math.round((booked.getTime() - created.getTime()) / 86400000));
}

const LEAD_BUCKETS = ["Same day", "1–3 days", "4–7 days", "1–2 weeks", "2+ weeks"] as const;

function bucketLeadTime(days: number): string {
  if (days === 0) return "Same day";
  if (days <= 3) return "1–3 days";
  if (days <= 7) return "4–7 days";
  if (days <= 14) return "1–2 weeks";
  return "2+ weeks";
}

function countByKey(rows: BookingChartRow[], key: keyof BookingChartRow): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = String(row[key] ?? "");
    if (!val) continue;
    counts[val] = (counts[val] ?? 0) + 1;
  }
  return Object.entries(counts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

// ── Chart components (SVG / CSS — server-compatible) ─────────────────────────

function LineChart({ data }: { data: { label: string; count: number }[] }) {
  if (data.length < 2) return null;
  const W = 800, H = 110;
  const pT = 10, pB = 4, pL = 0, pR = 0;
  const iW = W - pL - pR;
  const iH = H - pT - pB;
  const max = Math.max(...data.map((d) => d.count), 1);

  const pts = data.map((d, i) => ({
    x: pL + (i / (data.length - 1)) * iW,
    y: pT + iH - (d.count / max) * iH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="tc-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a9eff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#4a9eff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tc-line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7b6cf6" />
          <stop offset="100%" stopColor="#4a9eff" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#tc-area-grad)" />
      <path d={linePath} fill="none" stroke="url(#tc-line-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) =>
        p.count > 0 ? <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#4a9eff" /> : null
      )}
    </svg>
  );
}

function VBarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 88 }}>
      {data.map(({ label, count }) => (
        <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div
            style={{
              width: "100%",
              background: count > 0 ? "linear-gradient(180deg, #7b6cf6 0%, #4a9eff 100%)" : "var(--surface-subtle)",
              borderRadius: "3px 3px 0 0",
              height: `${Math.max((count / max) * 68, count > 0 ? 4 : 0)}px`,
              transition: "height 0.3s ease",
              minHeight: count > 0 ? 4 : 0,
            }}
          />
          <span style={{ fontSize: 9, color: "var(--text-tertiary)", fontWeight: 500, textAlign: "center", lineHeight: 1 }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function HBarChart({
  data, suffix = "", colorFn,
}: {
  data: { label: string; count: number; sub?: string }[];
  suffix?: string;
  colorFn?: (count: number, max: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const defaultColor = "linear-gradient(90deg, #7b6cf6, #4a9eff)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {data.map(({ label, count, sub }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span
            style={{
              width: 110,
              fontSize: 12,
              color: "var(--text-primary)",
              fontWeight: 600,
              flexShrink: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
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
                width: `${Math.max((count / max) * 100, count > 0 ? 2 : 0)}%`,
                background: colorFn ? colorFn(count, max) : defaultColor,
                height: "100%",
                borderRadius: "var(--radius-full)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span
            style={{
              minWidth: 44,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-primary)",
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {count}{suffix}
          </span>
          {sub && (
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0, minWidth: 48 }}>
              {sub}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accentBg }: { label: string; value: string; sub?: string; accentBg?: string }) {
  return (
    <div className="tc-kpi-card" style={accentBg ? { background: accentBg, borderColor: "transparent" } : undefined}>
      <span className="tc-kpi-label">{label}</span>
      <span className="tc-kpi-value" style={{ fontSize: 26 }}>{value}</span>
      {sub && <span className="tc-body-sm">{sub}</span>}
    </div>
  );
}

function BigStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="tc-card" style={{ padding: "var(--space-5)", textAlign: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 800, color: color ?? "var(--text-primary)", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, marginTop: "var(--space-1)" }}>
        {label}
      </div>
    </div>
  );
}

function ClickIdCell({ booking }: { booking: Booking }) {
  if (booking.gclid) return <span style={{ fontFamily: "monospace", fontSize: 11 }}>gclid:{booking.gclid.slice(0, 12)}…</span>;
  if (booking.fbclid) return <span style={{ fontFamily: "monospace", fontSize: 11 }}>fbclid:{booking.fbclid.slice(0, 12)}…</span>;
  if (booking.li_fat_id) return <span style={{ fontFamily: "monospace", fontSize: 11 }}>li:{booking.li_fat_id.slice(0, 12)}…</span>;
  if (booking.ttclid) return <span style={{ fontFamily: "monospace", fontSize: 11 }}>ttclid:{booking.ttclid.slice(0, 12)}…</span>;
  if (booking.msclkid) return <span style={{ fontFamily: "monospace", fontSize: 11 }}>msclkid:{booking.msclkid.slice(0, 12)}…</span>;
  return <span style={{ color: "var(--text-disabled)" }}>—</span>;
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function ChartCard({
  title, children, right,
}: {
  title: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="tc-card" style={{ padding: "var(--space-5)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-5)",
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
          {title}
        </span>
        {right}
      </div>
      {children}
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
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const activeTab: AnalyticsTabId =
    (ANALYTICS_TABS.find((t) => t.id === params.tab)?.id ?? "volume") as AnalyticsTabId;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const from = (page - 1) * ANALYTICS_PAGE_SIZE;
  const to = from + ANALYTICS_PAGE_SIZE - 1;
  const hasFilters = !!(params.date_from || params.date_to || params.source || params.campaign || params.status || params.q);

  // 2. Date ranges
  const now = new Date();
  const todayISO = toISODate(now);
  const dayOfWeekNow = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeekNow === 0 ? 6 : dayOfWeekNow - 1));
  const weekStartISO = toISODate(weekStart);
  const monthStartISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  const thirtyDaysAgoISO = toISODate(thirtyDaysAgo);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(now.getDate() - 59);
  const sixtyDaysAgoISO = toISODate(sixtyDaysAgo);

  // 3. All queries in parallel
  const db = createServerClient();
  const [
    hostPublicSlug,
    bookingsResult,
    filteredCountResult,
    todayCountResult,
    attributedCountResult,
    clickIdCountResult,
    confirmedCountResult,
    pendingCountResult,
    cancelledCountResult,
    noShowCountResult,
    thisWeekCountResult,
    thisMonthCountResult,
    allBookingsResult,
    activeLinksResult,
    firstActiveEventResult,
  ] = await Promise.all([
    ensureHostPublicSlug({ db }),
    applyBookingFilters(
      // @ts-expect-error Supabase builder type depth
      db.from("bookings").select(BOOKING_COLUMNS).order("created_at", { ascending: false }),
      params
    ).range(from, to),
    applyBookingFilters(db.from("bookings").select("id", { count: "exact", head: true }), params),
    applyBookingFilters(db.from("bookings").select("id", { count: "exact", head: true }).eq("date", todayISO), params),
    applyBookingFilters(db.from("bookings").select("id", { count: "exact", head: true }).not("utm_source", "is", null), params),
    applyBookingFilters(
      db.from("bookings").select("id", { count: "exact", head: true })
        .or("gclid.not.is.null,fbclid.not.is.null,li_fat_id.not.is.null,ttclid.not.is.null,msclkid.not.is.null"),
      params
    ),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "no_show"),
    db.from("bookings").select("id", { count: "exact", head: true }).gte("date", weekStartISO),
    db.from("bookings").select("id", { count: "exact", head: true }).gte("date", monthStartISO),
    db.from("bookings")
      .select("id, date, created_at, time, utm_source, utm_campaign, utm_medium, status, assigned_to, event_slug")
      .range(0, 4999)
      .order("date", { ascending: true }),
    db.from("event_types").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.from("event_types").select("slug").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);

  // 4. Process base data
  const filtered: Booking[] = bookingsResult.data ?? [];
  const filteredTotal = filteredCountResult.count ?? 0;
  const activeLinks = activeLinksResult.count ?? 0;
  const firstActiveEventSlug = firstActiveEventResult.data?.slug ?? null;
  const bookingPageHref = firstActiveEventSlug
    ? buildPublicBookingPath(hostPublicSlug, firstActiveEventSlug)
    : "/app/dashboard/event-types";
  const todayCount = todayCountResult.count ?? 0;
  const attributedCount = attributedCountResult.count ?? 0;
  const clickIdCount = clickIdCountResult.count ?? 0;

  // 5. Volume data
  const confirmedCount = confirmedCountResult.count ?? 0;
  const pendingCount = pendingCountResult.count ?? 0;
  const cancelledCount = cancelledCountResult.count ?? 0;
  const noShowCount = noShowCountResult.count ?? 0;
  const totalAllTime = confirmedCount + pendingCount + cancelledCount + noShowCount;
  const thisWeekCount = thisWeekCountResult.count ?? 0;
  const thisMonthCount = thisMonthCountResult.count ?? 0;

  // 6. All-bookings chart data
  const allRows: BookingChartRow[] = (allBookingsResult.data ?? []) as BookingChartRow[];
  const slugs = [...new Set(allRows.map((r) => r.event_slug).filter(Boolean) as string[])].sort();

  // 7. Attribution tab data
  const attributedRows = allRows.filter((r) => r.utm_source);
  const bySource = countByKey(attributedRows, "utm_source");
  const byCampaign = countByKey(allRows.filter((r) => r.utm_campaign), "utm_campaign");
  const byMedium = countByKey(allRows.filter((r) => r.utm_medium), "utm_medium");

  const sourceCounts: Record<string, number> = {};
  filtered.forEach((b) => {
    if (b.utm_source) sourceCounts[b.utm_source] = (sourceCounts[b.utm_source] ?? 0) + 1;
  });
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const attributionCoverage = filteredTotal > 0 ? `${Math.round((attributedCount / filteredTotal) * 100)}%` : "0%";
  const clickIdCoverage = filteredTotal > 0 ? `${Math.round((clickIdCount / filteredTotal) * 100)}%` : "0%";
  const totalPages = Math.max(1, Math.ceil(filteredTotal / ANALYTICS_PAGE_SIZE));
  const uniqueSources = [
    ...new Set([...filtered.map((b) => b.utm_source).filter(Boolean), params.source].filter(Boolean) as string[]),
  ].sort();

  // 8. Meeting Quality data
  const completedRows = allRows.filter((r) => r.status !== "pending");
  const totalCompleted = completedRows.length;
  const totalNoShows = allRows.filter((r) => r.status === "no_show").length;
  const totalCancelled = allRows.filter((r) => r.status === "cancelled").length;
  const overallNoShowRate = totalCompleted > 0 ? Math.round((totalNoShows / totalCompleted) * 100) : 0;
  const overallCancelRate = (totalCompleted + pendingCount) > 0
    ? Math.round((totalCancelled / (totalCompleted + pendingCount)) * 100)
    : 0;
  const showRate = totalCompleted > 0
    ? Math.round(((totalCompleted - totalNoShows) / totalCompleted) * 100)
    : 0;

  // No-show rate by source
  const srcQuality: Record<string, { total: number; no_shows: number }> = {};
  for (const r of completedRows) {
    const src = r.utm_source ?? "(no UTM)";
    if (!srcQuality[src]) srcQuality[src] = { total: 0, no_shows: 0 };
    srcQuality[src].total++;
    if (r.status === "no_show") srcQuality[src].no_shows++;
  }
  const noShowBySource = Object.entries(srcQuality)
    .filter(([, v]) => v.total >= 2)
    .map(([label, { total, no_shows }]) => ({
      label,
      count: Math.round((no_shows / total) * 100),
      sub: `${no_shows}/${total}`,
    }))
    .sort((a, b) => b.count - a.count);

  // Cancellation lead time (when were cancelled meetings originally booked?)
  const cancelledRows = allRows.filter((r) => r.status === "cancelled" && r.created_at && r.date);
  const cancelLeadCounts: Record<string, number> = {};
  for (const r of cancelledRows) {
    const bucket = bucketLeadTime(getLeadDays(r.created_at, r.date));
    cancelLeadCounts[bucket] = (cancelLeadCounts[bucket] ?? 0) + 1;
  }
  const cancelLeadData = LEAD_BUCKETS.map((label) => ({ label, count: cancelLeadCounts[label] ?? 0 }));

  // 9. Time Patterns data
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun
  const dayCountsRaw = Array(7).fill(0) as number[];
  for (const r of allRows) dayCountsRaw[getDayOfWeek(r.date)]++;
  const dayData = dayOrder.map((d) => ({ label: DAY_LABELS[d], count: dayCountsRaw[d] }));

  // Hour of day (show 6am–10pm for readability)
  const hourCounts = Array(24).fill(0) as number[];
  for (const r of allRows) {
    if (r.time) {
      const h = getHour(r.time);
      if (h >= 0 && h < 24) hourCounts[h]++;
    }
  }
  const HOUR_RANGE = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const hourData = HOUR_RANGE.map((h) => ({
    label: h === 0 ? "12A" : h < 12 ? `${h}A` : h === 12 ? "12P" : `${h - 12}P`,
    count: hourCounts[h],
  }));

  // Lead time distribution (all bookings)
  const leadTimeCounts: Record<string, number> = {};
  for (const r of allRows) {
    if (r.created_at && r.date) {
      const bucket = bucketLeadTime(getLeadDays(r.created_at, r.date));
      leadTimeCounts[bucket] = (leadTimeCounts[bucket] ?? 0) + 1;
    }
  }
  const leadTimeData = LEAD_BUCKETS.map((label) => ({ label, count: leadTimeCounts[label] ?? 0 }));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh" }}>
      <DashboardNav activeTab="analytics" activeLinks={activeLinks} email={user.email ?? ""} />

      <main className="dashboard-main" style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--space-6)" }}>
        {/* Header */}
        <div style={{ marginBottom: "var(--space-5)" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Booking performance, attribution, and meeting quality.
          </p>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", borderBottom: "2px solid var(--border-default)", marginBottom: "var(--space-6)" }}>
          {ANALYTICS_TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <Link
                key={t.id}
                href={buildHref({ ...params, page: undefined }, { tab: t.id })}
                style={{
                  padding: "var(--space-3) var(--space-5)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActive ? "var(--blue-400)" : "var(--text-secondary)",
                  borderBottom: isActive ? "2px solid var(--blue-400)" : "2px solid transparent",
                  marginBottom: -2,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* ── VOLUME & PIPELINE ─────────────────────────────────────────────── */}
        {activeTab === "volume" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)" }}>
              <StatCard label="All Time" value={String(totalAllTime)} />
              <StatCard label="This Month" value={String(thisMonthCount)} sub={`since ${monthStartISO}`} />
              <StatCard label="This Week" value={String(thisWeekCount)} sub={`since ${weekStartISO}`} />
              <StatCard label="Today" value={String(todayCount)} sub={todayISO} />
            </div>

            {/* Bookings chart with filters */}
            <VolumeChartClient
              rows={allRows.map((r) => ({ date: r.date, status: r.status, event_slug: r.event_slug }))}
              slugs={slugs}
              initialFrom={sixtyDaysAgoISO}
              initialTo={todayISO}
            />
          </div>
        )}

        {/* ── ATTRIBUTION ───────────────────────────────────────────────────── */}
        {activeTab === "attribution" && (
          <div>
            {/* Empty state */}
            {filteredTotal === 0 && !hasFilters && (
              <div
                style={{
                  background: "rgba(255,255,255,0.75)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-xl)",
                  padding: "var(--space-12) var(--space-6)",
                  textAlign: "center",
                  marginBottom: "var(--space-5)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-5)",
                }}
              >
                <div style={{ fontSize: 48, lineHeight: 1 }}>📊</div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                    Your attribution dashboard is ready
                  </h2>
                  <p style={{ fontSize: 14, color: "var(--color-text-secondary)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
                    Once bookings come in, you&apos;ll see source, campaign, and click IDs here.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <Link href={bookingPageHref} className="tc-btn tc-btn--primary tc-btn--sm">View booking page →</Link>
                  <Link href="/docs" className="tc-btn tc-btn--ghost tc-btn--sm">UTM tracking guide</Link>
                </div>
              </div>
            )}

            {/* Coverage stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <StatCard label={hasFilters ? "Filtered" : "Total Bookings"} value={String(filteredTotal)} sub={`Page ${page} of ${totalPages}`} />
              <StatCard label="Today" value={String(todayCount)} sub={todayISO} />
              <StatCard label="Top Source" value={topSource} sub={sourceCounts[topSource] ? `${sourceCounts[topSource]} booking${sourceCounts[topSource] === 1 ? "" : "s"}` : undefined} />
              <StatCard label="Attribution Coverage" value={attributionCoverage} sub={`${attributedCount} with source`} accentBg="rgba(94,198,160,0.10)" />
              <StatCard label="Click ID Capture" value={clickIdCoverage} sub={`${clickIdCount} with click id`} accentBg="rgba(123,108,246,0.09)" />
            </div>

            {/* UTM breakdown chart with group-by toggle */}
            <ChartCard title="Bookings by UTM">
              <AttributionChartClient bySource={bySource} byCampaign={byCampaign} byMedium={byMedium} />
            </ChartCard>

            {/* Bookings table */}
            <div className="tc-table-card" style={{ marginTop: "var(--space-4)" }}>
              <div className="tc-table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>All Bookings</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <CsvExportButton bookings={filtered} />
                  <Link href={bookingPageHref} className="tc-btn tc-btn--soft tc-btn--sm">View booking page →</Link>
                </div>
              </div>

              {/* Filters */}
              <div style={{ padding: "var(--space-4) var(--space-6)", borderBottom: "1px solid var(--border-default)", background: hasFilters ? "var(--color-primary-light)" : undefined }}>
                <form method="GET" action="/app/analytics" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}>
                  <input type="hidden" name="tab" value="attribution" />
                  <div className="tc-form-field" style={{ margin: 0, minWidth: 140 }}>
                    <label className="tc-form-label" style={{ fontSize: 11 }}>From</label>
                    <input type="date" name="date_from" className="tc-input" style={{ height: 34, fontSize: 13 }} defaultValue={params.date_from ?? ""} />
                  </div>
                  <div className="tc-form-field" style={{ margin: 0, minWidth: 140 }}>
                    <label className="tc-form-label" style={{ fontSize: 11 }}>To</label>
                    <input type="date" name="date_to" className="tc-input" style={{ height: 34, fontSize: 13 }} defaultValue={params.date_to ?? ""} />
                  </div>
                  {uniqueSources.length > 0 && (
                    <div className="tc-form-field" style={{ margin: 0, minWidth: 140 }}>
                      <label className="tc-form-label" style={{ fontSize: 11 }}>Source</label>
                      <div className="tc-select-wrap">
                        <select name="source" className="tc-input" style={{ height: 34, fontSize: 13 }} defaultValue={params.source ?? ""}>
                          <option value="">All sources</option>
                          {uniqueSources.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="tc-form-field" style={{ margin: 0, minWidth: 160 }}>
                    <label className="tc-form-label" style={{ fontSize: 11 }}>Campaign</label>
                    <input type="text" name="campaign" className="tc-input" style={{ height: 34, fontSize: 13 }} placeholder="e.g. q1-demo" defaultValue={params.campaign ?? ""} />
                  </div>
                  <div className="tc-form-field" style={{ margin: 0, minWidth: 150 }}>
                    <label className="tc-form-label" style={{ fontSize: 11 }}>Status</label>
                    <div className="tc-select-wrap">
                      <select name="status" className="tc-input" style={{ height: 34, fontSize: 13 }} defaultValue={params.status ?? ""}>
                        <option value="">All statuses</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </div>
                  </div>
                  <div className="tc-form-field" style={{ margin: 0, minWidth: 170 }}>
                    <label className="tc-form-label" style={{ fontSize: 11 }}>Search</label>
                    <input type="text" name="q" className="tc-input" style={{ height: 34, fontSize: 13 }} placeholder="Name, email, campaign" defaultValue={params.q ?? ""} />
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", paddingBottom: 1 }}>
                    <button type="submit" className="tc-btn tc-btn--primary tc-btn--sm">Filter</button>
                    {hasFilters && (
                      <Link href="/app/analytics?tab=attribution" className="tc-btn tc-btn--ghost tc-btn--sm">Clear</Link>
                    )}
                  </div>
                </form>
              </div>

              {filtered.length > 0 ? (
                <div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="tc-table">
                      <thead>
                        <tr>
                          <th>Date</th><th>Time</th><th>Name</th><th>Email</th>
                          <th>Source</th><th>Campaign</th><th>Medium</th><th>Click ID</th><th>Status</th>
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
                              {b.utm_source
                                ? <span className="tc-pill tc-pill--primary">{b.utm_source}</span>
                                : <span style={{ color: "var(--text-disabled)" }}>—</span>}
                            </td>
                            <td style={{ fontSize: 13 }}>{b.utm_campaign ?? "—"}</td>
                            <td style={{ fontSize: 13 }}>{b.utm_medium ?? "—"}</td>
                            <td style={{ color: "var(--text-tertiary)" }}><ClickIdCell booking={b} /></td>
                            <td><BookingStatusSelect bookingId={b.id} status={b.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4) var(--space-6)", borderTop: "1px solid var(--border-default)" }}>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                        Showing {from + 1}–{Math.min(from + ANALYTICS_PAGE_SIZE, filteredTotal)} of {filteredTotal}
                      </span>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        {page > 1
                          ? <Link href={buildHref(params, { page: String(page - 1) })} className="tc-btn tc-btn--ghost tc-btn--sm">← Previous</Link>
                          : <button className="tc-btn tc-btn--ghost tc-btn--sm" disabled style={{ opacity: 0.5 }}>← Previous</button>}
                        {page < totalPages
                          ? <Link href={buildHref(params, { page: String(page + 1) })} className="tc-btn tc-btn--ghost tc-btn--sm">Next →</Link>
                          : <button className="tc-btn tc-btn--ghost tc-btn--sm" disabled style={{ opacity: 0.5 }}>Next →</button>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "var(--space-12)", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
                    {hasFilters ? "No bookings match the current filters." : "No bookings yet."}
                  </p>
                  {hasFilters && (
                    <Link href="/app/analytics?tab=attribution" className="tc-btn tc-btn--ghost tc-btn--sm" style={{ marginTop: "var(--space-4)", display: "inline-block" }}>
                      Clear filters
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MEETING QUALITY ───────────────────────────────────────────────── */}
        {activeTab === "quality" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Big stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
              <BigStat label="Show Rate" value={`${showRate}%`} color="#22c55e" />
              <BigStat label="No-Show Rate" value={`${overallNoShowRate}%`} color={overallNoShowRate > 20 ? "#ef4444" : "#f59e0b"} />
              <BigStat label="Cancellation Rate" value={`${overallCancelRate}%`} color={overallCancelRate > 30 ? "#ef4444" : "var(--text-primary)"} />
            </div>

            {totalCompleted === 0 ? (
              <div className="tc-card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
                  No completed bookings yet. Data will appear once meetings are marked confirmed or no-show.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                {/* No-show rate by source */}
                <ChartCard
                  title="No-Show Rate by Source"
                  right={<span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>min. 2 bookings</span>}
                >
                  {noShowBySource.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
                      Not enough data per source yet.
                    </p>
                  ) : (
                    <HBarChart
                      data={noShowBySource}
                      suffix="%"
                      colorFn={(count) =>
                        count > 30
                          ? "linear-gradient(90deg, #ef4444, #f87171)"
                          : count > 15
                          ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                          : "linear-gradient(90deg, #22c55e, #4ade80)"
                      }
                    />
                  )}
                </ChartCard>

                {/* Cancellation timing */}
                <ChartCard
                  title="Cancelled Meetings — Booking Lead Time"
                  right={<span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{totalCancelled} total</span>}
                >
                  {totalCancelled === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>No cancellations yet.</p>
                  ) : (
                    <HBarChart data={cancelLeadData} />
                  )}
                </ChartCard>
              </div>
            )}

            {/* Source quality note */}
            {noShowBySource.length > 0 && (
              <div
                style={{
                  padding: "var(--space-4) var(--space-5)",
                  background: "rgba(74,158,255,0.05)",
                  border: "1px solid rgba(74,158,255,0.15)",
                  borderRadius: "var(--radius-lg)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "var(--text-primary)" }}>Lead quality insight:</strong> A high no-show rate from a source
                means those leads aren&apos;t fully committed. Consider adding a confirmation email, a calendar reminder, or
                tightening your ad targeting for that channel.
              </div>
            )}
          </div>
        )}

        {/* ── TIME PATTERNS ─────────────────────────────────────────────────── */}
        {activeTab === "patterns" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {allRows.length === 0 ? (
              <div className="tc-card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
                  No booking data yet. Patterns will appear here once you have bookings.
                </p>
              </div>
            ) : (
              <>
                {/* Day of week + Hour */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <ChartCard title="Bookings by Day of Week">
                    <VBarChart data={dayData} />
                  </ChartCard>
                  <ChartCard
                    title="Bookings by Hour of Day"
                    right={<span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>6 AM – 9 PM</span>}
                  >
                    <VBarChart data={hourData} />
                  </ChartCard>
                </div>

                {/* Lead time */}
                <ChartCard title="Booking Lead Time" right={<span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>How far in advance people book</span>}>
                  <HBarChart
                    data={leadTimeData}
                    colorFn={() => "linear-gradient(90deg, #7b6cf6, #4a9eff)"}
                  />
                </ChartCard>

                {/* Insight callout */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "var(--space-4)",
                  }}
                >
                  {(() => {
                    const busiestDay = [...dayData].sort((a, b) => b.count - a.count)[0];
                    const busiestHour = HOUR_RANGE.reduce(
                      (best, h) => (hourCounts[h] > hourCounts[best] ? h : best),
                      HOUR_RANGE[0]
                    );
                    const busiestHourLabel = busiestHour < 12 ? `${busiestHour} AM` : busiestHour === 12 ? "12 PM" : `${busiestHour - 12} PM`;
                    const mostCommonLead = LEAD_BUCKETS.reduce(
                      (best, b) => ((leadTimeCounts[b] ?? 0) > (leadTimeCounts[best] ?? 0) ? b : best),
                      LEAD_BUCKETS[0]
                    );
                    return (
                      <>
                        <InsightChip icon="📅" label="Busiest day" value={busiestDay?.label ?? "—"} />
                        <InsightChip icon="⏰" label="Peak hour" value={busiestHourLabel} />
                        <InsightChip icon="📆" label="Most common lead time" value={mostCommonLead} />
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function InsightChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      className="tc-card"
      style={{
        padding: "var(--space-4) var(--space-5)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      </div>
    </div>
  );
}
