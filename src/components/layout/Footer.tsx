'use client';

import React from 'react';
import { NafasLogo } from '@/components/brand/NafasLogo';
import { useNafas } from '@/lib/store';
import { ShieldCheck, Heart, Droplets, PhoneCall, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useNafas();

  return (
    <footer className="bg-nafas-midnight text-nafas-limestone border-t-4 border-nafas-clay pt-16 pb-12 relative overflow-hidden">
      {/* Decorative Mesopotamian river waves SVG in background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
          <path d="M0 150 C 300 50, 700 250, 1000 150 L 1000 300 L 0 300 Z" fill="#C66F50" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <NafasLogo size="lg" className="[&_span]:text-white [&_span.text-nafas-clay]:text-nafas-dawn [&_span.text-nafas-clay-dark]:text-nafas-mist" />
            <p className="text-sm text-nafas-mist/80 leading-relaxed font-arabic">
              منصة تكنولوجيا مدنية بيئية مستقلة ولدت في العراق. نحول الوعي البيئي إلى أثر ميداني موثّق، لنحمي دجلة والفرات ونعيد إحياء أرض الرافدين بسواعد أهلها.
            </p>
            <div className="flex items-center gap-2 text-xs text-nafas-dawn font-semibold">
              <Sparkles className="w-4 h-4 text-nafas-clay" />
              <span>نبض بلاد الرافدين — خلّي العراق يتنفس</span>
            </div>
          </div>

          {/* Emergency Safety Protocol */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-nafas-clay">
              <PhoneCall className="w-4 h-4" />
              <span>بروتوكول الطوارئ والسلامة</span>
            </div>
            <p className="text-xs text-nafas-mist/70 leading-relaxed font-arabic">
              في حالات المواد الكيميائية السامة، النفايات الطبية الحادة، الأسلاك الكهربائية المتدلية، أو الحرائق النشطة:
            </p>
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs space-y-1.5 text-red-200">
              <div className="font-bold flex items-center justify-between">
                <span>الدفاع المدني العراقي:</span>
                <span className="font-mono text-sm bg-red-800/60 px-2 py-0.5 rounded text-white font-black">115</span>
              </div>
              <p className="text-[11px] text-red-300">يُمنع اقتراب المتطوعين أو ملامسة المواد غير المحددة قطعياً.</p>
            </div>
          </div>

          {/* Pillars of NAFAS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-nafas-dawn">
              <Droplets className="w-4 h-4" />
              <span>ركائز نَفَس البيئية</span>
            </div>
            <ul className="text-xs text-nafas-mist/80 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-nafas-clay"></span>
                <span>خريطة تفاعلية تغطي كافة محافظات العراق (18)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-nafas-clay"></span>
                <span>توثيق الأدلة بالصور الميدانية (قبل وبعد)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-nafas-clay"></span>
                <span>شهادات تطوع رسمية برمز تحقق رقمي QR</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-nafas-clay"></span>
                <span>دليل زراعي موسمي للنباتات والأشجار الأصيلة</span>
              </li>
            </ul>
          </div>

          {/* Transparency & Governance */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-nafas-mist">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>الشفافية والخصوصية</span>
            </div>
            <p className="text-xs text-nafas-mist/70 leading-relaxed font-arabic">
              بيانات المتطوعين وأرقام هواتفهم مشفرة وغير قابلة للعرض العام. إحصائيات الأثر مستخرجة مباشرة من سجل العمليات الميدانية دون أرقام مفبركة.
            </p>
            <div className="text-[11px] text-nafas-mist/50 pt-2 border-t border-white/5">
              منصة مجتمعية مفتوحة المصدر وموجهة لخدمة الصالح العام في العراق.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-nafas-mist/60 gap-4">
          <div className="flex items-center gap-1 font-arabic">
            <span>صُنعت بمحبة في بغداد والعراق</span>
            <Heart className="w-3.5 h-3.5 text-nafas-clay fill-nafas-clay inline" />
            <span>— نَفَس © 2026</span>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <span className="hover:text-nafas-limestone cursor-pointer transition-colors">ميثاق الأثر والشفافية</span>
            <span className="hover:text-nafas-limestone cursor-pointer transition-colors">سياسة الخصوصية وحماية البيانات</span>
            <span className="hover:text-nafas-limestone cursor-pointer transition-colors">دليل المتطوع والمنسق</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
