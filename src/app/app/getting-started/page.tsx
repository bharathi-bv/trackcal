"use client";

import * as React from "react";
import Link from "next/link";

type Step = {
  id: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  optional?: boolean;
  done: boolean;
};

export default function GettingStartedPage() {
  const [calendarProvider, setCalendarProvider] = React.useState<string | null>(null);
  const [zoomConnected, setZoomConnected] = React.useState(false);
  const [hasEventType, setHasEventType] = React.useState(false);
  const [publicSlug, setPublicSlug] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/event-types").then((r) => r.json()),
    ])
      .then(([settingsRes, etRes]) => {
        const s = settingsRes?.settings ?? settingsRes;
        setCalendarProvider(s?.calendar_provider ?? null);
        setZoomConnected(Boolean(s?.zoom_connected));
        setPublicSlug(s?.public_slug ?? null);

        const types = Array.isArray(etRes) ? etRes : [];
        setHasEventType(types.length > 0);
      })
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, []);

  const steps: Step[] = [
    {
      id: "calendar",
      title: "Connect your calendar",
      description:
        "Link Google Calendar or Outlook so CitaCal can read your availability and create events when someone books with you.",
      cta: "Connect calendar",
      href: "/app/dashboard/integrations",
      done: Boolean(calendarProvider),
    },
    {
      id: "booking-link",
      title: "Create a booking link",
      description:
        "Set up your first event type — define the duration, availability window, and questions to ask bookers.",
      cta: "Create booking link",
      href: "/app/dashboard/event-types",
      done: hasEventType,
    },
    {
      id: "share",
      title: "Share your booking page",
      description: hasEventType && publicSlug
        ? `Your booking page is live at citacal.com/book/${publicSlug}. Share it anywhere — email signature, LinkedIn, website.`
        : "Once you create a booking link, you'll get a shareable URL to send to prospects.",
      cta: "Go to booking links",
      href: "/app/dashboard/event-types",
      done: hasEventType && Boolean(publicSlug),
    },
    {
      id: "zoom",
      title: "Connect Zoom",
      description:
        "Auto-generate unique Zoom meeting links for every booking. Skip this if you use Google Meet or a manual link.",
      cta: "Connect Zoom",
      href: "/app/dashboard/integrations",
      optional: true,
      done: zoomConnected,
    },
  ];

  const requiredSteps = steps.filter((s) => !s.optional);
  const completedRequired = requiredSteps.filter((s) => s.done).length;
  const allRequiredDone = completedRequired === requiredSteps.length;

  if (loading) {
    return (
      <div style={{ padding: "40px 40px", maxWidth: 720 }}>
        <div style={{ height: 28, width: 220, borderRadius: 8, background: "#f0f0f6", marginBottom: 12 }} className="skeleton" />
        <div style={{ height: 16, width: 340, borderRadius: 6, background: "#f0f0f6" }} className="skeleton" />
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 40px", maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Get started with CitaCal
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0 }}>
          {allRequiredDone
            ? "You're all set! Your booking page is ready to share."
            : `${completedRequired} of ${requiredSteps.length} steps complete`}
        </p>

        {/* Progress bar */}
        <div style={{ marginTop: 14, height: 5, background: "rgba(123,108,246,0.12)", borderRadius: 99, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${(completedRequired / requiredSteps.length) * 100}%`,
              background: "linear-gradient(90deg, #7B6CF6, #A89AF9)",
              borderRadius: 99,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} />
        ))}
      </div>

      {/* Footer note */}
      <p style={{ marginTop: 32, fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
        Need help?{" "}
        <a href="mailto:support@citacal.com" style={{ color: "#7B6CF6", fontWeight: 500 }}>
          support@citacal.com
        </a>
      </p>
    </div>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "20px 20px",
        borderRadius: 12,
        border: step.done
          ? "1px solid rgba(123,108,246,0.2)"
          : "1px solid rgba(200,198,230,0.45)",
        background: step.done ? "rgba(123,108,246,0.04)" : "#fff",
        transition: "border-color 0.2s",
      }}
    >
      {/* Step indicator */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: step.done
            ? "linear-gradient(135deg, #7B6CF6, #A89AF9)"
            : "rgba(200,198,230,0.3)",
          border: step.done ? "none" : "1.5px solid rgba(200,198,230,0.6)",
          marginTop: 2,
        }}
      >
        {step.done ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)" }}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: step.done ? "var(--color-text-muted)" : "var(--color-text-primary)",
              textDecoration: step.done ? "line-through" : "none",
              opacity: step.done ? 0.7 : 1,
            }}
          >
            {step.title}
          </span>
          {step.optional && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#7B6CF6",
                background: "rgba(123,108,246,0.1)",
                border: "1px solid rgba(123,108,246,0.2)",
                borderRadius: 4,
                padding: "1px 6px",
                letterSpacing: "0.04em",
              }}
            >
              OPTIONAL
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 12px", lineHeight: 1.6 }}>
          {step.description}
        </p>
        {!step.done && (
          <Link
            href={step.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: "#7B6CF6",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 8,
              border: "1.5px solid rgba(123,108,246,0.35)",
              background: "rgba(123,108,246,0.06)",
              transition: "background 0.15s",
            }}
          >
            {step.cta}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="#7B6CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        {step.done && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#16a34a" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="6.5" fill="#dcfce7"/>
              <path d="M3.5 6.5l2 2 4-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Completed
          </span>
        )}
      </div>
    </div>
  );
}
