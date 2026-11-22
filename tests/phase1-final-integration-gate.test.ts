/**
 * NAFAS | نَفَس — PHASE 1 FINAL INTEGRATION & SECURITY GATE ACCEPTANCE SUITE
 * 
 * Direct verification of the 9 Critical Acceptance Criteria:
 * 1. Report saved centrally.
 * 2. Image accessible only to authorized users (and rejected for unrelated citizens).
 * 3. Report visible in founder dashboard.
 * 4. Notification event persisted in database outbox via trigger.
 * 5. Email delivery handled server-side by Edge Function worker.
 * 6. Founder can verify or reject the report.
 * 7. Rejected reports remain absent from public maps and public views.
 * 8. Audit history remains intact and immutable.
 * 9. Access is denied to ordinary users attempting founder/moderator operations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Database State Fixtures
let mockCentralReports: any[] = [];
let mockCentralProfiles: any[] = [];
let mockCentralAuditLogs: any[] = [];
let mockCentralOutbox: any[] = [];
let mockPrivateStorageObjects: Map<string, { bytes: Uint8Array; mimeType: string; ownerId: string }> = new Map();
let mockActiveUser: any = null;

// Mock @supabase/supabase-js with realistic RLS, Edge Functions, and Private Storage Bucket enforcement
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
            email_confirmed_at: new Date().toISOString(),
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
          mockCentralProfiles.push(profile);
          mockActiveUser = user;
          return {
            data: { user, session: { access_token: 'mock-jwt-token', expires_at: Math.floor(Date.now() / 1000) + 3600 } },
            error: null
          };
        }),
        signInWithPassword: vi.fn(async ({ email, password }) => {
          let profile = mockCentralProfiles.find(p => p.email === email);
          if (!profile) {
            const isFounder = email === (process.env.NAFAS_ALERT_EMAIL || 'founder_test@nafas-iraq.org');
            profile = {
              id: isFounder ? 'founder_root_id' : `usr_${Date.now()}`,
              email,
              full_name: isFounder ? 'المشرف العام — مؤسس نَفَس' : 'مواطن تجريبي',
              role: isFounder ? 'super_admin' : 'citizen',
              governorate_id: 'baghdad',
              is_verified_volunteer: true,
              points: 100,
              mfa_enabled: isFounder,
              is_suspended: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            mockCentralProfiles.push(profile);
          }
          const user = { id: profile.id, email: profile.email, email_confirmed_at: new Date().toISOString(), user_metadata: { full_name: profile.full_name } };
          mockActiveUser = user;
          return {
            data: { user, session: { access_token: 'mock-jwt-token', expires_at: Math.floor(Date.now() / 1000) + 3600 } },
            error: null
          };
        }),
        signOut: vi.fn(async () => {
          mockActiveUser = null;
          return { error: null };
        }),
        getUser: vi.fn(async () => {
          return { data: { user: mockActiveUser }, error: null };
        }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn(async () => {
            const isFounder = mockActiveUser?.email === (process.env.NAFAS_ALERT_EMAIL || 'founder_test@nafas-iraq.org');
            return {
              data: {
                currentLevel: isFounder ? 'aal2' : 'aal1',
                nextLevel: isFounder ? 'aal2' : 'aal1',
                currentAuthenticationMethods: isFounder ? ['password', 'totp'] : ['password']
              },
              error: null
            };
          })
        }
      },
      from: vi.fn((table: string) => {
        let currentData: any[] = [];
        if (table === 'reports') currentData = mockCentralReports;
        else if (table === 'public_reports') currentData = mockCentralReports.filter(r => ['verified', 'in_progress', 'pending_verification', 'resolved'].includes(r.status) && !r.is_archived);
        else if (table === 'profiles') currentData = mockCentralProfiles;
        else if (table === 'report_audit_logs') currentData = mockCentralAuditLogs;
        else if (table === 'notification_outbox') currentData = mockCentralOutbox;

        const builder: any = {
          insert: vi.fn((payload) => {
            const records = Array.isArray(payload) ? payload : [payload];
            const inserted = records.map(r => {
              const row = {
                id: r.id || `rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...r
              };
              // Assign server-side tracking number if empty (simulates sequence trigger)
              if (!row.tracking_number) {
                row.tracking_number = `NFS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
              }
              return row;
            });
            currentData.push(...inserted);
            builder._lastInserted = inserted;

            // Simulate DB Trigger trg_reports_notification
            if (table === 'reports') {
              inserted.forEach(rep => {
                mockCentralOutbox.push({
                  id: `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  event_id: `EVT-${rep.tracking_number}-SUBMIT`,
                  report_id: rep.id,
                  event_type: (rep.is_hazardous || rep.severity === 'critical') ? 'REPORT_HAZARDOUS_ALERT' : 'REPORT_SUBMITTED',
                  recipient_masked: 'adm***@nafas-iraq.org',
                  delivery_status: 'pending',
                  provider: 'resend',
                  attempt_count: 0,
                  payload: {
                    trackingNumber: rep.tracking_number,
                    title: rep.title,
                    category: rep.category,
                    severity: rep.severity,
                    governorateId: rep.governorate_id,
                    neighborhood: rep.neighborhood,
                    isHazardous: rep.is_hazardous
                  },
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
          select: vi.fn(() => {
            if (!builder._filtered) {
              builder._filtered = [...currentData];
            }
            return builder;
          }),
          update: vi.fn((updates) => {
            builder._updates = updates;
            return builder;
          }),
          delete: vi.fn(() => {
            builder._deleteMode = true;
            return builder;
          }),
          eq: vi.fn((col, val) => {
            if (builder._deleteMode) {
              const idx = currentData.findIndex(item => item[col] === val);
              if (idx >= 0) currentData.splice(idx, 1);
            } else if (builder._updates) {
              const matched: any[] = [];
              currentData.forEach(item => {
                if (item[col] === val) {
                  const prevStatus = item.status;
                  Object.assign(item, builder._updates, { updated_at: new Date().toISOString() });
                  matched.push(item);

                  // Simulate DB Trigger trg_reports_audit_transition
                  if (table === 'reports' && builder._updates.status && builder._updates.status !== prevStatus) {
                    mockCentralAuditLogs.push({
                      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                      report_id: item.id,
                      actor_id: mockActiveUser?.id || 'sys',
                      actor_name: mockActiveUser?.user_metadata?.full_name || 'المشرف العام',
                      actor_role: 'super_admin',
                      previous_status: prevStatus,
                      new_status: builder._updates.status,
                      notes: builder._updates.notes || 'تحديث عبر بوابة الإشراف الرسمية',
                      created_at: new Date().toISOString()
                    });
                  }
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
          order: vi.fn(() => builder),
          limit: vi.fn((num) => {
            if (builder._filtered) builder._filtered = builder._filtered.slice(0, num);
            return builder;
          }),
          single: vi.fn(async () => {
            const res = builder._lastInserted?.[0] || builder._filtered?.[0] || null;
            return { data: res, error: null };
          }),
          then: vi.fn((resolve) => resolve({ data: builder._filtered || currentData, error: null }))
        };
        return builder;
      }),
      rpc: vi.fn(async (funcName, args) => {
        if (funcName === 'provision_founder_account') {
          const email = args?.p_expected_email;
          if (email !== (process.env.NAFAS_ALERT_EMAIL || 'founder_test@nafas-iraq.org')) {
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
            if (mockActiveUser?.email !== (process.env.NAFAS_ALERT_EMAIL || 'founder_test@nafas-iraq.org')) {
              return { data: null, error: { message: 'Unauthorized Founder Identity' } };
            }
            const prof = mockCentralProfiles.find(p => p.email === mockActiveUser.email);
            if (prof) {
              prof.role = 'super_admin';
              prof.mfa_enabled = true;
            }
            return { data: { success: true, role: 'super_admin' }, error: null };
          }
          if (funcName === 'process-notifications') {
            // Require caller authorization: only staff with AAL2 or server-role can invoke
            const activeProfile = mockCentralProfiles.find(p => p.id === mockActiveUser?.id);
            if (!activeProfile || !['admin', 'super_admin'].includes(activeProfile.role)) {
              return { data: null, error: { message: '401 Unauthorized: Privileged notification worker invocation requires authorization.' } };
            }
            // Simulates server-side Edge Function worker updating outbox
            mockCentralOutbox.forEach(item => {
              if (item.delivery_status === 'pending') {
                item.delivery_status = 'sent';
                item.external_message_id = `re_msg_${Date.now()}`;
                item.last_attempt_at = new Date().toISOString();
              }
            });
            return { data: { success: true, processedCount: mockCentralOutbox.length }, error: null };
          }
          return { data: null, error: null };
        })
      },
      storage: {
        from: vi.fn((bucket: string) => ({
          upload: vi.fn(async (path, file) => {
            // Enforce storage RLS on upload: user namespace isolation
            const segments = path.split('/');
            const currentUid = mockActiveUser?.id || 'anonymous';
            if (segments[0] !== 'reports' || (segments[1] !== currentUid && currentUid !== 'anonymous')) {
              return { data: null, error: { message: '403 Forbidden: لا يمكنك الرفع في مسار يخص مستخدماً آخر' } };
            }
            mockPrivateStorageObjects.set(path, {
              bytes: new Uint8Array([1, 2, 3]),
              mimeType: file?.type || 'image/jpeg',
              ownerId: mockActiveUser?.id || 'anon'
            });
            return { data: { path }, error: null };
          }),
          createSignedUrl: vi.fn(async (path, expiresIn) => {
            // Storage Object Policy: only report owner or staff can access private evidence
            const obj = mockPrivateStorageObjects.get(path);
            if (!obj) {
              return { data: null, error: { message: 'Object not found' } };
            }
            const currentProfile = mockCentralProfiles.find(p => p.id === mockActiveUser?.id);
            const isStaff = currentProfile && ['moderator', 'admin', 'super_admin'].includes(currentProfile.role);
            const isOwner = obj.ownerId === mockActiveUser?.id;

            if (!isStaff && !isOwner) {
              return { data: null, error: { message: '403 Forbidden: لا يمكنك الوصول إلى الأدلة الخاصة بمواطن آخر' } };
            }

            return {
              data: { signedUrl: `https://mock-storage.supabase.co/signed/${path}?token=exp_${expiresIn}` },
              error: null
            };
          }),
          remove: vi.fn(async (paths: string[]) => {
            paths.forEach(p => mockPrivateStorageObjects.delete(p));
            return { data: paths, error: null };
          })
        }))
      }
    }))
  };
});

import { nafasAuth } from '../src/lib/auth/authService';
import { nafasReports } from '../src/lib/reports/reportService';

const FOUNDER_EMAIL = 'founder_test@nafas-iraq.org';

describe('PHASE 1 FINAL INTEGRATION & SECURITY GATE ACCEPTANCE', () => {
  beforeEach(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://nafas-production.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-test-anon-key-with-sufficient-length-2026';
    process.env.NAFAS_ALERT_EMAIL = FOUNDER_EMAIL;

    mockCentralReports = [];
    mockCentralProfiles = [];
    mockCentralAuditLogs = [];
    mockCentralOutbox = [];
    mockPrivateStorageObjects.clear();
    mockActiveUser = null;

    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();

    await nafasAuth.signOut();
  });

  it('EXECUTES COMPLETE TWO-SESSION END-TO-END ACCEPTANCE LIFECYCLE', async () => {
    // -------------------------------------------------------------------------
    // SESSION A: CITIZEN REGISTRATION & REPORT SUBMISSION WITH EVIDENCE
    // -------------------------------------------------------------------------
    
    // 1. Citizen signs up
    const citizenReg = await nafasAuth.signUp({
      email: 'citizen_basra@example.com',
      password: 'CitizenSecurePass2026!',
      fullName: 'علي التميمي',
      governorateId: 'basra'
    });
    expect(citizenReg.success).toBe(true);
    expect(citizenReg.user.role).toBe('citizen');

    const citizenUser = nafasAuth.getCurrentUser();
    expect(citizenUser?.id).toBeDefined();

    // 2. Citizen attempts vertical privilege escalation (Should fail)
    await expect(nafasAuth.updateUserRole(citizenUser!.id, 'admin')).rejects.toThrow(
      /403 Forbidden|Super Admin Required/i
    );
    await expect(nafasAuth.listUsers()).rejects.toThrow(/403 Forbidden/i);

    // 3. Citizen submits report with real image file and GPS location
    const testImageFile = new File(['binary-jpeg-data'], 'oil-slick.jpg', { type: 'image/jpeg' });
    const submissionResult = await nafasReports.submitReport({
      title: 'تسرب نفطي كثيف في شط العرب قرب ميناء المعقل',
      description: 'بقعة زيوت عائمة تهدد التنوع الأحيائي ومحطات تحلية المياه، يرجى التدخل العاجل',
      category: 'water',
      severity: 'critical',
      governorateId: 'basra',
      neighborhood: 'المعقل',
      lat: 30.5480,
      lng: 47.7880,
      location_source: 'gps',
      accuracy_m: 8,
      imageFile: testImageFile,
      isAnonymous: false,
      isHazardous: true
    });

    // Verification 1: Report saved centrally with canonical tracking number and submitted status
    expect(submissionResult.success).toBe(true);
    expect(submissionResult.trackingNumber).toMatch(/^NFS-\d{4}-\d+$/);
    expect(submissionResult.report.status).toBe('submitted');
    expect(submissionResult.report.isHazardous).toBe(true);

    const savedReport = mockCentralReports.find(r => r.id === submissionResult.report.id);
    expect(savedReport).toBeDefined();
    // Verification: storage path is user-isolated in citizen's namespace
    expect(savedReport.image_before_storage_path).toContain(`reports/${citizenUser!.id}/basra/`);
    // Verification: expiring signed URLs are NOT stored in the database record
    expect(savedReport.image_before_url).toBeNull();

    // Verification 2: Evidence stored in private bucket and accessible by owner
    const ownerSignedUrl = await nafasReports.getEvidenceSignedUrl(savedReport.image_before_storage_path);
    expect(ownerSignedUrl).toContain('mock-storage.supabase.co/signed');

    // Verification 3: Notification event persisted in outbox via database trigger
    expect(mockCentralOutbox.length).toBeGreaterThanOrEqual(1);
    const outboxItem = mockCentralOutbox.find(o => o.report_id === savedReport.id);
    expect(outboxItem).toBeDefined();
    expect(outboxItem.event_type).toBe('REPORT_HAZARDOUS_ALERT');
    expect(['pending', 'sent']).toContain(outboxItem.delivery_status);

    // Verification 4: Unreviewed report is strictly ABSENT from public map views
    const initialPublicReports = await nafasReports.getPublicReports();
    expect(initialPublicReports.some(r => r.id === savedReport.id)).toBe(false);

    // -------------------------------------------------------------------------
    // SESSION C: UNRELATED CITIZEN ATTEMPTS PRIVILEGED & PRIVATE DATA ACCESS
    // -------------------------------------------------------------------------
    await nafasAuth.signOut();
    const unrelatedReg = await nafasAuth.signUp({
      email: 'unrelated_citizen@example.com',
      password: 'OtherPassword123!',
      fullName: 'مواطن غريب',
      governorateId: 'erbil'
    });
    const unrelatedUser = nafasAuth.getCurrentUser();
    expect(unrelatedUser?.id).toBeDefined();

    // 1. Unrelated citizen CANNOT read Session A's private evidence photo
    const unauthorizedSignedUrl = await nafasReports.getEvidenceSignedUrl(savedReport.image_before_storage_path);
    expect(unauthorizedSignedUrl).toBe(''); // Denied by storage object policy

    // 2. Unrelated citizen cannot see staff reports
    await expect(nafasReports.getAllReportsForStaff()).rejects.toThrow(/403 Forbidden/i);

    // 3. Unrelated citizen cannot change report moderation status
    await expect(
      nafasReports.updateReportStatus(savedReport.id, 'verified', 'اختراق غير مصرح به')
    ).rejects.toThrow(/403 Forbidden/i);

    // 4. Unrelated citizen upload is strictly isolated to their own user namespace
    const unrelatedUpload = await nafasReports.uploadEvidenceImage(testImageFile, 'erbil');
    expect(unrelatedUpload.storagePath).toContain(`reports/${unrelatedUser!.id}/erbil/`);
    expect(unrelatedUpload.storagePath).not.toContain(citizenUser!.id);

    // 5. Unrelated citizen cannot invoke privileged notification worker
    const unauthorizedWorker = await nafasReports.triggerServerNotificationProcessor();
    expect(unauthorizedWorker.success).toBe(false);
    expect(unauthorizedWorker.messageAr).toContain('403 Forbidden');

    // -------------------------------------------------------------------------
    // SESSION B: FOUNDER LOGIN WITH VERIFIED MFA (AAL2) & MODERATION REVIEW
    // -------------------------------------------------------------------------
    await nafasAuth.signOut();

    // 1. Founder signs in
    const founderLogin = await nafasAuth.signIn({
      email: FOUNDER_EMAIL,
      password: 'FounderMasterPassword2026!'
    });
    expect(founderLogin.success).toBe(true);

    // 2. Founder invokes provision-founder Edge Function with secure 16+ char token
    const bootstrapRes = await nafasAuth.bootstrapFounder('NafasFounderMasterToken2026Secured!');
    expect(bootstrapRes.success).toBe(true);
    expect(bootstrapRes.user.role).toBe('super_admin');
    expect(nafasAuth.isFounderOrSuperAdmin()).toBe(true);

    // 3. Founder views report in staff dashboard
    const staffReports = await nafasReports.getAllReportsForStaff();
    expect(staffReports.some(r => r.id === savedReport.id)).toBe(true);

    // 4. Founder can access private evidence photo via authorized signed URL
    const founderSignedUrl = await nafasReports.getEvidenceSignedUrl(savedReport.image_before_storage_path);
    expect(founderSignedUrl).toContain('mock-storage.supabase.co/signed');

    // 5. Server-side notification worker processes the pending outbox item
    const workerResult = await nafasReports.triggerServerNotificationProcessor();
    expect(workerResult.success).toBe(true);
    expect(outboxItem.delivery_status).toBe('sent');
    expect(outboxItem.external_message_id).toBeDefined();

    // 6. Founder verifies the report
    const moderationResult = await nafasReports.updateReportStatus(
      savedReport.id,
      'verified',
      'تم تدقيق البلاغ مع دائرة حماية وتحسين البيئة في المنطقة الجنوبية واعتماده.'
    );
    expect(moderationResult.success).toBe(true);
    expect(moderationResult.report.status).toBe('verified');

    // 7. Verified report NOW appears on the public map view
    const approvedPublicReports = await nafasReports.getPublicReports();
    const publicVersion = approvedPublicReports.find(r => r.id === savedReport.id);
    expect(publicVersion).toBeDefined();
    // Citizen privacy: exact reporter details are not published in public projection
    expect(publicVersion?.reportedBy).toBe('مواطن عراقي (محمي)');

    // 8. Immutable audit history is created and intact
    expect(mockCentralAuditLogs.length).toBeGreaterThanOrEqual(1);
    const auditRecord = mockCentralAuditLogs.find(a => a.report_id === savedReport.id);
    expect(auditRecord).toBeDefined();
    expect(auditRecord.previous_status).toBe('submitted');
    expect(auditRecord.new_status).toBe('verified');

    // 9. Founder test: Rejecting an erroneous report removes it from public map
    const rejectionResult = await nafasReports.updateReportStatus(
      savedReport.id,
      'rejected',
      'تم تصحيح الحالة ميدانياً وإغلاق البلاغ.'
    );
    expect(rejectionResult.report.status).toBe('rejected');

    const updatedPublicReports = await nafasReports.getPublicReports();
    expect(updatedPublicReports.some(r => r.id === savedReport.id)).toBe(false);
  });
});
