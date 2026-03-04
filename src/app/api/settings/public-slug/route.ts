import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { isHostPublicSlugAvailable } from "@/lib/public-booking-links";

export async function GET(request: NextRequest) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const result = await isHostPublicSlugAvailable({ slug });

  return NextResponse.json(result);
}
