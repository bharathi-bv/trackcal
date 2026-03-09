import PublicBookingPageShell from "@/components/booking/PublicBookingPageShell";

export default async function PrefixedPublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ hostSlug: string; eventSlug: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const { hostSlug, eventSlug } = await params;
  const resolvedSearchParams = await searchParams;
  return (
    <PublicBookingPageShell
      hostSlug={hostSlug}
      eventSlug={eventSlug}
      searchParams={resolvedSearchParams}
    />
  );
}
