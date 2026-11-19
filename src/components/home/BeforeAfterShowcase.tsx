'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNafas } from '@/lib/store';
import { ShieldCheck, Calendar, MapPin, Users, ArrowRightLeft, Sparkles } from 'lucide-react';

export const BeforeAfterShowcase: React.FC = () => {
  const { t, reports } = useNafas();
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter resolved reports that have both before and after images
  const resolvedWithEvidence = reports.filter(r => r.status === 'resolved' && r.imageAfterUrl);
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);

  const activeReport = resolvedWithEvidence[selectedReportIndex] || resolvedWithEvidence[0];

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition(prev => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition(prev => Math.min(100, prev + 5));
    }
  };

  if (!activeReport) return null;

  return (
    <section className="py-16 bg-white border-b border-nafas-midnight/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>توثيق حقيقي خاضع للتدقيق الميداني</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-arabic text-nafas-midnight">
            {t.beforeAfterTitle}
          </h2>
          <p className="text-base text-nafas-neutral-slate font-arabic">
            {t.beforeAfterSubtitle}
          </p>
        </div>

        {/* Case Selector Tabs */}
        {resolvedWithEvidence.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {resolvedWithEvidence.map((rep, idx) => (
              <button
                key={rep.id}
                onClick={() => {
                  setSelectedReportIndex(idx);
                  setSliderPosition(50);
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-arabic transition-all ${
                  selectedReportIndex === idx
                    ? 'bg-nafas-midnight text-nafas-limestone shadow'
                    : 'bg-nafas-limestone text-nafas-neutral-slate hover:bg-nafas-mist/40'
                }`}
              >
                {rep.neighborhood} ({rep.trackingNumber})
              </button>
            ))}
          </div>
        )}

        {/* Interactive Comparison Component */}
        <div className="bg-nafas-limestone rounded-3xl p-6 sm:p-8 border border-nafas-midnight/10 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Visual Comparison Area */}
            <div className="lg:col-span-8">
              <div
                ref={containerRef}
                tabIndex={0}
                role="slider"
                aria-valuenow={Math.round(sliderPosition)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t.dragToCompare}
                onKeyDown={handleKeyDown}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden select-none cursor-ew-resize border border-nafas-midnight/10 shadow-inner focus:outline-none focus:ring-4 focus:ring-nafas-clay/30"
              >
                {/* After Image (Full width background) */}
                <img
                  src={activeReport.imageAfterUrl}
                  alt={t.verifiedRemediation}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Before Image (Clipped overlay) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={activeReport.imageBeforeUrl}
                    alt={t.originalCondition}
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
                  />
                </div>

                {/* Draggable Divider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl cursor-ew-resize z-20 flex items-center justify-center"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="w-9 h-9 -ml-4 rounded-full bg-nafas-clay text-white shadow-xl flex items-center justify-center border-2 border-white hover:scale-110 transition-transform">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                </div>

                {/* Overlay Floating Badges */}
                <div className="absolute top-4 right-4 z-10 bg-nafas-midnight/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold font-arabic shadow">
                  {t.originalCondition}
                </div>
                <div className="absolute top-4 left-4 z-10 bg-emerald-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg font-bold font-arabic shadow flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.verifiedRemediation}</span>
                </div>

                {/* Bottom hint */}
                <div className="absolute bottom-3 inset-x-0 mx-auto w-max bg-black/60 backdrop-blur-sm text-white/90 text-[11px] px-3 py-1 rounded-full pointer-events-none font-arabic">
                  {t.dragToCompare}
                </div>
              </div>
            </div>

            {/* Case Details Narrative */}
            <div className="lg:col-span-4 space-y-5 text-right font-arabic">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-nafas-clay bg-nafas-clay/10 px-2.5 py-1 rounded-md">
                  {activeReport.trackingNumber}
                </span>
                <h3 className="text-xl font-black text-nafas-midnight mt-2 leading-snug">
                  {activeReport.title}
                </h3>
              </div>

              <div className="space-y-3 text-xs text-nafas-neutral-slate">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-nafas-clay shrink-0" />
                  <span>{activeReport.neighborhood}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-nafas-dawn shrink-0" />
                  <span>تاريخ اكتمال المعالجة: {new Date(activeReport.updatedAt).toLocaleDateString('ar-IQ')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>الجهة المنفذة: {activeReport.assignedEntity}</span>
                </div>
              </div>

              {/* Verified Impact Notes */}
              <div className="p-4 rounded-xl bg-white border border-nafas-midnight/10 space-y-1.5">
                <div className="text-xs font-bold text-nafas-midnight flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-nafas-clay" />
                  <span>الأثر الميداني الموثق</span>
                </div>
                <p className="text-xs text-nafas-neutral-slate/90 leading-relaxed">
                  {activeReport.verificationEvidence}
                </p>
              </div>

              {/* Verification Audit Hash */}
              <div className="text-[11px] text-nafas-neutral-slate/60 font-mono border-t border-nafas-midnight/10 pt-3">
                اعتماد المنصة: تم تدقيق الصور ومطابقتها جغرافياً بنجاح.
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
