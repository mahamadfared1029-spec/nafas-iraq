'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getAssetUrl, getBasePath } from '@/lib/basePath';

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

    // Clean URL hash if it was triggered via #intro
    if (typeof window !== 'undefined' && window.location.hash === '#intro') {
      try {
        const base = getBasePath();
        const targetUrl = base ? `${base}/` : '/';
        window.history.replaceState(null, '', targetUrl);
      } catch (e) {}
    }

    const timer = setTimeout(() => {
      setShouldShow(false);
      setIsFading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const startIntro = useCallback(() => {
    setIsFading(false);
    setShouldShow(true);
  }, []);

  useEffect(() => {
    // Determine whether intro should show automatically
    const checkShouldShow = () => {
      if (typeof window === 'undefined') return false;

      // Explicit trigger in URL: #intro or ?intro=1 always opens intro
      if (window.location.hash === '#intro' || window.location.search.includes('intro=1')) {
        return true;
      }

      let hasSeen = false;
      try {
        hasSeen = sessionStorage.getItem('nafas_intro_seen') === 'true';
      } catch (e) {}

      if (hasSeen) return false;

      // Honor OS reduced motion for auto-play on first visit
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return false;

      return true;
    };

    setShouldShow(checkShouldShow());

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

    // Custom events and hash listener
    const handleReplay = () => {
      try {
        sessionStorage.removeItem('nafas_intro_seen');
      } catch (e) {}
      startIntro();
    };

    const handleHash = () => {
      if (window.location.hash === '#intro') {
        startIntro();
      }
    };

    // Keyboard accessibility: ESC key to skip intro
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        completeIntro();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('replay-nafas-intro', handleReplay);
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('replay-nafas-intro', handleReplay);
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [completeIntro, startIntro]);

  if (!shouldShow) {
    return null;
  }

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
      <div className="absolute top-5 left-5 z-20 flex items-center gap-3">
        <button
          onClick={completeIntro}
          type="button"
          className="px-4 py-2 text-xs md:text-sm font-medium tracking-wide bg-[#232120]/80 hover:bg-[#FFFCF5] text-[#FFFCF5] hover:text-[#232120] border border-[#D7C9AE]/40 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#A7CFE3] flex items-center gap-2"
        >
          <span>تخطّي إلى الموقع الرئيسي</span>
          <span className="text-xs">&larr; (ESC)</span>
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
