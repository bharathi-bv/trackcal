"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs/legacy";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden>
    <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
    <path fill="#f35325" d="M1 1h10v10H1z"/>
    <path fill="#81bc06" d="M12 1h10v10H12z"/>
    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
    <path fill="#ffba08" d="M12 12h10v10H12z"/>
  </svg>
);

function LoginContent() {
  const searchParams = useSearchParams();
  const { signIn, isLoaded } = useSignIn();

  const authErrorMessage = React.useMemo(() => {
    const authError = searchParams.get("auth_error");
    if (!authError) return null;
    if (authError === "session_expired") {
      return "Your Google or Microsoft sign-in session expired. Please try again.";
    }
    return "We couldn't complete that sign-in. Please try again.";
  }, [searchParams]);

  async function handleGoogleSignIn() {
    if (!isLoaded) return;
    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/app/dashboard",
    });
  }

  async function handleMicrosoftSignIn() {
    if (!isLoaded) return;
    await signIn.authenticateWithRedirect({
      strategy: "oauth_microsoft",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/app/dashboard",
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f8f9ff 0%, #eef1fb 50%, #e8ecf7 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "100px 24px 40px",
      fontFamily: "var(--font-sans)",
    }}>
      {/* Subtle background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(123,108,246,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-5%", left: "-8%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,158,255,0.07) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>

        {/* Brand — absolute so only the card is vertically centered */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, position: "absolute", top: -68, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #7B6CF6 0%, #9D91FA 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(123,108,246,0.28), 0 2px 6px rgba(123,108,246,0.14)",
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="-2 0 20 20" fill="none" aria-hidden>
              <path d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1, color: "#171C33" }}>
              <span style={{ fontWeight: 300 }}>Cita</span><span style={{ fontWeight: 800, color: "#7B6CF6" }}>Cal</span>
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#7B6CF6", background: "rgba(123,108,246,0.10)", border: "1px solid rgba(123,108,246,0.20)", borderRadius: 999, padding: "3px 7px", letterSpacing: "0.08em", lineHeight: 1 }}>
              BETA
            </span>
          </div>
        </Link>

        {/* Card */}
        <div style={{
          width: "100%",
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(123,108,246,0.12)",
          borderRadius: 24,
          boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 20px 48px rgba(60,60,120,0.10)",
          backdropFilter: "blur(12px)",
          overflow: "hidden",
        }}>
          {/* Purple accent top strip */}
          <div style={{ height: 4, background: "linear-gradient(90deg, #7B6CF6 0%, #A89AF9 60%, #7B6CF6 100%)" }} />

          <div style={{ padding: "36px 36px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Heading */}
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.035em", color: "#171C33", margin: "0 0 6px" }}>
                Welcome back!
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: "#5A6485", lineHeight: 1.5 }}>
                Sign in to continue to your account.
              </p>
            </div>

            {/* Error */}
            {authErrorMessage && (
              <div style={{
                padding: "11px 14px", borderRadius: 12,
                background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)",
                color: "#92400e", fontSize: 13, lineHeight: 1.5,
              }}>
                {authErrorMessage}
              </div>
            )}

            {/* OAuth buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <OAuthButton icon={<GoogleIcon />} label="Continue with Google" onClick={handleGoogleSignIn} />
              <OAuthButton icon={<MicrosoftIcon />} label="Continue with Microsoft" onClick={handleMicrosoftSignIn} />
            </div>

            {/* Footer link */}
            <p style={{ textAlign: "center", margin: 0, fontSize: 14, color: "#6B7A99" }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: "#7B6CF6", fontWeight: 600, textDecoration: "none" }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OAuthButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        width: "100%", height: 48, borderRadius: 12,
        background: hovered ? "#fafbff" : "#ffffff",
        border: `1px solid ${hovered ? "rgba(123,108,246,0.30)" : "rgba(0,0,0,0.11)"}`,
        color: "#171C33", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "var(--font-sans)",
        boxShadow: hovered
          ? "0 4px 12px rgba(123,108,246,0.12)"
          : "0 1px 3px rgba(0,0,0,0.06)",
        transition: "all 0.15s ease",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginContent />
    </React.Suspense>
  );
}
