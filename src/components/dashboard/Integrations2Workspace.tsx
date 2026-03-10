"use client";

import * as React from "react";
import Link from "next/link";
import {
  TRACKING_EVENT_KEYS,
  normalizeTrackingEventAliases,
  resolveTrackingEventName,
  type TrackingEventAliases,
  type TrackingEventKey,
} from "@/lib/tracking-events";
import IntegrationsBaseUrlEditor from "@/components/dashboard/IntegrationsBaseUrlEditor";

type HostSettingsSnapshot = {
  bookingLinkHeaderCode: string;
  bookingLinkFooterCode: string;
  eventAliases: Record<string, unknown>;
};

type SubdomainData = {
  customBaseUrl: string | null;
  defaultCitacalUrl: string;
  effectiveBookingUrl: string;
  customPreviewUrl: string;
  dnsTargetHost: string;
  initialCheckStatus: "verified" | "failed" | "unchecked";
  initialCheckedAt: string | null;
  initialVerifiedAt: string | null;
  initialCheckError: string | null;
  hostPublicSlug: string;
  exampleEventSlug: string;
};

const EVENT_FIELD_META: Array<{ key: TrackingEventKey; label: string; description: string }> = [
  {
    key: "booking_pageview",
    label: "Page viewed",
    description: "Someone lands on your booking page",
  },
  {
    key: "slot_selected",
    label: "Time slot picked",
    description: "Visitor selects a date and time and clicks Continue",
  },
  {
    key: "booking_conversion",
    label: "Booking confirmed",
    description: "Booking is complete and a calendar invite is sent",
  },
];

const TABS = [
  { id: "overview",      label: "Overview"                 },
  { id: "domain",        label: "Custom Domain"            },
  { id: "booking-links", label: "Booking links tracking"   },
  { id: "embed",         label: "Embed widgets tracking"   },
] as const;

type TabId = typeof TABS[number]["id"];

function CodeBlock({ code }: { code: string }) {
  return (
    <pre
      style={{
        margin: 0,
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--text-primary)",
        background: "var(--surface-subtle)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        overflowX: "auto",
        whiteSpace: "pre-wrap",
      }}
    >
      {code}
    </pre>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

const OVERVIEW_ROWS: Array<{
  tab: TabId;
  title: string;
  solves: string;
  useWhen: string;
  note?: string;
}> = [
  {
    tab: "domain",
    title: "Custom Domain",
    solves: "Fixes attribution cookies — UTMs and click IDs stop breaking when visitors cross from your site to citacal.com.",
    useWhen: "You run paid ads on Google, LinkedIn, or Meta.",
    note: "Does not load analytics scripts. Pair with Booking links tracking.",
  },
  {
    tab: "booking-links",
    title: "Booking links tracking",
    solves: "Loads your GTM container on standalone booking pages — same as adding it to any page on your site.",
    useWhen: "You use GTM and want GA4, Meta Pixel, or other tags to fire on booking pages.",
    note: "Required even if you have a custom domain — these are independent.",
  },
  {
    tab: "embed",
    title: "Embed widgets tracking",
    solves: "Fires dataLayer events to your site's GTM when someone books via an embedded widget.",
    useWhen: "You embed CitaCal on your own marketing pages.",
  },
];

function OverviewTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 var(--space-6)", lineHeight: 1.65 }}>
        Each setup solves a different problem — most teams need all three. Custom Domain and Booking links tracking are independent: one fixes cookies, the other loads scripts.
      </p>

      <div
        style={{
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr 1fr auto",
            gap: "var(--space-4)",
            padding: "var(--space-3) var(--space-5)",
            background: "var(--surface-subtle)",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          {["Setup", "What it solves", "Use when", ""].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {OVERVIEW_ROWS.map((row, i) => (
          <div
            key={row.tab}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr 1fr auto",
              gap: "var(--space-4)",
              padding: "var(--space-4) var(--space-5)",
              borderBottom: i < OVERVIEW_ROWS.length - 1 ? "1px solid var(--border-subtle)" : "none",
              alignItems: "start",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{row.title}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{row.solves}</div>
              {row.note && (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4, fontStyle: "italic" }}>{row.note}</div>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{row.useWhen}</div>
            <button
              onClick={() => onNavigate(row.tab)}
              className="tc-btn tc-btn--secondary tc-btn--sm"
              style={{ whiteSpace: "nowrap" }}
            >
              Set up →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Integrations2Workspace({
  exampleBookingUrl,
  initialHostSettings,
  subdomainData,
}: {
  exampleBookingUrl: string;
  initialHostSettings: HostSettingsSnapshot;
  subdomainData: SubdomainData;
}) {
  const [activeTab, setActiveTab] = React.useState<TabId>("overview");

  const [bookingLinkHeaderCode, setBookingLinkHeaderCode] = React.useState(
    initialHostSettings.bookingLinkHeaderCode
  );
  const [bookingLinkFooterCode, setBookingLinkFooterCode] = React.useState(
    initialHostSettings.bookingLinkFooterCode
  );
  const [eventAliases, setEventAliases] = React.useState<TrackingEventAliases>(
    normalizeTrackingEventAliases(initialHostSettings.eventAliases)
  );

  const [directSaving, setDirectSaving] = React.useState(false);
  const [embedSaving, setEmbedSaving] = React.useState(false);
  const [directToast, setDirectToast] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [embedToast, setEmbedToast] = React.useState<{ ok: boolean; msg: string } | null>(null);

  function setAlias(key: TrackingEventKey, value: string) {
    setEventAliases((current) => {
      const next = { ...current };
      const trimmed = value.trim();
      if (!trimmed) {
        delete next[key];
        return next;
      }
      next[key] = trimmed;
      return next;
    });
  }

  async function saveDirectScripts() {
    setDirectToast(null);
    setDirectSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          booking_link_header_code: bookingLinkHeaderCode,
          booking_link_footer_code: bookingLinkFooterCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      setDirectToast({ ok: true, msg: "Scripts saved successfully." });
    } catch (error) {
      setDirectToast({ ok: false, msg: error instanceof Error ? error.message : "Failed to save. Try again." });
    } finally {
      setDirectSaving(false);
      window.setTimeout(() => setDirectToast(null), 4000);
    }
  }

  async function saveEmbedAndAliases() {
    setEmbedToast(null);
    setEmbedSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event_aliases: eventAliases }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      setEmbedToast({ ok: true, msg: "Event names saved." });
    } catch (error) {
      setEmbedToast({ ok: false, msg: error instanceof Error ? error.message : "Failed to save. Try again." });
    } finally {
      setEmbedSaving(false);
      window.setTimeout(() => setEmbedToast(null), 4000);
    }
  }

  const previewAliasMap = TRACKING_EVENT_KEYS.reduce<Record<string, string>>((acc, key) => {
    acc[key] = resolveTrackingEventName(key, eventAliases);
    return acc;
  }, {});

  return (
    <main className="dashboard-main">
      {/* Page header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Tracking Setup
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "6px 0 0", fontWeight: 500 }}>
          Connect your analytics tools so every booking carries the right attribution data.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border-default)", marginBottom: "var(--space-7)" }}>
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
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab onNavigate={setActiveTab} />
      )}

      {activeTab === "domain" && (
        <div style={{ maxWidth: 680 }}>
          <div className="tc-card" style={{ padding: "var(--space-6)" }}>
            <h2 style={{ margin: "0 0 var(--space-2)", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
              Custom Booking Domain
            </h2>
            <p style={{ margin: "0 0 var(--space-4)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              By default, your booking links use <strong style={{ fontWeight: 600 }}>citacal.com</strong>. Point your own subdomain here to keep attribution cookies intact and eliminate cross-domain tracking loss.
            </p>

            <div style={{ marginBottom: "var(--space-5)", display: "grid", gap: "var(--space-2)", fontSize: 13 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
                <div>
                  <span style={{ color: "var(--text-tertiary)" }}>Default: </span>
                  <code style={{ fontSize: 12 }}>{subdomainData.defaultCitacalUrl}</code>
                </div>
                <div>
                  <span style={{ color: "var(--text-tertiary)" }}>With custom domain: </span>
                  <code style={{ fontSize: 12 }}>{subdomainData.customPreviewUrl}</code>
                </div>
              </div>
              {subdomainData.customBaseUrl && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Active booking URL: <code style={{ fontSize: 12 }}>{subdomainData.effectiveBookingUrl}</code>
                </div>
              )}
            </div>

            <IntegrationsBaseUrlEditor
              initialValue={subdomainData.customBaseUrl}
              initialCheckStatus={subdomainData.initialCheckStatus}
              initialCheckedAt={subdomainData.initialCheckedAt}
              initialVerifiedAt={subdomainData.initialVerifiedAt}
              initialCheckError={subdomainData.initialCheckError}
              hostPublicSlug={subdomainData.hostPublicSlug}
              exampleEventSlug={subdomainData.exampleEventSlug}
              dnsTargetHost={subdomainData.dnsTargetHost}
            />
          </div>
        </div>
      )}

      {activeTab === "booking-links" && (
        <div style={{ maxWidth: 680 }}>
          <div className="tc-card" style={{ padding: "var(--space-6)" }}>
            <h2 style={{ margin: "0 0 var(--space-2)", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
              Custom code for booking links
            </h2>
            <p style={{ margin: "0 0 var(--space-5)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Paste your GTM snippet, GA4 tag, or any analytics script here. These run on every standalone booking page your visitors land on — just like adding GTM to any other page on your site.
            </p>

            <div style={{ display: "grid", gap: "var(--space-5)" }}>
              <div className="tc-form-field">
                <label className="tc-form-label">Before &lt;/head&gt; tag</label>
                <p className="tc-form-hint" style={{ marginBottom: 8 }}>
                  Standard placement for GTM and most analytics tools — loads before page content.
                </p>
                <textarea
                  className="tc-textarea"
                  rows={6}
                  style={{ border: "1px solid var(--border-default)" }}
                  value={bookingLinkHeaderCode}
                  onChange={(e) => setBookingLinkHeaderCode(e.target.value)}
                />
              </div>

              <div className="tc-form-field">
                <label className="tc-form-label">Before &lt;/body&gt; tag</label>
                <p className="tc-form-hint" style={{ marginBottom: 8 }}>
                  For noscript tags or scripts that should run after page content loads.
                </p>
                <textarea
                  className="tc-textarea"
                  rows={4}
                  style={{ border: "1px solid var(--border-default)" }}
                  value={bookingLinkFooterCode}
                  onChange={(e) => setBookingLinkFooterCode(e.target.value)}
                />
                <p className="tc-form-hint" style={{ marginTop: 6 }}>
                  These scripts run on pages like <strong style={{ fontWeight: 600 }}>{exampleBookingUrl}</strong>. They don&apos;t run inside embedded booking widgets — use the Embed widgets tab for that.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <button
                  className="tc-btn tc-btn--primary tc-btn--sm"
                  onClick={saveDirectScripts}
                  disabled={directSaving}
                >
                  {directSaving ? "Saving…" : "Save scripts"}
                </button>
                {directToast && (
                  <span style={{ fontSize: 13, color: directToast.ok ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                    {directToast.msg}
                  </span>
                )}
              </div>

              <Link
                href="/docs?article=tracking-ga4"
                target="_blank"
                rel="noreferrer noopener"
                style={{ fontSize: 13, color: "var(--blue-500)", fontWeight: 500, textDecoration: "none" }}
              >
                How to set up GTM on your booking pages →
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === "embed" && (
        <div style={{ maxWidth: 680 }}>
          <div className="tc-card" style={{ padding: "var(--space-6)" }}>
            <h2 style={{ margin: "0 0 var(--space-2)", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
              Embed widgets tracking
            </h2>
            <p style={{ margin: "0 0 var(--space-5)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              When someone books through your embedded widget, CitaCal fires <code>dataLayer</code> events to the GTM container on your page. Rename events below to match your existing GTM triggers.
            </p>

            <div style={{ display: "grid", gap: "var(--space-6)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  Rename events
                </div>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-tertiary)" }}>
                  Leave a field blank to keep the CitaCal default. These names apply to both embedded widgets and standalone booking pages.
                </p>
                <div
                  style={{
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                  }}
                >
                  <table className="tc-table" style={{ minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th style={{ width: "30%" }}>What happens</th>
                        <th style={{ width: "28%" }}>Default event name</th>
                        <th>Your custom name <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-tertiary)" }}>(optional)</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {EVENT_FIELD_META.map((item) => (
                        <tr key={item.key}>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{item.label}</div>
                            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{item.description}</div>
                          </td>
                          <td>
                            <code style={{ fontSize: 12 }}>{item.key}</code>
                          </td>
                          <td>
                            <input
                              className="tc-input"
                              value={eventAliases[item.key] ?? ""}
                              onChange={(e) => setAlias(item.key, e.target.value)}
                              placeholder={`e.g. ${item.key}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <button
                  className="tc-btn tc-btn--primary tc-btn--sm"
                  onClick={saveEmbedAndAliases}
                  disabled={embedSaving}
                >
                  {embedSaving ? "Saving…" : "Save event names"}
                </button>
                {embedToast && (
                  <span style={{ fontSize: 13, color: embedToast.ok ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                    {embedToast.msg}
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  What GTM will receive
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-tertiary)" }}>
                  Exact event names that will appear in your GTM dataLayer and GA4 dashboard.
                </p>
                <CodeBlock code={JSON.stringify(previewAliasMap, null, 2)} />
              </div>

              <Link
                href="/docs?article=tracking-qa"
                target="_blank"
                rel="noreferrer noopener"
                style={{ fontSize: 13, color: "var(--blue-500)", fontWeight: 500, textDecoration: "none" }}
              >
                How to set up GTM triggers for embedded widgets →
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
