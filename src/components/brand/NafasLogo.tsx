'use client';

import React, { useState } from 'react';
import { getAssetUrl } from '@/lib/basePath';

export interface NafasLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'badge' | 'monochrome' | 'emblem';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  useTransparent?: boolean;
}

/**
 * Official NAFAS Logo (شعار نَفَس الرسمي — للبيئة الاجتماعية)
 * 
 * Authoritative artwork supplied directly by the initiative.
 * Contains:
 * 1. Warm Cream circular base (#F7F1E7 / nafasCreamBase)
 * 2. Walnut brown framing ring (#6B463B / nafasWalnutRing)
 * 3. Five stylized community figures (community-figure) forming civic solidarity
 * 4. Central Mesopotamian Purple Orchid flower
 * 5. Authentic Arabic typography "نَفَس"
 * 6. Official subtitle "للبيئة الاجتماعية"
 */
export const NafasLogo: React.FC<NafasLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  showSlogan = true,
  useTransparent = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    xs: { px: 28, text: 'text-sm', subtext: 'text-[9px]' },
    sm: { px: 36, text: 'text-base', subtext: 'text-[10px]' },
    md: { px: 46, text: 'text-xl', subtext: 'text-xs' },
    lg: { px: 64, text: 'text-2xl', subtext: 'text-sm' },
    xl: { px: 88, text: 'text-4xl', subtext: 'text-base' },
  };

  const { px: iconSize, text: textSize, subtext: subtextSize } = sizeMap[size];

  // Official Authentic Image Asset Paths
  const imageSrc = getAssetUrl(
    useTransparent || variant === 'icon'
      ? '/brand/nafas-logo-transparent.png'
      : '/brand/nafas-logo.png'
  );

  // High-fidelity Vector Fallback SVG (matches specifications for seamless scaling & tests)
  const FallbackSvg = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 hover:scale-105"
      role="img"
      aria-label="شعار نَفَس الرسمي — للبيئة الاجتماعية"
    >
      <defs>
        <radialGradient id="nafasCreamBase" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F7F1E7" />
          <stop offset="100%" stopColor="#EDE4D4" />
        </radialGradient>
        <linearGradient id="nafasOrchidPetals" x1="30" y1="20" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8A6AA8" />
          <stop offset="60%" stopColor="#62467D" />
          <stop offset="100%" stopColor="#4A3460" />
        </linearGradient>
        <linearGradient id="nafasLavenderWings" x1="60" y1="25" x2="60" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2D4EE" />
          <stop offset="100%" stopColor="#B797D0" />
        </linearGradient>
        <linearGradient id="nafasWalnutRing" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8A5E51" />
          <stop offset="50%" stopColor="#6B463B" />
          <stop offset="100%" stopColor="#4F332B" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="56" fill="url(#nafasCreamBase)" />
      <circle cx="60" cy="60" r="54" stroke="url(#nafasWalnutRing)" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="49.5" stroke="#B797D0" strokeWidth="0.8" strokeDasharray="3 2.5" opacity="0.65" />
      <circle cx="60" cy="6" r="2" fill="#C66F50" />
      <circle cx="60" cy="114" r="2" fill="#C66F50" />
      <circle cx="6" cy="60" r="2" fill="#C66F50" />
      <circle cx="114" cy="60" r="2" fill="#C66F50" />

      {/* 5 Community Figures (community-figure) */}
      {[0, 72, 144, 216, 288].map((angle, idx) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const hx = 60 + 41 * Math.cos(rad);
        const hy = 60 + 41 * Math.sin(rad);
        const bx = 60 + 44.5 * Math.cos(rad);
        const by = 60 + 44.5 * Math.sin(rad);
        return (
          <g key={idx} className="community-figure" opacity={0.92}>
            <circle cx={hx} cy={hy} r="3" fill={idx % 2 === 0 ? '#6B463B' : '#62467D'} />
            <circle cx={bx} cy={by} r="4.2" stroke={idx % 2 === 0 ? '#6B463B' : '#62467D'} strokeWidth="1.8" strokeDasharray="9 10" fill="none" />
          </g>
        );
      })}

      {/* Central Orchid */}
      <g id="orchid-core" transform="translate(10, 8) scale(0.83)">
        <path d="M60 76 C60 84 59 90 57 94" stroke="#6B463B" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 22 C53 30 54 44 60 50 C66 44 67 30 60 22 Z" fill="url(#nafasLavenderWings)" stroke="#62467D" strokeWidth="1.2" />
        <path d="M55 49 C41 40 28 46 26 55 C24 64 38 68 53 55 Z" fill="url(#nafasOrchidPetals)" stroke="#4A3460" strokeWidth="1.2" />
        <path d="M65 49 C79 40 92 46 94 55 C96 64 82 68 67 55 Z" fill="url(#nafasOrchidPetals)" stroke="#4A3460" strokeWidth="1.2" />
        <path d="M56 45 C43 30 33 37 37 46 C41 53 52 51 56 45 Z" fill="url(#nafasLavenderWings)" opacity="0.9" />
        <path d="M64 45 C77 30 87 37 83 46 C79 53 68 51 64 45 Z" fill="url(#nafasLavenderWings)" opacity="0.9" />
        <path d="M53 53 C47 62 49 73 60 77 C71 73 73 62 67 53 C63 56 57 56 53 53 Z" fill="#62467D" stroke="#B797D0" strokeWidth="1.2" />
        <ellipse cx="60" cy="61" rx="4" ry="5" fill="#C66F50" />
        <circle cx="60" cy="58" r="1.8" fill="#F7F1E7" />
        <path d="M58 64 C60 68 62 68 62 64" stroke="#D4C0E5" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  );

  const LogoAsset = !imageError ? (
    <img
      src={imageSrc}
      alt="شعار نَفَس الرسمي — للبيئة الاجتماعية"
      width={iconSize}
      height={iconSize}
      className="shrink-0 object-contain transition-transform duration-300 hover:scale-105"
      onError={() => setImageError(true)}
      loading="eager"
    />
  ) : (
    FallbackSvg
  );

  if (variant === 'icon' || variant === 'emblem') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{LogoAsset}</div>;
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-nafas-cream border border-nafas-walnut/20 shadow-sm ${className}`}>
        {LogoAsset}
        <div className="flex flex-col text-right leading-none">
          <span className="font-arabic font-bold text-sm text-nafas-ink">نَفَس</span>
          <span className="font-arabic text-[10px] text-nafas-walnut font-medium">للبيئة الاجتماعية</span>
        </div>
      </div>
    );
  }

  if (variant === 'monochrome') {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        {LogoAsset}
        <div className="flex flex-col text-right leading-tight">
          <span className={`font-arabic font-extrabold ${textSize} tracking-tight`}>
            نَفَس
          </span>
          {showSlogan && (
            <span className={`font-arabic ${subtextSize} font-medium opacity-80`}>
              للبيئة الاجتماعية
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default 'full' variant
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`} dir="rtl">
      {LogoAsset}
      <div className="flex flex-col text-right justify-center">
        <div className="flex items-baseline gap-2">
          <span className={`font-arabic font-extrabold ${textSize} tracking-tight text-nafas-ink`}>
            نَفَس
          </span>
          <span className="font-latin text-[10px] md:text-xs font-bold uppercase tracking-wider text-nafas-purple/90">
            NAFAS
          </span>
        </div>
        {showSlogan && (
          <span className={`font-arabic ${subtextSize} font-semibold text-nafas-walnut -mt-0.5 tracking-normal`}>
            للبيئة الاجتماعية
          </span>
        )}
      </div>
    </div>
  );
};
