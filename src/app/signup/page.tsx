"use client";

import * as React from "react";
import Link from "next/link";
import { createAuthBrowserClient } from "@/lib/supabase-browser";

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

export default function SignupPage() {
  const supabase = createAuthBrowserClient();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After email confirmation, user lands here and gets a session
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // signUp succeeded — show "check your email" screen
    setDone(true);
  }

  async function handleGoogleSignUp() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleMicrosoftSignUp() {
    await supabase.auth.signInWithOAuth({
      provider: "azure" as Parameters<typeof supabase.auth.signInWithOAuth>[0]["provider"],
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (done) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)",
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
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: "var(--space-4)" }}>📬</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Check your email
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginTop: "var(--space-3)",
              lineHeight: 1.6,
            }}
          >
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
            account and you&apos;ll be taken straight to your dashboard.
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              marginTop: "var(--space-6)",
              fontSize: 14,
              color: "var(--blue-400)",
              fontWeight: 500,
            }}
          >
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)",
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            CitaCal
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-1)", margin: 0 }}>
            Create your account
          </p>
        </div>

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
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>
          )}

          <button type="submit" className="tc-btn tc-btn--primary" style={{ width: "100%" }} disabled={loading}>
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
      </div>
    </main>
  );
}
