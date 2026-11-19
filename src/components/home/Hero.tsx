'use client';

import React from 'react';
import { useNafas } from '@/lib/store';
import { 
  AlertCircle, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  MapPin, 
  Sprout, 
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
    <section className="relative overflow-hidden bg-nafas-sand pt-10 pb-16 lg:py-24 border-b border-nafas-reed/30">
      {/* Decorative Mesopotamian Breath Waves in the background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
          <path
            d="M-100 200 C 300 120, 600 280, 1000 150 C 1200 80, 1400 220, 1600 180"
            stroke="#D8E8ED"
            strokeWidth="3"
            strokeDasharray="8 8"
          />
          <path
            d="M-50 320 C 350 240, 750 400, 1100 280 C 1300 220, 1500 340, 1650 300"
            stroke="#C8B68D"
            strokeWidth="2"
            opacity="0.5"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Narrative Column */}
          <div className="lg:col-span-7 space-y-6 text-right">
            
            {/* Top Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nafas-misty border border-nafas-blue/30 text-nafas-silt text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-nafas-blue animate-pulse"></span>
              <span>نَفَس — نبض بلاد الرافدين</span>
              <span className="text-nafas-silt/60 text-xs font-mono">• منصة بيئية مجتمعية</span>
            </div>

            {/* Slogan & Title */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-arabic text-nafas-silt tracking-tight leading-[1.25]">
                خلّي العراق <span className="text-nafas-blue underline decoration-nafas-reed decoration-wavy decoration-2">يتنفس</span>
              </h1>
              <p className="text-lg sm:text-xl font-bold font-arabic text-nafas-silt/90">
                المنظومة التكنولوجية لتحويل الوعي البيئي إلى أثر ميداني موثّق.
              </p>
            </div>

            {/* Natural Iraqi Arabic Narrative Copy */}
            <p className="text-base sm:text-lg text-nafas-silt/85 leading-relaxed font-arabic max-w-2xl">
              {t.heroSubheadline}
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onOpenReportModal}
                className="px-6 py-3.5 rounded-2xl bg-nafas-blue hover:bg-nafas-blue-dark text-nafas-ivory text-base font-bold flex items-center gap-2.5 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group"
              >
                <AlertCircle className="w-5 h-5 text-nafas-ivory group-hover:rotate-12 transition-transform" />
                <span>{t.reportIssueCta}</span>
              </button>

              <button
                onClick={onExploreCampaigns}
                className="px-6 py-3.5 rounded-2xl bg-nafas-ivory hover:bg-white text-nafas-silt border border-nafas-reed text-base font-bold flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <Users className="w-5 h-5 text-nafas-blue" />
                <span>{t.joinCampaignCta}</span>
              </button>

              <button
                onClick={onExploreMap}
                className="px-5 py-3.5 rounded-2xl border-2 border-nafas-blue/30 hover:border-nafas-blue text-nafas-blue font-bold text-sm flex items-center gap-2 transition-all duration-200 hover:bg-nafas-misty/30"
              >
                <MapPin className="w-4 h-4 text-nafas-blue" />
                <span>استكشف الخريطة</span>
              </button>
            </div>

            {/* Live Verified Counters */}
            <div className="pt-6 border-t border-nafas-reed/30 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-nafas-ivory border border-nafas-reed/30 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-nafas-silt/70 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-nafas-blue" />
                  <span>بلاغات معالجة</span>
                </div>
                <div className="text-2xl font-black font-mono text-nafas-blue mt-1">
                  {impactMetrics.totalResolvedCleanups}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-nafas-ivory border border-nafas-reed/30 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-nafas-silt/70 font-medium">
                  <Users className="w-4 h-4 text-nafas-blue" />
                  <span>متطوع موثّق</span>
                </div>
                <div className="text-2xl font-black font-mono text-nafas-blue mt-1">
                  {impactMetrics.totalActiveVolunteers}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-nafas-ivory border border-nafas-reed/30 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-nafas-silt/70 font-medium">
                  <Sprout className="w-4 h-4 text-nafas-blue" />
                  <span>شجرة مزروعة</span>
                </div>
                <div className="text-2xl font-black font-mono text-nafas-blue mt-1">
                  {impactMetrics.totalTreesPlanted}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-nafas-ivory border border-nafas-reed/30 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-nafas-silt/70 font-medium">
                  <Clock className="w-4 h-4 text-nafas-blue" />
                  <span>ساعات تطوع</span>
                </div>
                <div className="text-2xl font-black font-mono text-nafas-blue mt-1">
                  {impactMetrics.totalVolunteerHours}
                </div>
              </div>
            </div>

          </div>

          {/* Mesopotamian River & Action Visual Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer decorative breathing ring */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-nafas-misty via-transparent to-nafas-reed/20 blur-xl opacity-60 animate-breathe pointer-events-none" />

              {/* Main Card */}
              <div className="relative rounded-3xl bg-nafas-ivory border border-nafas-reed/40 shadow-xl overflow-hidden p-6 space-y-4">
                
                {/* Header of the visual */}
                <div className="flex items-center justify-between border-b border-nafas-reed/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-nafas-blue animate-ping" />
                    <span className="font-arabic font-bold text-sm text-nafas-silt">
                      حركة نهري دجلة والفرات
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-nafas-misty text-nafas-silt">
                    18 محافظة مغطاة
                  </span>
                </div>

                {/* SVG Mesopotamian Cartography Concept */}
                <div className="relative h-64 sm:h-72 w-full rounded-2xl bg-nafas-sand/60 flex items-center justify-center p-4 border border-nafas-reed/30 overflow-hidden">
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
                      fill="#FFFCF5"
                      stroke="#C8B68D"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      opacity="0.9"
                    />

                    {/* Euphrates River (الفرات) */}
                    <path
                      d="M 75 105 Q 140 130 190 170 T 260 215 T 310 260"
                      stroke="#D8E8ED"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    {/* Tigris River (دجلة) */}
                    <path
                      d="M 160 35 Q 200 90 225 150 T 265 210 T 310 260"
                      stroke="#28566E"
                      strokeWidth="4"
                      strokeLinecap="round"
                      opacity="0.9"
                    />

                    {/* Shatt al-Arab Confluence (شط العرب في القرنة) */}
                    <path
                      d="M 310 260 Q 330 275 350 285"
                      stroke="#1d4154"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />

                    {/* Key Strategic Geo Pins */}
                    {/* Mosul */}
                    <g className="cursor-pointer">
                      <circle cx="165" cy="55" r="5" fill="#28566E" />
                      <circle cx="165" cy="55" r="9" stroke="#28566E" strokeWidth="1.5" className="animate-ping opacity-60" />
                      <text x="175" y="58" fill="#302D29" fontSize="10" fontWeight="bold">الموصل</text>
                    </g>

                    {/* Erbil */}
                    <g className="cursor-pointer">
                      <circle cx="215" cy="65" r="5" fill="#C8B68D" />
                      <text x="225" y="68" fill="#302D29" fontSize="10" fontWeight="bold">أربيل</text>
                    </g>

                    {/* Baghdad */}
                    <g className="cursor-pointer">
                      <circle cx="220" cy="155" r="7" fill="#28566E" />
                      <circle cx="220" cy="155" r="13" stroke="#28566E" strokeWidth="2" className="animate-ping opacity-75" />
                      <text x="232" y="159" fill="#302D29" fontSize="11" fontWeight="bold">بغداد (المركز)</text>
                    </g>

                    {/* Basra & Marshes */}
                    <g className="cursor-pointer">
                      <circle cx="320" cy="265" r="6" fill="#28566E" />
                      <circle cx="320" cy="265" r="11" stroke="#28566E" strokeWidth="1.5" className="animate-ping opacity-60" />
                      <text x="270" y="275" fill="#302D29" fontSize="10" fontWeight="bold">البصرة والأهوار</text>
                    </g>
                  </svg>
                </div>

                {/* Micro Live Feed Card */}
                <div className="bg-nafas-silt text-nafas-ivory p-3 rounded-xl flex items-center justify-between text-xs shadow-inner">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nafas-misty" />
                    <span className="font-arabic font-medium">آخر معالجة موثقة: كورنيش الكرادة، بغداد</span>
                  </div>
                  <span className="text-[10px] font-mono text-nafas-misty">منذ 3 ساعات</span>
                </div>

              </div>

              {/* Floating Pill Accent */}
              <div className="absolute -bottom-4 -left-3 bg-nafas-ivory px-3.5 py-2 rounded-xl border border-nafas-reed/40 shadow-lg flex items-center gap-2 text-xs font-bold text-nafas-silt">
                <Sparkles className="w-4 h-4 text-nafas-blue" />
                <span>نظام بيئي أصيل بروح بلاد الرافدين</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
