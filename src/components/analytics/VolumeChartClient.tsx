"use client";

import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingRow = { date: string; status: string; event_slug: string | null };
type Breakdown = "day" | "week" | "month" | "year";

const STATUS_KEYS = ["confirmed", "pending", "cancelled", "no_show"] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "#22c55e" },
  pending:   { label: "Pending",   color: "#f59e0b" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
  no_show:   { label: "No Show",   color: "#a3a3a3" },
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Date helpers ───────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return toISO(dt);
}

// Monday of the week containing `iso`
function getMondayISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  dt.setDate(dt.getDate() - (dow === 0 ? 6 : dow - 1));
  return toISO(dt);
}

function dayLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS_SHORT[Number(m) - 1]} '${y.slice(2)}`;
}

// ── Bucket builder ────────────────────────────────────────────────────────────

type Bucket = { key: string; label: string } & Record<StatusKey, number>;

function emptyBucket(key: string, label: string): Bucket {
  return { key, label, confirmed: 0, pending: 0, cancelled: 0, no_show: 0 };
}

function buildBuckets(rows: BookingRow[], breakdown: Breakdown, from: string, to: string): Bucket[] {
  const map = new Map<string, Bucket>();

  // Generate all keys so zero-periods appear
  if (breakdown === "day") {
    let cur = from;
    while (cur <= to) {
      map.set(cur, emptyBucket(cur, dayLabel(cur)));
      cur = addDays(cur, 1);
    }
  } else if (breakdown === "week") {
    let cur = getMondayISO(from);
    const toMon = getMondayISO(to);
    while (cur <= toMon) {
      map.set(cur, emptyBucket(cur, dayLabel(cur)));
      cur = addDays(cur, 7);
    }
  } else if (breakdown === "month") {
    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    let y = fy, m = fm;
    while (y < ty || (y === ty && m <= tm)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      map.set(key, emptyBucket(key, monthLabel(key)));
      m++;
      if (m > 12) { m = 1; y++; }
    }
  } else {
    // year
    const fy = Number(from.slice(0, 4));
    const ty = Number(to.slice(0, 4));
    for (let y = fy; y <= ty; y++) {
      const key = String(y);
      map.set(key, emptyBucket(key, key));
    }
  }

  // Tally bookings
  for (const r of rows) {
    if (r.date < from || r.date > to) continue;
    const key =
      breakdown === "day"   ? r.date :
      breakdown === "week"  ? getMondayISO(r.date) :
      breakdown === "month" ? r.date.slice(0, 7) :
      r.date.slice(0, 4);
    const bucket = map.get(key);
    if (bucket && STATUS_KEYS.includes(r.status as StatusKey)) {
      (bucket as Record<string, number>)[r.status as StatusKey]++;
    }
  }

  return [...map.values()];
}

// ── Component ─────────────────────────────────────────────────────────────────

const BREAKDOWNS: { id: Breakdown; label: string }[] = [
  { id: "day",   label: "Day"   },
  { id: "week",  label: "Week"  },
  { id: "month", label: "Month" },
  { id: "year",  label: "Year"  },
];

const X_AXIS_LABEL: Record<Breakdown, string> = {
  day:   "DATE",
  week:  "WEEK STARTING (MONDAY)",
  month: "MONTH",
  year:  "YEAR",
};

export default function VolumeChartClient({
  rows,
  slugs,
  initialFrom,
  initialTo,
}: {
  rows: BookingRow[];
  slugs: string[];
  initialFrom: string;
  initialTo: string;
}) {
  const [breakdown, setBreakdown] = React.useState<Breakdown>("day");
  const [slug, setSlug] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState(initialFrom);
  const [dateTo, setDateTo] = React.useState(initialTo);

  const filtered = React.useMemo(
    () => rows.filter((r) => slug === "all" || r.event_slug === slug),
    [rows, slug]
  );

  const from = dateFrom || initialFrom;
  const to = dateTo || initialTo;

  const buckets = React.useMemo(
    () => buildBuckets(filtered, breakdown, from, to),
    [filtered, breakdown, from, to]
  );

  const hasAny = buckets.some((b) => b.confirmed + b.pending + b.cancelled + b.no_show > 0);
  const maxTotal = Math.max(...buckets.map((b) => b.confirmed + b.pending + b.cancelled + b.no_show), 1);

  // ── SVG layout ──────────────────────────────────────────────────────────────
  const W = 760, H = 240;
  const ML = 44, MR = 12, MT = 14, MB = 46;
  const cW = W - ML - MR;
  const cH = H - MT - MB;

  const n = buckets.length;
  const slot = n > 0 ? cW / n : cW;
  const barW = n > 0 ? Math.max(Math.min(slot * 0.72, 52), 2) : 0;
  const labelEvery = Math.max(1, Math.ceil(n / 12));
  const rotateLabels = n > 24;

  const half = maxTotal === 1 ? 0 : Math.round(maxTotal / 2);
  const yTicks = half > 0 && half < maxTotal ? [0, half, maxTotal] : [0, maxTotal];

  function yPos(v: number) { return MT + cH - (v / maxTotal) * cH; }
  function xCenter(i: number) { return ML + slot * i + slot / 2; }

  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    padding: "4px 8px",
    width: 130,
    height: 30,
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-default)",
    background: "var(--surface-page)",
    color: "var(--text-primary)",
    fontFamily: "inherit",
    outline: "none",
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: "var(--radius-full)",
    border: "1.5px solid",
    borderColor: active ? "var(--blue-400)" : "var(--border-default)",
    background: active ? "var(--blue-50)" : "transparent",
    color: active ? "var(--blue-500)" : "var(--text-secondary)",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s, color 0.15s",
  });

  return (
    <div className="tc-card" style={{ padding: "var(--space-5)" }}>

      {/* ── Top bar: filters + breakdown pills ──────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          paddingBottom: "var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "var(--space-4)",
        }}
      >
        {/* Date range */}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0 }}>
          Date range
        </span>
        <input
          type="date"
          style={inputStyle}
          value={dateFrom}
          max={dateTo || initialTo}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>→</span>
        <input
          type="date"
          style={inputStyle}
          value={dateTo}
          min={dateFrom}
          max={initialTo}
          onChange={(e) => setDateTo(e.target.value)}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "var(--border-default)", flexShrink: 0 }} />

        {/* Meeting link */}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0 }}>
          Meeting link
        </span>
        <div className="tc-select-wrap" style={{ flexShrink: 0 }}>
          <select
            className="tc-input"
            style={{ fontSize: 12, padding: "4px 8px", height: 30, minWidth: 160 }}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            <option value="all">All meeting links</option>
            {slugs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Spacer pushes pills to the right */}
        <div style={{ flex: 1 }} />

        {/* Breakdown pills */}
        <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }}>
          {BREAKDOWNS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setBreakdown(id)}
              style={pillStyle(breakdown === id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
        {STATUS_KEYS.map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: STATUS_CONFIG[s].color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>
              {STATUS_CONFIG[s].label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Chart body ──────────────────────────────────────────────────── */}
      {!hasAny ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 180,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
            No bookings in this range.
          </p>
        </div>
      ) : (
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", overflow: "visible" }}
        >
          {/* Y axis title (rotated) */}
          <text
            transform={`rotate(-90)`}
            x={-(MT + cH / 2)}
            y={11}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill="var(--text-tertiary)"
            letterSpacing="0.10em"
            fontFamily="Manrope, system-ui, sans-serif"
          >
            BOOKINGS
          </text>

          {/* Y axis gridlines + tick labels */}
          {yTicks.map((v) => {
            const y = yPos(v);
            return (
              <g key={v}>
                <line
                  x1={ML} y1={y} x2={ML + cW} y2={y}
                  stroke={v === 0 ? "var(--border-default)" : "var(--border-subtle)"}
                  strokeWidth={v === 0 ? 1 : 0.75}
                  strokeDasharray={v === 0 ? undefined : "3,4"}
                />
                <text
                  x={ML - 6} y={y + 4}
                  textAnchor="end" fontSize={10}
                  fill="var(--text-tertiary)"
                  fontFamily="Manrope, system-ui, sans-serif"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Stacked bars */}
          {buckets.map((b, i) => {
            const cx = xCenter(i);
            const bx = cx - barW / 2;
            const segments = STATUS_KEYS
              .map((s) => ({ s, val: b[s] }))
              .filter((x) => x.val > 0);

            let stackBottom = MT + cH;
            return (
              <g key={b.key}>
                {segments.map(({ s, val }, si) => {
                  const segH = (val / maxTotal) * cH;
                  const segY = stackBottom - segH;
                  stackBottom = segY;
                  const isTop = si === segments.length - 1;
                  return (
                    <rect
                      key={s}
                      x={bx.toFixed(1)}
                      y={segY.toFixed(1)}
                      width={barW.toFixed(1)}
                      height={(segH + (isTop ? 0 : 0.5)).toFixed(1)}
                      fill={STATUS_CONFIG[s].color}
                      rx={isTop ? 2 : 0}
                      ry={isTop ? 2 : 0}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* X axis baseline */}
          <line
            x1={ML} y1={MT + cH} x2={ML + cW} y2={MT + cH}
            stroke="var(--border-default)" strokeWidth={1}
          />

          {/* X axis tick labels */}
          {buckets.map((b, i) => {
            if (i % labelEvery !== 0 && i !== n - 1) return null;
            const cx = xCenter(i);
            const baseY = MT + cH + (rotateLabels ? 6 : 14);
            return (
              <text
                key={b.key}
                x={cx.toFixed(1)}
                y={baseY}
                textAnchor={rotateLabels ? "end" : "middle"}
                fontSize={9}
                fill="var(--text-tertiary)"
                fontFamily="Manrope, system-ui, sans-serif"
                transform={
                  rotateLabels
                    ? `rotate(-40, ${cx.toFixed(1)}, ${(MT + cH + 6).toFixed(1)})`
                    : undefined
                }
              >
                {b.label}
              </text>
            );
          })}

          {/* X axis title */}
          <text
            x={(ML + cW / 2).toFixed(1)}
            y={H - 2}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill="var(--text-tertiary)"
            letterSpacing="0.10em"
            fontFamily="Manrope, system-ui, sans-serif"
          >
            {X_AXIS_LABEL[breakdown]}
          </text>
        </svg>
      )}
    </div>
  );
}
