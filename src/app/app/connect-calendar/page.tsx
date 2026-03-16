"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/**
 * Silent post-auth dispatcher. No UI shown — just determines where to send
 * the user based on their OAuth provider and whether a calendar is already connected.
 *
 * Google signup  → /api/auth/google/claim-calendar (scopes already in Clerk token)
 * Microsoft      → /api/auth/microsoft?from=onboarding (separate calendar consent)
 * Already connected (returning user) → /app/dashboard
 * Fallback       → /app/getting-started
 */
export default function ConnectCalendarPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.replace("/login"); return; }

    localStorage.removeItem("citacal_signup_provider");

    // Dispatch by OAuth provider — no settings check needed, claim-calendar
    // handles the "already connected" case internally.
    const providers = user.externalAccounts.map(a => a.provider);
    if (providers.includes("google")) {
      window.location.href = "/api/auth/google/claim-calendar";
    } else if (providers.includes("microsoft")) {
      window.location.href = "/api/auth/microsoft?from=onboarding";
    } else {
      router.replace("/app/getting-started");
    }
  }, [isLoaded, user, router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(123,108,246,0.2)", borderTopColor: "#7B6CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ fontSize: 14, color: "#7B6CF6", fontWeight: 500 }}>Setting up your account…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
