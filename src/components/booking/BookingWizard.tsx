"use client";

import * as React from "react";
import { useBookingStore } from "@/store/bookingStore";
import DetailsForm from "@/components/booking/DetailsForm";
import ThreeDaySlotPicker from "@/components/booking/ThreeDaySlotPicker";
import TimezonePicker from "@/components/booking/TimezonePicker";
import { trackBookingStarted, trackBookingCompleted } from "@/lib/analytics";

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
  const displayName = hostName?.trim() || "TrackCal";
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
          className="btn btn-ghost btn-icon"
          onClick={() => canGoPrev && setViewMonth(new Date(year, month - 1, 1))}
          disabled={!canGoPrev}
          aria-label="Previous month"
          style={{ opacity: canGoPrev ? 1 : 0.3 }}
        >
          ‹
        </button>
        <span className="cal-month">{formatMonthYear(viewMonth)}</span>
        <button
          className="btn btn-ghost btn-icon"
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
          else if (isToday) cls += " cal-day-today";

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

// ── Main Wizard ────────────────────────────────────────────────────────────

export default function BookingWizard({
  eventType,
  hostProfile,
}: {
  eventType?: EventTypeProp;
  hostProfile?: HostProfileProp;
}) {
  const { step, setStep, reset, selectedDate, selectedTime, details, utmParams, setDate, setTime } =
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

  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setSelectedTimezone(tz);
    } catch {
      // keep UTC
    }
  }, []);

  // Fire "booking_started" once on mount
  React.useEffect(() => {
    trackBookingStarted(utmParams);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire "booking_completed" when user reaches the confirmed screen
  React.useEffect(() => {
    if (step === 4 && selectedDate && selectedTime) {
      trackBookingCompleted({ utmParams, date: selectedDate, time: selectedTime, email: details.email });
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

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
          ...utmParams,
        }),
      });
      if (!res.ok) throw new Error("Booking failed");
      setStep(4);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canConfirmTime = Boolean(selectedDate && selectedTime);
  const canContinueDetails = Boolean(details.name && details.email);
  const meta = STEP_META[step] ?? STEP_META[1];

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
        {/* Step header — label left, timezone picker right (step 1 only) */}
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: "var(--space-2)",
          }}
        >
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

        {/* ── Step 1: 3-day slot picker (calendar is now in left panel) ── */}
        {step === 1 && (
          <>
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
            />

            <button
              className="btn btn-primary w-full"
              style={{ marginTop: "auto" }}
              disabled={!canConfirmTime}
              onClick={() => setStep(2)}
            >
              Confirm Time →
            </button>
          </>
        )}

        {/* ── Step 2: Details form ── */}
        {step === 2 && (
          <>
            <DetailsForm />
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
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
                <button
                  className="btn btn-primary"
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
            <button className="btn btn-ghost-accent" onClick={reset}>
              Book another time
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
