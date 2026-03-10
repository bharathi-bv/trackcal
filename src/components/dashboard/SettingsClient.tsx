"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TeamMembersTab, { type TeamMember } from "@/components/dashboard/TeamMembersTab";
import { useUser } from "@clerk/nextjs";
import {
  buildPublicBookingPath,
  shouldUseBookPathPrefix,
  slugifyPublicSegment,
} from "@/lib/public-booking-links";

type Settings = {
  host_name: string | null;
  public_slug?: string | null;
  profile_photo_url: string | null;
  booking_base_url?: string | null;
  booking_base_url_check_status?: string | null;
};

type AccountSettings = {
  email: string;
  canUsePassword: boolean;
  authProviders: string[];
};

const TABS = [
  { id: "profile" as const, label: "Profile" },
  { id: "team" as const, label: "Team Members" },
];

export default function SettingsClient({
  initial,
  account,
  googleAvatarUrl,
  initialTeamMembers = [],
  companyDomainSuggestion = null,
}: {
  initial: Settings;
  account: AccountSettings;
  googleAvatarUrl?: string | null;
  initialTeamMembers?: TeamMember[];
  companyDomainSuggestion?: { domain: string; suggestedBy: string } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: clerkUser } = useUser();

  const defaultTab = searchParams.get("tab") === "team" ? "team" : "profile";
  const [activeTab, setActiveTab] = React.useState<"profile" | "team">(defaultTab);

  const [hostName, setHostName] = React.useState(initial.host_name ?? "");
  const [publicSlug, setPublicSlug] = React.useState(initial.public_slug ?? "");
  const [photoUrl, setPhotoUrl] = React.useState(initial.profile_photo_url ?? googleAvatarUrl ?? "");
  const bookingBaseUrl = initial.booking_base_url ?? "";
  const domainCheckStatus = initial.booking_base_url_check_status ?? null;

  const [imgError, setImgError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [showPasswordForm, setShowPasswordForm] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [passwordSaved, setPasswordSaved] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [canUsePassword, setCanUsePassword] = React.useState(account.canUsePassword);
  const [authProviders, setAuthProviders] = React.useState(account.authProviders);

  const [checkingPublicSlug, setCheckingPublicSlug] = React.useState(false);
  const [publicSlugStatus, setPublicSlugStatus] = React.useState<{
    normalized: string;
    available: boolean;
    reason: string | null;
  } | null>(null);

  const memberConnected = searchParams.get("member_connected") === "1";

  React.useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  React.useEffect(() => {
    if (!publicSlug.trim()) {
      setPublicSlugStatus(null);
      setCheckingPublicSlug(false);
      return;
    }
    const normalized = slugifyPublicSegment(publicSlug);
    if (!normalized) {
      setPublicSlugStatus({ normalized: "", available: false, reason: "invalid" });
      setCheckingPublicSlug(false);
      return;
    }
    setCheckingPublicSlug(true);
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/settings/public-slug?slug=${encodeURIComponent(normalized)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { normalized?: string; available?: boolean; reason?: string | null };
        if (!res.ok) throw new Error("Failed to check username.");
        setPublicSlugStatus({ normalized: data.normalized ?? normalized, available: Boolean(data.available), reason: data.reason ?? null });
      } catch {
        setPublicSlugStatus({ normalized, available: false, reason: "error" });
      } finally {
        setCheckingPublicSlug(false);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [publicSlug]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    if (checkingPublicSlug) {
      setError("Wait for the username availability check to finish.");
      setSaving(false);
      return;
    }
    if (publicSlug.trim() && publicSlugStatus && !publicSlugStatus.available) {
      setError("Choose an available username before saving.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host_name: hostName,
          public_slug: publicSlug.trim() || null,
          profile_photo_url: photoUrl,
        }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Save failed");
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
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => { setPhotoUrl(reader.result as string); setSaved(false); setError(null); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSavePassword() {
    setPasswordSaved(false);
    setPasswordError(null);
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    setSavingPassword(true);
    try {
      await clerkUser?.updatePassword({ newPassword });
    } catch (updateError: unknown) {
      const msg = updateError instanceof Error ? updateError.message : "Failed to update password.";
      setPasswordError(msg);
      setSavingPassword(false);
      return;
    }
    setPasswordSaved(true);
    setCanUsePassword(true);
    setAuthProviders((current) => current.includes("email") ? current : [...current, "email"]);
    setShowPasswordForm(false);
    setNewPassword("");
    setConfirmPassword("");
    router.refresh();
    setSavingPassword(false);
  }

  const displayName = hostName.trim() || "CitaCal";
  const initial_letter = displayName.charAt(0).toUpperCase();
  const showPhoto = photoUrl && !imgError;
  const resolvedBaseUrl =
    bookingBaseUrl.trim().replace(/\/+$/, "") ||
    (typeof window !== "undefined" && /(localhost|127\.0\.0\.1)/i.test(window.location.origin)
      ? window.location.origin
      : "https://citacal.com");
  const normalizedPublicSlug = slugifyPublicSegment(publicSlug);
  const usesBookPrefix = shouldUseBookPathPrefix(resolvedBaseUrl);
  const bookingPathExample = buildPublicBookingPath(normalizedPublicSlug || "your-name", "your-event", usesBookPrefix);
  const passwordButtonLabel = canUsePassword ? "Change password" : "Create password";
  const passwordHelpText = canUsePassword
    ? "Set a new password for email sign-in."
    : "Add a password so you can also sign in with email and password.";

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Page header */}
      <div className="dashboard-page-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Manage your profile and team members.
          </p>
        </div>
      </div>

      {memberConnected && (
        <div style={{ marginBottom: "var(--space-5)", fontSize: 13, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-success-light, #dcfce7)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}>
          ✓ Google Calendar connected successfully for the team member.
        </div>
      )}

      {/* Tabs — analytics underline style */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border-default)", marginBottom: "var(--space-6)" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "var(--space-3) var(--space-5)",
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? "var(--blue-400)" : "var(--text-secondary)",
                border: "none",
                borderBottom: isActive ? "2px solid var(--blue-400)" : "2px solid transparent",
                marginBottom: -2,
                background: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-sans)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              {tab.label}
              {tab.id === "team" && initialTeamMembers.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", background: "var(--surface-subtle)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-full)", color: "var(--text-secondary)" }}>
                  {initialTeamMembers.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Profile tab ── */}
      {activeTab === "profile" && (
        <>
          {/* Account card */}
          <div className="tc-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
            <div style={{ marginBottom: "var(--space-5)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--border-default)" }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Account
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div className="tc-form-field">
                <label className="tc-form-label">Email address</label>
                <input type="email" className="tc-input" value={account.email} disabled />
                <p className="tc-form-hint">Used for sign-in and booking notifications.</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", padding: "var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--surface-subtle)", border: "1px solid var(--border-default)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Password</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>{passwordHelpText}</p>
                  {authProviders.length > 0 && (
                    <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "6px 0 0" }}>
                      Sign-in methods: {authProviders.join(", ")}
                    </p>
                  )}
                </div>
                <button type="button" className="tc-btn tc-btn--secondary tc-btn--sm" onClick={() => { setShowPasswordForm((c) => !c); setPasswordSaved(false); setPasswordError(null); }}>
                  {showPasswordForm ? "Close" : passwordButtonLabel}
                </button>
              </div>

              {showPasswordForm && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-4)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)" }}>
                  <div className="tc-form-field">
                    <label className="tc-form-label">New password</label>
                    <input type="password" className="tc-input" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <div className="tc-form-field">
                    <label className="tc-form-label">Confirm new password</label>
                    <input type="password" className="tc-input" placeholder="Repeat your new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                  {passwordError && <p style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>{passwordError}</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <button type="button" className="tc-btn tc-btn--primary tc-btn--sm" onClick={handleSavePassword} disabled={savingPassword}>
                      {savingPassword ? "Saving…" : passwordButtonLabel}
                    </button>
                    <button type="button" className="tc-btn tc-btn--ghost tc-btn--sm" onClick={() => { setShowPasswordForm(false); setNewPassword(""); setConfirmPassword(""); setPasswordError(null); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {passwordSaved && <p style={{ fontSize: 13, color: "var(--success)", margin: 0, fontWeight: 600 }}>✓ Password updated.</p>}
            </div>
          </div>

          {/* Profile card */}
          <div className="tc-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
            <div style={{ marginBottom: "var(--space-5)", paddingBottom: "var(--space-4)", borderBottom: "1px solid var(--border-default)" }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Profile
              </h2>
            </div>

            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginBottom: "var(--space-6)", paddingBottom: "var(--space-6)", borderBottom: "1px solid var(--border-default)" }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: showPhoto ? "var(--surface-subtle)" : "var(--blue-400)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white", overflow: "hidden", boxShadow: "var(--shadow-blue-sm)" }}>
                  {showPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} onError={() => setImgError(true)} />
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
                  <button type="button" className="tc-btn tc-btn--secondary tc-btn--sm" onClick={() => fileInputRef.current?.click()}>Upload photo</button>
                  {photoUrl && (
                    <button type="button" className="tc-btn tc-btn--ghost tc-btn--sm" style={{ color: "var(--text-tertiary)" }} onClick={() => { setPhotoUrl(""); setSaved(false); }}>
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div className="tc-form-field">
                <label className="tc-form-label">Host Name</label>
                <input type="text" className="tc-input" placeholder="e.g. Bharathi Kannan" value={hostName} onChange={(e) => { setHostName(e.target.value); setSaved(false); }} />
                <p className="tc-form-hint">Displayed on the booking page next to your photo.</p>
              </div>

              <div className="tc-form-field">
                <label className="tc-form-label">Public username</label>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "stretch", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface-page)" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0 12px", fontSize: 13, color: "var(--text-tertiary)", background: "var(--surface-subtle)", borderRight: "1px solid var(--border-default)", whiteSpace: "nowrap" }}>
                    {resolvedBaseUrl.replace(/^https?:\/\//, "")}/{usesBookPrefix ? "book/" : ""}
                  </div>
                  <input
                    type="text"
                    className="tc-input"
                    placeholder="your-name"
                    value={publicSlug}
                    onChange={(e) => { setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSaved(false); setError(null); }}
                    style={{ border: "none", borderRadius: 0 }}
                  />
                </div>
                <p className="tc-form-hint">
                  Your booking links:{" "}
                  <strong>{resolvedBaseUrl}{bookingPathExample}</strong>
                  {!bookingBaseUrl.trim() && (
                    <>
                      {" "}·{" "}
                      <a href="/app/dashboard/integrations" style={{ color: "var(--blue-400)", fontWeight: 600 }}>
                        Add custom domain →
                      </a>
                    </>
                  )}
                  {bookingBaseUrl.trim() && domainCheckStatus === "verified" && (
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: "#16a34a" }}>✓ custom domain</span>
                  )}
                  {bookingBaseUrl.trim() && domainCheckStatus !== "verified" && (
                    <>
                      {" "}·{" "}
                      <a href="/app/dashboard/integrations" style={{ color: "#d97706", fontWeight: 600 }}>
                        Verify domain →
                      </a>
                    </>
                  )}
                </p>

                {companyDomainSuggestion && !bookingBaseUrl.trim() && (
                  <div style={{ marginTop: "var(--space-2)", padding: "var(--space-3) var(--space-4)", background: "rgba(74,158,255,0.06)", border: "1px solid rgba(74,158,255,0.2)", borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <strong style={{ color: "var(--text-primary)" }}>Your team is using a custom domain.</strong>{" "}
                    {companyDomainSuggestion.suggestedBy} has already connected{" "}
                    <code style={{ fontSize: 11 }}>{companyDomainSuggestion.domain}</code> — booking links from your team will use this domain.{" "}
                    <a href="/app/dashboard/integrations" style={{ color: "var(--blue-400)", fontWeight: 600 }}>
                      Set up your domain →
                    </a>
                  </div>
                )}

                <p className="tc-form-hint" style={{ color: checkingPublicSlug ? "var(--text-tertiary)" : publicSlugStatus?.available ? "var(--success)" : (publicSlugStatus?.reason === "taken" || publicSlugStatus?.reason === "invalid" || publicSlugStatus?.reason === "error") ? "var(--error)" : "var(--text-tertiary)" }}>
                  {!publicSlug.trim()
                    ? "Choose the public username that appears before every meeting slug."
                    : checkingPublicSlug ? "Checking username availability…"
                    : publicSlugStatus?.reason === "taken" ? "Username is already taken."
                    : publicSlugStatus?.reason === "invalid" ? "Use lowercase letters, numbers, and hyphens only."
                    : publicSlugStatus?.reason === "error" ? "Could not verify username right now."
                    : publicSlugStatus?.available ? "Username is available."
                    : ""}
                </p>
              </div>

              <div className="tc-form-field">
                <label className="tc-form-label">Photo URL</label>
                <input
                  type="url"
                  className="tc-input"
                  placeholder="https://..."
                  value={photoUrl.startsWith("data:") ? "" : photoUrl}
                  onChange={(e) => { setPhotoUrl(e.target.value); setSaved(false); }}
                />
                <p className="tc-form-hint">
                  {photoUrl.startsWith("data:") ? "Using uploaded photo — save to apply." : "Paste a public URL, or use Upload above."}
                </p>
              </div>
            </div>
          </div>

          {/* Save row */}
          {error && <p style={{ fontSize: 13, color: "var(--error)", margin: "0 0 var(--space-3)" }}>{error}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button className="tc-btn tc-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>}
          </div>
        </>
      )}

      {/* ── Team Members tab ── */}
      {activeTab === "team" && (
        <TeamMembersTab initialMembers={initialTeamMembers} />
      )}
    </div>
  );
}
