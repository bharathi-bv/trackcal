import BookingWizard from "@/components/booking/BookingWizard";
import { createServerClient } from "@/lib/supabase";
import type { CustomQuestion } from "@/lib/event-type-config";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event: eventSlug } = await searchParams;

  const db = createServerClient();

  // Fetch event type (with full settings) + host profile in parallel
  const [eventTypeResult, hostSettingsResult] = await Promise.all([
    eventSlug
      ? db
          .from("event_types")
          .select("id, name, slug, duration, description, start_hour, end_hour, slot_increment, custom_questions")
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
  const customQuestions: CustomQuestion[] = Array.isArray(eventType?.custom_questions)
    ? (eventType.custom_questions as CustomQuestion[])
    : [];

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}
    >
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
        customQuestions={customQuestions}
      />
    </main>
  );
}
