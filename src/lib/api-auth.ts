import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase-server";

export async function requireApiUser() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, unauthorized: null };
}
