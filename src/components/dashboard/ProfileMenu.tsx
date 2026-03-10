"use client";

import * as React from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";

// Generic silhouette for when no photo is set
function Silhouette() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" fill="#9CA3AF" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#9CA3AF" />
    </svg>
  );
}

export default function ProfileMenu({ email }: { email: string }) {
  const [open, setOpen] = React.useState(false);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const { signOut } = useClerk();

  // Fetch profile photo once on mount
  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.profile_photo_url === "string" && data.profile_photo_url) {
          setPhotoUrl(data.profile_photo_url);
        }
      })
      .catch(() => {/* silent — fallback to silhouette */});
  }, []);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSignOut() {
    await signOut({ redirectUrl: "/login" });
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open profile menu"
        aria-expanded={open}
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--radius-full)",
          background: photoUrl ? "transparent" : "#E5E7EB",
          border: open ? "2px solid rgba(156,163,175,0.6)" : "2px solid transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: 0,
          overflow: "hidden",
          transition: "border-color 0.15s",
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Profile"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          <Silhouette />
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "var(--color-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "var(--space-1)",
            minWidth: 200,
            zIndex: 600,
          }}
        >
          {email && (
            <>
              <div
                style={{
                  padding: "8px 12px 6px",
                  fontSize: 12,
                  color: "var(--color-text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {email}
              </div>
              <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
            </>
          )}

          <Link
            href="/app/dashboard/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              color: "var(--color-text-primary)",
              textDecoration: "none",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2M15.66 4.34l-1.06 1.06M5.4 14.6l-1.06 1.06M15.66 15.66l-1.06-1.06M5.4 5.4 4.34 4.34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
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
              fontSize: 14,
              color: "var(--color-text-primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3M13 14l3-4-3-4M16 10H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
