import { deleteHostCalendarEvent } from "@/lib/host-calendar";
import {
  deleteMemberCalendarEvent,
  type MemberCalendarConnection,
} from "@/lib/member-calendar";
import { createServerClient } from "@/lib/supabase";
import { deleteZoomMeeting } from "@/lib/zoom";

export type BookingCalendarState = {
  assigned_to: string | null;
  calendar_event_id: string | null;
  calendar_events: unknown;
  zoom_meeting_id?: string | null;
};

export function normalizeCalendarEvents(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<{ member_id: string; calendar_event_id: string }>;
  return value.filter(
    (
      row
    ): row is {
      member_id: string;
      calendar_event_id: string;
    } =>
      Boolean(
        row &&
          typeof row === "object" &&
          "member_id" in row &&
          "calendar_event_id" in row &&
          typeof row.member_id === "string" &&
          typeof row.calendar_event_id === "string"
      )
  );
}

export async function getMemberTokensForAssignedBooking({
  booking,
  db,
}: {
  booking: Pick<BookingCalendarState, "assigned_to">;
  db: ReturnType<typeof createServerClient>;
}): Promise<MemberCalendarConnection | null> {
  if (!booking.assigned_to) return null;

  const { data: member } = await db
    .from("team_members")
    .select(
      "id, google_access_token, google_refresh_token, google_token_expiry, google_calendar_ids, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry, microsoft_calendar_ids"
    )
    .eq("id", booking.assigned_to)
    .eq("is_active", true)
    .maybeSingle();

  if (!member?.google_refresh_token && !member?.microsoft_refresh_token) return null;
  return member as MemberCalendarConnection;
}

export async function getMemberTokensByIds({
  memberIds,
  db,
}: {
  memberIds: string[];
  db: ReturnType<typeof createServerClient>;
}) {
  const normalized = [...new Set(memberIds)];
  if (normalized.length === 0) return new Map<string, MemberCalendarConnection>();

  const { data: members } = await db
    .from("team_members")
    .select(
      "id, google_access_token, google_refresh_token, google_token_expiry, google_calendar_ids, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry, microsoft_calendar_ids"
    )
    .in("id", normalized)
    .eq("is_active", true);

  const map = new Map<string, MemberCalendarConnection>();
  (members ?? []).forEach((member) => {
    if (!member.google_refresh_token && !member.microsoft_refresh_token) return;
    map.set(member.id, member as MemberCalendarConnection);
  });
  return map;
}

export async function cleanupBookingArtifacts({
  booking,
  db = createServerClient(),
}: {
  booking: BookingCalendarState;
  db?: ReturnType<typeof createServerClient>;
}) {
  const calendarEvents = normalizeCalendarEvents(booking.calendar_events);

  if (calendarEvents.length > 0) {
    const tokenMap = await getMemberTokensByIds({
      memberIds: calendarEvents.map((event) => event.member_id),
      db,
    });

    await Promise.allSettled(
      calendarEvents.map((event) => {
        const memberTokens = tokenMap.get(event.member_id);
        if (!memberTokens) return Promise.resolve();
        return deleteMemberCalendarEvent({
          eventId: event.calendar_event_id,
          member: memberTokens,
        });
      })
    );
  } else if (booking.calendar_event_id) {
    const memberTokens = await getMemberTokensForAssignedBooking({ booking, db });
    if (memberTokens) {
      await deleteMemberCalendarEvent({
        eventId: booking.calendar_event_id,
        member: memberTokens,
      });
    } else {
      await deleteHostCalendarEvent(booking.calendar_event_id);
    }
  }

  if (booking.zoom_meeting_id) {
    await deleteZoomMeeting(booking.zoom_meeting_id);
  }
}
