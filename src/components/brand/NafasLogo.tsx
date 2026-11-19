'use client';

import React from 'react';

interface NafasLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'monochrome' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
}

export const NafasLogo: React.FC<NafasLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  showSlogan = true,
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-base', subtext: 'text-[10px]' },
    md: { icon: 38, text: 'text-xl', subtext: 'text-xs' },
    lg: { icon: 52, text: 'text-2xl', subtext: 'text-sm' },
    xl: { icon: 70, text: 'text-4xl', subtext: 'text-base' },
  };

  const { icon: iconSize, text: textSize, subtext: subtextSize } = sizeMap[size];

  // Mesopotamian Nature Breath & Flow Symbol
  // Represents air and river currents (Tigris and Euphrates) flowing through the reed marshes
  const LogoIcon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-500 hover:scale-105"
      role="img"
      aria-label="شعار نَفَس — نبض بلاد الرافدين"
    >
      <defs>
        {/* Mesopotamian Blue to Misty Blue gradient */}
        <linearGradient id="nafasBreathGrad" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#28566E" />
          <stop offset="50%" stopColor="#366E8C" />
          <stop offset="100%" stopColor="#D8E8ED" />
        </linearGradient>
        <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#302D29" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Atmospheric Breath Flow Curves (Mesopotamian Rivers and Air) */}
      <path
        d="M15 65C25 65 30 35 45 35C60 35 62 60 76 60C85 60 88 50 90 44"
        stroke="url(#nafasBreathGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 50C22 50 28 20 45 20C62 20 66 45 80 45C88 45 92 38 94 32"
        stroke="#302D29"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <path
        d="M25 80C36 80 40 54 55 54C70 54 74 74 85 74"
        stroke="#C8B68D"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* The Breathing Nucleus (Mesopotamian Blue & Dark Silt dots) */}
      <circle cx="45" cy="35" r="4.5" fill="#28566E" />
      <circle cx="76" cy="60" r="4" fill="#302D29" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{LogoIcon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {LogoIcon}
      <div className="flex flex-col text-right">
        <div className="flex items-baseline gap-2">
          <span className={`font-arabic font-extrabold ${textSize} tracking-tight text-nafas-silt`}>
            نَفَس
          </span>
          <span className="font-latin text-xs font-bold uppercase tracking-widest text-nafas-blue">
            NAFAS
          </span>
        </div>
        {showSlogan && (
          <span className={`font-arabic ${subtextSize} font-medium text-nafas-blue/90 -mt-1 tracking-normal`}>
            خلّي العراق يتنفس
          </span>
        )}
      </div>
    </div>
  );
};
