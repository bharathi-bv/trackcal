import BookingWizard from "@/components/booking/BookingWizard";
import EmbedAutoResize from "@/components/embed/EmbedAutoResize";
import { createServerClient } from "@/lib/supabase";

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event: eventSlug } = await searchParams;
  const db = createServerClient();

  // Fetch event type + host profile in parallel (same source of truth as /book).
  const [eventTypeResult, hostSettingsResult] = await Promise.all([
    eventSlug
      ? db
          .from("event_types")
          .select("id, name, slug, duration, description, start_hour, end_hour, slot_increment")
          .eq("slug", eventSlug)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("host_settings")
      .select("host_name, profile_photo_url")
      .limit(1)
      .maybeSingle(),
  ]);

  const eventType = eventTypeResult.data;
  const hostProfile = hostSettingsResult.data;

  return (
    <main
      style={{
        minHeight: "100%",
        padding: "12px",
        display: "flex",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <EmbedAutoResize />
      <BookingWizard
        eventType={eventType ?? undefined}
        hostProfile={
          hostProfile
            ? {
                host_name: hostProfile.host_name,
                profile_photo_url: hostProfile.profile_photo_url,
              }
            : undefined
        }
      />
    </main>
  );
}
