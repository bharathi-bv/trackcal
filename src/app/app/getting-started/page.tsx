import { createServerClient } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Icons ──────────────────────────────────────────────────────────────────

function CheckIcon({ done }: { done: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r="8.5" fill={done ? "#22c55e" : "transparent"} stroke={done ? "#22c55e" : "#d4d4d4"} />
      {done && <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 6.5l4-2v7l-4-2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 9.5a4 4 0 0 0 5.657 0l1.414-1.414a4 4 0 0 0-5.657-5.657L6.5 3.843" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.5 6.5a4 4 0 0 0-5.657 0L2.43 7.914a4 4 0 0 0 5.657 5.657l1.414-1.414" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function CssIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 2h12l-1.5 10L8 14l-4.5-2L2 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5 6h6M5.5 9.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function GettingStartedPage() {
  const db = createServerClient();

  const [{ data: calAccounts }, { data: settings }, { data: schedules }] =
    await Promise.all([
      db.from("calendar_accounts").select("provider, email"),
      db.from("host_settings")
        .select("google_refresh_token, microsoft_refresh_token, zoom_access_token, booking_base_url")
        .maybeSingle(),
      db.from("availability_schedules").select("id").limit(1),
    ]);

  const accounts = (calAccounts ?? []) as Array<{ provider: string; email: string | null }>;
  if (settings?.google_refresh_token && !accounts.find(a => a.provider === "google"))
    accounts.push({ provider: "google", email: null });
  if (settings?.microsoft_refresh_token && !accounts.find(a => a.provider === "microsoft"))
    accounts.push({ provider: "microsoft", email: null });

  const calendarConnected = accounts.length > 0;
  const calendarLabel = accounts.map(a => a.email ?? a.provider).join(", ");

  const steps = [
    {
      id: "calendar",
      icon: <CalendarIcon />,
      title: "Connect your calendar",
      description: calendarConnected
        ? `Connected: ${calendarLabel}`
        : "Sync Google or Outlook to check real availability.",
      done: calendarConnected,
      href: "/app/availability",
      cta: calendarConnected ? "Add another" : "Connect",
    },
    {
      id: "availability",
      icon: <ClockIcon />,
      title: "Set your availability",
      description: "A default schedule is ready — customise your hours anytime.",
      done: (schedules ?? []).length > 0,
      href: "/app/availability",
      cta: "Adjust",
    },
    {
      id: "zoom",
      icon: <VideoIcon />,
      title: "Connect Zoom",
      description: "Auto-generate Zoom links for every booking.",
      done: !!(settings?.zoom_access_token),
      href: "/app/dashboard/integrations",
      cta: "Connect",
    },
    {
      id: "domain",
      icon: <LinkIcon />,
      title: "Custom domain & booking link",
      description: "Share a personalised link like cal.yourdomain.com.",
      done: !!(settings?.booking_base_url),
      href: "/app/dashboard/integrations",
      cta: "Set up",
    },
    {
      id: "css",
      icon: <CssIcon />,
      title: "Custom branding",
      description: "Add custom CSS to match your brand.",
      done: false,
      href: "/app/dashboard/settings",
      cta: "Customise",
    },
  ];

  const doneCount = steps.filter(s => s.done).length;

  return (
    <div style={{ padding: "40px 40px", maxWidth: 680 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.025em" }}>
          Get set up
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
          A few quick steps to get CitaCal working for you.
        </p>
      </div>

      {/* Panel card */}
      <div style={{ border: "1px solid var(--border-default, #e5e7eb)", borderRadius: 12, background: "var(--surface-page, #fff)", overflow: "hidden" }}>
        {/* Card header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "13px 18px",
          borderBottom: "1px solid var(--border-subtle, #f0f0f0)",
          background: "var(--surface-subtle, #fafafa)",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Progress</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#7B6CF6",
            background: "rgba(123,108,246,0.10)", borderRadius: 999,
            padding: "2px 8px", lineHeight: 1.6,
          }}>
            {doneCount} of {steps.length} done
          </span>
        </div>

        {/* Steps */}
        {steps.map((step, i) => (
          <div
            key={step.id}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "13px 18px",
              borderBottom: i < steps.length - 1 ? "1px solid var(--border-subtle, #f0f0f0)" : "none",
              opacity: step.done ? 0.55 : 1,
            }}
          >
            <CheckIcon done={step.done} />
            <div style={{ color: "var(--text-tertiary)", marginTop: 1 }}>{step.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: step.done ? 500 : 600, lineHeight: 1.3,
                color: step.done ? "var(--text-secondary)" : "var(--text-primary)",
              }}>
                {step.title}
              </div>
              <div style={{
                fontSize: 12, color: "var(--text-tertiary)", marginTop: 1, lineHeight: 1.4,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {step.description}
              </div>
            </div>
            <Link
              href={step.href}
              style={{
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", textDecoration: "none",
                color: step.done ? "var(--text-tertiary)" : "#7B6CF6",
                padding: "4px 10px", flexShrink: 0,
                border: `1px solid ${step.done ? "var(--border-subtle, #f0f0f0)" : "rgba(123,108,246,0.30)"}`,
                borderRadius: 6,
                background: step.done ? "transparent" : "rgba(123,108,246,0.05)",
              }}
            >
              {step.cta} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
