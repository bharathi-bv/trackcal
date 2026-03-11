import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import LandingNav from "@/components/marketing/LandingNav";

/* ─── Reusable sub-components ─────────────────────────────── */

function BrowserChrome({ children, height = 340, url = "app.citacal.com" }: { children: React.ReactNode; height?: number; url?: string }) {
  return (
    <div style={{
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 24px 64px rgba(60,50,120,0.18), 0 4px 16px rgba(60,50,120,0.10)",
      border: "1px solid rgba(200,198,230,0.5)",
      background: "#FFFFFF",
    }}>
      {/* Browser toolbar */}
      <div style={{
        background: "#F4F3FF",
        borderBottom: "1px solid rgba(200,198,230,0.5)",
        padding: "9px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FFBCBC", display: "inline-block" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#FFD980", display: "inline-block" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#A8EBC8", display: "inline-block" }} />
        <div style={{ flex: 1, height: 22, background: "rgba(200,198,230,0.25)", borderRadius: 6, marginLeft: 8, display: "flex", alignItems: "center", paddingLeft: 10 }}>
          <span style={{ fontSize: 10, color: "#9090B8", fontFamily: "var(--font-sans)" }}>{url}</span>
        </div>
      </div>
      <div style={{ height, overflow: "hidden" }}>{children}</div>
    </div>
  );
}



/* ─── Mock: Booking page ────────────────────────────────────── */
function BookingMock() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", display: "flex", height: "100%", background: "linear-gradient(135deg, rgba(200,196,255,0.15) 0%, rgba(255,210,210,0.10) 50%, rgba(190,240,225,0.10) 100%)" }}>
      {/* Left: event info */}
      <div style={{ width: 200, borderRight: "1px solid rgba(200,198,230,0.4)", padding: "20px 16px", background: "rgba(255,255,255,0.7)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", marginBottom: 12 }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>30-min Demo Call</div>
        <div style={{ fontSize: 10, color: "#6E6E96", marginBottom: 12 }}>with Aiden Hart · 30 min</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, fontSize: 10, color: "#454560" }}>
          <span>📹</span> Google Meet
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#454560" }}>
          <span>🌍</span> India Standard Time
        </div>
        <div style={{ marginTop: 20, padding: "10px", borderRadius: 8, background: "rgba(123,108,246,0.06)", border: "1px solid rgba(123,108,246,0.15)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#7B6CF6", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Attribution captured</div>
          <div style={{ fontSize: 9, color: "#6E6E96" }}>utm_source: linkedin</div>
          <div style={{ fontSize: 9, color: "#6E6E96" }}>utm_campaign: q1-demo</div>
          <div style={{ fontSize: 9, color: "#7B6CF6" }}>li_fat_id: CjwKCA…</div>
        </div>
      </div>
      {/* Right: slot picker */}
      <div style={{ flex: 1, padding: "16px 14px", overflowX: "hidden" }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#1A1A2E", marginBottom: 12 }}>Select a date & time</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 12 }}>
          {["Mon Mar 3", "Tue Mar 4", "Wed Mar 5"].map((d, i) => (
            <div key={d} style={{ textAlign: "center", padding: "5px 0", fontSize: 9, fontWeight: 600, color: i === 1 ? "#7B6CF6" : "#454560", borderBottom: `2px solid ${i === 1 ? "#7B6CF6" : "transparent"}` }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          {[
            ["9:00 AM", "9:00 AM", "9:00 AM"],
            ["9:30 AM", "9:30 AM", "9:30 AM"],
            ["10:00 AM", "10:00 AM", "10:00 AM"],
            ["10:30 AM", "—",       "10:30 AM"],
            ["11:00 AM", "11:00 AM", "—"      ],
            ["2:00 PM",  "2:00 PM",  "2:00 PM" ],
          ].map((row, ri) => row.map((slot, ci) => (
            <div key={`${ri}-${ci}`} style={{
              textAlign: "center", padding: "5px 4px", borderRadius: 6,
              fontSize: 10, fontWeight: 500,
              background: ri === 1 && ci === 1 ? "#7B6CF6" : slot === "—" ? "rgba(200,198,230,0.15)" : "rgba(255,255,255,0.8)",
              color: ri === 1 && ci === 1 ? "#FFF" : slot === "—" ? "#C0BFD8" : "#454560",
              border: `1px solid ${ri === 1 && ci === 1 ? "#7B6CF6" : "rgba(200,198,230,0.4)"}`,
              cursor: slot === "—" ? "default" : "pointer",
            }}>{slot}</div>
          )))}
        </div>
      </div>
    </div>
  );
}

/* ─── Mock: Sales rep calendar ──────────────────────────────── */
function HeroMock() {
  const CELL_H = 28;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hours = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM"];
  const meetings = [
    { day: 0, start: 0, name: "Sarah Chen",  color: "#7B6CF6" },
    { day: 0, start: 2, name: "Tom Vickers", color: "#3DAA7A" },
    { day: 1, start: 1, name: "Priya Rajan", color: "#7B6CF6" },
    { day: 1, start: 4, name: "Amy Zhang",   color: "#5B8DF6" },
    { day: 2, start: 0, name: "Marcus Webb", color: "#3DAA7A" },
    { day: 2, start: 3, name: "Jin Park",    color: "#7B6CF6" },
    { day: 3, start: 1, name: "Kim Scott",   color: "#3DAA7A" },
    { day: 4, start: 2, name: "Lena M.",     color: "#7B6CF6" },
  ];
  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "14px 14px 10px", height: "100%", boxSizing: "border-box" }}>
      {/* Rep header */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#FFF", flexShrink: 0 }}>A</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1A2E" }}>Aiden Hart</span>
        <span style={{ fontSize: 9.5, color: "#9090B8" }}>· Week of Mar 3</span>
        <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, color: "#2D8060", background: "rgba(61,170,122,0.10)", padding: "2px 8px", borderRadius: 999 }}>8 bookings</span>
      </div>
      {/* Grid */}
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ width: 32, flexShrink: 0, paddingTop: 19 }}>
          {hours.map((h) => (
            <div key={h} style={{ height: CELL_H, fontSize: 8, color: "#9090B8", lineHeight: 1 }}>{h}</div>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", gap: 4 }}>
          {days.map((d, di) => (
            <div key={d} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ height: 19, fontSize: 9, fontWeight: 700, color: "#454560", textAlign: "center" }}>{d}</div>
              <div style={{ position: "relative", height: hours.length * CELL_H }}>
                {hours.map((_, hi) => (
                  <div key={hi} style={{ height: CELL_H, borderTop: "1px solid rgba(200,198,230,0.3)", background: hi % 2 === 0 ? "rgba(255,255,255,0.7)" : "rgba(248,248,255,0.5)" }} />
                ))}
                {meetings.filter(m => m.day === di).map((m, mi) => (
                  <div key={mi} style={{
                    position: "absolute", top: m.start * CELL_H + 1, left: 1, right: 1,
                    height: CELL_H - 3, borderRadius: 5,
                    background: `${m.color}1A`, border: `1.5px solid ${m.color}55`,
                    padding: "3px 5px", overflow: "hidden",
                  }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: m.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Comparison row ────────────────────────────────────────── */
function CompareRow({ field, without, with: withVal, highlight = false }: { field: string; without: string; with: string; highlight?: boolean }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0,
      padding: "11px 0", borderBottom: "1px solid rgba(200,198,230,0.25)",
      background: highlight ? "rgba(123,108,246,0.03)" : "transparent",
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#454560", paddingLeft: 16 }}>{field}</span>
      <span style={{ fontSize: 12, color: "#B85555", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14 }}>✕</span> {without}
      </span>
      <span style={{ fontSize: 12, color: "#2D8060", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14 }}>✓</span> {withVal}
      </span>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const authErrorCode = resolvedSearchParams.error_code;
  const authError = resolvedSearchParams.error;
  const normalizedErrorCode = Array.isArray(authErrorCode) ? authErrorCode[0] : authErrorCode;
  const normalizedError = Array.isArray(authError) ? authError[0] : authError;

  if (normalizedErrorCode || normalizedError) {
    const loginUrl = new URL("/login", "https://citacal.com");
    if (normalizedErrorCode === "bad_oauth_state") {
      loginUrl.searchParams.set("auth_error", "session_expired");
    } else {
      loginUrl.searchParams.set(
        "auth_error",
        normalizedErrorCode || normalizedError || "oauth_failed"
      );
    }
    redirect(`${loginUrl.pathname}${loginUrl.search}`);
  }

  let isLoggedIn = false;
  try {
    const { userId } = await auth();
    isLoggedIn = !!userId;
  } catch {
    // auth may not be available in some environments — graceful fallback
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--bg-gradient)", minHeight: "100vh", color: "#1A1A2E" }}>
      <LandingNav isLoggedIn={isLoggedIn} />

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1140, margin: "0 auto", padding: "80px 24px 60px" }}>
        <div className="landing-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          {/* Left — same copy */}
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 999,
                background: "rgba(123,108,246,0.08)", border: "1px solid rgba(123,108,246,0.22)",
                fontSize: 11, fontWeight: 600, color: "#7B6CF6",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7B6CF6", display: "inline-block" }} />
                Marketing &amp; sales team friendly scheduling tool
              </div>
            </div>

            <h1 className="landing-h1" style={{
              fontSize: 48, fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px",
              color: "#1A1A2E", letterSpacing: "-0.02em",
            }}>
              Every booking.<br />
              <span style={{ background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Every dollar.
              </span>
              <br />Tracked.
            </h1>

            <p style={{ fontSize: 16, color: "#454560", lineHeight: 1.6, margin: "0 0 32px", maxWidth: 440 }}>
              Scheduling tool built for marketing and sales teams. Know how your meetings are performing and where your leads are coming from with robust tracking.
            </p>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Link href="/signup" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: "linear-gradient(135deg, #7B6CF6, #9B8EF8)",
                color: "#FFF", textDecoration: "none",
                boxShadow: "0 4px 16px rgba(123,108,246,0.30)",
              }}>
                Start free — it&apos;s fully free
              </Link>
              <a href="#how-it-works" style={{ fontSize: 14, color: "#6E6E96", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                See how it works ↓
              </a>
            </div>

            {/* Stat strip */}
            <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999,
                background: "rgba(61,170,122,0.08)", border: "1px solid rgba(61,170,122,0.25)",
                fontSize: 12, fontWeight: 600, color: "#2D8060",
              }}>
                ✦ Fully free — no credit card
              </div>
            </div>
          </div>

          {/* Right: Variant B mock — freely floating layout */}
          <div className="landing-hero-mock" style={{ position: "relative", height: 528 }}>

            {/* ── 4 stat cards across the top, staggered, overlapping browser header ── */}
            {[
              { label: "Total Bookings", value: "1,842",    sub: "↑ 12% this month", subColor: "#2D8060", valColor: "#1A1A2E", pos: { left: "0%" }   },
              { label: "Attribution",    value: "94%",      sub: "sources tracked",  subColor: "#9090B8", valColor: "#7B6CF6", pos: { left: "26%" }  },
              { label: "Top Source",     value: "LinkedIn", sub: "847 bookings",     subColor: "#9090B8", valColor: "#1A1A2E", pos: { right: "26%" } },
              { label: "Cancellation",   value: "3.2%",     sub: "last 30 days",     subColor: "#9090B8", valColor: "#1A1A2E", pos: { right: "0%" }  },
            ].map((c, i) => (
              <div key={c.label} style={{
                position: "absolute", top: i % 2 === 0 ? 6 : 0, ...c.pos,
                width: "22%", minWidth: 106,
                background: "#FFF", borderRadius: 10,
                boxShadow: "0 6px 20px rgba(60,50,120,0.12)",
                border: "1px solid rgba(200,198,230,0.5)",
                padding: "10px 12px", zIndex: 2,
              }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: "#9090B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: c.value.length > 4 ? 15 : 21, fontWeight: 800, color: c.valColor, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 8.5, color: c.subColor, marginTop: 5 }}>{c.sub}</div>
              </div>
            ))}

            {/* ── Browser frame (calendar only) ── */}
            {/* top: 64, toolbar ~38px, content 232px → total 270 → bottom at 334 */}
            <div style={{ position: "absolute", top: 64, left: 4, right: 4, zIndex: 1 }}>
              <BrowserChrome height={232} url="citacal.com/app">
                <HeroMock />
              </BrowserChrome>
            </div>

            {/* ── JSON payload card — straddles browser bottom (~50/50) ── */}
            {/* Browser bottom ≈ 64+270=334. Card top: 294 → 40px inside, 40px outside ✓ */}
            <div style={{
              position: "absolute", top: 294, left: "50%", transform: "translateX(-50%)",
              width: 174, zIndex: 3,
              background: "#1A1A2E", borderRadius: 12,
              boxShadow: "0 10px 32px rgba(26,26,46,0.32)",
              padding: "10px 14px",
              fontSize: 9, fontFamily: "monospace", color: "#C8C8E8", lineHeight: 1.8,
            }}>
              <div style={{ fontSize: 7.5, fontWeight: 700, color: "#5858A0", marginBottom: 7, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>webhook / data layer</div>
              <div><span style={{ color: "#A89AF9" }}>&quot;utm_source&quot;</span>: <span style={{ color: "#A8EBC8" }}>&quot;linkedin&quot;</span>,</div>
              <div><span style={{ color: "#A89AF9" }}>&quot;li_fat_id&quot;</span>: <span style={{ color: "#A8EBC8" }}>&quot;CjwK…&quot;</span>,</div>
              <div><span style={{ color: "#A89AF9" }}>&quot;booking&quot;</span>: <span style={{ color: "#C8C8E8" }}>{"{ … }"}</span></div>
            </div>

            {/* ── SVG dotted lines: JSON card bottom → each badge ── */}
            {/* JSON card bottom ≈ 294 + 10+8+7+3×16+10 = 294+83 = 377 */}
            {/* SVG sits at top:377, height:62. Lines: trunk (250,0)→(250,20), bar(44,20)→(456,20), drops→(x,50) */}
            <svg style={{ position: "absolute", top: 377, left: 0, overflow: "visible", pointerEvents: "none" }}
              width="100%" height="62" viewBox="0 0 500 62" preserveAspectRatio="none">
              <line x1="250" y1="0"  x2="250" y2="20" stroke="rgba(123,108,246,0.4)" strokeWidth="1.5" strokeDasharray="3 4"/>
              <line x1="44"  y1="20" x2="456" y2="20" stroke="rgba(123,108,246,0.4)" strokeWidth="1.5" strokeDasharray="3 4"/>
              {[44, 130, 216, 284, 370, 456].map((x) => (
                <line key={x} x1={x} y1="20" x2={x} y2="50" stroke="rgba(123,108,246,0.4)" strokeWidth="1.5" strokeDasharray="3 4"/>
              ))}
            </svg>

            {/* ── Destination badges with service logos ── */}
            {/* Badge tops: 377+50=427. Centers at SVG x values mapped to %: 44/500=8.8%, 130=26%, 216=43.2%, 284=56.8%, 370=74%, 456=91.2% */}
            {[
              { name: "Tag Manager", bg: "#1A73E8", pct: "8.8%",  slug: "googletagmanager" },
              { name: "GA4",         bg: "#E37400", pct: "26%",   slug: "googleanalytics" },
              { name: "Google Ads",  bg: "#4285F4", pct: "43.2%", slug: "googleads" },
              { name: "Meta Ads",    bg: "#0866FF", pct: "56.8%", slug: "meta" },
              { name: "Zapier",      bg: "#FF4A00", pct: "74%",   slug: "zapier" },
              { name: "Sheets",      bg: "#34A853", pct: "91.2%", slug: "googlesheets" },
            ].map((d) => (
              <div key={d.name} style={{
                position: "absolute", top: 427,
                left: `calc(${d.pct} - 24px)`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: d.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://cdn.simpleicons.org/${d.slug}/ffffff`} width="22" height="22" alt={d.name} />
                </div>
                <div style={{ fontSize: 7.5, fontWeight: 600, color: "#6E6E96", textAlign: "center", whiteSpace: "nowrap" }}>{d.name}</div>
              </div>
            ))}

            {/* ── "& everywhere" label beneath badges ── */}
            <div style={{
              position: "absolute", top: 492, left: 0, right: 0,
              textAlign: "center", fontSize: 11, color: "#9090B8",
              fontStyle: "italic", fontWeight: 500,
            }}>
              &amp; everywhere
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROBLEM / COMPARE ═════════════════════════════════ */}
      <section style={{ maxWidth: 1140, margin: "72px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            You know your ad spend.<br />Do you know what it&apos;s booking?
          </h2>
          <p style={{ fontSize: 15, color: "#6E6E96", maxWidth: 520, margin: "0 auto" }}>
            Most scheduling tools drop your tracking data the moment someone books. CitaCal keeps it intact — so you can connect your ad spend to actual meetings.
          </p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.80)", borderRadius: 16,
          border: "1px solid rgba(200,198,230,0.5)",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(60,50,120,0.07)",
        }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#F4F3FF", padding: "12px 0", borderBottom: "1px solid rgba(200,198,230,0.35)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9090B8", paddingLeft: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Feature</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#B85555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Standard calendars</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2D8060", textTransform: "uppercase", letterSpacing: "0.08em" }}>CitaCal</span>
          </div>
          <CompareRow field="UTM tracking" without="Lost at booking" with="Captured on every booking" highlight />
          <CompareRow field="GA tracking preserved" without="Cookie breaks in iframe" with="GA cookie stays intact" />
          <CompareRow field="Send data anywhere" without="Zapier workarounds only" with="Native webhooks + Google Sheets" highlight />
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section id="how-it-works" style={{ maxWidth: 1140, margin: "96px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Works like any scheduling tool.<br />Tracks like nothing else.
          </h2>
          <p style={{ fontSize: 15, color: "#6E6E96", maxWidth: 520, margin: "0 auto" }}>
            Set up once, share your link, and every booking automatically comes with full attribution data.
          </p>
        </div>

        <div className="landing-how-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          {[
            {
              step: "01",
              title: "Use it as your scheduling tool",
              body: "Share your CitaCal link exactly like you'd share a Calendly link. Visitors pick a time — you get a booking in your calendar.",
              icon: "📅",
              detail: "Share your link → they pick a time\nYou get a calendar event\nThey get a confirmation email",
              color: "rgba(123,108,246,0.07)",
              border: "rgba(123,108,246,0.20)",
            },
            {
              step: "02",
              title: "Fit CitaCal into your tracking setup",
              body: "CitaCal captures UTMs, click IDs, and GA cookies at the moment of booking — no Zapier, no iframes, no tracking blind spots.",
              icon: "🎯",
              detail: "utm_source=linkedin\nutm_campaign=q1-demo\nli_fat_id=CjwKCAj…",
              color: "rgba(94,198,160,0.07)",
              border: "rgba(94,198,160,0.25)",
            },
            {
              step: "03",
              title: "See analytics. Send data anywhere.",
              body: "View attribution data in your dashboard, export CSV, or fire a webhook to your CRM, Slack, or Google Sheets on every booking.",
              icon: "⚡",
              detail: '{ "utm_source": "linkedin",\n  "campaign": "q1-demo",\n  "booking": { … } }',
              color: "rgba(91,141,246,0.07)",
              border: "rgba(91,141,246,0.22)",
            },
          ].map((s) => (
            <div key={s.step} style={{
              padding: "28px 24px", borderRadius: 14,
              background: s.color, border: `1px solid ${s.border}`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9090B8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Step {s.step}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginBottom: 10 }}>{s.title}</div>
              <p style={{ fontSize: 13, color: "#454560", lineHeight: 1.6, margin: "0 0 16px" }}>{s.body}</p>
              <pre style={{
                background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "10px 12px",
                fontSize: 10, color: "#6E6E96", margin: 0, fontFamily: "monospace",
                lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>{s.detail}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════ */}
      <section id="features" style={{ maxWidth: 1140, margin: "96px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Everything you need to schedule and track
          </h2>
        </div>

        {/* Feature: Booking Flow */}
        <div className="landing-feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", marginBottom: 80 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7B6CF6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Booking experience</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              A scheduling experience<br />your leads will actually use.
            </h3>
            <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.7, margin: "0 0 24px" }}>
              Clean, fast booking pages that pull real availability from Google Calendar or Outlook. Visitors pick a time in their timezone — no friction, no back-and-forth.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Timezone-aware slot picker (600+ IANA zones)", "Real availability from Google Calendar & Outlook", "Confirmation emails sent automatically", "Attendees can check their own calendar for conflicts"].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#454560" }}>
                  <span style={{ color: "#3DAA7A", marginTop: 1 }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="landing-feature-mock">
            <BrowserChrome height={340}>
              <BookingMock />
            </BrowserChrome>
          </div>
        </div>

        {/* Feature: Analytics */}
        <div className="landing-feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", marginBottom: 80 }}>
          <div className="landing-feature-mock">
          <BrowserChrome height={320}>
            {/* Analytics table mock */}
            <div style={{ fontFamily: "var(--font-sans)", padding: "14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", marginBottom: 12 }}>Booking Analytics</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Source", val: "linkedin", color: "rgba(123,108,246,0.10)", textColor: "#7B6CF6" },
                  { label: "Campaign", val: "q1-demo", color: "rgba(61,170,122,0.10)", textColor: "#2D8060" },
                  { label: "Status", val: "all", color: "rgba(110,110,150,0.10)", textColor: "#6E6E96" },
                ].map((f) => (
                  <div key={f.label} style={{ padding: "5px 10px", borderRadius: 7, background: f.color, fontSize: 11, color: f.textColor, fontWeight: 600 }}>
                    {f.label}: {f.val}
                  </div>
                ))}
                <div style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 7, background: "rgba(123,108,246,0.08)", fontSize: 11, color: "#7B6CF6", fontWeight: 600, cursor: "pointer" }}>
                  Export CSV ↓
                </div>
              </div>
              {/* Source bars */}
              {[
                { source: "linkedin", pct: 82, count: 847 },
                { source: "google", pct: 56, count: 582 },
                { source: "twitter", pct: 18, count: 190 },
                { source: "(direct)", pct: 11, count: 113 },
                { source: "email", pct: 8, count: 84 },
              ].map((s) => (
                <div key={s.source} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ width: 64, fontSize: 10, color: "#454560", textAlign: "right" }}>{s.source}</span>
                  <div style={{ flex: 1, height: 20, borderRadius: 5, background: "rgba(200,198,230,0.25)", overflow: "hidden" }}>
                    <div style={{ width: `${s.pct}%`, height: "100%", background: "linear-gradient(90deg, #7B6CF6, #A89AF9)", borderRadius: 5 }} />
                  </div>
                  <span style={{ width: 30, fontSize: 10, color: "#6E6E96" }}>{s.count}</span>
                </div>
              ))}
            </div>
          </BrowserChrome>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7B6CF6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Attribution analytics</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              See exactly which campaigns<br />are driving meetings.
            </h3>
            <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.7, margin: "0 0 24px" }}>
              Every booking comes tagged with the source, campaign, and click ID that drove it. Filter, export, or pipe it into your BI tool — the data is yours.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {["UTM source, medium, campaign on every booking row", "Filter by source, campaign, status, or date range", "See attribution coverage at a glance", "CSV export with all fields for BI tools"].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#454560" }}>
                  <span style={{ color: "#3DAA7A", marginTop: 1 }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature: Team Scheduling */}
        <div className="landing-feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", marginBottom: 80 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#3DAA7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Team scheduling</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Route leads to the right rep,<br />automatically.
            </h3>
            <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.7, margin: "0 0 24px" }}>
              Assign a scheduling page to your whole sales team. CitaCal checks each rep&apos;s live calendar and distributes bookings evenly — no spreadsheets, no manual assignment.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Checks each rep's real-time calendar availability", "Round-robin distribution — no double-bookings", "Each rep connects their own Google Calendar or Outlook", "Collective mode: show slots when everyone is free"].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#454560" }}>
                  <span style={{ color: "#3DAA7A", marginTop: 1 }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Team routing mock */}
          <div className="landing-feature-mock" style={{
            background: "rgba(255,255,255,0.80)", borderRadius: 16,
            border: "1px solid rgba(200,198,230,0.5)",
            padding: 24, boxShadow: "0 4px 24px rgba(60,50,120,0.07)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A2E", marginBottom: 16 }}>Round-robin assignment</div>
            {[
              { name: "Aiden Hart",   tag: "Assigned ← this booking", available: true,  last: "2h ago",  active: true },
              { name: "Priya Rajan",  tag: "Available",               available: true,  last: "4h ago",  active: false },
              { name: "Marcus Webb",  tag: "Busy 10–11 AM",           available: false, last: "6h ago",  active: false },
              { name: "Sarah Chen",   tag: "Available",               available: true,  last: "8h ago",  active: false },
            ].map((m) => (
              <div key={m.name} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                borderRadius: 10, marginBottom: 8,
                background: m.active ? "rgba(123,108,246,0.07)" : "transparent",
                border: `1px solid ${m.active ? "rgba(123,108,246,0.25)" : "rgba(200,198,230,0.25)"}`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: m.active ? "linear-gradient(135deg, #7B6CF6, #A89AF9)" : "rgba(200,198,230,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: m.active ? "#FFF" : "#9090B8",
                }}>
                  {m.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A2E" }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: m.active ? "#7B6CF6" : m.available ? "#2D8060" : "#B85555" }}>{m.tag}</div>
                </div>
                <div style={{ fontSize: 10, color: "#9090B8" }}>last: {m.last}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature: Webhooks */}
        <div className="landing-feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          {/* Webhook payload mock */}
          <div className="landing-feature-mock" style={{
            background: "#1A1A2E", borderRadius: 14, padding: 24,
            boxShadow: "0 8px 32px rgba(26,26,46,0.25)",
          }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBCBC" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFD980" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#A8EBC8" }} />
              <span style={{ fontSize: 10, color: "#6060A0", marginLeft: 6 }}>POST booking.confirmed → your webhook</span>
            </div>
            <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.75, fontFamily: "monospace", color: "#C8C8E8", whiteSpace: "pre-wrap" }}>{`{
  "event": "booking.confirmed",
  "booking": {
    "name": "Sarah Chen",
    "email": "sarah@acme.co",
    "date": "2026-03-04",
    "time": "10:00 AM"
  },
  "utm": {
    "source": "linkedin",
    "campaign": "q1-demo",
    "medium": "paid"
  },
  "click_ids": {
    "li_fat_id": "CjwKCAj…",
    "gclid": null,
    "fbclid": null
  }
}`}</pre>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5B8DF6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Webhooks & integrations</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Send booking data<br />wherever you need it.
            </h3>
            <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.7, margin: "0 0 24px" }}>
              Every confirmed booking fires a webhook with the full booking + attribution payload. Connect your CRM, Slack, or data warehouse — no Zapier required.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Signed server-side webhooks on every booking", "Full UTM + click ID data in every payload", "Google Sheets sync built-in", "Connect to HubSpot, Salesforce, Slack — anything with an API"].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#454560" }}>
                  <span style={{ color: "#3DAA7A", marginTop: 1 }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════ */}
      <section className="landing-cta" style={{
        margin: "96px 24px 0", borderRadius: 24,
        background: "linear-gradient(135deg, #7B6CF6 0%, #9B8EF8 60%, #BDB4FC 100%)",
        padding: "72px 48px", textAlign: "center",
        boxShadow: "0 16px 48px rgba(123,108,246,0.25)",
      }}>
        <h2 className="landing-cta-title" style={{ fontSize: 38, fontWeight: 800, color: "#FFF", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
          Your best demos are already out there.<br />Start tracking where they come from.
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.82)", margin: "0 0 36px" }}>
          <span style={{ fontWeight: 600 }}>CitaCal is completely free — no plans, no trials, no credit card.</span>
        </p>
        <Link href="/signup" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700,
          background: "#FFF", color: "#7B6CF6", textDecoration: "none",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        }}>
          Get started — it&apos;s free →
        </Link>
        <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
          Fully free · No credit card · Connect Google Calendar in one click
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer className="landing-footer" style={{
        maxWidth: 1140, margin: "0 auto", padding: "48px 24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid rgba(200,198,230,0.35)", marginTop: 72,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="-2 0 20 20" fill="none">
              <path d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 13, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em", lineHeight: 1 }}>
              <span style={{ fontWeight: 400, color: "#1A1A2E" }}>Cita</span><span style={{ fontWeight: 800, color: "#7B6CF6" }}>Cal</span>
            </span>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#7B6CF6", background: "rgba(123,108,246,0.12)", border: "1px solid rgba(123,108,246,0.25)", borderRadius: 3, padding: "2px 4px", letterSpacing: "0.05em", lineHeight: 1 }}>BETA</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#9090B8" }}>
          <Link href="/docs" style={{ color: "#9090B8", textDecoration: "none" }}>Documentation</Link>
          <Link href="/terms" style={{ color: "#9090B8", textDecoration: "none" }}>Terms</Link>
          <Link href="/privacy" style={{ color: "#9090B8", textDecoration: "none" }}>Privacy</Link>
          <Link href="/login" style={{ color: "#9090B8", textDecoration: "none" }}>Sign in</Link>
          <Link href="/signup" style={{ color: "#9090B8", textDecoration: "none" }}>Sign up</Link>
        </div>
        <div style={{ fontSize: 12, color: "#B4B4CC" }}>© 2026 CitaCal</div>
      </footer>
    </div>
  );
}
