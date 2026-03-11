"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/**
 * Dispatcher for new OAuth signups.
 *
 * Reads the user's actual Clerk external accounts to decide where to send them —
 * instead of relying on localStorage which can be unreliable across OAuth redirects.
 *
 * Google signup  → /api/auth/google/claim-calendar (calendar scopes already granted)
 * Microsoft signup → /api/auth/microsoft?from=onboarding (separate calendar consent needed)
 * Fallback       → /app/getting-started
 */
export default function ConnectCalendarPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  React.useEffect(() => {
    if (!isLoaded) return;

    // Clean up localStorage flag regardless (kept for backwards compat)
    localStorage.removeItem("citacal_signup_provider");

    if (!user) {
      router.replace("/login");
      return;
    }

    const providers = user.externalAccounts.map((a) => a.provider);

    if (providers.includes("oauth_google")) {
      // Google signup — retrieve the already-granted calendar token from Clerk
      window.location.href = "/api/auth/google/claim-calendar";
    } else if (providers.includes("oauth_microsoft")) {
      // Microsoft signup — needs a separate calendar OAuth consent screen
      window.location.href = "/api/auth/microsoft?from=onboarding";
    } else {
      // Fallback for accounts without a supported OAuth identity on file
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
