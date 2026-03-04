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
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span className="tc-nav-logo-name">CitaCal</span>
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
