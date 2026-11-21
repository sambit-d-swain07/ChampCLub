"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, signOut } from "@/lib/auth-client";
import { checkUserBanAction } from "@/app/actions/members";
import { ClubImage } from "@/components/public/club-image";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || searchParams.get("next");
  const isBannedParam = searchParams.get("banned") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    isBannedParam
      ? "This account has been banned. If you think this is a mistake, please contact the club."
      : null
  );

  useEffect(() => {
    if (isBannedParam) {
      setError("This account has been banned. If you think this is a mistake, please contact the club.");
    }
  }, [isBannedParam]);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPass) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let destination = "/member";
      if (cleanEmail === "owner@gmail.com") {
        destination = "/admin/owner";
      } else if (cleanEmail.startsWith("staff")) {
        destination = "/admin/members";
      } else if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("/login")) {
        destination = redirectParam;
      }

      const res = await signIn.email({
        email: cleanEmail,
        password: loginPass,
        callbackURL: destination,
      });

      if (res?.error) {
        setError(res.error.message || "Invalid email or password. Please verify your credentials.");
        setLoading(false);
        return;
      }

      const banCheck = await checkUserBanAction(cleanEmail);
      if (banCheck.banned) {
        await signOut().catch(() => {});
        setError("This account has been banned. If you think this is a mistake, please contact the club.");
        setLoading(false);
        return;
      }

      const returnedUser = (res?.data as any)?.user;
      if (returnedUser?.role === "OWNER") {
        destination = "/admin/owner";
      } else if (returnedUser?.role === "STAFF") {
        destination = "/admin/members";
      } else if (!redirectParam && returnedUser?.role === "MEMBER") {
        destination = "/member";
      }

      window.location.href = destination;
    } catch {
      setError("An unexpected error occurred during sign in. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const quickFill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl bg-white border border-[#E6E6E6] rounded-[20px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-sm">
        {/* LEFT COLUMN: Rounded Image Card with "JOIN THE CHAMPIONS CLUB" in Anton */}
        <div className="lg:col-span-5 relative m-3 rounded-[20px] overflow-hidden bg-[#1F4A33] text-white p-8 sm:p-10 flex flex-col justify-between min-h-[320px] lg:min-h-[580px]">
          <ClubImage
            src="/images/court-tennis-1.jpg"
            alt="Champions Club Court"
            sportName="JOIN THE CHAMPIONS CLUB"
            priority={true}
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 z-10" />

          {/* Top Label */}
          <div className="relative z-20">
            <Link
              href="/"
              className="font-anton text-lg uppercase tracking-normal text-white hover:opacity-85 transition-opacity inline-block"
            >
              CHAMPIONS CLUB
            </Link>
          </div>

          {/* Heading in Anton */}
          <div className="relative z-20 my-auto py-8">
            <h1 className="font-anton text-4xl sm:text-5xl uppercase leading-none text-white tracking-normal">
              JOIN THE CHAMPIONS CLUB
            </h1>
            <p className="mt-4 text-xs sm:text-sm text-white/85 leading-relaxed">
              Book championship courts, enjoy automated member discounts and connect with premier racquet sports.
            </p>
          </div>

          {/* Footer note */}
          <div className="relative z-20 text-[11px] font-mono text-white/60 uppercase tracking-widest">
            EST. 2026 · INDIRANAGAR
          </div>
        </div>

        {/* RIGHT COLUMN: Form in Inter */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-6">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] transition-colors uppercase tracking-wider mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </Link>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">
                Sign in
              </h2>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1">
                Enter your credentials to access your member account.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 px-4 rounded-[14px] bg-white border border-[#E6E6E6] text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-11 px-4 pr-11 rounded-[14px] bg-white border border-[#E6E6E6] text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#111111] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-[#1F4A33] hover:bg-[#163826] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-[#6B6B6B]">
              Don&apos;t have an account yet?{" "}
              <Link href="/signup" className="font-semibold text-[#1F4A33] hover:underline">
                Become a member
              </Link>
            </div>

            {/* Quick Fill Test Bar (clean & compact) */}
            <div className="pt-4 border-t border-[#E6E6E6]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B] block mb-2">
                Quick Sign-in:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quickFill("owner@gmail.com", "Admin@123")}
                  className="px-3 py-1 rounded-full border border-[#E6E6E6] text-[11px] font-medium text-[#111111] hover:bg-[#EFEFEF] transition-colors cursor-pointer"
                >
                  Owner
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("staff1@gmail.com", "Admin@123")}
                  className="px-3 py-1 rounded-full border border-[#E6E6E6] text-[11px] font-medium text-[#111111] hover:bg-[#EFEFEF] transition-colors cursor-pointer"
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("shubh@gmail.com", "Shubh@123")}
                  className="px-3 py-1 rounded-full border border-[#E6E6E6] text-[11px] font-medium text-[#111111] hover:bg-[#EFEFEF] transition-colors cursor-pointer"
                >
                  Member
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
