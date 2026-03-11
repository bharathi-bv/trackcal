import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exchangeMicrosoftCodeAndSave } from "@/lib/outlook-calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state");
  const isOnboarding = state === "onboarding";

  if (error) {
    console.error("[microsoft/callback] OAuth error:", error);
    const url = isOnboarding
      ? "/app/connect-calendar?calendar_error=access_denied"
      : "/app/dashboard/integrations?calendar_error=access_denied";
    return NextResponse.redirect(new URL(url, request.url));
  }

  if (!code) {
    const url = isOnboarding
      ? "/app/connect-calendar?calendar_error=no_code"
      : "/app/dashboard/integrations?calendar_error=no_code";
    return NextResponse.redirect(new URL(url, request.url));
  }

  try {
    const { userId } = await auth();
    await exchangeMicrosoftCodeAndSave(code, userId ?? undefined);
    const successUrl = isOnboarding
      ? "/app/dashboard"
      : "/app/dashboard/integrations?calendar_connected=microsoft";
    return NextResponse.redirect(new URL(successUrl, request.url));
  } catch (err) {
    console.error("[microsoft/callback] token exchange failed:", err);
    const errorUrl = isOnboarding
      ? "/app/connect-calendar?calendar_error=exchange_failed"
      : "/app/dashboard/integrations?calendar_error=exchange_failed";
    return NextResponse.redirect(new URL(errorUrl, request.url));
  }
}
