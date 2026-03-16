"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const GoogleCalIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const OutlookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 23 23" aria-hidden>
    <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
    <path fill="#f35325" d="M1 1h10v10H1z"/>
    <path fill="#81bc06" d="M12 1h10v10H12z"/>
    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
    <path fill="#ffba08" d="M12 12h10v10H12z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="8" cy="8" r="8" fill="#22c55e"/>
    <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

type Provider = "google" | "microsoft" | null;

export default function ConnectCalendarPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [provider, setProvider] = React.useState<Provider>(null);
  const [connecting, setConnecting] = React.useState(false);

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.replace("/login"); return; }

    localStorage.removeItem("citacal_signup_provider");

    const providers = user.externalAccounts.map((a) => a.provider);
    if (providers.includes("google")) setProvider("google");
    else if (providers.includes("microsoft")) setProvider("microsoft");
  }, [isLoaded, user, router]);

  function connectCalendar() {
    setConnecting(true);
    if (provider === "google") {
      window.location.href = "/api/auth/google/claim-calendar";
    } else {
      window.location.href = "/api/auth/microsoft?from=onboarding";
    }
  }

  const providerName = provider === "google" ? "Google Calendar" : "Outlook Calendar";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f8f9ff 0%, #eef1fb 50%, #e8ecf7 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px", fontFamily: "var(--font-sans)",
    }}>
      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,108,246,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-5%", left: "-8%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,158,255,0.07) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, #7B6CF6 0%, #9D91FA 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(123,108,246,0.28)",
          }}>
            <svg width="20" height="20" viewBox="-2 0 20 20" fill="none" aria-hidden>
              <path d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 22, letterSpacing: "-0.03em", color: "#171C33" }}>
            <span style={{ fontWeight: 300 }}>Cita</span><span style={{ fontWeight: 800, color: "#7B6CF6" }}>Cal</span>
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(123,108,246,0.12)", borderRadius: 24,
          boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 20px 48px rgba(60,60,120,0.10)",
          overflow: "hidden",
        }}>
          <div style={{ height: 4, background: "linear-gradient(90deg, #7B6CF6 0%, #A89AF9 60%, #7B6CF6 100%)" }} />

          <div style={{ padding: "36px 36px 32px" }}>
            {/* Step indicator */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
              {["Account created", "Connect calendar", "You're ready"].map((label, i) => (
                <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: "100%", height: 3, borderRadius: 99,
                    background: i === 0 ? "#22c55e" : i === 1 ? "#7B6CF6" : "rgba(123,108,246,0.15)",
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: i === 0 ? "#22c55e" : i === 1 ? "#7B6CF6" : "#9BA3B8",
                    letterSpacing: "0.01em",
                  }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "#171C33", margin: "0 0 6px" }}>
                Connect your calendar
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: "#5A6485", lineHeight: 1.6 }}>
                CitaCal needs access to check your real-time availability and add confirmed bookings to your calendar.
              </p>
            </div>

            {/* What we access */}
            <div style={{
              background: "rgba(123,108,246,0.04)", border: "1px solid rgba(123,108,246,0.12)",
              borderRadius: 12, padding: "14px 16px", marginBottom: 24,
            }}>
              {[
                "Read your calendar to find free slots",
                "Add bookings when someone schedules with you",
                "Never modify or delete existing events",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <CheckIcon />
                  <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Connect button */}
            <button
              onClick={connectCalendar}
              disabled={connecting || !provider}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                background: connecting ? "rgba(123,108,246,0.6)" : "#7B6CF6",
                color: "#fff", border: "none", cursor: connecting ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontSize: 14, fontWeight: 700, fontFamily: "var(--font-sans)",
                boxShadow: "0 4px 14px rgba(123,108,246,0.30)",
                transition: "all 0.15s",
                marginBottom: 12,
              }}
            >
              {connecting ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Connecting…
                </>
              ) : (
                <>
                  {provider === "google" ? <GoogleCalIcon /> : <OutlookIcon />}
                  Connect {providerName}
                </>
              )}
            </button>

            {/* Skip */}
            <button
              onClick={() => router.replace("/app/dashboard")}
              style={{
                width: "100%", height: 40, borderRadius: 10,
                background: "transparent", border: "1px solid rgba(0,0,0,0.09)",
                color: "#6B7A99", fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}
            >
              Skip for now
            </button>

            <p style={{ textAlign: "center", margin: "14px 0 0", fontSize: 11, color: "#9BA3B8", lineHeight: 1.5 }}>
              You can always connect your calendar later from Settings.
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
