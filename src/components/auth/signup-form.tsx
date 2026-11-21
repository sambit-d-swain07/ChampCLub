"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { signIn } from "@/lib/auth-client";
import { signUpMemberAction } from "@/app/actions/members";
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
  CheckCircle2,
} from "lucide-react";

// Client-side Zod Schema
const signUpSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    phone: z.string().min(10, "Valid 10-digit phone number required"),
    email: z.string().email("Enter a valid email address"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;
type FormErrors = Partial<Record<keyof SignUpFormData, string>>;

export function SignUpForm() {
  const [formData, setFormData] = useState<SignUpFormData>({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (errors[name as keyof SignUpFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    // 1. Client-side Zod Validation
    const validation = signUpSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as keyof SignUpFormData;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    // 2. Submit to Server Action (creates User + Member with MEMBER role)
    const payload = new FormData();
    payload.set("name", formData.name.trim());
    payload.set("phone", formData.phone.trim());
    const cleanEmail = formData.email.trim().toLowerCase();
    payload.set("email", cleanEmail);
    payload.set("dateOfBirth", formData.dateOfBirth);
    payload.set("password", formData.password);

    const res = await signUpMemberAction(payload);

    if (!res.success) {
      setServerError(res.error || "Unable to register your account. Please try again.");
      setSubmitting(false);
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F6F5E1]">
      {/* LEFT HALF: Fresh Green Brand Panel (Desktop) */}
      <div className="lg:w-1/2 bg-[#5F9E4A] text-[#F6F5E1] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Subtle Ambient Background: Original Court Illustration */}
        <div className="absolute inset-0 pointer-events-none opacity-20 scale-125 translate-x-12 translate-y-12">
          <CourtIllustration allowExpandModal={false} />
        </div>

        {/* Top: Logo & Name */}
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

        {/* Middle: Headline & 3 Benefit Lines (Desktop only) */}
        <div className="relative z-10 my-auto py-12 hidden lg:block space-y-8">
          <div className="text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.05]">
            join <span className="text-[#E8883A]">the</span> champions club.
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
        <div className="w-full max-w-md space-y-6">
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
              Create member account
            </h2>
            <p className="text-sm text-[#1B1B1B]/70">
              Join The Champions Club to access courts, select memberships, and member rates.
            </p>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
              <label
                htmlFor="name"
                className="block text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                disabled={submitting}
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Sania Mirza"
                className={`w-full h-11 px-4 rounded-xl bg-white border text-sm text-[#1B1B1B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9E4A] transition-all shadow-2xs ${
                  errors.name
                    ? "border-red-400 focus:border-red-500"
                    : "border-[#1B1B1B]/20 focus:border-[#5F9E4A]"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-red-600 font-medium pl-1">{errors.name}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label
                htmlFor="phone"
                className="block text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80"
              >
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                disabled={submitting}
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className={`w-full h-11 px-4 rounded-xl bg-white border text-sm text-[#1B1B1B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9E4A] transition-all shadow-2xs ${
                  errors.phone
                    ? "border-red-400 focus:border-red-500"
                    : "border-[#1B1B1B]/20 focus:border-[#5F9E4A]"
                }`}
              />
              {errors.phone && (
                <p className="text-xs text-red-600 font-medium pl-1">{errors.phone}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-1">
              <label
                htmlFor="dateOfBirth"
                className="block text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80"
              >
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                required
                disabled={submitting}
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className={`w-full h-11 px-4 rounded-xl bg-white border text-sm text-[#1B1B1B] focus:outline-none focus:ring-2 focus:ring-[#5F9E4A] transition-all shadow-2xs ${
                  errors.dateOfBirth
                    ? "border-red-400 focus:border-red-500"
                    : "border-[#1B1B1B]/20 focus:border-[#5F9E4A]"
                }`}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-red-600 font-medium pl-1">{errors.dateOfBirth}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1">
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
                disabled={submitting}
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className={`w-full h-11 px-4 rounded-xl bg-white border text-sm text-[#1B1B1B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9E4A] transition-all shadow-2xs ${
                  errors.email
                    ? "border-red-400 focus:border-red-500"
                    : "border-[#1B1B1B]/20 focus:border-[#5F9E4A]"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-600 font-medium pl-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
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
                  autoComplete="new-password"
                  required
                  disabled={submitting}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  className={`w-full h-11 pl-4 pr-11 rounded-xl bg-white border text-sm text-[#1B1B1B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9E4A] transition-all shadow-2xs ${
                    errors.password
                      ? "border-red-400 focus:border-red-500"
                      : "border-[#1B1B1B]/20 focus:border-[#5F9E4A]"
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
              {errors.password && (
                <p className="text-xs text-red-600 font-medium pl-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80"
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
                  disabled={submitting}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`w-full h-11 pl-4 pr-11 rounded-xl bg-white border text-sm text-[#1B1B1B] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9E4A] transition-all shadow-2xs ${
                    errors.confirmPassword
                      ? "border-red-400 focus:border-red-500"
                      : "border-[#1B1B1B]/20 focus:border-[#5F9E4A]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600 font-medium pl-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Password Hint */}
            <p className="text-[11px] text-gray-500 pl-1">
              Must be at least 8 characters long.
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 mt-2 rounded-full font-bold text-sm tracking-wide bg-[#1B1B1B] hover:bg-black text-[#F6F5E1] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Link to Sign in */}
            <div className="text-center pt-3 border-t border-[#1B1B1B]/15 text-xs text-[#1B1B1B]/70">
              Already a member?{" "}
              <Link href="/login" className="text-[#5F9E4A] font-bold hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
