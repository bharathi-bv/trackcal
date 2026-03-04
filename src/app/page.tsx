import Link from "next/link";
import { createAuthServerClient } from "@/lib/supabase-server";

/* ─── Reusable sub-components ─────────────────────────────── */

function BrowserChrome({ children, height = 340 }: { children: React.ReactNode; height?: number }) {
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
          <span style={{ fontSize: 10, color: "#9090B8", fontFamily: "var(--font-sans)" }}>app.citacal.com</span>
        </div>
      </div>
      <div style={{ height, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

function Pill({ children, color = "primary" }: { children: React.ReactNode; color?: "primary" | "success" | "warning" | "danger" | "neutral" }) {
  const colors: Record<string, { bg: string; text: string }> = {
    primary: { bg: "rgba(123,108,246,0.10)", text: "#7B6CF6" },
    success: { bg: "rgba(61,170,122,0.12)", text: "#2D8060" },
    warning: { bg: "rgba(224,112,112,0.12)", text: "#B85555" },
    danger:  { bg: "rgba(220,60,60,0.12)", text: "#C02020" },
    neutral: { bg: "rgba(110,110,150,0.10)", text: "#6E6E96" },
  };
  const c = colors[color];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.text,
      fontFamily: "var(--font-sans)",
    }}>
      {children}
    </span>
  );
}

/* ─── Mock: Analytics dashboard ────────────────────────────── */
function AnalyticsMock() {
  const rows = [
    { name: "Sarah Chen",    email: "sarah@acme.co",    source: "linkedin",  campaign: "q1-demo-b",   clickId: "li:CjwK…",     status: "confirmed" },
    { name: "Marcus Webb",   email: "mwebb@stripe.io",  source: "google",    campaign: "q1-demo-a",   clickId: "gclid:EAIa…",  status: "confirmed" },
    { name: "Priya Rajan",   email: "priya@notion.so",  source: "linkedin",  campaign: "q1-brand",    clickId: "li:EAIb…",     status: "pending" },
    { name: "Tom Vickers",   email: "tvick@linear.app", source: "google",    campaign: "q1-demo-a",   clickId: "gclid:EAIc…",  status: "confirmed" },
    { name: "Amy Zhang",     email: "amy@figma.com",    source: "twitter",   campaign: "retarget-mar", clickId: "—",            status: "confirmed" },
  ];
  return (
    <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, padding: "14px 0" }}>
      {/* KPI row */}
      <div style={{ display: "flex", gap: 8, padding: "0 14px 12px", borderBottom: "1px solid rgba(200,198,230,0.35)" }}>
        {[
          { label: "Total Bookings", value: "1,842", color: undefined },
          { label: "This Week", value: "47", color: undefined },
          { label: "Top Source", value: "LinkedIn", color: undefined },
          { label: "Attribution Coverage", value: "94%", color: "rgba(61,170,122,0.08)" },
          { label: "Click ID Capture", value: "81%", color: "rgba(123,108,246,0.08)" },
        ].map((k) => (
          <div key={k.label} style={{
            flex: 1, padding: "8px 10px", borderRadius: 8,
            border: "1px solid rgba(200,198,230,0.5)",
            background: k.color ?? "#FFFFFF",
          }}>
            <div style={{ color: "#9090B8", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{k.label}</div>
            <div style={{ color: "#1A1A2E", fontSize: 16, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>
      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "130px 140px 70px 100px 80px 70px", gap: 0, padding: "6px 14px", borderBottom: "1px solid rgba(200,198,230,0.35)", color: "#9090B8", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        <span>NAME</span><span>EMAIL</span><span>SOURCE</span><span>CAMPAIGN</span><span>CLICK ID</span><span>STATUS</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 140px 70px 100px 80px 70px", gap: 0, padding: "7px 14px", borderBottom: "1px solid rgba(200,198,230,0.18)", background: i % 2 === 0 ? "transparent" : "rgba(248,248,255,0.5)", alignItems: "center" }}>
          <span style={{ fontWeight: 600, color: "#1A1A2E", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
          <span style={{ color: "#6E6E96", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</span>
          <span>
            <Pill color={r.source === "linkedin" ? "primary" : r.source === "google" ? "success" : "neutral"}>
              {r.source}
            </Pill>
          </span>
          <span style={{ color: "#454560", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.campaign}</span>
          <span style={{ color: "#7B6CF6", fontSize: 10, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.clickId}</span>
          <span><Pill color={r.status === "confirmed" ? "success" : "warning"}>{r.status}</Pill></span>
        </div>
      ))}
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

/* ─── Comparison row ────────────────────────────────────────── */
function CompareRow({ field, without, with: withVal, highlight = false }: { field: string; without: string; with: string; highlight?: boolean }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 0,
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

/* ─── Nav ───────────────────────────────────────────────────── */
function LandingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(248,248,255,0.82)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(200,198,230,0.35)",
      padding: "0 24px",
      display: "flex", alignItems: "center", gap: 32, height: 56,
    }}>
      {/* Logo */}
      <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E", fontFamily: "var(--font-sans)" }}>CitaCal</span>
      </a>

      <div className="landing-nav-links" style={{ display: "flex", alignItems: "center", gap: 28, flex: 1 }}>
        <a href="#features" style={{ fontSize: 13, color: "#454560", textDecoration: "none", fontFamily: "var(--font-sans)" }}>Features</a>
        <a href="#how-it-works" style={{ fontSize: 13, color: "#454560", textDecoration: "none", fontFamily: "var(--font-sans)" }}>How it works</a>
        <a href="/docs" style={{ fontSize: 13, color: "#454560", textDecoration: "none", fontFamily: "var(--font-sans)" }}>Docs</a>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isLoggedIn ? (
          <Link href="/app/dashboard" style={{
            fontSize: 13, fontWeight: 600, color: "#FFF", textDecoration: "none",
            padding: "7px 16px", borderRadius: 8,
            background: "linear-gradient(135deg, #7B6CF6, #9B8EF8)",
            boxShadow: "0 2px 8px rgba(123,108,246,0.30)",
            fontFamily: "var(--font-sans)",
          }}>Go to Dashboard →</Link>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 13, color: "#454560", textDecoration: "none", padding: "7px 14px", fontFamily: "var(--font-sans)" }}>Sign in</Link>
            <Link href="/signup" style={{
              fontSize: 13, fontWeight: 600, color: "#FFF", textDecoration: "none",
              padding: "7px 16px", borderRadius: 8,
              background: "linear-gradient(135deg, #7B6CF6, #9B8EF8)",
              boxShadow: "0 2px 8px rgba(123,108,246,0.30)",
              fontFamily: "var(--font-sans)",
            }}>Start free →</Link>
          </>
        )}
      </div>
    </nav>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default async function LandingPage() {
  let isLoggedIn = false;
  try {
    const supabase = await createAuthServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    isLoggedIn = !!session;
  } catch {
    // supabase env vars may not be set in some environments — graceful fallback
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--bg-gradient)", minHeight: "100vh", color: "#1A1A2E" }}>
      <LandingNav isLoggedIn={isLoggedIn} />

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1140, margin: "0 auto", padding: "80px 24px 40px" }}>
        <div className="landing-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          {/* Left */}
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 999,
                background: "rgba(123,108,246,0.08)", border: "1px solid rgba(123,108,246,0.22)",
                fontSize: 11, fontWeight: 600, color: "#7B6CF6",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7B6CF6", display: "inline-block" }} />
                Built for growth teams running paid ads
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 999,
                background: "rgba(61,170,122,0.08)", border: "1px solid rgba(61,170,122,0.25)",
                fontSize: 11, fontWeight: 600, color: "#2D8060",
              }}>
                ✦ Free forever — no credit card
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
              Calendly drops your UTMs and click IDs in iframes. CitaCal captures all 10 attribution signals — UTMs, gclid, li_fat_id, fbclid — and fires them to your CRM the moment a demo is confirmed.
            </p>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Link href="/signup" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: "linear-gradient(135deg, #7B6CF6, #9B8EF8)",
                color: "#FFF", textDecoration: "none",
                boxShadow: "0 4px 16px rgba(123,108,246,0.30)",
              }}>
                Start free — always free
              </Link>
              <a href="#how-it-works" style={{ fontSize: 14, color: "#6E6E96", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                See how it works ↓
              </a>
            </div>

            {/* Stat strip */}
            <div style={{ display: "flex", gap: 28, marginTop: 40 }}>
              {[
                { val: "10", label: "attribution params" },
                { val: "5", label: "ad platforms" },
                { val: "0", label: "lost click IDs" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#7B6CF6" }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "#6E6E96" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Analytics mock */}
          <div className="landing-hero-mock">
            <BrowserChrome height={300}>
              <AnalyticsMock />
            </BrowserChrome>
          </div>
        </div>
      </section>

      {/* ══ PROBLEM / COMPARE ═════════════════════════════════ */}
      <section style={{ maxWidth: 1140, margin: "72px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            The $10,000 attribution gap
          </h2>
          <p style={{ fontSize: 15, color: "#6E6E96", maxWidth: 520, margin: "0 auto" }}>
            You spend $50k/mo on ads. Your calendar tool silently drops attribution on the most important click — the booking. Here's the difference.
          </p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.80)", borderRadius: 16,
          border: "1px solid rgba(200,198,230,0.5)",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(60,50,120,0.07)",
        }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", background: "#F4F3FF", padding: "12px 0", borderBottom: "1px solid rgba(200,198,230,0.35)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9090B8", paddingLeft: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Signal</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#B85555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Standard calendars</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2D8060", textTransform: "uppercase", letterSpacing: "0.08em" }}>CitaCal</span>
          </div>
          <CompareRow field="utm_source" without="Lost in iframe" with="Captured & stored" highlight />
          <CompareRow field="utm_campaign" without="Lost in iframe" with="Captured & stored" />
          <CompareRow field="gclid (Google Ads)" without="Never captured" with="Captured & stored" highlight />
          <CompareRow field="li_fat_id (LinkedIn)" without="Never captured" with="Captured & stored" />
          <CompareRow field="fbclid (Meta)" without="Never captured" with="Captured & stored" highlight />
          <CompareRow field="CRM webhook" without="Manual Zapier setup" with="Native, server-side" />
          <CompareRow field="Round-robin routing" without="Not available" with="Built-in" highlight />
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section id="how-it-works" style={{ maxWidth: 1140, margin: "96px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Attribution that actually survives
          </h2>
          <p style={{ fontSize: 15, color: "#6E6E96", maxWidth: 520, margin: "0 auto" }}>
            From the first ad click to the CRM entry — every signal preserved.
          </p>
        </div>

        <div className="landing-how-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          {[
            {
              step: "01",
              title: "Visitor clicks your ad",
              body: "UTMs and click IDs land in the URL. CitaCal captures all 10 signals immediately — before the booking page even loads.",
              icon: "🎯",
              detail: "utm_source=linkedin\nutm_campaign=q1-demo\nli_fat_id=CjwKCAj…",
              color: "rgba(123,108,246,0.07)",
              border: "rgba(123,108,246,0.20)",
            },
            {
              step: "02",
              title: "They pick a time",
              body: "Your booking page shows real availability from Google Calendar or Outlook. Round-robin assigns the right team member.",
              icon: "📅",
              detail: "Real-time availability\nTeam round-robin\nConflict detection",
              color: "rgba(94,198,160,0.07)",
              border: "rgba(94,198,160,0.25)",
            },
            {
              step: "03",
              title: "Attribution fires instantly",
              body: "On confirmation, CitaCal fires a server-side webhook with full booking + attribution context — to your CRM, Slack, or anywhere.",
              icon: "⚡",
              detail: '{ "utm_source": "linkedin",\n  "gclid": "EAIa…",\n  "booking": { … } }',
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
            Built for growth teams
          </h2>
        </div>

        {/* Feature: Booking Flow */}
        <div className="landing-feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", marginBottom: 80 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7B6CF6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Booking experience</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Clean scheduling.<br />Zero attribution loss.
            </h3>
            <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.7, margin: "0 0 24px" }}>
              Your booking page shows real-time availability pulled from Google Calendar or Outlook. Visitors pick a time in their timezone — all attribution signals ride along silently in the background.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Timezone-aware slot picker (600+ IANA zones)", "Real availability from Google Calendar & Outlook", "Rate limiting + disposable email blocking", "Attendees can check their own calendar for conflicts"].map((item) => (
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
              Know which campaigns<br />drive booked demos.
            </h3>
            <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.7, margin: "0 0 24px" }}>
              Filter bookings by source, campaign, or click ID type. See attribution coverage rates so you can spot gaps. Export every row with full UTM context for your data warehouse.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {["5 UTM params + 5 click IDs on every booking row", "Filter by source, campaign, status, date range, or free text", "Attribution coverage % and Click ID capture rate KPIs", "CSV export with all fields for BI tools"].map((item) => (
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
              Round-robin routing<br />with real availability.
            </h3>
            <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.7, margin: "0 0 24px" }}>
              Assign any scheduling page to a team of AEs or SDRs. CitaCal routes each new booking to the least-recently-booked available rep — no double-bookings, no Zapier hacks.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Checks each rep's calendar in real time", "Routes to least-recently-booked available rep", "Race condition guard via database unique index", "Each rep connects their own Google Calendar or Outlook"].map((item) => (
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
              Fire to your CRM<br />the moment it&apos;s booked.
            </h3>
            <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.7, margin: "0 0 24px" }}>
              Configure webhook URLs in Settings. CitaCal fires a signed POST to your endpoint instantly on booking confirmation — with full attribution context, no Zapier required.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Server-side webhooks (no client-side drops)", "HMAC signature for security", "Full UTM + click ID context in every payload", "Connect to HubSpot, Salesforce, Slack — anything"].map((item) => (
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
          Stop losing attribution<br />at the booking step.
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.82)", margin: "0 0 36px" }}>
          Set up in 10 minutes. Connect your calendar. Start capturing every click ID.<br />
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
          Free forever · No credit card · Connect Google Calendar in one click
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer className="landing-footer" style={{
        maxWidth: 1140, margin: "0 auto", padding: "48px 24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid rgba(200,198,230,0.35)", marginTop: 72,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>CitaCal</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#9090B8" }}>
          <a href="/docs" style={{ color: "#9090B8", textDecoration: "none" }}>Documentation</a>
          <a href="/login" style={{ color: "#9090B8", textDecoration: "none" }}>Sign in</a>
          <a href="/signup" style={{ color: "#9090B8", textDecoration: "none" }}>Sign up</a>
        </div>
        <div style={{ fontSize: 12, color: "#B4B4CC" }}>© 2026 CitaCal</div>
      </footer>
    </div>
  );
}
