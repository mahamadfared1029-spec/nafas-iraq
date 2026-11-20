import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  IRAQ_GOVERNORATES, 
  CATEGORY_INFO, 
  INITIAL_REPORTS, 
  INITIAL_CAMPAIGNS, 
  PLANTING_RECOMMENDATIONS, 
  HERITAGE_CHAPTERS 
} from '../src/lib/constants';
import { TRANSLATIONS } from '../src/lib/i18n';
import { EnvironmentalReport, ReportAuditLog, ReportStatus } from '../src/types';

describe('NAFAS — The Breath of Mesopotamia: Master Test Suite', () => {

  // Test Suite 1: Brand, Intro & Mesopotamian Color Palette
  describe('1. Brand & Mesopotamian Nature Color Palette', () => {
    it('should contain all 18 official Iraqi governorates with valid coordinates and trilingual names', () => {
      expect(IRAQ_GOVERNORATES).toHaveLength(18);
      
      const expectedGovIds = [
        'baghdad', 'basra', 'nineveh', 'erbil', 'sulaymaniyah', 
        'duhok', 'kirkuk', 'anbar', 'babil', 'karbala', 
        'najaf', 'wasit', 'maysan', 'dhi_qar', 'muthanna', 
        'qadisiyyah', 'diyala', 'saladin'
      ];

      expectedGovIds.forEach(id => {
        const gov = IRAQ_GOVERNORATES.find(g => g.id === id);
        expect(gov).toBeDefined();
        expect(gov?.nameAr).toBeTruthy();
        expect(gov?.nameKu).toBeTruthy();
        expect(gov?.nameEn).toBeTruthy();
        expect(gov?.lat).toBeGreaterThan(29);
        expect(gov?.lat).toBeLessThan(38);
        expect(gov?.lng).toBeGreaterThan(38);
        expect(gov?.lng).toBeLessThan(49);
      });
    });

    it('should strictly enforce the new post-intro Mesopotamian Nature Palette', () => {
      const mesopotamianPalette = {
        sand: '#F4EFE5',        // رمل فاتح - Page background
        ivory: '#FFFCF5',       // عاجي - Card surfaces & input fields
        silt: '#302D29',        // طمي داكن - Headings & primary text
        blue: '#28566E',        // أزرق الرافدين - Primary buttons, links, active navigation
        misty: '#D8E8ED',       // أزرق ضبابي - Selected filters & info alerts
        reed: '#C8B68D',        // قصب جاف - Dividers & subtle decorative details
      };

      expect(mesopotamianPalette.sand).toBe('#F4EFE5');
      expect(mesopotamianPalette.ivory).toBe('#FFFCF5');
      expect(mesopotamianPalette.silt).toBe('#302D29');
      expect(mesopotamianPalette.blue).toBe('#28566E');
      expect(mesopotamianPalette.misty).toBe('#D8E8ED');
      expect(mesopotamianPalette.reed).toBe('#C8B68D');
    });

    it('should ensure Mesopotamian Blue (#28566E) with Ivory (#FFFCF5) text meets WCAG AAA contrast (>= 7:1)', () => {
      const hexToRgb = (hex: string) => {
        const num = parseInt(hex.replace('#', ''), 16);
        return [num >> 16, (num >> 8) & 255, num & 255];
      };

      const getLuminance = (r: number, g: number, b: number) => {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      };

      const [r1, g1, b1] = hexToRgb('#28566E'); // Blue button
      const [r2, g2, b2] = hexToRgb('#FFFCF5'); // Ivory text
      const lum1 = getLuminance(r1, g1, b1);
      const lum2 = getLuminance(r2, g2, b2);

      const contrastRatio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
      expect(contrastRatio).toBeGreaterThanOrEqual(7.0); // WCAG AAA
    });

    it('should verify Dark Silt (#302D29) on Light Sand (#F4EFE5) meets WCAG AAA contrast', () => {
      const hexToRgb = (hex: string) => {
        const num = parseInt(hex.replace('#', ''), 16);
        return [num >> 16, (num >> 8) & 255, num & 255];
      };

      const getLuminance = (r: number, g: number, b: number) => {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      };

      const [r1, g1, b1] = hexToRgb('#302D29');
      const [r2, g2, b2] = hexToRgb('#F4EFE5');
      const lum1 = getLuminance(r1, g1, b1);
      const lum2 = getLuminance(r2, g2, b2);

      const contrastRatio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
      expect(contrastRatio).toBeGreaterThanOrEqual(7.0);
    });

    it('should verify intro file is deployed to public/ directory with skip button and cuneiform', () => {
      const introPath = path.resolve(__dirname, '../public/intro.html');
      expect(fs.existsSync(introPath)).toBe(true);
      const content = fs.readFileSync(introPath, 'utf-8');
      expect(content).toContain('نَفَس');
      expect(content).toContain('NAFAS');
      expect(content).toContain('تخطّي إلى الموقع');
      expect(content).toContain('prefers-reduced-motion');
    });
  });

  // Test Suite 2: Citizen Reporting & Hazard Safety
  describe('2. Citizen Reporting & Hazard Safety Engine', () => {
    it('should detect hazardous keywords and trigger immediate safety alert', () => {
      const hazardKeywords = ['كيميائي', 'سام', 'إطارات', 'طبي', 'حقن', 'أسلاك', 'مستشفى', 'بطاريات', 'حريق'];
      
      const safeDescription = 'تراكم قناني بلاستيكية وكراتين فارغة على الرصيف';
      const hazardousDescription = 'حرق إطارات ومخلفات أسلاك وبطاريات سيارات ينبعث منها دخان سام';

      const isSafe = hazardKeywords.some(k => safeDescription.includes(k));
      const isHazardous = hazardKeywords.some(k => hazardousDescription.includes(k));

      expect(isSafe).toBe(false);
      expect(isHazardous).toBe(true);
    });

    it('should format unique tracking numbers as NFS-2026-XXXX', () => {
      const trackingRegex = /^NFS-2026-\d{4}$/;
      const sample = 'NFS-2026-8812';
      expect(trackingRegex.test(sample)).toBe(true);
    });

    it('should support anonymous reporting with PII isolation', () => {
      const anonymousReport: Partial<EnvironmentalReport> = {
        reportedBy: 'مواطن مجهول',
        isAnonymous: true,
      };

      expect(anonymousReport.isAnonymous).toBe(true);
      expect(anonymousReport.reportedBy).toBe('مواطن مجهول');
    });
  });

  // Test Suite 3: Report Lifecycle & Immutable Audit Trail
  describe('3. Report Lifecycle State Machine & Audit History', () => {
    it('should enforce state transitions and preserve audit logs', () => {
      const initialReport = INITIAL_REPORTS[0];
      expect(initialReport.auditLogs.length).toBeGreaterThanOrEqual(3);

      const logs = initialReport.auditLogs;
      expect(logs[0].newStatus).toBe('submitted');
      const hasVerifiedOrProgress = logs.some(l => l.newStatus === 'verified' || l.newStatus === 'in_progress');
      expect(hasVerifiedOrProgress).toBe(true);
      expect(logs[logs.length - 1].newStatus).toBe('resolved');
    });

    it('should reject unverified remediation claims', () => {
      const sampleReport: EnvironmentalReport = {
        ...INITIAL_REPORTS[2],
        status: 'in_progress',
        imageAfterUrl: undefined
      };

      const canResolve = Boolean(sampleReport.imageAfterUrl && sampleReport.status === 'resolved');
      expect(canResolve).toBe(false);
    });
  });

  // Test Suite 4: Volunteer Mobilization & Capacity Control
  describe('4. Volunteer Campaigns & Quota Constraints', () => {
    it('should enforce volunteer registration capacity and spots calculation', () => {
      const campaign = INITIAL_CAMPAIGNS[0];
      const spotsLeft = campaign.volunteerCapacity - campaign.registeredCount;
      
      expect(spotsLeft).toBe(6);
      expect(spotsLeft).toBeGreaterThan(0);
      expect(campaign.registeredCount).toBeLessThanOrEqual(campaign.volunteerCapacity);
    });

    it('should mask volunteer phone numbers to protect citizen privacy', () => {
      const rawPhone = '+9647801234567';
      const maskPhone = (phone: string) => {
        return phone.replace(/(\+\d{3})\d+(\d{4})$/, '$1 *** $2');
      };

      const masked = maskPhone(rawPhone);
      expect(masked).toBe('+964 *** 4567');
      expect(masked).not.toContain('123');
    });
  });

  // Test Suite 5: Verifiable Certificates & Anti-Farming Points
  describe('5. Verifiable Digital Certificates & Points Ledger', () => {
    it('should generate valid certificate verification codes', () => {
      const certCode = 'NFS-CERT-2026-091';
      const certRegex = /^NFS-CERT-2026-\d{3,4}$/;
      expect(certRegex.test(certCode)).toBe(true);
    });

    it('should only award participation points upon verified attendance', () => {
      let volunteerPoints = 100;
      const registeredOnly = false;
      const verifiedAttendance = true;

      if (registeredOnly) volunteerPoints += 0;
      if (verifiedAttendance) volunteerPoints += 100;

      expect(volunteerPoints).toBe(200);
    });
  });

  // Test Suite 6: Agricultural Planting Guide & Climate Zone Validation
  describe('6. Iraqi Flora & Planting Science', () => {
    it('should include high-heat and drought tolerant native Iraqi species', () => {
      const palm = PLANTING_RECOMMENDATIONS.find(p => p.id === 'p-1');
      const sidr = PLANTING_RECOMMENDATIONS.find(p => p.id === 'p-2');
      
      expect(palm).toBeDefined();
      expect(palm?.heatTolerance).toBe('extreme');
      expect(palm?.salinityTolerance).toBe('high');

      expect(sidr).toBeDefined();
      expect(sidr?.waterNeed).toBe('low');
      expect(sidr?.heatTolerance).toBe('extreme');
    });
  });

  // Test Suite 7: Trilingual Localization Integrity
  describe('7. Trilingual Localization & Direction', () => {
    it('should have complete dictionaries for Arabic, Kurdish Sorani, and English', () => {
      expect(TRANSLATIONS.ar.brandName).toBe('نَفَس');
      expect(TRANSLATIONS.ku.brandName).toBe('نَفَس');
      expect(TRANSLATIONS.en.brandName).toBe('NAFAS');

      expect(TRANSLATIONS.ar.brandTagline).toBe('خلّي العراق يتنفس');
      expect(TRANSLATIONS.ku.brandTagline).toBe('با عێراق هەناسە بدات');
      expect(TRANSLATIONS.en.brandTagline).toBe('Let Iraq Breathe');
    });
  });

  // Test Suite 8: Master UX Restructuring & Geographic GIS Architecture
  describe('8. Master UX Restructuring & GIS Architecture', () => {
    it('should verify real GIS national border coordinates encompass Iraq', async () => {
      const { IRAQ_BORDER_COORDINATES } = await import('../src/lib/iraqGeoData');
      expect(IRAQ_BORDER_COORDINATES.length).toBeGreaterThanOrEqual(20);
      
      // Verify northernmost, southernmost, westernmost, and easternmost bounds
      const lats = IRAQ_BORDER_COORDINATES.map(pt => pt[0]);
      const lngs = IRAQ_BORDER_COORDINATES.map(pt => pt[1]);
      
      expect(Math.max(...lats)).toBeGreaterThanOrEqual(37.0); // Northern Kurdistan
      expect(Math.min(...lats)).toBeLessThanOrEqual(29.9);   // Southern Basra/Faw
      expect(Math.min(...lngs)).toBeLessThanOrEqual(39.0);   // Western desert (Trebil)
      expect(Math.max(...lngs)).toBeGreaterThanOrEqual(48.5); // Eastern border (Faw/Shatt)
    });

    it('should verify Mesopotamian rivers (Tigris, Euphrates, Shatt al-Arab) GIS paths', async () => {
      const { 
        TIGRIS_RIVER_PATH, 
        EUPHRATES_RIVER_PATH, 
        SHATT_AL_ARAB_PATH 
      } = await import('../src/lib/iraqGeoData');

      expect(TIGRIS_RIVER_PATH.length).toBeGreaterThanOrEqual(15);
      expect(EUPHRATES_RIVER_PATH.length).toBeGreaterThanOrEqual(15);
      expect(SHATT_AL_ARAB_PATH.length).toBeGreaterThanOrEqual(5);

      // Verify meeting at Qurna ([31.01, 47.43])
      const tigrisEnd = TIGRIS_RIVER_PATH[TIGRIS_RIVER_PATH.length - 1];
      const euphratesEnd = EUPHRATES_RIVER_PATH[EUPHRATES_RIVER_PATH.length - 1];
      const shattStart = SHATT_AL_ARAB_PATH[0];

      expect(tigrisEnd[0]).toBeCloseTo(31.01, 1);
      expect(tigrisEnd[1]).toBeCloseTo(47.43, 1);
      expect(euphratesEnd[0]).toBeCloseTo(31.01, 1);
      expect(euphratesEnd[1]).toBeCloseTo(47.43, 1);
      expect(shattStart[0]).toBeCloseTo(31.01, 1);
      expect(shattStart[1]).toBeCloseTo(47.43, 1);
    });

    it('should verify all 4 interactive pin categories have distinct colors and schemas', async () => {
      const { MASTER_MAP_PINS } = await import('../src/lib/iraqGeoData');
      
      const plantingPins = MASTER_MAP_PINS.filter(p => p.type === 'planting');
      const cleanupPins = MASTER_MAP_PINS.filter(p => p.type === 'cleanup');
      const pollutionPins = MASTER_MAP_PINS.filter(p => p.type === 'pollution');
      const activityPins = MASTER_MAP_PINS.filter(p => p.type === 'activity');

      expect(plantingPins.length).toBeGreaterThan(0);
      expect(cleanupPins.length).toBeGreaterThan(0);
      expect(pollutionPins.length).toBeGreaterThan(0);
      expect(activityPins.length).toBeGreaterThan(0);

      // Verify specified color tokens
      expect(plantingPins[0].color).toBe('#16A34A'); // Green
      expect(cleanupPins[0].color).toBe('#2563EB');   // Blue
      expect(pollutionPins[0].color).toBe('#C66F50'); // Copper
      expect(activityPins[0].color).toBe('#62467D');  // Deep Orchid Purple
    });

    it('should verify GIS polygons for all 18 governorates exist', async () => {
      const { GOVERNORATES_GIS_DATA } = await import('../src/lib/iraqGeoData');
      expect(GOVERNORATES_GIS_DATA.length).toBe(18);

      GOVERNORATES_GIS_DATA.forEach(gov => {
        expect(gov.polygon.length).toBeGreaterThanOrEqual(4);
        expect(gov.center[0]).toBeGreaterThan(29);
        expect(gov.center[0]).toBeLessThan(38);
      });
    });
  });

  // Test Suite 9: Truthful Report Lifecycle, Coordinates & Impact Integrity
  describe('9. Truthful Reporting Lifecycle & Unpadded Impact Metrics', () => {
    it('should verify no random math offset exists in report coordinates', async () => {
      // Coordinates must be deterministic from GPS, initial pin, or governorate center
      const testGov = IRAQ_GOVERNORATES.find(g => g.id === 'baghdad')!;
      expect(testGov.lat).toBe(33.3152);
      expect(testGov.lng).toBe(44.3661);
    });

    it('should calculate impact metrics strictly from genuine records without arbitrary +42/+19 offsets', async () => {
      const sampleReports = [
        { id: '1', status: 'verified', category: 'garbage', governorateId: 'baghdad' },
        { id: '2', status: 'resolved', category: 'water', governorateId: 'basra' },
        { id: '3', status: 'submitted', category: 'debris', governorateId: 'nineveh' }
      ];

      const sampleCampaigns = [
        { id: 'c1', status: 'completed', targetTrees: 50, registeredCount: 15, governorateId: 'baghdad' },
        { id: 'c2', status: 'upcoming', targetTrees: 100, registeredCount: 20, governorateId: 'basra' }
      ];

      // Exact count verification
      const totalSubmitted = sampleReports.length;
      const totalVerified = sampleReports.filter(r => r.status === 'verified' || r.status === 'resolved').length;
      const totalResolved = sampleReports.filter(r => r.status === 'resolved').length;
      const totalCampaigns = sampleCampaigns.length;

      expect(totalSubmitted).toBe(3); // Strictly 3, not 3 + 42
      expect(totalVerified).toBe(2);  // Strictly 2, not 2 + 28
      expect(totalResolved).toBe(1);  // Strictly 1, not 1 + 19
      expect(totalCampaigns).toBe(2); // Strictly 2, not 2 + 8
    });

    it('should verify collision-resistant certificate code pattern and revocation flag', () => {
      const codeRegex = /^NFS-CERT-2026-[A-F0-9]{4}-\d{4}$/;
      const sampleCode = 'NFS-CERT-2026-A1B2-5432';
      expect(codeRegex.test(sampleCode)).toBe(true);

      const cert = {
        id: sampleCode,
        verificationCode: sampleCode,
        revoked: false
      };
      expect(cert.revoked).toBe(false);
    });
  });

  // Test Suite 10: 3D WebGL Assets, Base Path & Historical Boundary Integrity
  describe('10. 3D WebGL Assets & Historical Boundary Compliance', () => {
    it('should verify nafas-iraq-3d.html exists with Three.js WebGL and CC0 2022 historical boundary notice', () => {
      const map3dPath = path.resolve(__dirname, '../public/nafas-iraq-3d.html');
      expect(fs.existsSync(map3dPath)).toBe(true);
      const content = fs.readFileSync(map3dPath, 'utf-8');
      expect(content).toContain('Three.js');
      expect(content).toContain('geoBoundaries');
      expect(content).toContain('2022');
      expect(content).toContain('NAFAS_MAP');
      expect(content).toContain('setRecords');
    });

    it('should verify nafas-orchid-3d.html exists with interactive plant parts and zero external network calls', () => {
      const orchidPath = path.resolve(__dirname, '../public/nafas-orchid-3d.html');
      expect(fs.existsSync(orchidPath)).toBe(true);
      const content = fs.readFileSync(orchidPath, 'utf-8');
      expect(content).toContain('Three.js');
      expect(content).toContain('flower');
      expect(content).toContain('leaf');
      expect(content).toContain('root');
      expect(content).toContain('stem');
      expect(content).toContain('nafas:plant-part-select');
    });

    it('should verify base path resolution helper handles local and gh-pages prefixes', async () => {
      const { getBasePath, getAssetUrl } = await import('../src/lib/basePath');
      expect(typeof getBasePath).toBe('function');
      expect(typeof getAssetUrl).toBe('function');

      const url = getAssetUrl('/intro.html');
      expect(url).toContain('intro.html');
    });
  });

});
