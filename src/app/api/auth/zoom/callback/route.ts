import { NextRequest, NextResponse } from "next/server";
import { exchangeZoomCodeAndSave } from "@/lib/zoom";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const base = new URL("/app/dashboard/settings", request.url);

  if (error || !code) {
    base.searchParams.set("zoom_error", error ?? "no_code");
    return NextResponse.redirect(base);
  }

  try {
    await exchangeZoomCodeAndSave(code);
    base.searchParams.set("zoom_connected", "1");
    return NextResponse.redirect(base);
  } catch (err) {
    console.error("[zoom/callback]", err);
    base.searchParams.set("zoom_error", "exchange_failed");
    return NextResponse.redirect(base);
  }
}
