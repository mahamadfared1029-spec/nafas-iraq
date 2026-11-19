'use client';

import React from 'react';
import { useNafas } from '@/lib/store';
import { 
  AlertCircle, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  MapPin, 
  TreePine, 
  Clock 
} from 'lucide-react';

interface HeroProps {
  onOpenReportModal: () => void;
  onExploreCampaigns: () => void;
  onExploreMap: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onOpenReportModal,
  onExploreCampaigns,
  onExploreMap
}) => {
  const { t, impactMetrics } = useNafas();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-nafas-limestone via-nafas-limestone to-nafas-mist/30 pt-10 pb-16 lg:py-24 border-b border-nafas-midnight/10">
      {/* Decorative Mesopotamian Breath Waves in the background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
          <path
            d="M-100 200 C 300 120, 600 280, 1000 150 C 1200 80, 1400 220, 1600 180"
            stroke="#D6E2E6"
            strokeWidth="3"
            strokeDasharray="8 8"
          />
          <path
            d="M-50 320 C 350 240, 750 400, 1100 280 C 1300 220, 1500 340, 1650 300"
            stroke="#AAB7F0"
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Narrative Column */}
          <div className="lg:col-span-7 space-y-6 text-right">
            
            {/* Top Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nafas-clay/10 border border-nafas-clay/30 text-nafas-clay-dark text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-nafas-clay animate-pulse"></span>
              <span>نَفَس — نبض بلاد الرافدين</span>
              <span className="text-nafas-neutral-slate/60 text-xs font-mono">• منصة بيئية مجتمعية</span>
            </div>

            {/* Slogan & Title */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-arabic text-nafas-midnight tracking-tight leading-[1.25]">
                خلّي العراق <span className="text-nafas-clay underline decoration-nafas-dawn decoration-wavy decoration-2">يتنفس</span>
              </h1>
              <p className="text-lg sm:text-xl font-bold font-arabic text-nafas-neutral-slate">
                المنظومة التكنولوجية لتحويل الوعي البيئي إلى أثر ميداني موثّق.
              </p>
            </div>

            {/* Natural Iraqi Arabic Narrative Copy */}
            <p className="text-base sm:text-lg text-nafas-neutral-slate/90 leading-relaxed font-arabic max-w-2xl">
              {t.heroSubheadline}
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onOpenReportModal}
                className="px-6 py-3.5 rounded-2xl bg-nafas-clay-dark hover:bg-nafas-clay text-white text-base font-bold flex items-center gap-2.5 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group"
              >
                <AlertCircle className="w-5 h-5 text-nafas-dawn group-hover:rotate-12 transition-transform" />
                <span>{t.reportIssueCta}</span>
              </button>

              <button
                onClick={onExploreCampaigns}
                className="px-6 py-3.5 rounded-2xl bg-nafas-midnight hover:bg-nafas-midnight/90 text-nafas-limestone text-base font-bold flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <Users className="w-5 h-5 text-nafas-clay" />
                <span>{t.joinCampaignCta}</span>
              </button>

              <button
                onClick={onExploreMap}
                className="px-5 py-3.5 rounded-2xl border-2 border-nafas-midnight/20 hover:border-nafas-midnight text-nafas-midnight font-bold text-sm flex items-center gap-2 transition-all duration-200 hover:bg-white/60"
              >
                <MapPin className="w-4 h-4 text-nafas-clay" />
                <span>استكشف الخريطة</span>
              </button>
            </div>

            {/* Live Verified Counters */}
            <div className="pt-6 border-t border-nafas-midnight/10 grid grid-cols-3 gap-4 max-w-lg">
              <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-nafas-midnight/5 shadow-sm text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-nafas-midnight">
                  {impactMetrics.totalResolvedCleanups}
                </div>
                <div className="text-xs text-nafas-neutral-slate font-arabic mt-0.5">
                  موقع تم تنظيفه
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-nafas-midnight/5 shadow-sm text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-nafas-clay">
                  {impactMetrics.totalTreesPlanted}+
                </div>
                <div className="text-xs text-nafas-neutral-slate font-arabic mt-0.5">
                  شتلة مغروسة
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-nafas-midnight/5 shadow-sm text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-nafas-midnight">
                  18
                </div>
                <div className="text-xs text-nafas-neutral-slate font-arabic mt-0.5">
                  محافظة مشمولة
                </div>
              </div>
            </div>

          </div>

          {/* Mesopotamian Animated Geography & Breath Visual */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer Glowing Atmospheric Ring with 6-second breathing motion */}
              <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-nafas-limestone via-white to-nafas-dawn/20 border border-nafas-midnight/10 shadow-xl overflow-hidden animate-breathe">
                
                {/* Visual Label */}
                <div className="flex items-center justify-between pb-4 border-b border-nafas-midnight/10">
                  <div className="flex items-center gap-2 text-xs font-bold text-nafas-midnight">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>الميدان العراقي الحي (تحديث مباشر)</span>
                  </div>
                  <span className="text-[11px] font-mono text-nafas-clay bg-nafas-clay/10 px-2 py-0.5 rounded-full font-bold">
                    روافد دجلة والفرات
                  </span>
                </div>

                {/* Stylized Iraq Map & Atmospheric River Flow SVG */}
                <div className="relative my-4 aspect-[4/3] bg-gradient-to-b from-[#222238]/5 to-[#222238]/10 rounded-2xl flex items-center justify-center p-4 border border-nafas-midnight/10 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
                    {/* Abstract Geographic Outline of Iraq */}
                    <path
                      d="M 90 40 
                         L 180 30 
                         L 280 50 
                         L 330 90 
                         L 310 170 
                         L 360 220 
                         L 310 280 
                         L 240 260 
                         L 150 240 
                         L 70 190 
                         L 60 110 Z"
                      fill="#F7F1E7"
                      stroke="#C66F50"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      opacity="0.9"
                    />

                    {/* Euphrates River (الفرات) */}
                    <path
                      d="M 75 105 Q 140 130 190 170 T 260 215 T 310 260"
                      stroke="#AAB7F0"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Tigris River (دجلة) */}
                    <path
                      d="M 160 35 Q 200 90 225 150 T 265 210 T 310 260"
                      stroke="#2563EB"
                      strokeWidth="4"
                      strokeLinecap="round"
                      opacity="0.8"
                    />

                    {/* Shatt al-Arab Confluence (شط العرب في القرنة) */}
                    <path
                      d="M 310 260 Q 330 275 350 285"
                      stroke="#0D9488"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />

                    {/* Key Strategic Geo Pins */}
                    {/* Mosul */}
                    <g className="cursor-pointer">
                      <circle cx="165" cy="55" r="5" fill="#C66F50" />
                      <circle cx="165" cy="55" r="9" stroke="#C66F50" strokeWidth="1.5" className="animate-ping opacity-60" />
                      <text x="175" y="58" fill="#222238" fontSize="10" fontWeight="bold">الموصل</text>
                    </g>

                    {/* Erbil */}
                    <g className="cursor-pointer">
                      <circle cx="215" cy="65" r="5" fill="#AAB7F0" />
                      <text x="225" y="68" fill="#222238" fontSize="10" fontWeight="bold">أربيل</text>
                    </g>

                    {/* Baghdad */}
                    <g className="cursor-pointer">
                      <circle cx="220" cy="155" r="7" fill="#C66F50" />
                      <circle cx="220" cy="155" r="13" stroke="#C66F50" strokeWidth="2" className="animate-ping opacity-75" />
                      <text x="232" y="159" fill="#222238" fontSize="11" fontWeight="bold">بغداد (المركز)</text>
                    </g>

                    {/* Basra & Marshes */}
                    <g className="cursor-pointer">
                      <circle cx="320" cy="265" r="6" fill="#0D9488" />
                      <circle cx="320" cy="265" r="11" stroke="#0D9488" strokeWidth="1.5" className="animate-ping opacity-60" />
                      <text x="270" y="275" fill="#222238" fontSize="10" fontWeight="bold">البصرة والأهوار</text>
                    </g>
                  </svg>
                </div>

                {/* Micro Live Feed Card */}
                <div className="bg-nafas-midnight text-nafas-limestone p-3 rounded-xl flex items-center justify-between text-xs shadow-inner">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-arabic font-medium">آخر معالجة موثقة: كورنيش الكرادة، بغداد</span>
                  </div>
                  <span className="text-[10px] font-mono text-nafas-dawn">منذ 3 ساعات</span>
                </div>

              </div>

              {/* Floating Pill Accent: Anti-Green Proof */}
              <div className="absolute -bottom-4 -left-3 bg-white px-3.5 py-2 rounded-xl border border-nafas-midnight/15 shadow-lg flex items-center gap-2 text-xs font-bold text-nafas-midnight">
                <Sparkles className="w-4 h-4 text-nafas-clay" />
                <span>نظام بيئي أصيل بروح بلاد الرافدين</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
