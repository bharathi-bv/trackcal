import { NextResponse } from "next/server";
import { getSheetAuthUrl } from "@/lib/google-sheets";

export async function GET() {
  return NextResponse.redirect(getSheetAuthUrl());
}
