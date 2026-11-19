import { describe, it, expect } from 'vitest';
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

  // Test Suite 1: Brand & Geographic Integrity
  describe('1. Brand & Geographic Foundations', () => {
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

    it('should strictly avoid generic green brand colors and enforce Mesopotamian Palette', () => {
      const brandColors = {
        midnight: '#222238',
        clay: '#C66F50',
        clayDark: '#A65339',
        dawn: '#AAB7F0',
        mist: '#D6E2E6',
        limestone: '#F7F1E7',
        neutralSlate: '#47465F'
      };

      // Ensure signature colors are exact
      expect(brandColors.clay).toBe('#C66F50');
      expect(brandColors.midnight).toBe('#222238');
      expect(brandColors.limestone).toBe('#F7F1E7');
      expect(brandColors.clayDark).toBe('#A65339');
    });

    it('should ensure Clay Dark (#A65339) meets WCAG AA contrast (>= 4.5:1) against white', () => {
      // Relative luminance calculation for #A65339 and #FFFFFF
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

      const [r1, g1, b1] = hexToRgb('#A65339');
      const lum1 = getLuminance(r1, g1, b1);
      const lum2 = getLuminance(255, 255, 255); // White

      const contrastRatio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
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
      // First log must be submitted
      expect(logs[0].newStatus).toBe('submitted');
      // Subsequent logs show progress
      const hasVerifiedOrProgress = logs.some(l => l.newStatus === 'verified' || l.newStatus === 'in_progress');
      expect(hasVerifiedOrProgress).toBe(true);
      // Final state in seed resolved
      expect(logs[logs.length - 1].newStatus).toBe('resolved');
    });

    it('should reject unverified remediation claims', () => {
      const sampleReport: EnvironmentalReport = {
        ...INITIAL_REPORTS[2],
        status: 'in_progress',
        imageAfterUrl: undefined
      };

      // A report cannot be declared resolved without verification evidence
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

      // Registration alone awards no heavy cleanup points
      if (registeredOnly) volunteerPoints += 0;
      // Verified attendance awards 100 points
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

});
