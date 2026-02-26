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

        {/* Tabs */}
        <div style={{ display: "flex", gap: "var(--space-1)", marginLeft: "var(--space-2)" }}>
          {TABS.map((tab) => (
            <a
              key={tab.id}
              href={tab.href}
              className="btn btn-ghost btn-sm"
              style={{
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 700 : undefined,
                background: activeTab === tab.id ? "var(--surface-subtle)" : undefined,
                color: activeTab === tab.id ? "var(--blue-400)" : undefined,
              }}
            >
              {tab.label}
            </a>
          ))}
        </div>

        <div style={{ flex: 1 }} />

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
          className="dashboard-nav-email"
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {email}
        </span>

        <SignOutButton />
      </div>
    </nav>
  );
}
