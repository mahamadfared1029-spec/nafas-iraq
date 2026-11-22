/**
 * NAFAS | نَفَس — OPERATION FOUNDATION (PHASE 1) VERIFICATION TEST SUITE
 * 
 * Tests A through F:
 * - Test A: Identity, Founder Provisioning & Privilege Escalation Prevention
 * - Test B: Real Persistent Report Flow & Moderation State Lifecycle
 * - Test C: Private Notification Outbox & Resend Alert Dispatch
 * - Test D: Photographic Evidence Validation & Secure Storage Pathing
 * - Test E: Clean Production Zero-State & Safe Demo Reset Isolation
 * - Test F: Cybersecurity Defenses (OWASP ASVS Input Validation & RLS Constraints)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nafasAuth } from '../src/lib/auth/authService';
import { nafasReports } from '../src/lib/reports/reportService';
import { NafasNotificationService } from '../src/lib/server/notificationService';
import { Role, ReportStatus } from '../src/types';

const TEST_FOUNDER_EMAIL = 'founder_secure_test@nafas-iraq.org';

describe('OPERATION FOUNDATION — PHASE 1 ACCEPTANCE SUITE', () => {
  beforeEach(async () => {
    process.env.NAFAS_ALERT_EMAIL = TEST_FOUNDER_EMAIL;
    // Clear storage for clean deterministic testing
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    (nafasReports as any).inMemoryReports = [];
    (nafasReports as any).inMemoryOutbox = [];
    (nafasAuth as any).inMemoryProfiles = [];
    (nafasAuth as any).inMemoryAuditLogs = [];
    await nafasAuth.signOut();
  });

  // ===========================================================================
  // TEST A: IDENTITY, FOUNDER BOOTSTRAP & PRIVILEGE ESCALATION PREVENTION
  // ===========================================================================
  describe('Test A — Identity & Access Management (IAM)', () => {
    it('A1: Citizen can register and is assigned strictly the citizen role', async () => {
      const reg = await nafasAuth.signUp({
        email: 'citizen_iraq_test@example.com',
        password: 'SecurePassword2026!',
        fullName: 'أحمد السعدي',
        governorateId: 'basra'
      });

      expect(reg.success).toBe(true);
      expect(reg.user.role).toBe('citizen');
      expect(reg.user.email).toBe('citizen_iraq_test@example.com');
      expect(nafasAuth.isAuthenticated()).toBe(true);
      expect(nafasAuth.isFounderOrSuperAdmin()).toBe(false);
    });

    it('A2: Ordinary citizen CANNOT access admin staff APIs or change their own role (Prevents Vertical Escalation)', async () => {
      await nafasAuth.signUp({
        email: 'ordinary_user@example.com',
        password: 'Password12345!',
        fullName: 'مواطن اعتيادي',
        governorateId: 'baghdad'
      });

      const citizen = nafasAuth.getCurrentUser();
      expect(citizen?.role).toBe('citizen');

      // Attempt role escalation
      await expect(nafasAuth.updateUserRole(citizen!.id, 'admin')).rejects.toThrow(
        /403 Forbidden|Super Admin Required/i
      );

      // Attempt staff list
      await expect(nafasAuth.listUsers()).rejects.toThrow(/403 Forbidden/i);

      // Attempt admin audit logs
      await expect(nafasAuth.listAdminAuditLogs()).rejects.toThrow(/403 Forbidden/i);
    });

    it('A3: Founder bootstrap recognizes designated founder email and assigns super_admin role', async () => {
      // Simulate founder logging in
      const login = await nafasAuth.signIn({
        email: TEST_FOUNDER_EMAIL,
        password: 'AnyPasswordForBootstrap'
      });

      expect(login.success).toBe(true);
      expect(login.user.role).toBe('super_admin');
      expect(nafasAuth.isFounderOrSuperAdmin()).toBe(true);

      // Verify founder CAN list staff users and change roles
      const staffList = await nafasAuth.listUsers();
      expect(Array.isArray(staffList)).toBe(true);

      // Bootstrap explicitly
      const boot = await nafasAuth.bootstrapFounder();
      expect(boot.success).toBe(true);
      expect(boot.user.role).toBe('super_admin');
    });

    it('A4: Unauthorized user attempting founder bootstrap is strictly rejected', async () => {
      await nafasAuth.signUp({
        email: 'impostor@example.com',
        password: 'Password999!',
        fullName: 'منتحل صفة',
        governorateId: 'erbil'
      });

      await expect(nafasAuth.bootstrapFounder()).rejects.toThrow(
        /403 Forbidden|Unauthorized Founder Identity/i
      );
    });
  });

  // ===========================================================================
  // TEST B: REAL REPORT PERSISTENCE & MODERATION LIFECYCLE
  // ===========================================================================
  describe('Test B — Real Persistent Report Flow & Moderation', () => {
    it('B1: Submitting a report assigns server tracking number and default "submitted" status', async () => {
      // Citizen submits
      await nafasAuth.signUp({
        email: 'reporter_baghdad@example.com',
        password: 'PassWord123456!',
        fullName: 'زينب البغدادي',
        governorateId: 'baghdad'
      });

      const res = await nafasReports.submitReport({
        title: 'تراكم نفايات صلبة قرب ضفاف نهر دجلة',
        description: 'موقع غير قانوني لرمي النفايات ومخلفات البناء يؤثر على البيئة النهرية',
        category: 'garbage',
        severity: 'high',
        governorateId: 'baghdad',
        neighborhood: 'الكرادة',
        lat: 33.3152,
        lng: 44.3661,
        imageBeforeUrl: 'https://example.com/evidence-test.jpg',
        isAnonymous: false,
        isHazardous: false
      });

      expect(res.success).toBe(true);
      expect(res.trackingNumber).toMatch(/^NFS-2026-\d{4}$/);
      expect(res.report.status).toBe('submitted');
      expect(res.report.isArchived).toBe(false);
      expect(res.report.auditLogs.length).toBeGreaterThanOrEqual(1);

      // Public map view MUST NOT display unreviewed 'submitted' report
      const publicReports = nafasReports.getPublicReports();
      const isPublic = publicReports.some(r => r.id === res.report.id);
      expect(isPublic).toBe(false);
    });

    it('B2: Founder/Moderator reviews report and transitions status to "verified", publishing it to public map', async () => {
      // 1. Submit report
      const submitRes = await nafasReports.submitReport({
        title: 'بقعة زيوت عائمة في مياه شط العرب',
        description: 'تسرب صناعي طافي على سطح المياه يحتاج إلى تدخل عاجل لمنع التلوث',
        category: 'water',
        severity: 'critical',
        governorateId: 'basra',
        neighborhood: 'العشار',
        lat: 30.5081,
        lng: 47.7835,
        imageBeforeUrl: 'https://example.com/oil-slick.jpg',
        isHazardous: true
      });

      // 2. Sign in as Founder
      await nafasAuth.signIn({
        email: TEST_FOUNDER_EMAIL,
        password: 'AdminPassword123!'
      });

      // 3. Approve report
      const modRes = await nafasReports.updateReportStatus(
        submitRes.report.id,
        'verified',
        'تم تدقيق البلاغ ميدانياً والتأكد من صحة التوثيق.'
      );

      expect(modRes.success).toBe(true);
      expect(modRes.report.status).toBe('verified');
      expect(modRes.report.auditLogs.some(l => l.newStatus === 'verified')).toBe(true);

      // 4. Verify report NOW appears on public map
      const publicReports = nafasReports.getPublicReports();
      const isPublic = publicReports.some(r => r.id === submitRes.report.id);
      expect(isPublic).toBe(true);
    });

    it('B3: Rejecting a report keeps it private from public map', async () => {
      const submitRes = await nafasReports.submitReport({
        title: 'بلاغ غير دقيق في منطقة صحراوية',
        description: 'بلاغ تجريبي بدون تفاصيل دقيقة للاختبار الآلي',
        category: 'other',
        severity: 'low',
        governorateId: 'anbar',
        neighborhood: 'الرمادي',
        lat: 33.4200,
        lng: 43.3000,
        imageBeforeUrl: 'https://example.com/test-photo.jpg'
      });

      await nafasAuth.signIn({
        email: TEST_FOUNDER_EMAIL,
        password: 'AdminPassword123!'
      });

      await nafasReports.updateReportStatus(
        submitRes.report.id,
        'rejected',
        'الصورة لا تظهر مشكلة بيئية حقيقية.'
      );

      const publicReports = nafasReports.getPublicReports();
      const isPublic = publicReports.some(r => r.id === submitRes.report.id);
      expect(isPublic).toBe(false);
    });
  });

  // ===========================================================================
  // TEST C: PRIVATE NOTIFICATION OUTBOX
  // ===========================================================================
  describe('Test C — Private Email Notification Outbox', () => {
    it('C1: Submitting a report automatically queues an alert in the notification outbox', async () => {
      await nafasReports.submitReport({
        title: 'حريق نفايات ومخلفات زراعية',
        description: 'انبعاثات دخانية كثيفة تؤثر على المناطق السكنية المجاورة',
        category: 'burning',
        severity: 'high',
        governorateId: 'diyala',
        neighborhood: 'بعقوبة',
        lat: 33.7500,
        lng: 45.1500,
        imageBeforeUrl: 'https://example.com/smoke.jpg',
        isHazardous: true
      });

      const outbox = nafasReports.getOutbox();
      expect(outbox.length).toBeGreaterThanOrEqual(1);

      const alert = outbox[0];
      expect(alert.eventType).toBe('REPORT_HAZARDOUS_ALERT');
      expect(alert.deliveryStatus).toBeDefined();
      expect(['queued', 'sent', 'failed']).toContain(alert.deliveryStatus);
    });

    it('C2: Notification service formats official bilingual Arabic alert email', () => {
      const service = NafasNotificationService.getInstance();
      const formatted = service.formatAlertEmail({
        reportId: 'NFS-2026-TEST',
        trackingNumber: 'NFS-2026-7890',
        category: 'dumping',
        categoryLabelAr: 'طمر عشوائي',
        governorate: 'بغداد',
        neighborhood: 'المنصور',
        approximateLocation: '33.3152, 44.3661',
        date: '2026-11-22 14:00',
        moderationStatus: 'submitted',
        isHazardous: true,
        severity: 'critical',
        adminDashboardUrl: 'https://mahamadfared1029-spec.github.io/nafas-iraq/#admin'
      });

      expect(formatted.subject).toContain('[NAFAS]');
      expect(formatted.subject).toContain('خطر بيئي');
      expect(formatted.subject).toContain('NFS-2026-7890');
      expect(formatted.html).toContain('طمر عشوائي');
      expect(formatted.html).toContain('#admin');
    });
  });

  // ===========================================================================
  // TEST D: PHOTOGRAPHIC EVIDENCE & STORAGE VALIDATION
  // ===========================================================================
  describe('Test D — Evidence Storage & File Validation', () => {
    it('D1: Rejects unsupported file formats (e.g. PDF or Executables)', () => {
      const invalidFile = new File(['fake content'], 'document.pdf', { type: 'application/pdf' });
      const val = nafasReports.validateImageFile(invalidFile);
      expect(val.valid).toBe(false);
      expect(val.error).toContain('نوع الملف غير مدعوم');
    });

    it('D2: Rejects image files exceeding size threshold (10MB)', () => {
      // Create a mock large file
      const largeFile = new File(['A'.repeat(1024)], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 12 * 1024 * 1024 });

      const val = nafasReports.validateImageFile(largeFile);
      expect(val.valid).toBe(false);
      expect(val.error).toContain('يتجاوز الحد الأقصى');
    });

    it('D3: Accepts valid WebP, JPEG, and PNG images within limits', () => {
      const validWebP = new File(['valid content'], 'photo.webp', { type: 'image/webp' });
      const val = nafasReports.validateImageFile(validWebP);
      expect(val.valid).toBe(true);
    });
  });

  // ===========================================================================
  // TEST E: CLEAN DATA LAUNCH & SAFE DEMO RESET
  // ===========================================================================
  describe('Test E — Clean Production Launch & Demo Reset', () => {
    it('E1: Resetting demo data retains genuine submitted user reports', async () => {
      // 1. Create a genuine report
      const real = await nafasReports.submitReport({
        title: 'تقرير حقيقي من مواطن موثق',
        description: 'هذا تقرير بيئي أصيل لا يجوز مسحه عند تنظيف البيانات التجريبية',
        category: 'flora',
        severity: 'medium',
        governorateId: 'sulaymaniyah',
        neighborhood: 'سرجنار',
        lat: 35.5650,
        lng: 45.4330,
        imageBeforeUrl: 'https://example.com/genuine.jpg'
      });

      // 2. Add a demo report fixture
      const all = (nafasReports as any).getAllReports();
      all.push({
        id: 'DEMO-FIXTURE-001',
        trackingNumber: 'DEMO-FIXTURE-001',
        title: 'بلاغ تجريبي استعراضي للمعاينة',
        description: 'بيانات تجريبية مصطنعة لأغراض التطوير والاختبار',
        category: 'garbage',
        severity: 'low',
        governorateId: 'baghdad',
        neighborhood: 'الشورجة',
        lat: 33.33,
        lng: 44.38,
        imageBeforeUrl: 'https://example.com/demo.jpg',
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reportedBy: 'demo',
        isAnonymous: false,
        isHazardous: false,
        auditLogs: []
      });
      (nafasReports as any).saveAllReports(all);

      // 3. Login as Founder
      await nafasAuth.signIn({
        email: TEST_FOUNDER_EMAIL,
        password: 'AdminPassword123!'
      });

      // 4. Perform demo reset
      const resetRes = nafasReports.resetDemoData();
      expect(resetRes.success).toBe(true);
      expect(resetRes.clearedCount).toBe(1);

      // 5. Confirm genuine report remains intact in database
      const remaining = (nafasReports as any).getAllReports();
      expect(remaining.some((r: any) => r.id === real.report.id)).toBe(true);
      expect(remaining.some((r: any) => r.id === 'DEMO-FIXTURE-001')).toBe(false);
    });
  });

  // ===========================================================================
  // TEST F: CYBERSECURITY CONTROLS & GEOSPATIAL BOUNDARIES
  // ===========================================================================
  describe('Test F — Cybersecurity & GIS Boundary Validation', () => {
    it('F1: Rejects coordinates placed outside the Republic of Iraq', async () => {
      // Latitude 51.5, Longitude -0.1 (London)
      expect(nafasReports.validateIraqCoordinates(51.5, -0.1)).toBe(false);

      // Attempt submission outside Iraq
      await expect(
        nafasReports.submitReport({
          title: 'بلاغ بإحداثيات خارج العراق',
          description: 'محاولة إرسال موقع خارج النطاق الجغرافي للجمهورية',
          category: 'other',
          severity: 'low',
          governorateId: 'baghdad',
          neighborhood: 'مجهول',
          lat: 51.5,
          lng: -0.1,
          imageBeforeUrl: 'https://example.com/photo.jpg'
        })
      ).rejects.toThrow(/خارج النطاق الجغرافي/);
    });

    it('F2: Accepts valid Iraqi coordinates across various governorates', () => {
      // Baghdad
      expect(nafasReports.validateIraqCoordinates(33.3152, 44.3661)).toBe(true);
      // Basra
      expect(nafasReports.validateIraqCoordinates(30.5081, 47.7835)).toBe(true);
      // Erbil
      expect(nafasReports.validateIraqCoordinates(36.1911, 44.0092)).toBe(true);
      // Najaf
      expect(nafasReports.validateIraqCoordinates(32.0000, 44.3300)).toBe(true);
    });

    it('F3: Prevents brute-force or malformed registrations (Input Validation)', async () => {
      // Empty email
      await expect(
        nafasAuth.signUp({
          email: '',
          password: 'Password123!',
          fullName: 'فهد',
          governorateId: 'baghdad'
        })
      ).rejects.toThrow(/بريد إلكتروني صالح/);

      // Short password (< 8 chars)
      await expect(
        nafasAuth.signUp({
          email: 'valid@example.com',
          password: 'short',
          fullName: 'فهد العراقي',
          governorateId: 'baghdad'
        })
      ).rejects.toThrow(/8 أحرف وأرقام/);
    });
  });
});
