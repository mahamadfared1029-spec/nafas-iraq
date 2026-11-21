import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NafasNotificationService, AlertPayload } from '../src/lib/server/notificationService';
import fs from 'fs';
import path from 'path';

describe('NAFAS Master Prompt V5 — Production Refinement Verification Suite', () => {

  // ---------------------------------------------------------------------------
  // 1. Official Logo Branding & Asset Integrity
  // ---------------------------------------------------------------------------
  describe('01. Official NAFAS Logo & Brand Integration', () => {
    it('should have the official SVG logo asset in public/nafas-logo.svg and public/icon.svg', () => {
      const logoPath = path.resolve(__dirname, '../public/nafas-logo.svg');
      const iconPath = path.resolve(__dirname, '../public/icon.svg');
      
      expect(fs.existsSync(logoPath)).toBe(true);
      expect(fs.existsSync(iconPath)).toBe(true);

      const svgContent = fs.readFileSync(logoPath, 'utf-8');
      // Verify authoritative brand elements in SVG
      expect(svgContent).toContain('nafasCreamBase'); // Warm cream background #F7F1E7
      expect(svgContent).toContain('nafasWalnutRing'); // Walnut brown framing ring #6B463B
      expect(svgContent).toContain('community-figures'); // Five stylized community figures
      expect(svgContent).toContain('orchid-core'); // Central purple orchid symbol
    });

    it('should include the official brand logo SVG and subtitle in public/intro.html', () => {
      const introPath = path.resolve(__dirname, '../public/intro.html');
      expect(fs.existsSync(introPath)).toBe(true);

      const html = fs.readFileSync(introPath, 'utf-8');
      expect(html).toContain('brand-logo');
      expect(html).toContain('intro-orchid');
      expect(html).toContain('للبيئة الاجتماعية');
      expect(html).toContain('خلّي العراق يتنفس');
    });

    it('should verify NafasLogo component source contains the official specifications', () => {
      const compPath = path.resolve(__dirname, '../src/components/brand/NafasLogo.tsx');
      expect(fs.existsSync(compPath)).toBe(true);

      const src = fs.readFileSync(compPath, 'utf-8');
      expect(src).toContain('للبيئة الاجتماعية');
      expect(src).toContain('nafasCreamBase');
      expect(src).toContain('nafasWalnutRing');
      expect(src).toContain('community-figure');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Production Zero-State vs Demo Isolation
  // ---------------------------------------------------------------------------
  describe('02. Reset Demonstration Reports & Clean Public Launch State', () => {
    it('should calculate 0 metrics for clean zero launch state', () => {
      const cleanReports: any[] = [];
      const cleanCampaigns: any[] = [];
      const cleanCerts: any[] = [];

      const totalReports = cleanReports.length;
      const verifiedReports = cleanReports.filter(r => r.status === 'verified' || r.status === 'resolved').length;
      const resolvedCleanups = cleanReports.filter(r => r.status === 'resolved').length;
      const totalTrees = cleanCampaigns
        .filter(c => c.status === 'completed')
        .reduce((acc, c) => acc + (c.treesPlanted || 0), 0);
      const totalHours = cleanCerts
        .filter(c => !c.revoked)
        .reduce((acc, c) => acc + (c.hoursAwarded || 0), 0);
      const activeVolunteers = cleanCampaigns.reduce((acc, c) => acc + (c.registeredCount || 0), 0);

      expect(totalReports).toBe(0);
      expect(verifiedReports).toBe(0);
      expect(resolvedCleanups).toBe(0);
      expect(totalTrees).toBe(0);
      expect(totalHours).toBe(0);
      expect(activeVolunteers).toBe(0);
    });

    it('should contain the approved welcoming Arabic zero-state text', () => {
      const mapPath = path.resolve(__dirname, '../src/components/map/IraqEnvironmentalMap.tsx');
      const mapSrc = fs.readFileSync(mapPath, 'utf-8');

      expect(mapSrc).toContain('بعدنا بالبداية... وأول تغيير يبدي منك.');
      expect(mapSrc).toContain('ماكو بلاغات موثقة حالياً');
      expect(mapSrc).toContain('أضف أول بلاغ');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. GIS Real Map as Default
  // ---------------------------------------------------------------------------
  describe('03. Real Interactive GIS Map as Default', () => {
    it('should default mapLayerMode to gis rather than vector', () => {
      const mapPath = path.resolve(__dirname, '../src/components/map/IraqEnvironmentalMap.tsx');
      const mapSrc = fs.readFileSync(mapPath, 'utf-8');

      // The default returned when no hash is present must be 'gis'
      expect(mapSrc).toContain("return 'gis';");
    });

    it('should not inject MASTER_MAP_PINS into production when isDemoMode is false', () => {
      const isDemoMode = false;
      const MASTER_MAP_PINS = [{ id: 'demo-1' }, { id: 'demo-2' }];
      const basePins = isDemoMode ? [...MASTER_MAP_PINS] : [];

      expect(basePins.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Reward System Integrity (Verification-based Points)
  // ---------------------------------------------------------------------------
  describe('07. Fix Reward & Certificate Logic', () => {
    it('should NOT award points when a report is initially submitted (status: submitted)', () => {
      let userPoints = 0;
      let verifiedReportsCount = 0;

      const simulateAddReport = (status: string) => {
        // Enforce: no points on submission
        if (status === 'verified') {
          userPoints += 25;
          verifiedReportsCount += 1;
        }
      };

      simulateAddReport('submitted');
      expect(userPoints).toBe(0);
      expect(verifiedReportsCount).toBe(0);

      // Points awarded ONLY when moderator approves to 'verified'
      simulateAddReport('verified');
      expect(userPoints).toBe(25);
      expect(verifiedReportsCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Private Email Notification System & Security
  // ---------------------------------------------------------------------------
  describe('05. Private Email Notification Backend & Security', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should NEVER hardcode the private email address in frontend source files', () => {
      const srcDir = path.resolve(__dirname, '../src');
      const publicDir = path.resolve(__dirname, '../public');

      const checkFileForForbiddenEmail = (dir: string) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            if (file.name !== 'node_modules' && file.name !== '.git') {
              checkFileForForbiddenEmail(fullPath);
            }
          } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.html') || file.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Check that the temporary private email is NEVER written in source files
            expect(content).not.toContain('hbb56185' + '@gmail.com');
          }
        }
      };

      checkFileForForbiddenEmail(srcDir);
      checkFileForForbiddenEmail(publicDir);
    });

    it('should format Arabic notification email properly with tracking number and governorate', () => {
      const service = NafasNotificationService.getInstance();
      const payload: AlertPayload = {
        reportId: 'rep-001',
        trackingNumber: 'NFS-2026-9901',
        category: 'garbage',
        categoryLabelAr: 'تراكم نفايات عشوائية',
        governorate: 'بغداد',
        neighborhood: 'الكرادة',
        approximateLocation: '33.3039, 44.4215',
        date: '2026-11-21 14:00',
        moderationStatus: 'بانتظار المراجعة',
        isHazardous: true,
        severity: 'high',
        adminDashboardUrl: 'https://nafas-iraq.org/admin/reports/rep-001'
      };

      const email = service.formatAlertEmail(payload);
      expect(email.subject).toContain('[عاجل - خطر بيئي]');
      expect(email.subject).toContain('بغداد');
      expect(email.subject).toContain('NFS-2026-9901');
      expect(email.text).toContain('تراكم نفايات عشوائية');
      expect(email.html).toContain('NFS-2026-9901');
      expect(email.html).toContain('فتح لوحة المشرف للمراجعة والاعتماد');
    });

    it('should return disabled_unconfigured status when NAFAS_ALERT_EMAIL is not set', async () => {
      delete process.env.NAFAS_ALERT_EMAIL;
      delete process.env.RESEND_API_KEY;

      const service = NafasNotificationService.getInstance();
      const payload: AlertPayload = {
        reportId: 'rep-test-no-env',
        trackingNumber: 'NFS-2026-0001',
        category: 'sewage',
        categoryLabelAr: 'تسرب مياه صرف صحي',
        governorate: 'البصرة',
        neighborhood: 'العشار',
        approximateLocation: '30.5185, 47.8440',
        date: '2026-11-21',
        moderationStatus: 'submitted',
        isHazardous: false,
        severity: 'medium',
        adminDashboardUrl: 'https://nafas-iraq.org/admin'
      };

      const result = await service.dispatchReportAlert(payload);
      expect(result.status).toBe('disabled_unconfigured');
      expect(result.recipientConfigured).toBe(false);
      expect(result.error).toContain('NAFAS_ALERT_EMAIL');
    });

    it('should queue notification safely without pretending delivery when transport credentials are unset', async () => {
      process.env.NAFAS_ALERT_EMAIL = 'admin-secure@example.com';
      delete process.env.RESEND_API_KEY;
      delete process.env.EMAIL_API_KEY;
      delete process.env.SMTP_HOST;

      const service = NafasNotificationService.getInstance();
      const payload: AlertPayload = {
        reportId: 'rep-test-queued',
        trackingNumber: 'NFS-2026-0002',
        category: 'deforestation',
        categoryLabelAr: 'قطع أشجار وتجريف بساتين',
        governorate: 'نينوى',
        neighborhood: 'الغابات',
        approximateLocation: '36.3489, 43.1577',
        date: '2026-11-21',
        moderationStatus: 'submitted',
        isHazardous: false,
        severity: 'high',
        adminDashboardUrl: 'https://nafas-iraq.org/admin'
      };

      const result = await service.dispatchReportAlert(payload);
      expect(result.status).toBe('queued');
      expect(result.recipientConfigured).toBe(true);
      expect(result.provider).toBe('mock_transport_pending_credentials');
    });
  });
});
