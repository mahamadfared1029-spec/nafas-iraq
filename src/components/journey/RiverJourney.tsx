'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RIVER_STATIONS, RiverStation } from '@/data/riverJourneyData';
import {
  ArrowRight,
  Droplets,
  MapPin,
  BookOpen,
  AlertTriangle,
  Sparkles,
  Users,
  Leaf,
  ChevronDown,
  RotateCcw,
  Megaphone,
  Waves,
} from 'lucide-react';

interface RiverJourneyProps {
  onNavigate?: (viewId: string) => void;
  onOpenReportModal?: () => void;
}

type LensTab = 'history' | 'challenge' | 'hope';

const RIVER_SVG_LENGTH = 980;

export const RiverJourney: React.FC<RiverJourneyProps> = ({
  onNavigate,
  onOpenReportModal,
}) => {
  const [activeStationIndex, setActiveStationIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeLensByStation, setActiveLensByStation] = useState<Record<string, LensTab>>({});

  const journeyContainerRef = useRef<HTMLDivElement | null>(null);
  const stationRefs = useRef<(HTMLElement | null)[]>([]);
  const heroRef = useRef<HTMLElement | null>(null);

  const activeStation = RIVER_STATIONS[activeStationIndex] || RIVER_STATIONS[0];

  const goToView = (viewId: string) => {
    if (onNavigate) {
      onNavigate(viewId);
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.hash = `#${viewId}`;
    }
  };

  // Scroll-linked river SVG progress (0 to 1)
  useEffect(() => {
    let rafId = 0;

    const updateProgress = () => {
      const container = journeyContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 800;
      const totalScrollable = Math.max(container.offsetHeight - viewportHeight * 0.55, 1);
      const scrolled = Math.min(Math.max(-rect.top + viewportHeight * 0.25, 0), totalScrollable);
      setScrollProgress(scrolled / totalScrollable);
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        updateProgress();
        rafId = 0;
      });
    };

    updateProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // IntersectionObserver for dynamic atmosphere transitions per station
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idxAttr = entry.target.getAttribute('data-station-index');
            if (idxAttr !== null) {
              const parsed = Number(idxAttr);
              if (!Number.isNaN(parsed)) {
                setActiveStationIndex(parsed);
              }
            }
          }
        });
      },
      {
        rootMargin: '-25% 0px -40% 0px',
        threshold: 0.2,
      }
    );

    stationRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToStation = (idx: number) => {
    setActiveStationIndex(idx);
    const el = stationRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const restartJourney = () => {
    setActiveStationIndex(0);
    if (heroRef.current) {
      heroRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getLensTab = (stationId: string): LensTab =>
    activeLensByStation[stationId] || 'history';

  const setLensTab = (stationId: string, tab: LensTab) => {
    setActiveLensByStation((prev) => ({ ...prev, [stationId]: tab }));
  };

  // Compute droplet Y position along SVG viewBox height (0..780)
  const clampedProgress = Math.min(Math.max(scrollProgress, 0), 1);
  const strokeDashoffset = RIVER_SVG_LENGTH * (1 - clampedProgress);
  const dropletY = 24 + clampedProgress * 736;
  const dropletX = 60 + Math.sin(clampedProgress * Math.PI * 5) * 26;

  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${activeStation.bgFrom} 0%, ${activeStation.bgTo} 100%)`,
        transition: 'background 850ms ease',
      }}
      className="min-h-screen w-full rounded-3xl overflow-hidden text-white font-arabic relative shadow-2xl border border-white/10"
    >
      {/* Sticky HUD Bar */}
      <div className="sticky top-[65px] z-30 bg-[#0A1320]/85 backdrop-blur-md border-b border-white/15 px-3 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToView('home')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>الرئيسية</span>
            </button>
            <button
              onClick={() => goToView('atlas')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sky-200 text-xs font-bold border border-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>أطلس التراث</span>
            </button>
          </div>

          {/* Active Station & Distance */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 font-bold">
              <Droplets className="w-3.5 h-3.5 text-sky-300" />
              <span>{activeStation.nameAr}</span>
            </span>
            <span className="text-amber-200 font-bold">{activeStation.distanceLabel}</span>
          </div>

          {/* Quick Jump Station Dots */}
          <div className="flex items-center gap-1.5" aria-label="التنقل السريع بين محطات النهر">
            {RIVER_STATIONS.map((st, idx) => {
              const isActive = idx === activeStationIndex;
              return (
                <button
                  key={st.id}
                  onClick={() => scrollToStation(idx)}
                  title={`${st.order}. ${st.nameAr} (${st.distanceLabel})`}
                  aria-label={`الانتقال إلى ${st.nameAr}`}
                  className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                    isActive
                      ? 'w-7 bg-sky-300 shadow-sm'
                      : 'w-2.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Mobile Thin Progress Bar */}
        <div className="mt-2.5 h-1 w-full bg-white/10 rounded-full overflow-hidden lg:hidden">
          <div
            style={{ width: `${Math.round(clampedProgress * 100)}%` }}
            className="h-full bg-gradient-to-l from-sky-300 to-emerald-300 transition-all duration-150"
          />
        </div>
      </div>

      {/* 1. Full-Viewport Hero */}
      <section
        ref={heroRef}
        className="min-h-[82vh] flex flex-col items-center justify-center text-center px-4 sm:px-8 py-16 relative overflow-hidden"
      >
        {/* Subtle SVG Water Ripples */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg
            viewBox="0 0 1200 600"
            preserveAspectRatio="none"
            className="w-full h-full"
            aria-hidden="true"
          >
            <path
              d="M0 320 Q 300 240 600 320 T 1200 320 L 1200 600 L 0 600 Z"
              fill="rgba(56, 189, 248, 0.25)"
            />
            <path
              d="M0 390 Q 300 470 600 390 T 1200 390 L 1200 600 L 0 600 Z"
              fill="rgba(20, 184, 166, 0.22)"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 border border-sky-300/40 text-sky-200 text-xs font-bold">
            <Waves className="w-4 h-4" />
            <span>تجربة سرد بصري تفاعلية (Scrollytelling) • 1,850 كم</span>
          </div>

          <div className="w-16 h-16 mx-auto rounded-full bg-sky-400/20 border border-sky-300/50 flex items-center justify-center shadow-lg">
            <Droplets className="w-8 h-8 text-sky-300" />
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            رحلة قطرة ماء: من جبال زاخو إلى شط العرب والفاو
          </h1>

          <p className="text-sm sm:text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
            رافق قطرة ماء عراقية عبر 6 محطات تاريخية وبيئية من ثلوج فيشخابور وزاخو حتى التقاء دجلة
            والفرات في الفاو، واكتشف كيف نصنع الأمل لكل شريان حياة في بلاد الرافدين.
          </p>

          <div className="pt-4">
            <button
              onClick={() => scrollToStation(0)}
              className="inline-flex flex-col items-center gap-2 text-sky-200 hover:text-white transition-colors focus:outline-none"
            >
              <span className="text-xs sm:text-sm font-bold">مرّر لترافق القطرة في رحلتها</span>
              <ChevronDown className="w-6 h-6 animate-bounce motion-reduce:animate-none" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Scrollytelling River Path + 6 Stations */}
      <div
        ref={journeyContainerRef}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sticky Vertical River SVG Column (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-36">
            <div className="bg-black/25 backdrop-blur-sm border border-white/15 rounded-3xl p-5 flex flex-col items-center space-y-4">
              <div className="text-center space-y-0.5">
                <span className="text-[11px] text-sky-200 font-bold block">مسار دجلة والفرات</span>
                <span className="text-sm font-black text-white">
                  {Math.round(clampedProgress * 1850).toLocaleString('ar-IQ')} كم من 1,850 كم
                </span>
              </div>

              <svg
                viewBox="0 0 120 780"
                className="w-28 h-[460px]"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="riverGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5EEAD4" />
                    <stop offset="50%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>
                </defs>

                {/* Base River Track */}
                <path
                  d="M 60 20 C 95 110, 25 200, 60 290 C 95 380, 25 470, 60 560 C 95 640, 35 710, 60 760"
                  fill="none"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Active Scroll-Filled River Path */}
                <path
                  d="M 60 20 C 95 110, 25 200, 60 290 C 95 380, 25 470, 60 560 C 95 640, 35 710, 60 760"
                  fill="none"
                  stroke="url(#riverGlow)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RIVER_SVG_LENGTH}
                  strokeDashoffset={strokeDashoffset}
                />

                {/* Station Nodes */}
                {RIVER_STATIONS.map((st, idx) => {
                  const yPos = 35 + idx * 142;
                  const isReached = idx <= activeStationIndex;
                  return (
                    <circle
                      key={st.id}
                      cx="60"
                      cy={yPos}
                      r={idx === activeStationIndex ? 8 : 5}
                      fill={isReached ? '#38BDF8' : '#1E293B'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* Glowing Water Droplet Head */}
                <g transform={`translate(${dropletX}, ${dropletY})`}>
                  <circle r="13" fill="rgba(56, 189, 248, 0.28)" />
                  <circle r="6" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="2.5" />
                </g>
              </svg>

              <div className="w-full space-y-1.5 text-[11px]">
                {RIVER_STATIONS.map((st, idx) => (
                  <button
                    key={st.id}
                    onClick={() => scrollToStation(idx)}
                    className={`w-full text-right px-2.5 py-1 rounded-lg transition-colors flex items-center justify-between ${
                      idx === activeStationIndex
                        ? 'bg-sky-400/25 text-white font-bold'
                        : 'text-white/65 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate">{st.order}. {st.nameAr}</span>
                    <span className="text-[10px] text-amber-200 shrink-0">{st.distanceLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* 6 Stations Cards Column */}
          <div className="lg:col-span-9 space-y-12 sm:space-y-16">
            {RIVER_STATIONS.map((station: RiverStation, idx: number) => {
              const currentLens = getLensTab(station.id);
              const isCurrent = idx === activeStationIndex;

              return (
                <article
                  key={station.id}
                  ref={(el) => {
                    stationRefs.current[idx] = el;
                  }}
                  data-station-index={idx}
                  className={`rounded-3xl p-6 sm:p-9 border transition-all duration-500 backdrop-blur-sm ${
                    isCurrent
                      ? 'bg-black/40 border-white/30 shadow-2xl'
                      : 'bg-black/25 border-white/15 shadow-lg opacity-90'
                  }`}
                >
                  {/* Station Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-5 mb-6">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${station.badgeClasses}`}
                        >
                          المحطة {station.order} من {RIVER_STATIONS.length}
                        </span>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-amber-200 border border-white/15 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{station.distanceLabel}</span>
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-white">
                        {station.nameAr}
                      </h2>
                      <p className="text-sm text-sky-200 font-bold">{station.subtitleAr}</p>
                    </div>

                    <div className="text-xs text-white/75 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 self-start sm:self-auto">
                      النطاق: <strong className="text-white">{station.governorateNameAr}</strong>
                    </div>
                  </div>

                  {/* Time Lens Tabs («عدسة الزمن») */}
                  <div
                    role="tablist"
                    aria-label={`عدسة الزمن لمحطة ${station.nameAr}`}
                    className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-black/35 border border-white/10 mb-6"
                  >
                    <button
                      role="tab"
                      aria-selected={currentLens === 'history'}
                      onClick={() => setLensTab(station.id, 'history')}
                      className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                        currentLens === 'history'
                          ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50 shadow-sm'
                          : 'text-white/75 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <span>الرافدين تاريخياً</span>
                    </button>

                    <button
                      role="tab"
                      aria-selected={currentLens === 'challenge'}
                      onClick={() => setLensTab(station.id, 'challenge')}
                      className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 ${
                        currentLens === 'challenge'
                          ? 'bg-rose-500/25 text-rose-200 border border-rose-400/50 shadow-sm'
                          : 'text-white/75 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>التحدي اليوم</span>
                    </button>

                    <button
                      role="tab"
                      aria-selected={currentLens === 'hope'}
                      onClick={() => setLensTab(station.id, 'hope')}
                      className={`py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                        currentLens === 'hope'
                          ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 shadow-sm'
                          : 'text-white/75 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>أمل نَفَس</span>
                    </button>
                  </div>

                  {/* Lens Content Panel */}
                  <div className="min-h-[190px]">
                    {currentLens === 'history' && (
                      <div className="space-y-4">
                        <h3 className="text-lg sm:text-xl font-bold text-amber-200">
                          {station.lens.history.title}
                        </h3>
                        <p className="text-sm text-white/90 leading-relaxed">
                          {station.lens.history.description}
                        </p>
                        <blockquote className="p-4 rounded-2xl bg-amber-500/10 border-r-4 border-amber-400 text-xs sm:text-sm text-amber-100 leading-relaxed">
                          {station.lens.history.quote}
                        </blockquote>
                      </div>
                    )}

                    {currentLens === 'challenge' && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <h3 className="text-lg sm:text-xl font-bold text-rose-200">
                            {station.lens.challenge.title}
                          </h3>
                          <p className="text-sm text-white/90 leading-relaxed">
                            {station.lens.challenge.description}
                          </p>
                        </div>

                        {/* Visual River & Vegetation Indicators */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-sky-200">
                                {station.lens.challenge.riverStatusLabel}
                              </span>
                              <span className="text-white">{station.riverHealthPct}%</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-white/15 overflow-hidden">
                              <div
                                style={{ width: `${station.riverHealthPct}%` }}
                                className="h-full rounded-full bg-gradient-to-l from-sky-400 to-amber-400 transition-all duration-500"
                              />
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-emerald-200">
                                {station.lens.challenge.vegetationStatusLabel}
                              </span>
                              <span className="text-white">{station.vegetationPct}%</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-white/15 overflow-hidden">
                              <div
                                style={{ width: `${station.vegetationPct}%` }}
                                className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-400 transition-all duration-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentLens === 'hope' && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <h3 className="text-lg sm:text-xl font-bold text-emerald-200">
                            {station.lens.hope.title}
                          </h3>
                          <p className="text-sm text-white/90 leading-relaxed">
                            {station.lens.hope.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            onClick={() => goToView(station.lens.hope.primaryView)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                          >
                            <Users className="w-4 h-4" />
                            <span>{station.lens.hope.primaryActionLabel}</span>
                          </button>

                          <button
                            onClick={() => goToView(station.lens.hope.secondaryView)}
                            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold flex items-center gap-2 border border-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
                          >
                            <Leaf className="w-4 h-4 text-emerald-300" />
                            <span>{station.lens.hope.secondaryActionLabel}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {/* 3. Finale Cinematic CTA at Al-Faw */}
            <section className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-[#0A192F]/95 via-[#102A43]/95 to-[#134E4A]/95 border-2 border-sky-400/40 shadow-2xl text-center space-y-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-sky-400/20 border border-sky-300/50 flex items-center justify-center">
                <Droplets className="w-7 h-7 text-sky-300" />
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white leading-snug">
                كل قطرة نحميها اليوم... تُبقي العراق يتنفس غداً
              </h2>

              <p className="text-sm sm:text-base text-white/85 max-w-2xl mx-auto leading-relaxed">
                وصلت القطرة إلى شط العرب والفاو، لكن قصتها تتجدد كل يوم بوعيك ومشاركتك الميدانية في
                حماية أنهار العراق وبساتينه.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    if (onOpenReportModal) {
                      onOpenReportModal();
                    } else {
                      goToView('map');
                    }
                  }}
                  className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black flex items-center gap-2 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>بلّغ عن مشكلة بيئية</span>
                </button>

                <button
                  onClick={() => goToView('campaigns')}
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center gap-2 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <Users className="w-4 h-4" />
                  <span>شارك في حملة تطوع</span>
                </button>

                <button
                  onClick={restartJourney}
                  className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center gap-2 border border-white/25 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة الرحلة من زاخو</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
