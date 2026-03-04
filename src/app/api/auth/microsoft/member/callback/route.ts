import { NextRequest, NextResponse } from "next/server";
import { exchangeMicrosoftCodeAndSaveForMember } from "@/lib/outlook-calendar";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // "member:{id}"
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/app/member/settings?calendar_error=access_denied", APP_URL));
  }

  if (!code || !state?.startsWith("member:")) {
    return NextResponse.redirect(new URL("/app/member/settings?calendar_error=no_code", APP_URL));
  }

  const memberId = state.replace("member:", "");

  try {
    await exchangeMicrosoftCodeAndSaveForMember(code, memberId);
    return NextResponse.redirect(new URL("/app/member/settings?calendar_connected=microsoft", APP_URL));
  } catch (err) {
    console.error("[microsoft/member/callback] error:", err);
    return NextResponse.redirect(new URL("/app/member/settings?calendar_error=exchange_failed", APP_URL));
  }
}
