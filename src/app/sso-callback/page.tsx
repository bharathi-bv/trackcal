"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl="/app/dashboard"
      signInFallbackRedirectUrl="/app/dashboard"
      signUpForceRedirectUrl="/app/dashboard"
      signUpFallbackRedirectUrl="/app/dashboard"
      signInUrl="/login"
      signUpUrl="/signup"
    />
  );
}
