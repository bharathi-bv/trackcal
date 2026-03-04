import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAvailabilityRules } from "@/lib/availability-schedules";
import {
  cleanupBookingArtifacts,
  getMemberTokensByIds,
  getMemberTokensForAssignedBooking,
  normalizeCalendarEvents,
} from "@/lib/booking-calendars";
import { createServerClient } from "@/lib/supabase";
import { runBookingSideEffects } from "@/lib/booking-side-effects";
import {
  createMemberCalendarEvent,
  deleteMemberCalendarEvent,
  isMemberCalendarFreeAtSlot,
  updateMemberCalendarEvent,
  type MemberCalendarConnection,
} from "@/lib/member-calendar";
import {
  createHostCalendarEvent,
  getHostAvailableSlots,
  updateHostCalendarEvent,
} from "@/lib/host-calendar";
import type { AvailabilityRange, WeeklyAvailability } from "@/lib/event-type-config";
import {
  appendBookingActionLinks,
  buildBookingActionUrls,
  hashManageToken,
  isIsoDate,
  parseTimeLabelToMinutes,
  resolvePublicBaseUrl,
  type BookingActionUrls,
} from "@/lib/booking-manage";
import { loadManageBookingView } from "@/lib/manage-booking-server";
import {
  findSlotMeta,
  getSelectedTeamMembers,
  getTeamAvailability,
  type TeamSchedulingMode,
} from "@/lib/team-scheduling";
import { updateZoomMeeting } from "@/lib/zoom";

const DEFAULT_SETTINGS = {
  duration: 30,
  start_hour: 9,
  end_hour: 17,
  slot_increment: 30,
  min_notice_hours: 0,
  max_days_in_advance: 60,
  booking_window_type: "rolling" as "rolling" | "fixed",
  booking_window_start_date: null as string | null,
  booking_window_end_date: null as string | null,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  max_bookings_per_day: null as number | null,
  max_bookings_per_slot: null as number | null,
};
type EventSettings = typeof DEFAULT_SETTINGS & {
  availability_ranges?: AvailabilityRange[];
};

type BookingRow = {
  id: string;
  created_at: string | null;
  date: string;
  time: string;
  status: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  event_slug: string | null;
  assigned_to: string | null;
  assigned_host_ids: unknown;
  calendar_event_id: string | null;
  calendar_events: unknown;
  zoom_meeting_id: string | null;
  custom_answers: Record<string, string | string[]> | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  li_fat_id: string | null;
  ttclid: string | null;
  msclkid: string | null;
  manage_token_expires_at: string | null;
};

type EventTypeRow = {
  slug: string;
  name: string | null;
  description: string | null;
  duration: number | null;
  title_template: string | null;
  location_type: "google_meet" | "zoom" | "phone" | "custom" | "none" | null;
  location_value: string | null;
  start_hour: number | null;
  end_hour: number | null;
  slot_increment: number | null;
  min_notice_hours: number | null;
  max_days_in_advance: number | null;
  booking_window_type: "rolling" | "fixed" | null;
  booking_window_start_date: string | null;
  booking_window_end_date: string | null;
  buffer_before_minutes: number | null;
  buffer_after_minutes: number | null;
  max_bookings_per_day: number | null;
  max_bookings_per_slot: number | null;
  availability_schedule_id: string | null;
  weekly_availability: unknown;
  blocked_dates: unknown;
  blocked_weekdays: unknown;
  assigned_member_ids: unknown;
  team_scheduling_mode: TeamSchedulingMode | null;
  collective_required_member_ids: unknown;
  collective_show_availability_tiers: boolean | null;
  collective_min_available_hosts: number | null;
};

const manageActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
  }),
  z.object({
    action: z.literal("reschedule"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().trim().min(1).max(32),
  }),
]);

function normalizeBlockedDates(value: unknown) {
  if (!Array.isArray(value)) return new Set<string>();
  return new Set(value.filter((d): d is string => typeof d === "string" && isIsoDate(d)));
}

function normalizeBlockedWeekdays(value: unknown) {
  if (!Array.isArray(value)) return new Set<number>();
  return new Set(
    value
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

function normalizeMemberIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function loadBookingByManageToken({
  token,
  db,
}: {
  token: string;
  db: ReturnType<typeof createServerClient>;
}): Promise<BookingRow | null> {
  const hash = hashManageToken(token);
  const { data } = await db
    .from("bookings")
    .select(
      "id, created_at, date, time, status, name, email, phone, notes, event_slug, assigned_to, assigned_host_ids, calendar_event_id, calendar_events, zoom_meeting_id, custom_answers, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid, li_fat_id, ttclid, msclkid, manage_token_expires_at"
    )
    .eq("manage_token_hash", hash)
    .maybeSingle();

  if (!data) return null;
  const booking = data as BookingRow;
  if (!booking.manage_token_expires_at) return null;
  if (new Date(booking.manage_token_expires_at).getTime() <= Date.now()) return null;
  return booking;
}

function buildZoomStartTime(date: string, time: string) {
  const [h12str, period] = time.split(" ");
  const [hh, mm] = h12str.split(":").map(Number);
  let hour = hh;
  if (period === "PM" && hh !== 12) hour += 12;
  if (period === "AM" && hh === 12) hour = 0;
  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`
  ).toISOString();
}

async function buildCalendarMetadata({
  booking,
  db,
  actionUrls,
}: {
  booking: BookingRow;
  db: ReturnType<typeof createServerClient>;
  actionUrls: BookingActionUrls;
}) {
  let durationMinutes = DEFAULT_SETTINGS.duration;
  let eventName = "Discovery Call";
  let titleTemplate: string | null = null;
  let eventDescription: string | null = null;
  let locationType: EventTypeRow["location_type"] = null;
  let locationValue: string | null = null;

  if (booking.event_slug) {
    const { data: etRaw } = await db
      .from("event_types")
      .select(
        "name, duration, title_template, description, location_type, location_value"
      )
      .eq("slug", booking.event_slug)
      .maybeSingle();
    if (etRaw) {
      const et = etRaw as Pick<
        EventTypeRow,
        "name" | "duration" | "title_template" | "description" | "location_type" | "location_value"
      >;
      durationMinutes = et.duration ?? durationMinutes;
      eventName = et.name ?? eventName;
      titleTemplate = et.title_template ?? null;
      eventDescription = et.description ?? null;
      locationType = et.location_type ?? null;
      locationValue = et.location_value ?? null;
    }
  }

  const { data: host } = await db
    .from("host_settings")
    .select("host_name")
    .limit(1)
    .maybeSingle();
  const hostName = host?.host_name?.trim() || "CitaCal Host";
  const summary = titleTemplate
    ? titleTemplate
        .replaceAll("{event_name}", eventName)
        .replaceAll("{invitee_name}", booking.name)
        .replaceAll("{host_name}", hostName)
    : `${eventName} with ${booking.name}`;

  const baseDescription = [
    eventDescription,
    `Attendee: ${booking.name} <${booking.email}>`,
    booking.notes ? `Notes: ${booking.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  const description = appendBookingActionLinks(baseDescription, actionUrls);

  const location =
    locationType === "custom" || locationType === "zoom" || locationType === "phone"
      ? locationValue || undefined
      : undefined;

  return {
    eventName,
    summary,
    description,
    location,
    durationMinutes,
  };
}

async function loadEventSettings({
  eventSlug,
  db,
}: {
  eventSlug: string | null;
  db: ReturnType<typeof createServerClient>;
}) {
  if (!eventSlug) {
    return {
      found: true,
      settings: DEFAULT_SETTINGS,
      weeklyAvailability: null as WeeklyAvailability | null,
      blockedDates: new Set<string>(),
      blockedWeekdays: new Set<number>(),
      assignedMemberIds: [] as string[],
      teamSchedulingMode: "round_robin" as TeamSchedulingMode,
      collectiveRequiredMemberIds: [] as string[],
      collectiveShowAvailabilityTiers: false,
      collectiveMinAvailableHosts: null as number | null,
      eventName: "Discovery Call",
      durationMinutes: DEFAULT_SETTINGS.duration,
    };
  }

  const { data: etRaw } = await db
    .from("event_types")
    .select(
      "slug, name, duration, start_hour, end_hour, slot_increment, min_notice_hours, max_days_in_advance, booking_window_type, booking_window_start_date, booking_window_end_date, buffer_before_minutes, buffer_after_minutes, max_bookings_per_day, max_bookings_per_slot, availability_schedule_id, weekly_availability, blocked_dates, blocked_weekdays, assigned_member_ids, team_scheduling_mode, collective_required_member_ids, collective_show_availability_tiers, collective_min_available_hosts"
    )
    .eq("slug", eventSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!etRaw) {
    return {
      found: false,
      settings: DEFAULT_SETTINGS,
      weeklyAvailability: null as WeeklyAvailability | null,
      blockedDates: new Set<string>(),
      blockedWeekdays: new Set<number>(),
      assignedMemberIds: [] as string[],
      teamSchedulingMode: "round_robin" as TeamSchedulingMode,
      collectiveRequiredMemberIds: [] as string[],
      collectiveShowAvailabilityTiers: false,
      collectiveMinAvailableHosts: null as number | null,
      eventName: "Discovery Call",
      durationMinutes: DEFAULT_SETTINGS.duration,
    };
  }

  const et = etRaw as EventTypeRow;
  const resolvedRules = await resolveAvailabilityRules({
    weeklyAvailability: et.weekly_availability,
    availabilityScheduleId: et.availability_schedule_id,
    blockedDates: et.blocked_dates,
    blockedWeekdays: et.blocked_weekdays,
    db,
  });
  const weeklyAvailability: WeeklyAvailability | null = resolvedRules.weekly_availability;

  return {
    found: true,
    settings: {
      duration: et.duration ?? DEFAULT_SETTINGS.duration,
      start_hour: et.start_hour ?? DEFAULT_SETTINGS.start_hour,
      end_hour: et.end_hour ?? DEFAULT_SETTINGS.end_hour,
      slot_increment: et.slot_increment ?? DEFAULT_SETTINGS.slot_increment,
      min_notice_hours: et.min_notice_hours ?? DEFAULT_SETTINGS.min_notice_hours,
      max_days_in_advance: et.max_days_in_advance ?? DEFAULT_SETTINGS.max_days_in_advance,
      booking_window_type: et.booking_window_type ?? DEFAULT_SETTINGS.booking_window_type,
      booking_window_start_date: et.booking_window_start_date ?? DEFAULT_SETTINGS.booking_window_start_date,
      booking_window_end_date: et.booking_window_end_date ?? DEFAULT_SETTINGS.booking_window_end_date,
      buffer_before_minutes: et.buffer_before_minutes ?? DEFAULT_SETTINGS.buffer_before_minutes,
      buffer_after_minutes: et.buffer_after_minutes ?? DEFAULT_SETTINGS.buffer_after_minutes,
      max_bookings_per_day: et.max_bookings_per_day ?? DEFAULT_SETTINGS.max_bookings_per_day,
      max_bookings_per_slot: et.max_bookings_per_slot ?? DEFAULT_SETTINGS.max_bookings_per_slot,
    },
    weeklyAvailability,
    blockedDates: normalizeBlockedDates(resolvedRules.blockers.dates),
    blockedWeekdays: normalizeBlockedWeekdays(resolvedRules.blockers.weekdays),
    assignedMemberIds: normalizeMemberIds(et.assigned_member_ids),
    teamSchedulingMode: et.team_scheduling_mode ?? "round_robin",
    collectiveRequiredMemberIds: normalizeMemberIds(et.collective_required_member_ids),
    collectiveShowAvailabilityTiers: et.collective_show_availability_tiers ?? false,
    collectiveMinAvailableHosts: et.collective_min_available_hosts ?? null,
    eventName: et.name ?? "Discovery Call",
    durationMinutes: et.duration ?? DEFAULT_SETTINGS.duration,
  };
}

function isBookableByWindow(
  date: string,
  settings: typeof DEFAULT_SETTINGS
) {
  if (settings.booking_window_type === "fixed") {
    if (!settings.booking_window_start_date || !settings.booking_window_end_date) return false;
    return date >= settings.booking_window_start_date && date <= settings.booking_window_end_date;
  }

  const requestedDate = new Date(`${date}T00:00:00`);
  const maxDate = new Date();
  maxDate.setHours(0, 0, 0, 0);
  maxDate.setDate(maxDate.getDate() + settings.max_days_in_advance);
  return requestedDate <= maxDate;
}

async function assertSlotAvailableForReschedule({
  db,
  booking,
  date,
  time,
}: {
  db: ReturnType<typeof createServerClient>;
  booking: BookingRow;
  date: string;
  time: string;
}) {
  if (!isIsoDate(date)) {
    return { ok: false as const, error: "Invalid date format." };
  }
  if (parseTimeLabelToMinutes(time) === null) {
    return { ok: false as const, error: "Invalid time format." };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${date}T00:00:00`) < today) {
    return { ok: false as const, error: "Please pick a future date." };
  }

  const event = await loadEventSettings({ eventSlug: booking.event_slug, db });
  if (!event.found) {
    return { ok: false as const, error: "This event type is no longer active." };
  }

  if (event.blockedDates.has(date)) {
    return { ok: false as const, error: "This date is blocked by the host." };
  }
  if (event.blockedWeekdays.has(new Date(`${date}T00:00:00`).getDay())) {
    return { ok: false as const, error: "This weekday is blocked by the host." };
  }

  let effectiveSettings: EventSettings = event.settings;
  if (event.weeklyAvailability) {
    const dayKey = String(new Date(`${date}T00:00:00`).getDay());
    const dayAvailability = event.weeklyAvailability[dayKey];
    if (!dayAvailability?.enabled) {
      return { ok: false as const, error: "This weekday is unavailable." };
    }
    effectiveSettings = {
      ...effectiveSettings,
      start_hour: dayAvailability.start_hour ?? effectiveSettings.start_hour,
      end_hour: dayAvailability.end_hour ?? effectiveSettings.end_hour,
      availability_ranges: dayAvailability.ranges,
    };
  }

  if (!isBookableByWindow(date, effectiveSettings)) {
    return { ok: false as const, error: "This date is outside the booking window." };
  }

  let slots: string[] = [];
  try {
    if (event.assignedMemberIds.length > 0) {
      const availability = await getTeamAvailability({
        date,
        settings: effectiveSettings,
        memberIds: event.assignedMemberIds,
        mode: event.teamSchedulingMode,
        requiredMemberIds: event.collectiveRequiredMemberIds,
        fallbackMinimumHostCount: event.collectiveMinAvailableHosts,
        showAvailabilityTiers: event.collectiveShowAvailabilityTiers,
        db,
      });
      slots = availability.slots;
    } else {
      const availability = await getHostAvailableSlots(date, effectiveSettings);
      slots = availability.slots;
    }
  } catch {
    return { ok: false as const, error: "Host calendar is unavailable. Please try again later." };
  }

  if (!slots.includes(time)) {
    return { ok: false as const, error: "That time is no longer available." };
  }

  let collectiveHostIds: string[] = [];
  if (event.teamSchedulingMode === "collective" && event.assignedMemberIds.length > 0) {
    const collectiveAvailability = await getTeamAvailability({
      date,
      settings: effectiveSettings,
      memberIds: event.assignedMemberIds,
      mode: event.teamSchedulingMode,
      requiredMemberIds: event.collectiveRequiredMemberIds,
      fallbackMinimumHostCount: event.collectiveMinAvailableHosts,
      showAvailabilityTiers: event.collectiveShowAvailabilityTiers,
      db,
    });
    const slotMeta = findSlotMeta(collectiveAvailability.slotMeta, time);
    if (!slotMeta) {
      return { ok: false as const, error: "That group slot is no longer available." };
    }
    collectiveHostIds = slotMeta.availableMemberIds;
  }

  if (booking.assigned_to) {
    const { data: assignedMember } = await db
      .from("team_members")
      .select(
        "id, google_access_token, google_refresh_token, google_token_expiry, google_calendar_ids, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry, microsoft_calendar_ids"
      )
      .eq("id", booking.assigned_to)
      .maybeSingle();
    if (!assignedMember?.google_refresh_token && !assignedMember?.microsoft_refresh_token) {
      return { ok: false as const, error: "Assigned host calendar is unavailable." };
    }
    const isAssignedMemberFree = await isMemberCalendarFreeAtSlot(
      assignedMember as MemberCalendarConnection,
      date,
      time,
      effectiveSettings.duration
    );
    if (!isAssignedMemberFree) {
      return {
        ok: false as const,
        error: "That time is not available with your assigned host.",
      };
    }
  }

  if (booking.event_slug && effectiveSettings.max_bookings_per_day) {
    const { count } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("event_slug", booking.event_slug)
      .eq("date", date)
      .in("status", ["confirmed", "pending"])
      .neq("id", booking.id);
    if ((count ?? 0) >= effectiveSettings.max_bookings_per_day) {
      return { ok: false as const, error: "Daily capacity has been reached." };
    }
  }

  if (booking.event_slug && effectiveSettings.max_bookings_per_slot) {
    const { count } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("event_slug", booking.event_slug)
      .eq("date", date)
      .eq("time", time)
      .in("status", ["confirmed", "pending"])
      .neq("id", booking.id);
    if ((count ?? 0) >= effectiveSettings.max_bookings_per_slot) {
      return { ok: false as const, error: "Slot capacity has been reached." };
    }
  }

  return {
    ok: true as const,
    durationMinutes: event.durationMinutes,
    eventName: event.eventName,
    collectiveHostIds,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const booking = await loadManageBookingView(token);
  if (!booking) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }

  return NextResponse.json({ booking });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const parsed = manageActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const db = createServerClient();
  const booking = await loadBookingByManageToken({ token, db });
  if (!booking) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }

  if (parsed.data.action === "cancel") {
    const { data: updated, error } = await db
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id)
      .select("id, status, date, time")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await cleanupBookingArtifacts({ booking, db });
    } catch (calendarErr) {
      console.warn("[manage-booking] calendar delete failed (non-fatal):", calendarErr);
    }

    const { data: hostSettings } = await db
      .from("host_settings")
      .select("booking_base_url")
      .limit(1)
      .maybeSingle();
    const publicBaseUrl = resolvePublicBaseUrl({
      headers: request.headers,
      configuredBaseUrl: hostSettings?.booking_base_url ?? null,
    });

    await runBookingSideEffects({
      db,
      kind: "cancelled",
      actionUrls: buildBookingActionUrls(publicBaseUrl, token),
      booking: {
        ...booking,
        status: "cancelled",
      },
    });

    return NextResponse.json({ booking: updated });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json(
      { error: "Cancelled bookings cannot be rescheduled from this link." },
      { status: 409 }
    );
  }

  if (parsed.data.date === booking.date && parsed.data.time === booking.time) {
    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        date: booking.date,
        time: booking.time,
      },
    });
  }

  const availability = await assertSlotAvailableForReschedule({
    db,
    booking,
    date: parsed.data.date,
    time: parsed.data.time,
  });
  if (!availability.ok) {
    return NextResponse.json({ error: availability.error }, { status: 409 });
  }

  const { data: updated, error } = await db
    .from("bookings")
    .update({
      date: parsed.data.date,
      time: parsed.data.time,
      status: "confirmed",
    })
    .eq("id", booking.id)
    .select("id, status, date, time")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That slot was just taken. Please pick another one." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: hostSettings } = await db
    .from("host_settings")
    .select("booking_base_url")
    .limit(1)
    .maybeSingle();
  const publicBaseUrl = resolvePublicBaseUrl({
    headers: request.headers,
    configuredBaseUrl: hostSettings?.booking_base_url ?? null,
  });
  const actionUrls = buildBookingActionUrls(publicBaseUrl, token);
  const calendarMeta = await buildCalendarMetadata({ booking, db, actionUrls });
  const calendarEvents = normalizeCalendarEvents(booking.calendar_events);
  const shouldUseCollectiveHosts = availability.collectiveHostIds.length > 0;
  const nextDate = parsed.data.date;
  const nextTime = parsed.data.time;
  const memberTokens = await getMemberTokensForAssignedBooking({ booking, db });
  try {
    if (shouldUseCollectiveHosts) {
      const existingTokenMap = await getMemberTokensByIds({
        memberIds: calendarEvents.map((event) => event.member_id),
        db,
      });
      await Promise.allSettled(
        calendarEvents.map((event) => {
          const tokens = existingTokenMap.get(event.member_id);
          if (!tokens) return Promise.resolve();
          return deleteMemberCalendarEvent({
            eventId: event.calendar_event_id,
            member: tokens,
          });
        })
      );

      const nextHosts = await getSelectedTeamMembers(availability.collectiveHostIds, db);
      const createdEvents: Array<{ member_id: string; calendar_event_id: string }> = [];
      await Promise.allSettled(
        nextHosts.map(async (member) => {
            const eventId = await createMemberCalendarEvent({
              date: nextDate,
              time: nextTime,
              name: booking.name,
              email: booking.email,
              durationMinutes: calendarMeta.durationMinutes,
              summary: calendarMeta.summary,
              description: calendarMeta.description,
              location: calendarMeta.location,
              member: member as MemberCalendarConnection,
            });
            if (eventId) {
              createdEvents.push({ member_id: member.id, calendar_event_id: eventId });
            }
          })
      );

      await db
        .from("bookings")
        .update({
          assigned_to: nextHosts[0]?.id ?? null,
          assigned_host_ids: nextHosts.map((member) => member.id),
          calendar_event_id: createdEvents[0]?.calendar_event_id ?? null,
          calendar_events: createdEvents,
        })
        .eq("id", booking.id);
    } else if (booking.calendar_event_id) {
      if (memberTokens) {
        await updateMemberCalendarEvent({
          eventId: booking.calendar_event_id,
          date: nextDate,
          time: nextTime,
          durationMinutes: calendarMeta.durationMinutes,
          summary: calendarMeta.summary,
          description: calendarMeta.description,
          location: calendarMeta.location,
          member: memberTokens,
        });
      } else {
        await updateHostCalendarEvent({
          eventId: booking.calendar_event_id,
          date: nextDate,
          time: nextTime,
          durationMinutes: calendarMeta.durationMinutes,
          summary: calendarMeta.summary,
          description: calendarMeta.description,
          location: calendarMeta.location,
        });
      }
    } else {
      const createdEventId = memberTokens
        ? await createMemberCalendarEvent({
            date: nextDate,
            time: nextTime,
            name: booking.name,
            email: booking.email,
            durationMinutes: calendarMeta.durationMinutes,
            summary: calendarMeta.summary,
            description: calendarMeta.description,
            location: calendarMeta.location,
            member: memberTokens,
          })
        : await createHostCalendarEvent({
            date: nextDate,
            time: nextTime,
            name: booking.name,
            email: booking.email,
            durationMinutes: calendarMeta.durationMinutes,
            summary: calendarMeta.summary,
            description: calendarMeta.description,
            location: calendarMeta.location,
          });

      if (createdEventId) {
        const { error: eventIdError } = await db
          .from("bookings")
          .update({ calendar_event_id: createdEventId, calendar_events: [] })
          .eq("id", booking.id);
        if (eventIdError) {
          console.warn("[manage-booking] failed to save calendar_event_id:", eventIdError);
        }
      }
    }

    if (booking.zoom_meeting_id) {
      await updateZoomMeeting({
        meetingId: booking.zoom_meeting_id,
        topic: calendarMeta.summary,
        start_time: buildZoomStartTime(nextDate, nextTime),
        duration: calendarMeta.durationMinutes,
      });
    }
  } catch (calendarErr) {
    console.warn("[manage-booking] calendar sync failed (non-fatal):", calendarErr);
  }

  await runBookingSideEffects({
    db,
    kind: "rescheduled",
    actionUrls,
    changes: {
      previous_status: booking.status,
      previous_date: booking.date,
      previous_time: booking.time,
    },
    booking: {
      ...booking,
      date: nextDate,
      time: nextTime,
      status: "confirmed",
      assigned_to:
        shouldUseCollectiveHosts && availability.collectiveHostIds.length > 0
          ? availability.collectiveHostIds[0] ?? null
          : booking.assigned_to,
      assigned_host_ids:
        shouldUseCollectiveHosts && availability.collectiveHostIds.length > 0
          ? availability.collectiveHostIds
          : booking.assigned_host_ids,
    },
  });

  return NextResponse.json({
    booking: {
      ...updated,
      event_name: availability.eventName,
      duration: availability.durationMinutes,
    },
  });
}
