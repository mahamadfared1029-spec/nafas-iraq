'use client';

import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  MapPin, 
  Users, 
  BarChart3, 
  Sprout, 
  BookOpen, 
  HeartHandshake, 
  AlertCircle, 
  UserCircle,
  Home,
  Box,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  PlayCircle,
  Search,
  HelpCircle
} from 'lucide-react';
import { useNafas } from '@/lib/store';
import { Role, UserProfile } from '@/types';
import { nafasAuth } from '@/lib/auth/authService';
import { NafasLogo } from '../brand/NafasLogo';

interface HeaderProps {
  onOpenReportModal: () => void;
  onOpenPassportModal: () => void;
  onOpenProfileModal?: () => void;
  onOpenAuthModal?: (mode?: 'login' | 'register' | 'mfa-enroll') => void;
  onOpenCommandCenter?: () => void;
  onOpenSearchModal?: () => void;
  onOpenHelpModal?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenReportModal,
  onOpenPassportModal,
  onOpenProfileModal,
  onOpenAuthModal,
  onOpenCommandCenter,
  onOpenSearchModal,
  onOpenHelpModal,
  activeTab,
  setActiveTab
}) => {
  const { language, t, passport } = useNafas();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub = nafasAuth.onAuthStateChange((session) => {
      setAuthUser(session?.user || null);
    });
    return unsub;
  }, []);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'super_admin':
        return { label: 'المشرف العام (المؤسس)', badgeColor: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold' };
      case 'admin':
        return { label: 'إدارة النظام', badgeColor: 'bg-purple-100 text-purple-900 border border-purple-300 font-bold' };
      case 'moderator':
        return { label: 'مشرف بيئي', badgeColor: 'bg-nafas-misty text-nafas-blue border border-nafas-blue/30 font-bold' };
      case 'organizer':
        return { label: 'منسق حملات', badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' };
      case 'volunteer':
        return { label: 'متطوع موثق', badgeColor: 'bg-nafas-blue/15 text-nafas-blue font-bold' };
      case 'citizen':
      default:
        return { label: 'مواطن بيئي', badgeColor: 'bg-nafas-misty text-nafas-silt font-medium' };
    }
  };

  const currentRoleBadge = authUser ? getRoleBadge(authUser.role) : { label: 'زائر عام', badgeColor: 'bg-stone-200 text-stone-700' };

  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'map', label: t.mapNav, icon: MapPin },
    { id: 'map-3d', label: 'خريطة 3D', icon: Box },
    { id: 'campaigns', label: t.campaignsNav, icon: Users },
    { id: 'impact', label: t.impactNav, icon: BarChart3 },
    { id: 'planting', label: t.plantingNav, icon: Sprout },
    { id: 'atlas', label: t.atlasNav, icon: BookOpen },
    { id: 'clinic', label: t.clinicNav, icon: HeartHandshake },
  ];

  return (
    <header className="sticky top-0 z-40 bg-nafas-sand/95 backdrop-blur-md border-b border-nafas-reed/30 shadow-sm transition-all duration-300">
      {/* Slim Top Bar: Replay Intro and National Environmental Statement */}
      <div className="bg-nafas-silt text-nafas-sand px-4 py-1 text-xs flex items-center justify-between border-b border-nafas-reed/20">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-nafas-sand/80">
            جمهورية العراق — المنصة الوطنية للعمل البيئي والمجتمعي
          </span>
          <span className={`text-[10px] px-2 py-0.2 rounded-full hidden sm:inline-block ${currentRoleBadge.badgeColor}`}>
            {currentRoleBadge.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('replay-nafas-intro'))}
            className="hover:text-nafas-misty flex items-center gap-1 font-medium transition-colors text-nafas-sand/80 hover:text-white text-[11px]"
            title="إعادة تشغيل المشهد الافتتاحي"
          >
            <PlayCircle className="w-3.5 h-3.5 text-nafas-misty" />
            <span>مشاهدة الدخولية</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-6 shrink-0">
            <button onClick={() => setActiveTab('home')} className="cursor-pointer text-right flex items-center shrink-0" aria-label="الصفحة الرئيسية نَفَس">
              <NafasLogo size="md" />
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                    isActive
                      ? 'bg-nafas-blue text-nafas-ivory shadow-sm font-bold'
                      : 'text-nafas-silt/80 hover:text-nafas-silt hover:bg-nafas-misty/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-nafas-ivory' : 'text-nafas-blue'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Search Sections Button */}
            {onOpenSearchModal && (
              <button
                onClick={onOpenSearchModal}
                className="p-2 rounded-xl border border-nafas-reed/35 bg-nafas-ivory hover:bg-nafas-misty/40 text-nafas-silt transition-colors"
                title="بحث عن الأقسام"
                aria-label="بحث عن الأقسام"
              >
                <Search className="w-4 h-4 text-nafas-blue" />
              </button>
            )}

            {/* Help Center Button */}
            {onOpenHelpModal && (
              <button
                onClick={onOpenHelpModal}
                className="px-2.5 py-2 rounded-xl border border-nafas-reed/35 bg-nafas-ivory hover:bg-nafas-misty/40 text-nafas-silt text-xs font-bold flex items-center gap-1 transition-colors"
                title="مركز المساعدة والدعم"
                aria-label="مركز المساعدة والدعم"
              >
                <HelpCircle className="w-4 h-4 text-nafas-blue" />
                <span className="hidden md:inline">المساعدة</span>
              </button>
            )}

            {/* Command Center for Super Admin & Staff */}
            {authUser && (authUser.role === 'super_admin' || authUser.role === 'moderator' || authUser.role === 'admin') && onOpenCommandCenter && (
              <button
                onClick={onOpenCommandCenter}
                className="px-3.5 py-2 rounded-xl bg-[#62467D] hover:bg-[#52386A] text-white text-xs font-bold flex items-center gap-1.5 transition-all duration-200 shadow-sm border border-[#B797D0]/30"
                title="فتح مركز القيادة والرقابة البيئية"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>مركز القيادة</span>
              </button>
            )}

            {/* Auth Account / Login */}
            {authUser ? (
              <div className="flex items-center gap-1.5">
                {/* MFA Security Status / Setup Pill */}
                {authUser.mfaEnabled ? (
                  <button
                    onClick={() => onOpenAuthModal && onOpenAuthModal('mfa-enroll')}
                    className="px-2 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-[11px] font-bold flex items-center gap-1"
                    title="المصادقة الثنائية نشطة (AAL2 Secured) — انقر لإدارة العوامل"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>MFA مؤكد</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenAuthModal && onOpenAuthModal('mfa-enroll')}
                    className="px-2 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors text-[11px] font-bold flex items-center gap-1 shadow-sm"
                    title="تفعيل المصادقة متعددة العوامل لحماية حسابك"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>تفعيل MFA</span>
                  </button>
                )}

                {onOpenProfileModal && (
                  <button
                    onClick={onOpenProfileModal}
                    className="px-2.5 py-1.5 rounded-xl border border-nafas-reed/40 bg-nafas-ivory hover:bg-nafas-misty/30 text-nafas-silt text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="تعديل الملف الشخصي (الاسم والصورة والنبذة)"
                  >
                    {authUser.avatarUrl ? (
                      <img
                        src={authUser.avatarUrl}
                        alt={authUser.fullName}
                        className="w-5 h-5 rounded-full object-cover border border-nafas-blue/40"
                      />
                    ) : (
                      <UserCircle className="w-4 h-4 text-nafas-blue" />
                    )}
                    <span className="max-w-[90px] truncate">{authUser.fullName.split(' ')[0]}</span>
                  </button>
                )}

                <button
                  onClick={onOpenPassportModal}
                  className="px-2.5 py-1.5 rounded-xl border border-nafas-blue/30 text-nafas-silt hover:bg-nafas-misty/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="جواز نَفَس للمواطن"
                >
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-nafas-misty text-nafas-silt font-mono">
                    {passport.points}ن
                  </span>
                </button>

                <button
                  onClick={() => nafasAuth.signOut()}
                  className="p-2 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                className="px-3 py-2 rounded-xl border border-[#6B463B]/40 text-[#6B463B] hover:bg-[#F7F1E7] text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول / تسجيل</span>
              </button>
            )}

            {/* Report CTA */}
            <button
              onClick={onOpenReportModal}
              className="px-4 py-2.5 rounded-xl bg-nafas-blue hover:bg-nafas-blue-dark text-nafas-ivory text-sm font-bold flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
            >
              <AlertCircle className="w-4 h-4 text-nafas-ivory" />
              <span>{t.reportIssueCta}</span>
            </button>
          </div>

          {/* Mobile Right Controls */}
          <div className="lg:hidden flex items-center gap-1.5">
            {onOpenSearchModal && (
              <button
                onClick={onOpenSearchModal}
                className="p-2 rounded-xl border border-nafas-reed/30 bg-nafas-ivory text-nafas-blue hover:bg-nafas-misty/40 transition-colors"
                aria-label="بحث عن الأقسام"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
            {onOpenHelpModal && (
              <button
                onClick={onOpenHelpModal}
                className="p-2 rounded-xl border border-nafas-reed/30 bg-nafas-ivory text-nafas-blue hover:bg-nafas-misty/40 transition-colors"
                aria-label="مركز المساعدة"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
            {/* Quick Auth / Status Pill on Mobile */}
            {authUser ? (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-nafas-blue/30 bg-nafas-ivory text-nafas-silt text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <UserCircle className="w-4 h-4 text-nafas-blue" />
                <span className="max-w-[70px] truncate">{authUser.fullName.split(' ')[0]}</span>
                {authUser.mfaEnabled ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                )}
              </button>
            ) : (
              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                className="px-2.5 py-1.5 rounded-xl border border-[#6B463B]/40 text-[#6B463B] text-xs font-bold flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-nafas-silt hover:bg-nafas-misty/50 transition-colors"
              aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة الرئيسية'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-nafas-reed/30 bg-nafas-sand px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2">
          
          {/* Authenticated Mobile User Card (PART 5) */}
          {authUser ? (
            <div className="p-3.5 bg-white rounded-2xl border border-nafas-reed/30 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-nafas-misty flex items-center justify-center text-nafas-blue font-bold">
                    {authUser.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#222238]">{authUser.fullName}</div>
                    <div className="text-[10px] text-gray-500">{authUser.email}</div>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${currentRoleBadge.badgeColor}`}>
                  {currentRoleBadge.label}
                </span>
              </div>

              {/* Mobile MFA Setup Entry */}
              {authUser.mfaEnabled ? (
                <button
                  onClick={() => {
                    onOpenAuthModal && onOpenAuthModal('mfa-enroll');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>المصادقة الثنائية نشطة (AAL2 مؤكد)</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 underline">إدارة</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuthModal && onOpenAuthModal('mfa-enroll');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold flex items-center justify-between shadow-sm animate-pulse"
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>تفعيل المصادقة الثنائية (MFA) لحماية الحساب</span>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-200 px-2 py-0.5 rounded-md">ابدأ الآن</span>
                </button>
              )}

              {/* Command Center for Super Admin in Mobile Drawer */}
              {(authUser.role === 'super_admin' || authUser.role === 'moderator' || authUser.role === 'admin') && onOpenCommandCenter && (
                <button
                  onClick={() => {
                    onOpenCommandCenter();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#62467D] text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>مركز القيادة والرقابة البيئية</span>
                </button>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                <span className="text-gray-500 font-medium">النقاط المكتسبة: {passport.points} نقطة</span>
                <button
                  onClick={() => {
                    nafasAuth.signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="text-stone-600 hover:text-red-700 font-bold flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-white rounded-2xl border border-nafas-reed/30 shadow-sm text-center space-y-2">
              <p className="text-xs text-gray-700 font-medium">أهلاً بك في منصة نَفَس — تصفح بيئة العراق كزائر</p>
              <button
                onClick={() => {
                  onOpenAuthModal && onOpenAuthModal('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 rounded-xl bg-[#62467D] text-white text-xs font-bold flex items-center justify-center gap-2 shadow"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول / إنشاء حساب مواطن</span>
              </button>
            </div>
          )}

          {/* Nav Items */}
          <div className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between ${
                    isActive
                      ? 'bg-nafas-blue text-nafas-ivory font-bold'
                      : 'text-nafas-silt hover:bg-nafas-misty/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-nafas-blue" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-nafas-reed/30 flex flex-col gap-2">
            {authUser && onOpenProfileModal && (
              <button
                onClick={() => {
                  onOpenProfileModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl border border-nafas-reed/40 text-nafas-silt font-bold text-xs flex items-center justify-center gap-2 bg-nafas-ivory"
              >
                <UserCircle className="w-4 h-4 text-nafas-blue" />
                <span>تعديل الملف الشخصي</span>
              </button>
            )}
            <button
              onClick={() => {
                onOpenPassportModal();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl border border-nafas-blue text-nafas-blue font-bold text-xs flex items-center justify-center gap-2 bg-nafas-ivory"
            >
              <UserCircle className="w-4 h-4" />
              <span>{t.passportNav} ({passport.points} نقطة أثر)</span>
            </button>
            <button
              onClick={() => {
                onOpenReportModal();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-nafas-blue text-nafas-ivory font-bold text-xs flex items-center justify-center gap-2 shadow"
            >
              <AlertCircle className="w-4 h-4 text-nafas-ivory" />
              <span>{t.reportIssueCta}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
