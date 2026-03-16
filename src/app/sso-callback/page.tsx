"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(123,108,246,0.2)", borderTopColor: "#7B6CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ fontSize: 14, color: "#7B6CF6", fontWeight: 500 }}>Signing you in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl="/app/dashboard"
      signInFallbackRedirectUrl="/app/dashboard"
      signUpForceRedirectUrl="/app/connect-calendar"
      signUpFallbackRedirectUrl="/app/connect-calendar"
      signInUrl="/login"
      signUpUrl="/login"
    />
    </div>
  );
}
