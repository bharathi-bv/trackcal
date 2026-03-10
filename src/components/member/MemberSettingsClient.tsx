"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  TeamAvailabilityMember,
  TeamAvailabilitySlotMeta,
} from "@/lib/team-scheduling";

type MemberData = {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  google_refresh_token: string | null;
  google_calendar_ids?: string[];
  microsoft_refresh_token?: string | null;
  microsoft_calendar_ids?: string[];
  microsoft_access_token?: string | null;
  microsoft_token_expiry?: string | null;
};

type ConnectedCalendarOption = {
  id: string;
  name: string;
  isPrimary: boolean;
  provider: "google" | "microsoft";
};

type MemberEventPreview = {
  id: string;
  name: string;
  slug: string;
  assigned_member_ids: string[];
  team_scheduling_mode: "round_robin" | "collective";
  collective_show_availability_tiers: boolean;
};

type PreviewDiagnostic = {
  slotCount: number | null;
  reason: string | null;
  error: string | null;
  hostTimezone: string | null;
  slotMeta: TeamAvailabilitySlotMeta[];
  selectedMembers: TeamAvailabilityMember[];
  availabilityTiersEnabled: boolean;
  preferredMinimumHostCount: number | null;
  fallbackMinimumHostCount: number | null;
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

export default function MemberSettingsClient({
  member,
  collectiveEvents,
  connectedCalendars = [],
  selectedCalendarIds = [],
}: {
  member: MemberData;
  collectiveEvents: MemberEventPreview[];
  connectedCalendars?: ConnectedCalendarOption[];
  selectedCalendarIds?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "1";
  const calendarConnectedParam = searchParams.get("calendar_connected");
  const calendarErrorParam = searchParams.get("calendar_error");

  const calProvider = member.google_refresh_token
    ? "google"
    : member.microsoft_refresh_token
    ? "microsoft"
    : null;

  const [calConnected, setCalConnected] = React.useState(Boolean(calProvider));
  const [connectedProvider, setConnectedProvider] = React.useState<"google" | "microsoft" | null>(calProvider);
  const [previewEventSlug, setPreviewEventSlug] = React.useState<string>(
    collectiveEvents[0]?.slug ?? ""
  );
  const [previewDate, setPreviewDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<PreviewDiagnostic | null>(null);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [disconnectError, setDisconnectError] = React.useState<string | null>(null);
  const [calendarOptions] = React.useState<ConnectedCalendarOption[]>(connectedCalendars);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(selectedCalendarIds);
  const [savingCalendarSelection, setSavingCalendarSelection] = React.useState(false);

  const selectedPreviewEvent =
    collectiveEvents.find((event) => event.slug === previewEventSlug) ?? null;

  function formatTier(slot: TeamAvailabilitySlotMeta) {
    if (slot.tier === "preferred") return "Preferred";
    if (slot.tier === "other") return "Also available";
    return "Available";
  }

  async function runPreview() {
    if (!previewEventSlug || !previewDate) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await fetch(
        `/api/availability?date=${encodeURIComponent(previewDate)}&event=${encodeURIComponent(previewEventSlug)}&details=1`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => ({}))) as {
        slots?: string[] | null;
        reason?: string;
        error?: string;
        hostTimezone?: string;
        slotMeta?: TeamAvailabilitySlotMeta[];
        selectedMembers?: TeamAvailabilityMember[];
        availabilityTiersEnabled?: boolean;
        preferredMinimumHostCount?: number;
        fallbackMinimumHostCount?: number | null;
      };
      setPreview({
        slotCount: Array.isArray(data.slots) ? data.slots.length : null,
        reason: typeof data.reason === "string" ? data.reason : null,
        error: typeof data.error === "string" ? data.error : null,
        hostTimezone: data.hostTimezone ?? null,
        slotMeta: data.slotMeta ?? [],
        selectedMembers: data.selectedMembers ?? [],
        availabilityTiersEnabled: data.availabilityTiersEnabled ?? false,
        preferredMinimumHostCount:
          typeof data.preferredMinimumHostCount === "number"
            ? data.preferredMinimumHostCount
            : null,
        fallbackMinimumHostCount: data.fallbackMinimumHostCount ?? null,
      });
    } catch {
      setPreview({
        slotCount: null,
        reason: null,
        error: "Failed to load preview.",
        hostTimezone: null,
        slotMeta: [],
        selectedMembers: [],
        availabilityTiersEnabled: false,
        preferredMinimumHostCount: null,
        fallbackMinimumHostCount: null,
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDisconnect() {
    const providerLabel = connectedProvider === "microsoft" ? "Outlook Calendar" : "Google Calendar";
    if (!confirm(`Disconnect your ${providerLabel}? Bookings will no longer sync.`)) return;
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await fetch("/api/member/calendar", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to disconnect");
      }
      setCalConnected(false);
      setConnectedProvider(null);
      router.refresh();
    } catch (err) {
      setDisconnectError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSaveCalendarSelection() {
    if (!connectedProvider) return;
    setSavingCalendarSelection(true);
    setDisconnectError(null);
    try {
      const res = await fetch("/api/member/calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          connectedProvider === "microsoft"
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
      setDisconnectError(err instanceof Error ? err.message : "Failed to save calendars");
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
          CitaCal
        </span>
        <Link
          href="/auth/signout"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textDecoration: "none",
          }}
        >
          Sign out
        </Link>
      </div>

      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Success toasts */}
        {(justConnected || calendarConnectedParam) && (
          <div
            className="alert alert-success"
            style={{ marginBottom: "var(--space-6)", fontSize: 13 }}
          >
            {calendarConnectedParam === "microsoft"
              ? "Outlook Calendar connected successfully!"
              : "Google Calendar connected successfully!"}
          </div>
        )}

        {calendarErrorParam && (
          <div
            className="alert alert-error"
            style={{ marginBottom: "var(--space-6)", fontSize: 13 }}
          >
            {calendarErrorParam === "access_denied"
              ? "Calendar connection was cancelled."
              : calendarErrorParam === "no_code"
              ? "No authorization code received. Please try again."
              : "Failed to connect calendar. Please try again."}
          </div>
        )}

        {/* Profile card */}
        <div
          className="tc-card"
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
              Calendar Integration
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
                  <span className="tc-pill tc-pill--success" style={{ fontSize: 11 }}>
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
                    {connectedProvider === "microsoft" ? "Outlook connected" : "Google connected"}
                  </span>
                ) : (
                  <span className="tc-pill tc-pill--warning" style={{ fontSize: 11 }}>
                    Not connected
                  </span>
                )}
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {calConnected
                    ? "Your availability is synced with CitaCal."
                    : "Connect to sync your availability."}
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {!calConnected && (
                  <>
                    <Link
                      href="/api/auth/google/member/self"
                      className="tc-btn tc-btn--primary tc-btn--sm"
                    >
                      Connect Google Calendar
                    </Link>
                    <Link
                      href="/api/auth/microsoft/member/self"
                      className="tc-btn tc-btn--secondary tc-btn--sm"
                    >
                      Connect Outlook Calendar
                    </Link>
                  </>
                )}
                {calConnected && (
                  <>
                    <Link
                      href={connectedProvider === "microsoft" ? "/api/auth/microsoft/member/self" : "/api/auth/google/member/self"}
                      className="tc-btn tc-btn--secondary tc-btn--sm"
                    >
                      Reconnect
                    </Link>
                    <button
                      type="button"
                      className="tc-btn tc-btn--ghost tc-btn--sm"
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

            <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "var(--space-3) 0 0", lineHeight: 1.6 }}>
              <Link href="/terms" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
                Terms
              </Link>{" "}
              ·{" "}
              <Link href="/privacy" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
                Privacy
              </Link>
            </p>

            {disconnectError && (
              <p style={{ fontSize: 12, color: "var(--error)", marginTop: "var(--space-2)" }}>
                {disconnectError}
              </p>
            )}

            {calConnected && connectedProvider && calendarOptions.length > 0 && (
              <div
                style={{
                  marginTop: "var(--space-4)",
                  paddingTop: "var(--space-4)",
                  borderTop: "1px solid var(--border-default)",
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
                    Selected calendars will block open slots on your assigned booking links.
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
                          gap: "var(--space-3)",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${checked ? "rgba(74,158,255,0.28)" : "var(--border-default)"}`,
                          background: checked ? "var(--blue-50)" : "var(--surface-page)",
                          cursor: "pointer",
                        }}
                      >
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
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
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
          </div>
        </div>

        {collectiveEvents.length > 0 && (
          <div
            className="tc-card"
            style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: 0,
                }}
              >
                Team Availability Preview
              </p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                Read-only view of shared meeting availability for event types you are assigned to.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="tc-form-field" style={{ marginBottom: 0 }}>
                <label className="tc-form-label">Event type</label>
                <div className="tc-select-wrap">
                  <select
                    className="tc-input"
                    value={previewEventSlug}
                    onChange={(e) => setPreviewEventSlug(e.target.value)}
                  >
                    {collectiveEvents.map((event) => (
                      <option key={event.id} value={event.slug}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="date"
                  className="tc-input"
                  value={previewDate}
                  onChange={(e) => setPreviewDate(e.target.value)}
                  style={{ width: 180 }}
                />
                <button
                  type="button"
                  className="tc-btn tc-btn--secondary tc-btn--sm"
                  onClick={runPreview}
                  disabled={previewLoading || !previewDate || !previewEventSlug}
                >
                  {previewLoading ? "Checking..." : "Load preview"}
                </button>
                {selectedPreviewEvent && (
                  <span className="tc-pill tc-pill--neutral" style={{ fontSize: 10 }}>
                    {selectedPreviewEvent.team_scheduling_mode === "collective"
                      ? "Collective meeting"
                      : "Round robin"}
                  </span>
                )}
              </div>

              {preview && (
                <div
                  style={{
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-4)",
                    background: "var(--surface-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-3)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {preview.slotCount ?? 0} slots found
                    </span>
                    {preview.hostTimezone && (
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                        Host timezone: {preview.hostTimezone}
                      </span>
                    )}
                    {preview.error && (
                      <span style={{ fontSize: 12, color: "var(--error)" }}>{preview.error}</span>
                    )}
                  </div>

                  {preview.availabilityTiersEnabled && (
                    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          padding: "4px 8px",
                          borderRadius: "var(--radius-full)",
                          background: "rgba(34,197,94,0.14)",
                          border: "1px solid rgba(34,197,94,0.20)",
                        }}
                      >
                        Preferred: all {preview.preferredMinimumHostCount ?? 0} hosts
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          padding: "4px 8px",
                          borderRadius: "var(--radius-full)",
                          background: "rgba(59,130,246,0.12)",
                          border: "1px solid rgba(59,130,246,0.18)",
                        }}
                      >
                        Also available: at least {preview.fallbackMinimumHostCount ?? 0} hosts
                      </span>
                    </div>
                  )}

                  {preview.selectedMembers.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {preview.selectedMembers.map((host) => (
                        <span
                          key={host.id}
                          style={{
                            fontSize: 11,
                            color: host.isConnected ? "var(--text-secondary)" : "var(--text-tertiary)",
                            padding: "4px 8px",
                            borderRadius: "var(--radius-full)",
                            background: host.isConnected ? "rgba(15,118,110,0.10)" : "rgba(148,163,184,0.12)",
                            border: host.isConnected
                              ? "1px solid rgba(15,118,110,0.18)"
                              : "1px solid rgba(148,163,184,0.18)",
                          }}
                        >
                          {host.name}
                          {host.isConnected ? "" : " • no calendar"}
                        </span>
                      ))}
                    </div>
                  )}

                  {preview.slotMeta.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      {preview.slotMeta.slice(0, 8).map((slot) => (
                        <div
                          key={slot.time}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "var(--space-3)",
                            alignItems: "flex-start",
                            padding: "10px 12px",
                            borderRadius: "var(--radius-md)",
                            background:
                              slot.tier === "preferred"
                                ? "rgba(34,197,94,0.10)"
                                : slot.tier === "other"
                                  ? "rgba(59,130,246,0.10)"
                                  : "var(--surface-page)",
                            border:
                              slot.tier === "preferred"
                                ? "1px solid rgba(34,197,94,0.18)"
                                : slot.tier === "other"
                                  ? "1px solid rgba(59,130,246,0.16)"
                                  : "1px solid var(--border-default)",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                              {slot.time}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                              {(slot.availableMemberNames ?? []).join(", ") || `${slot.availableCount} hosts available`}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                            {formatTier(slot)}
                          </span>
                        </div>
                      ))}
                      {preview.slotMeta.length > 8 && (
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          Showing first 8 slots.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
