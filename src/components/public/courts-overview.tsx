"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ClubImage } from "./club-image";

interface CourtsOverviewProps {
  courtCount: number;
  sports: string[];
  hours: string;
}

const SPORT_IMAGES: Record<string, { src: string; caption: string }> = {
  Tennis: { src: "/images/overview-tennis.webp", caption: "Outdoor & Indoor Tennis Courts" },
  Padel: { src: "/images/overview-padel.webp", caption: "Panoramic Glass Padel Courts" },
  Badminton: { src: "/images/overview-badminton.webp", caption: "BWF-Standard Badminton Courts" },
};

export function CourtsOverview({ courtCount, sports, hours }: CourtsOverviewProps) {
  const displaySports = sports.length > 0 ? sports : ["Tennis", "Padel", "Badminton"];
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? displaySports.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === displaySports.length - 1 ? 0 : prev + 1));
  };

  const currentSport = displaySports[currentIndex] || "Tennis";
  const imageInfo = SPORT_IMAGES[currentSport] || {
    src: `/images/overview-${currentSport.toLowerCase()}.webp`,
    caption: `${currentSport} Court`,
  };

  const sportsListString = displaySports.join(", ");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
      {/* Left Column: Facts, typography, and controls */}
      <div className="lg:col-span-5 flex flex-col justify-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
          PREMIUM SPACES
        </span>
        <h2 className="font-anton text-4xl sm:text-5xl lg:text-[56px] leading-none uppercase text-[#111111] mt-3 mb-6">
          COURTS OVERVIEW
        </h2>
        <p className="text-sm sm:text-base text-[#6B6B6B] leading-relaxed mb-8">
          The Champions Club features {courtCount} tournament-grade courts across {sportsListString}. All bookings are 60-minute sessions starting every 30 minutes. {hours}, with dedicated clubhouse amenities and coaching facilities.
        </p>

        {/* Carousel Arrow Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            aria-label="Previous sport"
            className="w-11 h-11 rounded-full bg-[#EFEFEF] hover:bg-[#E2E2E2] text-[#111111] flex items-center justify-center transition-colors cursor-pointer select-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next sport"
            className="w-11 h-11 rounded-full bg-[#1F4A33] hover:bg-[#163826] text-white flex items-center justify-center transition-colors cursor-pointer select-none shadow-sm"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Right Column: 16:10 Rounded Image Card with Caption */}
      <div className="lg:col-span-7">
        <div className="relative aspect-[16/10] w-full rounded-[20px] overflow-hidden bg-[#1F4A33] shadow-sm">
          <ClubImage
            key={currentSport}
            src={imageInfo.src}
            alt={`${currentSport} court at Champions Club`}
            sportName={currentSport}
            priority={false}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover transition-opacity duration-300 ease-in-out motion-reduce:transition-none"
          />
          {/* Subtle overlay & caption */}
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <span className="text-white text-xs font-semibold uppercase tracking-wider bg-black/40 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-white/20">
              {currentSport} · {imageInfo.caption}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
