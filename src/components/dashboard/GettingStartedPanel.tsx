"use client";

import * as React from "react";
import Link from "next/link";

export type SetupStatus = {
  calendarConnected: boolean;
  calendarAccounts: Array<{ provider: "google" | "microsoft"; email: string | null }>;
  availabilitySet: boolean;
  zoomConnected: boolean;
  customDomainSet: boolean;
};

const CheckIcon = ({ done }: { done: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden style={{ flexShrink: 0 }}>
    <circle
      cx="9" cy="9" r="8.5"
      fill={done ? "#22c55e" : "transparent"}
      stroke={done ? "#22c55e" : "#d4d4d4"}
    />
    {done && (
      <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VideoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="1" y="4" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M11 6.5l4-2v7l-4-2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

const LinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M6.5 9.5a4 4 0 0 0 5.657 0l1.414-1.414a4 4 0 0 0-5.657-5.657L6.5 3.843" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M9.5 6.5a4 4 0 0 0-5.657 0L2.43 7.914a4 4 0 0 0 5.657 5.657l1.414-1.414" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const CssIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M2 2h12l-1.5 10L8 14l-4.5-2L2 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M5 6h6M5.5 9.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

type Step = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
  extra?: React.ReactNode;
};

export default function GettingStartedPanel({ status }: { status: SetupStatus }) {
  const [dismissed, setDismissed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setDismissed(localStorage.getItem("citacal_setup_dismissed") === "1");
  }, []);

  function dismiss() {
    localStorage.setItem("citacal_setup_dismissed", "1");
    setDismissed(true);
  }

  const calendarLabel = status.calendarAccounts.length > 0
    ? status.calendarAccounts.map(a => a.email ?? a.provider).join(", ")
    : null;

  const steps: Step[] = [
    {
      id: "calendar",
      icon: <CalendarIcon />,
      title: "Connect your calendar",
      description: calendarLabel
        ? `Connected: ${calendarLabel}`
        : "Sync Google or Outlook to check real availability.",
      done: status.calendarConnected,
      href: "/app/dashboard/integrations",
      cta: status.calendarConnected ? "Add another" : "Connect",
    },
    {
      id: "availability",
      icon: <ClockIcon />,
      title: "Set your availability",
      description: "A default schedule is ready — customise your hours anytime.",
      done: status.availabilitySet,
      href: "/app/availability",
      cta: "Adjust",
    },
    {
      id: "zoom",
      icon: <VideoIcon />,
      title: "Connect Zoom",
      description: "Auto-generate Zoom links for every booking.",
      done: status.zoomConnected,
      href: "/app/dashboard/integrations",
      cta: "Connect",
    },
    {
      id: "domain",
      icon: <LinkIcon />,
      title: "Custom domain & booking link",
      description: "Share a personalised link like cal.yourdomain.com.",
      done: status.customDomainSet,
      href: "/app/dashboard/integrations",
      cta: "Set up",
    },
    {
      id: "css",
      icon: <CssIcon />,
      title: "Custom branding",
      description: "Add custom CSS to match your brand.",
      done: false,
      href: "/app/dashboard/settings",
      cta: "Customise",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (!mounted || dismissed || allDone) return null;

  return (
    <div style={{
      marginBottom: 28,
      border: "1px solid var(--border-default, #e5e7eb)",
      borderRadius: 12,
      background: "var(--surface-page, #fff)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
        borderBottom: "1px solid var(--border-subtle, #f0f0f0)",
        background: "var(--surface-subtle, #fafafa)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary, #171717)" }}>
            Get set up
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#7B6CF6",
            background: "rgba(123,108,246,0.10)", borderRadius: 999,
            padding: "2px 8px", lineHeight: 1.6,
          }}>
            {doneCount} of {steps.length} done
          </span>
        </div>
        <button
          onClick={dismiss}
          style={{
            fontSize: 12, color: "var(--text-tertiary, #a3a3a3)", background: "none",
            border: "none", cursor: "pointer", padding: "2px 4px",
            fontFamily: "var(--font-sans)", lineHeight: 1,
          }}
        >
          Dismiss
        </button>
      </div>

      {/* Steps */}
      <div>
        {steps.map((step, i) => (
          <div
            key={step.id}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 18px",
              borderBottom: i < steps.length - 1 ? "1px solid var(--border-subtle, #f0f0f0)" : "none",
              opacity: step.done ? 0.55 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <CheckIcon done={step.done} />

            {/* Icon + text */}
            <div style={{ color: "var(--text-tertiary, #a3a3a3)", marginTop: 1 }}>
              {step.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: step.done ? 500 : 600,
                color: step.done ? "var(--text-secondary, #525252)" : "var(--text-primary, #171717)",
                lineHeight: 1.3,
              }}>
                {step.title}
              </div>
              <div style={{
                fontSize: 12, color: "var(--text-tertiary, #a3a3a3)",
                marginTop: 1, lineHeight: 1.4,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {step.description}
              </div>
            </div>

            {/* CTA */}
            <Link
              href={step.href}
              style={{
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                color: step.done ? "var(--text-tertiary)" : "#7B6CF6",
                textDecoration: "none", flexShrink: 0,
                padding: "4px 10px",
                border: `1px solid ${step.done ? "var(--border-subtle, #f0f0f0)" : "rgba(123,108,246,0.30)"}`,
                borderRadius: 6,
                background: step.done ? "transparent" : "rgba(123,108,246,0.05)",
              }}
            >
              {step.cta} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
