import React from "react";

interface CourtIllustrationProps {
  className?: string;
}

export function CourtIllustration({ className = "" }: CourtIllustrationProps) {
  return (
    <div
      className={`relative w-full aspect-[16/9] max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 select-none ${className}`}
      style={{ backgroundColor: "#6FB3E0" }}
    >
      <svg
        viewBox="0 0 1200 675"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover"
      >
        <defs>
          {/* Subtle noise/texture overlay filter */}
          <radialGradient
            id="courtGlow"
            cx="50%"
            cy="50%"
            r="60%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="#7CC0EB" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#5EA4D3" stopOpacity="0.2" />
          </radialGradient>

          {/* Soft blur for player shadows */}
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
        </defs>

        {/* Base Court Surface */}
        <rect width="1200" height="675" fill="#6FB3E0" />
        <rect width="1200" height="675" fill="url(#courtGlow)" />

        {/* Outer Court Line Margin */}
        <rect
          x="100"
          y="75"
          width="1000"
          height="525"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeOpacity="0.9"
        />

        {/* Singles Sidelines */}
        <line
          x1="100"
          y1="130"
          x2="1100"
          y2="130"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeOpacity="0.85"
        />
        <line
          x1="100"
          y1="545"
          x2="1100"
          y2="545"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeOpacity="0.85"
        />

        {/* Service Baselines */}
        <line
          x1="260"
          y1="130"
          x2="260"
          y2="545"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeOpacity="0.85"
        />
        <line
          x1="940"
          y1="130"
          x2="940"
          y2="545"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeOpacity="0.85"
        />

        {/* Center Service Line */}
        <line
          x1="260"
          y1="337.5"
          x2="940"
          y2="337.5"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeOpacity="0.85"
        />

        {/* Center Service Marks on Baselines */}
        <line
          x1="100"
          y1="337.5"
          x2="130"
          y2="337.5"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeOpacity="0.9"
        />
        <line
          x1="1070"
          y1="337.5"
          x2="1100"
          y2="337.5"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeOpacity="0.9"
        />

        {/* Tennis / Padel Net across center */}
        <line
          x1="600"
          y1="60"
          x2="600"
          y2="615"
          stroke="#1F4E6D"
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />
        <line
          x1="600"
          y1="65"
          x2="600"
          y2="610"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeDasharray="4 2"
          strokeOpacity="0.95"
        />

        {/* Net Posts */}
        <circle cx="600" cy="65" r="5" fill="#FFFFFF" />
        <circle cx="600" cy="610" r="5" fill="#FFFFFF" />

        {/* --- LONG SOFT SHADOWS (Approx 220° / afternoon cast shadow) --- */}
        <g filter="url(#softShadow)" fill="#1A4A69" fillOpacity="0.48">
          {/* Shadow from Player 1 (Top Left Near Baseline) */}
          <path d="M 230 240 L 45 420 Q 30 435 50 440 L 250 252 Z" />
          <ellipse cx="40" cy="430" rx="22" ry="14" transform="rotate(-40 40 430)" />
          {/* Shadow from racket */}
          <path d="M 260 230 L 110 370 L 125 385 L 275 245 Z" />

          {/* Shadow from Player 2 (Left Near Net) */}
          <path d="M 490 380 L 320 540 Q 305 555 330 560 L 510 395 Z" />
          <ellipse cx="315" cy="550" rx="20" ry="12" transform="rotate(-40 315 550)" />

          {/* Shadow from Player 3 (Right Service Box) */}
          <path d="M 720 280 L 530 460 Q 515 475 540 480 L 740 295 Z" />
          <ellipse cx="525" cy="470" rx="22" ry="13" transform="rotate(-40 525 470)" />
          <path d="M 750 265 L 590 415 L 605 428 L 765 278 Z" />

          {/* Shadow from Player 4 (Right Baseline Deep) */}
          <path d="M 980 430 L 800 600 Q 785 615 810 618 L 1000 442 Z" />
          <ellipse cx="795" cy="610" rx="24" ry="14" transform="rotate(-40 795 610)" />

          {/* Tennis ball shadow */}
          <ellipse cx="585" cy="385" rx="10" ry="6" fillOpacity="0.55" />
        </g>

        {/* --- PLAYERS (Top-down figures with vibrant sportswear) --- */}
        {/* Player 1 (Yellow kit, receiver on left) */}
        <g id="player1">
          {/* Racket */}
          <ellipse cx="265" cy="235" rx="12" ry="7" fill="none" stroke="#F4F1EA" strokeWidth="2" transform="rotate(30 265 235)" />
          <line x1="255" y1="240" x2="245" y2="246" stroke="#F4F1EA" strokeWidth="2" />
          {/* Torso / Arms */}
          <path d="M 224 235 Q 235 230 248 238 Q 242 254 228 250 Z" fill="#FACC15" />
          {/* Head */}
          <circle cx="236" cy="242" r="7" fill="#2E1C14" />
        </g>

        {/* Player 2 (White/Lime kit, left net player) */}
        <g id="player2">
          {/* Torso / Arms */}
          <path d="M 488 375 Q 502 368 514 380 Q 504 394 492 388 Z" fill="#F4F1EA" />
          {/* Head */}
          <circle cx="501" cy="381" r="7.5" fill="#382319" />
          {/* Lime shorts accent */}
          <ellipse cx="496" cy="388" rx="7" ry="4" fill="#C8F13A" />
        </g>

        {/* Player 3 (Dark Teal kit, right server) */}
        <g id="player3">
          {/* Racket extended overhead */}
          <ellipse cx="760" cy="265" rx="13" ry="8" fill="none" stroke="#C8F13A" strokeWidth="2" transform="rotate(-25 760 265)" />
          <line x1="748" y1="272" x2="736" y2="278" stroke="#F4F1EA" strokeWidth="2" />
          {/* Torso / Arms */}
          <path d="M 718 275 Q 730 268 742 277 Q 734 293 722 288 Z" fill="#07271D" stroke="#C8F13A" strokeWidth="1" />
          {/* Head */}
          <circle cx="730" cy="282" r="7" fill="#1C1917" />
        </g>

        {/* Player 4 (Coral kit, right backcourt player) */}
        <g id="player4">
          {/* Racket */}
          <ellipse cx="1005" cy="425" rx="12" ry="7" fill="none" stroke="#FFFFFF" strokeWidth="2" transform="rotate(45 1005 425)" />
          <line x1="995" y1="432" x2="985" y2="438" stroke="#FFFFFF" strokeWidth="2" />
          {/* Torso */}
          <path d="M 975 426 Q 988 418 1000 429 Q 992 445 978 440 Z" fill="#FB923C" />
          {/* Head */}
          <circle cx="987" cy="433" r="7.5" fill="#292524" />
        </g>

        {/* Tennis Ball */}
        <circle cx="615" cy="330" r="4.5" fill="#C8F13A" stroke="#FFFFFF" strokeWidth="0.8" />

        {/* Minimal Corner Stamp */}
        <text
          x="1080"
          y="635"
          fill="#FFFFFF"
          fillOpacity="0.4"
          fontSize="11"
          fontFamily="monospace"
          textAnchor="end"
          letterSpacing="2"
        >
          COURT 01 • PRO ACRYLIC
        </text>
      </svg>
    </div>
  );
}
