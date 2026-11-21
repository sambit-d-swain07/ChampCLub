import { SignUpForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#0B3B2C] relative">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-semibold text-[#F4F1EA]/70 hover:text-[#C8F13A] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      <SignUpForm />
    </div>
  );
}
