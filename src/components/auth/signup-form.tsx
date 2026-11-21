"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { signUpMemberAction } from "@/app/actions/members";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, ArrowRight, Loader2, Sparkles } from "lucide-react";

export function SignUpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signUpMemberAction(formData);

    if (!res.success) {
      setError(res.error || "Failed to create account.");
      setLoading(false);
      return;
    }

    // Auto sign-in and redirect to /member/choose-plan
    try {
      const signInRes = await signIn.email({
        email,
        password,
      });

      if (signInRes?.error) {
        router.push("/login");
        return;
      }

      router.push("/member/choose-plan");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rounded-3xl p-8 bg-[#0E4433] border border-white/10 shadow-2xl text-[#F4F1EA]">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex h-12 w-12 rounded-full bg-[#C8F13A] text-[#07271D] items-center justify-center shadow-lg mb-2">
          <Trophy className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-display uppercase tracking-wider text-[#F4F1EA]">
          CREATE <span className="font-serif italic lowercase text-[#C8F13A] font-normal">your</span> ACCOUNT
        </h1>
        <p className="text-xs text-[#F4F1EA]/70">
          Join The Champions Club. Enter your details to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-500/20 border border-red-500/40 text-red-200 rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-[#F4F1EA]/80">
            Full Name
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Rohan Bopanna"
            required
            disabled={loading}
            className="h-11 rounded-xl bg-[#07271D] border-white/15 text-[#F4F1EA] placeholder:text-[#F4F1EA]/30 focus:border-[#C8F13A]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-[#F4F1EA]/80">
            Phone Number
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+91 98765 43210"
            required
            disabled={loading}
            className="h-11 rounded-xl bg-[#07271D] border-white/15 text-[#F4F1EA] placeholder:text-[#F4F1EA]/30 focus:border-[#C8F13A]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#F4F1EA]/80">
            Email Address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="rohan@example.com"
            required
            disabled={loading}
            className="h-11 rounded-xl bg-[#07271D] border-white/15 text-[#F4F1EA] placeholder:text-[#F4F1EA]/30 focus:border-[#C8F13A]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[#F4F1EA]/80">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            required
            minLength={6}
            disabled={loading}
            className="h-11 rounded-xl bg-[#07271D] border-white/15 text-[#F4F1EA] placeholder:text-[#F4F1EA]/30 focus:border-[#C8F13A]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 h-12 rounded-full font-bold text-sm tracking-wide bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating profile...
            </>
          ) : (
            <>
              <span>Continue to Membership Plans</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <div className="text-center pt-4 border-t border-white/10 text-xs text-[#F4F1EA]/60">
          Already have an account?{" "}
          <Link href="/login" className="text-[#C8F13A] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
