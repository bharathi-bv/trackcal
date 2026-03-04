"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import ThreeDaySlotPicker from "@/components/booking/ThreeDaySlotPicker";
import { useBookingStore } from "@/store/bookingStore";

const TimezonePicker = dynamic(() => import("@/components/booking/TimezonePicker"), {
  ssr: false,
  loading: () => (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-page)",
        fontSize: 11,
        color: "var(--text-tertiary)",
        fontFamily: "inherit",
      }}
    >
      Loading...
    </button>
  ),
});

type BookingInfo = {
  id: string;
  status: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  event_slug: string | null;
  event_name: string;
  event_description?: string | null;
  duration: number;
  start_hour?: number;
  end_hour?: number;
  slot_increment?: number;
  host_name?: string | null;
  host_profile_photo_url?: string | null;
  can_reschedule: boolean;
  expires_at: string;
};

function formatDateLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDateCompact(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAnchorDate(date?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!date) return today.toISOString().slice(0, 10);
  const bookingDate = new Date(`${date}T00:00:00`);
  return bookingDate < today ? today.toISOString().slice(0, 10) : date;
}

function getStatusLabel(status: string) {
  if (status === "no_show" || status === "no-show") return "No Show";
  if (status === "cancelled") return "Cancelled";
  if (status === "pending") return "Pending";
  return "Confirmed";
}

function getStatusStyles(status: string) {
  if (status === "cancelled") {
    return {
      color: "#b91c1c",
      background: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.18)",
    };
  }
  if (status === "pending") {
    return {
      color: "#92400e",
      background: "rgba(245,158,11,0.14)",
      border: "1px solid rgba(245,158,11,0.18)",
    };
  }
  if (status === "no_show" || status === "no-show") {
    return {
      color: "#334155",
      background: "rgba(148,163,184,0.18)",
      border: "1px solid rgba(148,163,184,0.24)",
    };
  }
  return {
    color: "#166534",
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.18)",
  };
}

function Avatar({
  hostName,
  hostPhotoUrl,
}: {
  hostName?: string | null;
  hostPhotoUrl?: string | null;
}) {
  const [imgError, setImgError] = React.useState(false);
  const displayName = hostName?.trim() || "CitaCal";
  const initial = displayName.charAt(0).toUpperCase();
  const showPhoto = hostPhotoUrl && !imgError;

  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "var(--radius-full)",
        background: showPhoto ? "var(--surface-subtle)" : "var(--blue-400)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 20,
        fontWeight: 800,
        overflow: "hidden",
        boxShadow: "var(--shadow-blue-sm)",
        flexShrink: 0,
      }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hostPhotoUrl}
          alt={displayName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function ManageBookingClient({
  token,
  initialBooking = null,
  defaultMode = "view",
  hideCancel = false,
}: {
  token: string;
  initialBooking?: BookingInfo | null;
  defaultMode?: "view" | "reschedule";
  hideCancel?: boolean;
}) {
  const isRescheduleLanding = defaultMode === "reschedule";
  const { selectedDate, selectedTime, setDate, setTime, setStep } = useBookingStore();

  const [loading, setLoading] = React.useState(!initialBooking);
  const [error, setError] = React.useState<string | null>(null);
  const [booking, setBooking] = React.useState<BookingInfo | null>(initialBooking);
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState<"view" | "reschedule">(
    initialBooking?.can_reschedule && defaultMode === "reschedule" ? "reschedule" : "view"
  );
  const [anchorDate, setAnchorDate] = React.useState<string>(getAnchorDate(initialBooking?.date));
  const [selectedTimezone, setSelectedTimezone] = React.useState("UTC");
  const [, setHostTimezone] = React.useState("UTC");
  const [isMobile, setIsMobile] = React.useState(false);
  const initializedModeRef = React.useRef(false);

  const loadBooking = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/manage/${token}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to load booking.");
      }
      setBooking((data.booking as BookingInfo) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load booking.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (initialBooking) return;
    void loadBooking();
  }, [initialBooking, loadBooking]);

  React.useEffect(() => {
    try {
      setSelectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setSelectedTimezone("UTC");
    }
  }, []);

  React.useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  React.useEffect(() => {
    if (!booking) return;
    setStep(1);
    setDate(booking.date);
    setTime(booking.time);
    setAnchorDate(getAnchorDate(booking.date));
    if (!initializedModeRef.current && defaultMode === "reschedule" && booking.can_reschedule) {
      initializedModeRef.current = true;
      setMode("reschedule");
    } else if (!booking.can_reschedule) {
      initializedModeRef.current = true;
      setMode("view");
    }
  }, [booking, defaultMode, setDate, setStep, setTime]);

  React.useEffect(() => {
    return () => {
      setStep(1);
      setDate(null);
      setTime(null);
    };
  }, [setDate, setStep, setTime]);

  async function handleCancel() {
    if (!booking) return;
    const proceed = window.confirm("Cancel this booking?");
    if (!proceed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/manage/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Cancel failed.");
      }
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              ...(data.booking ?? {}),
              status: "cancelled",
              can_reschedule: false,
            }
          : prev
      );
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRescheduleSubmit() {
    if (!booking || !selectedDate || !selectedTime) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/manage/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          date: selectedDate,
          time: selectedTime,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Reschedule failed.");
      }
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              ...(data.booking ?? {}),
              date: data.booking?.date ?? selectedDate,
              time: data.booking?.time ?? selectedTime,
              status: data.booking?.status ?? "confirmed",
              can_reschedule: true,
            }
          : prev
      );
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section
        className="booking-wizard-shell"
        style={{
          background: "var(--surface-page)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          width: "100%",
          maxWidth: 1020,
          minHeight: 580,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
        }}
      >
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>
          Loading booking details...
        </p>
      </section>
    );
  }

  if (error && !booking) {
    return (
      <section
        className="booking-wizard-shell"
        style={{
          background: "var(--surface-page)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          width: "100%",
          maxWidth: 720,
          padding: "var(--space-8)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {isRescheduleLanding ? "Reschedule Booking" : "Manage Booking"}
        </p>
        <h1 style={{ margin: "var(--space-3) 0 0", fontSize: 28, fontWeight: 800 }}>
          Link unavailable
        </h1>
        <p style={{ margin: "var(--space-3) 0 0", color: "var(--text-secondary)" }}>{error}</p>
      </section>
    );
  }

  if (!booking) return null;

  const statusStyles = getStatusStyles(booking.status);
  const hasSelectionChange = Boolean(
    selectedDate &&
      selectedTime &&
      (selectedDate !== booking.date || selectedTime !== booking.time)
  );
  const title = mode === "reschedule" ? "Pick a new time" : "Booking details";
  const helperText =
    mode === "reschedule"
      ? "Choose a new slot using the same availability flow as the booking page."
      : "Review the current booking, then reschedule or cancel if needed.";

  return (
    <section
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
      <div
        style={{
          width: isMobile ? "100%" : 300,
          flexShrink: 0,
          borderRight: isMobile ? "none" : "1px solid var(--border-default)",
          borderBottom: isMobile ? "1px solid var(--border-default)" : "none",
          padding: isMobile ? "var(--space-5)" : "var(--space-8) var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          background: "linear-gradient(180deg, rgba(74,158,255,0.05) 0%, rgba(74,158,255,0) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Avatar
            hostName={booking.host_name ?? "CitaCal"}
            hostPhotoUrl={booking.host_profile_photo_url ?? null}
          />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              {isRescheduleLanding ? "Reschedule Booking" : "Manage Booking"}
            </p>
            <h1
              style={{
                margin: "6px 0 0",
                fontSize: 26,
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.15,
              }}
            >
              {booking.event_name}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          <span className="tc-pill tc-pill--primary">{booking.duration} min</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: 12,
              fontWeight: 700,
              ...statusStyles,
            }}
          >
            {getStatusLabel(booking.status)}
          </span>
        </div>

        {booking.event_description && (
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            {booking.event_description}
          </p>
        )}

        <div
          style={{
            padding: "var(--space-4)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            background: "var(--surface-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <DetailRow label="Current date" value={formatDateLabel(booking.date)} />
          <DetailRow label="Current time" value={booking.time} />
          <DetailRow label="Host" value={booking.host_name?.trim() || "CitaCal"} />
        </div>

        <div
          style={{
            padding: "var(--space-4)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <DetailRow label="Attendee" value={booking.name} />
          <DetailRow label="Email" value={booking.email} />
          {booking.phone ? <DetailRow label="Phone" value={booking.phone} /> : null}
          {booking.notes ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                Notes
              </span>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
                {booking.notes}
              </p>
            </div>
          ) : null}
        </div>

        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>
          Link active until {new Date(booking.expires_at).toLocaleDateString("en-US")}.
        </p>
      </div>

      <div
        style={{
          flex: 1,
          padding: isMobile ? "var(--space-4)" : "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            flexDirection: isMobile ? "column" : "row",
            gap: "var(--space-3)",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              {mode === "reschedule" ? "Choose Time" : "Overview"}
            </p>
            <h2 style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
              {title}
            </h2>
            <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
              {helperText}
            </p>
          </div>
          {mode === "reschedule" && (
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

        {mode === "view" ? (
          <>
            <div
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-xl)",
                background: "var(--surface-subtle)",
                padding: "var(--space-6)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <DetailRow label="Status" value={getStatusLabel(booking.status)} />
              <DetailRow label="Date" value={formatDateLabel(booking.date)} />
              <DetailRow label="Time" value={booking.time} />
              <DetailRow label="Contact" value={booking.email} />
            </div>

            {error && (
              <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>
                {error}
              </p>
            )}

            <div
              style={{
                marginTop: "auto",
                display: "flex",
                gap: "var(--space-3)",
                flexWrap: "wrap",
              }}
            >
              {booking.can_reschedule && (
                <button
                  type="button"
                  className="tc-btn tc-btn--primary"
                  onClick={() => {
                    setError(null);
                    setMode("reschedule");
                    setDate(booking.date);
                    setTime(booking.time);
                    setAnchorDate(getAnchorDate(booking.date));
                  }}
                  disabled={busy}
                >
                  Reschedule
                </button>
              )}
              {!hideCancel && booking.status !== "cancelled" && (
                <button
                  type="button"
                  className="tc-btn tc-btn--secondary"
                  onClick={handleCancel}
                  disabled={busy}
                >
                  {busy ? "Updating..." : "Cancel booking"}
                </button>
              )}
              <button
                type="button"
                className="tc-btn tc-btn--ghost"
                onClick={() => void loadBooking()}
                disabled={busy}
              >
                Refresh
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-2)",
                alignItems: "center",
              }}
            >
              <span className="tc-pill tc-pill--primary">
                Current: {formatDateCompact(booking.date)} at {booking.time}
              </span>
              {hasSelectionChange && selectedDate && selectedTime ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-full)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--blue-600)",
                    background: "rgba(74,158,255,0.12)",
                    border: "1px solid rgba(74,158,255,0.18)",
                  }}
                >
                  New: {formatDateCompact(selectedDate)} at {selectedTime}
                </span>
              ) : null}
            </div>

            <ThreeDaySlotPicker
              anchorDate={anchorDate}
              onAnchorChange={setAnchorDate}
              eventSlug={booking.event_slug ?? undefined}
              start_hour={booking.start_hour ?? 9}
              end_hour={booking.end_hour ?? 17}
              slot_increment={booking.slot_increment ?? 30}
              duration={booking.duration ?? 30}
              viewerTimezone={selectedTimezone}
              dayCount={isMobile ? 3 : 5}
              onHostTimezoneChange={setHostTimezone}
            />

            {error && (
              <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>
                {error}
              </p>
            )}

            <div
              style={{
                marginTop: "auto",
                display: "flex",
                gap: "var(--space-3)",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="tc-btn tc-btn--secondary"
                onClick={() => {
                  setError(null);
                  setMode("view");
                  setDate(booking.date);
                  setTime(booking.time);
                }}
                disabled={busy}
              >
                Back
              </button>
              <button
                type="button"
                className="tc-btn tc-btn--primary"
                onClick={handleRescheduleSubmit}
                disabled={busy || !selectedDate || !selectedTime || !hasSelectionChange}
              >
                {busy ? "Saving..." : "Confirm new time"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
