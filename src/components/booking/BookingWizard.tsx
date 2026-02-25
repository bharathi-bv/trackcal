"use client";

import * as React from "react";
import { useBookingStore } from "@/store/bookingStore";
import DetailsForm from "@/components/booking/DetailsForm";
import TimeSlotSelector from "@/components/booking/TimeSlotSelector";
import { trackBookingStarted, trackBookingCompleted } from "@/lib/analytics";

// ── Helpers ────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatSelectedDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
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

// ── Left Panel (static host info) ─────────────────────────────────────────

function LeftPanel() {
  return (
    <div
      style={{
        width: 272,
        flexShrink: 0,
        borderRight: "1px solid var(--border-default)",
        padding: "var(--space-8) var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "var(--radius-full)",
          background: "var(--blue-400)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          boxShadow: "var(--shadow-blue-sm)",
        }}
      >
        📅
      </div>

      {/* Host + Event */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
          Alex Johnson
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
          30-Minute Discovery Call
        </h2>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-default)" }} />

      {/* Meta rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <MetaRow icon="🕐" label="30 minutes" />
        <MetaRow icon="🎥" label="Video Call (Zoom)" />
        <MetaRow icon="🌐" label="UTC / Your timezone" />
      </div>

      {/* Description — pushed to bottom */}
      <p
        style={{
          marginTop: "auto",
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        A quick chat to understand your needs and explore how we can work together. No commitment
        required.
      </p>
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

function InlineCalendar({
  viewMonth,
  setViewMonth,
}: {
  viewMonth: Date;
  setViewMonth: (d: Date) => void;
}) {
  const { selectedDate, setDate } = useBookingStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const cells = buildCalendarGrid(year, month);

  const canGoPrev =
    viewMonth.getFullYear() > today.getFullYear() ||
    viewMonth.getMonth() > today.getMonth();

  function prevMonth() {
    if (!canGoPrev) return;
    setViewMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setViewMonth(new Date(year, month + 1, 1));
  }

  return (
    <div>
      {/* Month nav */}
      <div className="cal-nav">
        <button
          className="btn btn-ghost btn-icon"
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
          style={{ opacity: canGoPrev ? 1 : 0.3 }}
        >
          ‹
        </button>
        <span className="cal-month">{formatMonthYear(viewMonth)}</span>
        <button
          className="btn btn-ghost btn-icon"
          onClick={nextMonth}
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
          if (!date) return <div key={`empty-${i}`} />;

          const iso = toISODate(date);
          const isPast = date < today;
          const isToday = date.getTime() === today.getTime();
          const isSelected = selectedDate === iso;
          const isWeekday = date.getDay() !== 0 && date.getDay() !== 6;
          const hasSlot = !isPast && isWeekday;

          let cls = "cal-day";
          if (isPast) cls += " cal-day-disabled";
          else if (isSelected) cls += " cal-day-selected";
          else if (isToday) cls += " cal-day-today";
          else if (hasSlot) cls += " cal-day-has-slot";

          return (
            <button
              key={iso}
              className={cls}
              onClick={() => !isPast && setDate(iso)}
              disabled={isPast}
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

// ── Main Wizard ────────────────────────────────────────────────────────────

export default function BookingWizard() {
  const { step, setStep, reset, selectedDate, selectedTime, details, utmParams } = useBookingStore();
  const [viewMonth, setViewMonth] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Fire "booking_started" once on mount — captures intent signal with UTM context
  React.useEffect(() => {
    trackBookingStarted(utmParams);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire "booking_completed" when user reaches the confirmed screen
  React.useEffect(() => {
    if (step === 4 && selectedDate && selectedTime) {
      trackBookingCompleted({
        utmParams,
        date: selectedDate,
        time: selectedTime,
        email: details.email,
      });
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

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
      style={{
        background: "var(--surface-page)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-xl)",
        display: "flex",
        width: "100%",
        maxWidth: 880,
        minHeight: 560,
        overflow: "hidden",
      }}
    >
      {/* ── Left panel ── */}
      <LeftPanel />

      {/* ── Right panel ── */}
      <div
        style={{
          flex: 1,
          padding: "var(--space-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
          overflowY: "auto",
        }}
      >
        {/* Step header */}
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

        {/* ── Step 1: Calendar + Slots ── */}
        {step === 1 && (
          <>
            <InlineCalendar viewMonth={viewMonth} setViewMonth={setViewMonth} />

            {selectedDate && (
              <>
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    {formatSelectedDate(selectedDate)}
                  </p>
                  <TimeSlotSelector />
                </div>
              </>
            )}

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

        {/* ── Step 2: Details ── */}
        {step === 2 && (
          <>
            <DetailsForm />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "auto" }}>
              {submitError && (
                <p style={{ fontSize: 13, color: "var(--error)", textAlign: "center", margin: 0 }}>
                  {submitError}
                </p>
              )}
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={isSubmitting}>
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
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              You&apos;re booked!
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
              A calendar invite is on its way to{" "}
              <strong>{details.email}</strong>.
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
                { label: "Date", value: selectedDate ?? "" },
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
