import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import { getMicrosoftAuthUrlForMember } from "@/lib/outlook-calendar";

export async function GET(request: NextRequest) {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const db = createServerClient();
  const { data: member } = await db
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  const authUrl = getMicrosoftAuthUrlForMember(member.id);
  return NextResponse.redirect(authUrl);
}
