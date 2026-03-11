import { Suspense } from "react";
import { getMultiCalendarState } from "@/lib/calendar-connections";
import { getAvailabilitySchedules } from "@/lib/availability-schedules";
import { createServerClient } from "@/lib/supabase";
import AvailabilityClient from "@/components/dashboard/AvailabilityClient";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const db = createServerClient();

  const [calendarState, schedules] = await Promise.all([
    getMultiCalendarState(),
    getAvailabilitySchedules(db).catch(() => []),
  ]);

  return (
    <main className="dashboard-main">
      <Suspense>
        <AvailabilityClient
          initialCalendar={calendarState}
          initialSchedules={schedules}
        />
      </Suspense>
    </main>
  );
}
