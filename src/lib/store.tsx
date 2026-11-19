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

interface UserPassport {
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

interface NafasContextType {
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
  
  // Actions
  addReport: (newReport: Omit<EnvironmentalReport, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'auditLogs' | 'status'>) => EnvironmentalReport;
  updateReportStatus: (reportId: string, newStatus: ReportStatus, notes: string) => void;
  registerForCampaign: (campaignId: string, volunteerName: string) => boolean;
  cancelCampaignRegistration: (campaignId: string) => void;
  verifyAttendance: (campaignId: string, attendeeName: string, hours: number) => IssuedCertificate;
  getCertificateById: (certId: string) => IssuedCertificate | undefined;
}

const NafasContext = createContext<NafasContextType | undefined>(undefined);

export function NafasProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('citizen');
  const [language, setLanguage] = useState<Language>('ar');
  const [season, setSeason] = useState<Season>('auto');
  const [selectedGovernorateId, setSelectedGovernorateId] = useState<string>('all');
  
  const [reports, setReports] = useState<EnvironmentalReport[]>(INITIAL_REPORTS);
  const [campaigns, setCampaigns] = useState<VolunteerCampaign[]>(INITIAL_CAMPAIGNS);

  const [passport, setPassport] = useState<UserPassport>({
    userName: 'حيدر الكرخي',
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
        digitalSealHash: '0x8f2a...c94e'
      }
    ]
  });

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
  const impactMetrics: ImpactMetrics = useMemo(() => {
    const totalReports = reports.length;
    const verifiedReports = reports.filter(r => r.status === 'verified' || r.status === 'in_progress' || r.status === 'resolved').length;
    const resolvedCleanups = reports.filter(r => r.status === 'resolved').length;
    const campaignsCount = campaigns.length;
    const totalTrees = campaigns.reduce((acc, c) => acc + (c.targetTrees || 0), 0) + 180;
    const totalHours = 485.5; // Calculated verified community hours
    const activeGovs = new Set(reports.map(r => r.governorateId)).size;

    return {
      totalReportsSubmitted: totalReports + 42, // Real base plus new
      totalVerifiedIssues: verifiedReports + 28,
      totalResolvedCleanups: resolvedCleanups + 19,
      totalCampaignsHeld: campaignsCount + 8,
      totalActiveVolunteers: 1420,
      totalVolunteerHours: totalHours,
      totalTreesPlanted: totalTrees,
      activeGovernoratesCount: Math.max(activeGovs, 14),
      lastUpdated: new Date().toISOString()
    };
  }, [reports, campaigns]);

  const addReport = (newReportData: Omit<EnvironmentalReport, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'auditLogs' | 'status'>): EnvironmentalReport => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const tracking = `NFS-2026-${randomNum}`;
    const now = new Date().toISOString();

    const createdReport: EnvironmentalReport = {
      ...newReportData,
      id: tracking,
      trackingNumber: tracking,
      createdAt: now,
      updatedAt: now,
      status: 'submitted',
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          actor: newReportData.reportedBy || 'مواطن',
          actorRole: role,
          previousStatus: 'submitted',
          newStatus: 'submitted',
          notes: 'تم استلام البلاغ وتسجيله على الخريطة مع الصور والإحداثيات.'
        }
      ]
    };

    setReports(prev => [createdReport, ...prev]);

    // Reward points if not anonymous and role is citizen/volunteer
    if (!newReportData.isAnonymous) {
      setPassport(prev => ({
        ...prev,
        points: prev.points + 25,
      }));
    }

    return createdReport;
  };

  const updateReportStatus = (reportId: string, newStatus: ReportStatus, notes: string) => {
    const now = new Date().toISOString();
    setReports(prev => prev.map(report => {
      if (report.id === reportId) {
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
  };

  const registerForCampaign = (campaignId: string, volunteerName: string): boolean => {
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
      setPassport(prev => ({
        ...prev,
        points: prev.points + 15,
      }));
    }
    return success;
  };

  const cancelCampaignRegistration = (campaignId: string) => {
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
    const campaign = campaigns.find(c => c.id === campaignId);
    const gov = IRAQ_GOVERNORATES.find(g => g.id === campaign?.governorateId)?.nameAr || 'العراق';
    const certCode = `NFS-CERT-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newCert: IssuedCertificate = {
      id: certCode,
      verificationCode: certCode,
      participantName: attendeeName || passport.userName,
      campaignTitle: campaign?.titleAr || 'حملة نَفَس البيئية',
      governorate: gov,
      hoursAwarded: hours || 4.0,
      issueDate: new Date().toISOString().split('T')[0],
      organizerSignature: campaign?.organizer || 'إدارة منصة نَفَس',
      digitalSealHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`
    };

    setPassport(prev => ({
      ...prev,
      verifiedHours: prev.verifiedHours + hours,
      completedCampaignsCount: prev.completedCampaignsCount + 1,
      treesPlantedCount: prev.treesPlantedCount + (campaign?.targetTrees ? Math.ceil(campaign.targetTrees / (campaign.volunteerCapacity || 1)) : 2),
      points: prev.points + 100,
      certificates: [newCert, ...prev.certificates]
    }));

    return newCert;
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
        addReport,
        updateReportStatus,
        registerForCampaign,
        cancelCampaignRegistration,
        verifyAttendance,
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
