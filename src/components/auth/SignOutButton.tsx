"use client";

import { useClerk } from "@clerk/nextjs";

export default function SignOutButton() {
  const { signOut } = useClerk();

  return (
    <button
      className="tc-btn tc-btn--ghost tc-btn--sm"
      onClick={() => signOut({ redirectUrl: "/login" })}
    >
      Sign out
    </button>
  );
}
