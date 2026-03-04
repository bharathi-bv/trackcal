"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TeamMembersTab, { type TeamMember } from "@/components/dashboard/TeamMembersTab";

type Settings = {
  host_name: string | null;
  profile_photo_url: string | null;
  booking_base_url?: string | null;
  webhook_urls?: unknown;
  calendar_provider?: "google" | "microsoft" | null;
  google_refresh_token?: string | null;
  microsoft_refresh_token?: string | null;
  google_calendar_ids?: string[];
  microsoft_calendar_ids?: string[];
};

type ConnectedCalendarOption = {
  id: string;
  name: string;
  isPrimary: boolean;
  provider: "google" | "microsoft";
};

export default function SettingsClient({
  initial,
  googleAvatarUrl,
  initialTeamMembers = [],
  calendarConnected = false,
  calendarProvider = null,
  connectedCalendars = [],
  selectedCalendarIds = [],
  zoomConnected = false,
  sheetsConnected = false,
  initialSheetId = null,
}: {
  initial: Settings;
  googleAvatarUrl?: string | null;
  initialTeamMembers?: TeamMember[];
  calendarConnected?: boolean;
  calendarProvider?: "google" | "microsoft" | null;
  connectedCalendars?: ConnectedCalendarOption[];
  selectedCalendarIds?: string[];
  zoomConnected?: boolean;
  sheetsConnected?: boolean;
  initialSheetId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If callback redirected with ?tab=team, open team tab automatically
  const defaultTab = searchParams.get("tab") === "team" ? "team" : "profile";
  const [activeTab, setActiveTab] = React.useState<"profile" | "team">(defaultTab);

  const [hostName, setHostName] = React.useState(initial.host_name ?? "");
  const [photoUrl, setPhotoUrl] = React.useState(
    initial.profile_photo_url ?? googleAvatarUrl ?? ""
  );
  const [bookingBaseUrl, setBookingBaseUrl] = React.useState(initial.booking_base_url ?? "");
  const [webhookUrlsText, setWebhookUrlsText] = React.useState(
    Array.isArray(initial.webhook_urls)
      ? initial.webhook_urls.filter((v): v is string => typeof v === "string").join("\n")
      : ""
  );
  const [imgError, setImgError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [calConnected, setCalConnected] = React.useState(calendarConnected);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [provider, setProvider] = React.useState<"google" | "microsoft" | null>(calendarProvider);
  const [zoomConn, setZoomConn] = React.useState(zoomConnected);
  const [sheetsConn, setSheetsConn] = React.useState(sheetsConnected);
  const [sheetUrl, setSheetUrl] = React.useState(initialSheetId ?? "");
  const [savingSheetUrl, setSavingSheetUrl] = React.useState(false);
  const [calendarOptions] = React.useState<ConnectedCalendarOption[]>(connectedCalendars);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(selectedCalendarIds);
  const [savingCalendarSelection, setSavingCalendarSelection] = React.useState(false);

  // Show "Calendar connected" toast when returning from member OAuth
  const memberConnected = searchParams.get("member_connected") === "1";
  const hostCalendarConnected = searchParams.get("calendar_connected");
  const zoomConnectedParam = searchParams.get("zoom_connected");
  const zoomErrorParam = searchParams.get("zoom_error");
  const sheetsConnectedParam = searchParams.get("sheets_connected");
  const sheetsErrorParam = searchParams.get("sheets_error");

  React.useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const webhookUrls = webhookUrlsText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host_name: hostName,
          profile_photo_url: photoUrl,
          booking_base_url: bookingBaseUrl,
          webhook_urls: webhookUrls,
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

  async function handleZoomDisconnect() {
    if (!confirm("Disconnect Zoom? New bookings will no longer auto-generate Zoom links.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect_zoom: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Disconnect failed");
      }
      setZoomConn(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Zoom.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSheetsDisconnect() {
    if (!confirm("Disconnect Google Sheets? New bookings will no longer be added to your sheet.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect_sheets: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Disconnect failed");
      }
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Save failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sheet URL.");
    } finally {
      setSavingSheetUrl(false);
    }
  }

  async function handleDisconnectCalendar() {
    const providerLabel = provider === "microsoft" ? "Outlook Calendar" : "Google Calendar";
    if (!confirm(`Disconnect your ${providerLabel}? Bookings will no longer sync.`)) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect_calendar: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Disconnect failed");
      }
      setCalConnected(false);
      setProvider(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect calendar.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSaveCalendarSelection() {
    if (!provider) return;
    setSavingCalendarSelection(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          provider === "microsoft"
            ? { microsoft_calendar_ids: selectedIds }
            : { google_calendar_ids: selectedIds }
        ),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save calendars");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save calendars.");
    } finally {
      setSavingCalendarSelection(false);
    }
  }

  function toggleCalendarSelection(calendarId: string) {
    setSelectedIds((current) =>
      current.includes(calendarId)
        ? current.filter((id) => id !== calendarId)
        : [...current, calendarId]
    );
    setSaved(false);
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

  const displayName = hostName.trim() || "CitaCal";
  const initial_letter = displayName.charAt(0).toUpperCase();
  const showPhoto = photoUrl && !imgError;

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Page header */}
      <div className="dashboard-page-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Settings
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Manage your profile, integrations, and team members.
          </p>
        </div>
      </div>

      {/* Member connected toast */}
      {memberConnected && (
        <div style={{ marginBottom: "var(--space-5)", fontSize: 13, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-success-light, #dcfce7)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}>
          ✓ Google Calendar connected successfully for the team member.
        </div>
      )}

      {hostCalendarConnected && (
        <div style={{ marginBottom: "var(--space-5)", fontSize: 13, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-success-light, #dcfce7)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}>
          ✓ {hostCalendarConnected === "microsoft" ? "Outlook Calendar" : "Google Calendar"} connected successfully.
        </div>
      )}

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

      {/* Tab switcher */}
      <div className="tc-tabs-pill" style={{ marginBottom: "var(--space-6)" }}>
        <button
          className={`tc-tab-pill${activeTab === "profile" ? " active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile &amp; Availability
        </button>
        <button
          className={`tc-tab-pill${activeTab === "team" ? " active" : ""}`}
          onClick={() => setActiveTab("team")}
        >
          Team Members
          {initialTeamMembers.length > 0 && (
            <span
              style={{
                marginLeft: "var(--space-2)",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-full)",
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                color: "var(--text-secondary)",
              }}
            >
              {initialTeamMembers.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Profile & Availability tab ── */}
      {activeTab === "profile" && (
        <>
          {/* Profile card */}
          <div className="tc-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
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
                  <button type="button" className="tc-btn tc-btn--secondary tc-btn--sm" onClick={() => fileInputRef.current?.click()}>
                    Upload photo
                  </button>
                  {photoUrl && (
                    <button type="button" className="tc-btn tc-btn--ghost tc-btn--sm" style={{ color: "var(--text-tertiary)" }} onClick={() => { setPhotoUrl(""); setSaved(false); }}>
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Calendar provider status + actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                marginBottom: "var(--space-5)",
                paddingBottom: "var(--space-5)",
                borderBottom: "1px solid var(--border-default)",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 var(--space-1)" }}>
                  Calendar Integration
                </p>
                {calConnected ? (
                  <span className="tc-pill tc-pill--success" style={{ fontSize: 11 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", flexShrink: 0, display: "inline-block", marginRight: 4 }} />
                    {provider === "microsoft" ? "Outlook connected" : "Google connected"}
                  </span>
                ) : (
                  <span className="tc-pill tc-pill--warning" style={{ fontSize: 11 }}>Not connected</span>
                )}
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {!calConnected && (
                  <>
                    <a href="/api/auth/google" className="tc-btn tc-btn--secondary tc-btn--sm">
                      Connect Google
                    </a>
                    <a href="/api/auth/microsoft" className="tc-btn tc-btn--secondary tc-btn--sm">
                      Connect Outlook
                    </a>
                  </>
                )}
                {calConnected && (
                  <>
                    <a href="/api/auth/google" className="tc-btn tc-btn--secondary tc-btn--sm">
                      Use Google
                    </a>
                    <a href="/api/auth/microsoft" className="tc-btn tc-btn--secondary tc-btn--sm">
                      Use Outlook
                    </a>
                    <button
                      type="button"
                      className="tc-btn tc-btn--ghost tc-btn--sm"
                      style={{ color: "var(--error)" }}
                      onClick={handleDisconnectCalendar}
                      disabled={disconnecting}
                    >
                      {disconnecting ? "Disconnecting…" : "Disconnect calendar"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {calConnected && provider && calendarOptions.length > 0 && (
              <div
                style={{
                  marginBottom: "var(--space-5)",
                  paddingBottom: "var(--space-5)",
                  borderBottom: "1px solid var(--border-default)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Calendars used for availability
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
                    Selected calendars will block open slots on your booking links.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {calendarOptions.map((calendar) => {
                    const checked = selectedIds.includes(calendar.id);
                    return (
                      <label
                        key={calendar.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "var(--space-3)",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${checked ? "rgba(74,158,255,0.28)" : "var(--border-default)"}`,
                          background: checked ? "var(--blue-50)" : "var(--surface-page)",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCalendarSelection(calendar.id)}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {calendar.name}
                            </div>
                            {calendar.isPrimary && (
                              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                                Default calendar
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {selectedIds.length} calendar{selectedIds.length === 1 ? "" : "s"} selected
                  </span>
                  <button
                    type="button"
                    className="tc-btn tc-btn--secondary tc-btn--sm"
                    onClick={handleSaveCalendarSelection}
                    disabled={savingCalendarSelection}
                  >
                    {savingCalendarSelection ? "Saving…" : "Save calendar selection"}
                  </button>
                </div>
              </div>
            )}

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div className="tc-form-field">
                <label className="tc-form-label">Host Name</label>
                <input type="text" className="tc-input" placeholder="e.g. Bharathi Kannan" value={hostName} onChange={(e) => { setHostName(e.target.value); setSaved(false); }} />
                <p className="tc-form-hint">Displayed on the booking page next to your photo.</p>
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

              <div className="tc-form-field">
                <label className="tc-form-label">Booking Base URL (Custom Domain)</label>
                <input
                  type="url"
                  className="tc-input"
                  placeholder="https://book.yourdomain.com"
                  value={bookingBaseUrl}
                  onChange={(e) => {
                    setBookingBaseUrl(e.target.value);
                    setSaved(false);
                  }}
                />
                <p className="tc-form-hint">
                  Use only the domain (for example: https://book.yourdomain.com). Leave blank to use the current app domain.
                </p>
              </div>

              <div className="tc-form-field">
                <label className="tc-form-label">Booking webhook URLs</label>
                <textarea
                  className="tc-input tc-textarea"
                  rows={4}
                  placeholder="https://example.com/webhooks/citacal"
                  value={webhookUrlsText}
                  onChange={(e) => {
                    setWebhookUrlsText(e.target.value);
                    setSaved(false);
                  }}
                />
                <p className="tc-form-hint">
                  One URL per line. Sent server-side on confirmed bookings.
                </p>
              </div>
            </div>
          </div>

          {/* Zoom / Meetings section */}
          <div className="tc-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Zoom Integration
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "var(--space-1) 0 0" }}>
                Auto-generate Zoom meeting links when a booking is confirmed with Zoom as the location.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              {zoomConn ? (
                <>
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: "var(--radius-full)", background: "rgba(61,170,122,0.10)", color: "#2d9969", fontWeight: 600, border: "1px solid rgba(61,170,122,0.20)" }}>
                    Zoom connected
                  </span>
                  <button
                    type="button"
                    className="tc-btn tc-btn--ghost tc-btn--sm"
                    onClick={handleZoomDisconnect}
                    disabled={disconnecting}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <a href="/api/auth/zoom" className="tc-btn tc-btn--secondary tc-btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                    <rect width="40" height="40" rx="8" fill="#2D8CFF"/>
                    <path d="M8 14h16a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" fill="white"/>
                    <path d="M26 18l8-4v12l-8-4v-4z" fill="white"/>
                  </svg>
                  Connect Zoom
                </a>
              )}
            </div>
          </div>

          {/* Google Sheets section */}
          <div className="tc-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Google Sheets
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "var(--space-1) 0 0" }}>
                Log every booking as a new row in a Google Sheet — including UTM source, campaign, and click IDs.
              </p>
            </div>

            {sheetsConn ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: "var(--radius-full)", background: "rgba(61,170,122,0.10)", color: "#2d9969", fontWeight: 600, border: "1px solid rgba(61,170,122,0.20)" }}>
                    Google Sheets connected
                  </span>
                  <button
                    type="button"
                    className="tc-btn tc-btn--ghost tc-btn--sm"
                    onClick={handleSheetsDisconnect}
                    disabled={disconnecting}
                  >
                    Disconnect
                  </button>
                </div>

                {/* Sheet URL input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
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
                    <button
                      type="button"
                      className="tc-btn tc-btn--secondary tc-btn--sm"
                      onClick={handleSaveSheetUrl}
                      disabled={savingSheetUrl}
                    >
                      {savingSheetUrl ? "Saving…" : "Save"}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.5 }}>
                    Paste the URL of any Google Sheet you own or have edit access to — including shared drive files.
                    CitaCal will automatically create a &ldquo;Bookings list&rdquo; tab and manage all column headers.{" "}
                    <strong style={{ color: "var(--text-secondary)" }}>Do not add data in new columns of that tab</strong> — CitaCal controls the column schema automatically.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div>
                  <a
                    href="/api/auth/google-sheets"
                    className="tc-btn tc-btn--secondary tc-btn--sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="2" width="18" height="20" rx="2" fill="#0F9D58"/>
                      <rect x="6" y="7" width="12" height="1.5" rx="0.75" fill="white"/>
                      <rect x="6" y="10.5" width="12" height="1.5" rx="0.75" fill="white"/>
                      <rect x="6" y="14" width="8" height="1.5" rx="0.75" fill="white"/>
                    </svg>
                    Connect Google Sheets
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Save row */}
          {error && <p style={{ fontSize: 13, color: "var(--error)", margin: "0 0 var(--space-3)" }}>{error}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button className="tc-btn tc-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>
            )}
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
