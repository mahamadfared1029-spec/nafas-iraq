'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { HERITAGE_CHAPTERS } from '@/lib/constants';
import { BookOpen, Sparkles, MapPin, Feather, Landmark, Waves, ChevronLeft, ChevronRight } from 'lucide-react';

export const HeritageAtlas: React.FC = () => {
  const { t } = useNafas();
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  const activeChapter = HERITAGE_CHAPTERS[activeChapterIndex] || HERITAGE_CHAPTERS[0];

  return (
    <section className="py-20 bg-[#222238] text-nafas-limestone relative overflow-hidden font-arabic text-right">
      {/* Mesopotamian Clay Tablet Geometric Motifs in Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 800 800" fill="none">
          <pattern id="clayGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 40 M 0 0 L 40 40" stroke="#C66F50" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#clayGrid)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        
        {/* Editorial Title & Concept */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-nafas-clay/20 border border-nafas-clay/40 text-nafas-dawn text-xs font-bold">
            <Feather className="w-3.5 h-3.5 text-nafas-clay" />
            <span>المكتبة التراثية والبيئية الرقمية</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {t.heritageTitle}
          </h2>

          <p className="text-sm sm:text-base text-nafas-mist/80 max-w-2xl mx-auto leading-relaxed">
            {t.heritageSubtitle}
          </p>
        </div>

        {/* Chapter Navigation Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {HERITAGE_CHAPTERS.map((chap, idx) => (
            <button
              key={chap.id}
              onClick={() => setActiveChapterIndex(idx)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeChapterIndex === idx
                  ? 'bg-nafas-clay text-white shadow-lg scale-105'
                  : 'bg-white/10 text-nafas-mist hover:bg-white/15'
              }`}
            >
              {chap.titleAr.split('—')[0]}
            </button>
          ))}
        </div>

        {/* Archival Editorial Book View */}
        <div className="bg-[#2D2D44] border-2 border-nafas-clay/30 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Visual Archetype & Quote Column */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="p-6 rounded-2xl bg-[#222238] border border-nafas-clay/30 space-y-4 shadow-inner">
                <div className="flex items-center gap-2 text-nafas-dawn text-xs font-bold">
                  <Landmark className="w-4 h-4 text-nafas-clay" />
                  <span>المعلم التاريخي:</span>
                </div>
                <div className="text-lg font-bold text-white leading-snug">
                  {activeChapter.historicalLandmark}
                </div>
                <p className="text-xs text-nafas-mist/80 leading-relaxed">
                  {activeChapter.naturalHeritage}
                </p>
              </div>

              {/* Historical Sourced Inscription / Quote */}
              <div className="p-5 rounded-2xl bg-nafas-clay/15 border-r-4 border-nafas-clay space-y-2">
                <span className="text-[11px] text-nafas-dawn font-mono font-bold block">
                  شاهدٌ من التاريخ:
                </span>
                <blockquote className="text-sm italic font-serif text-white/90 leading-relaxed">
                  {activeChapter.historicalQuote}
                </blockquote>
              </div>

            </div>

            {/* In-depth Narrative Column */}
            <div className="lg:col-span-7 space-y-6">
              
              <div>
                <span className="text-xs font-mono font-bold text-nafas-dawn uppercase tracking-wider block mb-1">
                  فصل من ذاكرة المياه والأرض
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {activeChapter.titleAr}
                </h3>
              </div>

              {/* Traditional Ecology */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-nafas-clay flex items-center gap-1.5">
                  <Waves className="w-4 h-4" />
                  <span>التعايش البيئي التقليدي (5000 عام من التوازن):</span>
                </div>
                <p className="text-xs sm:text-sm text-nafas-mist/90 leading-relaxed">
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
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/30 space-y-1 text-xs">
                <span className="font-bold text-emerald-300 block">أفق الحماية المجتمعية:</span>
                <p className="text-emerald-200/90 leading-relaxed">
                  {activeChapter.conservationHope}
                </p>
              </div>

              {/* Chapter Pager Controls */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  disabled={activeChapterIndex === 0}
                  onClick={() => setActiveChapterIndex(prev => prev - 1)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>الفصل السابق</span>
                </button>

                <span className="text-xs font-mono text-nafas-mist/60">
                  {activeChapterIndex + 1} من {HERITAGE_CHAPTERS.length}
                </span>

                <button
                  disabled={activeChapterIndex === HERITAGE_CHAPTERS.length - 1}
                  onClick={() => setActiveChapterIndex(prev => prev + 1)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span>الفصل التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
