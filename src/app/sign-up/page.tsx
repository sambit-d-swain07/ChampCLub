import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign Up · Champions Club",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignUpForm />
    </Suspense>
  );
}
