/**
 * Email sending via Resend.
 *
 * Core lifecycle emails:
 *   confirmation, cancellation, and reschedule
 *   for both attendees and hosts
 *
 * Both are non-fatal: callers should wrap in try/catch.
 * If RESEND_API_KEY is not set, both functions return immediately (no-op).
 */

import { Resend } from "resend";

// Lazily create the client so the module can be imported in test environments
// without a real API key.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "CitaCal <support@citacal.com>";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Wrap raw HTML in a consistent email shell */
function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #171717; }
  .wrap { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .header { background: #171717; padding: 28px 32px; }
  .header-logo { font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
  .header-logo span { color: #4a9eff; }
  .body { padding: 32px; }
  .title { font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #171717; }
  .subtitle { font-size: 14px; color: #525252; margin: 0 0 28px; }
  .detail-row { display: flex; gap: 12px; margin-bottom: 12px; font-size: 14px; }
  .detail-label { color: #a3a3a3; width: 90px; flex-shrink: 0; font-weight: 500; }
  .detail-value { color: #171717; font-weight: 600; }
  .divider { border: none; border-top: 1px solid #e8e8e8; margin: 24px 0; }
  .action-btn { display: inline-block; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin-right: 8px; }
  .btn-primary { background: #171717; color: #ffffff; }
  .btn-ghost { background: #f5f5f5; color: #525252; }
  .footer { padding: 20px 32px; background: #fafafa; font-size: 12px; color: #a3a3a3; border-top: 1px solid #e8e8e8; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="header-logo">Cita<span>Cal</span></div>
  </div>
  <div class="body">
    ${body}
  </div>
  <div class="footer">
    Sent by CitaCal · Attribution-safe scheduling
  </div>
</div>
</body>
</html>`;
}

// ── Attendee confirmation ──────────────────────────────────────────────────

export interface SendConfirmationParams {
  toName: string;
  toEmail: string;
  date: string;          // YYYY-MM-DD
  time: string;          // "09:30 AM"
  durationMinutes: number;
  eventName: string;
  hostName: string;
  location?: string | null;
  rescheduleUrl?: string | null;
  cancelUrl?: string | null;
}

export interface SendCancellationParams {
  toEmail: string | string[];
  date: string;
  time: string;
  eventName: string;
  hostName: string;
  location?: string | null;
}

export interface SendRescheduleParams {
  toEmail: string | string[];
  date: string;
  time: string;
  previousDate: string;
  previousTime: string;
  durationMinutes: number;
  eventName: string;
  hostName: string;
  location?: string | null;
  rescheduleUrl?: string | null;
  cancelUrl?: string | null;
}

function renderLocationRow(location?: string | null) {
  return location
    ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${location}</span></div>`
    : "";
}

function renderActions(actions: Array<{ label: string; href: string; variant: "primary" | "ghost" }>) {
  if (actions.length === 0) return "";
  return `<hr class="divider" />
    <p style="font-size:13px;color:#525252;margin:0 0 12px;">Need to make a change?</p>
    ${actions
      .map(
        (action) =>
          `<a href="${action.href}" class="action-btn ${action.variant === "primary" ? "btn-primary" : "btn-ghost"}">${action.label}</a>`
      )
      .join("")}`;
}

export async function sendBookingConfirmationToAttendee(
  p: SendConfirmationParams
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const formattedDate = formatDate(p.date);
  const locationRow = renderLocationRow(p.location);
  const actions = renderActions([
    ...(p.rescheduleUrl ? [{ label: "Reschedule", href: p.rescheduleUrl, variant: "primary" as const }] : []),
    ...(p.cancelUrl ? [{ label: "Cancel", href: p.cancelUrl, variant: "ghost" as const }] : []),
  ]);

  const html = emailShell(`
    <p class="title">Your booking is confirmed ✓</p>
    <p class="subtitle">Here are the details for your meeting with ${p.hostName}.</p>
    <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${p.eventName}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formattedDate}</span></div>
    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${p.time}</span></div>
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${p.durationMinutes} min</span></div>
    ${locationRow}
    ${actions}
  `);

  await resend.emails.send({
    from: FROM,
    to: p.toEmail,
    subject: `Confirmed: ${p.eventName} on ${formattedDate}`,
    html,
  });
}

// ── Host notification ──────────────────────────────────────────────────────

export interface SendHostNotificationParams {
  toEmail: string | string[];
  hostName: string;
  attendeeName: string;
  attendeeEmail: string;
  date: string;
  time: string;
  durationMinutes: number;
  eventName: string;
  location?: string | null;
  manageUrl?: string | null;
}

export async function sendBookingNotificationToHost(
  p: SendHostNotificationParams
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const formattedDate = formatDate(p.date);
  const locationRow = p.location
    ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${p.location}</span></div>`
    : "";

  const manageLink = p.manageUrl
    ? `<hr class="divider" /><a href="${p.manageUrl}" class="action-btn btn-ghost">Manage booking</a>`
    : "";

  const html = emailShell(`
    <p class="title">New booking from ${p.attendeeName}</p>
    <p class="subtitle">Someone just scheduled a meeting with you.</p>
    <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${p.eventName}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formattedDate}</span></div>
    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${p.time}</span></div>
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${p.durationMinutes} min</span></div>
    <div class="detail-row"><span class="detail-label">Attendee</span><span class="detail-value">${p.attendeeName}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${p.attendeeEmail}</span></div>
    ${locationRow}
    ${manageLink}
  `);

  await resend.emails.send({
    from: FROM,
    to: p.toEmail,
    subject: `New booking: ${p.eventName} with ${p.attendeeName} on ${formattedDate}`,
    html,
  });
}

export async function sendBookingCancellationToAttendee(
  p: SendCancellationParams
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const formattedDate = formatDate(p.date);
  const html = emailShell(`
    <p class="title">Your booking has been cancelled</p>
    <p class="subtitle">This meeting with ${p.hostName} is no longer scheduled.</p>
    <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${p.eventName}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formattedDate}</span></div>
    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${p.time}</span></div>
    ${renderLocationRow(p.location)}
  `);

  await resend.emails.send({
    from: FROM,
    to: p.toEmail,
    subject: `Cancelled: ${p.eventName} on ${formattedDate}`,
    html,
  });
}

export async function sendBookingCancellationToHost(
  p: SendCancellationParams & {
    attendeeName: string;
    attendeeEmail: string;
  }
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const formattedDate = formatDate(p.date);
  const html = emailShell(`
    <p class="title">${p.attendeeName} cancelled their booking</p>
    <p class="subtitle">This meeting has been removed from the schedule.</p>
    <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${p.eventName}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${formattedDate}</span></div>
    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${p.time}</span></div>
    <div class="detail-row"><span class="detail-label">Attendee</span><span class="detail-value">${p.attendeeName}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${p.attendeeEmail}</span></div>
    ${renderLocationRow(p.location)}
  `);

  await resend.emails.send({
    from: FROM,
    to: p.toEmail,
    subject: `Cancelled: ${p.eventName} with ${p.attendeeName} on ${formattedDate}`,
    html,
  });
}

export async function sendBookingRescheduledToAttendee(
  p: SendRescheduleParams
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const formattedDate = formatDate(p.date);
  const previousFormattedDate = formatDate(p.previousDate);
  const html = emailShell(`
    <p class="title">Your booking has been rescheduled</p>
    <p class="subtitle">Your meeting with ${p.hostName} has a new time.</p>
    <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${p.eventName}</span></div>
    <div class="detail-row"><span class="detail-label">Previous</span><span class="detail-value">${previousFormattedDate} at ${p.previousTime}</span></div>
    <div class="detail-row"><span class="detail-label">New date</span><span class="detail-value">${formattedDate}</span></div>
    <div class="detail-row"><span class="detail-label">New time</span><span class="detail-value">${p.time}</span></div>
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${p.durationMinutes} min</span></div>
    ${renderLocationRow(p.location)}
    ${renderActions([
      ...(p.rescheduleUrl ? [{ label: "Reschedule again", href: p.rescheduleUrl, variant: "primary" as const }] : []),
      ...(p.cancelUrl ? [{ label: "Cancel", href: p.cancelUrl, variant: "ghost" as const }] : []),
    ])}
  `);

  await resend.emails.send({
    from: FROM,
    to: p.toEmail,
    subject: `Rescheduled: ${p.eventName} to ${formattedDate}`,
    html,
  });
}

export async function sendBookingRescheduledToHost(
  p: SendRescheduleParams & {
    attendeeName: string;
    attendeeEmail: string;
  }
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const formattedDate = formatDate(p.date);
  const previousFormattedDate = formatDate(p.previousDate);
  const html = emailShell(`
    <p class="title">${p.attendeeName} rescheduled their booking</p>
    <p class="subtitle">The meeting now has a new time.</p>
    <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${p.eventName}</span></div>
    <div class="detail-row"><span class="detail-label">Previous</span><span class="detail-value">${previousFormattedDate} at ${p.previousTime}</span></div>
    <div class="detail-row"><span class="detail-label">New date</span><span class="detail-value">${formattedDate}</span></div>
    <div class="detail-row"><span class="detail-label">New time</span><span class="detail-value">${p.time}</span></div>
    <div class="detail-row"><span class="detail-label">Attendee</span><span class="detail-value">${p.attendeeName}</span></div>
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${p.attendeeEmail}</span></div>
    ${renderLocationRow(p.location)}
  `);

  await resend.emails.send({
    from: FROM,
    to: p.toEmail,
    subject: `Rescheduled: ${p.eventName} with ${p.attendeeName} to ${formattedDate}`,
    html,
  });
}
