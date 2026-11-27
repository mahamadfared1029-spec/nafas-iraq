'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNafas } from '@/lib/store';
import { HERITAGE_CHAPTERS } from '@/lib/constants';
import {
  Feather,
  Landmark,
  Waves,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Scale,
  Droplets,
  Trees,
  Sprout,
  Shovel,
  Clock,
  Lightbulb,
  BookOpen,
  Users,
  Leaf,
  X,
} from 'lucide-react';

interface HeritageAtlasProps {
  onNavigate?: (viewId: string) => void;
}

interface HammurabiLaw {
  id: string;
  article: string;
  title: string;
  summary: string;
  modernLesson: string;
  iconKey: 'water' | 'tree' | 'orchard' | 'river';
}

const HAMMURABI_LAWS: HammurabiLaw[] = [
  {
    id: 'law-53-55',
    article: 'المادة 53 و55',
    title: 'صيانة السدود والقنوات',
    summary:
      'من يهمل تقوية سدّ قناته أو يفتح الماء بإهمال فيُغرق حقل جاره، يُلزم بتعويض المحصول المتضرر كاملاً دون تهاون.',
    modernLesson: 'المسؤولية المشتركة في ترشيد وحماية المياه ومنع الهدر والتجاوز على الحصص المائية.',
    iconKey: 'water',
  },
  {
    id: 'law-59',
    article: 'المادة 59',
    title: 'حماية الأشجار',
    summary:
      'من يقطع شجرة في بستان غيره دون إذن مالكه يدفع غرامة مالية قاسية قدرها نصف «مَنا» من الفضة.',
    modernLesson: 'تجريم قطع الأشجار العشوائي وحماية الغطاء النباتي والمساحات الخضراء في المدن.',
    iconKey: 'tree',
  },
  {
    id: 'law-60-65',
    article: 'المواد 60–65',
    title: 'استصلاح البساتين',
    summary:
      'تنظيم غرس الأراضي وتحويلها إلى بساتين مثمرة، مع مكافأة البستاني الملتزم بالرعاية ومحاسبة المقصّر في إعمار الأرض.',
    modernLesson: 'التشجير المستدام ورعاية الشتلات وسقيها بعد الغرس لضمان بقائها ونموها.',
    iconKey: 'orchard',
  },
  {
    id: 'law-silt',
    article: 'أوامر ملكية موثقة',
    title: 'صيانة الأنهار من الطمي',
    summary:
      'أوامر حمورابي الموثّقة لحكّام المدن بحشد الأهالي بشكل دوري لتنظيف القنوات من الرواسب وضمان جريان الماء العذب.',
    modernLesson: 'حملات التطوع الميدانية لتنظيف ضفاف ومجاري دجلة والفرات وإزالة النفايات.',
    iconKey: 'river',
  },
];

interface EcoMilestone {
  id: string;
  eraLabel: string;
  title: string;
  subtitle: string;
  chapterIndex: number;
  actionView?: string;
}

const ECO_TIMELINE: EcoMilestone[] = [
  {
    id: 'tl-sumer',
    eraLabel: '~3000 ق.م',
    title: 'سومر والأهوار',
    subtitle: 'عمارة القصب والمشحوف',
    chapterIndex: 0,
  },
  {
    id: 'tl-babylon',
    eraLabel: '~1750 ق.م',
    title: 'بابل ومسلّة حمورابي',
    subtitle: 'قناة وفرة الشعب والقانون البيئي',
    chapterIndex: 2,
  },
  {
    id: 'tl-assyria',
    eraLabel: '~690 ق.م',
    title: 'آشور وقناطر جروانة',
    subtitle: 'أقدم قناة حجرية معلّقة',
    chapterIndex: 3,
  },
  {
    id: 'tl-abbasid',
    eraLabel: 'القرن 9 م',
    title: 'العصر العباسي وسامراء',
    subtitle: 'هندسة الري الجاذبية',
    chapterIndex: 1,
  },
  {
    id: 'tl-noria',
    eraLabel: 'إرث متجدد',
    title: 'نواعير الفرات والكاريز',
    subtitle: 'طاقة مائية نظيفة 100%',
    chapterIndex: 5,
  },
  {
    id: 'tl-nafas',
    eraLabel: '2026',
    title: 'مبادرة نَفَس اليوم',
    subtitle: 'حماية وتطوع ميداني رقمي',
    chapterIndex: 0,
    actionView: 'campaigns',
  },
];

const SESSION_INTRO_KEY = 'nafas_atlas_hammurabi_intro_seen';

const DUST_PARTICLES = [
  { top: '18%', left: '14%', delay: '0s', size: 'w-1.5 h-1.5' },
  { top: '28%', left: '78%', delay: '1.1s', size: 'w-2 h-2' },
  { top: '42%', left: '25%', delay: '2.2s', size: 'w-1 h-1' },
  { top: '65%', left: '84%', delay: '0.7s', size: 'w-1.5 h-1.5' },
  { top: '72%', left: '19%', delay: '1.8s', size: 'w-2 h-2' },
  { top: '34%', left: '54%', delay: '2.8s', size: 'w-1 h-1' },
  { top: '58%', left: '43%', delay: '1.4s', size: 'w-1.5 h-1.5' },
  { top: '22%', left: '62%', delay: '0.4s', size: 'w-1 h-1' },
];

export const HeritageAtlas: React.FC<HeritageAtlasProps> = ({ onNavigate }) => {
  const { t } = useNafas();
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [selectedLawId, setSelectedLawId] = useState<string>(HAMMURABI_LAWS[0].id);
  const [showIntro, setShowIntro] = useState(false);
  const [introShot, setIntroShot] = useState<1 | 2 | 3>(1);
  const [introExiting, setIntroExiting] = useState(false);

  const chapterBookRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);

  const activeChapter = HERITAGE_CHAPTERS[activeChapterIndex] || HERITAGE_CHAPTERS[0];
  const selectedLaw = HAMMURABI_LAWS.find((l) => l.id === selectedLawId) || HAMMURABI_LAWS[0];

  const clearIntroTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const closeIntro = useCallback(() => {
    clearIntroTimers();
    try {
      sessionStorage.setItem(SESSION_INTRO_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setIntroExiting(true);
    const tExit = window.setTimeout(() => {
      setShowIntro(false);
      setIntroExiting(false);
    }, 550);
    timersRef.current.push(tExit);
  }, [clearIntroTimers]);

  const startIntro = useCallback(() => {
    clearIntroTimers();
    setIntroExiting(false);
    setIntroShot(1);
    setShowIntro(true);

    const t2 = window.setTimeout(() => setIntroShot(2), 2500);
    const t3 = window.setTimeout(() => setIntroShot(3), 5500);
    const tEnd = window.setTimeout(() => closeIntro(), 8500);
    timersRef.current.push(t2, t3, tEnd);
  }, [clearIntroTimers, closeIntro]);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SESSION_INTRO_KEY);
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!seen && !reducedMotion) {
        startIntro();
      } else if (!seen && reducedMotion) {
        sessionStorage.setItem(SESSION_INTRO_KEY, '1');
      }
    } catch {
      // ignore
    }
    return () => clearIntroTimers();
  }, [startIntro, clearIntroTimers]);

  useEffect(() => {
    if (!showIntro) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIntro, closeIntro]);

  const goToSection = (viewId: string) => {
    if (onNavigate) {
      onNavigate(viewId);
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.hash = `#${viewId}`;
    }
  };

  const handleMilestoneClick = (milestone: EcoMilestone) => {
    setActiveChapterIndex(milestone.chapterIndex);
    if (milestone.actionView) {
      goToSection(milestone.actionView);
      return;
    }
    chapterBookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderLawIcon = (iconKey: HammurabiLaw['iconKey']) => {
    switch (iconKey) {
      case 'water':
        return <Droplets className="w-5 h-5 text-sky-300" />;
      case 'tree':
        return <Trees className="w-5 h-5 text-emerald-300" />;
      case 'orchard':
        return <Sprout className="w-5 h-5 text-amber-300" />;
      case 'river':
        return <Shovel className="w-5 h-5 text-amber-200" />;
    }
  };

  return (
    <section className="py-14 sm:py-20 bg-[#302D29] text-nafas-limestone relative overflow-hidden font-arabic text-right rounded-3xl">
      {/* Hammurabi Cinematic Intro Overlay */}
      {showIntro && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="المشهد السينمائي لتاريخ حمورابي البيئي"
          className={`fixed inset-0 z-50 bg-[#0D0C14] flex flex-col justify-between overflow-hidden select-none ${
            introExiting ? 'nafas-cinematic-exit' : ''
          }`}
        >
          {/* Top Letterbox Bar */}
          <div className="h-12 sm:h-16 bg-black border-b border-amber-500/20 px-4 sm:px-8 flex items-center justify-between relative z-20">
            <span className="text-[11px] sm:text-xs font-arabic text-amber-200/80 tracking-wide">
              أطلس نَفَس السينمائي — ذاكرة وادي الرافدين
            </span>
            <button
              onClick={closeIntro}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-amber-500/25 border border-amber-400/40 text-amber-100 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <span>تخطّي ← (ESC)</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cinematic Stage */}
          <div className="relative flex-1 flex items-center justify-center px-6 py-8">
            {/* Warm Radial Ambient Light */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,155,38,0.16)_0%,rgba(13,12,20,0.92)_62%,#0D0C14_100%)] pointer-events-none" />

            {/* Floating Golden Dust Particles */}
            <div className="absolute inset-0 pointer-events-none">
              {DUST_PARTICLES.map((p, idx) => (
                <span
                  key={idx}
                  style={{ top: p.top, left: p.left, animationDelay: p.delay }}
                  className={`absolute ${p.size} rounded-full bg-amber-300/60 nafas-dust-particle`}
                />
              ))}
            </div>

            {/* Shot 1: Cuneiform & Babylon ~3800 Years Ago */}
            {introShot === 1 && (
              <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6 transition-opacity duration-700">
                <div
                  dir="ltr"
                  className="text-2xl sm:text-4xl text-amber-300 tracking-[0.22em] drop-shadow-[0_0_16px_rgba(251,191,36,0.55)]"
                >
                  𒄩𒄠𒈬𒊏𒁉 — 𒀀 𒉆𒋾
                </div>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-amber-100 leading-tight">
                  بابل — قبل قرابة 3800 عام...
                </h2>
                <p className="text-xs sm:text-sm text-white/75">
                  على ضفاف الفرات الخالد، وُلدت أولى شرائع حماية الماء والأرض
                </p>
              </div>
            )}

            {/* Shot 2: Black Basalt Stele SVG + Charter Message */}
            {introShot === 2 && (
              <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center space-y-6">
                <div className="nafas-stele-rise flex justify-center">
                  <svg
                    viewBox="0 0 180 260"
                    className="w-32 h-44 sm:w-40 sm:h-56 drop-shadow-[0_0_24px_rgba(245,158,11,0.35)]"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="basaltGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#2A2835" />
                        <stop offset="55%" stopColor="#17161E" />
                        <stop offset="100%" stopColor="#0E0D13" />
                      </linearGradient>
                      <linearGradient id="goldEdge" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FCD34D" />
                        <stop offset="100%" stopColor="#B45309" />
                      </linearGradient>
                    </defs>
                    {/* Stele Body */}
                    <path
                      d="M42 248 L48 64 C50 26 70 12 90 12 C110 12 130 26 132 64 L138 248 Z"
                      fill="url(#basaltGrad)"
                      stroke="url(#goldEdge)"
                      strokeWidth="2.5"
                    />
                    {/* Top Relief Sun & Crown Arc */}
                    <circle cx="90" cy="48" r="16" fill="none" stroke="#FBBF24" strokeWidth="1.5" opacity="0.85" />
                    <path d="M74 72 Q90 62 106 72" fill="none" stroke="#FCD34D" strokeWidth="1.5" opacity="0.8" />
                    {/* Horizontal Cuneiform Engraving Lines */}
                    <g stroke="#F59E0B" strokeWidth="1.4" opacity="0.72">
                      <line x1="60" y1="95" x2="120" y2="95" />
                      <line x1="58" y1="112" x2="122" y2="112" />
                      <line x1="58" y1="129" x2="122" y2="129" />
                      <line x1="57" y1="146" x2="123" y2="146" />
                      <line x1="56" y1="163" x2="124" y2="163" />
                      <line x1="56" y1="180" x2="124" y2="180" />
                      <line x1="55" y1="197" x2="125" y2="197" />
                      <line x1="54" y1="214" x2="126" y2="214" />
                    </g>
                    {/* Pedestal */}
                    <rect x="30" y="244" width="120" height="10" rx="3" fill="#1F1D29" stroke="#D97706" strokeWidth="1.5" />
                  </svg>
                </div>

                <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-amber-100 leading-relaxed max-w-2xl">
                  حيث نُقش على الحجر الأسود أول ميثاق في التاريخ يحمي الماء... والشجرة... والأرض
                </p>
              </div>
            )}

            {/* Shot 3: Grand Title & Historical Quote */}
            {introShot === 3 && (
              <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
                <span className="inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold">
                  1792 – 1750 ق.م • ميثاق بلاد الرافدين
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                  حمورابي — حامي الأنهار وباني وفرة الشعب
                </h2>
                <blockquote className="text-base sm:text-xl font-arabic text-amber-200/95 leading-relaxed border-r-4 border-amber-400 pr-4 text-right max-w-2xl mx-auto">
                  «حفرتُ قناةً سمّيتها (حمورابي وفرة الشعب) لتجلب فيض الماء إلى أرض سومر وأكد»
                </blockquote>
              </div>
            )}
          </div>

          {/* Bottom Letterbox Bar with Shot Progress */}
          <div className="h-12 sm:h-16 bg-black border-t border-amber-500/20 px-4 sm:px-8 flex items-center justify-between relative z-20">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    introShot === step
                      ? 'w-8 bg-amber-400'
                      : introShot > step
                      ? 'w-4 bg-amber-400/60'
                      : 'w-4 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-white/60">مشهد افتتاحي — أطلس التراث البيئي</span>
          </div>
        </div>
      )}

      {/* Mesopotamian Clay Tablet Geometric Motifs in Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 800 800" fill="none">
          <pattern id="clayGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 40 M 0 0 L 40 40" stroke="#28566E" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#clayGrid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Editorial Title & Replay Cinematic Button */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-nafas-blue/25 border border-nafas-blue/40 text-sky-200 text-xs font-bold">
              <Feather className="w-3.5 h-3.5 text-sky-200" />
              <span>المكتبة التراثية والبيئية الرقمية</span>
            </div>

            <button
              onClick={startIntro}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <Play className="w-3.5 h-3.5" />
              <span>إعادة المشهد السينمائي لحمورابي</span>
            </button>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {t.heritageTitle}
          </h2>

          <p className="text-sm sm:text-base text-white/85 max-w-2xl mx-auto leading-relaxed">
            {t.heritageSubtitle}
          </p>
        </div>

        {/* Hammurabi Environmental Charter Section */}
        <div className="bg-[#1A1826] border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-amber-500/20 pb-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 text-amber-300 text-xs font-bold">
                <Scale className="w-4 h-4" />
                <span>ميثاق حمورابي البيئي — أقدم قوانين البيئة في التاريخ</span>
              </div>
              <h3 className="text-xl sm:text-3xl font-black text-white leading-snug">
                نهر حمورابي «وفرة الشعب» وشريعة حماية الماء والشجرة
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                حكم حمورابي بابل (~1792–1750 ق.م) ووحّد شبكة الري في وادي الرافدين، وشقّ قناة{' '}
                <strong className="text-amber-200">«نهر حمورابي / وفرة الشعب»</strong> بطول يقارب 160 كم لتغذية
                نفر وإيسن وأوروك ولارسا وأور وأريدو، واضعاً مواد قانونية صارمة تحاسب المقصّرين بحق الماء والبساتين.
              </p>
            </div>

            <div className="shrink-0 bg-[#242134] border border-amber-500/25 rounded-2xl px-5 py-4 text-center space-y-1">
              <div className="text-2xl font-black text-amber-300">~160 كم</div>
              <div className="text-[11px] text-white/75">طول قناة «وفرة الشعب» التاريخية</div>
            </div>
          </div>

          {/* 4 Interactive Hammurabi Environmental Laws */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HAMMURABI_LAWS.map((law) => {
              const isSelected = selectedLaw.id === law.id;
              return (
                <button
                  key={law.id}
                  onClick={() => setSelectedLawId(law.id)}
                  className={`text-right p-4 rounded-2xl border transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/70 shadow-lg scale-[1.01]'
                      : 'bg-[#242134] border-white/10 hover:border-amber-400/40 hover:bg-[#2A263D]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                      {law.article}
                    </span>
                    {renderLawIcon(law.iconKey)}
                  </div>
                  <div className="text-sm font-black text-white mb-1">{law.title}</div>
                  <p className="text-xs text-white/75 line-clamp-2 leading-relaxed">{law.summary}</p>
                </button>
              );
            })}
          </div>

          {/* Selected Law Detail & Contemporary Iraq Lesson */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#242134] border border-amber-500/25 rounded-2xl p-5">
            <div className="lg:col-span-7 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-300 block">
                نص القاعدة التاريخية ({selectedLaw.article} — {selectedLaw.title}):
              </span>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed">{selectedLaw.summary}</p>
            </div>
            <div className="lg:col-span-5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>الدرس البيئي لعراق اليوم:</span>
              </span>
              <p className="text-xs text-emerald-100 leading-relaxed">{selectedLaw.modernLesson}</p>
            </div>
          </div>
        </div>

        {/* Interactive Mesopotamian Eco-Timeline */}
        <div className="bg-[#252436] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <span className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>خط زمني تفاعلي لحضارة الرافدين البيئية</span>
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-white">
                من سومر والأهوار حتى مبادرة نَفَس (2026)
              </h3>
            </div>
            <span className="text-xs text-white/70">انقر على أي محطة للانتقال إلى فصلها في الأطلس</span>
          </div>

          <div className="relative">
            {/* Desktop Horizontal Connector */}
            <div className="hidden md:block absolute top-6 inset-x-8 h-0.5 bg-gradient-to-l from-amber-400/50 via-sky-400/40 to-emerald-400/50 pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 relative z-10">
              {ECO_TIMELINE.map((milestone) => {
                const isActive =
                  !milestone.actionView && activeChapterIndex === milestone.chapterIndex;
                return (
                  <button
                    key={milestone.id}
                    onClick={() => handleMilestoneClick(milestone)}
                    className={`group text-right md:text-center p-3.5 rounded-2xl border transition-all flex md:flex-col items-center gap-3 md:gap-2 focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                      isActive
                        ? 'bg-nafas-blue/30 border-sky-300/70 shadow-md'
                        : milestone.actionView
                        ? 'bg-emerald-900/35 border-emerald-400/40 hover:bg-emerald-900/55'
                        : 'bg-[#1D1C2B] border-white/10 hover:border-white/30 hover:bg-[#2A283D]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full shrink-0 border-2 transition-transform group-hover:scale-110 ${
                        isActive
                          ? 'bg-sky-300 border-white'
                          : milestone.actionView
                          ? 'bg-emerald-400 border-emerald-100'
                          : 'bg-amber-300 border-[#1D1C2B]'
                      }`}
                    />
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-amber-200">{milestone.eraLabel}</div>
                      <div className="text-xs font-black text-white leading-snug">{milestone.title}</div>
                      <div className="text-[11px] text-white/70 leading-snug">{milestone.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chapter Navigation Selector (6 Chapters) */}
        <div ref={chapterBookRef} className="space-y-6 scroll-mt-6">
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {HERITAGE_CHAPTERS.map((chap, idx) => (
              <button
                key={chap.id}
                onClick={() => setActiveChapterIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                  activeChapterIndex === idx
                    ? 'bg-nafas-blue text-white shadow-lg scale-105'
                    : 'bg-nafas-ivory/10 text-white/80 hover:text-white hover:bg-nafas-ivory/15'
                }`}
              >
                {chap.titleAr.split('—')[0]}
              </button>
            ))}
          </div>

          {/* Archival Editorial Book View */}
          <div className="bg-[#2D2D44] border-2 border-nafas-blue/30 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Visual Archetype & Quote Column */}
              <div className="lg:col-span-5 space-y-5">
                <div className="p-6 rounded-2xl bg-[#302D29] border border-nafas-blue/30 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sky-200 text-xs font-bold">
                      <Landmark className="w-4 h-4 text-sky-200" />
                      <span>المعلم التاريخي:</span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 font-bold">
                      {activeChapter.era}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-white leading-snug">
                    {activeChapter.historicalLandmark}
                  </div>
                  <p className="text-xs text-nafas-ivory/80 leading-relaxed">
                    {activeChapter.naturalHeritage}
                  </p>
                </div>

                {/* Historical Sourced Inscription / Quote */}
                <div className="p-5 rounded-2xl bg-nafas-blue/15 border-r-4 border-nafas-blue space-y-2">
                  <span className="text-[11px] text-sky-200 font-arabic font-bold block">
                    شاهدٌ من التاريخ:
                  </span>
                  <blockquote className="text-sm italic font-arabic text-white/90 leading-relaxed">
                    {activeChapter.historicalQuote}
                  </blockquote>
                </div>

                {/* Eco-Innovation & Quick Historical Fact */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 rounded-2xl bg-[#222238] border border-sky-400/25 space-y-1">
                    <span className="text-[11px] font-bold text-sky-200 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>الابتكار البيئي الأبرز:</span>
                    </span>
                    <p className="text-xs text-white/85 leading-relaxed">
                      {activeChapter.ecoInnovation}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#222238] border border-amber-400/25 space-y-1">
                    <span className="text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>معلومة تاريخية سريعة:</span>
                    </span>
                    <p className="text-xs text-white/85 leading-relaxed">
                      {activeChapter.historicalFact}
                    </p>
                  </div>
                </div>
              </div>

              {/* In-depth Narrative Column */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="text-xs font-arabic font-bold text-sky-200 tracking-wider block mb-1">
                    فصل من ذاكرة المياه والأرض • {activeChapter.governorateNameAr}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {activeChapter.titleAr}
                  </h3>
                </div>

                {/* Traditional Ecology */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                    <Waves className="w-4 h-4" />
                    <span>التعايش البيئي التقليدي عبر العصور:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                    {activeChapter.traditionalEcology}
                  </p>
                </div>

                {/* Contemporary Ecological Challenge */}
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/30 space-y-1 text-xs">
                  <span className="font-bold text-red-300 block">التحدي البيئي المعاصر:</span>
                  <p className="text-red-200/90 leading-relaxed">
                    {activeChapter.modernChallenge}
                  </p>
                </div>

                {/* Conservation Hope & Community Action */}
                <div className="p-4 rounded-xl bg-nafas-blue/15 border border-nafas-blue/30 space-y-1 text-xs">
                  <span className="font-bold text-sky-200 block">أفق الحماية المجتمعية:</span>
                  <p className="text-white/90 leading-relaxed">
                    {activeChapter.conservationHope}
                  </p>
                </div>

                {/* Chapter CTA Buttons */}
                <div className="p-4 rounded-2xl bg-[#222238] border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-white/85 font-bold">
                    ساهم في حماية إرث {activeChapter.governorateNameAr} اليوم:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => goToSection('campaigns')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>حملات التطوع</span>
                    </button>
                    <button
                      onClick={() => goToSection('planting')}
                      className="px-3.5 py-2 rounded-xl bg-nafas-blue hover:bg-nafas-orchid-light text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    >
                      <Leaf className="w-3.5 h-3.5" />
                      <span>الدليل الزراعي</span>
                    </button>
                  </div>
                </div>

                {/* Chapter Pager Controls */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <button
                    disabled={activeChapterIndex === 0}
                    onClick={() => setActiveChapterIndex((prev) => prev - 1)}
                    className="px-4 py-2 rounded-xl bg-nafas-ivory/10 hover:bg-nafas-ivory/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white flex items-center gap-1 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>الفصل السابق</span>
                  </button>

                  <span className="text-xs font-arabic text-white/75">
                    {activeChapterIndex + 1} من {HERITAGE_CHAPTERS.length}
                  </span>

                  <button
                    disabled={activeChapterIndex === HERITAGE_CHAPTERS.length - 1}
                    onClick={() => setActiveChapterIndex((prev) => prev + 1)}
                    className="px-4 py-2 rounded-xl bg-nafas-ivory/10 hover:bg-nafas-ivory/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white flex items-center gap-1 transition-colors"
                  >
                    <span>الفصل التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
