'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Home,
  MapPin,
  Box,
  Users,
  BarChart3,
  Sprout,
  BookOpen,
  HeartHandshake,
  Sparkles,
  Award,
  AlertCircle,
  HelpCircle,
  Lock,
  ChevronLeft
} from 'lucide-react';

export interface SearchableSection {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  actionType: 'view' | 'report' | 'passport' | 'help' | 'locked';
  badge?: string;
}

interface SectionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (viewId: string) => void;
  onOpenReport: () => void;
  onOpenPassport: () => void;
  onOpenHelp: () => void;
}

const SECTIONS: SearchableSection[] = [
  {
    id: 'home',
    title: 'الرئيسية',
    subtitle: 'الواجهة الرئيسية وبوابات منصة نَفَس',
    keywords: ['رئيسية', 'بداية', 'home', 'بوابات'],
    icon: Home,
    actionType: 'view'
  },
  {
    id: 'map',
    title: 'الخريطة البيئية للعراق',
    subtitle: 'خريطة الأنهار والمحافظات وبلاغات التلوث',
    keywords: ['خريطة', 'عراق', 'دجلة', 'الفرات', 'تلوث', 'مواقع', 'map'],
    icon: MapPin,
    actionType: 'view'
  },
  {
    id: 'map-3d',
    title: 'خريطة العراق 3D',
    subtitle: 'مجسم تضاريس العراق ثلاثي الأبعاد',
    keywords: ['خريطة', '3d', 'ثلاثي', 'مجسم', 'تضاريس'],
    icon: Box,
    actionType: 'view'
  },
  {
    id: 'campaigns',
    title: 'الحملات التطوعية',
    subtitle: 'تصفح حملات التشجير والتنظيف وسجّل للمشاركة',
    keywords: ['حملات', 'تطوع', 'تنظيف', 'تشجير', 'شهادة', 'campaigns'],
    icon: Users,
    actionType: 'view'
  },
  {
    id: 'clinic',
    title: 'الصيدلية النباتية',
    subtitle: 'دليل النباتات الآمنة والسامة وتشخيص مشاكل النبات',
    keywords: ['صيدلية', 'نبات', 'زراعة', 'تسمم', 'اسعاف', 'علاج', 'آفات', 'clinic'],
    icon: HeartHandshake,
    actionType: 'view'
  },
  {
    id: 'orchid-3d',
    title: 'مجسم الأوركيد 3D',
    subtitle: 'استكشاف الزهرة من الخارج والداخل والعمليات الداخلية',
    keywords: ['أوركيد', 'اوركيد', '3d', 'زهرة', 'تشريح', 'عمليات', 'orchid'],
    icon: Sparkles,
    actionType: 'view'
  },
  {
    id: 'planting',
    title: 'التوعية والتشجير',
    subtitle: 'دليل الأشجار الأصيلة وتقويم الزراعة العراقي',
    keywords: ['تشجير', 'اشجار', 'زراعة', 'نخيل', 'سدر', 'تقويم', 'planting'],
    icon: Sprout,
    actionType: 'view'
  },
  {
    id: 'atlas',
    title: 'تراث العراق البيئي',
    subtitle: 'أهوار الجنوب وبابل وأور وتاريخ وادي الرافدين',
    keywords: ['تراث', 'اطلس', 'أطلس', 'أهوار', 'بابل', 'أور', 'atlas'],
    icon: BookOpen,
    actionType: 'view'
  },
  {
    id: 'impact',
    title: 'أثر نَفَس والشفافية',
    subtitle: 'إحصائيات الأثر البيئي الموثق ومقارنات قبل وبعد',
    keywords: ['أثر', 'اثر', 'احصائيات', 'شفافية', 'قبل وبعد', 'impact'],
    icon: BarChart3,
    actionType: 'view'
  },
  {
    id: 'report',
    title: 'بلّغ عن انتهاك بيئي',
    subtitle: 'إرسال بلاغ ميداني موثق بالموقع والصورة',
    keywords: ['بلاغ', 'ابلاغ', 'تبليغ', 'انتهاك', 'مخالفة', 'حرق', 'نفايات', 'report'],
    icon: AlertCircle,
    actionType: 'report'
  },
  {
    id: 'passport',
    title: 'جواز المتطوع والشهادات',
    subtitle: 'رصيد الساعات التطوعية والأوسمة والشهادات المعتمدة',
    keywords: ['جواز', 'متطوع', 'شهادة', 'شهادات', 'نقاط', 'ساعات', 'passport'],
    icon: Award,
    actionType: 'passport'
  },
  {
    id: 'help',
    title: 'مركز المساعدة والدعم',
    subtitle: 'الأسئلة الشائعة والتواصل المباشر مع الدعم',
    keywords: ['مساعدة', 'دعم', 'تواصل', 'رسالة', 'مشكلة', 'ايميل', 'help', 'support'],
    icon: HelpCircle,
    actionType: 'help'
  },
  {
    id: 'rewards',
    title: 'الشراكات والهدايا',
    subtitle: 'مغلق حالياً — سيتم افتتاحه قريباً',
    keywords: ['شراكات', 'شركاء', 'هدايا', 'مكافآت', 'خصومات', 'rewards'],
    icon: Lock,
    actionType: 'locked',
    badge: 'قريباً'
  }
];

export const SectionSearchModal: React.FC<SectionSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onOpenReport,
  onOpenPassport,
  onOpenHelp
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();
  const results = trimmed
    ? SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(trimmed) ||
          s.subtitle.toLowerCase().includes(trimmed) ||
          s.keywords.some((k) => k.toLowerCase().includes(trimmed))
      )
    : SECTIONS;

  const handleSelect = (section: SearchableSection) => {
    if (section.actionType === 'locked') return;
    onClose();
    if (section.actionType === 'view') {
      onSelectView(section.id);
    } else if (section.actionType === 'report') {
      onOpenReport();
    } else if (section.actionType === 'passport') {
      onOpenPassport();
    } else if (section.actionType === 'help') {
      onOpenHelp();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-nafas-silt/65 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-nafas-ivory rounded-3xl shadow-2xl border border-nafas-reed/30 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
        aria-label="البحث عن أقسام منصة نَفَس"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="p-4 border-b border-nafas-reed/20 bg-white flex items-center gap-3">
          <Search className="w-5 h-5 text-nafas-blue shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن أي قسم (مثال: الصيدلية، الخريطة، الحملات، مركز المساعدة...)"
            className="flex-1 text-sm text-nafas-silt bg-transparent outline-none placeholder:text-stone-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              aria-label="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold"
          >
            إغلاق
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1.5">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-stone-500">
              لا توجد أقسام مطابقة لـ "{query}". جرب كلمات مثل: الخريطة، الصيدلية، الحملات، المساعدة.
            </div>
          ) : (
            results.map((section) => {
              const Icon = section.icon;
              const isLocked = section.actionType === 'locked';
              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSelect(section)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-right transition-all ${
                    isLocked
                      ? 'bg-stone-100/80 text-stone-400 cursor-not-allowed opacity-75'
                      : 'hover:bg-nafas-misty/40 text-nafas-silt cursor-pointer group'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isLocked
                          ? 'bg-stone-200 border-stone-300 text-stone-500'
                          : 'bg-white border-nafas-reed/25 text-nafas-blue group-hover:border-nafas-blue/40'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">{section.title}</span>
                        {section.badge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 truncate">{section.subtitle}</p>
                    </div>
                  </div>
                  {!isLocked && (
                    <ChevronLeft className="w-4 h-4 text-stone-400 group-hover:text-nafas-blue shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
