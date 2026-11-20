'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getAssetUrl } from '@/lib/basePath';

export default function NafasIntroOverlay() {
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  const [isFading, setIsFading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const completeIntro = useCallback(() => {
    setIsFading(true);
    try {
      sessionStorage.setItem('nafas_intro_seen', 'true');
    } catch (e) {
      // ignore storage exceptions
    }
    const timer = setTimeout(() => {
      setShouldShow(false);
      setIsFading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let hasSeen = false;
    try {
      hasSeen = sessionStorage.getItem('nafas_intro_seen') === 'true';
    } catch (e) {}

    if (hasSeen || prefersReducedMotion) {
      setShouldShow(false);
      return;
    }

    setShouldShow(true);

    // Listen to postMessage from iframe
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data === 'NAFAS_INTRO_DONE' ||
        event.data?.type === 'NAFAS_INTRO_DONE' ||
        event.data === 'SKIP_INTRO'
      ) {
        completeIntro();
      }
    };

    // Listen for custom trigger to replay intro
    const handleReplay = () => {
      try {
        sessionStorage.removeItem('nafas_intro_seen');
      } catch (e) {}
      setIsFading(false);
      setShouldShow(true);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('replay-nafas-intro', handleReplay);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('replay-nafas-intro', handleReplay);
    };
  }, [completeIntro]);

  if (shouldShow === false) {
    return null;
  }

  // Detect base path for GitHub Pages or root
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/nafas-iraq')
    ? '/nafas-iraq'
    : '';

  return (
    <div
      id="nafas-intro-container"
      aria-label="مقدمة منصة نَفَس - تنفس بلاد الرافدين"
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[99999] bg-[#000000] flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Fallback & immediate skip button on top of iframe */}
      <div className="absolute top-5 left-5 z-20">
        <button
          onClick={completeIntro}
          type="button"
          className="px-4 py-2 text-xs md:text-sm font-medium tracking-wide bg-[#232120]/80 hover:bg-[#FFFCF5] text-[#FFFCF5] hover:text-[#232120] border border-[#D7C9AE]/40 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#A7CFE3]"
        >
          تخطّي إلى الموقع الرئيسي &larr;
        </button>
      </div>

      {/* Sandboxed iframe isolating all intro styles, base64 cuneiform font, and scripts */}
      <iframe
        ref={iframeRef}
        src={getAssetUrl('/intro.html')}
        title="NAFAS Opening Scene"
        className="w-full h-full border-0 select-none"
        allow="autoplay"
        tabIndex={0}
      />
    </div>
  );
}
