"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "getting-started",
    label: "Get Started",
    href: "/app/getting-started",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 2L12.4 7.2L18 8L14 11.8L15 17.4L10 14.8L5 17.4L6 11.8L2 8L7.6 7.2L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "bookings",
    label: "Bookings",
    href: "/app/dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 2v4M13 2v4M3 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "event-types",
    label: "Booking Links",
    href: "/app/dashboard/event-types",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M8.5 11.5a3 3 0 0 0 3 0l4-4a3 3 0 0 0-4.24-4.24l-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M11.5 8.5a3 3 0 0 0-3 0l-4 4a3 3 0 0 0 4.24 4.24l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/app/analytics",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M3 14l4-5 4 3 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="3" cy="14" r="1.5" fill="currentColor"/>
        <circle cx="7" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="11" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: "tracking",
    label: "Tracking",
    href: "/app/dashboard/tracking",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 3v2M10 15v2M3 10h2M15 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "integrations",
    label: "Integrations",
    href: "/app/dashboard/integrations",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M14.5 11v6M11.5 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    href: "/app/dashboard/settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

function useActiveNav(pathname: string) {
  // Most specific match wins
  if (pathname.startsWith("/app/getting-started")) return "getting-started";
  if (pathname.startsWith("/app/dashboard/integrations")) return "integrations";
  if (pathname.startsWith("/app/dashboard/settings")) return "settings";
  if (pathname.startsWith("/app/dashboard/event-types")) return "event-types";
  if (pathname.startsWith("/app/dashboard/tracking")) return "tracking";
  if (pathname.startsWith("/app/analytics")) return "analytics";
  if (pathname === "/app/dashboard" || pathname === "/app/dashboard/") return "bookings";
  return null;
}

export default function SideNav() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const activeId = useActiveNav(pathname ?? "");

  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.profile_photo_url === "string" && data.profile_photo_url) {
          setPhotoUrl(data.profile_photo_url);
        }
      })
      .catch(() => {/* silent */});
  }, []);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleSignOut() {
    await signOut({ redirectUrl: "/login" });
  }

  return (
    <nav className="app-sidenav">
      {/* Logo */}
      <Link
        href="/app/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          marginBottom: "var(--space-6)",
          padding: "0 var(--space-2)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px var(--color-primary-shadow)",
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="-2 0 20 20" fill="none">
            <path d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
          <span style={{ fontWeight: 400 }}>Cita</span>
          <span style={{ fontWeight: 800 }}>Cal</span>
        </span>
        <span style={{ fontSize: 8, fontWeight: 700, color: "#7B6CF6", background: "rgba(123,108,246,0.12)", border: "1px solid rgba(123,108,246,0.25)", borderRadius: 3, padding: "2px 4px", letterSpacing: "0.05em", lineHeight: 1 }}>
          BETA
        </span>
      </Link>

      {/* Nav items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                background: isActive ? "var(--color-primary-light)" : "transparent",
                textDecoration: "none",
                transition: "background 0.12s, color 0.12s",
                flexShrink: 0,
              }}
            >
              <span style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-muted)", flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Profile / sign-out at bottom */}
      <div ref={menuRef} style={{ position: "relative", marginTop: "var(--space-4)" }}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Account menu"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            background: menuOpen ? "var(--color-primary-light)" : "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-sans)",
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: photoUrl ? "transparent" : "#E5E7EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="4" fill="#9CA3AF" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#9CA3AF" />
              </svg>
            )}
          </div>
          Account
        </button>

        {menuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              right: 0,
              background: "var(--color-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: "var(--space-1)",
              zIndex: 600,
            }}
          >
            <Link
              href="/app/dashboard/settings"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                color: "var(--color-text-primary)",
                textDecoration: "none",
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
              }}
            >
              Settings
            </Link>
            <button
              role="menuitem"
              onClick={handleSignOut}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                color: "var(--color-text-primary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
