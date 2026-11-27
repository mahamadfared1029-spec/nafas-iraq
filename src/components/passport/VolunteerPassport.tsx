'use client';

import React, { useState, useEffect } from 'react';
import { useNafas } from '@/lib/store';
import { IssuedCertificate, UserRegistration } from '@/types';
import { nafasCampaigns } from '@/lib/campaigns/campaignService';
import { nafasAuth } from '@/lib/auth/authService';
import { 
  UserCircle, 
  Award, 
  Clock, 
  Sprout, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  ChevronLeft,
  X,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle
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
  const { passport, campaigns, userRegisteredCampaignIds, cancelCampaignRegistration, t } = useNafas();
  const [activeTab, setActiveTab] = useState<'overview' | 'registered' | 'certificates'>('overview');
  const [liveRegistrations, setLiveRegistrations] = useState<UserRegistration[]>([]);
  const [liveCertificates, setLiveCertificates] = useState<IssuedCertificate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && nafasAuth.isAuthenticated()) {
      setLoading(true);
      Promise.all([
        nafasCampaigns.getUserRegistrations(),
        nafasCampaigns.getUserCertificates()
      ]).then(([regs, certs]) => {
        if (regs) setLiveRegistrations(regs);
        if (certs && certs.length > 0) setLiveCertificates(certs);
      }).catch(err => {
        console.warn('Passport sync notice:', err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Registered upcoming campaigns
  const upcomingRegisteredCampaigns = campaigns.filter(c => 
    userRegisteredCampaignIds.includes(c.id)
  );

  // Use live certificates if available, otherwise store certificates
  const displayCertificates = liveCertificates.length > 0 ? liveCertificates : passport.certificates;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="relative bg-nafas-ivory w-full max-w-3xl rounded-3xl shadow-2xl border border-nafas-reed/20 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-nafas-silt text-nafas-limestone px-6 py-4 flex items-center justify-between border-b border-white/10">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-black text-lg text-white">
              جواز نَفَس التطوعي — السجل البيئي الموثّق
            </span>
            <UserCircle className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-nafas-reed/15 bg-nafas-sand/50 px-6 pt-3 text-xs font-bold gap-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-nafas-blue text-nafas-blue'
                : 'border-transparent text-nafas-neutral-slate hover:text-nafas-silt'
            }`}
          >
            نظرة عامة والأثر الميداني
          </button>

          <button
            onClick={() => setActiveTab('registered')}
            className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'registered'
                ? 'border-nafas-blue text-nafas-blue'
                : 'border-transparent text-nafas-neutral-slate hover:text-nafas-silt'
            }`}
          >
            <span>الحملات المسجلة القادمة</span>
            <span className="bg-nafas-blue/10 text-nafas-blue px-2 py-0.5 rounded-full text-[10px]">
              {upcomingRegisteredCampaigns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'certificates'
                ? 'border-nafas-blue text-nafas-blue'
                : 'border-transparent text-nafas-neutral-slate hover:text-nafas-silt'
            }`}
          >
            <span>الشهادات ووثائق الأثر</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px]">
              {displayCertificates.length}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Identity Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-nafas-sand via-white to-nafas-sand border border-nafas-reed/15 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-nafas-silt text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-nafas-blue shrink-0">
                    {passport.userName.charAt(0) || 'ن'}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-nafas-silt">
                      {passport.userName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-nafas-neutral-slate">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        متطوع بيئي موثّق
                      </span>
                      {passport.userPhoneMasked && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-gray-500">
                          <Lock className="w-3 h-3 text-nafas-blue" />
                          {passport.userPhoneMasked}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Impact Points Counter */}
                <div className="text-center bg-nafas-ivory px-5 py-3 rounded-2xl border border-nafas-reed/15 shadow-sm">
                  <span className="text-xs text-nafas-neutral-slate font-bold block">
                    رصيد نقاط الأثر (الموثقة)
                  </span>
                  <span className="text-3xl font-black font-mono text-nafas-blue">
                    {passport.points}
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">
                    مستحق للمكافآت المجتمعية
                  </span>
                </div>
              </div>

              {/* 4 Core Quantitative Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-nafas-sand p-4 rounded-2xl border border-nafas-reed/15 text-center">
                  <Clock className="w-5 h-5 text-nafas-blue mx-auto mb-1.5" />
                  <div className="text-2xl font-black font-mono text-nafas-silt">
                    {passport.verifiedHours}
                  </div>
                  <div className="text-xs text-nafas-neutral-slate mt-0.5 font-medium">
                    ساعة تطوع معتمدة
                  </div>
                </div>

                <div className="bg-nafas-sand p-4 rounded-2xl border border-nafas-reed/15 text-center">
                  <Award className="w-5 h-5 text-purple-600 mx-auto mb-1.5" />
                  <div className="text-2xl font-black font-mono text-nafas-silt">
                    {passport.completedCampaignsCount}
                  </div>
                  <div className="text-xs text-nafas-neutral-slate mt-0.5 font-medium">
                    حملات مكتملة
                  </div>
                </div>

                <div className="bg-nafas-sand p-4 rounded-2xl border border-nafas-reed/15 text-center">
                  <Sprout className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                  <div className="text-2xl font-black font-mono text-nafas-blue">
                    {passport.treesPlantedCount}
                  </div>
                  <div className="text-xs text-nafas-neutral-slate mt-0.5 font-medium">
                    شتلة مغروسة
                  </div>
                </div>

                <div className="bg-nafas-sand p-4 rounded-2xl border border-nafas-reed/15 text-center">
                  <ShieldCheck className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                  <div className="text-2xl font-black font-mono text-nafas-silt">
                    {passport.verifiedReportsCount}
                  </div>
                  <div className="text-xs text-nafas-neutral-slate mt-0.5 font-medium">
                    بلاغات تمت معالجتها
                  </div>
                </div>
              </div>

              {/* Earned Badges */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-nafas-silt">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>الأوسمة البيئية المكتسبة</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {passport.badges.map(b => (
                    <div key={b.id} className="p-3.5 rounded-2xl bg-nafas-sand border border-nafas-reed/15 flex items-center gap-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-nafas-silt">{b.nameAr}</div>
                        <div className="text-[10px] text-nafas-neutral-slate font-arabic">منذ {b.earnedDate}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anti-Farming & Transparency Note */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-nafas-reed/30 text-xs text-nafas-neutral-slate space-y-1">
                <div className="font-bold text-nafas-silt flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-nafas-blue" />
                  <span>نزاهة السجل التطوعي والوثائق الرسمية</span>
                </div>
                <p className="leading-relaxed">
                  تُسجل ساعات التطوع والشهادات حصرياً بعد الحضور الميداني المعتمد عبر رمز التحقق الميداني اللحظي. لا تُمنح أي ساعات لمجرد التسجيل، لضمان أعلى معايير النزاهة والمصداقية البيئية في العراق.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTERED UPCOMING CAMPAIGNS */}
          {activeTab === 'registered' && (
            <div className="space-y-4">
              <div className="text-xs text-nafas-neutral-slate">
                قائمة الحملات الميدانية التي قمت بحجز مقعد فيها. يرجى التواجد في الموعد المحدد عند نقطة التجمع.
              </div>

              {upcomingRegisteredCampaigns.length === 0 ? (
                <div className="p-10 text-center bg-nafas-sand rounded-3xl border border-nafas-reed/15 space-y-3">
                  <Calendar className="w-10 h-10 text-gray-400 mx-auto" />
                  <div className="font-bold text-sm text-nafas-silt">لا توجد حملات مسجلة حالياً</div>
                  <p className="text-xs text-nafas-neutral-slate max-w-sm mx-auto">
                    تصفح قسم الحملات التطوعية وانضم إلى المبادرات الميدانية في محافظتك لخدمة بيئة العراق.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingRegisteredCampaigns.map(camp => (
                    <div 
                      key={camp.id}
                      className="p-5 rounded-2xl bg-nafas-sand border border-nafas-reed/15 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-nafas-reed/10 pb-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-nafas-blue bg-nafas-blue/10 px-2 py-0.5 rounded">
                            حملة مؤكدة
                          </span>
                          <h4 className="text-sm font-bold text-nafas-silt">
                            {camp.titleAr}
                          </h4>
                        </div>
                        <button
                          onClick={() => cancelCampaignRegistration(camp.id)}
                          className="text-xs font-bold text-red-600 hover:text-red-800 self-start sm:self-auto"
                        >
                          إلغاء الحجز
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-nafas-neutral-slate">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-nafas-blue" />
                          <span>{camp.date} ({camp.startTime})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-nafas-blue" />
                          <span className="truncate">{camp.meetingArea}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CERTIFICATES & DIGITAL SEALS */}
          {activeTab === 'certificates' && (
            <div className="space-y-4">
              <div className="text-xs text-nafas-neutral-slate">
                الشهادات الممنوحة لك رسمياً بعد تأكيد حضورك الميداني وإتمام متطلبات الحملة. تحتوي كل شهادة على بصمة رقمية ورمز QR فريد.
              </div>

              {displayCertificates.length === 0 ? (
                <div className="p-10 text-center bg-nafas-sand rounded-3xl border border-nafas-reed/15 space-y-3">
                  <Award className="w-10 h-10 text-gray-400 mx-auto" />
                  <div className="font-bold text-sm text-nafas-silt">لا توجد شهادات صادرة بعد</div>
                  <p className="text-xs text-nafas-neutral-slate max-w-sm mx-auto">
                    احضر الحملات الميدانية المسجل بها وأكد حضورك لاستلام وثائق مشاركتك الرسمية.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayCertificates.map(cert => (
                    <div
                      key={cert.id}
                      onClick={() => onSelectCertificate(cert)}
                      className="p-4 rounded-2xl bg-nafas-sand border border-nafas-reed/15 hover:border-nafas-blue transition-all flex items-center justify-between cursor-pointer group shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-nafas-blue bg-nafas-blue/10 px-2 py-0.5 rounded">
                            {cert.verificationCode}
                          </span>
                          <span className="font-bold text-sm text-nafas-silt group-hover:text-nafas-blue transition-colors">
                            {cert.campaignTitle}
                          </span>
                        </div>
                        <div className="text-xs text-nafas-neutral-slate">
                          {cert.hoursAwarded} ساعات موثقة • تاريخ الإصدار: {cert.issueDate} • المحافظة: {cert.governorate}
                        </div>
                      </div>

                      <div className="text-xs font-bold text-nafas-blue flex items-center gap-1 group-hover:underline">
                        <span>عرض الوثيقة</span>
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
