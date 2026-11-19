'use client';

import React from 'react';
import { useNafas } from '@/lib/store';
import { IssuedCertificate } from '@/types';
import { 
  UserCircle, 
  Award, 
  Clock, 
  Sprout, 
  AlertCircle, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  ChevronLeft,
  X
} from 'lucide-react';

interface PassportProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCertificate: (cert: IssuedCertificate) => void;
}

export const VolunteerPassport: React.FC<PassportProps> = ({
  isOpen,
  onClose,
  onSelectCertificate
}) => {
  const { passport, t } = useNafas();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-midnight/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-nafas-midnight/15 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-nafas-midnight text-nafas-limestone px-6 py-4 flex items-center justify-between border-b border-white/10">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-black text-lg text-nafas-limestone">
              {t.passportTitle}
            </span>
            <UserCircle className="w-6 h-6 text-nafas-clay" />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          
          {/* Passport Identity Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-nafas-limestone via-white to-nafas-mist/40 border border-nafas-midnight/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-nafas-midnight text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-nafas-clay">
                {passport.userName.charAt(0)}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-nafas-midnight">
                  {passport.userName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-nafas-neutral-slate">
                  <span className="bg-nafas-clay/10 text-nafas-clay-dark px-2 py-0.5 rounded font-bold">
                    متطوع بيئي موثّق
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-gray-500">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    {passport.userPhoneMasked}
                  </span>
                </div>
              </div>
            </div>

            {/* Impact Points Counter */}
            <div className="text-center bg-white px-5 py-3 rounded-2xl border border-nafas-midnight/10 shadow-sm">
              <span className="text-xs text-nafas-neutral-slate font-bold block">
                رصيد نقاط الأثر (الموثقة)
              </span>
              <span className="text-3xl font-black font-mono text-nafas-clay">
                {passport.points}
              </span>
              <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">
                مؤهل للمكافآت المجتمعية
              </span>
            </div>
          </div>

          {/* 4 Core Quantitative Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-nafas-limestone p-4 rounded-2xl border border-nafas-midnight/10 text-center">
              <Clock className="w-5 h-5 text-nafas-clay mx-auto mb-1.5" />
              <div className="text-2xl font-black font-mono text-nafas-midnight">
                {passport.verifiedHours}
              </div>
              <div className="text-xs text-nafas-neutral-slate font-arabic mt-0.5">
                ساعة تطوع معتمدة
              </div>
            </div>

            <div className="bg-nafas-limestone p-4 rounded-2xl border border-nafas-midnight/10 text-center">
              <Award className="w-5 h-5 text-nafas-dawn mx-auto mb-1.5" />
              <div className="text-2xl font-black font-mono text-nafas-midnight">
                {passport.completedCampaignsCount}
              </div>
              <div className="text-xs text-nafas-neutral-slate font-arabic mt-0.5">
                حملات مكتملة
              </div>
            </div>

            <div className="bg-nafas-limestone p-4 rounded-2xl border border-nafas-midnight/10 text-center">
              <Sprout className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
              <div className="text-2xl font-black font-mono text-nafas-clay">
                {passport.treesPlantedCount}
              </div>
              <div className="text-xs text-nafas-neutral-slate font-arabic mt-0.5">
                شتلة مغروسة
              </div>
            </div>

            <div className="bg-nafas-limestone p-4 rounded-2xl border border-nafas-midnight/10 text-center">
              <ShieldCheck className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
              <div className="text-2xl font-black font-mono text-nafas-midnight">
                {passport.verifiedReportsCount}
              </div>
              <div className="text-xs text-nafas-neutral-slate font-arabic mt-0.5">
                بلاغات تمت معالجتها
              </div>
            </div>
          </div>

          {/* Earned Civic Badges */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-nafas-midnight">
              <Sparkles className="w-4 h-4 text-nafas-clay" />
              <span>الأوسمة البيئية المكتسبة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {passport.badges.map(b => (
                <div key={b.id} className="p-3.5 rounded-2xl bg-white border border-nafas-midnight/10 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-nafas-clay/10 text-nafas-clay flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-nafas-midnight">{b.nameAr}</div>
                    <div className="text-[10px] text-nafas-neutral-slate/70 font-mono">منذ {b.earnedDate}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Earned Certificates List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-nafas-midnight">
              <Award className="w-4 h-4 text-nafas-dawn" />
              <span>الشهادات المعتمدة برمز QR ({passport.certificates.length})</span>
            </div>

            <div className="space-y-2">
              {passport.certificates.map(cert => (
                <div
                  key={cert.id}
                  onClick={() => onSelectCertificate(cert)}
                  className="p-4 rounded-2xl bg-nafas-limestone border border-nafas-midnight/10 hover:border-nafas-clay transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-nafas-clay bg-nafas-clay/10 px-2 py-0.5 rounded">
                        {cert.verificationCode}
                      </span>
                      <span className="font-bold text-sm text-nafas-midnight group-hover:text-nafas-clay transition-colors">
                        {cert.campaignTitle}
                      </span>
                    </div>
                    <div className="text-xs text-nafas-neutral-slate">
                      {cert.hoursAwarded} ساعات موثقة • تاريخ الإصدار: {cert.issueDate}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-nafas-clay flex items-center gap-1 group-hover:underline">
                    <span>عرض الشهادة</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anti-Farming & Privacy Transparency Note */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-nafas-neutral-slate space-y-1">
            <div className="font-bold text-nafas-midnight flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>سياسة نزاهة النقاط والشهادات</span>
            </div>
            <p className="leading-relaxed">
              تُمنح النقاط والشهادات حصرياً بعد التحقق الميداني واعتماد منسق الحملة أو المشرف البيئي، لمنع التلاعب وحماية مصداقية المشاركة المجتمعية في العراق.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
