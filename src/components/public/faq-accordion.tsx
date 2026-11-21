"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "session-length",
    question: "How long is a court session and when do bookings start?",
    answer:
      "All court bookings are 60 minutes in length and start on every half hour (e.g. 6:00 am, 6:30 am, 7:00 am). The club is open daily from 6:00 am to 10:00 pm across all tennis, padel and badminton courts.",
  },
  {
    id: "max-daily",
    question: "How many court bookings can a member make per day?",
    answer:
      "Each member can hold or confirm a maximum of two court bookings per calendar day to ensure equitable access across all sports.",
  },
  {
    id: "member-discounts",
    question: "How do membership discounts work at checkout?",
    answer:
      "Discounts are tied directly to your active membership tier and applied automatically. Gold members receive 20% off courts, 15% off pro shop gear and 10% off bar orders. Silver members receive 10% off courts, 5% off pro shop and 5% off bar. Junior members receive 15% off courts once age-verified.",
  },
  {
    id: "junior-verification",
    question: "How does Junior plan age verification work?",
    answer:
      "Junior plans are exclusively for members under 18 years of age. After purchasing a Junior plan, present a valid school ID or birth certificate once at the front desk. Staff will verify your age and immediately activate your member rates.",
  },
  {
    id: "plan-changes",
    question: "How do membership upgrades and downgrades work?",
    answer:
      "Upgrades take effect immediately, applying pro-rata credit for your unused days. Downgrades are scheduled automatically to take effect at the conclusion of your current billing period so you retain full benefits until expiry.",
  },
  {
    id: "shop-delivery",
    question: "What fulfilment options are available for Pro Shop gear?",
    answer:
      "We offer clubhouse front desk pickup, courtside drop-off directly to your court while playing, and same-day home delivery across our local delivery radius—all synchronized with live club inventory.",
  },
];

export function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>("session-length"); // First open by default

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full divide-y divide-[#E6E6E6] border-y border-[#E6E6E6]">
      {FAQS.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div key={faq.id} className="py-5">
            <button
              type="button"
              onClick={() => handleToggle(faq.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${faq.id}`}
              className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none"
            >
              <span className="text-base sm:text-lg font-medium text-[#111111] pr-4 group-hover:text-[#1F4A33] transition-colors">
                {faq.question}
              </span>
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[#111111] transition-transform duration-200 ease-in-out ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                <ChevronDown className="w-5 h-5" />
              </span>
            </button>

            {isOpen && (
              <div
                id={`faq-answer-${faq.id}`}
                className="pt-3 pr-12 text-sm text-[#6B6B6B] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
