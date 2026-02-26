"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import WeeklyAvailabilityEditor from "@/components/dashboard/WeeklyAvailabilityEditor";
import {
  DEFAULT_WEEKLY_AVAILABILITY,
  normalizeWeeklyAvailability,
  type WeeklyAvailability,
} from "@/lib/event-type-config";

type Settings = {
  host_name: string | null;
  profile_photo_url: string | null;
  weekly_availability: unknown;
};

export default function SettingsClient({
  initial,
  googleAvatarUrl,
}: {
  initial: Settings;
  googleAvatarUrl?: string | null;
}) {
  const router = useRouter();
  const [hostName, setHostName] = React.useState(initial.host_name ?? "");
  // Auto-populate with Google avatar if no saved photo yet
  const [photoUrl, setPhotoUrl] = React.useState(
    initial.profile_photo_url ?? googleAvatarUrl ?? ""
  );
  const [weeklyAvailability, setWeeklyAvailability] = React.useState<WeeklyAvailability>(
    normalizeWeeklyAvailability(initial.weekly_availability)
  );
  const [imgError, setImgError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host_name: hostName,
          profile_photo_url: photoUrl,
          weekly_availability: weeklyAvailability,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
      setSaved(false);
      setError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const displayName = hostName.trim() || "TrackCal";
  const initial_letter = displayName.charAt(0).toUpperCase();
  const showPhoto = photoUrl && !imgError;

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="dashboard-page-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Your host profile and default availability for all event types.
          </p>
        </div>
      </div>

      {/* ── Profile card ── */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <div style={{ marginBottom: "var(--space-5)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--border-default)" }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>Profile</h2>
        </div>

        {/* Avatar preview + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginBottom: "var(--space-6)", paddingBottom: "var(--space-6)", borderBottom: "1px solid var(--border-default)" }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: "var(--radius-full)", background: showPhoto ? "var(--surface-subtle)" : "var(--blue-400)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white", overflow: "hidden", boxShadow: "var(--shadow-blue-sm)" }}>
              {showPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgError(true)} />
              ) : (
                initial_letter
              )}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{displayName}</p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "2px 0 var(--space-3)", fontWeight: 500 }}>Shown on your booking page</p>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                Upload photo
              </button>
              {photoUrl && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--text-tertiary)" }} onClick={() => { setPhotoUrl(""); setSaved(false); }}>
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="form-field">
            <label className="form-label">Host Name</label>
            <input type="text" className="input" placeholder="e.g. Bharathi Kannan" value={hostName} onChange={(e) => { setHostName(e.target.value); setSaved(false); }} />
            <p className="form-hint">Displayed on the booking page next to your photo.</p>
          </div>

          <div className="form-field">
            <label className="form-label">Photo URL</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={photoUrl.startsWith("data:") ? "" : photoUrl}
              onChange={(e) => { setPhotoUrl(e.target.value); setSaved(false); }}
            />
            <p className="form-hint">
              {photoUrl.startsWith("data:") ? "Using uploaded photo — save to apply." : "Paste a public URL, or use Upload above."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Availability card ── */}
      <div className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <div style={{ marginBottom: "var(--space-5)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--border-default)" }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>Default Availability</h2>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Applied to all event types unless they set a custom schedule.
          </p>
        </div>

        <WeeklyAvailabilityEditor
          value={weeklyAvailability}
          onChange={(v) => { setWeeklyAvailability(v); setSaved(false); }}
        />

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: "var(--space-3)", fontSize: 11, color: "var(--text-tertiary)" }}
          onClick={() => { setWeeklyAvailability(DEFAULT_WEEKLY_AVAILABILITY); setSaved(false); }}
        >
          Reset to Mon–Fri 9–5
        </button>
      </div>

      {/* ── Save row ── */}
      {error && <p style={{ fontSize: 13, color: "var(--error)", margin: "0 0 var(--space-3)" }}>{error}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>
        )}
      </div>
    </div>
  );
}
