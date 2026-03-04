/**
 * GET /api/availability?date=YYYY-MM-DD[&event=slug]
 *
 * Returns available time slots for the given date.
 * If an event type slug is provided, uses that event type's settings
 * (duration, start/end hours, slot increment). Falls back to defaults.
 *
 * Response shapes:
 *   { slots: ["09:00 AM", "09:30 AM", ...] }   — calendar connected
 *   { slots: null, error: "..." }               — not connected / fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { getHostAvailableSlots } from "@/lib/host-calendar";
import { resolveAvailabilityRules } from "@/lib/availability-schedules";
import { createServerClient } from "@/lib/supabase";
import type { AvailabilityRange, WeeklyAvailability } from "@/lib/event-type-config";
import {
  getTeamAvailability,
  type TeamAvailabilityMember,
  type TeamAvailabilitySlotMeta,
  type TeamSchedulingMode,
} from "@/lib/team-scheduling";
import { requireApiUser } from "@/lib/api-auth";

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
  blocked_dates: [] as string[],
};
type AvailabilitySettings = typeof DEFAULT_SETTINGS & {
  availability_ranges?: AvailabilityRange[];
};

type AvailabilityResponse =
  | {
      slots: string[];
      hostTimezone?: string;
      reason?: string;
      slotMeta?: TeamAvailabilitySlotMeta[];
      selectedMembers?: TeamAvailabilityMember[];
      availabilityTiersEnabled?: boolean;
      preferredMinimumHostCount?: number;
      fallbackMinimumHostCount?: number | null;
    }
  | { slots: null; error: string; reason?: string };

const AVAILABILITY_CACHE_TTL_MS = 15_000;
const availabilityCache = new Map<
  string,
  { expiresAt: number; payload: AvailabilityResponse }
>();
const EVENT_CONTEXT_CACHE_TTL_MS = 30_000;
const eventContextCache = new Map<string, { expiresAt: number; payload: EventAvailabilityContext }>();

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BATCH_DATES = 14;

type EventTypeConfigRow = {
  duration: number | null;
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

type EventAvailabilityContext = {
  eventSlug: string | null;
  eventFound: boolean;
  baseSettings: AvailabilitySettings;
  weeklyAvailability: WeeklyAvailability | null;
  blockedDates: Set<string>;
  blockedWeekdays: Set<number>;
  assignedMemberIds: string[];
  teamSchedulingMode: TeamSchedulingMode;
  collectiveRequiredMemberIds: string[];
  collectiveShowAvailabilityTiers: boolean;
  collectiveMinAvailableHosts: number | null;
};

type BookingCounts = {
  dayCounts: Map<string, number>;
  slotCountsByDate: Map<string, Map<string, number>>;
};

function parseDatesParam(raw: string | null) {
  if (!raw) return [];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ISO_DATE_RE.test(s));
  return [...new Set(parts)].slice(0, MAX_BATCH_DATES);
}

function normalizeMemberIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

function getDefaultContext(eventSlug: string | null): EventAvailabilityContext {
  return {
    eventSlug,
    eventFound: !eventSlug,
    baseSettings: DEFAULT_SETTINGS,
    weeklyAvailability: null,
    blockedDates: new Set<string>(),
    blockedWeekdays: new Set<number>(),
    assignedMemberIds: [],
    teamSchedulingMode: "round_robin",
    collectiveRequiredMemberIds: [],
    collectiveShowAvailabilityTiers: false,
    collectiveMinAvailableHosts: null,
  };
}

async function getEventAvailabilityContext({
  eventSlug,
  db,
}: {
  eventSlug: string | null;
  db: ReturnType<typeof createServerClient>;
}): Promise<EventAvailabilityContext> {
  if (!eventSlug) return getDefaultContext(null);

  const cacheKey = eventSlug;
  const cached = eventContextCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;
  if (cached && cached.expiresAt <= Date.now()) eventContextCache.delete(cacheKey);

  const { data: etRaw } = await db
    .from("event_types")
    .select(
      "duration, start_hour, end_hour, slot_increment, min_notice_hours, max_days_in_advance, buffer_before_minutes, buffer_after_minutes, max_bookings_per_day, max_bookings_per_slot, availability_schedule_id, weekly_availability, blocked_dates, blocked_weekdays, assigned_member_ids, team_scheduling_mode, collective_required_member_ids, collective_show_availability_tiers, collective_min_available_hosts, booking_window_type, booking_window_start_date, booking_window_end_date"
    )
    .eq("slug", eventSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!etRaw) {
    const fallback = getDefaultContext(eventSlug);
    eventContextCache.set(cacheKey, {
      expiresAt: Date.now() + EVENT_CONTEXT_CACHE_TTL_MS,
      payload: fallback,
    });
    return fallback;
  }

  const et = etRaw as EventTypeConfigRow;
  const resolvedRules = await resolveAvailabilityRules({
    weeklyAvailability: et.weekly_availability,
    availabilityScheduleId: et.availability_schedule_id,
    blockedDates: et.blocked_dates,
    blockedWeekdays: et.blocked_weekdays,
    db,
  });
  const weeklyAvailability: WeeklyAvailability | null = resolvedRules.weekly_availability;

  const payload: EventAvailabilityContext = {
    eventSlug,
    eventFound: true,
    baseSettings: {
      duration: et.duration ?? DEFAULT_SETTINGS.duration,
      start_hour: et.start_hour ?? DEFAULT_SETTINGS.start_hour,
      end_hour: et.end_hour ?? DEFAULT_SETTINGS.end_hour,
      slot_increment: et.slot_increment ?? DEFAULT_SETTINGS.slot_increment,
      min_notice_hours: et.min_notice_hours ?? DEFAULT_SETTINGS.min_notice_hours,
      max_days_in_advance: et.max_days_in_advance ?? DEFAULT_SETTINGS.max_days_in_advance,
      booking_window_type: et.booking_window_type ?? DEFAULT_SETTINGS.booking_window_type,
      booking_window_start_date:
        et.booking_window_start_date ?? DEFAULT_SETTINGS.booking_window_start_date,
      booking_window_end_date: et.booking_window_end_date ?? DEFAULT_SETTINGS.booking_window_end_date,
      buffer_before_minutes: et.buffer_before_minutes ?? DEFAULT_SETTINGS.buffer_before_minutes,
      buffer_after_minutes: et.buffer_after_minutes ?? DEFAULT_SETTINGS.buffer_after_minutes,
      max_bookings_per_day: et.max_bookings_per_day ?? DEFAULT_SETTINGS.max_bookings_per_day,
      max_bookings_per_slot: et.max_bookings_per_slot ?? DEFAULT_SETTINGS.max_bookings_per_slot,
      blocked_dates: [],
    },
    weeklyAvailability,
    blockedDates: new Set(resolvedRules.blockers.dates),
    blockedWeekdays: new Set(resolvedRules.blockers.weekdays),
    assignedMemberIds: normalizeMemberIds(et.assigned_member_ids),
    teamSchedulingMode: et.team_scheduling_mode ?? "round_robin",
    collectiveRequiredMemberIds: normalizeMemberIds(et.collective_required_member_ids),
    collectiveShowAvailabilityTiers: et.collective_show_availability_tiers ?? false,
    collectiveMinAvailableHosts: et.collective_min_available_hosts ?? null,
  };

  eventContextCache.set(cacheKey, {
    expiresAt: Date.now() + EVENT_CONTEXT_CACHE_TTL_MS,
    payload,
  });

  return payload;
}

function settingsForDate(
  date: string,
  context: EventAvailabilityContext
): { settings: AvailabilitySettings | null; reason: string | null } {
  if (context.blockedDates.has(date)) return { settings: null, reason: "blocked_date" };
  if (context.blockedWeekdays.has(new Date(date + "T00:00:00").getDay())) {
    return { settings: null, reason: "blocked_weekday" };
  }

  let settings = context.baseSettings;
  if (context.weeklyAvailability) {
    const dayKey = String(new Date(date + "T00:00:00").getDay());
    const dayAvailability = context.weeklyAvailability[dayKey];
    if (!dayAvailability?.enabled) return { settings: null, reason: "day_disabled" };
    settings = {
      ...settings,
      start_hour: dayAvailability.start_hour ?? settings.start_hour,
      end_hour: dayAvailability.end_hour ?? settings.end_hour,
      availability_ranges: dayAvailability.ranges,
    };
  }

  return { settings, reason: null };
}

function isBookableByWindow(date: string, settings: AvailabilitySettings) {
  const requestedDate = new Date(date + "T00:00:00");
  if (settings.booking_window_type === "fixed") {
    if (!settings.booking_window_start_date || !settings.booking_window_end_date) {
      return false;
    }
    return date >= settings.booking_window_start_date && date <= settings.booking_window_end_date;
  }

  const maxDate = new Date();
  maxDate.setHours(0, 0, 0, 0);
  maxDate.setDate(maxDate.getDate() + settings.max_days_in_advance);
  return requestedDate <= maxDate;
}

async function preloadBookingCounts({
  db,
  eventSlug,
  dates,
}: {
  db: ReturnType<typeof createServerClient>;
  eventSlug: string | null;
  dates: string[];
}): Promise<BookingCounts | undefined> {
  if (!eventSlug || dates.length === 0) return undefined;

  const { data } = await db
    .from("bookings")
    .select("date, time")
    .eq("event_slug", eventSlug)
    .in("status", ["confirmed", "pending"])
    .in("date", dates);

  const dayCounts = new Map<string, number>();
  const slotCountsByDate = new Map<string, Map<string, number>>();
  (data ?? []).forEach((row) => {
    dayCounts.set(row.date, (dayCounts.get(row.date) ?? 0) + 1);
    const slotCounts = slotCountsByDate.get(row.date) ?? new Map<string, number>();
    slotCounts.set(row.time, (slotCounts.get(row.time) ?? 0) + 1);
    slotCountsByDate.set(row.date, slotCounts);
  });

  return { dayCounts, slotCountsByDate };
}

async function getAvailabilityForDate({
  date,
  context,
  db,
  preloadedCounts,
  includeMemberDetails,
}: {
  date: string;
  context: EventAvailabilityContext;
  db: ReturnType<typeof createServerClient>;
  preloadedCounts?: BookingCounts;
  includeMemberDetails?: boolean;
}): Promise<AvailabilityResponse> {
  if (!ISO_DATE_RE.test(date)) {
    return { slots: null, error: "invalid_date", reason: "invalid_date" };
  }

  const cacheKey = `${context.eventSlug ?? "_default"}:${date}:${includeMemberDetails ? "details" : "public"}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }
  if (cached && cached.expiresAt <= Date.now()) {
    availabilityCache.delete(cacheKey);
  }

  const withCache = (payload: AvailabilityResponse) => {
    availabilityCache.set(cacheKey, {
      expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
      payload,
    });
    return payload;
  };

  // Don't show slots for past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(date + "T00:00:00") < today) {
    return withCache({ slots: [], reason: "past_date" });
  }

  if (context.eventSlug && !context.eventFound) {
    return withCache({ slots: [], reason: "event_not_found" });
  }

  const dayEvaluation = settingsForDate(date, context);
  const settings = dayEvaluation.settings;
  if (!settings) return withCache({ slots: [], reason: dayEvaluation.reason ?? "unavailable_day" });
  if (!isBookableByWindow(date, settings)) {
    return withCache({ slots: [], reason: "outside_booking_window" });
  }

  // Enforce per-day cap before querying calendar
  if (context.eventSlug && settings.max_bookings_per_day) {
    let count = preloadedCounts?.dayCounts.get(date);
    if (count === undefined) {
      const result = await db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("date", date)
        .eq("event_slug", context.eventSlug)
        .in("status", ["confirmed", "pending"]);
      count = result.count ?? 0;
    }
    if (count >= settings.max_bookings_per_day) {
      return withCache({ slots: [], reason: "day_cap_reached" });
    }
  }

  try {
    // Team mode: if the event type has assigned members, query their calendars
    // and return the union of free slots. Otherwise fall back to single host.
    const teamAvailability =
      context.assignedMemberIds.length > 0
        ? await getTeamAvailability({
            date,
            settings,
            memberIds: context.assignedMemberIds,
            mode: context.teamSchedulingMode,
            requiredMemberIds: context.collectiveRequiredMemberIds,
            fallbackMinimumHostCount: context.collectiveMinAvailableHosts,
            showAvailabilityTiers: context.collectiveShowAvailabilityTiers,
            includeMemberDetails,
            db,
          })
        : null;
    const { slots, hostTimezone } = teamAvailability
      ? teamAvailability
      : await getHostAvailableSlots(date, settings);
    const slotMeta = teamAvailability?.slotMeta.map((slot) =>
      includeMemberDetails
        ? slot
        : {
            ...slot,
            availableMemberIds: [],
            availableMemberNames: undefined,
          }
    );

    // Enforce per-slot cap
    if (context.eventSlug && settings.max_bookings_per_slot && slots.length > 0) {
      let counts = preloadedCounts?.slotCountsByDate.get(date);
      if (!counts) {
        const { data: existing } = await db
          .from("bookings")
          .select("time")
          .eq("date", date)
          .eq("event_slug", context.eventSlug)
          .in("status", ["confirmed", "pending"]);
        counts = new Map<string, number>();
        (existing ?? []).forEach((b) => counts!.set(b.time, (counts!.get(b.time) ?? 0) + 1));
      }
      const filtered = slots.filter((slot) => (counts.get(slot) ?? 0) < settings.max_bookings_per_slot!);
      const filteredMeta = slotMeta?.filter((slot) => filtered.includes(slot.time));
      return withCache({
        slots: filtered,
        hostTimezone,
        ...(filteredMeta ? { slotMeta: filteredMeta } : {}),
        ...(includeMemberDetails && teamAvailability?.selectedMembers
          ? { selectedMembers: teamAvailability.selectedMembers }
          : {}),
        ...(teamAvailability
          ? {
              availabilityTiersEnabled: teamAvailability.availabilityTiersEnabled,
              preferredMinimumHostCount: teamAvailability.preferredMinimumHostCount,
              fallbackMinimumHostCount: teamAvailability.fallbackMinimumHostCount,
            }
          : {}),
        reason: filtered.length > 0 ? "available" : "slot_cap_reached",
      });
    }

    return withCache({
      slots,
      hostTimezone,
      ...(slotMeta ? { slotMeta } : {}),
      ...(includeMemberDetails && teamAvailability?.selectedMembers
        ? { selectedMembers: teamAvailability.selectedMembers }
        : {}),
      ...(teamAvailability
        ? {
            availabilityTiersEnabled: teamAvailability.availabilityTiersEnabled,
            preferredMinimumHostCount: teamAvailability.preferredMinimumHostCount,
            fallbackMinimumHostCount: teamAvailability.fallbackMinimumHostCount,
          }
        : {}),
      reason: slots.length > 0 ? "available" : "no_slots",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[availability] calendar not connected, returning null:", message);
    const payload = { slots: null, error: message, reason: "calendar_error" } as const;
    availabilityCache.set(cacheKey, {
      expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
      payload,
    });
    return payload;
  }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const eventSlug = request.nextUrl.searchParams.get("event");
  const includeMemberDetails = request.nextUrl.searchParams.get("details") === "1";
  if (includeMemberDetails) {
    const { unauthorized } = await requireApiUser();
    if (unauthorized) return unauthorized;
  }
  const db = createServerClient();
  const dates = parseDatesParam(request.nextUrl.searchParams.get("dates"));
  const context = await getEventAvailabilityContext({ eventSlug, db });

  // Batch mode: GET /api/availability?dates=YYYY-MM-DD,YYYY-MM-DD...
  if (dates.length > 0) {
    const preloadedCounts =
      context.eventSlug &&
      (context.baseSettings.max_bookings_per_day || context.baseSettings.max_bookings_per_slot)
        ? await preloadBookingCounts({ db, eventSlug: context.eventSlug, dates })
        : undefined;

    const results = await Promise.all(
      dates.map(async (date) => ({
        date,
        payload: await getAvailabilityForDate({
          date,
          context,
          db,
          preloadedCounts,
          includeMemberDetails,
        }),
      }))
    );

    const slotsByDate: Record<string, string[] | null> = {};
    const slotMetaByDate: Record<string, TeamAvailabilitySlotMeta[]> = {};
    const errors: Record<string, string> = {};
    const reasons: Record<string, string> = {};
    const selectedMembersByDate: Record<string, TeamAvailabilityMember[]> = {};
    let hostTimezone: string | undefined;
    let availabilityTiersEnabled = false;
    let preferredMinimumHostCount: number | undefined;
    let fallbackMinimumHostCount: number | null | undefined;

    results.forEach(({ date, payload }) => {
      slotsByDate[date] = payload.slots;
      if ("error" in payload) errors[date] = payload.error;
      if (payload.reason) reasons[date] = payload.reason;
      if ("slotMeta" in payload && payload.slotMeta) slotMetaByDate[date] = payload.slotMeta;
      if ("selectedMembers" in payload && payload.selectedMembers) {
        selectedMembersByDate[date] = payload.selectedMembers;
      }
      if ("hostTimezone" in payload && payload.hostTimezone && !hostTimezone) {
        hostTimezone = payload.hostTimezone;
      }
      if ("availabilityTiersEnabled" in payload && payload.availabilityTiersEnabled) {
        availabilityTiersEnabled = true;
      }
      if (
        "preferredMinimumHostCount" in payload &&
        typeof payload.preferredMinimumHostCount === "number" &&
        preferredMinimumHostCount === undefined
      ) {
        preferredMinimumHostCount = payload.preferredMinimumHostCount;
      }
      if ("fallbackMinimumHostCount" in payload && fallbackMinimumHostCount === undefined) {
        fallbackMinimumHostCount = payload.fallbackMinimumHostCount ?? null;
      }
    });

    const durationMs = Date.now() - startedAt;
    console.info("[availability] batch", {
      event_slug: eventSlug ?? null,
      dates: dates.length,
      duration_ms: durationMs,
    });

    return NextResponse.json({
      slotsByDate,
      ...(Object.keys(slotMetaByDate).length > 0 ? { slotMetaByDate } : {}),
      ...(hostTimezone ? { hostTimezone } : {}),
      ...(Object.keys(errors).length > 0 ? { errors } : {}),
      ...(Object.keys(reasons).length > 0 ? { reasons } : {}),
      ...(Object.keys(selectedMembersByDate).length > 0 ? { selectedMembersByDate } : {}),
      ...(availabilityTiersEnabled ? { availabilityTiersEnabled } : {}),
      ...(typeof preferredMinimumHostCount === "number" ? { preferredMinimumHostCount } : {}),
      ...(fallbackMinimumHostCount !== undefined ? { fallbackMinimumHostCount } : {}),
    }, {
      headers: { "x-citacal-duration-ms": String(durationMs) },
    });
  }

  // Single-date mode: backward-compatible with existing consumers.
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !ISO_DATE_RE.test(date)) {
    const durationMs = Date.now() - startedAt;
    return NextResponse.json(
      { error: "date param required in YYYY-MM-DD format" },
      {
        status: 400,
        headers: { "x-citacal-duration-ms": String(durationMs) },
      }
    );
  }

  const preloadedCounts =
    context.eventSlug &&
    (context.baseSettings.max_bookings_per_day || context.baseSettings.max_bookings_per_slot)
      ? await preloadBookingCounts({ db, eventSlug: context.eventSlug, dates: [date] })
      : undefined;

  const payload = await getAvailabilityForDate({
    date,
    context,
    db,
    preloadedCounts,
    includeMemberDetails,
  });
  const durationMs = Date.now() - startedAt;
  console.info("[availability] single", {
    event_slug: eventSlug ?? null,
    date,
    duration_ms: durationMs,
  });

  return NextResponse.json(payload, {
    headers: { "x-citacal-duration-ms": String(durationMs) },
  });
}
