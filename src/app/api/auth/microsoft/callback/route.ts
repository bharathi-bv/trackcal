import { NextRequest, NextResponse } from "next/server";
import { exchangeMicrosoftCodeAndSave } from "@/lib/outlook-calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    console.error("[microsoft/callback] OAuth error:", error);
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?calendar_error=access_denied", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?calendar_error=no_code", request.url)
    );
  }

  try {
    await exchangeMicrosoftCodeAndSave(code);
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?calendar_connected=microsoft", request.url)
    );
  } catch (err) {
    console.error("[microsoft/callback] token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?calendar_error=exchange_failed", request.url)
    );
  }
}
