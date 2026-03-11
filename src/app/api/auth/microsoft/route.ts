import { NextRequest, NextResponse } from "next/server";
import { getMicrosoftAuthUrl } from "@/lib/outlook-calendar";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from") ?? undefined;
  const url = getMicrosoftAuthUrl(from);
  return NextResponse.redirect(url);
}
