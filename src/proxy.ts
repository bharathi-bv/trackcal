/**
 * middleware.ts
 *
 * Runs on every request BEFORE the page renders. Two jobs:
 * 1. Refresh the Supabase session cookie so it doesn't expire mid-visit
 * 2. Protect routes — redirect unauthenticated users away from /dashboard
 *
 * IMPORTANT: createServerClient here uses request.cookies (not next/headers cookies())
 * because middleware runs before the request context is fully set up.
 *
 * Matcher excludes: static files, images, API routes, and /book (public booking page).
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  // We need to mutate the response to set refreshed session cookies,
  // so we build supabaseResponse inside setAll instead of upfront.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on both the request (for downstream middleware) and
          // the response (so the browser receives updated session tokens)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Calling getUser() also refreshes the session if it's expired.
  // Do NOT add any code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Unauthenticated user trying to reach /dashboard → login
  if (path.startsWith("/app/") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated user visiting login/signup → send to dashboard
  if ((path === "/login" || path === "/signup") && user) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // Exclude: Next.js internals, static files, API routes, and public pages (/book, /embed)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|book|embed).*)"],
};
