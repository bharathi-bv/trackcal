import SignOutButton from "@/components/auth/SignOutButton";

type Tab = "bookings" | "analytics" | "event-types" | "integrations" | "settings";

const TABS: { id: Tab; label: string; href: string }[] = [
  { id: "bookings",      label: "Bookings",      href: "/app/dashboard" },
  { id: "event-types",  label: "Scheduling",    href: "/app/dashboard/event-types" },
  { id: "analytics",    label: "Analytics",     href: "/app/analytics" },
  { id: "integrations", label: "Integrations",  href: "/app/dashboard/integrations" },
  { id: "settings",     label: "Settings",      href: "/app/dashboard/settings" },
];

export default function DashboardNav({
  activeTab,
  activeLinks,
  email,
}: {
  activeTab: Tab;
  activeLinks: number;
  email: string;
}) {
  return (
    <nav className="tc-nav">
      {/* Logo */}
      <a href="/app/dashboard" className="tc-nav-logo">
        <div className="tc-nav-logo-mark">
          <svg width="15" height="15" viewBox="-2 0 20 20" fill="none">
            <path d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="tc-nav-logo-name">
            <span style={{ fontWeight: 400 }}>Cita</span><span style={{ fontWeight: 800 }}>Cal</span>
          </span>
          <span style={{ fontSize: 8, fontWeight: 700, color: "#7B6CF6", background: "rgba(123,108,246,0.12)", border: "1px solid rgba(123,108,246,0.25)", borderRadius: 3, padding: "2px 4px", letterSpacing: "0.05em", lineHeight: 1 }}>BETA</span>
        </span>
      </a>

      {/* Nav links */}
      <div className="tc-nav-links">
        {TABS.map((tab) => (
          <a
            key={tab.id}
            href={tab.href}
            className={`tc-nav-link${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Right cluster */}
      <div className="tc-nav-right">
        <a
          href="/app/dashboard/event-types"
          style={{ textDecoration: "none" }}
        >
          <div className="tc-status-chip tc-status-chip--neutral nav-links-badge">
            <span className="nav-links-label">Active meeting links</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 18,
                height: 18,
                borderRadius: "var(--radius-full)",
                background: activeLinks > 0 ? "var(--blue-400)" : "var(--border-strong)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "0 5px",
              }}
            >
              {activeLinks}
            </span>
          </div>
        </a>

        {email && (
          <span
            className="nav-email-text"
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email}
          </span>
        )}

        <SignOutButton />
      </div>
    </nav>
  );
}
