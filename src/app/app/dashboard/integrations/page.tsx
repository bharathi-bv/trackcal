/**
 * /app/dashboard/integrations — Webhooks, Zapier, Google Sheets
 *
 * Server Component: fetches current webhook URLs from host_settings,
 * then hands off to WebhookUrlEditor (client) for editing.
 */

import { createServerClient } from "@/lib/supabase";
import DashboardNav from "@/components/dashboard/DashboardNav";
import AnalyticsIdsEditor from "@/components/dashboard/AnalyticsIdsEditor";
import WebhookUrlEditor from "@/components/dashboard/WebhookUrlEditor";

// ── Tiny layout helpers ────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "var(--text-primary)",
        margin: "0 0 var(--space-1)",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  );
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "0 0 var(--space-5)", lineHeight: 1.6 }}>
      {children}
    </p>
  );
}

function StepList({ steps }: { steps: { n: number; title: string; body: React.ReactNode }[] }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {steps.map((s) => (
        <li key={s.n} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
          <span
            style={{
              flexShrink: 0,
              width: 24,
              height: 24,
              borderRadius: "var(--radius-full)",
              background: "var(--blue-50)",
              color: "var(--blue-500)",
              fontSize: 11,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {s.n}
          </span>
          <div style={{ paddingTop: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{s.title}</span>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: "var(--space-1)", lineHeight: 1.6 }}>
              {s.body}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        background: "var(--surface-subtle)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-sm)",
        padding: "1px 5px",
        color: "var(--text-primary)",
      }}
    >
      {children}
    </code>
  );
}

function PayloadBlock({ code }: { code: string }) {
  return (
    <pre
      style={{
        fontFamily: "monospace",
        fontSize: 12,
        background: "var(--surface-subtle)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        overflowX: "auto",
        color: "var(--text-primary)",
        lineHeight: 1.6,
        margin: 0,
        whiteSpace: "pre",
      }}
    >
      {code}
    </pre>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function IntegrationsPage() {
  const db = createServerClient();
  const [{ data: hostSettings }, { count: activeLinksCount }] = await Promise.all([
    db.from("host_settings").select("webhook_urls, google_analytics_id, google_tag_manager_id, meta_pixel_id, linkedin_partner_id").limit(1).maybeSingle(),
    db.from("event_types").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const webhookUrls: string[] = (hostSettings?.webhook_urls as string[] | null) ?? [];

  const PAYLOAD_EXAMPLE = `{
  "event": "booking.confirmed",
  "occurred_at": "2026-03-03T09:00:00.000Z",
  "booking": {
    "id": "b1a2c3d4-...",
    "manage_url": "https://your-citacal.com/manage/eyJ...",
    "reschedule_url": "https://your-citacal.com/reschedule/eyJ...",
    "cancel_url": "https://your-citacal.com/manage/eyJ...",
    "event_slug": "30-min-demo",
    "date": "2026-03-10",
    "time": "02:00 PM",
    "name": "Alice Chen",
    "email": "alice@example.com",
    "phone": null,
    "notes": null,
    "status": "confirmed",
    "assigned_to": "member-uuid-or-null",
    "custom_answers": {
      "q_abc123": "I run a 10-person sales team",
      "q_def456": ["HubSpot", "Salesforce"]
    }
  },
  "assigned_member": {
    "name": "Bob Patel",
    "photo_url": null
  },
  "utm": {
    "source": "google",
    "medium": "cpc",
    "campaign": "q1-brand-search",
    "term": null,
    "content": null
  },
  "click_ids": {
    "gclid": "CjwKCAiA...",
    "fbclid": null,
    "li_fat_id": null,
    "ttclid": null,
    "msclkid": null
  }
}`;

  return (
    <div style={{ minHeight: "100vh" }}>
      <DashboardNav
        activeTab="integrations"
        activeLinks={activeLinksCount ?? 0}
        email=""
      />

      <main
        className="dashboard-main"
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Integrations
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Send booking data to any tool — Zapier, Make, Google Sheets, CRMs.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

          <div className="tc-card" style={{ padding: "var(--space-6)" }}>
            <SectionHeading>Analytics tags</SectionHeading>
            <SectionDesc>
              Add your Google Analytics 4 and Google Tag Manager IDs so CitaCal can load them on your public pages and booking links.
            </SectionDesc>
            <AnalyticsIdsEditor
              initialGaId={(hostSettings as { google_analytics_id?: string | null } | null)?.google_analytics_id ?? null}
              initialGtmId={(hostSettings as { google_tag_manager_id?: string | null } | null)?.google_tag_manager_id ?? null}
              initialMetaPixelId={(hostSettings as { meta_pixel_id?: string | null } | null)?.meta_pixel_id ?? null}
              initialLinkedinPartnerId={(hostSettings as { linkedin_partner_id?: string | null } | null)?.linkedin_partner_id ?? null}
            />
          </div>

          {/* ── Webhook URLs ─────────────────────────────────────────────── */}
          <div className="tc-card" style={{ padding: "var(--space-6)" }}>
            <SectionHeading>Webhook URLs</SectionHeading>
            <SectionDesc>
              CitaCal sends a <InlineCode>POST</InlineCode> request to each URL the moment a booking is confirmed —
              with the full booking record, UTM params, and click IDs in the body.
            </SectionDesc>
            <WebhookUrlEditor initialUrls={webhookUrls} webhookSecret={null} />
          </div>

          {/* ── Zapier guide ─────────────────────────────────────────────── */}
          <div className="tc-card" style={{ padding: "var(--space-6)" }}>
            <SectionHeading>Connect to Zapier</SectionHeading>
            <SectionDesc>
              Use Zapier&apos;s free &quot;Webhooks by Zapier&quot; trigger to receive CitaCal bookings and route them to 6,000+
              apps — Slack, HubSpot, Salesforce, Notion, and more.
            </SectionDesc>

            <StepList
              steps={[
                {
                  n: 1,
                  title: "Create a new Zap",
                  body: (
                    <>
                      Go to <strong>zapier.com → Create Zap</strong>. For the trigger, search for{" "}
                      <strong>Webhooks by Zapier</strong> and choose the <strong>Catch Hook</strong> event.
                    </>
                  ),
                },
                {
                  n: 2,
                  title: "Copy your webhook URL",
                  body: (
                    <>
                      Click <strong>Continue</strong> — Zapier will show you a unique URL like{" "}
                      <InlineCode>https://hooks.zapier.com/hooks/catch/12345/abcdef/</InlineCode>. Copy it.
                    </>
                  ),
                },
                {
                  n: 3,
                  title: "Paste it into CitaCal",
                  body: (
                    <>
                      Paste the URL into the <strong>Webhook URLs</strong> box above and click{" "}
                      <strong>Save webhook URLs</strong>.
                    </>
                  ),
                },
                {
                  n: 4,
                  title: "Send a test booking",
                  body: (
                    <>
                      Make a test booking on your booking page. Then go back to Zapier and click{" "}
                      <strong>Test trigger</strong> — you should see the full booking payload including UTMs and click
                      IDs.
                    </>
                  ),
                },
                {
                  n: 5,
                  title: "Add your action",
                  body: (
                    <>
                      Choose what to do with each booking — add a row to Google Sheets, create a HubSpot contact,
                      post a Slack message, tag a lead in your CRM, etc. Map fields from the webhook payload
                      (e.g. <InlineCode>booking.name</InlineCode>, <InlineCode>utm.source</InlineCode>) to your app&apos;s fields.
                    </>
                  ),
                },
                {
                  n: 6,
                  title: "Turn on the Zap",
                  body: "Click Publish. Every new CitaCal booking will now trigger your automation instantly.",
                },
              ]}
            />
          </div>

          {/* ── Google Sheets guide ──────────────────────────────────────── */}
          <div className="tc-card" style={{ padding: "var(--space-6)" }}>
            <SectionHeading>Send bookings to Google Sheets</SectionHeading>
            <SectionDesc>
              Log every booking — including UTM source, campaign, and click IDs — as a new row in a Google Sheet.
              Great for lightweight reporting or sharing data with your team.
            </SectionDesc>

            <StepList
              steps={[
                {
                  n: 1,
                  title: "Create your Google Sheet",
                  body: (
                    <>
                      Create a new Google Sheet and add column headers in row 1:{" "}
                      <InlineCode>Date</InlineCode>, <InlineCode>Time</InlineCode>,{" "}
                      <InlineCode>Name</InlineCode>, <InlineCode>Email</InlineCode>,{" "}
                      <InlineCode>Status</InlineCode>, <InlineCode>Event Type</InlineCode>,{" "}
                      <InlineCode>UTM Source</InlineCode>, <InlineCode>UTM Campaign</InlineCode>,{" "}
                      <InlineCode>GCLID</InlineCode>.
                    </>
                  ),
                },
                {
                  n: 2,
                  title: "Follow the Zapier steps above",
                  body: "Set up a Catch Hook trigger in Zapier using your CitaCal webhook URL.",
                },
                {
                  n: 3,
                  title: "Add a Google Sheets action",
                  body: (
                    <>
                      Choose <strong>Google Sheets → Create Spreadsheet Row</strong>. Connect your Google account,
                      select your sheet, and map the fields:
                      <ul style={{ marginTop: "var(--space-2)", paddingLeft: "var(--space-5)", lineHeight: 2 }}>
                        <li><InlineCode>Date</InlineCode> → <InlineCode>booking.date</InlineCode></li>
                        <li><InlineCode>Time</InlineCode> → <InlineCode>booking.time</InlineCode></li>
                        <li><InlineCode>Name</InlineCode> → <InlineCode>booking.name</InlineCode></li>
                        <li><InlineCode>Email</InlineCode> → <InlineCode>booking.email</InlineCode></li>
                        <li><InlineCode>Status</InlineCode> → <InlineCode>booking.status</InlineCode></li>
                        <li><InlineCode>Event Type</InlineCode> → <InlineCode>booking.event_slug</InlineCode></li>
                        <li><InlineCode>UTM Source</InlineCode> → <InlineCode>utm.source</InlineCode></li>
                        <li><InlineCode>UTM Campaign</InlineCode> → <InlineCode>utm.campaign</InlineCode></li>
                        <li><InlineCode>GCLID</InlineCode> → <InlineCode>click_ids.gclid</InlineCode></li>
                      </ul>
                    </>
                  ),
                },
                {
                  n: 4,
                  title: "Publish and test",
                  body:
                    "Turn on the Zap. Make a test booking — a new row should appear in your Sheet within seconds.",
                },
              ]}
            />

            <div
              style={{
                marginTop: "var(--space-5)",
                padding: "var(--space-3) var(--space-4)",
                background: "var(--blue-50)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--blue-500)",
                fontWeight: 500,
              }}
            >
              Tip: Use Make (formerly Integromat) as a free alternative to Zapier — the same Catch Hook pattern works
              identically.
            </div>
          </div>

          {/* ── Payload reference ────────────────────────────────────────── */}
          <div className="tc-card" style={{ padding: "var(--space-6)" }}>
            <SectionHeading>Webhook payload reference</SectionHeading>
            <SectionDesc>
              Every webhook request is a <InlineCode>POST</InlineCode> with{" "}
              <InlineCode>Content-Type: application/json</InlineCode> and these headers:
            </SectionDesc>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
              {[
                { header: "x-citacal-event", desc: "booking.confirmed, booking.cancelled, booking.rescheduled, or booking.status_changed" },
                { header: "x-citacal-delivery-id", desc: "UUID — unique per delivery, useful for deduplication" },
                { header: "x-citacal-timestamp", desc: "Unix timestamp (seconds) when the request was sent" },
                { header: "x-citacal-signature", desc: "HMAC-SHA256 of timestamp.body using CITACAL_WEBHOOK_SECRET (only if env var is set)" },
              ].map(({ header, desc }) => (
                <div key={header} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                  <InlineCode>{header}</InlineCode>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", paddingTop: 2 }}>{desc}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--space-3)", margin: "0 0 var(--space-3)" }}>
              Example body
            </p>
            <PayloadBlock code={PAYLOAD_EXAMPLE} />
          </div>

        </div>
      </main>
    </div>
  );
}
