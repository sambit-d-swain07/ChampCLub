"use client";

import React, { useState } from "react";
import { Maximize2, X } from "lucide-react";

interface CourtIllustrationProps {
  className?: string;
  allowExpandModal?: boolean;
}

export function CourtIllustration({
  className = "",
  allowExpandModal = true,
}: CourtIllustrationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const illustrationSvg = (
    <svg
      viewBox="0 0 800 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full object-cover select-none"
    >
      {/* 1. Base Green Turf */}
      <rect width="800" height="800" fill="#5F9E4A" />

      {/* 2. Soft Diagonal Mowing-Style Stripes (Flat colors only: #3F7A37 and #8DBF6F alternating) */}
      <g opacity="0.25">
        <polygon points="-200,-100 -120,-100 200,900 120,900" fill="#3F7A37" />
        <polygon points="-40,-100 40,-100 360,900 280,900" fill="#8DBF6F" />
        <polygon points="120,-100 200,-100 520,900 440,900" fill="#3F7A37" />
        <polygon points="280,-100 360,-100 680,900 600,900" fill="#8DBF6F" />
        <polygon points="440,-100 520,-100 840,900 760,900" fill="#3F7A37" />
        <polygon points="600,-100 680,-100 1000,900 920,900" fill="#8DBF6F" />
        <polygon points="760,-100 840,-100 1160,900 1080,900" fill="#3F7A37" />
      </g>

      {/* 3. Main Circular Green Playing Green */}
      <circle cx="560" cy="460" r="380" fill="#528D3F" />
      <circle cx="560" cy="460" r="350" fill="#5F9E4A" />

      {/* 4. Thin White Court Lines */}
      <g stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.95">
        {/* Outer Court Boundary Rectangle */}
        <rect x="290" y="160" width="450" height="520" rx="4" />

        {/* Singles Sidelines */}
        <line x1="340" y1="160" x2="340" y2="680" />
        <line x1="690" y1="160" x2="690" y2="680" />

        {/* Service Lines */}
        <line x1="340" y1="270" x2="690" y2="270" />
        <line x1="340" y1="570" x2="690" y2="570" />

        {/* Center Service Line */}
        <line x1="515" y1="270" x2="515" y2="570" />

        {/* Net Line & Posts */}
        <line x1="260" y1="420" x2="770" y2="420" strokeWidth="4" />
      </g>

      {/* Center Net Strap Marker */}
      <rect x="511" y="416" width="8" height="8" fill="#FFFFFF" />

      {/* 5. Big Soft Organic Cream Blob Shapes Cutting into Panel Edges */}
      {/* Top-left organic cut-out shape */}
      <path
        d="M -10 -10 
           L 180 -10 
           C 160 90, 240 130, 210 210 
           C 180 280, 110 270, 70 340 
           C 30 400, 60 480, -10 520 
           Z"
        fill="#EDECCF"
      />
      <path
        d="M -10 -10 
           L 150 -10 
           C 130 80, 210 110, 180 190 
           C 150 250, 90 240, 50 310 
           C 15 370, 40 440, -10 480 
           Z"
        fill="#F6F5E1"
      />

      {/* Bottom-left organic cut-out blob */}
      <path
        d="M -10 580 
           C 80 560, 130 630, 110 710 
           C 95 760, 140 790, 180 810 
           L -10 810 
           Z"
        fill="#EDECCF"
      />
      <path
        d="M -10 610 
           C 60 590, 100 650, 85 720 
           C 70 770, 110 795, 140 810 
           L -10 810 
           Z"
        fill="#F6F5E1"
      />

      {/* 6. Long Soft Cast Shadow for the Player and Racket */}
      {/* Diagonal flat dark shadow stretched to the left/bottom-left */}
      <g fill="#1B1B1B" fillOpacity="0.22" className="transition-transform duration-700">
        {/* Body and head shadow */}
        <ellipse cx="445" cy="510" rx="100" ry="24" transform="rotate(-38 445 510)" />
        {/* Arm and extended racket shadow */}
        <rect
          x="340"
          y="490"
          width="135"
          height="14"
          rx="7"
          transform="rotate(-38 340 490)"
        />
        <ellipse
          cx="330"
          cy="485"
          rx="32"
          ry="20"
          transform="rotate(-38 330 485)"
        />
      </g>

      {/* 7. Top-Down Player Figure */}
      <g transform="translate(485, 470)">
        {/* Torso / athletic polo shirt (Warm Orange #E8883A) */}
        <ellipse cx="0" cy="0" rx="30" ry="18" fill="#E8883A" transform="rotate(-15)" />

        {/* White collar / shoulder trim */}
        <path
          d="M -12 -12 Q 0 -6 12 -12 Q 0 -16 -12 -12"
          fill="#F6F5E1"
          transform="rotate(-15)"
        />

        {/* Head / cap from above */}
        <circle cx="0" cy="-2" r="14" fill="#1B1B1B" />
        {/* Sport visor / hair highlight */}
        <path d="M -8 -8 C -4 -16, 4 -16, 8 -8 Z" fill="#E8883A" />

        {/* Right arm extended with racket */}
        <path
          d="M 18 -4 L 46 -18"
          stroke="#E8883A"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Hand holding racket grip */}
        <circle cx="48" cy="-19" r="5" fill="#D97706" />

        {/* Racket shaft and head */}
        <line x1="48" y1="-19" x2="68" y2="-28" stroke="#1B1B1B" strokeWidth="4" />
        <ellipse
          cx="88"
          cy="-37"
          rx="22"
          ry="15"
          fill="#3F7A37"
          stroke="#1B1B1B"
          strokeWidth="3.5"
          transform="rotate(-25 88 -37)"
        />

        {/* Left arm balancing */}
        <path
          d="M -18 4 L -32 16"
          stroke="#E8883A"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>

      {/* 8. Small Ball with Tiny Contact Shadow */}
      <ellipse cx="618" cy="384" rx="7" ry="3.5" fill="#1B1B1B" fillOpacity="0.3" />
      <circle cx="616" cy="380" r="6" fill="#F6F5E1" stroke="#E8883A" strokeWidth="1.5" />

      {/* Target Pin / Court Flag Accent at far court edge */}
      <circle cx="680" cy="220" r="7" fill="#1B1B1B" fillOpacity="0.4" />
      <line x1="680" y1="220" x2="680" y2="160" stroke="#1B1B1B" strokeWidth="2" />
      <polygon points="680,160 705,172 680,184" fill="#E8883A" />
    </svg>
  );

  return (
    <>
      <div
        className={`relative w-full h-full min-h-[360px] sm:min-h-[460px] lg:min-h-full rounded-[24px] lg:rounded-[28px] overflow-hidden bg-[#5F9E4A] shadow-inner select-none ${className}`}
      >
        {illustrationSvg}

        {/* Small circular expand/fullscreen icon button in bottom-right corner */}
        <button
          type="button"
          onClick={() => allowExpandModal && setIsExpanded(true)}
          className="absolute bottom-4 right-4 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#F6F5E1]/75 hover:bg-[#F6F5E1] backdrop-blur-md border border-[#1B1B1B]/20 shadow-sm flex items-center justify-center text-[#1B1B1B] transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
          aria-label="View court illustration in full screen"
          title="Expand illustration"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Fullscreen Expand Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-[#1B1B1B]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] aspect-square rounded-[32px] overflow-hidden bg-[#5F9E4A] border-4 border-[#F6F5E1] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {illustrationSvg}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-[#F6F5E1] text-[#1B1B1B] border border-[#1B1B1B]/20 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
              aria-label="Close illustration modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
