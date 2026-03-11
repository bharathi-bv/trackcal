"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Dispatcher for new OAuth signups.
 *
 * Google: no localStorage flag — calendar scopes already granted via additionalOauthScopes
 *   in Clerk's consent screen. Redirect to /api/auth/google/claim-calendar to retrieve
 *   the token from Clerk and save it to host_settings. One consent screen total.
 *
 * Microsoft: localStorage='microsoft' — needs a separate Microsoft calendar OAuth consent.
 *
 * Direct navigation / returning sign-ins: redirect to dashboard.
 */
export default function ConnectCalendarPage() {
  const router = useRouter();

  React.useEffect(() => {
    const provider = localStorage.getItem("citacal_signup_provider");
    localStorage.removeItem("citacal_signup_provider");

    if (provider === "microsoft") {
      window.location.href = "/api/auth/microsoft?from=onboarding";
    } else if (!provider) {
      // Google signup — retrieve the already-granted calendar token from Clerk
      window.location.href = "/api/auth/google/claim-calendar";
    } else {
      router.replace("/app/dashboard");
    }
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(123,108,246,0.2)", borderTopColor: "#7B6CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ fontSize: 14, color: "#7B6CF6", fontWeight: 500 }}>Setting up your calendar…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
