"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { getPostLoginRedirectAction } from "@/app/actions/members";
import { CourtIllustration } from "@/components/public/court-illustration";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  Percent,
  QrCode,
  AlertCircle,
  Shield,
  KeyRound,
} from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPass) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await signIn.email({
        email: cleanEmail,
        password: loginPass,
      });

      if (res?.error) {
        setError(res.error.message || "Invalid email or password. Please verify your credentials.");
        setLoading(false);
        return;
      }

      // Resolve destination based on server-side role
      const destination = await getPostLoginRedirectAction(cleanEmail, redirectParam);

      // Full window navigation ensures cookies are committed to browser before server component render
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F6F5E1]">
      {/* LEFT HALF: Fresh Green Brand Panel (Desktop) */}
      <div className="lg:w-1/2 bg-[#5F9E4A] text-[#F6F5E1] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Ambient Top-Down Court Illustration */}
        <div className="absolute inset-0 pointer-events-none opacity-20 scale-125 translate-x-12 translate-y-12">
          <CourtIllustration allowExpandModal={false} />
        </div>

        {/* Top: Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-full border border-white/30 flex items-center justify-center font-bold text-xl select-none bg-white text-[#1B1B1B] shadow-sm transition-transform group-hover:scale-105">
              <span className="text-[#E8883A]">c</span>
              <span className="text-[#5F9E4A]">.</span>
            </div>
            <div>
              <span className="font-bold uppercase text-xl tracking-wider text-white block leading-none">
                THE CHAMPIONS CLUB
              </span>
              <span className="text-[10px] tracking-widest text-[#F6F5E1]/80 uppercase font-semibold">
                BENGALURU • PREMIER RACQUET SPORTS
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Headline & Benefits */}
        <div className="relative z-10 my-auto py-12 hidden lg:block space-y-8">
          <div className="text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.05]">
            welcome <span className="text-[#E8883A]">back to</span> the club.
          </div>

          <div className="space-y-4 pt-4 border-t border-white/20 text-sm text-white/90">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-[#F6F5E1]">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="font-medium">Book courts in seconds</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-[#F6F5E1]">
                <Percent className="h-4 w-4" />
              </div>
              <span className="font-medium">Member discounts applied automatically</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-[#F6F5E1]">
                <QrCode className="h-4 w-4" />
              </div>
              <span className="font-medium">Your QR card, always with you</span>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 hidden lg:block text-xs text-white/60 font-mono">
          EST. 2026 • CHAMPIONSHIP STANDARDS
        </div>
      </div>

      {/* RIGHT HALF: Soft Cream Form Container */}
      <div className="lg:w-1/2 flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-7">
          {/* Back to Home Link */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/70 hover:text-[#1B1B1B] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B1B1B]">
              Sign in to your account
            </h2>
            <p className="text-sm text-[#1B1B1B]/70">
              Enter your credentials to access your club profile or management console.
            </p>
          </div>

          {/* Server Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-12 px-4 rounded-xl bg-white border border-[#1B1B1B]/20 text-sm text-[#1B1B1B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9E4A] focus:border-[#5F9E4A] transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-4 pr-11 rounded-xl bg-white border border-[#1B1B1B]/20 text-sm text-[#1B1B1B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9E4A] focus:border-[#5F9E4A] transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-full font-bold text-sm tracking-wide bg-[#1B1B1B] hover:bg-black text-[#F6F5E1] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Quick Demo Credentials */}
            <div className="pt-3 border-t border-[#1B1B1B]/15">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 text-center">
                Quick Demo Fill
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill("owner@gmail.com", "Owner@123")}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-[#EDECCF] text-[#1B1B1B] text-[11px] font-semibold border border-[#1B1B1B]/20 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Shield className="h-3 w-3 text-[#5F9E4A]" /> Owner
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("staff1@gmail.com", "Staff1@123")}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-[#EDECCF] text-[#1B1B1B] text-[11px] font-semibold border border-[#1B1B1B]/20 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                >
                  <KeyRound className="h-3 w-3 text-blue-600" /> Staff 1
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("staff2@gmail.com", "Staff2@123")}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-[#EDECCF] text-[#1B1B1B] text-[11px] font-semibold border border-[#1B1B1B]/20 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                >
                  <KeyRound className="h-3 w-3 text-amber-600" /> Staff 2
                </button>
              </div>
            </div>

            {/* Link to Sign up */}
            <div className="text-center pt-3 text-xs text-[#1B1B1B]/70">
              New here?{" "}
              <Link href="/signup" className="text-[#5F9E4A] font-bold hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
