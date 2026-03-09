import {
  sendBookingCancellationToAttendee,
  sendBookingCancellationToHost,
  sendBookingConfirmationToAttendee,
  sendBookingNotificationToHost,
  sendBookingRescheduledToAttendee,
  sendBookingRescheduledToHost,
} from "@/lib/email";
import { upsertRow } from "@/lib/google-sheets";
import { createServerClient } from "@/lib/supabase";
import {
  sendBookingWebhooks,
  type BookingWebhookEvent,
  type BookingWebhookPayload,
} from "@/lib/webhooks";

export type BookingSideEffectKind =
  | "confirmed"
  | "cancelled"
  | "rescheduled"
  | "status_changed";

export type BookingSideEffectBooking = {
  id: string;
  created_at?: string | null;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: string;
  event_slug: string | null;
  assigned_to: string | null;
  assigned_host_ids?: unknown;
  custom_answers?: Record<string, string | string[]> | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  parent_page_url?: string | null;
  parent_page_slug?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  li_fat_id?: string | null;
  ttclid?: string | null;
  msclkid?: string | null;
  ga_linker?: string | null;
  zoom_meeting_id?: string | null;
};

export type BookingSideEffectChanges = {
  previous_status?: string | null;
  previous_date?: string | null;
  previous_time?: string | null;
};

function normalizeMemberIds(value: unknown, fallbackId?: string | null) {
  const ids = Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (ids.length > 0) return ids;
  return fallbackId ? [fallbackId] : [];
}

function getWebhookUrls(hostWebhookUrls: unknown) {
  const envWebhook = process.env.CITACAL_BOOKING_WEBHOOK_URL?.trim();
  const envWebhookUrls = envWebhook
    ? envWebhook.split(",").map((u) => u.trim()).filter(Boolean)
    : [];
  const configuredWebhookUrls = Array.isArray(hostWebhookUrls)
    ? hostWebhookUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];
  return [...new Set([...configuredWebhookUrls, ...envWebhookUrls])];
}

async function loadPrimaryHostEmail(db: ReturnType<typeof createServerClient>) {
  try {
    const { data } = await db.auth.admin.listUsers({ perPage: 1 });
    return (data.users as Array<{ email?: string }>)[0]?.email ?? null;
  } catch {
    return null;
  }
}

async function loadLifecycleContext({
  db,
  booking,
}: {
  db: ReturnType<typeof createServerClient>;
  booking: BookingSideEffectBooking;
}) {
  const assignedHostIds = normalizeMemberIds(booking.assigned_host_ids, booking.assigned_to);

  const [{ data: hostSettings }, hostEmail, { data: assignedHosts }, { data: eventType }] =
    await Promise.all([
      db
        .from("host_settings")
        .select("host_name, webhook_urls")
        .limit(1)
        .maybeSingle(),
      loadPrimaryHostEmail(db),
      assignedHostIds.length > 0
        ? db
            .from("team_members")
            .select("id, name, photo_url, email")
            .in("id", assignedHostIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; photo_url: string | null; email: string }> }),
      booking.event_slug
        ? db
            .from("event_types")
            .select("name, duration, location_type, location_value")
            .eq("slug", booking.event_slug)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const hostName = hostSettings?.host_name?.trim() || "CitaCal Host";
  const eventName = eventType?.name?.trim() || booking.event_slug || "Discovery Call";
  const durationMinutes = typeof eventType?.duration === "number" ? eventType.duration : 30;
  const location =
    eventType?.location_type === "custom" ||
    eventType?.location_type === "zoom" ||
    eventType?.location_type === "phone"
      ? eventType.location_value || null
      : null;

  const assignedHostsResponse = (assignedHosts ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    photo_url: member.photo_url,
  }));

  const hostRecipientEmails = [...new Set([
    hostEmail,
    ...(assignedHosts ?? []).map((member) => member.email),
  ].filter((email): email is string => typeof email === "string" && email.trim().length > 0))];

  return {
    hostName,
    eventName,
    durationMinutes,
    location,
    assignedHostsResponse,
    assignedMember:
      assignedHostsResponse.length > 0
        ? {
            name: assignedHostsResponse[0].name,
            photo_url: assignedHostsResponse[0].photo_url,
          }
        : null,
    hostRecipientEmails,
    webhookUrls: getWebhookUrls(hostSettings?.webhook_urls),
  };
}

function mapKindToWebhookEvent(kind: BookingSideEffectKind): BookingWebhookEvent {
  switch (kind) {
    case "cancelled":
      return "booking.cancelled";
    case "rescheduled":
      return "booking.rescheduled";
    case "status_changed":
      return "booking.status_changed";
    default:
      return "booking.confirmed";
  }
}

function buildWebhookPayload(args: {
  booking: BookingSideEffectBooking;
  kind: BookingSideEffectKind;
  actionUrls?: {
    manage: string;
    reschedule: string;
    cancel: string;
  } | null;
  changes?: BookingSideEffectChanges;
  assignedHostsResponse: Array<{ id: string; name: string; photo_url: string | null }>;
  assignedMember: { name: string; photo_url: string | null } | null;
}): BookingWebhookPayload {
  const { booking, kind, actionUrls, changes, assignedHostsResponse, assignedMember } = args;
  return {
    event: mapKindToWebhookEvent(kind),
    occurred_at: new Date().toISOString(),
    booking: {
      id: booking.id,
      manage_url: actionUrls?.manage ?? null,
      reschedule_url: actionUrls?.reschedule ?? null,
      cancel_url: actionUrls?.cancel ?? null,
      event_slug: booking.event_slug,
      date: booking.date,
      time: booking.time,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      notes: booking.notes,
      status: booking.status,
      assigned_to: booking.assigned_to,
      assigned_host_ids: normalizeMemberIds(booking.assigned_host_ids, booking.assigned_to),
      custom_answers: booking.custom_answers ?? null,
      parent_page_url: booking.parent_page_url ?? null,
      parent_page_slug: booking.parent_page_slug ?? null,
    },
    assigned_member: assignedMember,
    assigned_hosts: assignedHostsResponse,
    utm: {
      source: booking.utm_source ?? null,
      medium: booking.utm_medium ?? null,
      campaign: booking.utm_campaign ?? null,
      term: booking.utm_term ?? null,
      content: booking.utm_content ?? null,
    },
    click_ids: {
      gclid: booking.gclid ?? null,
      gbraid: booking.gbraid ?? null,
      wbraid: booking.wbraid ?? null,
      fbclid: booking.fbclid ?? null,
      fbc: booking.fbc ?? null,
      fbp: booking.fbp ?? null,
      li_fat_id: booking.li_fat_id ?? null,
      ttclid: booking.ttclid ?? null,
      msclkid: booking.msclkid ?? null,
      ga_linker: booking.ga_linker ?? null,
    },
    ...(changes ? { changes } : {}),
  };
}

function toSheetRecord(booking: BookingSideEffectBooking) {
  return {
    id: booking.id,
    created_at: booking.created_at ?? new Date().toISOString(),
    date: booking.date,
    time: booking.time,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    notes: booking.notes,
    status: booking.status,
    event_slug: booking.event_slug,
    assigned_to: booking.assigned_to,
    utm_source: booking.utm_source ?? null,
    utm_medium: booking.utm_medium ?? null,
    utm_campaign: booking.utm_campaign ?? null,
    utm_term: booking.utm_term ?? null,
    utm_content: booking.utm_content ?? null,
    parent_page_url: booking.parent_page_url ?? null,
    parent_page_slug: booking.parent_page_slug ?? null,
    gclid: booking.gclid ?? null,
    gbraid: booking.gbraid ?? null,
    wbraid: booking.wbraid ?? null,
    fbclid: booking.fbclid ?? null,
    fbc: booking.fbc ?? null,
    fbp: booking.fbp ?? null,
    li_fat_id: booking.li_fat_id ?? null,
    ttclid: booking.ttclid ?? null,
    msclkid: booking.msclkid ?? null,
    ga_linker: booking.ga_linker ?? null,
    zoom_meeting_id: booking.zoom_meeting_id ?? null,
    custom_answers: booking.custom_answers ?? null,
  };
}

export async function runBookingSideEffects({
  db = createServerClient(),
  booking,
  kind,
  actionUrls = null,
  changes,
}: {
  db?: ReturnType<typeof createServerClient>;
  booking: BookingSideEffectBooking;
  kind: BookingSideEffectKind;
  actionUrls?: {
    manage: string;
    reschedule: string;
    cancel: string;
  } | null;
  changes?: BookingSideEffectChanges;
}) {
  const context = await loadLifecycleContext({ db, booking });

  const tasks: Promise<unknown>[] = [
    upsertRow(toSheetRecord(booking)),
  ];

  if (context.webhookUrls.length > 0) {
    tasks.push(
      sendBookingWebhooks({
        urls: context.webhookUrls,
        payload: buildWebhookPayload({
          booking,
          kind,
          actionUrls,
          changes,
          assignedHostsResponse: context.assignedHostsResponse,
          assignedMember: context.assignedMember,
        }),
        secret: process.env.CITACAL_WEBHOOK_SECRET ?? null,
      })
    );
  }

  if (kind === "confirmed") {
    tasks.push(
      sendBookingConfirmationToAttendee({
        toName: booking.name,
        toEmail: booking.email,
        date: booking.date,
        time: booking.time,
        durationMinutes: context.durationMinutes,
        eventName: context.eventName,
        hostName: context.hostName,
        location: context.location,
        rescheduleUrl: actionUrls?.reschedule ?? null,
        cancelUrl: actionUrls?.cancel ?? null,
      })
    );
    if (context.hostRecipientEmails.length > 0) {
      tasks.push(
        sendBookingNotificationToHost({
          toEmail: context.hostRecipientEmails,
          hostName: context.hostName,
          attendeeName: booking.name,
          attendeeEmail: booking.email,
          date: booking.date,
          time: booking.time,
          durationMinutes: context.durationMinutes,
          eventName: context.eventName,
          location: context.location,
          manageUrl: actionUrls?.manage ?? null,
        })
      );
    }
  }

  if (kind === "cancelled") {
    tasks.push(
      sendBookingCancellationToAttendee({
        toEmail: booking.email,
        date: booking.date,
        time: booking.time,
        eventName: context.eventName,
        hostName: context.hostName,
        location: context.location,
      })
    );
    if (context.hostRecipientEmails.length > 0) {
      tasks.push(
        sendBookingCancellationToHost({
          toEmail: context.hostRecipientEmails,
          attendeeName: booking.name,
          attendeeEmail: booking.email,
          date: booking.date,
          time: booking.time,
          eventName: context.eventName,
          hostName: context.hostName,
          location: context.location,
        })
      );
    }
  }

  if (kind === "rescheduled" && changes?.previous_date && changes?.previous_time) {
    tasks.push(
      sendBookingRescheduledToAttendee({
        toEmail: booking.email,
        date: booking.date,
        time: booking.time,
        previousDate: changes.previous_date,
        previousTime: changes.previous_time,
        durationMinutes: context.durationMinutes,
        eventName: context.eventName,
        hostName: context.hostName,
        location: context.location,
        rescheduleUrl: actionUrls?.reschedule ?? null,
        cancelUrl: actionUrls?.cancel ?? null,
      })
    );
    if (context.hostRecipientEmails.length > 0) {
      tasks.push(
        sendBookingRescheduledToHost({
          toEmail: context.hostRecipientEmails,
          attendeeName: booking.name,
          attendeeEmail: booking.email,
          date: booking.date,
          time: booking.time,
          previousDate: changes.previous_date,
          previousTime: changes.previous_time,
          durationMinutes: context.durationMinutes,
          eventName: context.eventName,
          hostName: context.hostName,
          location: context.location,
        })
      );
    }
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.warn("[booking-side-effects] side effect failed (non-fatal):", result.reason);
    }
  });
}
