/**
 * GET /auth/signout
 *
 * Redirects to /login.
 *
 * Used as a plain <a href="/auth/signout"> link from the member portal
 * where a client-side SignOutButton isn't available.
 */

import { NextRequest, NextResponse } from "next/server";

// Client components use useClerk().signOut() directly.
// This route is kept as a fallback for plain <a href> links.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}
