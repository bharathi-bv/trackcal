import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cleanupBookingArtifacts } from "@/lib/booking-calendars";
import { runBookingSideEffects } from "@/lib/booking-side-effects";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";

const statusSchema = z.object({
  status: z.string(),
});

type BookingStatus = "confirmed" | "pending" | "cancelled" | "no_show";

function normalizeStatus(status: string): BookingStatus | null {
  if (status === "confirmed" || status === "pending" || status === "cancelled") {
    return status;
  }
  if (status === "no_show" || status === "no-show") {
    return "no_show";
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }
  const normalizedStatus = normalizeStatus(parsed.data.status);
  if (!normalizedStatus) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = createServerClient();
  const { data: existingBooking } = await db
    .from("bookings")
    .select(
      "id, created_at, date, time, status, name, email, phone, notes, event_slug, assigned_to, assigned_host_ids, calendar_event_id, calendar_events, zoom_meeting_id, custom_answers, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid, li_fat_id, ttclid, msclkid"
    )
    .eq("id", id)
    .maybeSingle();

  if (!existingBooking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (existingBooking.status === normalizedStatus) {
    return NextResponse.json({
      id: existingBooking.id,
      status: normalizeStatus(existingBooking.status) ?? existingBooking.status,
    });
  }

  async function updateStatus(statusToPersist: string) {
    return db
      .from("bookings")
      .update({ status: statusToPersist })
      .eq("id", id)
      .select("id, status")
      .single();
  }

  let { data, error } = await updateStatus(normalizedStatus);
  if (error && normalizedStatus === "no_show") {
    const fallback = await updateStatus("no-show");
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (normalizedStatus === "cancelled") {
    try {
      await cleanupBookingArtifacts({
        booking: {
          assigned_to: existingBooking.assigned_to,
          calendar_event_id: existingBooking.calendar_event_id,
          calendar_events: existingBooking.calendar_events,
          zoom_meeting_id: existingBooking.zoom_meeting_id,
        },
        db,
      });
    } catch (cleanupErr) {
      console.warn("[bookings/status] booking cleanup failed (non-fatal):", cleanupErr);
    }
  }

  await runBookingSideEffects({
    db,
    kind: normalizedStatus === "cancelled" ? "cancelled" : "status_changed",
    changes: {
      previous_status: existingBooking.status,
    },
    booking: {
      ...existingBooking,
      status: normalizedStatus,
    },
  });

  return NextResponse.json({
    id: data.id,
    status: normalizeStatus(data.status) ?? data.status,
  });
}
