import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | The Champions Club",
  description: "Sign in to access your Champions Club member profile or administrative console.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F1EA]" />}>
      <LoginForm />
    </Suspense>
  );
}
