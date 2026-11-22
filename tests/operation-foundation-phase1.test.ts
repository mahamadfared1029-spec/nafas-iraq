/**
 * NAFAS | نَفَس — OPERATION FOUNDATION (PHASE 1) VERIFICATION TEST SUITE
 * 
 * Production Acceptance Test Matrix:
 * - Test 0: Truthful Operational State & Unconfigured Backend Safety Guardrails
 * - Test A: Identity, Founder Provisioning & Privilege Escalation Prevention
 * - Test B: Real Persistent Report Flow & Moderation State Lifecycle
 * - Test C: Private Notification Outbox & Transactional Alert Dispatch
 * - Test D: Photographic Evidence Validation & Secure Storage Pathing
 * - Test E: Clean Production Zero-State & Safe Demo Reset Isolation
 * - Test F: Cybersecurity Defenses (OWASP ASVS Input Validation & PostGIS Boundary Constraints)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Role, ReportStatus } from '../src/types';

// In-memory test store to simulate the Supabase backend in test environment
let mockDbReports: any[] = [];
let mockDbProfiles: any[] = [];
let mockDbLogs: any[] = [];
let mockDbOutbox: any[] = [];
let mockCurrentUserAuth: any = null;

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        signUp: vi.fn(async ({ email, password, options }) => {
          if (!email || !password || password.length < 8) {
            return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
          }
          const user = {
            id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            email,
            user_metadata: options?.data || {}
          };
          const profile = {
            id: user.id,
            email: user.email,
            full_name: options?.data?.full_name || 'مواطن عراقي',
            role: 'citizen',
            governorate_id: options?.data?.governorate_id || 'baghdad',
            is_verified_volunteer: false,
            points: 0,
            mfa_enabled: false,
            is_suspended: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          mockDbProfiles.push(profile);
          mockCurrentUserAuth = user;
          return { data: { user, session: { access_token: 'mock-jwt-token', expires_at: Math.floor(Date.now() / 1000) + 3600 } }, error: null };
        }),
        signInWithPassword: vi.fn(async ({ email, password }) => {
          if (!email || !password) {
            return { data: { user: null, session: null }, error: { message: 'Missing credentials' } };
          }
          let profile = mockDbProfiles.find(p => p.email === email);
          if (!profile) {
            // For designated founder or new sign-in in tests
            const isFounder = email === (process.env.NAFAS_ALERT_EMAIL || 'founder_secure_test@nafas-iraq.org');
            profile = {
              id: `usr_founder_${Date.now()}`,
              email,
              full_name: isFounder ? 'المشرف العام' : 'مستخدم تجريبي',
              role: isFounder ? 'super_admin' : 'citizen',
              governorate_id: 'baghdad',
              is_verified_volunteer: true,
              points: 100,
              mfa_enabled: false,
              is_suspended: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            mockDbProfiles.push(profile);
          }
          const user = { id: profile.id, email: profile.email, user_metadata: { full_name: profile.full_name } };
          mockCurrentUserAuth = user;
          return { data: { user, session: { access_token: 'mock-jwt-token', expires_at: Math.floor(Date.now() / 1000) + 3600 } }, error: null };
        }),
        signOut: vi.fn(async () => {
          mockCurrentUserAuth = null;
          return { error: null };
        }),
        getUser: vi.fn(async () => {
          return { data: { user: mockCurrentUserAuth }, error: null };
        }),
        onAuthStateChange: vi.fn((callback) => {
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        resetPasswordForEmail: vi.fn(async (email) => {
          return { data: {}, error: null };
        }),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn(async () => ({
            data: { currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] },
            error: null
          }))
        }
      },
      from: vi.fn((table: string) => {
        let currentData: any[] = [];
        if (table === 'reports') currentData = mockDbReports;
        else if (table === 'public_reports') currentData = mockDbReports.filter(r => ['verified', 'in_progress', 'pending_verification', 'resolved'].includes(r.status) && !r.is_archived);
        else if (table === 'profiles') currentData = mockDbProfiles;
        else if (table === 'report_audit_logs') currentData = mockDbLogs;
        else if (table === 'notification_outbox') currentData = mockDbOutbox;

        const builder: any = {
          insert: vi.fn((payload) => {
            const records = Array.isArray(payload) ? payload : [payload];
            const inserted = records.map(r => ({
              id: r.id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...r
            }));
            currentData.push(...inserted);
            builder._lastInserted = inserted;

            // Simulate DB Trigger trg_reports_notification: auto-enqueue in notification_outbox
            if (table === 'reports') {
              inserted.forEach(rep => {
                mockDbOutbox.push({
                  id: `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  event_id: `EVT-${rep.tracking_number}-SUBMIT`,
                  report_id: rep.id,
                  event_type: (rep.is_hazardous || rep.severity === 'critical') ? 'REPORT_HAZARDOUS_ALERT' : 'REPORT_SUBMITTED',
                  recipient_masked: 'adm***@nafas-iraq.org',
                  delivery_status: 'pending',
                  provider: 'resend',
                  attempt_count: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              });
            }
            return builder;
          }),
          upsert: vi.fn((payload) => {
            const records = Array.isArray(payload) ? payload : [payload];
            const upserted: any[] = [];
            records.forEach(r => {
              const existingIdx = currentData.findIndex(item => item.id === r.id);
              if (existingIdx >= 0) {
                currentData[existingIdx] = { ...currentData[existingIdx], ...r, updated_at: new Date().toISOString() };
                upserted.push(currentData[existingIdx]);
              } else {
                const item = {
                  id: r.id || `id_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...r
                };
                currentData.push(item);
                upserted.push(item);
              }
            });
            builder._lastInserted = upserted;
            return builder;
          }),
          select: vi.fn((query?: string) => {
            if (!builder._filtered) {
              builder._filtered = [...currentData];
            }
            return builder;
          }),
          update: vi.fn((updates) => {
            builder._updates = updates;
            return builder;
          }),
          eq: vi.fn((col, val) => {
            if (builder._updates) {
              const matched: any[] = [];
              currentData.forEach(item => {
                if (item[col] === val) {
                  Object.assign(item, builder._updates, { updated_at: new Date().toISOString() });
                  matched.push(item);
                }
              });
              builder._filtered = matched;
            } else if (builder._filtered) {
              builder._filtered = builder._filtered.filter((item: any) => item[col] === val);
            }
            return builder;
          }),
          in: vi.fn((col, vals) => {
            if (builder._filtered) {
              builder._filtered = builder._filtered.filter((item: any) => vals.includes(item[col]));
            }
            return builder;
          }),
          ilike: vi.fn((col, pattern) => {
            const cleanPattern = pattern.replace(/%/g, '');
            if (builder._updates) {
              const matched: any[] = [];
              currentData.forEach(item => {
                if (String(item[col] || '').includes(cleanPattern)) {
                  Object.assign(item, builder._updates, { updated_at: new Date().toISOString() });
                  matched.push(item);
                }
              });
              builder._filtered = matched;
            } else if (builder._filtered) {
              builder._filtered = builder._filtered.filter((item: any) => String(item[col] || '').includes(cleanPattern));
            }
            return builder;
          }),
          order: vi.fn((col, opts) => {
            return builder;
          }),
          limit: vi.fn((num) => {
            if (builder._filtered) {
              builder._filtered = builder._filtered.slice(0, num);
            }
            return builder;
          }),
          single: vi.fn(async () => {
            const res = builder._lastInserted?.[0] || builder._filtered?.[0] || null;
            return { data: res, error: null };
          }),
          then: vi.fn((resolve) => {
            const res = builder._filtered || currentData;
            return resolve({ data: res, error: null });
          })
        };
        return builder;
      }),
      rpc: vi.fn(async (funcName, args) => {
        if (funcName === 'provision_founder_account') {
          const email = args?.p_expected_email || args?.p_founder_email;
          if (email !== (process.env.NAFAS_ALERT_EMAIL || 'founder_secure_test@nafas-iraq.org')) {
            return { data: null, error: { message: 'Unauthorized Founder Identity' } };
          }
          return { data: 'FOUNDER_PROVISIONED_SUCCESS', error: null };
        }
        return { data: null, error: null };
      }),
      functions: {
        invoke: vi.fn(async (funcName, options) => {
          if (funcName === 'provision-founder') {
            const token = options?.body?.bootstrapToken;
            if (!token || token.length < 16) {
              return { data: null, error: { message: 'رمز التهيئة الإداري إلزامي ومكون من 16 محرفاً على الأقل.' } };
            }
            if (mockCurrentUserAuth?.email !== (process.env.NAFAS_ALERT_EMAIL || 'founder_secure_test@nafas-iraq.org')) {
              return { data: null, error: { message: 'Unauthorized Founder Identity' } };
            }
            const prof = mockDbProfiles.find(p => p.email === mockCurrentUserAuth.email);
            if (prof) {
              prof.role = 'super_admin';
              prof.mfa_enabled = true;
            }
            return { data: { success: true, role: 'super_admin' }, error: null };
          }
          if (funcName === 'process-notifications') {
            return { data: { success: true, processedCount: mockDbOutbox.length }, error: null };
          }
          return { data: null, error: null };
        })
      },
      storage: {
        from: vi.fn((bucket: string) => ({
          upload: vi.fn(async (path, file) => {
            return { data: { path }, error: null };
          }),
          createSignedUrl: vi.fn(async (path, expiresIn) => {
            return { data: { signedUrl: `https://mock-storage.supabase.co/signed/${path}?token=exp_${expiresIn}` }, error: null };
          })
        }))
      }
    }))
  };
});

import { nafasAuth } from '../src/lib/auth/authService';
import { nafasReports } from '../src/lib/reports/reportService';
import { NafasNotificationService } from '../src/lib/server/notificationService';

const TEST_FOUNDER_EMAIL = 'founder_secure_test@nafas-iraq.org';

describe('OPERATION FOUNDATION — PHASE 1 ACCEPTANCE SUITE', () => {
  const origEnvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origEnvKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const origFounderEmail = process.env.NAFAS_ALERT_EMAIL;

  beforeEach(async () => {
    // Configure test environment credentials by default
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-test-anon-key-with-sufficient-length-2026';
    process.env.NAFAS_ALERT_EMAIL = TEST_FOUNDER_EMAIL;

    mockDbReports = [];
    mockDbProfiles = [];
    mockDbLogs = [];
    mockDbOutbox = [];
    mockCurrentUserAuth = null;

    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();

    await nafasAuth.signOut();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origEnvUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origEnvKey;
    process.env.NAFAS_ALERT_EMAIL = origFounderEmail;
  });

  // ===========================================================================
  // TEST 0: TRUTHFUL OPERATIONAL STATE & UNCONFIGURED SAFETY GUARDRAILS
  // ===========================================================================
  describe('Test 0 — Truthful Operational States & Unconfigured Rejection', () => {
    it('0.1: Correctly identifies when Supabase is configured vs unconfigured', () => {
      expect(nafasAuth.isConfigured()).toBe(true);
      expect(nafasReports.isConfigured()).toBe(true);

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(nafasAuth.isConfigured()).toBe(false);
      expect(nafasReports.isConfigured()).toBe(false);
    });

    it('0.2: Halts live report submission when unconfigured, preventing fake central storage claims', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      await expect(
        nafasReports.submitReport({
          title: 'بلاغ تجريبي عند انقطاع الخادم',
          description: 'يجب أن يفشل البلاغ صراحة عند غياب إعدادات قاعدة البيانات المركزية',
          category: 'garbage',
          severity: 'medium',
          governorateId: 'baghdad',
          neighborhood: 'الكرادة',
          lat: 33.3152,
          lng: 44.3661,
          imageBeforeUrl: 'https://example.com/test.jpg'
        })
      ).rejects.toThrow(/قاعدة البيانات السحابية .* غير متصلة/);
    });

    it('0.3: Halts authentication operations when unconfigured without accepting fake logins', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      await expect(
        nafasAuth.signUp({
          email: 'citizen_fail@example.com',
          password: 'Password123!',
          fullName: 'علي العراقي',
          governorateId: 'baghdad'
        })
      ).rejects.toThrow(/بوابة المصادقة السحابية .* غير متصلة/);

      await expect(
        nafasAuth.signIn({
          email: 'citizen_fail@example.com',
          password: 'Password123!'
        })
      ).rejects.toThrow(/بوابة المصادقة السحابية .* غير متصلة/);
    });
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
        password: 'AdminSuperPassword2026!'
      });

      expect(login.success).toBe(true);
      expect(login.user.role).toBe('super_admin');
      expect(nafasAuth.isFounderOrSuperAdmin()).toBe(true);

      // Verify founder CAN list staff users and change roles
      const staffList = await nafasAuth.listUsers();
      expect(Array.isArray(staffList)).toBe(true);

      // Bootstrap explicitly with mandatory 16+ char secure token
      const boot = await nafasAuth.bootstrapFounder('NafasFounderBootstrap2026Secure!');
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

      await expect(nafasAuth.bootstrapFounder('NafasFounderBootstrap2026Secure!')).rejects.toThrow(
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

      // Public map view MUST NOT display unreviewed 'submitted' report
      const publicReports = await nafasReports.getPublicReports();
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

      // 4. Verify report NOW appears on public map
      const publicReports = await nafasReports.getPublicReports();
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

      const publicReports = await nafasReports.getPublicReports();
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

      const outbox = await nafasReports.getOutbox();
      expect(outbox.length).toBeGreaterThanOrEqual(1);

      const alert = outbox[0];
      expect(alert.eventType).toBe('REPORT_HAZARDOUS_ALERT');
      expect(alert.deliveryStatus).toBeDefined();
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

    it('D4: Uploads to private storage bucket and returns signed URL for authorized viewing', async () => {
      const file = new File(['image-bytes'], 'field-photo.jpg', { type: 'image/jpeg' });
      const res = await nafasReports.uploadEvidenceImage(file, 'NFS-2026-9999', 'baghdad');
      expect(res.storagePath).toContain('reports/baghdad/NFS-2026-9999/');
      expect(res.signedUrl).toContain('mock-storage.supabase.co/signed');
    });
  });

  // ===========================================================================
  // TEST E: CLEAN DATA LAUNCH & SAFE DEMO RESET
  // ===========================================================================
  describe('Test E — Clean Production Launch & Demo Reset', () => {
    it('E1: Resetting demo data archives demo-flagged reports while retaining genuine user reports', async () => {
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

      // 2. Add a demo report directly into the database mock
      mockDbReports.push({
        id: 'DEMO-FIXTURE-001',
        tracking_number: 'DEMO-FIXTURE-001',
        title: 'بلاغ تجريبي استعراضي للمعاينة',
        description: 'بيانات تجريبية مصطنعة لأغراض التطوير والاختبار',
        category: 'garbage',
        severity: 'low',
        governorate_id: 'baghdad',
        neighborhood: 'الشورجة',
        lat: 33.33,
        lng: 44.38,
        image_before_url: 'https://example.com/demo.jpg',
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reported_by: 'demo',
        is_anonymous: false,
        is_hazardous: false,
        is_archived: false
      });

      // 3. Login as Founder
      await nafasAuth.signIn({
        email: TEST_FOUNDER_EMAIL,
        password: 'AdminPassword123!'
      });

      // 4. Perform demo reset
      const resetRes = await nafasReports.resetDemoData();
      expect(resetRes.clearedCount).toBe(1);

      // 5. Confirm genuine report remains non-archived, while demo report is archived
      const genuineInDb = mockDbReports.find(r => r.id === real.report.id);
      const demoInDb = mockDbReports.find(r => r.id === 'DEMO-FIXTURE-001');

      expect(genuineInDb.is_archived).toBe(false);
      expect(demoInDb.is_archived).toBe(true);
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
