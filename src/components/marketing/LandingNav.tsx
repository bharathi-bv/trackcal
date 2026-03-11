import Link from "next/link";

export default function LandingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(248,248,255,0.82)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(200,198,230,0.35)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: 32,
        height: 56,
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "linear-gradient(135deg, #7B6CF6, #A89AF9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(123,108,246,0.28)",
          }}
        >
          <svg width="17" height="17" viewBox="-2 0 20 20" fill="none" aria-hidden>
            <path d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 15, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em", lineHeight: 1 }}>
            <span style={{ fontWeight: 400, color: "#1A1A2E" }}>Cita</span>
            <span style={{ fontWeight: 800, color: "#7B6CF6" }}>Cal</span>
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#7B6CF6",
              background: "rgba(123,108,246,0.12)",
              border: "1px solid rgba(123,108,246,0.25)",
              borderRadius: 4,
              padding: "2px 5px",
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            BETA
          </span>
        </span>
      </Link>

      <div className="landing-nav-links" style={{ display: "flex", alignItems: "center", gap: 28, flex: 1 }}>
        <Link href="/#features" style={{ fontSize: 13, color: "#454560", textDecoration: "none", fontFamily: "var(--font-sans)" }}>
          Features
        </Link>
        <Link href="/#how-it-works" style={{ fontSize: 13, color: "#454560", textDecoration: "none", fontFamily: "var(--font-sans)" }}>
          How it works
        </Link>
        <Link href="/docs" style={{ fontSize: 13, color: "#454560", textDecoration: "none", fontFamily: "var(--font-sans)" }}>
          Docs
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isLoggedIn ? (
          <Link
            href="/app/dashboard"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#FFF",
              textDecoration: "none",
              padding: "7px 16px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #7B6CF6, #9B8EF8)",
              boxShadow: "0 2px 8px rgba(123,108,246,0.30)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Go to Dashboard →
          </Link>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 13, color: "#454560", textDecoration: "none", padding: "7px 14px", fontFamily: "var(--font-sans)" }}>
              Sign in
            </Link>
            <Link
              href="/signup"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#FFF",
                textDecoration: "none",
                padding: "7px 16px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #7B6CF6, #9B8EF8)",
                boxShadow: "0 2px 8px rgba(123,108,246,0.30)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Start free →
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
