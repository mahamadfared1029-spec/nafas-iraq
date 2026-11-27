'use client';

import React, { useState, useEffect, useRef } from 'react';
import NafasIntroOverlay from '@/components/intro/NafasIntroOverlay';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { HomeDashboard } from '@/components/home/HomeDashboard';
import { IraqEnvironmentalMap } from '@/components/map/IraqEnvironmentalMap';
import { CampaignList } from '@/components/campaigns/CampaignList';
import { PublicImpactDashboard } from '@/components/impact/PublicImpactDashboard';
import { BeforeAfterShowcase } from '@/components/home/BeforeAfterShowcase';
import { PlantingGuide } from '@/components/education/PlantingGuide';
import { HeritageAtlas } from '@/components/heritage/HeritageAtlas';
import { PlantClinic } from '@/components/clinic/PlantClinic';
import { ReportSubmissionModal } from '@/components/reports/ReportSubmissionModal';
import { ReportDetailModal } from '@/components/reports/ReportDetailModal';
import { VolunteerPassport } from '@/components/passport/VolunteerPassport';
import { RewardsModal } from '@/components/rewards/RewardsModal';
import { CertificateModal } from '@/components/certificates/CertificateModal';
import { AuthModal, AuthModalMode } from '@/components/auth/AuthModal';
import { FounderCommandCenter } from '@/components/admin/FounderCommandCenter';
import { SectionSearchModal } from '@/components/layout/SectionSearchModal';
import { HelpCenterModal } from '@/components/support/HelpCenterModal';
import { NafasAssistantWidget } from '@/components/support/NafasAssistantWidget';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { EnvironmentalReport, IssuedCertificate } from '@/types';
import { getBasePath, getAssetUrl } from '@/lib/basePath';
import { nafasAuth } from '@/lib/auth/authService';
import { 
  ArrowRight, 
  MapPin, 
  Users, 
  BarChart3, 
  Sprout, 
  BookOpen, 
  HeartHandshake,
  Box,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

const VALID_VIEWS = [
  'home', 
  'map', 
  'map-3d', 
  'campaigns', 
  'impact', 
  'planting', 
  'atlas', 
  'clinic', 
  'orchid-3d',
  'admin'
];

function parseViewFromHash(): string {
  if (typeof window === 'undefined') return 'home';
  const cleanHash = window.location.hash.replace(/^#\/?/, '').trim();
  if (cleanHash === 'map3d') return 'map-3d';
  if (cleanHash === 'orchid' || cleanHash === 'clinic-3d' || cleanHash === 'orchid-3d') return 'orchid-3d';
  return VALID_VIEWS.includes(cleanHash) && cleanHash !== 'home' ? cleanHash : 'home';
}

export default function HomePage() {
  // Navigation View State: initialized from URL hash if present
  const [currentView, setCurrentView] = useState<string>('home');

  // Modals state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EnvironmentalReport | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<IssuedCertificate | null>(null);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number; governorateId: string } | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const handleRequireAuth = (action: () => void, mode: AuthModalMode = 'login', noticeText?: string) => {
    if (!nafasAuth.isAuthenticated()) {
      pendingActionRef.current = action;
      setAuthModalMode(mode);
      setAuthNotice(noticeText || 'يرجى تسجيل الدخول أو إنشاء حساب للمتابعة.');
      setAuthModalOpen(true);
      return;
    }
    action();
  };

  useEffect(() => {
    const unsub = nafasAuth.onAuthStateChange((session) => {
      if (session && pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        setAuthModalOpen(false);
        setAuthNotice(null);
        action();
      }
    });
    return unsub;
  }, []);

  // Sync with browser back navigation, initial hash, and refresh
  useEffect(() => {
    // Read initial view from URL hash on mount
    const initialView = parseViewFromHash();
    if (initialView !== 'home') {
      setCurrentView(initialView);
    }

    const syncView = () => {
      const view = parseViewFromHash();
      setCurrentView(view);
    };

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view && VALID_VIEWS.includes(e.state.view)) {
        setCurrentView(e.state.view);
      } else {
        syncView();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', syncView);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', syncView);
    };
  }, []);

  const navigateTo = (viewId: string) => {
    const target = VALID_VIEWS.includes(viewId) ? viewId : 'home';
    setCurrentView(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const base = getBasePath();
      // Ensure basePath is strictly preserved: '/nafas-iraq/' instead of breaking to '/'
      const targetUrl = target === 'home'
        ? (base ? `${base}/` : '/')
        : (base ? `${base}/#${target}` : `#${target}`);
      window.history.pushState({ view: target }, '', targetUrl);
    } catch {
      // Fallback for sandboxed frames
    }
  };

  const handleOpenReportWithCoords = (lat: number, lng: number, governorateId: string) => {
    setPinnedCoords({ lat, lng, governorateId });
    setReportModalOpen(true);
  };

  // View Title and Subtitle Mapping
  const viewHeaders: Record<string, { title: string; subtitle: string; icon: any }> = {
    map: {
      title: 'الخريطة البيئية التفاعلية للعراق',
      subtitle: 'مسارات دجلة والفرات وشط العرب، وحملات التشجير والتنظيف وبلاغات التلوث',
      icon: MapPin
    },
    campaigns: {
      title: 'الحملات التطوعية والمبادرات الميدانية',
      subtitle: 'سجّل حضورك في حملات تنظيف الأنهر وغرس الأشجار واحصل على ساعات موثقة',
      icon: Users
    },
    impact: {
      title: 'أثر نَفَس ولوحة الشفافية الوطنية',
      subtitle: 'أرقام وإحصاءات حقيقية مدعمة بتوثيق مصوّر قبل وبعد المعالجة البيئية',
      icon: BarChart3
    },
    planting: {
      title: 'التقويم الزراعي ودليل التشجير العراقي',
      subtitle: 'إرشادات زراعة النخيل، السدر، الغاف، والأنواع المتأقلمة مع مناخ بلاد الرافدين',
      icon: Sprout
    },
    atlas: {
      title: 'أطلس تراث العراق البيئي — روح الرافدين',
      subtitle: 'تاريخ الأهوار، زقورة أور، جنائن بابل، وحكمة الأسلاف في إدارة المياه والأرض',
      icon: BookOpen
    },
    clinic: {
      title: 'صيدلية نَفَس النباتية',
      subtitle: 'دليل تشخيص آفات النباتات وعلاجات بيئية مستدامة خالية من الكيماويات الضارة',
      icon: HeartHandshake
    },
    'map-3d': {
      title: 'مجسم تضاريس العراق ثلاثي الأبعاد (3D WebGL)',
      subtitle: 'تضاريس ثلاثية الأبعاد تفاعلية لبلاد الرافدين وحوضي دجلة والفرات مع إسقاط بيانات البلاغات',
      icon: Box
    },
    'orchid-3d': {
      title: 'المجسم التشريحي لزهرة الأوركيد (3D Orchid)',
      subtitle: 'نموذج نباتي تفاعلي ثلاثي الأبعاد لاستكشاف بنية الأزهار والأوراق والجذور ومكافحة الآفات',
      icon: Sparkles
    },
    admin: {
      title: 'مركز القيادة والرقابة البيئية',
      subtitle: 'لوحة تحكم المشرف العام (Super Admin) وتدقيق البلاغات الميدانية وإدارة الكادر',
      icon: ShieldCheck
    }
  };

  const activeHeader = viewHeaders[currentView];

  return (
    <div className="min-h-screen flex flex-col bg-nafas-sand text-nafas-silt pb-20 sm:pb-8 selection:bg-nafas-orchid/20 selection:text-nafas-orchid">
      
      {/* 0. Cinematic Mesopotamian Opening Scene (Intact & Preserved) */}
      <NafasIntroOverlay />

      {/* 1. Global Navigation Header */}
      <Header
        activeTab={currentView}
        setActiveTab={navigateTo}
        onOpenReportModal={() => {
          handleRequireAuth(
            () => {
              setPinnedCoords(null);
              setReportModalOpen(true);
            },
            'register',
            'يرجى تسجيل الدخول أو إنشاء حساب مواطن للمشاركة في الإبلاغ عن الانتهاكات البيئية وحماية بيئة العراق.'
          );
        }}
        onOpenPassportModal={() => {
          handleRequireAuth(
            () => setPassportModalOpen(true),
            'login',
            'جواز نَفَس البيئي مخصص للمواطنين المسجلين لجمع نقاط الأثر ونيل الأوسمة والشهادات.'
          );
        }}
        onOpenProfileModal={() => {
          handleRequireAuth(
            () => setProfileModalOpen(true),
            'login',
            'يرجى تسجيل الدخول لتعديل ملفك الشخصي.'
          );
        }}
        onOpenAuthModal={(mode?: AuthModalMode) => {
          setAuthModalMode(mode || 'login');
          setAuthNotice(null);
          setAuthModalOpen(true);
        }}
        onOpenCommandCenter={() => {
          handleRequireAuth(
            () => setCommandCenterOpen(true),
            'login',
            'مركز القيادة والرقابة البيئية مخصص للمشرفين العامين وأعضاء الكادر الإداري المعتمدين.'
          );
        }}
        onOpenSearchModal={() => setSearchModalOpen(true)}
        onOpenHelpModal={() => setHelpModalOpen(true)}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 w-full">
        
        {/* =====================================================================
            A. HOME DASHBOARD (When currentView === 'home')
            ===================================================================== */}
        {currentView === 'home' && (
          <HomeDashboard
            onNavigate={navigateTo}
            onOpenReportModal={() => {
              handleRequireAuth(
                () => {
                  setPinnedCoords(null);
                  setReportModalOpen(true);
                },
                'register',
                'يرجى تسجيل الدخول أو إنشاء حساب مواطن للمشاركة في الإبلاغ عن الانتهاكات البيئية وحماية بيئة العراق.'
              );
            }}
            onOpenPassportModal={() => {
              handleRequireAuth(
                () => setPassportModalOpen(true),
                'login',
                'جواز نَفَس البيئي مخصص للمواطنين المسجلين لجمع نقاط الأثر ونيل الأوسمة والشهادات.'
              );
            }}
            onOpenRewardsModal={() => setRewardsModalOpen(true)}
          />
        )}

        {/* =====================================================================
            B. DEDICATED SUB-SCREEN VIEWS (When currentView !== 'home')
            ===================================================================== */}
        {currentView !== 'home' && activeHeader && (
          <div className="w-full">
            
            {/* Sub-screen Top Bar / Breadcrumb */}
            <div className="bg-nafas-ivory/80 backdrop-blur-md border-b border-nafas-reed/30 px-4 sm:px-6 py-3.5 sticky top-[65px] z-30 transition-all">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                
                {/* Back to Home Button */}
                <button
                  onClick={() => navigateTo('home')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nafas-sand/60 hover:bg-nafas-sand text-nafas-silt font-bold text-xs sm:text-sm border border-nafas-reed/30 transition-colors group shadow-2xs"
                  aria-label="العودة للشاشة الرئيسية"
                >
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>العودة للرئيسية</span>
                </button>

                {/* Sub-screen Title & Icon */}
                <div className="flex items-center gap-2 text-right">
                  <div className="hidden sm:block">
                    <h2 className="text-sm sm:text-base font-black text-nafas-silt leading-tight">
                      {activeHeader.title}
                    </h2>
                    <p className="text-[11px] text-nafas-silt/70">
                      {activeHeader.subtitle}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-nafas-blue/10 border border-nafas-blue/20 flex items-center justify-center text-nafas-blue">
                    {React.createElement(activeHeader.icon, { className: 'w-4 h-4' })}
                  </div>
                </div>

              </div>
            </div>

            {/* Sub-screen Body Container */}
            <div className="py-4 sm:py-6">
              
              {/* 1. Map View (Standard or 3D WebGL) */}
              {(currentView === 'map' || currentView === 'map-3d') && (
                <div className="max-w-6xl mx-auto px-4">
                  <IraqEnvironmentalMap
                    initialLayer={currentView === 'map-3d' ? '3d' : undefined}
                    onSelectReport={(report) => setSelectedReport(report)}
                    onOpenReportModalWithCoords={(lat, lng, gov) => {
                      handleRequireAuth(
                        () => handleOpenReportWithCoords(lat, lng, gov),
                        'register',
                        'يرجى تسجيل الدخول أو إنشاء حساب مواطن للإبلاغ عن الانتهاك البيئي في هذا الموقع.'
                      );
                    }}
                  />
                </div>
              )}

              {/* 2. Campaigns View */}
              {currentView === 'campaigns' && (
                <div className="max-w-5xl mx-auto px-4">
                  <CampaignList
                    onViewCertificate={(cert) => setSelectedCertificate(cert)}
                    onRequireAuth={(notice) => {
                      setAuthModalMode('register');
                      setAuthNotice(notice || 'يرجى تسجيل الدخول أو إنشاء حساب للمتابعة.');
                      setAuthModalOpen(true);
                    }}
                  />
                </div>
              )}

              {/* 3. Impact & Verified Evidence View */}
              {currentView === 'impact' && (
                <div className="max-w-5xl mx-auto px-4 space-y-8">
                  <PublicImpactDashboard />
                  <BeforeAfterShowcase />
                </div>
              )}

              {/* 4. Planting Guide View */}
              {currentView === 'planting' && (
                <div className="max-w-5xl mx-auto px-4">
                  <PlantingGuide />
                </div>
              )}

              {/* 5. Heritage Atlas View */}
              {currentView === 'atlas' && (
                <div className="max-w-5xl mx-auto px-4">
                  <HeritageAtlas />
                </div>
              )}

              {/* 6. Plant Clinic View */}
              {currentView === 'clinic' && (
                <div className="max-w-5xl mx-auto px-4">
                  <PlantClinic />
                </div>
              )}

              {/* 7. 3D Orchid Interactive Studio View */}
              {currentView === 'orchid-3d' && (
                <div className="max-w-6xl mx-auto px-4">
                  <div className="rounded-3xl overflow-hidden border border-nafas-reed/30 shadow-2xl bg-[#140912]">
                    <iframe
                      src={getAssetUrl('/nafas-orchid-3d.html')}
                      title="أوركيد ثلاثية الأبعاد — الخارج، الداخل، والعمليات الداخلية"
                      className="w-full h-[78vh] min-h-[540px] border-0"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* 3. Sticky Mobile Bottom Navigation (Always accessible) */}
      <BottomNav
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenReportModal={() => {
          handleRequireAuth(
            () => {
              setPinnedCoords(null);
              setReportModalOpen(true);
            },
            'register',
            'يرجى تسجيل الدخول أو إنشاء حساب مواطن للمشاركة في الإبلاغ عن الانتهاكات البيئية وحماية بيئة العراق.'
          );
        }}
        onOpenPassportModal={() => {
          handleRequireAuth(
            () => setPassportModalOpen(true),
            'login',
            'جواز نَفَس البيئي مخصص للمواطنين المسجلين لجمع نقاط الأثر ونيل الأوسمة والشهادات.'
          );
        }}
      />

      {/* 4. Modals & Overlays */}
      <ReportSubmissionModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setPinnedCoords(null);
        }}
        initialCoords={pinnedCoords}
      />

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      <VolunteerPassport
        isOpen={passportModalOpen}
        onClose={() => setPassportModalOpen(false)}
        onSelectCertificate={(cert) => setSelectedCertificate(cert)}
      />

      <RewardsModal
        isOpen={rewardsModalOpen}
        onClose={() => setRewardsModalOpen(false)}
      />

      <CertificateModal
        certificate={selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthNotice(null);
          pendingActionRef.current = null;
        }}
        onAuthSuccess={() => {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action && nafasAuth.isAuthenticated()) {
            action();
          }
        }}
        initialMode={authModalMode}
        notice={authNotice}
      />

      <FounderCommandCenter
        isOpen={commandCenterOpen || currentView === 'admin'}
        onClose={() => {
          setCommandCenterOpen(false);
          if (currentView === 'admin') navigateTo('home');
        }}
      />

      <SectionSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectView={(viewId) => navigateTo(viewId)}
        onOpenReport={() => {
          handleRequireAuth(
            () => {
              setPinnedCoords(null);
              setReportModalOpen(true);
            },
            'register',
            'يرجى تسجيل الدخول أو إنشاء حساب مواطن للمشاركة في الإبلاغ عن الانتهاكات البيئية.'
          );
        }}
        onOpenPassport={() => {
          handleRequireAuth(
            () => setPassportModalOpen(true),
            'login',
            'جواز نَفَس البيئي مخصص للمواطنين المسجلين.'
          );
        }}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      <HelpCenterModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <NafasAssistantWidget
        onSelectView={(viewId) => navigateTo(viewId)}
        onOpenReport={() => {
          handleRequireAuth(
            () => {
              setPinnedCoords(null);
              setReportModalOpen(true);
            },
            'register',
            'يرجى تسجيل الدخول أو إنشاء حساب مواطن للمشاركة في الإبلاغ عن الانتهاكات البيئية.'
          );
        }}
        onOpenPassport={() => {
          handleRequireAuth(
            () => setPassportModalOpen(true),
            'login',
            'جواز نَفَس البيئي مخصص للمواطنين المسجلين.'
          );
        }}
        onOpenHelp={() => setHelpModalOpen(true)}
        onOpenAuth={() => {
          setAuthModalMode('login');
          setAuthNotice(null);
          setAuthModalOpen(true);
        }}
      />

    </div>
  );
}
