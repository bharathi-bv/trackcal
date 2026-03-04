import {
  createCalendarEventForMember as createGoogleCalendarEventForMember,
  deleteCalendarEventForMember as deleteGoogleCalendarEventForMember,
  getAvailableSlotsForMemberTokens as getGoogleAvailableSlotsForMember,
  isMemberFreeAtSlot as isGoogleMemberFreeAtSlot,
  listMemberGoogleCalendars,
  type ConnectedCalendar,
  type MemberCalendarTokens,
  type SlotSettings,
  updateCalendarEventForMember as updateGoogleCalendarEventForMember,
} from "@/lib/google-calendar";
import {
  createOutlookCalendarEventForMember,
  deleteOutlookCalendarEventForMember,
  getAvailableSlotsOutlookForMember,
  isMemberAvailableOutlook,
  listMemberOutlookCalendars,
  type ConnectedOutlookCalendar,
  updateOutlookCalendarEventForMember,
} from "@/lib/outlook-calendar";

export type MemberCalendarConnection = {
  id: string;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: string | null;
  google_calendar_ids?: string[] | null;
  microsoft_access_token?: string | null;
  microsoft_refresh_token?: string | null;
  microsoft_token_expiry?: string | null;
  microsoft_calendar_ids?: string[] | null;
};

export type MemberConnectedCalendar = (ConnectedCalendar | ConnectedOutlookCalendar) & {
  provider: "google" | "microsoft";
};

export function getMemberCalendarProvider(
  member: Pick<MemberCalendarConnection, "google_refresh_token" | "microsoft_refresh_token">
): "google" | "microsoft" | null {
  if (member.microsoft_refresh_token) return "microsoft";
  if (member.google_refresh_token) return "google";
  return null;
}

export function hasConnectedMemberCalendar(
  member: Pick<MemberCalendarConnection, "google_refresh_token" | "microsoft_refresh_token">
) {
  return Boolean(getMemberCalendarProvider(member));
}

function toGoogleTokens(member: MemberCalendarConnection): MemberCalendarTokens {
  return {
    access_token: member.google_access_token,
    refresh_token: member.google_refresh_token!,
    expiry: member.google_token_expiry,
    memberId: member.id,
    calendar_ids: member.google_calendar_ids ?? [],
  };
}

export async function getAvailableSlotsForMemberCalendar(
  date: string,
  settings: SlotSettings,
  member: MemberCalendarConnection
) {
  if (member.microsoft_refresh_token) {
    return getAvailableSlotsOutlookForMember(member, date, settings);
  }
  if (!member.google_refresh_token) {
    return { slots: [], hostTimezone: "UTC" };
  }
  return getGoogleAvailableSlotsForMember(date, settings, toGoogleTokens(member));
}

export async function isMemberCalendarFreeAtSlot(
  member: MemberCalendarConnection,
  date: string,
  time: string,
  durationMinutes: number
) {
  if (member.microsoft_refresh_token) {
    const [timePart, period] = time.split(" ");
    const [hoursPart, minutesPart] = timePart.split(":").map(Number);
    let hours = hoursPart;
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const slotStart = new Date(
      `${date}T${String(hours).padStart(2, "0")}:${String(minutesPart).padStart(2, "0")}:00Z`
    );
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
    return isMemberAvailableOutlook(member, slotStart, slotEnd);
  }
  return isGoogleMemberFreeAtSlot(member, date, time, durationMinutes);
}

export async function createMemberCalendarEvent(
  args: {
    date: string;
    time: string;
    name: string;
    email: string;
    durationMinutes?: number;
    summary?: string;
    description?: string;
    location?: string;
    member: MemberCalendarConnection;
  }
) {
  if (args.member.microsoft_refresh_token) {
    return createOutlookCalendarEventForMember({
      date: args.date,
      time: args.time,
      name: args.name,
      email: args.email,
      durationMinutes: args.durationMinutes,
      summary: args.summary,
      description: args.description,
      location: args.location,
      member: args.member,
    });
  }
  return createGoogleCalendarEventForMember({
    ...args,
    memberTokens: toGoogleTokens(args.member),
  });
}

export async function updateMemberCalendarEvent(
  args: {
    eventId: string;
    date: string;
    time: string;
    durationMinutes?: number;
    summary?: string;
    description?: string;
    location?: string;
    member: MemberCalendarConnection;
  }
) {
  if (args.member.microsoft_refresh_token) {
    return updateOutlookCalendarEventForMember({
      eventId: args.eventId,
      date: args.date,
      time: args.time,
      durationMinutes: args.durationMinutes,
      summary: args.summary,
      description: args.description,
      location: args.location,
      member: args.member,
    });
  }
  return updateGoogleCalendarEventForMember({
    ...args,
    memberTokens: toGoogleTokens(args.member),
  });
}

export async function deleteMemberCalendarEvent({
  eventId,
  member,
}: {
  eventId: string;
  member: MemberCalendarConnection;
}) {
  if (member.microsoft_refresh_token) {
    return deleteOutlookCalendarEventForMember({ eventId, member });
  }
  return deleteGoogleCalendarEventForMember({
    eventId,
    memberTokens: toGoogleTokens(member),
  });
}

export async function listMemberConnectedCalendars(
  member: MemberCalendarConnection
): Promise<MemberConnectedCalendar[]> {
  if (member.microsoft_refresh_token) {
    const calendars = await listMemberOutlookCalendars(member);
    return calendars.map((calendar) => ({ ...calendar, provider: "microsoft" as const }));
  }
  if (!member.google_refresh_token) return [];
  const calendars = await listMemberGoogleCalendars(toGoogleTokens(member));
  return calendars.map((calendar) => ({ ...calendar, provider: "google" as const }));
}
