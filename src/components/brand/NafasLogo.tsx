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

  // Distinctive Breath & Flow Symbol
  // Represents the continuous flow of air across Mesopotamia, shaped like the undulating letterforms of 'نَفَس'
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
        {/* Clay to Dawn gradient representing the Iraqi sunrise over the rivers */}
        <linearGradient id="nafasBreathGrad" x1="10" y1="90" x2="90" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C66F50" />
          <stop offset="50%" stopColor="#A65339" />
          <stop offset="100%" stopColor="#AAB7F0" />
        </linearGradient>
        <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#222238" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Atmospheric Breath Flow Curves (Mesopotamian Wind & River currents) */}
      <path
        d="M15 65C25 65 30 35 45 35C60 35 62 60 76 60C85 60 88 50 90 44"
        stroke="url(#nafasBreathGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 50C22 50 28 20 45 20C62 20 66 45 80 45C88 45 92 38 94 32"
        stroke="#222238"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M25 80C36 80 40 54 55 54C70 54 74 74 85 74"
        stroke="#AAB7F0"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* The Breathing Seed / Nucleus of Action (Mesopotamian Clay terracotta dot) */}
      <circle cx="45" cy="35" r="4.5" fill="#C66F50" />
      <circle cx="76" cy="60" r="4" fill="#222238" />
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
          <span className={`font-arabic font-extrabold ${textSize} tracking-tight text-nafas-midnight`}>
            نَفَس
          </span>
          <span className="font-latin text-xs font-bold uppercase tracking-widest text-nafas-clay">
            NAFAS
          </span>
        </div>
        {showSlogan && (
          <span className={`font-arabic ${subtextSize} font-medium text-nafas-clay-dark -mt-1 tracking-normal`}>
            خلّي العراق يتنفس
          </span>
        )}
      </div>
    </div>
  );
};
