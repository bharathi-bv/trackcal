import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { deleteZoomMeeting } from "@/lib/zoom";

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

  // If cancelling, fetch zoom_meeting_id first for soft-fail cleanup
  if (normalizedStatus === "cancelled") {
    try {
      const { data: booking } = await db
        .from("bookings")
        .select("zoom_meeting_id")
        .eq("id", id)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zoomMeetingId = (booking as any)?.zoom_meeting_id as string | null | undefined;
      if (zoomMeetingId) {
        await deleteZoomMeeting(zoomMeetingId);
      }
    } catch (zoomErr) {
      // Non-fatal: do not block status update if Zoom cleanup fails
      console.warn("[bookings/status] Zoom meeting deletion failed (non-fatal):", zoomErr);
    }
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
  return NextResponse.json({
    id: data.id,
    status: normalizeStatus(data.status) ?? data.status,
  });
}
