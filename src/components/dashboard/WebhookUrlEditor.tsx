"use client";

import * as React from "react";

export default function WebhookUrlEditor({
  initialUrls,
  webhookSecret,
}: {
  initialUrls: string[];
  webhookSecret?: string | null;
}) {
  const [urlsText, setUrlsText] = React.useState(initialUrls.join("\n"));
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setToast(null);
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ webhook_urls: urls }),
      });
      if (!res.ok) throw new Error("Save failed");
      setToast({ ok: true, msg: "Saved!" });
    } catch {
      setToast({ ok: false, msg: "Failed to save. Try again." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="tc-form-field" style={{ margin: 0 }}>
        <label className="tc-form-label">Webhook URL(s)</label>
        <textarea
          className="tc-input"
          rows={3}
          placeholder={"https://hooks.zapier.com/hooks/catch/...\nhttps://your-other-endpoint.com/webhook"}
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          style={{ fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
        />
        <p className="tc-form-hint">One URL per line. CitaCal will POST a JSON payload to each URL when a booking is made.</p>
      </div>

      {webhookSecret && (
        <div
          style={{
            background: "var(--surface-subtle)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3) var(--space-4)",
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>Signing secret: </span>
          <code style={{ fontFamily: "monospace", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            {webhookSecret}
          </code>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "var(--space-1) 0 0" }}>
            Verify with header <code>x-citacal-signature</code> (HMAC-SHA256).
          </p>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <button
          className="tc-btn tc-btn--primary tc-btn--sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save webhook URLs"}
        </button>
        {toast && (
          <span style={{ fontSize: 13, color: toast.ok ? "#22c55e" : "#ef4444", fontWeight: 500 }}>
            {toast.msg}
          </span>
        )}
      </div>
    </div>
  );
}
