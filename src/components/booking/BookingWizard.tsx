"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useBookingStore } from "@/store/bookingStore";
import DetailsForm from "@/components/booking/DetailsForm";
import ThreeDaySlotPicker from "@/components/booking/ThreeDaySlotPicker";
import {
  trackBookingPageview,
  trackBookingConversion,
} from "@/lib/analytics";
import {
  normalizeTrackingEventAliases,
  resolveTrackingEventName,
  type TrackingEventAliases,
  type TrackingEventKey,
} from "@/lib/tracking-events";

// Lazy-load TimezonePicker — 600 IANA zones only needed when user opens the dropdown
const TimezonePicker = dynamic(() => import("@/components/booking/TimezonePicker"), {
  ssr: false,
  loading: () => (
    <button style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--surface-page)", fontSize: 11, color: "var(--text-tertiary)", fontFamily: "inherit" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
      Loading…
    </button>
  ),
});

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatSelectedDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDateCompact(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

type VisitorCalendarOption = {
  id: string;
  name: string;
  isPrimary: boolean;
};

type VisitorCalendarState = {
  token: string;
  provider: "google" | "outlook";
  calendars: VisitorCalendarOption[];
  selectedCalendarIds: string[];
  busy: Record<string, { start: string; end: string }[]>;
};

/* ── VisitorCalendarConnectBanner ─────────────────────────────────────────
   Shown above the slot picker. Lets visitors connect their Google or Outlook
   calendar to see their busy times as overlays directly in the time grid.  */

function CalendarPickerModal({
  gisReady,
  msReady,
  onConnectGoogle,
  onConnectOutlook,
  onClose,
}: {
  gisReady: boolean;
  msReady: boolean;
  onConnectGoogle: () => void;
  onConnectOutlook: () => void;
  onClose: () => void;
}) {
  const [showEmail, setShowEmail] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const optionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    width: "100%",
    padding: "var(--space-3) var(--space-4)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-default)",
    background: "var(--surface-page)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "var(--text-primary)",
    textAlign: "left" as const,
    transition: "background 0.12s",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface-page)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          width: "100%",
          maxWidth: 360,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "var(--space-3)",
            right: "var(--space-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            fontSize: 20,
            lineHeight: 1,
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          ×
        </button>

        {/* Heading */}
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Connect your calendar
          </p>
          <p style={{ margin: "var(--space-1) 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
            Your events are read-only and never stored.
          </p>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {gisReady && (
            <button
              type="button"
              style={optionStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-page)")}
              onClick={() => { onConnectGoogle(); onClose(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          )}

          {msReady && (
            <button
              type="button"
              style={optionStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-page)")}
              onClick={() => { onConnectOutlook(); onClose(); }}
            >
              <svg width="18" height="18" viewBox="0 0 23 23" style={{ flexShrink: 0 }}>
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Continue with Outlook
            </button>
          )}

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
          </div>

          {/* Email option */}
          {!showEmail ? (
            <button
              type="button"
              style={optionStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-page)")}
              onClick={() => setShowEmail(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Continue with email
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <input
                type="email"
                className="tc-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="tc-btn tc-btn--primary"
                style={{ width: "100%" }}
                disabled={!email.includes("@")}
              >
                Connect
              </button>
            </div>
          )}
        </div>

        <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}>
          Read-only · Not stored · Revoked when you leave
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.6 }}>
          <Link href="/terms" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
            Privacy
          </Link>
        </p>
      </div>
    </div>
  );
}

function VisitorCalendarSelectionModal({
  provider,
  calendars,
  selectedCalendarIds,
  saving,
  onToggle,
  onSave,
  onClose,
}: {
  provider: "google" | "outlook";
  calendars: VisitorCalendarOption[];
  selectedCalendarIds: string[];
  saving: boolean;
  onToggle: (calendarId: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface-page)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          width: "100%",
          maxWidth: 420,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          position: "relative",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "var(--space-3)",
            right: "var(--space-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            fontSize: 20,
            lineHeight: 1,
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          ×
        </button>

        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Choose calendars to overlay
          </p>
          <p style={{ margin: "var(--space-1) 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
            Selected {provider === "outlook" ? "Outlook" : "Google"} calendars will show your busy
            times on this page only.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: 320, overflowY: "auto" }}>
          {calendars.map((calendar) => {
            const checked = selectedCalendarIds.includes(calendar.id);
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
                  onChange={() => onToggle(calendar.id)}
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

        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {selectedCalendarIds.length} calendar{selectedCalendarIds.length === 1 ? "" : "s"} selected
          </span>
          <button
            type="button"
            className="tc-btn tc-btn--primary"
            onClick={onSave}
            disabled={saving || selectedCalendarIds.length === 0}
          >
            {saving ? "Updating…" : "Update overlay"}
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.6 }}>
          <Link href="/terms" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" style={{ color: "var(--blue-400)", fontWeight: 500 }}>
            Privacy
          </Link>
        </p>
      </div>
    </div>
  );
}

function BannerToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: "none",
        background: on ? "var(--color-primary)" : "var(--border-default)",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        padding: 0,
        transition: "background 0.2s",
      }}
    >
      <span
        style={{
          display: "block",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.22)",
        }}
      />
    </button>
  );
}

function VisitorCalendarConnectBanner({
  connected,
  provider,
  selectedLabel,
  loading,
  gisReady,
  msReady,
  onConnectGoogle,
  onConnectOutlook,
  onDisconnect,
  onEditSelection,
}: {
  connected: boolean;
  provider: "google" | "outlook" | null;
  selectedLabel: string | null;
  loading: boolean;
  gisReady: boolean;
  msReady: boolean;
  onConnectGoogle: () => void;
  onConnectOutlook: () => void;
  onDisconnect: () => void;
  onEditSelection: () => void;
}) {
  const [showModal, setShowModal] = React.useState(false);

  // Loading — initial connect in progress
  if (loading) {
    return (
      <div
        style={{
          padding: "var(--space-2) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface-subtle)",
          border: "1px solid var(--border-default)",
          fontSize: 12,
          color: "var(--text-tertiary)",
        }}
      >
        Loading your calendar…
      </div>
    );
  }

  // Nothing to show if no providers are configured
  if (!gisReady && !msReady) return null;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-lg)",
          background: connected ? "rgba(61,170,122,0.06)" : "var(--surface-subtle)",
          border: `1px solid ${connected ? "rgba(61,170,122,0.20)" : "var(--border-default)"}`,
        }}
      >
        {/* Provider icon when connected */}
        {connected && (
          <span style={{ flexShrink: 0, display: "flex" }}>
            {provider === "google" ? (
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
            )}
          </span>
        )}

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {connected ? (
            <>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                {selectedLabel}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 6 }}>
                · busy times shown in grid
              </span>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                Overlay your calendar
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>
                Compare your availability here
              </p>
            </>
          )}
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {connected && (
            <button
              type="button"
              className="tc-btn tc-btn--ghost tc-btn--sm"
              onClick={onEditSelection}
            >
              Choose calendars
            </button>
          )}
          <BannerToggle
            on={connected}
            onClick={connected ? onDisconnect : () => setShowModal(true)}
          />
        </div>
      </div>

      {showModal && (
        <CalendarPickerModal
          gisReady={gisReady}
          msReady={msReady}
          onConnectGoogle={onConnectGoogle}
          onConnectOutlook={onConnectOutlook}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ── Step header ────────────────────────────────────────────────────────────

const STEP_META: Record<number, { label: string }> = {
  1: { label: "STEP 1 OF 2 — SELECT TIME" },
  2: { label: "STEP 2 OF 2 — YOUR DETAILS" },
  4: { label: "BOOKING CONFIRMED" },
};

// ── Left Panel ─────────────────────────────────────────────────────────────

function LeftPanel({
  name,
  duration,
  description,
  hostName,
  hostPhotoUrl,
  // Mini calendar injected here in step 1
  calendarContent,
  // shown only in step 2
  selectedDate,
  selectedTime,
  step,
  isMobile,
}: {
  name?: string;
  duration?: number;
  description?: string | null;
  hostName?: string | null;
  hostPhotoUrl?: string | null;
  calendarContent?: React.ReactNode;
  selectedDate?: string | null;
  selectedTime?: string | null;
  step: number;
  isMobile?: boolean;
}) {
  const eventName = name ?? "Discovery Call";
  const eventDuration = duration ?? 30;
  const displayName = hostName?.trim() || "CitaCal";
  const initial = displayName.charAt(0).toUpperCase();
  const [imgError, setImgError] = React.useState(false);
  const showPhoto = hostPhotoUrl && !imgError;

  const avatarInner = showPhoto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hostPhotoUrl!}
      alt={displayName}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      onError={() => setImgError(true)}
    />
  ) : hostName ? (
    initial
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  // ── Mobile: compact top strip ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        style={{
          borderBottom: "1px solid var(--border-default)",
          padding: "var(--space-3) var(--space-5)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        {/* Compact avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-full)",
            background: showPhoto ? "var(--surface-subtle)" : "var(--blue-400)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: showPhoto ? undefined : 14,
            fontWeight: 800,
            color: "white",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {avatarInner}
        </div>

        {/* Event info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 1 }}>
            {displayName} · {eventDuration} min
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {eventName}
          </div>
        </div>

        {/* Step 2: selected slot chip */}
        {step === 2 && selectedDate && selectedTime && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--blue-500)",
              background: "var(--blue-50)",
              border: "1px solid rgba(74,158,255,0.25)",
              borderRadius: "var(--radius-full)",
              padding: "4px 10px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {formatDateCompact(selectedDate)} · {selectedTime}
          </div>
        )}
      </div>
    );
  }

  // ── Desktop: full left panel ───────────────────────────────────────────
  return (
    <div
      className="booking-wizard-left"
      style={{
        width: 280,
        flexShrink: 0,
        borderRight: "1px solid var(--border-default)",
        padding: "var(--space-8) var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
        overflowY: "auto",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-full)",
          background: showPhoto ? "var(--surface-subtle)" : "var(--blue-400)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: showPhoto ? undefined : hostName ? 20 : 24,
          fontWeight: 800,
          color: "white",
          overflow: "hidden",
          boxShadow: "var(--shadow-blue-sm)",
          flexShrink: 0,
        }}
      >
        {avatarInner}
      </div>

      {/* Display name + event title */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
          {displayName}
        </span>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {eventName}
        </h2>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-default)" }} />

      {/* Duration only — Video Call and timezone MetaRows removed */}
      <MetaRow icon="🕐" label={`${eventDuration} minutes`} />

      {/* Description */}
      {description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {description}
        </p>
      )}

      {/* ── Mini calendar (step 1 only) ── */}
      {calendarContent && (
        <>
          <div style={{ height: 1, background: "var(--border-default)" }} />
          {calendarContent}
        </>
      )}

      {/* ── Step 2: show the locked-in date + time ── */}
      {step === 2 && selectedDate && selectedTime && (
        <div
          style={{
            background: "var(--blue-50)",
            border: "1px solid rgba(74,158,255,0.25)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--blue-400)",
            }}
          >
            Selected
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.4,
            }}
          >
            {formatSelectedDate(selectedDate)}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{selectedTime}</span>
        </div>
      )}
    </div>
  );
}

function MetaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--radius-md)",
          background: "var(--blue-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}

// ── Inline Calendar ────────────────────────────────────────────────────────
// Fully decoupled from the booking store — accepts selectedDate + onSelect as props.
// In step 1, selectedDate = anchorDate (which 3-day window is being viewed).

function InlineCalendar({
  viewMonth,
  setViewMonth,
  selectedDate,
  onSelect,
}: {
  viewMonth: Date;
  setViewMonth: (d: Date) => void;
  selectedDate: string | null;
  onSelect: (iso: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const cells = buildCalendarGrid(year, month);

  const canGoPrev =
    viewMonth.getFullYear() > today.getFullYear() ||
    viewMonth.getMonth() > today.getMonth();

  return (
    <div>
      {/* Month nav */}
      <div className="cal-nav">
        <button
          className="tc-btn tc-btn--ghost"
          onClick={() => canGoPrev && setViewMonth(new Date(year, month - 1, 1))}
          disabled={!canGoPrev}
          aria-label="Previous month"
          style={{ opacity: canGoPrev ? 1 : 0.3 }}
        >
          ‹
        </button>
        <span className="cal-month">{formatMonthYear(viewMonth)}</span>
        <button
          className="tc-btn tc-btn--ghost"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="cal-weekdays">
        {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d) => (
          <div key={d} className="cal-wd">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="cal-days">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;

          const iso = toISODate(date);
          const isPast = date < today;
          const isToday = date.getTime() === today.getTime();
          const isSelected = selectedDate === iso;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          let cls = "cal-day";
          if (isPast || isWeekend) cls += " cal-day-disabled";
          else if (isSelected) cls += " cal-day-selected";
          // today always gets the ring — CSS handles selected+today variant
          if (isToday) cls += " cal-day-today";

          return (
            <button
              key={iso}
              className={cls}
              onClick={() => !isPast && !isWeekend && onSelect(iso)}
              disabled={isPast || isWeekend}
              aria-label={iso}
              aria-pressed={isSelected}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

type EventTypeProp = {
  id: string;
  name: string;
  slug: string;
  duration: number;
  description: string | null;
  start_hour: number;
  end_hour: number;
  slot_increment: number;
};

type HostProfileProp = {
  host_name: string | null;
  profile_photo_url: string | null;
};

type BookingTrackingConfigProp = {
  eventAliases?: TrackingEventAliases | null;
};

// ── Main Wizard ────────────────────────────────────────────────────────────

export default function BookingWizard({
  eventType,
  hostProfile,
  customQuestions = [],
  trackingConfig,
}: {
  eventType?: EventTypeProp;
  hostProfile?: HostProfileProp;
  customQuestions?: import("@/lib/event-type-config").CustomQuestion[];
  trackingConfig?: BookingTrackingConfigProp;
}) {
  const { step, setStep, reset, selectedDate, selectedTime, details, customAnswers, utmParams, setDate, setTime } =
    useBookingStore();

  // anchorDate drives the mini-calendar highlight + which 3 days the picker shows.
  // It is separate from selectedDate (the actual booking).
  const [anchorDate, setAnchorDate] = React.useState<string | null>(() => {
    // Default anchor = today
    return toISODate(new Date());
  });

  const [viewMonth, setViewMonth] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedTimezone, setSelectedTimezone] = React.useState("UTC");
  const [, setHostTimezone] = React.useState("UTC");

  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setSelectedTimezone(tz);
    } catch {
      // keep UTC
    }
  }, []);

  const eventAliases = React.useMemo(
    () => normalizeTrackingEventAliases(trackingConfig?.eventAliases),
    [trackingConfig?.eventAliases]
  );
  const [inviteSent, setInviteSent] = React.useState(false);

  // Fire direct-link analytics events (not iframe embed).
  React.useEffect(() => {
    if (typeof window === "undefined" || window.parent !== window) return;
    if (directTrackingStartedRef.current) return;
    directTrackingStartedRef.current = true;
    trackBookingPageview(utmParams, { eventAliases });
  }, [eventAliases, utmParams]);

  React.useEffect(() => {
    if (typeof window === "undefined" || window.parent !== window) return;
    if (step !== 4 || !selectedDate || !selectedTime || !inviteSent) return;
    const completedKey = `${selectedDate}|${selectedTime}|${details.email}`;
    if (directCompletedKeyRef.current === completedKey) return;
    directCompletedKeyRef.current = completedKey;
    trackBookingConversion(
      { utmParams, date: selectedDate, time: selectedTime, email: details.email },
      { eventAliases }
    );
  }, [details.email, eventAliases, inviteSent, selectedDate, selectedTime, step, utmParams]);

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Show Google connect button as soon as env var is set; load GIS script async
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) setGisReady(true);
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return;
    if (window.google?.accounts?.oauth2 || document.getElementById("gis-script")) return;
    const s = document.createElement("script");
    s.id = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  // Show Outlook connect button if MS client ID is configured
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_MS_CLIENT_ID) setMsReady(true);
  }, []);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [assignedHosts, setAssignedHosts] = React.useState<
    Array<{ id: string; name: string; photo_url: string | null }>
  >([]);
  const [manageUrl, setManageUrl] = React.useState<string | null>(null);

  // ── Visitor calendar ──────────────────────────────────────────────────
  const [visitorCal, setVisitorCal] = React.useState<VisitorCalendarState | null>(null);
  const [visCalLoading, setVisCalLoading] = React.useState(false);
  const [gisReady, setGisReady] = React.useState(false);
  const [msReady, setMsReady] = React.useState(false);
  const [showVisitorCalendarSelection, setShowVisitorCalendarSelection] = React.useState(false);

  const directTrackingStartedRef = React.useRef(false);
  const directCompletedKeyRef = React.useRef<string | null>(null);
  const embedIdRef = React.useRef<string | undefined>(undefined);
  const embedPageviewSentRef = React.useRef(false);
  const lastSelectedSlotRef = React.useRef<string | null>(null);
  const lastConversionKeyRef = React.useRef<string | null>(null);

  const postEmbedEvent = React.useCallback(
    (name: TrackingEventKey, payload: Record<string, unknown> = {}) => {
      if (typeof window === "undefined" || window.parent === window) return;
      if (!embedIdRef.current) {
        const params = new URLSearchParams(window.location.search);
        embedIdRef.current = params.get("embed_id") ?? undefined;
      }
      const aliasName = resolveTrackingEventName(name, eventAliases);
      window.parent.postMessage(
        {
          type: "citacal:booking:event",
          embedId: embedIdRef.current,
          name,
          payload: {
            ...payload,
            citacal_event_alias: aliasName,
          },
          timestamp: Date.now(),
        },
        "*"
      );
    },
    [eventAliases]
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const params = new URLSearchParams(window.location.search);
    embedIdRef.current = params.get("embed_id") ?? undefined;
  }, []);

  // Mini calendar click: update anchor AND clear selection (user picked a new range)
  function handleCalendarClick(iso: string) {
    setAnchorDate(iso);
    setDate(null);
    setTime(null);
  }

  // Prev/Next in slot picker: only shift the 3-day window, keep any selection
  function handlePickerNavigate(iso: string) {
    setAnchorDate(iso);
  }

  // Re-fetch visitor busy when the visible date window shifts
  React.useEffect(() => {
    if (!visitorCal) return;
    fetchVisitorBusy(
      visitorCal.provider,
      visitorCal.token,
      visitorCal.selectedCalendarIds,
      visitorCal.calendars,
      anchorDate ?? toISODate(new Date())
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate]);

  async function fetchVisitorCalendars(provider: "google" | "outlook", token: string) {
    const res = await fetch("/api/visitor-calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, access_token: token }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (err.error === "token_expired") setVisitorCal(null);
      return null;
    }
    const data = (await res.json()) as {
      calendars: VisitorCalendarOption[];
      defaultCalendarIds: string[];
    };
    return data;
  }

  async function fetchVisitorBusy(
    provider: "google" | "outlook",
    token: string,
    selectedCalendarIds: string[],
    calendars: VisitorCalendarOption[],
    anchor: string
  ) {
    setVisCalLoading(true);
    try {
      const dates: string[] = [];
      const start = new Date(anchor + "T00:00:00");
      for (let i = 0; i < 14; i++) {
        const d = new Date(start.getTime());
        d.setDate(start.getDate() + i);
        dates.push(toISODate(d));
      }
      const res = await fetch("/api/visitor-freebusy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          access_token: token,
          dates,
          calendar_ids: selectedCalendarIds,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        if (err.error === "token_expired") setVisitorCal(null);
        return;
      }
      const data = (await res.json()) as {
        busy: Record<string, { start: string; end: string }[]>;
      };
      setVisitorCal({
        token,
        provider,
        calendars,
        selectedCalendarIds,
        busy: data.busy,
      });
    } finally {
      setVisCalLoading(false);
    }
  }

  function handleConnectGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.oauth2) return;
    window.google.accounts.oauth2
      .initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        callback: async (resp: { access_token?: string; error?: string }) => {
          if (resp.error || !resp.access_token) return;
          const data = await fetchVisitorCalendars("google", resp.access_token);
          if (!data) return;
          await fetchVisitorBusy(
            "google",
            resp.access_token,
            data.defaultCalendarIds,
            data.calendars,
            anchorDate ?? toISODate(new Date())
          );
        },
        error_callback: () => { /* user closed popup */ },
      })
      .requestAccessToken();
  }

  function handleConnectOutlook() {
    const clientId = process.env.NEXT_PUBLIC_MS_CLIENT_ID;
    if (!clientId) return;
    const redirectUri = `${window.location.origin}/auth/ms-callback`;
    const msAuthUrl =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent("https://graph.microsoft.com/Calendars.Read")}` +
      `&response_mode=fragment`;
    const popup = window.open(msAuthUrl, "ms-oauth", "width=520,height=680,top=100,left=200");
    if (!popup) return;
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if ((e.data as { type?: string })?.type !== "citacal:ms:callback") return;
      window.removeEventListener("message", onMsg);
      const { token, error } = e.data as { token?: string; error?: string };
      if (error || !token) return;
      void (async () => {
        const data = await fetchVisitorCalendars("outlook", token);
        if (!data) return;
        await fetchVisitorBusy(
          "outlook",
          token,
          data.defaultCalendarIds,
          data.calendars,
          anchorDate ?? toISODate(new Date())
        );
      })();
    }
    window.addEventListener("message", onMsg);
  }

  async function handleSaveVisitorCalendarSelection() {
    if (!visitorCal) return;
    await fetchVisitorBusy(
      visitorCal.provider,
      visitorCal.token,
      visitorCal.selectedCalendarIds,
      visitorCal.calendars,
      anchorDate ?? toISODate(new Date())
    );
    setShowVisitorCalendarSelection(false);
  }

  function toggleVisitorCalendarSelection(calendarId: string) {
    setVisitorCal((current) => {
      if (!current) return current;
      const selectedCalendarIds = current.selectedCalendarIds.includes(calendarId)
        ? current.selectedCalendarIds.filter((id) => id !== calendarId)
        : [...current.selectedCalendarIds, calendarId];
      return { ...current, selectedCalendarIds };
    });
  }

  function handleDisconnectVisitorCal() {
    if (visitorCal?.provider === "google" && visitorCal.token) {
      try { window.google?.accounts?.oauth2?.revoke(visitorCal.token, () => {}); } catch { /* ignore */ }
    }
    setShowVisitorCalendarSelection(false);
    setVisitorCal(null);
  }

  async function handleBookNow() {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          event_slug: eventType?.slug,
          ...details,
          custom_answers: customAnswers,
          ...utmParams,
        }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(
          typeof errorBody?.error === "string" ? errorBody.error : "Booking failed"
        );
      }
      const data = await res.json().catch(() => ({}));
      setAssignedHosts(Array.isArray(data.assigned_hosts) ? data.assigned_hosts : []);
      setManageUrl(data.manage_url ?? null);
      setInviteSent(Boolean(data.invite_sent));
      setStep(4);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBookAnother() {
    setAssignedHosts([]);
    setManageUrl(null);
    setSubmitError(null);
    setInviteSent(false);
    setVisitorCal(null);
    reset();
  }

  const canConfirmTime = Boolean(selectedDate && selectedTime);
  const canContinueDetails =
    Boolean(details.name && details.email) &&
    customQuestions.every((q) => {
      if (!q.required) return true;
      const ans = customAnswers[q.id];
      if (Array.isArray(ans)) return ans.length > 0;
      return typeof ans === "string" && ans.replace(/^__other__:?/, "").trim().length > 0;
    });
  const meta = STEP_META[step] ?? STEP_META[1];

  React.useEffect(() => {
    if (embedPageviewSentRef.current) return;
    embedPageviewSentRef.current = true;
    postEmbedEvent("booking_pageview", {
      event_slug: eventType?.slug ?? null,
      event_name: eventType?.name ?? null,
    });
  }, [eventType?.name, eventType?.slug, postEmbedEvent]);

  React.useEffect(() => {
    if (step !== 2 || !selectedDate || !selectedTime) return;
    const slotKey = `${selectedDate}|${selectedTime}`;
    if (lastSelectedSlotRef.current === slotKey) return;
    lastSelectedSlotRef.current = slotKey;
    postEmbedEvent("slot_selected", {
      event_slug: eventType?.slug ?? null,
      event_name: eventType?.name ?? null,
      date: selectedDate,
      time: selectedTime,
    });
  }, [eventType?.name, eventType?.slug, postEmbedEvent, selectedDate, selectedTime, step]);

  React.useEffect(() => {
    if (step !== 4 || !selectedDate || !selectedTime || !inviteSent) return;
    const confirmedKey = `${selectedDate}|${selectedTime}|${details.email}`;
    if (lastConversionKeyRef.current === confirmedKey) return;
    lastConversionKeyRef.current = confirmedKey;
    postEmbedEvent("booking_conversion", {
      event_slug: eventType?.slug ?? null,
      event_name: eventType?.name ?? null,
      date: selectedDate,
      time: selectedTime,
    });
  }, [details.email, eventType?.name, eventType?.slug, inviteSent, postEmbedEvent, selectedDate, selectedTime, step]);

  return (
    <div
      className="booking-wizard-shell"
      style={{
        background: "var(--surface-page)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-xl)",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        width: "100%",
        maxWidth: 1020,
        minHeight: isMobile ? "auto" : 580,
        overflow: "hidden",
      }}
    >
      {/* ── Left panel ── */}
      <LeftPanel
        name={eventType?.name}
        duration={eventType?.duration}
        description={eventType?.description}
        hostName={hostProfile?.host_name}
        hostPhotoUrl={hostProfile?.profile_photo_url}
        calendarContent={
          step === 1 && !isMobile ? (
            <InlineCalendar
              viewMonth={viewMonth}
              setViewMonth={setViewMonth}
              selectedDate={anchorDate}
              onSelect={handleCalendarClick}
            />
          ) : undefined
        }
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        step={step}
        isMobile={isMobile}
      />

      {/* ── Right panel ── */}
      <div
        style={{
          flex: 1,
          padding: isMobile ? "var(--space-4)" : "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          overflowY: "auto",
          minWidth: 0,
        }}
      >
        {/* Step header — timezone picker only in step 1; label shown for other steps */}
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: step === 1 ? "flex-end" : "space-between",
            gap: "var(--space-2)",
          }}
        >
          {step !== 1 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
                textTransform: "uppercase" as const,
              }}
            >
              {meta.label}
            </span>
          )}
          {step === 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                Time shown in
              </span>
              <TimezonePicker value={selectedTimezone} onChange={setSelectedTimezone} />
            </div>
          )}
        </div>

        {/* ── Step 1: visitor calendar banner + 3-day slot picker ── */}
        {step === 1 && (
          <>
            <VisitorCalendarConnectBanner
              connected={!!visitorCal}
              provider={visitorCal?.provider ?? null}
              selectedLabel={
                visitorCal
                  ? visitorCal.selectedCalendarIds.length === 1
                    ? visitorCal.calendars.find(
                        (calendar) => calendar.id === visitorCal.selectedCalendarIds[0]
                      )?.name ?? "1 calendar selected"
                    : `${visitorCal.selectedCalendarIds.length} calendars selected`
                  : null
              }
              loading={visCalLoading && !visitorCal}
              gisReady={gisReady}
              msReady={msReady}
              onConnectGoogle={handleConnectGoogle}
              onConnectOutlook={handleConnectOutlook}
              onDisconnect={handleDisconnectVisitorCal}
              onEditSelection={() => setShowVisitorCalendarSelection(true)}
            />
            {showVisitorCalendarSelection && visitorCal && (
              <VisitorCalendarSelectionModal
                provider={visitorCal.provider}
                calendars={visitorCal.calendars}
                selectedCalendarIds={visitorCal.selectedCalendarIds}
                saving={visCalLoading}
                onToggle={toggleVisitorCalendarSelection}
                onSave={handleSaveVisitorCalendarSelection}
                onClose={() => setShowVisitorCalendarSelection(false)}
              />
            )}
            <ThreeDaySlotPicker
              anchorDate={anchorDate ?? toISODate(new Date())}
              onAnchorChange={handlePickerNavigate}
              eventSlug={eventType?.slug}
              start_hour={eventType?.start_hour ?? 9}
              end_hour={eventType?.end_hour ?? 17}
              slot_increment={eventType?.slot_increment ?? 30}
              duration={eventType?.duration ?? 30}
              viewerTimezone={selectedTimezone}
              dayCount={isMobile ? 3 : 5}
              onHostTimezoneChange={setHostTimezone}
              visitorBusy={visitorCal?.busy}
            />
            <button
              className="tc-btn tc-btn--primary"
              style={{ marginTop: "auto", width: "100%" }}
              disabled={!canConfirmTime}
              onClick={() => setStep(2)}
            >
              Confirm Time →
            </button>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              {meta.label}
            </span>
          </>
        )}

        {/* ── Step 2: Details form ── */}
        {step === 2 && (
          <>
            <DetailsForm questions={customQuestions} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                marginTop: "auto",
              }}
            >
              {submitError && (
                <p style={{ fontSize: 13, color: "#ef4444", textAlign: "center", margin: 0 }}>
                  {submitError}
                </p>
              )}
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <button
                  className="tc-btn tc-btn--secondary"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
                <button
                  className="tc-btn tc-btn--primary"
                  style={{ flex: 1 }}
                  disabled={!canContinueDetails || isSubmitting}
                  onClick={handleBookNow}
                >
                  {isSubmitting ? "Booking…" : "Book now"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 4: Confirmed ── */}
        {step === 4 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ fontSize: 48 }}>✅</div>
            <h3
              style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}
            >
              You&apos;re booked!
            </h3>

            {/* Assigned team member card */}
            {assignedHosts.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                  background: "var(--blue-50)",
                  border: "1px solid rgba(74,158,255,0.30)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-4) var(--space-5)",
                  width: "100%",
                  maxWidth: 360,
                }}
              >
                <div style={{ width: "100%", textAlign: "left" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--blue-400)", margin: 0 }}>
                    {assignedHosts.length === 1 ? "You&apos;re meeting with" : "Hosts on this meeting"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                    {assignedHosts.map((host) => (
                      <div key={host.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "var(--radius-full)",
                            background: host.photo_url ? "var(--surface-subtle)" : "var(--blue-400)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 700,
                            color: "white",
                            overflow: "hidden",
                            flexShrink: 0,
                            boxShadow: "var(--shadow-blue-sm)",
                          }}
                        >
                          {host.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={host.photo_url}
                              alt={host.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            host.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                          {host.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
              A calendar invite is on its way to <strong>{details.email}</strong>.
            </p>
            <div
              style={{
                background: "var(--surface-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
                width: "100%",
                maxWidth: 360,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {[
                { label: "Date", value: selectedDate ? formatSelectedDate(selectedDate) : "" },
                { label: "Time", value: selectedTime ?? "" },
                { label: "Name", value: details.name },
                { label: "Email", value: details.email },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                >
                  <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
                </div>
              ))}
            </div>
            {manageUrl && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                <a
                  href={manageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 13, color: "var(--color-primary, var(--blue-400))",
                    textDecoration: "none", fontWeight: 500,
                    padding: "6px 14px", borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(123,108,246,0.30)",
                    background: "rgba(123,108,246,0.06)",
                  }}
                >
                  Manage or cancel booking →
                </a>
              </div>
            )}
            <button className="tc-btn tc-btn--soft" onClick={handleBookAnother}>
              Book another time
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
