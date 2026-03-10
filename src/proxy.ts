import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtected = createRouteMatcher(["/app(.*)"]);
const isAuth = createRouteMatcher(["/login", "/signup"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (isProtected(req) && !userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isAuth(req) && userId) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }
});

export const config = {
  // Exclude Next.js internals, static files. Keep API routes (except webhooks) protected.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/(?!webhooks)).*)"],
};
