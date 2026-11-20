'use client';

import React from 'react';

interface OrchidMotifProps {
  className?: string;
  variant?: 'flower' | 'icon' | 'badge' | 'corner' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

export const OrchidMotif: React.FC<OrchidMotifProps> = ({
  className = '',
  variant = 'flower',
  size = 'md',
  animated = false,
}) => {
  const sizeMap = {
    xs: 18,
    sm: 24,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const dim = sizeMap[size];

  // Stylized Purple Orchid (سحلبية بلاد الرافدين البنفسجية)
  // Composed of graceful dorsal & lateral sepals, delicate petals, a prominent orchid lip (labellum) with golden stamen
  const FlowerSvg = (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${animated ? 'motion-safe:animate-sway-subtle' : ''} ${className}`}
      role="img"
      aria-label="زهرة السحلبية البنفسجية — رمز نَفَس البيئي"
    >
      <defs>
        {/* Orchid Petal Gradient: Deep Orchid to Lavender */}
        <linearGradient id="orchidPetalGrad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8A6AA8" />
          <stop offset="60%" stopColor="#62467D" />
          <stop offset="100%" stopColor="#4C3562" />
        </linearGradient>

        {/* Soft Lavender Highlight Gradient */}
        <linearGradient id="orchidLavenderGrad" x1="50" y1="20" x2="50" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4C0E5" />
          <stop offset="100%" stopColor="#B797D0" />
        </linearGradient>

        {/* Mesopotamian Walnut stem gradient */}
        <linearGradient id="orchidStemGrad" x1="50" y1="60" x2="50" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8A5E51" />
          <stop offset="100%" stopColor="#6B463B" />
        </linearGradient>
      </defs>

      {/* Stem / Receptacle (Walnut Brown) */}
      <path
        d="M50 72 C50 82 48 90 46 95"
        stroke="url(#orchidStemGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Dorsal Sepal (Top Petal) */}
      <path
        d="M50 12 C42 22 43 38 50 44 C57 38 58 22 50 12 Z"
        fill="url(#orchidLavenderGrad)"
        stroke="#62467D"
        strokeWidth="1.2"
        opacity="0.95"
      />

      {/* Left Lateral Sepal */}
      <path
        d="M44 42 C28 32 16 38 14 48 C12 58 28 62 42 48 Z"
        fill="url(#orchidPetalGrad)"
        stroke="#4C3562"
        strokeWidth="1.2"
        opacity="0.9"
      />

      {/* Right Lateral Sepal */}
      <path
        d="M56 42 C72 32 84 38 86 48 C88 58 72 62 58 48 Z"
        fill="url(#orchidPetalGrad)"
        stroke="#4C3562"
        strokeWidth="1.2"
        opacity="0.9"
      />

      {/* Left Petal (Upper Wing) */}
      <path
        d="M46 38 C32 20 22 28 26 38 C30 46 42 44 46 38 Z"
        fill="url(#orchidLavenderGrad)"
        opacity="0.85"
      />

      {/* Right Petal (Upper Wing) */}
      <path
        d="M54 38 C68 20 78 28 74 38 C70 46 58 44 54 38 Z"
        fill="url(#orchidLavenderGrad)"
        opacity="0.85"
      />

      {/* Labellum / Orchid Lip (Central Lower Feature) */}
      <path
        d="M42 46 C36 56 38 68 50 72 C62 68 64 56 58 46 C54 49 46 49 42 46 Z"
        fill="#62467D"
        stroke="#B797D0"
        strokeWidth="1.2"
      />

      {/* Lip Center Pattern & Stamen (Clay/Gold Accent) */}
      <ellipse cx="50" cy="54" rx="4.5" ry="5.5" fill="#C66F50" />
      <circle cx="50" cy="51" r="2" fill="#F7F1E7" />
      <path d="M48 57 C50 63 52 63 52 57" stroke="#D4C0E5" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );

  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-nafas-orchid/10 border border-nafas-orchid/20 text-nafas-orchid text-xs font-semibold ${className}`}>
        {FlowerSvg}
        <span>زهرة الأوركيد</span>
      </span>
    );
  }

  if (variant === 'corner') {
    return (
      <div className={`pointer-events-none opacity-20 absolute ${className}`}>
        {FlowerSvg}
      </div>
    );
  }

  return FlowerSvg;
};
