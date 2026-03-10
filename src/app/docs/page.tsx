"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────── */
type Section = { id: string; label: string; articles: Article[] };
type Article = { id: string; title: string; content: React.ReactNode };

/* ─── Styled helpers ─────────────────────────────────────────── */
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", margin: "0 0 8px", letterSpacing: "-0.02em" }}>{children}</h2>
);
const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E", margin: "28px 0 8px" }}>{children}</h3>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 14, color: "#454560", lineHeight: 1.75, margin: "0 0 14px" }}>{children}</p>
);
const Note = ({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "tip" }) => {
  const s = {
    info:    { bg: "rgba(91,141,246,0.07)",  border: "rgba(91,141,246,0.22)",  icon: "ℹ️" },
    warning: { bg: "rgba(224,112,112,0.07)", border: "rgba(224,112,112,0.22)", icon: "⚠️" },
    tip:     { bg: "rgba(61,170,122,0.07)",  border: "rgba(61,170,122,0.22)",  icon: "✅" },
  }[type];
  return (
    <div style={{ padding: "12px 16px", borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, marginBottom: 16, display: "flex", gap: 10 }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ fontSize: 13, color: "#454560", lineHeight: 1.65 }}>{children}</div>
    </div>
  );
};
const Code = ({ children }: { children: React.ReactNode }) => (
  <code style={{ background: "rgba(123,108,246,0.08)", color: "#7B6CF6", padding: "1px 6px", borderRadius: 5, fontSize: 12, fontFamily: "monospace" }}>{children}</code>
);
const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    style={{ color: "#7B6CF6", textDecoration: "none", fontWeight: 600 }}
  >
    {children}
  </a>
);
const CodeBlock = ({ children, label }: { children: string; label?: string }) => (
  <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 16, border: "1px solid rgba(200,198,230,0.4)" }}>
    {label && <div style={{ background: "#F4F3FF", padding: "6px 14px", fontSize: 10, fontWeight: 700, color: "#9090B8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(200,198,230,0.35)" }}>{label}</div>}
    <pre style={{ background: "#1A1A2E", color: "#C8C8E8", padding: "16px 18px", margin: 0, fontSize: 12, lineHeight: 1.75, overflowX: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{children}</pre>
  </div>
);
const Ul = ({ items }: { items: string[] }) => (
  <ul style={{ padding: "0 0 0 6px", margin: "0 0 14px", listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
    {items.map((item) => (
      <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "#454560", lineHeight: 1.6 }}>
        <span style={{ color: "#7B6CF6", marginTop: 2, flexShrink: 0 }}>›</span> {item}
      </li>
    ))}
  </ul>
);
const Steps = ({ steps }: { steps: { title: string; body: React.ReactNode }[] }) => (
  <ol style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 0 }}>
    {steps.map((s, i) => (
      <li key={i} style={{ display: "flex", gap: 16, paddingBottom: i < steps.length - 1 ? 20 : 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#FFF", zIndex: 1 }}>{i + 1}</div>
          {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: "rgba(123,108,246,0.20)", marginTop: 4 }} />}
        </div>
        <div style={{ paddingTop: 4, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>{s.title}</div>
          <div style={{ fontSize: 13, color: "#454560", lineHeight: 1.65 }}>{s.body}</div>
        </div>
      </li>
    ))}
  </ol>
);

/* ─── ARTICLES ────────────────────────────────────────────────── */

const QuickStartContent = () => (
  <>
    <H2>Set up CitaCal in 10 minutes</H2>
    <P>From signup to a live booking link with attribution tracking — here&apos;s the fastest path.</P>
    <Steps steps={[
      { title: "Create your account", body: <>Go to <Link href="/signup" style={{ color: "#7B6CF6" }}>citacal.com/signup</Link> and sign up with email or Google. No credit card, no trial period — CitaCal is free.</> },
      { title: "Connect your calendar", body: "In Settings → Profile & Availability, click 'Connect Google'. Approve the calendar permission. CitaCal will now check your real availability and write confirmed bookings to your calendar." },
      { title: "Set your working hours", body: "Still in Settings, use the 7-day availability editor to set the days and hours you want to accept meetings. This is your global default." },
      { title: "Create a meeting link", body: "Go to Scheduling → click '+ New Page'. Name it (e.g. '30-min Demo'), choose a duration, and save. Your booking link is immediately live." },
      { title: "Share it with UTMs attached", body: <>Your default link looks like <Code>citacal.com/book/your-name/demo-30min</Code>. If you use a custom booking subdomain, it can be <Code>book.yourdomain.com/your-name/demo-30min</Code>. When sharing from ads, append UTMs after the path: <Code>?utm_source=linkedin&amp;utm_campaign=q1</Code>. CitaCal captures them automatically.</> },
    ]} />
    <Note type="tip">If you run paid ads, CitaCal&apos;s entire value is in those UTM parameters. Always append them — and your ad platform&apos;s click IDs too (e.g. <Code>&amp;gclid=&#123;gclid&#125;</Code> for Google Ads, <Code>&amp;li_fat_id=&#123;li_fat_id&#125;</Code> for LinkedIn).</Note>
  </>
);

const HowVisitorBooksContent = () => (
  <>
    <H2>How a visitor books a meeting</H2>
    <P>Understanding the visitor experience helps you optimize for conversion and ensure attribution is captured correctly.</P>
    <H3>What happens when someone opens your booking link</H3>
    <P>The moment the page loads, CitaCal reads any UTM parameters and click IDs from the URL and stores them in the visitor&apos;s browser (localStorage, 30-day expiry). This happens before they interact with anything.</P>
    <H3>Picking a time</H3>
    <P>A mini calendar sits on the left, and a 3-column slot grid shows the next three available days on the right. Slots are derived from your working hours minus any existing calendar events.</P>
    <Ul items={[
      "Visitors can switch to their own timezone — slots relabel automatically",
      "They can optionally connect their own Google Calendar to check for personal conflicts before booking",
      "Weekends are greyed out unless you specifically enable them in your availability",
    ]} />
    <H3>Filling in their details</H3>
    <P>Name and email are required. Phone and notes are optional. A hidden honeypot field silently discards submissions from bots.</P>
    <H3>Confirming the booking</H3>
    <P>A review screen shows all details before they commit. Once confirmed, CitaCal creates a calendar event, assigns a team member (if round-robin is on), and fires your webhooks with full attribution data.</P>
    <Note type="info">Even if a visitor closes the page and comes back days later, CitaCal will still credit the original UTMs from that first visit — as long as it&apos;s within 30 days.</Note>
    <H3>Spam and junk prevention</H3>
    <Ul items={[
      "Disposable email domains (Mailinator, Guerrillamail, etc.) are rejected automatically",
      "Max 20 bookings per IP per hour, max 8 per email per day",
      "Duplicate bookings for the same email + time slot are blocked",
    ]} />
  </>
);

const CreateMeetingLinkContent = () => (
  <>
    <H2>Create and manage your meeting links</H2>
    <P>Each meeting link (called a Scheduling Page) is a separate URL with its own duration, availability, team assignment, and meeting details.</P>
    <H3>Create your first meeting link</H3>
    <Steps steps={[
      { title: "Go to Scheduling in the top nav", body: "This is your meeting link library." },
      { title: "Click '+ New Page'", body: "A drawer opens on the right with all settings." },
      { title: "Set the name and slug", body: <>The slug appears after your public username, like <Code>/book/your-name/your-slug</Code> on citacal.com (or <Code>/your-name/your-slug</Code> on a custom booking subdomain). Keep it lowercase and short, like <Code>demo-30min</Code> or <Code>intro-call</Code>.</> },
      { title: "Choose duration and slot frequency", body: "Duration is how long the meeting is. Slot increment controls how often slots appear — e.g. slots every 30 minutes starting from 9:00 AM." },
      { title: "Save and copy the link", body: "The link is live immediately. Copy it and add UTM parameters before sharing." },
    ]} />
    <H3>Control when people can book</H3>
    <Ul items={[
      "Min notice hours — e.g. set to 4 to prevent same-day bookings with less than 4 hours' notice",
      "Max days in advance — limit how far out the calendar shows (e.g. 30 days)",
      "Buffer before/after — block time around each meeting to prevent back-to-backs",
      "Max bookings per day — cap how many meetings can fill a single day",
      "Booking window — set a fixed start and end date if you want to limit a campaign's booking period",
    ]} />
    <H3>Set where the meeting happens</H3>
    <P>In the Details tab of the editor, choose the meeting location. Options: Google Meet (auto-generated), Zoom, Phone, Custom URL, or None. This gets included in the calendar invite.</P>
    <H3>Duplicate a meeting link</H3>
    <P>Click the copy icon on any meeting link card to create an identical duplicate. Useful for running different configurations in parallel — for example, a 20-min version vs a 30-min version of the same call type.</P>
    <H3>Pause or disable a link</H3>
    <P>Toggle a meeting link inactive to stop accepting bookings without deleting it. The URL returns no available slots. Reactivate any time.</P>
    <Note type="tip">Create separate meeting links for each ad campaign if you want clean attribution segmentation per campaign in your analytics.</Note>
  </>
);

const SetWorkingHoursContent = () => (
  <>
    <H2>Set your working hours</H2>
    <P>CitaCal uses a two-level availability system: a global default and optional per-link overrides.</P>
    <H3>Set your global default hours</H3>
    <Steps steps={[
      { title: "Go to Settings → Profile & Availability", body: "Scroll to the Weekly Availability section." },
      { title: "Enable each day you work", body: "Toggle the checkbox for each day. Unchecked days will show no available slots." },
      { title: "Set start and end times", body: "Choose start and end hours for each enabled day. These define when slots can appear." },
      { title: "Save changes", body: "Your global schedule updates immediately across all meeting links that don't have a custom schedule." },
    ]} />
    <P>Use the <strong>&quot;Reset to Mon–Fri 9–5&quot;</strong> button for a quick standard schedule.</P>
    <H3>Give a specific meeting link its own schedule</H3>
    <P>When editing a meeting link, open the <strong>Availability tab</strong> and toggle &quot;Custom schedule&quot;. This shows the same 7-day editor, but changes only affect that specific link. Turn the toggle off to go back to your global default.</P>
    <P>Example: your general booking link runs Mon–Fri 9–5, but your customer onboarding call only runs Tuesday and Thursday afternoons.</P>
    <H3>How your calendar events affect availability</H3>
    <P>Even if a time falls within your working hours, CitaCal will hide that slot if your connected calendar shows you as busy. A slot is only shown if it&apos;s within configured hours AND your calendar is free.</P>
    <H3>Add buffer time between meetings</H3>
    <P>Set &quot;Buffer before&quot; and &quot;Buffer after&quot; on a meeting link (in the Advanced tab) to block time around each booking. A 15-minute buffer after a 30-minute meeting means the next bookable slot starts 45 minutes after the previous one.</P>
  </>
);

const ConnectCalendarContent = () => (
  <>
    <H2>Connect your Google or Outlook calendar</H2>
    <P>Without a connected calendar, CitaCal shows all slots as available and can&apos;t create calendar events. Connecting takes about 30 seconds.</P>
    <H3>Connect Google Calendar</H3>
    <Steps steps={[
      { title: "Go to Settings", body: "Click Settings in the top nav." },
      { title: "Click 'Connect Google'", body: "A Google OAuth consent popup opens." },
      { title: "Approve calendar access", body: "CitaCal requests two permissions: read your free/busy times, and write new calendar events when a booking is confirmed." },
      { title: "Done", body: "The nav bar shows a green 'Calendar connected' badge. Your real availability is now reflected on your booking page." },
    ]} />
    <Note type="info">CitaCal only reads your free/busy status — it cannot see the names, descriptions, or attendees of your existing events.</Note>
    <H3>Connect Microsoft Outlook</H3>
    <P>Click &quot;Connect Outlook&quot; instead of Connect Google. The flow is identical, using Microsoft&apos;s OAuth consent screen. Only one calendar provider can be active at a time.</P>
    <H3>Disconnect your calendar</H3>
    <P>In Settings → Profile & Availability, click &quot;Disconnect calendar&quot;. This removes the stored tokens immediately. Your booking page will stop syncing availability. Existing calendar events are not deleted.</P>
    <H3>If your availability looks wrong</H3>
    <Ul items={[
      "Make sure your working hours are configured in Settings (disconnected calendar + empty hours = no slots)",
      "Try disconnecting and reconnecting — tokens occasionally expire",
      "Check that the calendar you connected matches the calendar where your events actually live (primary vs work calendar)",
    ]} />
  </>
);

const WhereBookingsFromContent = () => (
  <>
    <H2>See where your bookings come from</H2>
    <P>CitaCal captures 10 attribution signals on every booking — 5 UTM parameters and 5 ad platform click IDs.</P>
    <H3>What gets captured automatically</H3>
    <CodeBlock label="Parameters captured on every page load">{`utm_source      — traffic source (google, linkedin, twitter…)
utm_medium      — channel type (paid, cpc, organic, email…)
utm_campaign    — campaign name you define in your ad platform
utm_term        — keyword or ad group
utm_content     — ad variant or specific CTA

gclid           — Google Ads click ID (auto-inserted by Google)
li_fat_id       — LinkedIn Ads click ID
fbclid          — Meta / Facebook Ads click ID
ttclid          — TikTok Ads click ID
msclkid         — Microsoft / Bing Ads click ID`}</CodeBlock>
    <H3>Make sure your ad links pass these through</H3>
    <Steps steps={[
      { title: "Add UTM parameters to your booking link in your ad platform", body: <>Use your platform&apos;s URL builder. Result: <Code>citacal.com/book/your-name/demo?utm_source=linkedin&amp;utm_medium=paid&amp;utm_campaign=q1-demo</Code></> },
      { title: "Enable auto-tagging for click IDs", body: "For Google Ads, enable auto-tagging in account settings. For LinkedIn, enable the LinkedIn Insight Tag. For Meta, enable auto advanced matching." },
      { title: "Insert the click ID parameter dynamically", body: <>Add the platform&apos;s macro to your URL. Google: <Code>&amp;gclid=&#123;gclid&#125;</Code>. LinkedIn: <Code>&amp;li_fat_id=&#123;li_fat_id&#125;</Code>. Meta: <Code>&amp;fbclid=&#123;fbclid&#125;</Code>.</> },
      { title: "Check your Attribution Coverage in Analytics", body: "The Analytics dashboard shows an 'Attribution Coverage %' KPI — what % of bookings have a known source. Aim for 90%+." },
    ]} />
    <Note type="warning">If you use a redirect or URL shortener before your booking link, test that UTM parameters survive the redirect. Many URL shorteners strip query params.</Note>
    <H3>How CitaCal stores attribution across sessions</H3>
    <P>Attribution is captured at first visit and stored in <Code>localStorage</Code> with a 30-day expiry. If a visitor bookmarks your page, returns the next day, and books — you still get their original UTMs. This matches how Google Analytics handles attribution.</P>
  </>
);

const ReadAnalyticsContent = () => (
  <>
    <H2>Read your booking analytics</H2>
    <P>The Analytics page gives you a full table of all bookings with every attribution field, plus five summary KPIs.</P>
    <H3>Read the five KPI cards</H3>
    <Ul items={[
      "Total Bookings — all bookings matching the current filter (not just today)",
      "Today — bookings scheduled for today's date",
      "Top Source — which utm_source has sent you the most bookings",
      "Attribution Coverage — % of bookings with a known utm_source. Low = your UTMs are being dropped somewhere in the funnel",
      "Click ID Capture — % of bookings with at least one ad platform click ID. Low = your ad platform auto-tagging is off or your URL chain strips params",
    ]} />
    <H3>Filter to the data you need</H3>
    <P>Use the filter row above the table to narrow down bookings:</P>
    <Ul items={[
      "Date range — pick from/to dates",
      "Source — select a specific utm_source",
      "Campaign — type a campaign name (partial match works)",
      "Status — show only confirmed, pending, cancelled, or no-show bookings",
      "Search — free text across name, email, and campaign at once",
    ]} />
    <P>All active filters combine (AND logic) and are reflected in the URL — bookmark or share filtered views.</P>
    <H3>Update a booking&apos;s status</H3>
    <P>Click the status pill on any row in the table to update it inline. Options: confirmed, pending, cancelled, no_show. Cancelling from the dashboard removes the connected calendar event and Zoom meeting when available. Other status changes update reporting and exports.</P>
    <H3>Export to CSV</H3>
    <P>Click &quot;Export CSV&quot; to download all bookings matching your current filter. The CSV includes every field: date, time, attendee name and email, phone, notes, all 10 attribution fields, status, and assigned team member. Bring this into Sheets, Looker Studio, or your data warehouse.</P>
    <H3>Understand the source breakdown chart</H3>
    <P>The horizontal bar chart below the KPIs shows booking volume by <Code>utm_source</Code>, ranked highest to lowest. It&apos;s a quick gut-check — if LinkedIn drives 80% of demos but only 20% of your ad spend, that&apos;s your signal.</P>
  </>
);

const TrackingDeepDiveIntroContent = () => (
  <>
    <H2>Tracking deep dive: architecture and decisions</H2>
    <P>
      This section is a deeper tracking reference for operators and implementers. It explains what CitaCal captures, why it captures it, and how to avoid attribution loss in embedded or cross-domain flows.
    </P>
    <H3>CitaCal attribution model</H3>
    <Ul items={[
      "Capture UTM and click IDs at first page load",
      "Persist attribution context in browser storage for returning visitors",
      "Attach attribution fields to booking POST payload",
      "Persist to bookings table and fan out through webhook + exports",
    ]} />
    <CodeBlock label="Canonical fields">{`utm_source, utm_medium, utm_campaign, utm_term, utm_content
gclid, gbraid, wbraid
fbclid, fbc, fbp
li_fat_id, ttclid, msclkid
ga_linker (_gl)`}</CodeBlock>
    <H3>Embed vs direct link</H3>
    <P>Direct booking links are the most reliable option for attribution continuity. If embedding is required, use CitaCal JS embed so parent URL params are forwarded into the booking flow. Avoid static iframe-only setups for paid traffic funnels.</P>
    <Note type="tip">
      Benchmark precision reference (Calendly docs):
      {" "}
      <ExternalLink href="https://help.calendly.com/hc/en-us/articles/223195428-Tracking-and-reporting#h_01JRTMM9G16GMGQ7MKPZ14Z6B0">Tracking and reporting</ExternalLink>,
      {" "}
      <ExternalLink href="https://help.calendly.com/hc/en-us/articles/360001575393-Calendly-Google-Analytics#h_01JXFTB6XPHVWM71VEV61D2HV5">Google Analytics setup</ExternalLink>,
      {" "}
      <ExternalLink href="https://help.calendly.com/hc/en-us/articles/4412934840087-How-to-track-embed-activity-in-Google-Analytics#h_01JSCSSDMC8RN78WQFTXYW0VT5">Embed activity in GA</ExternalLink>.
    </Note>
  </>
);

const TrackingGa4GoogleContent = () => (
  <>
    <H2>Tracking deep dive: GA4 and Google Ads</H2>
    <P>Google reporting quality depends on two layers working together: GA4 session continuity and Google click ID continuity.</P>
    <H3>GA4 setup checklist</H3>
    <Steps steps={[
      { title: "Set GA4 ID (or GTM container)", body: "Configure in Integrations so booking pages load your analytics tags." },
      { title: "If cross-domain, validate linker continuity", body: <>Confirm <Code>_gl</Code> is preserved when users move into booking pages.</> },
      { title: "Verify conversion events", body: <>Check <Code>booking_pageview</Code> and <Code>booking_conversion</Code> in GA debug streams.</> },
    ]} />
    <H3>Google Ads setup checklist</H3>
    <Steps steps={[
      { title: "Enable auto-tagging", body: "Google Ads must append click identifiers automatically." },
      { title: "Keep URL templates consistent", body: <>Use UTMs + preserve <Code>gclid</Code>/<Code>gbraid</Code>/<Code>wbraid</Code>.</> },
      { title: "Map webhook fields downstream", body: <>Map <Code>click_ids.gclid</Code>, <Code>click_ids.gbraid</Code>, <Code>click_ids.wbraid</Code> in CRM/import pipelines.</> },
    ]} />
    <H3>What “healthy” looks like</H3>
    <Ul items={[
      "UTM coverage trending high for paid traffic",
      "Google click IDs visible in recent booking rows",
      "No sudden drop after landing page, redirect, or embed implementation changes",
    ]} />
    <P>
      Reference setup guide:
      {" "}
      <ExternalLink href="https://help.calendly.com/hc/en-us/articles/360001575393-Calendly-Google-Analytics#h_01JXFSJ9BMVRE73XTKG1SFHAER">
        Calendly GA reference
      </ExternalLink>.
    </P>
  </>
);

const TrackingPaidSocialContent = () => (
  <>
    <H2>Tracking deep dive: Meta, LinkedIn, Microsoft, TikTok</H2>
    <P>For paid social and non-Google paid channels, robust tracking usually requires both browser signals and server-side mappings.</P>
    <H3>Meta (Facebook/Instagram)</H3>
    <Ul items={[
      "Set Meta Pixel ID in Integrations",
      "Capture fbclid and preserve fbc/fbp identifiers",
      "Map webhook payload to CAPI with dedup strategy",
    ]} />
    <H3>LinkedIn Ads</H3>
    <Ul items={[
      "Set LinkedIn Partner ID in Integrations",
      "Ensure destination template appends li_fat_id",
      "Map click_ids.li_fat_id to CRM fields used in attribution reporting",
    ]} />
    <H3>Microsoft Ads and TikTok</H3>
    <Ul items={[
      "Preserve msclkid / ttclid in URL templates",
      "Pass consistent UTMs for reporting joins",
      "Store click IDs in CRM and conversion import workflows",
    ]} />
    <Note type="warning">If IDs are present on ad clicks but missing on bookings, first inspect redirects, link shorteners, and embed transport implementation.</Note>
  </>
);

const TrackingQaContent = () => (
  <>
    <H2>Tracking deep dive: QA and troubleshooting playbook</H2>
    <P>Use this when attribution quality drops or before launching paid campaigns.</P>
    <H3>Pre-launch QA run</H3>
    <Steps steps={[
      { title: "Build one test link per channel", body: "Use real ad-preview links so templates/macros are applied." },
      { title: "Complete one booking per test link", body: "Run full flow from click to booking confirmation." },
      { title: "Validate in Analytics", body: <>Confirm expected <Code>utm_source</Code> + channel click IDs in recent bookings.</> },
      { title: "Validate webhook payload", body: <>Confirm <Code>utm.*</Code> and <Code>click_ids.*</Code> values arrive downstream.</> },
    ]} />
    <H3>Root cause checklist for missing attribution</H3>
    <Ul items={[
      "Auto-tagging disabled in ad platform",
      "URL template missing click ID parameter",
      "Redirect chain stripping query params",
      "Static iframe used instead of JS embed",
      "CRM mapping overwriting IDs with null values",
    ]} />
    <H3>Reference docs for expected behavior</H3>
    <Ul items={[
      "Calendly tracking/reporting: https://help.calendly.com/hc/en-us/articles/223195428-Tracking-and-reporting#h_01JRTMM9G16GMGQ7MKPZ14Z6B0",
      "Calendly GA setup: https://help.calendly.com/hc/en-us/articles/360001575393-Calendly-Google-Analytics#h_01JXFTB6XPHVWM71VEV61D2HV5",
      "Calendly embed activity tracking: https://help.calendly.com/hc/en-us/articles/4412934840087-How-to-track-embed-activity-in-Google-Analytics#h_01JSCSSDMC8RN78WQFTXYW0VT5",
    ]} />
  </>
);

const SendWebhooksContent = () => (
  <>
    <H2>Send booking data to your CRM or Slack</H2>
    <P>CitaCal fires a server-side webhook on every confirmed booking. Connect it to HubSpot, Salesforce, Slack, or any HTTP endpoint.</P>
    <H3>Add a webhook URL</H3>
    <Steps steps={[
      { title: "Go to Settings → Profile & Availability", body: "Scroll to the Webhook URLs field at the bottom." },
      { title: "Paste your endpoint URL", body: "One URL per line. CitaCal fires to all of them. You can also use a Zapier webhook URL, a Make.com webhook, or any HTTP endpoint." },
      { title: "Save", body: "Active immediately. The next confirmed booking will POST to your endpoint." },
    ]} />
    <H3>What gets sent</H3>
    <CodeBlock label="Webhook payload (POST, application/json)">{`{
  "event": "booking.confirmed",
  "occurred_at": "2026-03-04T10:00:00.000Z",
  "booking": {
    "id": "uuid",
    "date": "2026-03-04",
    "time": "10:00 AM",
    "name": "Sarah Chen",
    "email": "sarah@acme.co",
    "phone": "+1 (415) 555-0123",
    "notes": "Interested in the enterprise plan",
    "status": "confirmed",
    "event_slug": "demo-30min",
    "manage_url": "https://…/manage/eyJ…",
    "reschedule_url": "https://…/reschedule/eyJ…",
    "cancel_url": "https://…/manage/eyJ…"
  },
  "assigned_member": { "name": "Aiden Hart", "photo_url": "…" },
  "utm": {
    "source": "linkedin",
    "medium": "paid",
    "campaign": "q1-demo-b"
  },
  "click_ids": {
    "li_fat_id": "CjwKCAjwzN…",
    "gclid": null,
    "fbclid": null
  }
}`}</CodeBlock>
    <H3>Connect to HubSpot</H3>
    <P>Use a HubSpot workflow with a webhook trigger, or use Zapier/Make.com to map the payload fields to HubSpot contact and deal properties. Map <Code>utm.source</Code> → Lead Source, <Code>click_ids.li_fat_id</Code> → LinkedIn Click ID custom property, etc.</P>
    <H3>Post to Slack</H3>
    <P>Create a Slack Incoming Webhook URL and paste it in Settings. Every new booking posts a notification to your chosen Slack channel.</P>
    <H3>Verify the webhook is genuine (optional)</H3>
    <P>Set the <Code>CITACAL_WEBHOOK_SECRET</Code> environment variable to enable HMAC-SHA256 signing. Each request includes an <Code>X-CitaCal-Signature</Code> header you can verify:</P>
    <CodeBlock label="Node.js signature verification">{`const crypto = require('crypto');
function verifyWebhook(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`}</CodeBlock>
  </>
);

const AddTeamContent = () => (
  <>
    <H2>Add team members and set up round-robin routing</H2>
    <P>Add your sales or CS reps so CitaCal can automatically assign bookings to whoever is available next.</P>
    <H3>Invite someone to your team</H3>
    <Steps steps={[
      { title: "Go to Settings → Team Members tab", body: "Click '+ Invite Member'." },
      { title: "Enter their name and email", body: "CitaCal sends them an invite email via Supabase Auth." },
      { title: "They accept and connect their calendar", body: "They click the link in the email, set a password, and land on their Member Settings page where they connect their Google or Outlook calendar." },
    ]} />
    <Note type="info">Team members each connect their own personal calendar. CitaCal checks each person&apos;s real availability before assigning them a booking.</Note>
    <H3>Route bookings to your team automatically</H3>
    <Steps steps={[
      { title: "Open a meeting link for editing", body: "Go to Scheduling → click edit on the meeting link you want to configure." },
      { title: "Open the Team tab", body: "Select one or more team members from the list." },
      { title: "Save", body: "From now on, new bookings for this link are round-robin assigned." },
    ]} />
    <H3>How round-robin decides who gets the booking</H3>
    <Ul items={[
      "All assigned members are fetched, sorted by who was least recently booked",
      "CitaCal checks each person's calendar in parallel to confirm they're free at the requested time",
      "The first available person (sorted by last booking time) gets assigned",
      "If two requests come in simultaneously, a database constraint prevents double-assignment",
      "If no team member is available, the booking falls back to your host calendar",
    ]} />
    <H3>Manage a team member</H3>
    <Ul items={[
      "Toggle active/inactive — inactive members are skipped in round-robin but stay in your team",
      "Disconnect their calendar from Settings (you) or from their own Member Settings page",
      "Remove a member — they're detached from all meeting links, future bookings go to the next available person",
    ]} />
  </>
);

const RescheduleContent = () => (
  <>
    <H2>Reschedule or cancel a booking</H2>
    <P>Attendees can self-service reschedule or cancel using links in their confirmation. You can also update any booking&apos;s status directly from the dashboard.</P>
    <H3>Let an attendee reschedule themselves</H3>
    <P>Every booking confirmation email includes a <strong>Reschedule link</strong>. When clicked:</P>
    <Ul items={[
      "The attendee sees available slots for the same meeting type",
      "They pick a new time and the existing booking moves to the new slot",
      "The connected calendar event is updated automatically",
      "The manage link stays valid until it expires based on your token TTL (365 days by default)",
    ]} />
    <H3>Let an attendee cancel</H3>
    <P>The confirmation also includes a <strong>Cancel link</strong>. Clicking it changes the booking status to &quot;cancelled&quot;. The calendar event is removed automatically.</P>
    <H3>Change a booking&apos;s status yourself</H3>
    <P>In Analytics → click the status pill on any booking row to change it inline. Use this to:</P>
    <Ul items={[
      "Mark no-shows after the meeting time has passed",
      "Cancel a booking on behalf of an attendee",
      "Move pending bookings to confirmed",
    ]} />
    <Note type="warning">Changing a booking status from the dashboard does not update the Google Calendar event. Manually delete or update the calendar event if needed.</Note>
    <H3>Find a specific booking</H3>
    <P>Use the Search field in Analytics to find a booking by attendee name, email, or campaign. You can also filter by date range or status to narrow the list.</P>
  </>
);

const EmbedContent = () => (
  <>
    <H2>Embed the booking widget on your website</H2>
    <P>CitaCal supports JavaScript embed mode. This mode forwards UTMs/click IDs from your landing page and supports auto-resize.</P>
    <H3>Add the JavaScript embed snippet</H3>
    <CodeBlock label="HTML">{`<script async src="https://citacal.com/citacal-embed.js" data-citacal-url="https://citacal.com"></script>
<div data-citacal-embed data-host="your-name" data-event="demo-30min" data-height="760"></div>`}</CodeBlock>
    <H3>If you use a custom booking subdomain</H3>
    <P>Replace <Code>data-citacal-url</Code> with your booking base URL, for example <Code>https://book.yourdomain.com</Code>.</P>
    <Note type="warning">Use CitaCal&apos;s JS embed only. Custom iframe embeds are not a supported setup for attribution-critical flows.</Note>
    <H3>When to use a direct link instead</H3>
    <P>For most use cases — ad campaigns, email CTAs, LinkedIn — a direct link to <Code>citacal.com/book/your-name/your-slug</Code> is simpler and more reliable for attribution than embedding. If you use a custom booking subdomain, the path can remain <Code>/your-name/your-slug</Code>. The booking page is mobile-responsive and loads in under 2 seconds.</P>
  </>
);

const AccountSettingsContent = () => (
  <>
    <H2>Manage your account settings</H2>
    <P>Settings is split into two tabs: Profile & Availability (your personal setup) and Team Members.</P>
    <H3>Update your name and photo</H3>
    <P>Your host name and photo appear on the booking page visible to attendees. Upload a photo URL or leave it blank — CitaCal shows a colour-initial avatar as fallback.</P>
    <H3>Set a custom booking domain</H3>
    <P>If you run CitaCal on your own domain (e.g. <Code>book.yourdomain.com</Code>), enter the full URL in the Booking base URL field. Self-service links in webhooks and confirmation emails will use your domain instead of citacal.com.</P>
    <H3>Add webhook URLs</H3>
    <P>Paste one or more webhook endpoint URLs (one per line). CitaCal fires to all of them on booking confirmation. See &quot;Send booking data to your CRM or Slack&quot; for the full payload spec.</P>
    <H3>Switch or disconnect your calendar</H3>
    <P>You can only have one calendar provider connected at a time (Google or Outlook). Click &quot;Disconnect calendar&quot; first, then connect the other provider. This only removes the token — no calendar events are deleted.</P>
  </>
);

const FixIssuesContent = () => (
  <>
    <H2>Fix common issues</H2>

    <H3>No time slots are showing on my booking page</H3>
    <Ul items={[
      "Check Settings — the nav bar should show a green 'Calendar connected' badge",
      "Check your global availability schedule — make sure at least one day is enabled with valid hours",
      "If the meeting link has a custom schedule, check that it has enabled days too",
      "Try disconnecting and reconnecting your calendar — tokens can expire",
    ]} />

    <H3>My UTMs or click IDs aren&apos;t showing up in Analytics</H3>
    <Ul items={[
      "Verify the UTM parameters actually appear in your booking page URL (check the browser address bar)",
      "Check that your ad platform's auto-tagging is enabled",
      "If embedding, use CitaCal's JavaScript embed snippet (custom iframe setups are not supported)",
      "Test that your redirect chain doesn't strip query parameters (e.g. URL shorteners often do this)",
      "For Google Ads: enable auto-tagging in account settings. For LinkedIn: enable the LinkedIn Insight Tag.",
    ]} />

    <H3>Round-robin keeps assigning to the same person</H3>
    <Ul items={[
      "Confirm all assigned team members have connected their calendars",
      "Check that team members are set to Active in Settings → Team Members",
      "Open the meeting link editor → Team tab — verify multiple members are selected",
    ]} />

    <H3>The Google auth popup closes without completing</H3>
    <P>If you dismiss the popup on the booking page (the attendee calendar conflict check), the button resets automatically with a &quot;Cancelled — click to try again&quot; message. Refresh the page if it stays stuck.</P>

    <H3>My webhook isn&apos;t receiving data</H3>
    <Ul items={[
      "Webhooks only fire when a booking status becomes 'confirmed' — check the booking status in Analytics",
      "The webhook URL must be publicly reachable over HTTPS (private/internal endpoints will fail in production)",
      "Verify the URL in Settings → Webhook URLs is spelled correctly",
      "Your endpoint must return a 2xx HTTP response — non-2xx is logged as a failure",
    ]} />

    <H3>A team member can&apos;t access their invite link</H3>
    <P>Invite links expire after 24 hours. Remove the team member from Settings → Team Members, then re-invite them to send a fresh link.</P>

    <H3>The booking page shows the wrong timezone by default</H3>
    <P>CitaCal defaults to the visitor&apos;s browser timezone using <Code>Intl.DateTimeFormat().resolvedOptions().timeZone</Code>. If this is wrong, the visitor can open the timezone picker and select their correct zone — it persists for their session.</P>
  </>
);

/* ─── SECTIONS DATA ─────────────────────────────────────────── */
const SECTIONS: Section[] = [
  {
    id: "start", label: "Get started",
    articles: [
      { id: "quick-start",     title: "Set up in 10 minutes",              content: <QuickStartContent /> },
      { id: "visitor-flow",    title: "How a visitor books a meeting",     content: <HowVisitorBooksContent /> },
    ],
  },
  {
    id: "links", label: "Meeting links",
    articles: [
      { id: "create-link",     title: "Create and manage meeting links",   content: <CreateMeetingLinkContent /> },
      { id: "working-hours",   title: "Set your working hours",            content: <SetWorkingHoursContent /> },
      { id: "calendar",        title: "Connect Google or Outlook",         content: <ConnectCalendarContent /> },
    ],
  },
  {
    id: "attribution", label: "Track attribution",
    articles: [
      { id: "where-from",      title: "See where your bookings come from", content: <WhereBookingsFromContent /> },
      { id: "analytics",       title: "Read your booking analytics",       content: <ReadAnalyticsContent /> },
      { id: "webhooks",        title: "Send booking data to your CRM",     content: <SendWebhooksContent /> },
    ],
  },
  {
    id: "tracking-deep-dive", label: "Tracking Deep Dive",
    articles: [
      { id: "tracking-intro",  title: "Architecture and decisions",         content: <TrackingDeepDiveIntroContent /> },
      { id: "tracking-ga4",    title: "GA4 and Google Ads",                 content: <TrackingGa4GoogleContent /> },
      { id: "tracking-social", title: "Meta, LinkedIn, Microsoft, TikTok",  content: <TrackingPaidSocialContent /> },
      { id: "tracking-qa",     title: "QA and troubleshooting playbook",    content: <TrackingQaContent /> },
    ],
  },
  {
    id: "team", label: "Your team",
    articles: [
      { id: "add-team",        title: "Add team and auto-route bookings",  content: <AddTeamContent /> },
    ],
  },
  {
    id: "bookings", label: "Bookings",
    articles: [
      { id: "reschedule",      title: "Reschedule or cancel a booking",    content: <RescheduleContent /> },
      { id: "embed",           title: "Embed on your website",             content: <EmbedContent /> },
    ],
  },
  {
    id: "account", label: "Account",
    articles: [
      { id: "settings",        title: "Manage your account settings",      content: <AccountSettingsContent /> },
      { id: "troubleshooting", title: "Fix common issues",                 content: <FixIssuesContent /> },
    ],
  },
];

/* ─── Docs nav ──────────────────────────────────────────────── */
function DocsNav({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(248,248,255,0.88)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(200,198,230,0.35)",
      padding: "0 24px", display: "flex", alignItems: "center", height: 52, gap: 12,
    }}>
      {onToggleSidebar && (
        <button className="docs-hamburger" onClick={onToggleSidebar} aria-label="Toggle menu">
          ☰
        </button>
      )}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #7B6CF6, #A89AF9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", fontFamily: "var(--font-sans)" }}>CitaCal</span>
      </Link>
      <span style={{ color: "rgba(200,198,230,0.8)", fontSize: 16 }}>/</span>
      <span style={{ fontSize: 13, color: "#6E6E96", fontFamily: "var(--font-sans)" }}>Documentation</span>
      <div style={{ flex: 1 }} />
      <Link href="/app/dashboard" style={{ fontSize: 13, color: "#454560", textDecoration: "none", fontFamily: "var(--font-sans)" }}>Go to app →</Link>
    </nav>
  );
}

/* ─── Main ──────────────────────────────────────────────────── */
export default function DocsPage() {
  return (
    <React.Suspense>
      <DocsPageInner />
    </React.Suspense>
  );
}

function DocsPageInner() {
  const allArticles = React.useMemo(() => SECTIONS.flatMap((s) => s.articles), []);
  const defaultArticleId = allArticles[0]?.id ?? "";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const articleParam = searchParams.get("article");
  const isValidArticleParam = Boolean(articleParam && allArticles.some((a) => a.id === articleParam));

  const [activeId, setActiveId] = React.useState(isValidArticleParam && articleParam ? articleParam : defaultArticleId);
  const [search, setSearch] = React.useState("");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const setActiveArticle = React.useCallback(
    (nextId: string) => {
      setActiveId(nextId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("article", nextId);
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  React.useEffect(() => {
    if (isValidArticleParam && articleParam && articleParam !== activeId) {
      setActiveId(articleParam);
    }
  }, [activeId, articleParam, isValidArticleParam]);

  const active = allArticles.find((a) => a.id === activeId) ?? allArticles[0];
  const filtered = search.trim()
    ? allArticles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : null;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--bg-gradient)", minHeight: "100vh", color: "#1A1A2E" }}>
      <DocsNav onToggleSidebar={() => setSidebarOpen((o) => !o)} />

      {/* Mobile overlay */}
      <div
        className={"docs-overlay" + (sidebarOpen ? " docs-overlay--visible" : "")}
        onClick={closeSidebar}
      />

      <div style={{ display: "flex", maxWidth: 1160, margin: "0 auto" }}>
        {/* ── Sidebar ── */}
        <aside className={"docs-sidebar" + (sidebarOpen ? " docs-sidebar--open" : "")} style={{
          width: 220, flexShrink: 0, borderRight: "1px solid rgba(200,198,230,0.35)",
          padding: "24px 0", position: "sticky", top: 52, height: "calc(100vh - 52px)",
          overflowY: "auto",
          background: "rgba(255,255,255,0.55)", backdropFilter: "blur(8px)",
        }}>
          <div style={{ padding: "0 14px 16px" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "7px 10px", borderRadius: 8,
                border: "1px solid rgba(200,198,230,0.5)",
                fontSize: 12, color: "#1A1A2E",
                background: "rgba(248,248,255,0.8)",
                fontFamily: "var(--font-sans)", outline: "none",
              }}
            />
          </div>

          {filtered ? (
            <div style={{ padding: "0 10px" }}>
              {filtered.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9090B8", padding: "8px 6px" }}>No results</div>
              ) : filtered.map((a) => (
                <button key={a.id} onClick={() => { setActiveArticle(a.id); setSearch(""); closeSidebar(); }} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "7px 10px", borderRadius: 7, border: "none",
                  background: "transparent", cursor: "pointer",
                  fontSize: 13, color: "#454560", fontFamily: "var(--font-sans)", marginBottom: 2,
                }}>{a.title}</button>
              ))}
            </div>
          ) : (
            SECTIONS.map((section) => (
              <div key={section.id} style={{ marginBottom: 8 }}>
                <div style={{ padding: "6px 16px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "#9090B8", textTransform: "uppercase" }}>
                  {section.label}
                </div>
                {section.articles.map((article) => {
                  const isActive = article.id === activeId;
                  return (
                    <button key={article.id} onClick={() => { setActiveArticle(article.id); closeSidebar(); }} style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "7px 16px", border: "none", cursor: "pointer",
                      fontSize: 13, fontFamily: "var(--font-sans)",
                      background: isActive ? "rgba(123,108,246,0.08)" : "transparent",
                      color: isActive ? "#7B6CF6" : "#454560",
                      fontWeight: isActive ? 600 : 400,
                      borderLeft: `2px solid ${isActive ? "#7B6CF6" : "transparent"}`,
                      marginLeft: 10,
                    }}>
                      {article.title}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </aside>

        {/* ── Content ── */}
        <main className="docs-main" style={{ flex: 1, padding: "40px 48px", maxWidth: 760, minHeight: "calc(100vh - 52px)" }}>
          <div style={{
            background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)",
            borderRadius: 16, padding: "36px 40px",
            border: "1px solid rgba(200,198,230,0.4)",
            boxShadow: "0 4px 24px rgba(60,50,120,0.05)",
          }}>
            {active.content}
          </div>

          {/* Prev / Next */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12 }}>
            {(() => {
              const idx = allArticles.findIndex((a) => a.id === activeId);
              const prev = idx > 0 ? allArticles[idx - 1] : null;
              const next = idx < allArticles.length - 1 ? allArticles[idx + 1] : null;
              return (
                <>
                  {prev ? (
                    <button onClick={() => setActiveArticle(prev.id)} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(200,198,230,0.5)", background: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, color: "#454560", fontFamily: "var(--font-sans)", textAlign: "left" }}>
                      ← {prev.title}
                    </button>
                  ) : <div />}
                  {next ? (
                    <button onClick={() => setActiveArticle(next.id)} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(200,198,230,0.5)", background: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, color: "#454560", fontFamily: "var(--font-sans)", textAlign: "right" }}>
                      {next.title} →
                    </button>
                  ) : <div />}
                </>
              );
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}
