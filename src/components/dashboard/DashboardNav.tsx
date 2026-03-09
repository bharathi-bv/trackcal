import Link from "next/link";
import ProfileMenu from "@/components/dashboard/ProfileMenu";

type Tab = "bookings" | "analytics" | "event-types" | "tracking" | "settings";

const TABS: { id: Tab; label: string; href: string }[] = [
  { id: "bookings",     label: "Bookings",   href: "/app/dashboard" },
  { id: "event-types", label: "Booking Links", href: "/app/dashboard/event-types" },
  { id: "analytics",   label: "Analytics",  href: "/app/analytics" },
  { id: "tracking",    label: "Tracking",   href: "/app/dashboard/tracking" },
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
      <div className="tc-nav-inner">
      {/* Logo */}
      <Link href="/app/dashboard" className="tc-nav-logo">
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
      </Link>

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
        <ProfileMenu email={email} />
      </div>
      </div>
    </nav>
  );
}
