import {
  timeLabelToMinutes,
  type SlotSettings,
} from "@/lib/google-calendar";
import {
  getAvailableSlotsForMemberCalendar,
  hasConnectedMemberCalendar,
  type MemberCalendarConnection,
} from "@/lib/member-calendar";
import { createServerClient } from "@/lib/supabase";

export type TeamSchedulingMode = "round_robin" | "collective";
export type CollectiveSlotTier = "preferred" | "other";

type TeamMemberRow = MemberCalendarConnection & {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
};

export type TeamAvailabilityMember = {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  isConnected: boolean;
};

export type TeamAvailabilitySlotMeta = {
  time: string;
  availableMemberIds: string[];
  availableMemberNames?: string[];
  availableCount: number;
  connectedHostCount: number;
  tier: CollectiveSlotTier | null;
};

export type TeamAvailabilityResult = {
  slots: string[];
  hostTimezone: string;
  slotMeta: TeamAvailabilitySlotMeta[];
  selectedMembers: TeamAvailabilityMember[];
  connectedMemberIds: string[];
  requiredMemberIds: string[];
  blockingMissingRequiredMemberIds: string[];
  availabilityTiersEnabled: boolean;
  preferredMinimumHostCount: number;
  fallbackMinimumHostCount: number | null;
};

function normalizeMemberIds(value: string[]) {
  return [...new Set(value.filter((id) => typeof id === "string" && id.length > 0))];
}

function orderByInput<T extends { id: string }>(rows: T[], memberIds: string[]) {
  const order = new Map(memberIds.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
}

export async function getSelectedTeamMembers(
  memberIds: string[],
  db: ReturnType<typeof createServerClient> = createServerClient()
) {
  const normalized = normalizeMemberIds(memberIds);
  if (normalized.length === 0) return [];

  const { data } = await db
    .from("team_members")
    .select(
      "id, name, email, photo_url, google_access_token, google_refresh_token, google_token_expiry, google_calendar_ids, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry, microsoft_calendar_ids"
    )
    .in("id", normalized)
    .eq("is_active", true);

  return orderByInput((data ?? []) as TeamMemberRow[], normalized);
}

export async function getTeamAvailability({
  date,
  settings,
  memberIds,
  mode = "round_robin",
  requiredMemberIds = [],
  fallbackMinimumHostCount = null,
  showAvailabilityTiers = false,
  includeMemberDetails = false,
  db = createServerClient(),
}: {
  date: string;
  settings: SlotSettings;
  memberIds: string[];
  mode?: TeamSchedulingMode;
  requiredMemberIds?: string[];
  fallbackMinimumHostCount?: number | null;
  showAvailabilityTiers?: boolean;
  includeMemberDetails?: boolean;
  db?: ReturnType<typeof createServerClient>;
}): Promise<TeamAvailabilityResult> {
  const selectedMembers = await getSelectedTeamMembers(memberIds, db);
  const memberSummaries: TeamAvailabilityMember[] = selectedMembers.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    photo_url: member.photo_url,
    isConnected: hasConnectedMemberCalendar(member),
  }));

  const connectedMembers = selectedMembers.filter((member) => hasConnectedMemberCalendar(member));
  const connectedMemberIds = connectedMembers.map((member) => member.id);
  const preferredMinimumHostCount = connectedMembers.length;
  const normalizedRequiredMemberIds = normalizeMemberIds(
    requiredMemberIds.length > 0 ? requiredMemberIds : mode === "collective" ? memberIds : []
  );
  const blockingMissingRequiredMemberIds = normalizedRequiredMemberIds.filter(
    (id) => !connectedMemberIds.includes(id)
  );

  if (connectedMembers.length === 0) {
    return {
      slots: [],
      hostTimezone: "UTC",
      slotMeta: [],
      selectedMembers: memberSummaries,
      connectedMemberIds,
      requiredMemberIds: normalizedRequiredMemberIds,
      blockingMissingRequiredMemberIds,
      availabilityTiersEnabled: mode === "collective" && showAvailabilityTiers,
      preferredMinimumHostCount,
      fallbackMinimumHostCount: fallbackMinimumHostCount ?? null,
    };
  }

  const perMemberResults = await Promise.allSettled(
    connectedMembers.map(async (member) => {
      const result = await getAvailableSlotsForMemberCalendar(date, settings, member);

      return {
        member,
        slots: result.slots,
        hostTimezone: result.hostTimezone,
      };
    })
  );

  const slotMembers = new Map<string, string[]>();
  const namesById = new Map(selectedMembers.map((member) => [member.id, member.name]));
  let hostTimezone = "UTC";

  perMemberResults.forEach((result) => {
    if (result.status !== "fulfilled") return;
    if (result.value.hostTimezone !== "UTC") hostTimezone = result.value.hostTimezone;
    result.value.slots.forEach((slot) => {
      const current = slotMembers.get(slot) ?? [];
      current.push(result.value.member.id);
      slotMembers.set(slot, current);
    });
  });

  const fallbackMin = (() => {
    if (mode !== "collective") return null;
    if (!showAvailabilityTiers) return null;
    if (!fallbackMinimumHostCount || !Number.isFinite(fallbackMinimumHostCount)) {
      return preferredMinimumHostCount;
    }
    return Math.max(
      1,
      Math.min(preferredMinimumHostCount, Math.floor(fallbackMinimumHostCount))
    );
  })();

  const sortedSlotEntries = [...slotMembers.entries()].sort(
    (a, b) => timeLabelToMinutes(a[0]) - timeLabelToMinutes(b[0])
  );

  const slotMeta: TeamAvailabilitySlotMeta[] = [];
  const slots: string[] = [];

  sortedSlotEntries.forEach(([time, availableMemberIdsRaw]) => {
    const availableMemberIds = orderByInput(
      availableMemberIdsRaw.map((id) => ({ id })),
      connectedMemberIds
    ).map((row) => row.id);
    const availableCount = availableMemberIds.length;

    if (mode === "collective") {
      if (blockingMissingRequiredMemberIds.length > 0) return;

      const hasAllRequired = normalizedRequiredMemberIds.every((id) =>
        availableMemberIds.includes(id)
      );
      if (!hasAllRequired) return;

      const minVisibleCount = showAvailabilityTiers
        ? Math.max(normalizedRequiredMemberIds.length, fallbackMin ?? preferredMinimumHostCount)
        : normalizedRequiredMemberIds.length;

      if (availableCount < minVisibleCount) return;

      const tier: CollectiveSlotTier =
        availableCount === preferredMinimumHostCount ? "preferred" : "other";
      slots.push(time);
      slotMeta.push({
        time,
        availableMemberIds,
        ...(includeMemberDetails
          ? {
              availableMemberNames: availableMemberIds.map(
                (memberId) => namesById.get(memberId) ?? "Unknown"
              ),
            }
          : {}),
        availableCount,
        connectedHostCount: preferredMinimumHostCount,
        tier,
      });
      return;
    }

    slots.push(time);
    slotMeta.push({
      time,
      availableMemberIds,
      ...(includeMemberDetails
        ? {
            availableMemberNames: availableMemberIds.map(
              (memberId) => namesById.get(memberId) ?? "Unknown"
            ),
          }
        : {}),
      availableCount,
      connectedHostCount: preferredMinimumHostCount,
      tier: null,
    });
  });

  return {
    slots,
    hostTimezone,
    slotMeta,
    selectedMembers: memberSummaries,
    connectedMemberIds,
    requiredMemberIds: normalizedRequiredMemberIds,
    blockingMissingRequiredMemberIds,
    availabilityTiersEnabled: mode === "collective" && showAvailabilityTiers,
    preferredMinimumHostCount,
    fallbackMinimumHostCount: fallbackMin,
  };
}

export function findSlotMeta(
  slotMeta: TeamAvailabilitySlotMeta[],
  time: string
): TeamAvailabilitySlotMeta | null {
  return slotMeta.find((slot) => slot.time === time) ?? null;
}
