"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Settings = {
  host_name: string | null;
  profile_photo_url: string | null;
};

export default function SettingsClient({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [hostName, setHostName] = React.useState(initial.host_name ?? "");
  const [photoUrl, setPhotoUrl] = React.useState(initial.profile_photo_url ?? "");
  const [imgError, setImgError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset image error state when URL changes
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
        body: JSON.stringify({ host_name: hostName, profile_photo_url: photoUrl }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = hostName.trim() || "TrackCal";
  const initial_letter = displayName.charAt(0).toUpperCase();
  const showPhoto = photoUrl && !imgError;

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="dashboard-page-header">
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Settings
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginTop: "var(--space-1)",
            }}
          >
            Customize your host profile shown on the booking page.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: "var(--space-6)" }}>
        {/* Avatar preview */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-5)",
            marginBottom: "var(--space-6)",
            paddingBottom: "var(--space-6)",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "var(--radius-full)",
              background: showPhoto ? "var(--surface-subtle)" : "var(--blue-400)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
              color: "white",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "var(--shadow-blue-sm)",
            }}
          >
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setImgError(true)}
              />
            ) : (
              initial_letter
            )}
          </div>
          <div>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {displayName}
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-tertiary)",
                margin: 0,
                marginTop: 2,
              }}
            >
              Shown on your booking page
            </p>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="form-field">
            <label className="form-label">Host Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Bharathi Kannan"
              value={hostName}
              onChange={(e) => {
                setHostName(e.target.value);
                setSaved(false);
              }}
            />
            <p className="form-hint">Displayed on the booking page next to your photo.</p>
          </div>

          <div className="form-field">
            <label className="form-label">Profile Photo URL</label>
            <input
              type="url"
              className="input"
              placeholder="https://..."
              value={photoUrl}
              onChange={(e) => {
                setPhotoUrl(e.target.value);
                setSaved(false);
              }}
            />
            <p className="form-hint">
              Public image URL (LinkedIn headshot, Gravatar, etc). Leave blank to use your
              initial.
            </p>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
                ✓ Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
