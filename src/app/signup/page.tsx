"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSignUp, useSignIn } from "@clerk/nextjs/legacy";

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

const AuthNav = () => (
  <nav style={{ padding: "16px 24px", display: "flex", alignItems: "center" }}>
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(123,108,246,0.28)" }}>
        <svg width="17" height="17" viewBox="-2 0 20 20" fill="none">
          <path d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
        </svg>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 15, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em", lineHeight: 1 }}>
          <span style={{ fontWeight: 400, color: "#1A1A2E" }}>Cita</span><span style={{ fontWeight: 800, color: "#7B6CF6" }}>Cal</span>
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#7B6CF6", background: "rgba(123,108,246,0.12)", border: "1px solid rgba(123,108,246,0.25)", borderRadius: 4, padding: "2px 5px", letterSpacing: "0.05em", lineHeight: 1 }}>BETA</span>
      </span>
    </Link>
  </nav>
);

// Calendar connect step — shown inline after email verification
function ConnectCalendarStep() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}>
      <AuthNav />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
        <div style={{ background: "var(--surface-page)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)", padding: "var(--space-10)", width: "100%", maxWidth: 420 }}>
          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#7B6CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: 11, color: "#7B6CF6", fontWeight: 600 }}>Account created</span>
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(123,108,246,0.25)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, color: "white", fontWeight: 700 }}>2</span>
              </div>
              <span style={{ fontSize: 11, color: "#7B6CF6", fontWeight: 600 }}>Connect calendar</span>
            </div>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>
            Connect your calendar
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>
            CitaCal reads your availability and creates events when someone books with you. Pick the calendar you use for work.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <a
              href="/api/auth/google?from=onboarding"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 12,
                border: "1.5px solid var(--border-default)",
                background: "#fff",
                textDecoration: "none",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Google Calendar</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>Google Workspace or Gmail</div>
              </div>
            </a>

            <a
              href="/api/auth/microsoft?from=onboarding"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 12,
                border: "1.5px solid var(--border-default)",
                background: "#fff",
                textDecoration: "none",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 23 23" aria-hidden>
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Outlook / Microsoft 365</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>Outlook or Microsoft 365</div>
              </div>
            </a>
          </div>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link href="/app/dashboard" style={{ fontSize: 13, color: "var(--text-tertiary)", textDecoration: "none", fontWeight: 500 }}>
              Skip for now
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function SignupContent() {
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const searchParams = useSearchParams();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const [connectCalendar, setConnectCalendar] = React.useState(false);

  const authErrorMessage = React.useMemo(() => {
    const authError = searchParams.get("auth_error");
    if (!authError) return null;
    if (authError === "session_expired") {
      return "Your Google or Microsoft sign-in session expired. Please try again.";
    }
    return "We couldn't complete that sign-in. Please try again.";
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signUpLoaded) return;
    setLoading(true);
    setError(null);

    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string; code?: string }[] };
      const firstErr = clerkErr?.errors?.[0];
      if (firstErr?.code === "form_identifier_exists") {
        setError("An account already exists for this email. Sign in instead.");
      } else {
        setError(firstErr?.message ?? "Could not create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUpLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Show calendar connect step inline — no page redirect
        setConnectCalendar(true);
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Invalid code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!signInLoaded || !signIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/app/dashboard",
        // Request calendar scopes so they appear on the same Google consent screen
        additionalOauthScopes: {
          oauth_google: [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
          ],
        },
      });
    } catch (err: unknown) {
      console.error("Google OAuth error:", err);
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Google sign-up failed.";
      setError(msg);
    }
  }

  async function handleMicrosoftSignUp() {
    if (!signInLoaded || !signIn) return;
    try {
      // Microsoft new signups still need a separate calendar OAuth step
      localStorage.setItem("citacal_signup_provider", "microsoft");
      await signIn.authenticateWithRedirect({
        strategy: "oauth_microsoft",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/app/dashboard",
      });
    } catch (err: unknown) {
      localStorage.removeItem("citacal_signup_provider");
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? "Microsoft sign-up failed.";
      setError(msg);
    }
  }

  // Step 3: calendar connect (email/password users only)
  if (connectCalendar) {
    return <ConnectCalendarStep />;
  }

  // Step 2: email verification
  if (verifying) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}>
        <AuthNav />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
          <div
            style={{
              background: "var(--surface-page)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
              padding: "var(--space-10)",
              width: "100%",
              maxWidth: 420,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: "var(--space-4)", textAlign: "center" }}>📬</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0, textAlign: "center" }}>
              Check your email
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-3)", lineHeight: 1.6, textAlign: "center" }}>
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate your account.
            </p>

            <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
              <div className="tc-form-field">
                <label className="tc-form-label">Verification code</label>
                <input
                  type="text"
                  className="tc-input"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                  style={{ textAlign: "center", letterSpacing: "0.2em", fontSize: 20 }}
                />
              </div>

              {error && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>}

              <button type="submit" className="tc-btn tc-btn--primary" style={{ width: "100%" }} disabled={loading}>
                {loading ? "Verifying…" : "Verify email"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "var(--space-4)", fontSize: 13, color: "var(--text-tertiary)" }}>
              Wrong email?{" "}
              <button
                type="button"
                onClick={() => { setVerifying(false); setError(null); }}
                style={{ background: "none", border: "none", color: "var(--blue-400)", fontWeight: 500, cursor: "pointer", fontSize: 13, padding: 0 }}
              >
                Go back
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Step 1: sign up form
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}>
      <AuthNav />
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
        }}
      >
        <div
          style={{
            background: "var(--surface-page)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-10)",
            width: "100%",
            maxWidth: 420,
          }}
        >
          <div style={{ marginBottom: "var(--space-8)" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span><span style={{ fontWeight: 400 }}>Cita</span>Cal</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#7B6CF6", background: "rgba(123,108,246,0.12)", border: "1px solid rgba(123,108,246,0.25)", borderRadius: 4, padding: "2px 5px", letterSpacing: "0.05em", lineHeight: 1 }}>BETA</span>
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-1)", margin: 0 }}>
              Create your account or continue with an existing one
            </p>
          </div>

          {authErrorMessage && (
            <div
              style={{
                marginBottom: "var(--space-4)",
                padding: "12px 14px",
                borderRadius: "var(--radius-lg)",
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

          {/* OAuth buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <button
              type="button"
              className="tc-btn tc-btn--secondary"
              onClick={handleGoogleSignUp}
              style={{ justifyContent: "center", gap: "var(--space-2)", width: "100%" }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <button
              type="button"
              className="tc-btn tc-btn--secondary"
              onClick={handleMicrosoftSignUp}
              style={{ justifyContent: "center", gap: "var(--space-2)", width: "100%" }}
            >
              <MicrosoftIcon />
              Continue with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              margin: "var(--space-5) 0",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            <div className="tc-form-field">
              <label className="tc-form-label">Email</label>
              <input
                type="email"
                className="tc-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="tc-form-field">
              <label className="tc-form-label">Password</label>
              <input
                type="password"
                className="tc-input"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            {error && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
                {error.includes("already exists") && (
                  <p style={{ fontSize: 13, margin: 0 }}>
                    <Link href="/login" style={{ color: "var(--blue-400)", fontWeight: 600 }}>
                      Go to sign in
                    </Link>
                  </p>
                )}
              </div>
            )}

            <button type="submit" className="tc-btn tc-btn--primary" style={{ width: "100%" }} disabled={loading || !signUpLoaded}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              marginTop: "var(--space-6)",
              fontSize: 14,
              color: "var(--text-secondary)",
            }}
          >
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
              Sign in
            </Link>
          </p>

          <p
            style={{
              textAlign: "center",
              marginTop: "var(--space-4)",
              fontSize: 12,
              color: "var(--text-tertiary)",
              lineHeight: 1.6,
            }}
          >
            By creating an account, you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
              Privacy Statement
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense>
      <SignupContent />
    </React.Suspense>
  );
}
