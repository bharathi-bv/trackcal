"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function IntegrationsClient({
  zoomConnected = false,
  sheetsConnected = false,
  initialSheetId = null,
  initialWebhookUrls = [],
}: {
  zoomConnected?: boolean;
  sheetsConnected?: boolean;
  initialSheetId?: string | null;
  initialWebhookUrls?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [disconnecting, setDisconnecting] = React.useState(false);

  const [zoomConn, setZoomConn] = React.useState(zoomConnected);
  const [sheetsConn, setSheetsConn] = React.useState(sheetsConnected);
  const [sheetUrl, setSheetUrl] = React.useState(initialSheetId ?? "");
  const [savingSheetUrl, setSavingSheetUrl] = React.useState(false);

  const [webhookUrlsText, setWebhookUrlsText] = React.useState(initialWebhookUrls.join("\n"));
  const [savingWebhooks, setSavingWebhooks] = React.useState(false);
  const [webhookSaved, setWebhookSaved] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  // Toast params
  const zoomConnectedParam = searchParams.get("zoom_connected");
  const zoomErrorParam = searchParams.get("zoom_error");
  const sheetsConnectedParam = searchParams.get("sheets_connected");
  const sheetsErrorParam = searchParams.get("sheets_error");

  // ── Zoom handlers ──────────────────────────────────────────────────────────

  async function handleZoomDisconnect() {
    if (!confirm("Disconnect Zoom? New bookings will no longer auto-generate Zoom links.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect_zoom: true }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Disconnect failed");
      setZoomConn(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Zoom.");
    } finally {
      setDisconnecting(false);
    }
  }

  // ── Sheets handlers ────────────────────────────────────────────────────────

  async function handleSheetsDisconnect() {
    if (!confirm("Disconnect Google Sheets? New bookings will no longer be added to your sheet.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect_sheets: true }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Disconnect failed");
      setSheetsConn(false);
      setSheetUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Google Sheets.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSaveSheetUrl() {
    setSavingSheetUrl(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: sheetUrl.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sheet URL.");
    } finally {
      setSavingSheetUrl(false);
    }
  }

  // ── Webhooks handlers ──────────────────────────────────────────────────────

  async function handleSaveWebhooks() {
    setSavingWebhooks(true);
    setWebhookSaved(false);
    setError(null);
    const webhookUrls = webhookUrlsText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_urls: webhookUrls }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      setWebhookSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save webhooks.");
    } finally {
      setSavingWebhooks(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Page header */}
      <div className="dashboard-page-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Integrations
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Connect your calendar, video conferencing, and data tools.
          </p>
        </div>
      </div>

      {zoomConnectedParam === "1" && (
        <div style={{ marginBottom: "var(--space-5)", fontSize: 13, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-success-light, #dcfce7)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}>
          ✓ Zoom connected successfully.
        </div>
      )}
      {zoomErrorParam && (
        <div style={{ marginBottom: "var(--space-5)", fontSize: 13, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>
          Zoom connection failed: {zoomErrorParam === "no_code" ? "No authorization code received." : zoomErrorParam === "exchange_failed" ? "Token exchange failed. Please try again." : zoomErrorParam}
        </div>
      )}
      {sheetsConnectedParam === "1" && (
        <div style={{ marginBottom: "var(--space-5)", fontSize: 13, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-success-light, #dcfce7)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}>
          ✓ Google Sheets connected successfully. Paste the sheet URL below to start logging bookings.
        </div>
      )}
      {sheetsErrorParam && (
        <div style={{ marginBottom: "var(--space-5)", fontSize: 13, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>
          Google Sheets connection failed: {sheetsErrorParam === "no_code" ? "No authorization code received." : sheetsErrorParam === "exchange_failed" ? "Token exchange failed. Please try again." : sheetsErrorParam}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--error)", margin: "0 0 var(--space-4)" }}>{error}</p>
      )}

      {/* ── Zoom ── */}
      <div className="tc-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <div style={{ marginBottom: "var(--space-5)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--border-default)" }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Video Conferencing
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Zoom</p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              Auto-generate unique Zoom links when a booking is confirmed.
            </p>
            {zoomConn && (
              <span style={{ fontSize: 11, marginTop: "var(--space-2)", display: "inline-flex", padding: "3px 10px", borderRadius: "var(--radius-full)", background: "rgba(61,170,122,0.10)", color: "#2d9969", fontWeight: 600, border: "1px solid rgba(61,170,122,0.20)" }}>
                Zoom connected
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {zoomConn ? (
              <button type="button" className="tc-btn tc-btn--ghost tc-btn--sm" onClick={handleZoomDisconnect} disabled={disconnecting} style={{ color: "var(--error)" }}>
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <Link href="/api/auth/zoom" className="tc-btn tc-btn--secondary tc-btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="8" fill="#2D8CFF"/>
                  <path d="M8 14h16a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" fill="white"/>
                  <path d="M26 18l8-4v12l-8-4v-4z" fill="white"/>
                </svg>
                Connect Zoom
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Google Sheets ── */}
      <div className="tc-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <div style={{ marginBottom: "var(--space-5)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--border-default)" }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Data Export
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Google Sheets</p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              Log every booking as a new row — including UTM source, campaign, and click IDs.
            </p>
            {sheetsConn && (
              <span style={{ fontSize: 11, marginTop: "var(--space-2)", display: "inline-flex", padding: "3px 10px", borderRadius: "var(--radius-full)", background: "rgba(61,170,122,0.10)", color: "#2d9969", fontWeight: 600, border: "1px solid rgba(61,170,122,0.20)" }}>
                Google Sheets connected
              </span>
            )}
          </div>
          {!sheetsConn ? (
            <Link href="/api/auth/google-sheets" className="tc-btn tc-btn--secondary tc-btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="2" width="18" height="20" rx="2" fill="#0F9D58"/>
                <rect x="6" y="7" width="12" height="1.5" rx="0.75" fill="white"/>
                <rect x="6" y="10.5" width="12" height="1.5" rx="0.75" fill="white"/>
                <rect x="6" y="14" width="8" height="1.5" rx="0.75" fill="white"/>
              </svg>
              Connect Google Sheets
            </Link>
          ) : (
            <button type="button" className="tc-btn tc-btn--ghost tc-btn--sm" style={{ color: "var(--error)" }} onClick={handleSheetsDisconnect} disabled={disconnecting}>
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          )}
        </div>

        {sheetsConn && (
          <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-default)" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "var(--space-2)" }}>
              Sheet URL
            </label>
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <input
                className="tc-input"
                style={{ fontSize: 12, flex: 1 }}
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/…"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
              <button type="button" className="tc-btn tc-btn--secondary tc-btn--sm" onClick={handleSaveSheetUrl} disabled={savingSheetUrl}>
                {savingSheetUrl ? "Saving…" : "Save"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "var(--space-2) 0 0", lineHeight: 1.5 }}>
              Paste the URL of any Google Sheet you own or have edit access to. CitaCal will create a &ldquo;Bookings list&rdquo; tab automatically.
            </p>
          </div>
        )}
      </div>

      {/* ── Webhooks ── */}
      <div className="tc-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <div style={{ marginBottom: "var(--space-5)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--border-default)" }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Webhooks
          </h2>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-1)" }}>Booking webhook URLs</p>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 var(--space-3)" }}>
          Server-side POST fired on every confirmed booking — useful for Zapier, Make, or custom CRM.
        </p>
        <textarea
          className="tc-input tc-textarea"
          rows={4}
          placeholder="https://example.com/webhooks/citacal"
          value={webhookUrlsText}
          onChange={(e) => { setWebhookUrlsText(e.target.value); setWebhookSaved(false); }}
          style={{ marginBottom: "var(--space-3)" }}
        />
        <p className="tc-form-hint" style={{ marginBottom: "var(--space-3)" }}>One URL per line.</p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button type="button" className="tc-btn tc-btn--secondary tc-btn--sm" onClick={handleSaveWebhooks} disabled={savingWebhooks}>
            {savingWebhooks ? "Saving…" : "Save webhooks"}
          </button>
          {webhookSaved && <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </div>

    </div>
  );
}
