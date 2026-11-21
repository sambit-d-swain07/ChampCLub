"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { getPostLoginRedirectAction } from "@/app/actions/members";
import { CourtIllustration } from "@/components/public/court-illustration";
import {
  Trophy,
  ArrowLeft,
  ArrowRight,
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F1EA]">
      {/* LEFT HALF: Deep Green Brand Panel (Desktop) / Compact Header (Mobile) */}
      <div className="lg:w-1/2 bg-[#0B3B2C] text-[#F4F1EA] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Subtle Ambient Background: Original Court Illustration */}
        <div className="absolute inset-0 pointer-events-none opacity-15 scale-125 translate-x-12 translate-y-12">
          <CourtIllustration />
        </div>

        {/* Top: Logo & Name */}
        <div className="relative z-10 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-full bg-[#C8F13A] text-[#07271D] flex items-center justify-center font-bold shadow-md transition-transform group-hover:scale-105">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display uppercase text-2xl tracking-wider text-[#F4F1EA] block leading-none">
                THE CHAMPIONS CLUB
              </span>
              <span className="text-[10px] tracking-widest text-[#C8F13A] uppercase font-semibold">
                BENGALURU • PREMIER RACQUET SPORTS
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Condensed Headline & 3 Benefit Lines (Desktop only) */}
        <div className="relative z-10 my-auto py-12 hidden lg:block space-y-8">
          <h1 className="text-6xl xl:text-7xl font-display uppercase tracking-tight text-[#F4F1EA] leading-[0.95]">
            WELCOME <span className="font-serif italic lowercase text-[#C8F13A] font-normal">back to</span> THE CLUB
          </h1>

          <div className="space-y-4 pt-4 border-t border-white/10 text-sm text-[#F4F1EA]/85">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-[#C8F13A]">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="font-medium">Book courts in seconds</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-[#C8F13A]">
                <Percent className="h-4 w-4" />
              </div>
              <span className="font-medium">Member discounts applied automatically</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-[#C8F13A]">
                <QrCode className="h-4 w-4" />
              </div>
              <span className="font-medium">Your QR card, always with you</span>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 hidden lg:block text-xs text-[#F4F1EA]/50 font-mono">
          EST. 2026 • CHAMPIONSHIP STANDARDS
        </div>
      </div>

      {/* RIGHT HALF: Off-white Form Container */}
      <div className="lg:w-1/2 flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-7">
          {/* Back to Home Link */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B3B2C]/70 hover:text-[#0B3B2C] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#07271D]">
              Sign in to your account
            </h2>
            <p className="text-sm text-gray-600">
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
                className="block text-xs font-bold uppercase tracking-wider text-gray-700"
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
                className="w-full h-12 px-4 rounded-xl bg-white border border-gray-300 text-sm text-[#07271D] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8F13A] focus:border-[#0B3B2C] transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700"
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
                  className="w-full h-12 pl-4 pr-11 rounded-xl bg-white border border-gray-300 text-sm text-[#07271D] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8F13A] focus:border-[#0B3B2C] transition-all shadow-sm"
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
              className="w-full h-12 mt-2 rounded-full font-bold text-sm tracking-wide bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
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
            <div className="pt-3 border-t border-gray-200">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 text-center">
                Quick Demo Fill
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill("owner@gmail.com", "Owner@123")}
                  className="py-1.5 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#07271D] text-[11px] font-semibold border border-gray-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Shield className="h-3 w-3 text-[#0B3B2C]" /> Owner
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("staff1@gmail.com", "Staff1@123")}
                  className="py-1.5 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#07271D] text-[11px] font-semibold border border-gray-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <KeyRound className="h-3 w-3 text-blue-600" /> Staff 1
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("staff2@gmail.com", "Staff2@123")}
                  className="py-1.5 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#07271D] text-[11px] font-semibold border border-gray-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <KeyRound className="h-3 w-3 text-amber-600" /> Staff 2
                </button>
              </div>
            </div>

            {/* Link to Sign up */}
            <div className="text-center pt-3 text-xs text-gray-600">
              New here?{" "}
              <Link href="/signup" className="text-[#0B3B2C] font-bold hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
