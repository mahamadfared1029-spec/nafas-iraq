'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { IRAQ_GOVERNORATES, CATEGORY_INFO } from '@/lib/constants';
import { 
  BarChart3, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  Clock, 
  Sprout, 
  FileCheck, 
  Filter, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

export const PublicImpactDashboard: React.FC = () => {
  const { impactMetrics, reports, campaigns, t } = useNafas();
  const [selectedGov, setSelectedGov] = useState('all');
  const [showMethodology, setShowMethodology] = useState(false);

  // Compute live breakdown
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const inProgressCount = reports.filter(r => r.status === 'in_progress').length;
  const verifiedCount = reports.filter(r => r.status === 'verified').length;
  const underReviewCount = reports.filter(r => r.status === 'under_review' || r.status === 'submitted').length;

  return (
    <section className="py-16 bg-nafas-sand border-b border-nafas-reed/10 font-arabic text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-nafas-reed/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nafas-blue/10 text-nafas-blue text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>ميثاق الشفافية والبيانات الميدانية الحقيقية</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-nafas-silt">
              {t.publicImpactTitle}
            </h2>
            <p className="text-sm text-nafas-neutral-slate mt-1 max-w-2xl">
              {t.publicImpactSubtitle}
            </p>
          </div>

          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="px-4 py-2 rounded-xl bg-nafas-ivory border border-nafas-reed/20 hover:border-nafas-reed text-nafas-silt text-xs font-bold flex items-center gap-2 shadow-sm transition-colors self-start md:self-auto"
          >
            <HelpCircle className="w-4 h-4 text-nafas-blue" />
            <span>منهجية احتساب الأرقام والتدقيق</span>
          </button>
        </div>

        {/* Methodology Box (Toggleable) */}
        {showMethodology && (
          <div className="bg-nafas-ivory p-6 rounded-3xl border-2 border-nafas-blue/30 shadow-md space-y-3 animate-in fade-in">
            <h3 className="text-base font-black text-nafas-silt flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-nafas-blue" />
              <span>كيف نحتسب بيانات الأثر في نَفَس؟</span>
            </h3>
            <ul className="text-xs text-nafas-neutral-slate space-y-2 list-disc list-inside leading-relaxed">
              <li>
                <strong>المواقع المعالجة (Resolved):</strong> لا تُعتبر أي مشكلة بيئية منتهية بمجرد إحالتها للبلدية؛ يُشترط رفع صور ميدانية توثق إزالة الضرر وفحصها من قِبل مشرف بيئي معتمد.
              </li>
              <li>
                <strong>ساعات التطوع المعتمدة:</strong> لا تُحتسب ساعات التطوع تلقائياً بناءً على التسجيل؛ يُشترط تثبيت الحضور الفعلي في موقع الحملة بواسطة منسق الحملة الميداني.
              </li>
              <li>
                <strong>حماية البيانات:</strong> تُحفظ سجلات التدقيق بصورة غير قابلة للتعديل بأثر رجعي مع توقيع إلكتروني يثبت وقت واعتماد كل تحديث.
              </li>
            </ul>
          </div>
        )}

        {/* 4 Hero Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-nafas-ivory p-6 rounded-3xl border border-nafas-reed/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-nafas-neutral-slate">المواقع الموثقة والمعالجة</span>
              <CheckCircle2 className="w-5 h-5 text-nafas-blue" />
            </div>
            <div className="text-4xl font-black font-mono text-nafas-silt">
              {impactMetrics.totalResolvedCleanups}
            </div>
            <div className="text-xs text-nafas-blue font-bold flex items-center gap-1">
              <span>
                {impactMetrics.totalVerifiedIssues > 0
                  ? `نسبة إنجاز ${Math.round((impactMetrics.totalResolvedCleanups / impactMetrics.totalVerifiedIssues) * 100)}% من البلاغات المعتمدة`
                  : 'سجلات ميدانية موثقة'}
              </span>
            </div>
          </div>

          <div className="bg-nafas-ivory p-6 rounded-3xl border border-nafas-reed/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-nafas-neutral-slate">شتلات أصلية مغروسة ومحمية</span>
              <Sprout className="w-5 h-5 text-nafas-blue" />
            </div>
            <div className="text-4xl font-black font-mono text-nafas-blue">
              {impactMetrics.totalTreesPlanted}
            </div>
            <div className="text-xs text-nafas-neutral-slate">
              سدر، نارنج، ونخيل مقاوم للملوحة
            </div>
          </div>

          <div className="bg-nafas-ivory p-6 rounded-3xl border border-nafas-reed/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-nafas-neutral-slate">ساعات العمل الميداني الموثقة</span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-4xl font-black font-mono text-nafas-silt">
              {impactMetrics.totalVolunteerHours}
            </div>
            <div className="text-xs text-nafas-neutral-slate">
              جهد شبابي عراقي في 18 محافظة
            </div>
          </div>

          <div className="bg-nafas-ivory p-6 rounded-3xl border border-nafas-reed/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-nafas-neutral-slate">المتطوعون والمبلغون النشطون</span>
              <Users className="w-5 h-5 text-nafas-silt/70y" />
            </div>
            <div className="text-4xl font-black font-mono text-nafas-silt">
              {impactMetrics.totalActiveVolunteers.toLocaleString('ar-IQ')}
            </div>
            <div className="text-xs text-nafas-blue font-bold">
              حسابات موثقة ومشاركات حقيقية
            </div>
          </div>

        </div>

        {/* Live Lifecycle State Distribution */}
        <div className="bg-nafas-ivory p-6 sm:p-8 rounded-3xl border border-nafas-reed/10 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-nafas-silt flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-nafas-blue" />
              <span>توزيع البلاغات الميدانية الحالية حسب مراحل المعالجة</span>
            </h3>
            <span className="text-xs font-mono text-nafas-neutral-slate">
              إجمالي البلاغات المسجلة: {reports.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            
            <div className="p-4 rounded-2xl bg-gray-50 border border-nafas-reed/30">
              <div className="text-xs text-gray-500 font-bold">قيد المراجعة والتدقيق</div>
              <div className="text-2xl font-black font-mono text-gray-700 mt-1">{underReviewCount}</div>
              <div className="text-[11px] text-gray-400 mt-1">تنسيق أولي مع البلديات</div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="text-xs text-blue-700 font-bold">موثق ميدانياً</div>
              <div className="text-2xl font-black font-mono text-blue-900 mt-1">{verifiedCount}</div>
              <div className="text-[11px] text-blue-600 mt-1">تم تثبيت الموقع والخطورة</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-xs text-amber-700 font-bold">قيد المعالجة الفعلية</div>
              <div className="text-2xl font-black font-mono text-amber-900 mt-1">{inProgressCount}</div>
              <div className="text-[11px] text-amber-600 mt-1">حملات تنظيف جارية</div>
            </div>

            <div className="p-4 rounded-2xl bg-nafas-misty/40 border border-nafas-reed/30">
              <div className="text-xs text-nafas-blue font-bold">معالجة مكتملة بالدليل</div>
              <div className="text-2xl font-black font-mono text-nafas-silt mt-1">{resolvedCount}</div>
              <div className="text-[11px] text-nafas-blue mt-1">صور قبل وبعد موثقة</div>
            </div>

          </div>

          <div className="pt-3 text-[11px] text-nafas-neutral-slate/70 border-t border-nafas-reed/20 flex items-center justify-between">
            <span>{t.transparencyPledge}</span>
            <span className="font-mono">تحديث لحظي: {new Date().toLocaleTimeString('ar-IQ')}</span>
          </div>
        </div>

      </div>
    </section>
  );
};
