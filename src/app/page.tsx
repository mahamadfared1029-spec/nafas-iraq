'use client';

import React, { useState } from 'react';
import NafasIntroOverlay from '@/components/intro/NafasIntroOverlay';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/home/Hero';
import { BeforeAfterShowcase } from '@/components/home/BeforeAfterShowcase';
import { IraqEnvironmentalMap } from '@/components/map/IraqEnvironmentalMap';
import { CampaignList } from '@/components/campaigns/CampaignList';
import { PublicImpactDashboard } from '@/components/impact/PublicImpactDashboard';
import { PlantingGuide } from '@/components/education/PlantingGuide';
import { HeritageAtlas } from '@/components/heritage/HeritageAtlas';
import { PlantClinic } from '@/components/clinic/PlantClinic';
import { ReportSubmissionModal } from '@/components/reports/ReportSubmissionModal';
import { ReportDetailModal } from '@/components/reports/ReportDetailModal';
import { VolunteerPassport } from '@/components/passport/VolunteerPassport';
import { CertificateModal } from '@/components/certificates/CertificateModal';
import { EnvironmentalReport, IssuedCertificate } from '@/types';
import { useNafas } from '@/lib/store';

export default function HomePage() {
  const { setSelectedGovernorateId } = useNafas();

  // Modals & Overlay state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EnvironmentalReport | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<IssuedCertificate | null>(null);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number; governorateId: string } | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('hero');

  const handleOpenReportWithCoords = (lat: number, lng: number, governorateId: string) => {
    setPinnedCoords({ lat, lng, governorateId });
    setReportModalOpen(true);
  };

  const scrollToSection = (tabId: string) => {
    setActiveTab(tabId);
    const element = document.getElementById(tabId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-nafas-sand text-nafas-silt">
      
      {/* 0. Authentic Mesopotamian Opening Scene (Intro Entry) */}
      <NafasIntroOverlay />

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={scrollToSection}
        onOpenReportModal={() => {
          setPinnedCoords(null);
          setReportModalOpen(true);
        }}
        onOpenPassportModal={() => setPassportModalOpen(true)}
      />

      <main className="flex-1">
        
        {/* 1. Hero Narrative Section */}
        <div id="hero">
          <Hero
            onOpenReportModal={() => {
              setPinnedCoords(null);
              setReportModalOpen(true);
            }}
            onExploreCampaigns={() => scrollToSection('campaigns')}
            onExploreMap={() => scrollToSection('map')}
          />
        </div>

        {/* 2. Interactive Environmental Map of Iraq */}
        <div id="map">
          <IraqEnvironmentalMap
            onSelectReport={(report) => setSelectedReport(report)}
            onOpenReportModalWithCoords={handleOpenReportWithCoords}
          />
        </div>

        {/* 3. Before & After Verified Evidence Showcase */}
        <div id="reports">
          <BeforeAfterShowcase />
        </div>

        {/* 4. Volunteer Campaigns & Mobilization */}
        <div id="campaigns">
          <CampaignList
            onViewCertificate={(cert) => setSelectedCertificate(cert)}
          />
        </div>

        {/* 5. Public Impact & Transparency Dashboard */}
        <div id="impact">
          <PublicImpactDashboard />
        </div>

        {/* 6. Regional Planting Calendar */}
        <div id="planting">
          <PlantingGuide />
        </div>

        {/* 7. Iraqi Heritage Experience: Atlas Nafas */}
        <div id="atlas">
          <HeritageAtlas />
        </div>

        {/* 8. Plant Clinic (صيدلية نَفَس النباتية) */}
        <div id="clinic">
          <PlantClinic />
        </div>

      </main>

      {/* Footer */}
      <Footer />

      {/* Modal 1: Report Submission */}
      <ReportSubmissionModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        initialCoords={pinnedCoords}
      />

      {/* Modal 2: Report Detail & Moderator Audit Logs */}
      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      {/* Modal 3: Volunteer Passport Dashboard */}
      <VolunteerPassport
        isOpen={passportModalOpen}
        onClose={() => setPassportModalOpen(false)}
        onSelectCertificate={(cert) => {
          setPassportModalOpen(false);
          setSelectedCertificate(cert);
        }}
      />

      {/* Modal 4: Verifiable Digital Certificate */}
      <CertificateModal
        certificate={selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
      />

    </div>
  );
}
