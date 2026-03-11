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

const AuthBrand = () => (
  <Link
    href="/"
    style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 14,
      textDecoration: "none",
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: "linear-gradient(135deg, #7B6CF6, #A89AF9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 14px 30px rgba(123,108,246,0.24)",
      }}
    >
      <svg width="22" height="22" viewBox="-2 0 20 20" fill="none" aria-hidden>
        <path d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
      </svg>
    </div>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 24, fontFamily: "var(--font-sans)", letterSpacing: "-0.03em", lineHeight: 1, color: "#171C33" }}>
        <span style={{ fontWeight: 400 }}>Cita</span><span style={{ fontWeight: 800, color: "#7B6CF6" }}>Cal</span>
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: "#7B6CF6", background: "rgba(123,108,246,0.12)", border: "1px solid rgba(123,108,246,0.22)", borderRadius: 999, padding: "4px 7px", letterSpacing: "0.06em", lineHeight: 1 }}>
        BETA
      </span>
    </span>
  </Link>
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
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(255,255,255,0.85) 0%, rgba(232,238,247,0.75) 34%, rgba(216,228,244,0.9) 100%)" }}>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, transform: "translateY(-24px)" }}>
          <AuthBrand />

          <div
            style={{
              background: "rgba(255,255,255,0.82)",
              border: "1px solid rgba(154, 173, 203, 0.26)",
              borderRadius: 28,
              boxShadow: "0 26px 60px rgba(60, 84, 121, 0.12)",
              backdropFilter: "blur(10px)",
              padding: "32px 28px 28px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "#171C33", margin: 0 }}>
                Welcome back
              </h1>
            </div>

            {authErrorMessage && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 18,
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  color: "#92400e",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {authErrorMessage}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                className="tc-btn tc-btn--secondary"
                onClick={handleGoogleSignIn}
                style={{
                  justifyContent: "center",
                  gap: "var(--space-2)",
                  width: "100%",
                  minHeight: 56,
                  borderRadius: 18,
                  background: "#FFFFFF",
                  border: "1px solid rgba(142, 156, 184, 0.34)",
                  color: "#171C33",
                  boxShadow: "0 8px 18px rgba(103, 124, 158, 0.08)",
                }}
              >
                <GoogleIcon />
                Continue with Google
              </button>
              <button
                type="button"
                className="tc-btn tc-btn--secondary"
                onClick={handleMicrosoftSignIn}
                style={{
                  justifyContent: "center",
                  gap: "var(--space-2)",
                  width: "100%",
                  minHeight: 56,
                  borderRadius: 18,
                  background: "rgba(246, 248, 252, 0.92)",
                  border: "1px solid rgba(142, 156, 184, 0.34)",
                  color: "#31405C",
                }}
              >
                <MicrosoftIcon />
                Continue with Microsoft
              </button>
            </div>

            <p
              style={{
                textAlign: "center",
                margin: 0,
                fontSize: 14,
                color: "var(--text-secondary)",
              }}
            >
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: "var(--blue-400)", fontWeight: 600 }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginContent />
    </React.Suspense>
  );
}
