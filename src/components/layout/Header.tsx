'use client';

import React, { useState } from 'react';
import { NafasLogo } from '@/components/brand/NafasLogo';
import { useNafas } from '@/lib/store';
import { Role, Language } from '@/types';
import { 
  MapPin, 
  AlertCircle, 
  Users, 
  BarChart3, 
  Sprout, 
  BookOpen, 
  HeartHandshake, 
  ShieldCheck, 
  Menu, 
  X, 
  Globe, 
  UserCircle 
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
  const { role, setRole, language, setLanguage, t, passport } = useNafas();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const rolesList: { id: Role; labelAr: string; labelEn: string; badgeColor: string }[] = [
    { id: 'citizen', labelAr: 'مواطن (إبلاغ ومتابعة)', labelEn: 'Citizen (Report & Track)', badgeColor: 'bg-nafas-mist text-nafas-midnight' },
    { id: 'volunteer', labelAr: 'متطوع موثّق (مشاركة وشهادات)', labelEn: 'Volunteer (Events & Certs)', badgeColor: 'bg-nafas-dawn text-nafas-midnight' },
    { id: 'organizer', labelAr: 'منسق حملة (تحضير وحضور)', labelEn: 'Organizer (Events & Check-in)', badgeColor: 'bg-amber-100 text-amber-900' },
    { id: 'moderator', labelAr: 'مشرف بيئي (مراجعة واعتماد)', labelEn: 'Moderator (Review & Verify)', badgeColor: 'bg-emerald-100 text-emerald-900' },
    { id: 'admin', labelAr: 'إدارة النظام (تحكم شامل)', labelEn: 'Administrator (Full Access)', badgeColor: 'bg-purple-100 text-purple-900' },
    { id: 'guest', labelAr: 'زائر عام', labelEn: 'Guest Visitor', badgeColor: 'bg-gray-100 text-gray-800' }
  ];

  const currentRoleInfo = rolesList.find(r => r.id === role) || rolesList[0];

  const navItems = [
    { id: 'map', label: t.mapNav, icon: MapPin },
    { id: 'reports', label: t.reportsNav, icon: AlertCircle },
    { id: 'campaigns', label: t.campaignsNav, icon: Users },
    { id: 'impact', label: t.impactNav, icon: BarChart3 },
    { id: 'planting', label: t.plantingNav, icon: Sprout },
    { id: 'atlas', label: t.atlasNav, icon: BookOpen },
    { id: 'clinic', label: t.clinicNav, icon: HeartHandshake },
  ];

  return (
    <header className="sticky top-0 z-40 bg-nafas-limestone/95 backdrop-blur-md border-b border-nafas-midnight/10 shadow-sm transition-all duration-300">
      {/* Top Banner: Role switcher simulation bar */}
      <div className="bg-nafas-midnight text-nafas-limestone px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-nafas-midnight/20">
        <div className="flex items-center gap-2">
          <span className="text-nafas-dawn font-semibold">تجربة الأدوار المباشرة:</span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${currentRoleInfo.badgeColor}`}>
            {language === 'en' ? currentRoleInfo.labelEn : currentRoleInfo.labelAr}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="hover:text-nafas-clay flex items-center gap-1 font-medium transition-colors"
              aria-label="تبديل الصلاحية"
            >
              <span>{t.roleSwitcherLabel}</span>
              <UserCircle className="w-3.5 h-3.5" />
            </button>

            {roleMenuOpen && (
              <div 
                className="absolute left-0 sm:right-0 mt-1 w-64 bg-white text-nafas-midnight rounded-xl shadow-xl border border-nafas-midnight/10 py-2 z-50 animate-in fade-in slide-in-from-top-1"
                onClick={() => setRoleMenuOpen(false)}
              >
                <div className="px-3 py-1 text-[11px] font-bold text-nafas-neutral-slate uppercase border-b border-gray-100">
                  اختر الدور للتحقق المباشر
                </div>
                {rolesList.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-nafas-limestone transition-colors ${role === r.id ? 'font-bold text-nafas-clay bg-nafas-limestone/50' : ''}`}
                  >
                    <span>{language === 'en' ? r.labelEn : r.labelAr}</span>
                    {role === r.id && <ShieldCheck className="w-4 h-4 text-nafas-clay" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-3 w-px bg-white/20" />

          {/* Language Selector */}
          <div className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-nafas-dawn" />
            <button
              onClick={() => setLanguage('ar')}
              className={`px-1.5 py-0.5 rounded text-[11px] ${language === 'ar' ? 'bg-nafas-clay text-white font-bold' : 'hover:text-nafas-dawn'}`}
            >
              عربي
            </button>
            <button
              onClick={() => setLanguage('ku')}
              className={`px-1.5 py-0.5 rounded text-[11px] ${language === 'ku' ? 'bg-nafas-clay text-white font-bold' : 'hover:text-nafas-dawn'}`}
            >
              کوردی
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-1.5 py-0.5 rounded text-[11px] ${language === 'en' ? 'bg-nafas-clay text-white font-bold' : 'hover:text-nafas-dawn'}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="cursor-pointer" onClick={() => setActiveTab('hero')}>
            <NafasLogo size="md" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                    isActive
                      ? 'bg-nafas-midnight text-nafas-limestone shadow-sm font-semibold'
                      : 'text-nafas-neutral-slate hover:text-nafas-midnight hover:bg-nafas-mist/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-nafas-dawn' : 'text-nafas-clay'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onOpenPassportModal}
              className="px-3.5 py-2.5 rounded-xl border border-nafas-clay text-nafas-clay hover:bg-nafas-clay hover:text-white text-sm font-bold flex items-center gap-2 transition-all duration-200 shadow-sm"
            >
              <UserCircle className="w-4 h-4" />
              <span>{t.passportNav}</span>
              <span className="bg-nafas-clay/10 text-nafas-clay hover:text-white px-2 py-0.5 rounded-full text-xs font-mono font-bold">
                {passport.points}ن
              </span>
            </button>

            <button
              onClick={onOpenReportModal}
              className="px-4 py-2.5 rounded-xl bg-nafas-clay-dark hover:bg-nafas-clay text-white text-sm font-bold flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{t.reportIssueCta}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={onOpenReportModal}
              className="p-2 rounded-lg bg-nafas-clay-dark text-white text-xs font-bold sm:hidden"
              aria-label="إبلاغ سريع"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-nafas-midnight hover:bg-nafas-mist/50 transition-colors"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-nafas-midnight/10 bg-nafas-limestone px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2">
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
                    ? 'bg-nafas-midnight text-nafas-limestone font-bold'
                    : 'text-nafas-neutral-slate hover:bg-nafas-mist/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-nafas-clay" />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}

          <div className="pt-3 border-t border-nafas-midnight/10 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenPassportModal();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 rounded-xl border border-nafas-clay text-nafas-clay font-bold text-sm flex items-center justify-center gap-2"
            >
              <UserCircle className="w-4 h-4" />
              <span>{t.passportNav} ({passport.points} نقطة أثر)</span>
            </button>
            <button
              onClick={() => {
                onOpenReportModal();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 rounded-xl bg-nafas-clay-dark text-white font-bold text-sm flex items-center justify-center gap-2 shadow"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{t.reportIssueCta}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
