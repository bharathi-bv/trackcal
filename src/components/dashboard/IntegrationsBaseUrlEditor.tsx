"use client";

import * as React from "react";

type CheckStatus = "unchecked" | "verified" | "failed";

type VerificationSnapshot = {
  checkStatus: CheckStatus;
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  checkError: string | null;
};

function normalizeOrigin(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return value.trim();
  }
}

function asLocalTime(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function getDnsHints(value: string) {
  try {
    const hostname = new URL(value.trim()).hostname.toLowerCase();
    const segments = hostname.split(".").filter(Boolean);
    const isSubdomain = segments.length >= 3;
    const label = isSubdomain ? segments[0] : null;
    return { hostname, label, isSubdomain };
  } catch {
    return { hostname: "book.yourdomain.com", label: "book", isSubdomain: true };
  }
}

export default function IntegrationsBaseUrlEditor({
  initialValue,
  initialCheckStatus = "unchecked",
  initialCheckedAt = null,
  initialVerifiedAt = null,
  initialCheckError = null,
  hostPublicSlug,
  exampleEventSlug,
  dnsTargetHost,
  onSaved,
  onVerificationUpdated,
}: {
  initialValue?: string | null;
  initialCheckStatus?: CheckStatus;
  initialCheckedAt?: string | null;
  initialVerifiedAt?: string | null;
  initialCheckError?: string | null;
  hostPublicSlug?: string;
  exampleEventSlug?: string;
  dnsTargetHost?: string;
  onSaved?: (value: string | null) => void;
  onVerificationUpdated?: (next: VerificationSnapshot) => void;
}) {
  const [value, setValue] = React.useState(initialValue ?? "");
  const [savedValue, setSavedValue] = React.useState(initialValue ?? "");
  const [saving, setSaving] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [checkStatus, setCheckStatus] = React.useState<CheckStatus>(initialCheckStatus);
  const [lastCheckedAt, setLastCheckedAt] = React.useState<string | null>(initialCheckedAt);
  const [verifiedAt, setVerifiedAt] = React.useState<string | null>(initialVerifiedAt);
  const [checkError, setCheckError] = React.useState<string | null>(initialCheckError);

  React.useEffect(() => {
    setValue(initialValue ?? "");
    setSavedValue(initialValue ?? "");
  }, [initialValue]);

  React.useEffect(() => {
    setCheckStatus(initialCheckStatus);
    setLastCheckedAt(initialCheckedAt);
    setVerifiedAt(initialVerifiedAt);
    setCheckError(initialCheckError);
  }, [initialCheckError, initialCheckStatus, initialCheckedAt, initialVerifiedAt]);

  function publishVerification(next: VerificationSnapshot) {
    setCheckStatus(next.checkStatus);
    setLastCheckedAt(next.lastCheckedAt);
    setVerifiedAt(next.verifiedAt);
    setCheckError(next.checkError);
    onVerificationUpdated?.(next);
  }

  async function save(nextRawValue?: string) {
    setSaving(true);
    setErrorMsg(null);
    try {
      const rawValue = nextRawValue ?? value;
      const normalizedInput = normalizeOrigin(rawValue);
      const previousNormalized = normalizeOrigin(initialValue ?? null);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ booking_base_url: rawValue.trim() || "" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body?.error === "string" ? body.error : "Save failed");

      setValue(rawValue);
      setSavedValue(rawValue);
      onSaved?.(normalizedInput);

      if (normalizedInput !== previousNormalized) {
        publishVerification({ checkStatus: "unchecked", lastCheckedAt: null, verifiedAt: null, checkError: null });
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function verifyNow() {
    if (!value.trim()) return;
    setVerifying(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/settings/verify-booking-base-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          booking_base_url: value.trim(),
          host_slug: hostPublicSlug ?? null,
          event_slug: exampleEventSlug ?? null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        booking_base_url?: string;
        verification?: {
          status?: CheckStatus;
          checked_at?: string;
          verified_at?: string | null;
          error?: string | null;
        };
      };
      if (!res.ok) throw new Error(typeof body?.error === "string" ? body.error : "Verification failed");

      const normalized = normalizeOrigin(body.booking_base_url ?? value);
      onSaved?.(normalized);
      setValue(normalized ?? value.trim());

      const nextStatus = body.verification?.status ?? "failed";
      const nextSnapshot: VerificationSnapshot = {
        checkStatus: nextStatus,
        lastCheckedAt: body.verification?.checked_at ?? new Date().toISOString(),
        verifiedAt: body.verification?.verified_at ?? null,
        checkError: body.verification?.error ?? null,
      };
      publishVerification(nextSnapshot);

      if (nextStatus !== "verified") {
        setErrorMsg(nextSnapshot.checkError || "Domain not reachable yet. Check DNS and try again.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Verification failed.";
      setErrorMsg(msg);
      publishVerification({ checkStatus: "failed", lastCheckedAt: new Date().toISOString(), verifiedAt: null, checkError: msg });
    } finally {
      setVerifying(false);
    }
  }

  const hasSavedDomain = Boolean(savedValue.trim());
  const isDirty = value.trim() !== savedValue.trim();
  const dns = getDnsHints(savedValue || value);
  const isVerified = checkStatus === "verified";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

      {/* Step 1 — Enter domain */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)" }}>
          <div style={{ flex: 1 }}>
            <label className="tc-form-label" style={{ marginBottom: "var(--space-1)", display: "block" }}>
              Custom domain
            </label>
            <input
              className="tc-input"
              type="url"
              placeholder="https://book.yourdomain.com"
              value={value}
              onChange={(e) => { setValue(e.target.value); setErrorMsg(null); }}
            />
          </div>
          <button
            className="tc-btn tc-btn--primary tc-btn--sm"
            onClick={() => void save()}
            disabled={saving || verifying || !value.trim()}
            style={{ flexShrink: 0, marginBottom: 1 }}
          >
            {saving ? "Saving…" : isDirty || !hasSavedDomain ? "Save domain" : "Saved"}
          </button>
          {hasSavedDomain && !isDirty && (
            <button
              className="tc-btn tc-btn--ghost tc-btn--sm"
              onClick={() => { setValue(""); void save(""); }}
              disabled={saving || verifying}
              style={{ flexShrink: 0, marginBottom: 1, color: "var(--text-tertiary)" }}
            >
              Remove
            </button>
          )}
        </div>
        <p className="tc-form-hint" style={{ margin: 0 }}>
          Booking pages will be served from this domain. Leave blank to use <code>citacal.com</code>.
        </p>
      </div>

      {/* Step 2 — DNS record (shown after saving, hidden once verified) */}
      {hasSavedDomain && !isDirty && !isVerified && (
        <div style={{
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "var(--space-3) var(--space-4)",
            background: "var(--surface-subtle)",
            borderBottom: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: "50%", background: "var(--blue-400)",
              color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>2</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Add this DNS record in your domain provider
            </span>
          </div>
          <div style={{ padding: "var(--space-4)" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 1fr 80px",
              gap: "var(--space-1) var(--space-4)",
              fontSize: 12,
            }}>
              <span style={{ color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</span>
              <span style={{ color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</span>
              <span style={{ color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Target</span>
              <span style={{ color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>TTL</span>
              <code style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>CNAME</code>
              <code style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>
                {dns.label ?? dns.hostname}
              </code>
              <code style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>
                {dnsTargetHost || "cname.vercel-dns.com"}
              </code>
              <code style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>Auto</code>
            </div>
            {!dns.isSubdomain && (
              <p style={{ margin: "var(--space-3) 0 0", fontSize: 12, color: "#dc2626" }}>
                Use a subdomain like <code>book</code>, not the apex domain — apex domains need ALIAS/ANAME instead of CNAME.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 3 — Verify */}
      {hasSavedDomain && !isDirty && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            {isVerified ? (
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "3px 12px",
                borderRadius: "var(--radius-full)", border: "1px solid rgba(34,197,94,0.3)",
                background: "rgba(34,197,94,0.10)", color: "#16a34a",
              }}>
                ✓ Verified{verifiedAt ? ` · ${asLocalTime(verifiedAt)}` : ""}
              </span>
            ) : (
              <>
                <button
                  className="tc-btn tc-btn--secondary tc-btn--sm"
                  onClick={verifyNow}
                  disabled={verifying || saving}
                >
                  {verifying ? "Checking…" : "Verify domain"}
                </button>
                {checkStatus === "failed" && !verifying && (
                  <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                    Not reachable yet
                  </span>
                )}
                {checkStatus === "unchecked" && !verifying && (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    Run after DNS is added
                  </span>
                )}
              </>
            )}
          </div>
          {checkError && !isVerified && (
            <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>{checkError}</p>
          )}
          {lastCheckedAt && (
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-disabled)" }}>
              Last checked {asLocalTime(lastCheckedAt)}
            </p>
          )}
        </div>
      )}

      {errorMsg && (
        <p style={{ margin: 0, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>{errorMsg}</p>
      )}
    </div>
  );
}
