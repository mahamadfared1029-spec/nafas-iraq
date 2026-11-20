'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { IRAQ_GOVERNORATES, PLANTING_RECOMMENDATIONS } from '@/lib/constants';
import { OrchidMotif } from '@/components/brand/OrchidMotif';
import { NafasLogo } from '@/components/brand/NafasLogo';
import { 
  MapPin, 
  AlertCircle, 
  Users, 
  BarChart3, 
  Gift, 
  Award, 
  Sprout, 
  HeartHandshake, 
  BookOpen, 
  Bell, 
  ChevronLeft, 
  Calendar, 
  CheckCircle2, 
  ArrowLeft,
  Sparkles,
  TreePine,
  ShieldCheck,
  Compass
} from 'lucide-react';

interface HomeDashboardProps {
  onNavigate: (screenId: string) => void;
  onOpenReportModal: () => void;
  onOpenPassportModal: () => void;
  onOpenRewardsModal?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  onOpenReportModal,
  onOpenPassportModal,
  onOpenRewardsModal
}) => {
  const { 
    selectedGovernorateId, 
    setSelectedGovernorateId, 
    campaigns, 
    impactMetrics, 
    passport,
    t,
    language 
  } = useNafas();

  const [notificationOpen, setNotificationOpen] = useState(false);

  // Selected or current governorate info
  const currentGov = IRAQ_GOVERNORATES.find(g => g.id === selectedGovernorateId) || IRAQ_GOVERNORATES[0];

  // Plant of the month (e.g. Sidr or Palm depending on season)
  const currentMonth = new Date().getMonth() + 1;
  const plantOfTheMonth = PLANTING_RECOMMENDATIONS[1] || PLANTING_RECOMMENDATIONS[0];

  // Up to 2 compact campaigns
  const upcomingCampaignsPreview = campaigns.slice(0, 2);

  // 8 Main Navigation Modules
  const navModules = [
    {
      id: 'map',
      title: 'الخريطة البيئية',
      description: 'استكشف البلاغات وحملات التشجير والأنهار',
      icon: MapPin,
      badge: 'GIS تفاعلي',
      color: 'text-nafas-blue bg-nafas-blue/10 border-nafas-blue/20'
    },
    {
      id: 'campaigns',
      title: 'الحملات الميدانية',
      description: 'انضم لفرق تنظيف الأنهار وتشجير المدن',
      icon: Users,
      badge: `${campaigns.length} حملة`,
      color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 'impact',
      title: 'أثر نَفَس',
      description: 'أرقام الشفافية والأثر البيئي الموثق',
      icon: BarChart3,
      badge: '99.4% موثق',
      color: 'text-nafas-walnut bg-nafas-walnut/10 border-nafas-walnut/20'
    },
    {
      id: 'rewards',
      title: 'المكافآت والشركاء',
      description: 'استبدل ساعاتك التطوعية بخصومات ومزايا',
      icon: Gift,
      badge: `${passport.points} نقطة`,
      color: 'text-amber-800 bg-amber-500/10 border-amber-500/20'
    },
    {
      id: 'passport',
      title: 'جواز المتطوع',
      description: 'شهاداتك المعتمدة وسجل ساعاتك الرقمية',
      icon: Award,
      badge: `${passport.verifiedHours} ساعة`,
      color: 'text-nafas-orchid bg-nafas-orchid/10 border-nafas-orchid/20'
    },
    {
      id: 'planting',
      title: 'التوعية والتشجير',
      description: 'تقويم زراعي بيئي لأشجار العراق الأصيلة',
      icon: Sprout,
      badge: 'دليل النخيل والسدر',
      color: 'text-emerald-800 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 'clinic',
      title: 'الصيدلية النباتية',
      description: 'تشخيص أمراض النباتات وحلول طبيعية',
      icon: HeartHandshake,
      badge: 'استشارات مجانية',
      color: 'text-rose-800 bg-rose-500/10 border-rose-500/20'
    },
    {
      id: 'atlas',
      title: 'تراث العراق',
      description: 'أطلس بيئي تاريخي لحضارة وادي الرافدين',
      icon: BookOpen,
      badge: 'أهوار وبابل وأور',
      color: 'text-nafas-clay bg-nafas-clay/10 border-nafas-clay/20'
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      
      {/* =========================================================================
          A. COMPACT WELCOME HEADER
          ========================================================================= */}
      <section className="bg-nafas-ivory rounded-3xl p-4 sm:p-6 border border-nafas-reed/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle decorative orchid watermark */}
        <div className="absolute left-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <OrchidMotif variant="corner" size="lg" />
        </div>

        {/* User Welcome & Brand */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-nafas-sand/60 border border-nafas-reed/40 flex items-center justify-center p-2 shadow-inner shrink-0">
            <NafasLogo variant="icon" className="w-full h-full text-nafas-silt" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-nafas-clay uppercase tracking-wider">منصة نَفَس العراقية</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] text-nafas-silt/70">متصل الآن</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-nafas-silt leading-tight">
              أهلاً بك، خلّي العراق يتنفس 🌿
            </h1>
            <p className="text-xs text-nafas-silt/80 mt-0.5">
              بيئة الرافدين مسؤوليتنا المشتركة من زاخو إلى الفاو
            </p>
          </div>
        </div>

        {/* Header Quick Controls: Governorate Selector, Notifications, Passport Points */}
        <div className="flex items-center gap-2.5 relative z-10 flex-wrap sm:flex-nowrap">
          
          {/* Governorate Dropdown */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={selectedGovernorateId}
              onChange={(e) => setSelectedGovernorateId(e.target.value)}
              aria-label="اختر محافظتك"
              className="w-full sm:w-auto appearance-none bg-nafas-sand/50 text-nafas-silt border border-nafas-reed/40 rounded-xl px-3 py-2 pr-7 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-nafas-blue/30 cursor-pointer"
            >
              <option value="all">كل المحافظات (عموم العراق)</option>
              {IRAQ_GOVERNORATES.map(gov => (
                <option key={gov.id} value={gov.id}>
                  {gov.nameAr}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-nafas-clay absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-2 rounded-xl bg-nafas-sand/50 border border-nafas-reed/40 text-nafas-silt hover:bg-nafas-sand transition-colors relative"
              aria-label="التنبيهات"
            >
              <Bell className="w-4 h-4 text-nafas-silt" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-nafas-clay ring-2 ring-nafas-ivory"></span>
            </button>

            {notificationOpen && (
              <div className="absolute left-0 sm:right-auto mt-2 w-72 bg-nafas-ivory border border-nafas-reed/40 rounded-2xl shadow-xl p-3 z-50 text-right animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between pb-2 border-b border-nafas-reed/20 mb-2">
                  <span className="text-xs font-bold text-nafas-silt">آخر التنبيهات الميدانية</span>
                  <span className="text-[10px] text-nafas-silt/60">2 جديدة</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-xl bg-nafas-sand/40 border border-nafas-reed/20">
                    <p className="font-bold text-nafas-silt">تم توثيق رفع مخلفات الكرادة!</p>
                    <p className="text-[11px] text-nafas-silt/80 mt-0.5">أكمل فريق شباب بغداد تنظيف 400 متر على ضفة دجلة.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-nafas-sand/40 border border-nafas-reed/20">
                    <p className="font-bold text-nafas-silt">حملة قادمة: شط العرب</p>
                    <p className="text-[11px] text-nafas-silt/80 mt-0.5">تبدأ زوارق البصرة السبت المقبل في العشار.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Passport Pill */}
          <button
            onClick={onOpenPassportModal}
            className="flex items-center gap-2 px-3 py-2 bg-nafas-orchid/10 border border-nafas-orchid/20 rounded-xl text-xs font-bold text-nafas-orchid hover:bg-nafas-orchid/20 transition-all shadow-sm"
          >
            <OrchidMotif variant="icon" size="sm" />
            <span>{passport.points} نقطة</span>
          </button>

        </div>
      </section>

      {/* =========================================================================
          B. PRIMARY ENVIRONMENTAL REPORTING ACTION (Most Visually Important Action)
          ========================================================================= */}
      <section className="relative">
        <button
          onClick={onOpenReportModal}
          className="w-full text-right bg-gradient-to-l from-nafas-clay via-[#BA6548] to-[#9E5136] text-white rounded-3xl p-5 sm:p-7 shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 border-2 border-white/20 relative overflow-hidden group"
          aria-label="بلّغ عن مشكلة بيئية"
        >
          {/* Subtle background graphics */}
          <div className="absolute left-[-30px] bottom-[-30px] opacity-15 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
            <MapPin className="w-48 h-48 text-white" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center p-3 border border-white/30 shadow-inner shrink-0 group-hover:rotate-6 transition-transform">
                <MapPin className="w-8 h-8 text-white stroke-[2.5]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold mb-1 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>التحرك الميداني المباشر</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  بلّغ عن مشكلة بيئية
                </h2>
                <p className="text-xs sm:text-sm text-white/95 mt-1 font-medium max-w-xl">
                  شفت مكان يحتاج اهتمام؟ أشّر عليه وخلّينا نتابعه.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end sm:justify-start">
              <span className="px-5 py-3 rounded-2xl bg-white text-nafas-clay font-bold text-xs sm:text-sm shadow-md group-hover:bg-nafas-ivory flex items-center gap-2 transition-colors">
                <span>ابدأ البلاغ الآن</span>
                <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
              </span>
            </div>

          </div>
        </button>
      </section>

      {/* =========================================================================
          C. MAIN FEATURE NAVIGATION (8 Module Grid)
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-nafas-silt flex items-center gap-2">
            <OrchidMotif variant="icon" size="sm" />
            <span>بوابات منصة نَفَس</span>
          </h3>
          <span className="text-[11px] font-medium text-nafas-silt/60">
            تصفح الخدمات والشاشات المخصصة
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {navModules.map(module => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => {
                  if (module.id === 'rewards' && onOpenRewardsModal) {
                    onOpenRewardsModal();
                  } else if (module.id === 'passport') {
                    onOpenPassportModal();
                  } else {
                    onNavigate(module.id);
                  }
                }}
                className="bg-nafas-ivory hover:bg-nafas-sand/40 border border-nafas-reed/30 hover:border-nafas-reed rounded-2xl p-4 text-right transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between group active:scale-95"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${module.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {module.badge && (
                      <span className="text-[10px] font-bold text-nafas-silt/70 bg-nafas-sand/50 px-2 py-0.5 rounded-md border border-nafas-reed/20">
                        {module.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-nafas-silt group-hover:text-nafas-blue transition-colors">
                    {module.title}
                  </h4>
                  <p className="text-[11px] text-nafas-silt/70 leading-relaxed mt-1 line-clamp-2">
                    {module.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-nafas-reed/20 flex items-center justify-between text-[11px] font-bold text-nafas-blue group-hover:underline">
                  <span>فتح الشاشة</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          D. COMPACT CAMPAIGNS PREVIEW (2 Items Max)
          ========================================================================= */}
      <section className="bg-nafas-ivory rounded-3xl p-5 border border-nafas-reed/30 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-nafas-silt flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>أحدث الحملات الميدانية القادمة</span>
            </h3>
            <p className="text-xs text-nafas-silt/70 mt-0.5">
              شارك مع متطوعي منطقتك وسجّل ساعاتك المعتمدة
            </p>
          </div>

          <button
            onClick={() => onNavigate('campaigns')}
            className="text-xs font-bold text-nafas-blue hover:underline flex items-center gap-1"
          >
            <span>عرض كل الحملات ({campaigns.length})</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {upcomingCampaignsPreview.map(campaign => (
            <div
              key={campaign.id}
              className="bg-nafas-sand/30 border border-nafas-reed/30 rounded-2xl p-4 flex flex-col justify-between hover:border-nafas-reed transition-all"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-nafas-silt/70 mb-1.5">
                  <span className="flex items-center gap-1 font-semibold text-nafas-clay">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{campaign.meetingArea}</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono font-bold">
                    <Calendar className="w-3.5 h-3.5 text-nafas-blue" />
                    <span>{campaign.date}</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-nafas-silt mb-1.5 leading-snug">
                  {campaign.titleAr}
                </h4>

                <p className="text-xs text-nafas-silt/80 line-clamp-2 leading-relaxed mb-3">
                  {campaign.descriptionAr}
                </p>
              </div>

              <div className="pt-2 border-t border-nafas-reed/20 flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{campaign.registeredCount} / {campaign.volunteerCapacity} متطوع</span>
                </span>

                <button
                  onClick={() => onNavigate('campaigns')}
                  className="px-3 py-1.5 rounded-xl bg-nafas-blue text-nafas-ivory text-xs font-bold hover:brightness-110 transition-all shadow-xs"
                >
                  تفاصيل والتسجيل
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          E. MONTHLY PLANTING RECOMMENDATION ("نبتة هذا الشهر" - Lower on Home Screen)
          ========================================================================= */}
      <section className="bg-nafas-ivory rounded-3xl p-5 sm:p-6 border border-nafas-reed/30 shadow-sm relative overflow-hidden">
        {/* Orchid Motif Accent */}
        <div className="absolute left-4 top-4 hidden sm:block">
          <OrchidMotif variant="badge" size="sm" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-5">
          
          {/* Plant Visual */}
          <div className="w-full md:w-44 h-40 rounded-2xl overflow-hidden border border-nafas-reed/40 shadow-sm shrink-0 relative bg-emerald-950/10">
            <img 
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80" 
              alt={plantOfTheMonth.speciesNameAr} 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              نبتة الشهر الموصى بها
            </div>
          </div>

          {/* Plant Details */}
          <div className="flex-1 text-right">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                موسم تشرين / كانون
              </span>
              <span className="text-xs text-nafas-silt/60 font-mono">
                {plantOfTheMonth.scientificName}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-nafas-silt mb-1">
              {plantOfTheMonth.speciesNameAr}
            </h3>

            <p className="text-xs text-nafas-silt/80 leading-relaxed mb-3 line-clamp-2">
              {plantOfTheMonth.ecologicalRole}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-nafas-silt/70 mb-4">
              <span className="bg-nafas-sand/50 px-2.5 py-1 rounded-lg border border-nafas-reed/20 font-medium">
                💧 استهلاك المياه: قليل إلى معتدل
              </span>
              <span className="bg-nafas-sand/50 px-2.5 py-1 rounded-lg border border-nafas-reed/20 font-medium">
                ☀️ تحمل الحرارة: فائق (+50°C)
              </span>
              <span className="bg-nafas-sand/50 px-2.5 py-1 rounded-lg border border-nafas-reed/20 font-medium">
                🏛️ مناسب لمحافظة: {currentGov.nameAr}
              </span>
            </div>

            <button
              onClick={() => onNavigate('planting')}
              className="px-4 py-2 rounded-xl bg-nafas-silt text-nafas-ivory text-xs font-bold hover:bg-nafas-walnut transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>اعرف أكثر عن زراعتها ورعايتها</span>
              <ArrowLeft className="w-3.5 h-3.5 rtl:-scale-x-100" />
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          F. SMALL VERIFIED IMPACT PREVIEW (4 Core Metrics)
          ========================================================================= */}
      <section className="bg-nafas-sand/30 rounded-3xl p-5 border border-nafas-reed/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-nafas-clay" />
            <h3 className="text-xs sm:text-sm font-bold text-nafas-silt">
              الأثر البيئي الموثق بالأدلة الميدانية
            </h3>
          </div>
          <button
            onClick={() => onNavigate('impact')}
            className="text-xs font-bold text-nafas-blue hover:underline"
          >
            تقرير الشفافية الكامل ←
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-nafas-ivory p-3.5 rounded-2xl border border-nafas-reed/20 shadow-2xs">
            <div className="text-xl sm:text-2xl font-black text-nafas-silt font-mono">
              {impactMetrics.totalResolvedCleanups}+
            </div>
            <div className="text-[11px] font-semibold text-nafas-silt/70 mt-0.5">
              موقع منظف ومعالج
            </div>
          </div>

          <div className="bg-nafas-ivory p-3.5 rounded-2xl border border-nafas-reed/20 shadow-2xs">
            <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {impactMetrics.totalTreesPlanted.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-nafas-silt/70 mt-0.5">
              شجرة ونخلة مغروسة
            </div>
          </div>

          <div className="bg-nafas-ivory p-3.5 rounded-2xl border border-nafas-reed/20 shadow-2xs">
            <div className="text-xl sm:text-2xl font-black text-nafas-blue font-mono">
              {impactMetrics.totalActiveVolunteers.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-nafas-silt/70 mt-0.5">
              متطوع عراقي مسجل
            </div>
          </div>

          <div className="bg-nafas-ivory p-3.5 rounded-2xl border border-nafas-reed/20 shadow-2xs">
            <div className="text-xl sm:text-2xl font-black text-nafas-orchid font-mono">
              {impactMetrics.totalVolunteerHours}
            </div>
            <div className="text-[11px] font-semibold text-nafas-silt/70 mt-0.5">
              ساعة عمل موثقة
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          G. MINIMAL FOOTER / CIVIC NOTE
          ========================================================================= */}
      <footer className="text-center py-4 text-xs text-nafas-silt/60 space-y-1">
        <p className="font-semibold text-nafas-silt/80">
          نَفَس — شريان بلاد الرافدين البيئي المجتمعي
        </p>
        <p className="text-[11px]">
          صُنع بحب لأرض العراق ونخيله ودجلة والفرات • 2026
        </p>
      </footer>

    </div>
  );
};
