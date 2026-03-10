import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { getMicrosoftAuthUrlForMember } from "@/lib/outlook-calendar";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const db = createServerClient();
  const { data: member } = await db
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  const authUrl = getMicrosoftAuthUrlForMember(member.id);
  return NextResponse.redirect(authUrl);
}
