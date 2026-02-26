import SignOutButton from "@/components/auth/SignOutButton";

type Tab = "bookings" | "event-types" | "settings";

const TABS: { id: Tab; label: string; href: string }[] = [
  { id: "bookings", label: "Bookings", href: "/dashboard" },
  { id: "event-types", label: "Event Types", href: "/dashboard/event-types" },
  { id: "settings", label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardNav({
  activeTab,
  calendarConnected,
  email,
}: {
  activeTab: Tab;
  calendarConnected: boolean;
  email: string;
}) {
  return (
    <nav
      style={{
        background: "var(--surface-page)",
        borderBottom: "1px solid var(--border-default)",
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 var(--space-6)",
          height: 56,
          display: "flex",
          alignItems: "stretch",
          gap: "var(--space-4)",
        }}
      >
        {/* Logo mark + wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            flexShrink: 0,
            marginRight: "var(--space-2)",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "var(--radius-md)",
              background: "var(--blue-400)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="13"
              height="13"
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
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            TrackCal
          </span>
        </div>

        {/* Vertical divider */}
        <div
          style={{
            width: 1,
            background: "var(--border-default)",
            alignSelf: "stretch",
            margin: "12px 0",
            flexShrink: 0,
          }}
        />

        {/* Tabs — underline active style, full nav height */}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <a
                key={tab.id}
                href={tab.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 var(--space-4)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                  textDecoration: "none",
                  borderBottom: isActive
                    ? "2px solid var(--blue-400)"
                    : "2px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </a>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Right cluster */}
        {calendarConnected ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              className="badge badge-green"
              style={{ fontSize: 11, gap: "var(--space-1)" }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--success)",
                  flexShrink: 0,
                }}
              />
              Calendar connected
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center" }}>
            <a href="/api/auth/google" className="btn btn-secondary btn-sm">
              Connect Google Calendar
            </a>
          </div>
        )}

        <div
          style={{
            width: 1,
            background: "var(--border-default)",
            alignSelf: "stretch",
            margin: "12px 0",
            flexShrink: 0,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
