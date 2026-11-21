"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { signIn } from "@/lib/auth-client";
import { signUpMemberAction } from "@/app/actions/members";
import { ClubImage } from "@/components/public/club-image";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Helper to calculate age from YYYY-MM-DD
function getAgeFromDob(dobString: string): number | null {
  if (!dobString) return null;
  const parts = dobString.split("-");
  if (parts.length !== 3) return null;
  const birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Client-side Zod Schema
const signUpSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    phone: z.string().min(10, "Valid 10-digit phone number required"),
    email: z.string().email("Enter a valid email address"),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required")
      .refine((val) => {
        const parts = val.split("-");
        if (parts.length !== 3) return false;
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return !isNaN(d.getTime()) && d <= new Date();
      }, { message: "Date of birth cannot be in the future" })
      .refine((val) => {
        const age = getAgeFromDob(val);
        return age !== null && age >= 5;
      }, { message: "Must be at least 5 years old to join" })
      .refine((val) => {
        const age = getAgeFromDob(val);
        return age !== null && age <= 100;
      }, { message: "Age cannot exceed 100 years" }),
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
    if (errors[name as keyof SignUpFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

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
    <div className="min-h-screen bg-white text-[#111111] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl bg-white border border-[#E6E6E6] rounded-[20px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-sm">
        {/* LEFT COLUMN: Rounded Image Card with "JOIN THE CHAMPIONS CLUB" in Anton */}
        <div className="lg:col-span-5 relative m-3 rounded-[20px] overflow-hidden bg-[#1F4A33] text-white p-8 sm:p-10 flex flex-col justify-between min-h-[320px] lg:min-h-[640px]">
          <ClubImage
            src="/images/court-tennis-2.jpg"
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
              Create your member account to access tournament courts, automated pricing discounts and member-only services.
            </p>
          </div>

          {/* Footer note */}
          <div className="relative z-20 text-[11px] font-mono text-white/60 uppercase tracking-widest">
            EST. 2026 · INDIRANAGAR
          </div>
        </div>

        {/* RIGHT COLUMN: Form in Inter */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-5">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] transition-colors uppercase tracking-wider mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </Link>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">
                Create member account
              </h2>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1">
                Enter your details to join The Champions Club.
              </p>
            </div>

            {serverError && (
              <div className="p-3.5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  disabled={submitting}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className={`w-full h-11 px-4 rounded-[14px] bg-white border text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] transition-all ${
                    errors.name ? "border-red-400" : "border-[#E6E6E6]"
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 font-medium">{errors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label
                  htmlFor="phone"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  disabled={submitting}
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className={`w-full h-11 px-4 rounded-[14px] bg-white border text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] transition-all ${
                    errors.phone ? "border-red-400" : "border-[#E6E6E6]"
                  }`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-600 font-medium">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
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
                  disabled={submitting}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`w-full h-11 px-4 rounded-[14px] bg-white border text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] transition-all ${
                    errors.email ? "border-red-400" : "border-[#E6E6E6]"
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-red-600 font-medium">{errors.email}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <label
                  htmlFor="dateOfBirth"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]"
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
                  min={(() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() - 100);
                    return d.toISOString().split("T")[0];
                  })()}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full h-11 px-4 rounded-[14px] bg-white border text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] transition-all ${
                    errors.dateOfBirth ? "border-red-400" : "border-[#E6E6E6]"
                  }`}
                />
                {errors.dateOfBirth && (
                  <p className="text-xs text-red-600 font-medium">{errors.dateOfBirth}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    disabled={submitting}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className={`w-full h-11 px-4 pr-11 rounded-[14px] bg-white border text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] transition-all ${
                      errors.password ? "border-red-400" : "border-[#E6E6E6]"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#111111] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 font-medium">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    disabled={submitting}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className={`w-full h-11 px-4 pr-11 rounded-[14px] bg-white border text-sm text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] transition-all ${
                      errors.confirmPassword ? "border-red-400" : "border-[#E6E6E6]"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#111111] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 font-medium">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 mt-2 rounded-full bg-[#1F4A33] hover:bg-[#163826] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-[#6B6B6B]">
              Already a member?{" "}
              <Link href="/login" className="font-semibold text-[#1F4A33] hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
