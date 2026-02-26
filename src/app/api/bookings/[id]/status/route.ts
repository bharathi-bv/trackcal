import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";

const statusSchema = z.object({
  status: z.enum(["confirmed", "pending", "cancelled", "no_show"]),
});

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

  const db = createServerClient();
  const { data, error } = await db
    .from("bookings")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
