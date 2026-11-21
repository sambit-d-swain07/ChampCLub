import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign Up | The Champions Club",
  description: "Register for your Champions Club member profile and access exclusive court privileges.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
