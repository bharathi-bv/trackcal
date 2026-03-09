"use client";

import * as React from "react";

export default function AnalyticsIdsEditor({
  initialGaId,
  initialGtmId,
  initialMetaPixelId,
  initialLinkedinPartnerId,
  onSaved,
}: {
  initialGaId?: string | null;
  initialGtmId?: string | null;
  initialMetaPixelId?: string | null;
  initialLinkedinPartnerId?: string | null;
  onSaved?: (next: {
    gaId: string | null;
    gtmId: string | null;
    metaPixelId: string | null;
    linkedinPartnerId: string | null;
  }) => void;
}) {
  const [gaId, setGaId] = React.useState(initialGaId ?? "");
  const [gtmId, setGtmId] = React.useState(initialGtmId ?? "");
  const [metaPixelId, setMetaPixelId] = React.useState(initialMetaPixelId ?? "");
  const [linkedinPartnerId, setLinkedinPartnerId] = React.useState(initialLinkedinPartnerId ?? "");
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          google_analytics_id: gaId.trim() || null,
          google_tag_manager_id: gtmId.trim() || null,
          meta_pixel_id: metaPixelId.trim() || null,
          linkedin_partner_id: linkedinPartnerId.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      }
      setToast({ ok: true, msg: "Saved." });
      onSaved?.({
        gaId: gaId.trim() || null,
        gtmId: gtmId.trim() || null,
        metaPixelId: metaPixelId.trim() || null,
        linkedinPartnerId: linkedinPartnerId.trim() || null,
      });
    } catch (error) {
      setToast({
        ok: false,
        msg: error instanceof Error ? error.message : "Failed to save. Try again.",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="tc-form-field" style={{ margin: 0 }}>
        <label className="tc-form-label">Google Analytics ID</label>
        <input
          className="tc-input"
          placeholder="G-XXXXXXXXXX"
          value={gaId}
          onChange={(e) => setGaId(e.target.value.toUpperCase())}
        />
        <p className="tc-form-hint">
          Used for GA4 pageviews and booking events across your public pages and booking links.
        </p>
      </div>

      <div className="tc-form-field" style={{ margin: 0 }}>
        <label className="tc-form-label">Google Tag Manager ID</label>
        <input
          className="tc-input"
          placeholder="GTM-XXXXXXX"
          value={gtmId}
          onChange={(e) => setGtmId(e.target.value.toUpperCase())}
        />
        <p className="tc-form-hint">
          Loads your GTM container on the app so you can manage additional pixels and tags centrally.
        </p>
      </div>

      <div className="tc-form-field" style={{ margin: 0 }}>
        <label className="tc-form-label">Meta Pixel ID</label>
        <input
          className="tc-input"
          inputMode="numeric"
          placeholder="123456789012345"
          value={metaPixelId}
          onChange={(e) => setMetaPixelId(e.target.value.replace(/\D+/g, ""))}
        />
        <p className="tc-form-hint">
          Loads your Meta Pixel on public pages and booking links so you can track visits and conversion events.
        </p>
      </div>

      <div className="tc-form-field" style={{ margin: 0 }}>
        <label className="tc-form-label">LinkedIn Partner ID</label>
        <input
          className="tc-input"
          inputMode="numeric"
          placeholder="1234567"
          value={linkedinPartnerId}
          onChange={(e) => setLinkedinPartnerId(e.target.value.replace(/\D+/g, ""))}
        />
        <p className="tc-form-hint">
          Loads the LinkedIn Insight Tag on public pages and booking links for campaign and conversion tracking.
        </p>
      </div>

      <div
        style={{
          background: "var(--surface-subtle)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-3) var(--space-4)",
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        These IDs are only configurable by your team inside CitaCal. Attendees do not see them in the UI, but the corresponding analytics scripts can run on public pages once you save them.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <button
          className="tc-btn tc-btn--primary tc-btn--sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save analytics IDs"}
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
