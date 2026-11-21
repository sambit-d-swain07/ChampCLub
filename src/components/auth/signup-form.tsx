"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { signIn } from "@/lib/auth-client";
import { signUpMemberAction } from "@/app/actions/members";
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
} from "lucide-react";

const clientSignUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().min(8, "Valid phone number required (at least 8 digits)"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormErrors = Partial<Record<"name" | "phone" | "email" | "password" | "confirmPassword", string>>;

export function SignUpForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on edit
    if (fieldErrors[name as keyof FormErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    // 1. Client-side Zod validation
    const result = clientSignUpSchema.safeParse(formData);
    if (!result.success) {
      const errors: FormErrors = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as keyof FormErrors;
        if (!errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    // 2. Submit to Server Action
    const payload = new FormData();
    payload.set("name", formData.name.trim());
    payload.set("phone", formData.phone.trim());
    const cleanEmail = formData.email.trim().toLowerCase();
    payload.set("email", cleanEmail);
    payload.set("password", formData.password);

    const res = await signUpMemberAction(payload);

    if (!res.success) {
      setServerError(res.error || "Failed to create account. Please try again.");
      setLoading(false);
      return;
    }

    // 3. Auto sign in and redirect to /member/choose-plan
    try {
      const signInRes = await signIn.email({
        email: cleanEmail,
        password: formData.password,
      });

      if (signInRes?.error) {
        window.location.href = "/login";
        return;
      }

      window.location.href = "/member/choose-plan";
    } catch {
      window.location.href = "/login";
    }
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

        {/* Middle: Headline & 3 Benefit Lines (Desktop only) */}
        <div className="relative z-10 my-auto py-12 hidden lg:block space-y-8">
          <h1 className="text-6xl xl:text-7xl font-display uppercase tracking-tight text-[#F4F1EA] leading-[0.95]">
            JOIN <span className="font-serif italic lowercase text-[#C8F13A] font-normal">the</span> CHAMPIONS
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
              Create your account
            </h2>
            <p className="text-sm text-gray-600">
              Enter your details to register as a Champions Club member.
            </p>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label
                htmlFor="name"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                disabled={loading}
                value={formData.name}
                onChange={handleChange}
                className={`w-full h-12 px-4 rounded-xl bg-white border text-sm text-[#07271D] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8F13A] focus:border-[#0B3B2C] transition-all shadow-sm ${
                  fieldErrors.name ? "border-red-500" : "border-gray-300"
                }`}
              />
              {fieldErrors.name && (
                <span className="block text-xs text-red-600 font-medium">{fieldErrors.name}</span>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label
                htmlFor="phone"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700"
              >
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                disabled={loading}
                value={formData.phone}
                onChange={handleChange}
                className={`w-full h-12 px-4 rounded-xl bg-white border text-sm text-[#07271D] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8F13A] focus:border-[#0B3B2C] transition-all shadow-sm ${
                  fieldErrors.phone ? "border-red-500" : "border-gray-300"
                }`}
              />
              {fieldErrors.phone && (
                <span className="block text-xs text-red-600 font-medium">{fieldErrors.phone}</span>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
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
                required
                disabled={loading}
                value={formData.email}
                onChange={handleChange}
                className={`w-full h-12 px-4 rounded-xl bg-white border text-sm text-[#07271D] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8F13A] focus:border-[#0B3B2C] transition-all shadow-sm ${
                  fieldErrors.email ? "border-red-500" : "border-gray-300"
                }`}
              />
              {fieldErrors.email && (
                <span className="block text-xs text-red-600 font-medium">{fieldErrors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-700"
                >
                  Password
                </label>
                <span className="text-[11px] text-gray-500">At least 6 characters</span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full h-12 pl-4 pr-11 rounded-xl bg-white border text-sm text-[#07271D] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8F13A] focus:border-[#0B3B2C] transition-all shadow-sm ${
                    fieldErrors.password ? "border-red-500" : "border-gray-300"
                  }`}
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
              {fieldErrors.password && (
                <span className="block text-xs text-red-600 font-medium">{fieldErrors.password}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full h-12 pl-4 pr-11 rounded-xl bg-white border text-sm text-[#07271D] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8F13A] focus:border-[#0B3B2C] transition-all shadow-sm ${
                    fieldErrors.confirmPassword ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span className="block text-xs text-red-600 font-medium">{fieldErrors.confirmPassword}</span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-3 rounded-full font-bold text-sm tracking-wide bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating profile...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Choose Plan</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Link to Sign in */}
            <div className="text-center pt-4 border-t border-gray-200 text-xs text-gray-600">
              Already a member?{" "}
              <Link href="/login" className="text-[#0B3B2C] font-bold hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
