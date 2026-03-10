"use client";

import * as React from "react";
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)",
      }}
    >
      <SignUp />
    </div>
  );
}
