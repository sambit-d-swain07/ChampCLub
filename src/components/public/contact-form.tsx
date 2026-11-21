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
      <div className="rounded-2xl p-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-center space-y-2">
        <CheckCircle2 className="h-8 w-8 text-[#C8F13A] mx-auto" />
        <h4 className="text-sm font-bold text-[#F4F1EA]">Inquiry Received</h4>
        <p className="text-xs text-[#F4F1EA]/70">
          Thank you for reaching out. Our club concierge team will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#F4F1EA]/70 block mb-1">
          Full Name
        </label>
        <input
          name="name"
          type="text"
          placeholder="e.g. Sania Mirza"
          required
          disabled={isPending}
          className="w-full h-11 px-4 rounded-xl bg-[#07271D] border border-white/15 text-xs text-[#F4F1EA] focus:border-[#C8F13A] focus:outline-none"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#F4F1EA]/70 block mb-1">
          Phone or Email
        </label>
        <input
          name="contact"
          type="text"
          placeholder="+91 98765 43210 or email"
          required
          disabled={isPending}
          className="w-full h-11 px-4 rounded-xl bg-[#07271D] border border-white/15 text-xs text-[#F4F1EA] focus:border-[#C8F13A] focus:outline-none"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#F4F1EA]/70 block mb-1">
          Sport of Interest
        </label>
        <select
          name="sport"
          disabled={isPending}
          className="w-full h-11 px-4 rounded-xl bg-[#07271D] border border-white/15 text-xs text-[#F4F1EA] focus:border-[#C8F13A] focus:outline-none"
        >
          <option value="TENNIS">Tennis Championship Courts</option>
          <option value="PADEL">Panoramic Padel Arena</option>
          <option value="BADMINTON">Elite Badminton Hall</option>
          <option value="ALL">All Sports / Club Membership Inquiry</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#F4F1EA]/70 block mb-1">
          Message or Inquiry (Optional)
        </label>
        <input
          name="message"
          type="text"
          placeholder="e.g. Inquiring about junior coaching or corporate tournament booking"
          disabled={isPending}
          className="w-full h-11 px-4 rounded-xl bg-[#07271D] border border-white/15 text-xs text-[#F4F1EA] focus:border-[#C8F13A] focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-full font-bold text-xs uppercase tracking-wider bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all shadow-md mt-2 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Connect with Concierge"
        )}
      </button>
    </form>
  );
}
