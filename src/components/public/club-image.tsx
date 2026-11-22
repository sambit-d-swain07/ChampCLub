"use client";

import { useState } from "react";
import Image from "next/image";

interface ClubImageProps {
  src: string;
  alt: string;
  sportName?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  quality?: number;
  className?: string;
}

export function ClubImage({
  src,
  alt,
  sportName,
  priority = false,
  fill = true,
  width,
  height,
  sizes,
  quality = 80,
  className = "",
}: ClubImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`w-full h-full bg-[#1F4A33] text-white flex items-center justify-center p-4 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="font-anton text-lg tracking-wider text-white/90 uppercase text-center">
          {sportName || alt}
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
        quality={quality}
        onError={() => setHasError(true)}
        className={className}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 500}
      priority={priority}
      sizes={sizes}
      quality={quality}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
