'use client';

import React, { useState } from 'react';
import { NafasLogo } from '@/components/brand/NafasLogo';
import { useNafas } from '@/lib/store';
import { Role } from '@/types';
import { 
  Home,
  MapPin, 
  AlertCircle, 
  Users, 
  BarChart3, 
  Sprout, 
  BookOpen, 
  HeartHandshake, 
  Menu, 
  X, 
  UserCircle,
  PlayCircle
} from 'lucide-react';

interface HeaderProps {
  onOpenReportModal: () => void;
  onOpenPassportModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenReportModal,
  onOpenPassportModal,
  activeTab,
  setActiveTab
}) => {
  const { role, setRole, language, t, passport } = useNafas();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const rolesList: { id: Role; labelAr: string; labelEn: string; badgeColor: string }[] = [
    { id: 'citizen', labelAr: 'مواطن (إبلاغ ومتابعة)', labelEn: 'Citizen (Report & Track)', badgeColor: 'bg-nafas-misty text-nafas-silt' },
    { id: 'volunteer', labelAr: 'متطوع موثّق (مشاركة وشهادات)', labelEn: 'Volunteer (Events & Certs)', badgeColor: 'bg-nafas-blue/20 text-nafas-blue font-bold' },
    { id: 'organizer', labelAr: 'منسق حملة (تحضير وحضور)', labelEn: 'Organizer (Events & Check-in)', badgeColor: 'bg-amber-100 text-amber-900' },
    { id: 'moderator', labelAr: 'مشرف بيئي (مراجعة واعتماد)', labelEn: 'Moderator (Review & Verify)', badgeColor: 'bg-nafas-misty text-nafas-blue font-bold' },
    { id: 'admin', labelAr: 'إدارة النظام (تحكم شامل)', labelEn: 'Administrator (Full Access)', badgeColor: 'bg-purple-100 text-purple-900' },
    { id: 'guest', labelAr: 'زائر عام', labelEn: 'Guest Visitor', badgeColor: 'bg-stone-200 text-stone-800' }
  ];

  const currentRoleInfo = rolesList.find(r => r.id === role) || rolesList[0];

  const navItems = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'map', label: t.mapNav, icon: MapPin },
    { id: 'campaigns', label: t.campaignsNav, icon: Users },
    { id: 'impact', label: t.impactNav, icon: BarChart3 },
    { id: 'planting', label: t.plantingNav, icon: Sprout },
    { id: 'atlas', label: t.atlasNav, icon: BookOpen },
    { id: 'clinic', label: t.clinicNav, icon: HeartHandshake },
  ];

  return (
    <header className="sticky top-0 z-40 bg-nafas-sand/95 backdrop-blur-md border-b border-nafas-reed/30 shadow-sm transition-all duration-300">
      {/* Top Banner: Role switcher simulation bar & Demo Notice */}
      <div className="bg-nafas-silt text-nafas-sand px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-nafas-reed/20 gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[11px] font-bold border border-amber-500/30">
            وضع العرض التجريبي (Demo)
          </span>
          <span className="text-nafas-misty font-semibold hidden sm:inline">محاكي الأدوار:</span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${currentRoleInfo.badgeColor}`}>
            {language === 'en' ? currentRoleInfo.labelEn : currentRoleInfo.labelAr}
          </span>
          <span className="text-[11px] text-nafas-sand/60 hidden md:inline">
            (التوثيق الرسمي والشهادات القانونية تتطلب خادم مصادقة وطني)
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Replay Intro button */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('replay-nafas-intro'))}
            className="hover:text-nafas-misty flex items-center gap-1 font-medium transition-colors text-nafas-sand/80 hover:text-white"
            title="إعادة تشغيل المشهد الافتتاحي"
          >
            <PlayCircle className="w-3.5 h-3.5 text-nafas-misty" />
            <span>مشاهدة الدخولية</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="hover:text-nafas-misty flex items-center gap-1 font-medium transition-colors"
              aria-label="تبديل الصلاحية"
            >
              <span>محاكي الأدوار</span>
              <UserCircle className="w-3.5 h-3.5" />
            </button>

            {roleMenuOpen && (
              <div 
                className="absolute left-0 sm:right-0 mt-1 w-72 bg-nafas-ivory text-nafas-silt rounded-xl shadow-xl border border-nafas-reed/30 py-2 z-50 animate-in fade-in slide-in-from-top-1"
                onClick={() => setRoleMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-bold text-nafas-silt/80 border-b border-nafas-reed/20">
                  <div>محاكي أدوار المعاينة التجريبية</div>
                  <div className="text-[10px] text-nafas-silt/60 font-normal mt-0.5">تبديل الدور هنا لمحاكاة الواجهة فقط ولا يمنح تفويضاً رسمياً</div>
                </div>
                {rolesList.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-nafas-sand transition-colors ${role === r.id ? 'font-bold text-nafas-blue bg-nafas-misty/30' : ''}`}
                  >
                    <span>{language === 'en' ? r.labelEn : r.labelAr}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.badgeColor}`}>
                      {r.id}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <button onClick={() => setActiveTab('home')} className="cursor-pointer text-right flex items-center">
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

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onOpenPassportModal}
              className="px-3.5 py-2.5 rounded-xl border border-nafas-blue text-nafas-blue hover:bg-nafas-misty/30 text-sm font-bold flex items-center gap-2 transition-all duration-200 shadow-sm"
            >
              <UserCircle className="w-4 h-4" />
              <span>{t.passportNav}</span>
              <span className="bg-nafas-misty text-nafas-silt px-2 py-0.5 rounded-full text-xs font-mono font-bold">
                {passport.points}ن
              </span>
            </button>

            <button
              onClick={onOpenReportModal}
              className="px-4 py-2.5 rounded-xl bg-nafas-blue hover:bg-nafas-blue-dark text-nafas-ivory text-sm font-bold flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
            >
              <AlertCircle className="w-4 h-4 text-nafas-ivory" />
              <span>{t.reportIssueCta}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={onOpenReportModal}
              className="p-2 rounded-lg bg-nafas-blue text-nafas-ivory text-xs font-bold sm:hidden"
              aria-label="إبلاغ سريع"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-nafas-silt hover:bg-nafas-misty/50 transition-colors"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-nafas-reed/30 bg-nafas-sand px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2">
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
                className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between ${
                  isActive
                    ? 'bg-nafas-blue text-nafas-ivory font-bold'
                    : 'text-nafas-silt hover:bg-nafas-misty/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-nafas-blue" />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}

          <div className="pt-3 border-t border-nafas-reed/30 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenPassportModal();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 rounded-xl border border-nafas-blue text-nafas-blue font-bold text-sm flex items-center justify-center gap-2 bg-nafas-ivory"
            >
              <UserCircle className="w-4 h-4" />
              <span>{t.passportNav} ({passport.points} نقطة أثر)</span>
            </button>
            <button
              onClick={() => {
                onOpenReportModal();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 rounded-xl bg-nafas-blue text-nafas-ivory font-bold text-sm flex items-center justify-center gap-2 shadow"
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
