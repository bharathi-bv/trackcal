import { NextResponse } from "next/server";
import { getZoomAuthUrl } from "@/lib/zoom";

export async function GET() {
  return NextResponse.redirect(getZoomAuthUrl());
}
