"use client";

import { useState, useTransition } from "react";
import { createWebsiteLeadAction } from "@/app/actions/leads";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createWebsiteLeadAction(formData);
      if (!res.success) {
        setError(res.error || "Failed to submit message. Please try again.");
        return;
      }
      setSuccess(true);
      form.reset();
    });
  };

  if (success) {
    return (
      <div className="rounded-2xl p-6 bg-[#5F9E4A]/10 border border-[#5F9E4A]/30 text-[#1B1B1B] text-center space-y-2">
        <CheckCircle2 className="h-8 w-8 text-[#5F9E4A] mx-auto" />
        <h4 className="text-sm font-bold text-[#1B1B1B]">Inquiry Received</h4>
        <p className="text-xs text-gray-600">
          Thank you for reaching out. Our club concierge team will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/70 block mb-1">
          Full Name
        </label>
        <input
          name="name"
          type="text"
          placeholder="e.g. Sania Mirza"
          required
          disabled={isPending}
          className="w-full h-11 px-4 rounded-xl bg-white border border-[#1B1B1B]/20 text-xs text-[#1B1B1B] focus:border-[#5F9E4A] focus:outline-none focus:ring-1 focus:ring-[#5F9E4A]"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/70 block mb-1">
          Phone or Email
        </label>
        <input
          name="contact"
          type="text"
          placeholder="+91 98765 43210 or email"
          required
          disabled={isPending}
          className="w-full h-11 px-4 rounded-xl bg-white border border-[#1B1B1B]/20 text-xs text-[#1B1B1B] focus:border-[#5F9E4A] focus:outline-none focus:ring-1 focus:ring-[#5F9E4A]"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/70 block mb-1">
          Sport of Interest
        </label>
        <select
          name="sport"
          disabled={isPending}
          className="w-full h-11 px-4 rounded-xl bg-white border border-[#1B1B1B]/20 text-xs text-[#1B1B1B] focus:border-[#5F9E4A] focus:outline-none focus:ring-1 focus:ring-[#5F9E4A]"
        >
          <option value="TENNIS">Tennis (Championship Hardcourt)</option>
          <option value="PADEL">Padel (Panoramic Arena)</option>
          <option value="BADMINTON">Badminton (BWF Teakwood)</option>
          <option value="MEMBERSHIP">General Membership</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/70 block mb-1">
          Message / Requirement (Optional)
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Tell us about your preferred timings, skill level, or group size..."
          disabled={isPending}
          className="w-full p-3 rounded-xl bg-white border border-[#1B1B1B]/20 text-xs text-[#1B1B1B] focus:border-[#5F9E4A] focus:outline-none focus:ring-1 focus:ring-[#5F9E4A] resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-full font-bold text-xs uppercase tracking-wider bg-[#1B1B1B] text-[#F6F5E1] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Sending Inquiry...</span>
          </>
        ) : (
          <span>Submit Inquiry</span>
        )}
      </button>
    </form>
  );
}
