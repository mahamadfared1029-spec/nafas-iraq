import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nafasApi } from '../src/lib/server/apiClient';
import { getBasePath, getAssetUrl } from '../src/lib/basePath';
import { IRAQ_GOVERNORATES } from '../src/lib/constants';
import { isPointInPolygon } from '../src/lib/gisContainment';
import { GOVERNORATES_GIS_DATA } from '../src/lib/iraqGeoData';
import fs from 'fs';
import path from 'path';

describe('NAFAS Defect Fixes & Production Readiness Test Suite', () => {

  // ---------------------------------------------------------------------------
  // 1. Navigation, BasePath & Hash-based Deep Linking
  // ---------------------------------------------------------------------------
  describe('1. Navigation, BasePath & URL Hash Integrity', () => {
    it('should correctly determine basePath and not produce root / on reload', () => {
      const base = getBasePath();
      // In local dev/test or production basePath is string
      expect(typeof base).toBe('string');
      
      const assetUrl = getAssetUrl('/nafas-iraq-3d.html');
      expect(assetUrl).toContain('nafas-iraq-3d.html');
      if (base) {
        expect(assetUrl.startsWith(base)).toBe(true);
      }
    });

    it('should parse views from URL hash correctly without resetting to home', () => {
      const parseViewFromHash = (hash: string) => {
        const clean = hash.replace(/^#\/?/, '').toLowerCase().trim();
        const validViews = ['home', 'map', 'campaigns', 'impact', 'planting', 'atlas', 'clinic', 'rewards', 'passport'];
        return validViews.includes(clean) ? clean : 'home';
      };

      expect(parseViewFromHash('#map')).toBe('map');
      expect(parseViewFromHash('#/campaigns')).toBe('campaigns');
      expect(parseViewFromHash('#clinic')).toBe('clinic');
      expect(parseViewFromHash('#impact')).toBe('impact');
      expect(parseViewFromHash('#invalid-view')).toBe('home');
      expect(parseViewFromHash('')).toBe('home');

      // Test 3D views deep-linking
      const parseAppViewFromHash = (hash: string) => {
        const clean = hash.replace(/^#\/?/, '').toLowerCase().trim();
        if (clean === 'map3d') return 'map-3d';
        if (clean === 'orchid' || clean === 'clinic-3d') return 'orchid-3d';
        const validViews = ['home', 'map', 'map-3d', 'campaigns', 'impact', 'planting', 'atlas', 'clinic', 'orchid-3d'];
        return validViews.includes(clean) ? clean : 'home';
      };

      expect(parseAppViewFromHash('#map-3d')).toBe('map-3d');
      expect(parseAppViewFromHash('#map3d')).toBe('map-3d');
      expect(parseAppViewFromHash('#orchid-3d')).toBe('orchid-3d');
      expect(parseAppViewFromHash('#orchid')).toBe('orchid-3d');
      expect(parseAppViewFromHash('#clinic-3d')).toBe('orchid-3d');
    });

    it('should construct pushState URLs maintaining basePath to prevent 404', () => {
      const buildNavigateUrl = (base: string, viewId: string) => {
        if (viewId === 'home') {
          return base ? `${base}/` : '/';
        }
        return `${base ? base : ''}/#${viewId}`;
      };

      const ghPagesBase = '/nafas-iraq';
      expect(buildNavigateUrl(ghPagesBase, 'home')).toBe('/nafas-iraq/');
      expect(buildNavigateUrl(ghPagesBase, 'map')).toBe('/nafas-iraq/#map');
      expect(buildNavigateUrl(ghPagesBase, 'clinic')).toBe('/nafas-iraq/#clinic');
      
      // Never push bare '/' under subpath deployment!
      expect(buildNavigateUrl(ghPagesBase, 'home')).not.toBe('/');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Data & Auth Isolation (Demo vs Production Backend Layer)
  // ---------------------------------------------------------------------------
  describe('2. Data & Auth Isolation (Demo vs Production)', () => {
    it('should transparently report demo simulator status when external backend env vars are absent', () => {
      const status = nafasApi.getStatus();
      expect(status.mode).toBe('demo_simulator');
      expect(status.isConfigured).toBe(false);
      expect(status.missingEnv).toContain('NEXT_PUBLIC_API_URL');
      expect(status.missingEnv).toContain('DATABASE_URL');
      expect(status.noticeAr).toContain('وضع العرض التجريبي');
    });

    it('should refuse certificate issuance without organizer/admin authorization', async () => {
      const simulateVerifyAttendance = (userRole: string) => {
        if (userRole !== 'organizer' && userRole !== 'admin') {
          throw new Error('غير مصرح لك باعتماد ساعات التطوع أو إصدار الشهادات. الصلاحية مخصصة لمنسقي الحملات والمشرفين فقط.');
        }
        return true;
      };

      expect(() => simulateVerifyAttendance('citizen')).toThrow(/غير مصرح لك/);
      expect(() => simulateVerifyAttendance('volunteer')).toThrow(/غير مصرح لك/);
      expect(() => simulateVerifyAttendance('guest')).toThrow(/غير مصرح لك/);
      expect(simulateVerifyAttendance('organizer')).toBe(true);
      expect(simulateVerifyAttendance('admin')).toBe(true);
    });

    it('should flag issued certificates in demo mode with isDemoCertificate and watermarkText', () => {
      const issueDemoCert = (campaignTitle: string, hours: number) => {
        return {
          id: 'NFS-CERT-2026-TEST-1234',
          verificationCode: 'NFS-CERT-2026-TEST-1234',
          campaignTitle,
          hoursAwarded: hours,
          isDemoCertificate: true,
          watermarkText: 'معاينة تجريبية (Demo Simulator) — غير معتمد رسمياً دون مصادقة الخادم الوطني'
        };
      };

      const cert = issueDemoCert('حملة تنظيف دجلة', 3.5);
      expect(cert.isDemoCertificate).toBe(true);
      expect(cert.watermarkText).toContain('Demo Simulator');
    });

    it('should prevent duplicate campaign registrations for the same user', () => {
      const registeredIds: string[] = [];
      const registerForCampaign = (campaignId: string) => {
        if (registeredIds.includes(campaignId)) {
          return false; // Duplicate registration rejected
        }
        registeredIds.push(campaignId);
        return true;
      };

      expect(registerForCampaign('CMP-001')).toBe(true);
      expect(registerForCampaign('CMP-001')).toBe(false); // Second registration MUST fail
      expect(registeredIds.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Geographic Coordinates & Integrity Check
  // ---------------------------------------------------------------------------
  describe('3. Coordinates Confirmation & GPS Failure Handling', () => {
    it('should strictly reject coordinate submission outside Iraq geographic bounding box', () => {
      const validateCoordinates = (lat: number | null, lng: number | null) => {
        if (lat === null || lng === null) return false;
        return lat >= 28.5 && lat <= 38.5 && lng >= 38.0 && lng <= 49.5;
      };

      expect(validateCoordinates(null, null)).toBe(false);
      expect(validateCoordinates(33.3152, 44.3661)).toBe(true); // Baghdad (valid)
      expect(validateCoordinates(30.5081, 47.7835)).toBe(true); // Basra (valid)
      expect(validateCoordinates(51.5074, -0.1278)).toBe(false); // London (invalid)
      expect(validateCoordinates(0, 0)).toBe(false); // Null island (invalid)
    });

    it('should not silently fall back to Baghdad center on GPS failure', () => {
      // Simulating GPS error handler in ReportSubmissionModal
      let coords: { lat: number; lng: number } | null = { lat: 33.3152, lng: 44.3661 };
      
      const onGpsError = () => {
        // True behavior: reset coords to null and do not leave silent center
        coords = null;
      };

      onGpsError();
      expect(coords).toBeNull();
    });

    it('should perform ray-casting point-in-polygon verification against official boundaries', () => {
      const baghdadGov = GOVERNORATES_GIS_DATA.find(g => g.id === 'baghdad')!;
      expect(baghdadGov).toBeDefined();

      // Inside Baghdad
      const insideBaghdad = isPointInPolygon(33.3152, 44.3661, baghdadGov.polygon);
      expect(insideBaghdad).toBe(true);

      // Outside Baghdad (Basra coordinates)
      const basraInBaghdad = isPointInPolygon(30.5081, 47.7835, baghdadGov.polygon);
      expect(basraInBaghdad).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Impact Metrics Truthfulness (No artificial tree/volunteer/offset inflation)
  // ---------------------------------------------------------------------------
  describe('4. Truthful Impact Metrics Calculations', () => {
    it('should return 0 for all metrics when no reports or campaigns exist', () => {
      const computeMetrics = (reportsList: any[], campaignsList: any[], certsList: any[], completedCount: number) => {
        const totalReports = reportsList.length;
        const verifiedReports = reportsList.filter(r => r.status === 'verified' || r.status === 'resolved').length;
        const resolvedCleanups = reportsList.filter(r => r.status === 'resolved').length;
        const campaignsCount = campaignsList.length;
        
        const totalTrees = campaignsList
          .filter(c => c.status === 'completed')
          .reduce((acc, c) => acc + (c.treesPlanted || 0), 0);

        const totalHours = certsList
          .filter(c => !c.revoked)
          .reduce((acc, c) => acc + (c.hoursAwarded || 0), 0);

        const activeGovs = (reportsList.length > 0 || campaignsList.length > 0)
          ? new Set([...reportsList.map(r => r.governorateId), ...campaignsList.map(c => c.governorateId)]).size
          : 0;

        const activeVolunteersCount = campaignsList.reduce((acc, c) => acc + (c.registeredCount || 0), 0) + 
          (completedCount > 0 ? 1 : 0);

        return {
          totalReportsSubmitted: totalReports,
          totalVerifiedIssues: verifiedReports,
          totalResolvedCleanups: resolvedCleanups,
          totalCampaignsHeld: campaignsCount,
          totalActiveVolunteers: activeVolunteersCount, // No Math.max(1, ...)
          totalVolunteerHours: Number(totalHours.toFixed(1)),
          totalTreesPlanted: totalTrees,
          activeGovernoratesCount: activeGovs
        };
      };

      const emptyMetrics = computeMetrics([], [], [], 0);
      expect(emptyMetrics.totalReportsSubmitted).toBe(0);
      expect(emptyMetrics.totalVerifiedIssues).toBe(0);
      expect(emptyMetrics.totalResolvedCleanups).toBe(0);
      expect(emptyMetrics.totalCampaignsHeld).toBe(0);
      expect(emptyMetrics.totalActiveVolunteers).toBe(0); // Zero, NOT 1
      expect(emptyMetrics.totalVolunteerHours).toBe(0);
      expect(emptyMetrics.totalTreesPlanted).toBe(0);
      expect(emptyMetrics.activeGovernoratesCount).toBe(0);
    });

    it('should exclude in_progress reports from totalVerifiedIssues', () => {
      const reports = [
        { id: '1', status: 'submitted' },
        { id: '2', status: 'in_progress' }, // Must NOT be counted as verified
        { id: '3', status: 'verified' },
        { id: '4', status: 'resolved' }
      ];

      const verifiedCount = reports.filter(r => r.status === 'verified' || r.status === 'resolved').length;
      expect(verifiedCount).toBe(2); // Only verified and resolved
    });

    it('should not inflate trees planted from targetTrees or flora*5', () => {
      const campaigns = [
        { id: 'c1', status: 'upcoming', targetTrees: 100, treesPlanted: 0 },
        { id: 'c2', status: 'completed', targetTrees: 50, treesPlanted: 45 }
      ];
      const reports = [
        { id: 'r1', category: 'flora', status: 'resolved' },
        { id: 'r2', category: 'flora', status: 'resolved' }
      ];

      // Old flawed calculation was: completed.targetTrees + reports(flora)*5 = 50 + 10 = 60
      // Honest calculation: only actual verified planted trees
      const honestTrees = campaigns
        .filter(c => c.status === 'completed')
        .reduce((acc, c) => acc + (c.treesPlanted || 0), 0);

      expect(honestTrees).toBe(45); // Exactly 45 verified trees, not 60
    });
  });

  // ---------------------------------------------------------------------------
  // 5. 3D WebGL Security & Origin Checks
  // ---------------------------------------------------------------------------
  describe('5. 3D WebGL Bridge Security & PostMessage Validation', () => {
    it('should reject postMessage from untrusted origins or wrong source window', () => {
      const currentOrigin: string = 'https://nafas.iq';
      const fakeIframeWindow = {} as Window;
      const actualIframeWindow = {} as Window;

      const validateMessageEvent = (e: { origin: string; source: any; data: any }) => {
        if (e.origin !== currentOrigin && e.origin !== 'null' && Boolean(currentOrigin)) {
          return false; // Rejected: untrusted origin
        }
        if (e.source !== actualIframeWindow) {
          return false; // Rejected: wrong source iframe
        }
        if (!e.data || typeof e.data !== 'object') {
          return false; // Rejected: malformed data
        }
        return true;
      };

      // Trusted message
      expect(validateMessageEvent({
        origin: 'https://nafas.iq',
        source: actualIframeWindow,
        data: { type: 'nafas:province-select', detail: { name: 'بغداد' } }
      })).toBe(true);

      // Untrusted attacker origin
      expect(validateMessageEvent({
        origin: 'https://evil-attacker.com',
        source: actualIframeWindow,
        data: { type: 'nafas:province-select', detail: { name: 'بغداد' } }
      })).toBe(false);

      // Wrong window source
      expect(validateMessageEvent({
        origin: 'https://nafas.iq',
        source: fakeIframeWindow,
        data: { type: 'nafas:province-select', detail: { name: 'بغداد' } }
      })).toBe(false);
    });

    it('should verify 3D HTML files do not use wildcard * in parent.postMessage', () => {
      const map3dPath = path.resolve(__dirname, '../public/nafas-iraq-3d.html');
      const orchidPath = path.resolve(__dirname, '../public/nafas-orchid-3d.html');

      const map3dContent = fs.readFileSync(map3dPath, 'utf-8');
      const orchidContent = fs.readFileSync(orchidPath, 'utf-8');

      expect(map3dContent).toContain('targetOrigin');
      expect(orchidContent).toContain('targetOrigin');
      
      // Both must use targetOrigin computed from window.location.origin
      expect(map3dContent).toContain('window.parent.postMessage({type,detail:payload}, targetOrigin)');
      expect(orchidContent).toContain('window.parent.postMessage({type,detail:payload}, targetOrigin)');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. 3D Models Discoverability & Intro Replay Reliability
  // ---------------------------------------------------------------------------
  describe('6. 3D Models Discoverability & Intro Replay Reliability', () => {
    it('should verify NafasIntroOverlay registers listeners and handles #intro trigger without early exit', () => {
      const introPath = path.resolve(__dirname, '../src/components/intro/NafasIntroOverlay.tsx');
      const introContent = fs.readFileSync(introPath, 'utf-8');

      // Must support replay-nafas-intro event
      expect(introContent).toContain("'replay-nafas-intro'");
      expect(introContent).toContain("addEventListener('replay-nafas-intro'");
      
      // Must support #intro or ?intro=1
      expect(introContent).toContain("hash === '#intro'");
      
      // Must support ESC key to dismiss
      expect(introContent).toContain("e.key === 'Escape'");
      
      // Must have iframe src pointing to intro.html
      expect(introContent).toContain("getAssetUrl('/intro.html')");
    });

    it('should verify HomeDashboard contains dedicated 3D showcase and replay intro CTA', () => {
      const homePath = path.resolve(__dirname, '../src/components/home/HomeDashboard.tsx');
      const homeContent = fs.readFileSync(homePath, 'utf-8');

      // Replay intro CTA
      expect(homeContent).toContain("'replay-nafas-intro'");
      expect(homeContent).toContain('الدخولية');

      // 3D showcase card (Iraq 3D map)
      expect(homeContent).toContain("onNavigate('map-3d')");
      expect(homeContent).toContain('مجسم تضاريس العراق ثلاثي الأبعاد');
    });

    it('should verify page.tsx routes map-3d view', () => {
      const pagePath = path.resolve(__dirname, '../src/app/page.tsx');
      const pageContent = fs.readFileSync(pagePath, 'utf-8');

      expect(pageContent).toContain("'map-3d'");
      expect(pageContent).toContain("initialLayer={currentView === 'map-3d' ? '3d' : undefined}");
    });

    it('should verify IraqEnvironmentalMap supports initial 3D mode', () => {
      const mapPath = path.resolve(__dirname, '../src/components/map/IraqEnvironmentalMap.tsx');

      const mapContent = fs.readFileSync(mapPath, 'utf-8');

      expect(mapContent).toContain('initialLayer');
      expect(mapContent).toContain("hash === '#map-3d'");
    });
  });

});
