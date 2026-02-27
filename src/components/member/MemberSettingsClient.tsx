"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type MemberData = {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  google_refresh_token: string | null;
};

function MemberAvatar({ member }: { member: MemberData }) {
  const [imgError, setImgError] = React.useState(false);
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background:
          member.photo_url && !imgError ? "var(--surface-subtle)" : "var(--blue-400)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        fontWeight: 800,
        color: "white",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "var(--shadow-blue-sm)",
      }}
    >
      {member.photo_url && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.photo_url}
          alt={member.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      ) : (
        member.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function MemberSettingsClient({ member }: { member: MemberData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "1";

  const [calConnected, setCalConnected] = React.useState(
    Boolean(member.google_refresh_token)
  );
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [disconnectError, setDisconnectError] = React.useState<string | null>(null);

  async function handleDisconnect() {
    if (!confirm("Disconnect your Google Calendar? Bookings will no longer sync.")) return;
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await fetch("/api/member/calendar", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to disconnect");
      }
      setCalConnected(false);
      router.refresh();
    } catch (err) {
      setDisconnectError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-subtle)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--space-10) var(--space-6)",
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-10)",
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          TrackCal
        </span>
        <a
          href="/auth/signout"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textDecoration: "none",
          }}
        >
          Sign out
        </a>
      </div>

      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Success toast */}
        {justConnected && (
          <div
            className="alert alert-success"
            style={{ marginBottom: "var(--space-6)", fontSize: 13 }}
          >
            ✓ Google Calendar connected successfully!
          </div>
        )}

        {/* Profile card */}
        <div
          className="card"
          style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              marginBottom: "var(--space-5)",
              paddingBottom: "var(--space-5)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <MemberAvatar member={member} />
            <div>
              <p
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {member.name}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  margin: "2px 0 0",
                  fontWeight: 500,
                }}
              >
                {member.email}
              </p>
            </div>
          </div>

          {/* Calendar section */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 var(--space-3)",
              }}
            >
              Google Calendar
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                flexWrap: "wrap",
              }}
            >
              {/* Status badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                {calConnected ? (
                  <span className="badge badge-green" style={{ fontSize: 11 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--success)",
                        flexShrink: 0,
                        display: "inline-block",
                        marginRight: 4,
                      }}
                    />
                    Connected
                  </span>
                ) : (
                  <span className="badge badge-amber" style={{ fontSize: 11 }}>
                    Not connected
                  </span>
                )}
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {calConnected
                    ? "Your availability is synced with TrackCal."
                    : "Connect to sync your availability."}
                </span>
              </div>

              {/* Action button */}
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {!calConnected && (
                  <a
                    href="/api/auth/google/member/self"
                    className="btn btn-primary btn-sm"
                  >
                    Connect Google Calendar
                  </a>
                )}
                {calConnected && (
                  <>
                    <a
                      href="/api/auth/google/member/self"
                      className="btn btn-secondary btn-sm"
                    >
                      Reconnect
                    </a>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--error)" }}
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? "Disconnecting…" : "Disconnect"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {disconnectError && (
              <p style={{ fontSize: 12, color: "var(--error)", marginTop: "var(--space-2)" }}>
                {disconnectError}
              </p>
            )}
          </div>
        </div>

        {/* Info */}
        <p
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          This is your team member portal. For account issues, contact your admin.
        </p>
      </div>
    </div>
  );
}
