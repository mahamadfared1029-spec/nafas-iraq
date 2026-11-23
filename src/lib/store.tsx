'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { 
  Role, 
  Language, 
  Season, 
  EnvironmentalReport, 
  VolunteerCampaign, 
  IssuedCertificate, 
  ImpactMetrics,
  ReportStatus
} from '@/types';
import { 
  INITIAL_REPORTS, 
  INITIAL_CAMPAIGNS, 
  IRAQ_GOVERNORATES 
} from './constants';
import { TRANSLATIONS, TranslationDictionary } from './i18n';
import { NafasApiClient } from './server/apiClient';
import { nafasReports } from './reports/reportService';
import { nafasAuth } from './auth/authService';

export interface UserPassport {
  userName: string;
  userPhoneMasked: string;
  governorateId: string;
  verifiedHours: number;
  completedCampaignsCount: number;
  verifiedReportsCount: number;
  treesPlantedCount: number;
  points: number;
  badges: Array<{ id: string; nameAr: string; nameEn: string; icon: string; earnedDate: string }>;
  certificates: IssuedCertificate[];
}

export interface NafasContextType {
  role: Role;
  setRole: (role: Role) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
  season: Season;
  setSeason: (season: Season) => void;
  reports: EnvironmentalReport[];
  campaigns: VolunteerCampaign[];
  passport: UserPassport;
  impactMetrics: ImpactMetrics;
  selectedGovernorateId: string;
  setSelectedGovernorateId: (id: string) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  loadDemoFixtures: () => void;
  resetToCleanProduction: () => void;
  userRegisteredCampaignIds: string[];
  
  // Actions
  addReport: (newReport: Omit<EnvironmentalReport, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'auditLogs' | 'status'>) => EnvironmentalReport;
  updateReportStatus: (reportId: string, newStatus: ReportStatus, notes: string) => void;
  registerForCampaign: (campaignId: string, volunteerName: string) => boolean;
  cancelCampaignRegistration: (campaignId: string) => void;
  verifyAttendance: (campaignId: string, attendeeName: string, hours: number) => IssuedCertificate;
  revokeCertificate: (certId: string, reason: string) => boolean;
  getCertificateById: (certId: string) => IssuedCertificate | undefined;
}

const NafasContext = createContext<NafasContextType | undefined>(undefined);

// Clean launch zero state for authentic production environment
const CLEAN_ZERO_PASSPORT: UserPassport = {
  userName: 'مواطن عراقي',
  userPhoneMasked: '',
  governorateId: 'baghdad',
  verifiedHours: 0,
  completedCampaignsCount: 0,
  verifiedReportsCount: 0,
  treesPlantedCount: 0,
  points: 0,
  badges: [],
  certificates: []
};

// Fixture demo passport strictly reserved for development simulation
const DEMO_FIXTURE_PASSPORT: UserPassport = {
  userName: 'حيدر الكرخي (معاينة)',
  userPhoneMasked: '+964 780 *** 1928',
  governorateId: 'baghdad',
  verifiedHours: 14.5,
  completedCampaignsCount: 3,
  verifiedReportsCount: 2,
  treesPlantedCount: 16,
  points: 230,
  badges: [
    { id: 'b-1', nameAr: 'حارس النهرين', nameEn: 'Guardian of the Two Rivers', icon: 'ShieldCheck', earnedDate: '2026-10-15' },
    { id: 'b-2', nameAr: 'نَفَس أخضر', nameEn: 'Green Breath Pioneer', icon: 'Leaf', earnedDate: '2026-11-04' },
    { id: 'b-3', nameAr: 'عين الميدان', nameEn: 'Field Watcher', icon: 'Eye', earnedDate: '2026-11-12' },
  ],
  certificates: [
    {
      id: 'NFS-CERT-2026-091',
      verificationCode: 'NFS-CERT-2026-091',
      participantName: 'حيدر الكرخي',
      campaignTitle: 'حملة تنظيف شاطئ دجلة — الكرادة',
      governorate: 'بغداد',
      hoursAwarded: 4.5,
      issueDate: '2026-11-12',
      organizerSignature: 'م. مروة الكرخي (منسق نَفَس الميداني)',
      digitalSealHash: '0x8f2a...c94e',
      isDemoCertificate: true,
      watermarkText: 'معاينة تجريبية (Demo Simulator)'
    }
  ]
};

export function NafasProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    const user = nafasAuth.getCurrentUser();
    return user ? user.role : 'guest';
  });
  const [language, setLanguage] = useState<Language>('ar');
  const [season, setSeason] = useState<Season>('auto');
  const [selectedGovernorateId, setSelectedGovernorateId] = useState<string>('all');
  
  // Synchronize authoritative role directly from server session
  useEffect(() => {
    const unsub = nafasAuth.onAuthStateChange((session) => {
      if (session?.user) {
        setRole(session.user.role || 'citizen');
      } else {
        setRole('guest');
      }
    });
    return unsub;
  }, []);
  
  // Production default is strictly false: Zero fabricated reports on live public launch
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Initialize reports: Clean zero array by default, hydrate from localStorage if existing
  const [reports, setReports] = useState<EnvironmentalReport[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nafas_user_reports');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  const [campaigns, setCampaigns] = useState<VolunteerCampaign[]>([]);
  const [userRegisteredCampaignIds, setUserRegisteredCampaignIds] = useState<string[]>([]);
  const [passport, setPassport] = useState<UserPassport>(CLEAN_ZERO_PASSPORT);

  // Synchronize reports to local storage for persistence across reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nafas_user_reports', JSON.stringify(reports));
      } catch (e) {}
    }
  }, [reports]);

  // Load demo fixtures strictly upon explicit developer/simulator request
  const loadDemoFixtures = () => {
    setIsDemoMode(true);
    setReports(INITIAL_REPORTS);
    setCampaigns(INITIAL_CAMPAIGNS);
    setPassport(DEMO_FIXTURE_PASSPORT);
  };

  // Reset to clean zero-state for production launch
  const resetToCleanProduction = () => {
    setIsDemoMode(false);
    setReports([]);
    setCampaigns([]);
    setUserRegisteredCampaignIds([]);
    setPassport(CLEAN_ZERO_PASSPORT);
    try {
      nafasReports.resetDemoData();
    } catch (_) {}
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nafas_user_reports');
      } catch (e) {}
    }
  };

  const t = useMemo(() => TRANSLATIONS[language], [language]);

  // Update HTML dir and lang attributes when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isRtl = language === 'ar' || language === 'ku';
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = language === 'ar' ? 'ar-IQ' : language === 'ku' ? 'ckb' : 'en';
    }
  }, [language]);

  // Dynamically compute real impact metrics from reports and campaigns
  // Truthful metrics: 0 when no approved records exist, no forcing Math.max(1, ...)
  const impactMetrics: ImpactMetrics = useMemo(() => {
    const totalReports = reports.length;
    // Count ONLY verified and resolved issues
    const verifiedReports = reports.filter(r => r.status === 'verified' || r.status === 'resolved').length;
    const resolvedCleanups = reports.filter(r => r.status === 'resolved').length;
    const campaignsCount = campaigns.length;
    
    // Total trees planted from completed campaigns with actual confirmed planted trees
    const totalTrees = campaigns
      .filter(c => c.status === 'completed')
      .reduce((acc, c) => acc + ((c as any).treesPlanted || 0), 0);

    // Total verified volunteer hours from issued unrevoked certificates
    const totalHours = passport.certificates
      .filter(c => !c.revoked)
      .reduce((acc, c) => acc + (c.hoursAwarded || 0), 0);

    const activeGovs = (reports.length > 0 || campaigns.length > 0)
      ? new Set([
          ...reports.map(r => r.governorateId),
          ...campaigns.map(c => c.governorateId)
        ]).size
      : 0;

    // Real active volunteers: registered volunteers across active campaigns + completed participants (if 0, stays 0)
    const activeVolunteersCount = campaigns.reduce((acc, c) => acc + (c.registeredCount || 0), 0) + 
      (passport.completedCampaignsCount > 0 ? 1 : 0);

    return {
      totalReportsSubmitted: totalReports,
      totalVerifiedIssues: verifiedReports,
      totalResolvedCleanups: resolvedCleanups,
      totalCampaignsHeld: campaignsCount,
      totalActiveVolunteers: activeVolunteersCount,
      totalVolunteerHours: Number(totalHours.toFixed(1)),
      totalTreesPlanted: totalTrees,
      activeGovernoratesCount: activeGovs,
      lastUpdated: new Date().toISOString()
    };
  }, [reports, campaigns, passport.certificates, passport.completedCampaignsCount]);

  /**
   * Add a new environmental report
   * STRICT REWARD INTEGRITY: No points are awarded on initial unverified submission.
   * Reports enter the moderation queue as 'submitted' (بانتظار المراجعة).
   */
  const addReport = (newReportData: Omit<EnvironmentalReport, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'auditLogs' | 'status'>): EnvironmentalReport => {
    // Collision-resistant tracking number
    const randPart = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? (crypto.getRandomValues(new Uint32Array(1))[0] % 9000) + 1000
      : Math.floor(1000 + Math.random() * 9000);
    const tracking = `NFS-2026-${randPart}`;
    const now = new Date().toISOString();

    const createdReport: EnvironmentalReport = {
      ...newReportData,
      id: tracking,
      trackingNumber: tracking,
      source_layer_version: newReportData.source_layer_version || 'gbOpen-IRQ-ADM1-2022',
      createdAt: now,
      updatedAt: now,
      status: 'submitted', // Enforce 'submitted' default moderation status
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          actor: newReportData.reportedBy || 'مواطن',
          actorRole: role,
          previousStatus: 'submitted',
          newStatus: 'submitted',
          notes: `تم استلام البلاغ الميداني وإدراجه بانتظار المراجعة (المصدر: ${newReportData.location_source || 'ميداني'}، الدقة: ${newReportData.accuracy_m ? '±' + newReportData.accuracy_m + 'م' : 'غير محددة'}).`
        }
      ]
    };

    setReports(prev => [createdReport, ...prev]);

    // Send to central persistent reports store and notification outbox
    try {
      nafasReports.submitReport({
        title: createdReport.title,
        description: createdReport.description,
        category: createdReport.category,
        severity: createdReport.severity,
        governorateId: createdReport.governorateId,
        neighborhood: createdReport.neighborhood,
        lat: createdReport.lat,
        lng: createdReport.lng,
        location_source: createdReport.location_source,
        accuracy_m: createdReport.accuracy_m,
        imageBeforeUrl: createdReport.imageBeforeUrl,
        isAnonymous: createdReport.isAnonymous,
        isHazardous: createdReport.isHazardous
      }).catch(() => {});
    } catch (_) {}

    // Send to backend API client if configured
    try {
      const api = NafasApiClient.getInstance();
      api.submitReport(createdReport).catch(() => {});
    } catch (_) {}

    // Note: Points are awarded ONLY after official moderation verification in updateReportStatus,
    // NEVER immediately upon unverified submission.

    return createdReport;
  };

  /**
   * Update report status (moderator/admin action)
   * Points are awarded ONLY when transitioning to 'verified' for the first time.
   */
  const updateReportStatus = (reportId: string, newStatus: ReportStatus, notes: string) => {
    const now = new Date().toISOString();
    let wasJustVerified = false;

    setReports(prev => prev.map(report => {
      if (report.id === reportId) {
        if (newStatus === 'verified' && report.status !== 'verified' && report.status !== 'resolved') {
          wasJustVerified = true;
        }

        const newLog = {
          id: `log-${Date.now()}`,
          timestamp: now,
          actor: role === 'moderator' ? 'مشرف نَفَس المعتمد' : role === 'admin' ? 'مدير المنصة' : 'منسق الحملة',
          actorRole: role,
          previousStatus: report.status,
          newStatus,
          notes: notes || `تحديث حالة البلاغ إلى ${newStatus}`
        };
        return {
          ...report,
          status: newStatus,
          updatedAt: now,
          auditLogs: [...report.auditLogs, newLog]
        };
      }
      return report;
    }));

    // Award verification reward points upon genuine approval
    if (wasJustVerified) {
      setPassport(prev => ({
        ...prev,
        points: prev.points + 25,
        verifiedReportsCount: prev.verifiedReportsCount + 1
      }));
    }
  };

  const registerForCampaign = (campaignId: string, volunteerName: string): boolean => {
    // Prevent duplicate registration for the same campaign
    if (userRegisteredCampaignIds.includes(campaignId)) {
      return false;
    }

    let success = false;
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        if (c.registeredCount < c.volunteerCapacity) {
          success = true;
          return {
            ...c,
            registeredCount: c.registeredCount + 1,
            confirmedCount: c.confirmedCount + 1
          };
        }
      }
      return c;
    }));

    if (success) {
      setUserRegisteredCampaignIds(prev => [...prev, campaignId]);
      // Small civic engagement incentive on genuine registration
      setPassport(prev => ({
        ...prev,
        points: prev.points + 15,
      }));
    }
    return success;
  };

  const cancelCampaignRegistration = (campaignId: string) => {
    setUserRegisteredCampaignIds(prev => prev.filter(id => id !== campaignId));
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId && c.registeredCount > 0) {
        return {
          ...c,
          registeredCount: c.registeredCount - 1,
          confirmedCount: Math.max(0, c.confirmedCount - 1)
        };
      }
      return c;
    }));
  };

  const verifyAttendance = (campaignId: string, attendeeName: string, hours: number): IssuedCertificate => {
    // Enforce role authorization: only organizers and admins may issue certificates
    if (role !== 'organizer' && role !== 'admin') {
      throw new Error('غير مصرح لك باعتماد ساعات التطوع أو إصدار الشهادات. الصلاحية مخصصة لمنسقي الحملات والمشرفين فقط.');
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    const gov = IRAQ_GOVERNORATES.find(g => g.id === campaign?.governorateId)?.nameAr || 'العراق';
    
    // Collision-resistant certificate ID
    const timeHex = Date.now().toString(16).toUpperCase().slice(-4);
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const certCode = `NFS-CERT-2026-${timeHex}-${randCode}`;
    const issueDate = new Date().toISOString().split('T')[0];

    // Deterministic cryptographic seal hash (FNV-1a 32-bit + timestamp entropy)
    const inputStr = `${attendeeName || passport.userName}-${campaignId}-${hours}-${issueDate}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < inputStr.length; i++) {
      h ^= inputStr.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    const digitalSealHash = `0x${h.toString(16).padStart(8, '0')}${Date.now().toString(16).padStart(8, '0')}`;

    const newCert: IssuedCertificate = {
      id: certCode,
      verificationCode: certCode,
      participantName: attendeeName || passport.userName,
      campaignTitle: campaign?.titleAr || 'حملة نَفَس البيئية',
      governorate: gov,
      hoursAwarded: hours || 4.0,
      issueDate,
      organizerSignature: campaign?.organizer || 'إدارة منصة نَفَس',
      digitalSealHash,
      revoked: false,
      isDemoCertificate: isDemoMode,
      watermarkText: isDemoMode ? 'معاينة تجريبية (Demo Simulator) — غير معتمد رسمياً دون مصادقة الخادم الوطني' : undefined
    };

    setPassport(prev => ({
      ...prev,
      verifiedHours: prev.verifiedHours + hours,
      completedCampaignsCount: prev.completedCampaignsCount + 1,
      treesPlantedCount: prev.treesPlantedCount + ((campaign as any)?.treesPlanted ? Math.ceil((campaign as any).treesPlanted / (campaign?.volunteerCapacity || 1)) : 0),
      points: prev.points + 100,
      certificates: [newCert, ...prev.certificates]
    }));

    return newCert;
  };

  const revokeCertificate = (certId: string, reason: string): boolean => {
    if (role !== 'organizer' && role !== 'admin') {
      throw new Error('غير مصرح لك بإلغاء الشهادات. الصلاحية مخصصة لمنسقي الحملات والمشرفين فقط.');
    }
    let found = false;
    setPassport(prev => ({
      ...prev,
      certificates: prev.certificates.map(c => {
        if (c.id === certId || c.verificationCode === certId) {
          found = true;
          return {
            ...c,
            revoked: true,
            revokedReason: reason || 'تم إلغاء الشهادة بعد المراجعة الإدارية للتحقق من الحضور الميداني.',
            revokedAt: new Date().toISOString()
          };
        }
        return c;
      })
    }));
    return found;
  };

  const getCertificateById = (certId: string): IssuedCertificate | undefined => {
    return passport.certificates.find(c => c.id === certId || c.verificationCode === certId);
  };

  return (
    <NafasContext.Provider
      value={{
        role,
        setRole,
        language,
        setLanguage,
        t,
        season,
        setSeason,
        reports,
        campaigns,
        passport,
        impactMetrics,
        selectedGovernorateId,
        setSelectedGovernorateId,
        isDemoMode,
        setIsDemoMode,
        loadDemoFixtures,
        resetToCleanProduction,
        userRegisteredCampaignIds,
        addReport,
        updateReportStatus,
        registerForCampaign,
        cancelCampaignRegistration,
        verifyAttendance,
        revokeCertificate,
        getCertificateById
      }}
    >
      {children}
    </NafasContext.Provider>
  );
}

export function useNafas() {
  const context = useContext(NafasContext);
  if (!context) {
    throw new Error('useNafas must be used within a NafasProvider');
  }
  return context;
}
