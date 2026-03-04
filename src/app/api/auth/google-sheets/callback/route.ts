import { NextRequest, NextResponse } from "next/server";
import { exchangeSheetCodeAndSave } from "@/lib/google-sheets";

export async function GET(request: NextRequest) {
  const code  = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const base  = new URL("/app/dashboard/settings", request.url);

  if (error || !code) {
    base.searchParams.set("sheets_error", error ?? "no_code");
    return NextResponse.redirect(base);
  }

  try {
    await exchangeSheetCodeAndSave(code);
    base.searchParams.set("sheets_connected", "1");
    return NextResponse.redirect(base);
  } catch (err) {
    console.error("[google-sheets/callback]", err);
    base.searchParams.set("sheets_error", "exchange_failed");
    return NextResponse.redirect(base);
  }
}
