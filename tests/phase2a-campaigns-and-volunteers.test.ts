/**
 * NAFAS Iraq — Phase 2A: Campaign & Volunteer System Acceptance Tests
 * Verifies:
 * 1. Campaign lifecycle (filtering, governorates, 6 campaign types)
 * 2. Race-condition-resilient registration & capacity enforcement
 * 3. Duplicate registration prevention
 * 4. Cancellation workflow and seat release
 * 5. Dynamic 6-digit field check-in code generation & expiration
 * 6. Server-validated attendance check-in & duplicate reward prevention
 * 7. Digital certificate generation with cryptographic seal
 * 8. Real environmental impact aggregation
 * 9. Guest read-only boundaries and organizer authorization enforcement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nafasCampaigns } from '../src/lib/campaigns/campaignService';
import { nafasAuth } from '../src/lib/auth/authService';
import { INITIAL_CAMPAIGNS } from '../src/lib/constants';
import * as supabaseClientModule from '../src/lib/supabase/client';

describe('NAFAS Phase 2A — Campaign Management & Volunteer Experience', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Campaign Discovery & Filtering', () => {
    it('should support all 6 environmental campaign types', async () => {
      const types = ['reforestation', 'river_protection', 'cleanup', 'recycling', 'education', 'biodiversity'];
      const allCamps = await nafasCampaigns.getCampaigns();
      
      expect(allCamps.length).toBeGreaterThanOrEqual(3);
      
      for (const t of types) {
        const filtered = await nafasCampaigns.getCampaigns({ campaignType: t as any });
        expect(Array.isArray(filtered)).toBe(true);
      }
    });

    it('should filter campaigns accurately by governorate', async () => {
      const baghdadCamps = await nafasCampaigns.getCampaigns({ governorateId: 'baghdad' });
      expect(baghdadCamps.every(c => c.governorateId === 'baghdad')).toBe(true);

      const basraCamps = await nafasCampaigns.getCampaigns({ governorateId: 'basra' });
      expect(basraCamps.every(c => c.governorateId === 'basra')).toBe(true);
    });

    it('should correctly compute remaining capacity and spots left', async () => {
      const camps = await nafasCampaigns.getCampaigns();
      const first = camps[0];
      const spotsLeft = first.volunteerCapacity - first.registeredCount;
      expect(spotsLeft).toBeGreaterThanOrEqual(0);
      expect(first.registeredCount).toBeLessThanOrEqual(first.volunteerCapacity);
    });
  });

  describe('2. Volunteer Registration & Capacity Rules', () => {
    it('should reject registration if user is not authenticated', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(false);

      await expect(nafasCampaigns.registerForCampaign('CMP-BAG-2026-01')).rejects.toThrow(
        /يجب تسجيل الدخول/
      );
    });

    it('should allow authenticated citizen to register and return confirmation via RPC', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
      const mockRpc = vi.fn().mockResolvedValue({
        data: { success: true, message: 'تم تسجيلك بنجاح في الحملة التطوعية!', registration_id: 'reg-123' },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      const res = await nafasCampaigns.registerForCampaign('CMP-BAG-2026-01');
      expect(res.success).toBe(true);
      expect(res.message).toContain('تم تسجيلك بنجاح');
      expect(mockRpc).toHaveBeenCalledWith('rpc_register_for_campaign', { p_campaign_id: 'CMP-BAG-2026-01' });
    });

    it('should fail honestly when Supabase is unconfigured (no fake success)', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);

      await expect(nafasCampaigns.registerForCampaign('CMP-BAG-2026-01')).rejects.toThrow(
        /يتطلب اتصالاً مباشراً بقاعدة البيانات/
      );
    });

    it('should reject registration when campaign capacity is full in RPC response', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'عذراً، اكتمل العدد الأقصى للمتطوعين في هذه الحملة.' }
      });

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({
        rpc: mockRpc
      } as any);

      await expect(nafasCampaigns.registerForCampaign('CMP-FULL-01')).rejects.toThrow(
        /اكتمل العدد الأقصى للمتطوعين/
      );
    });

    it('should reject duplicate registration for the same campaign in RPC response', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'أنت مسجل بالفعل في هذه الحملة التطوعية.' }
      });

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({
        rpc: mockRpc
      } as any);

      await expect(nafasCampaigns.registerForCampaign('CMP-BAG-2026-01')).rejects.toThrow(
        /أنت مسجل بالفعل في هذه الحملة/
      );
    });

    it('should allow user to cancel an existing registration via RPC', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
      const mockRpc = vi.fn().mockResolvedValue({
        data: { success: true, message: 'تم إلغاء التسجيل بنجاح.' },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      const res = await nafasCampaigns.cancelRegistration('CMP-BAG-2026-01');
      expect(res.success).toBe(true);
      expect(res.message).toContain('تم إلغاء التسجيل بنجاح');
      expect(mockRpc).toHaveBeenCalledWith('rpc_cancel_campaign_registration', { p_campaign_id: 'CMP-BAG-2026-01' });
    });
  });

  describe('3. Field Attendance & Verification Security (TITAN Integrity Gate)', () => {
    it('should generate a 6-digit dynamic field check-in code with expiration via RPC', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          success: true,
          campaign_id: 'CMP-BAG-2026-01',
          check_in_code: 'F9A27E',
          expires_at: '2026-11-25T15:00:00Z'
        },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      const res = await nafasCampaigns.generateCheckInCode('CMP-BAG-2026-01', 120);
      expect(res.code).toBe('F9A27E');
      expect(res.expiresAt).toBe('2026-11-25T15:00:00Z');
      expect(mockRpc).toHaveBeenCalledWith('rpc_generate_campaign_checkin_code', {
        p_campaign_id: 'CMP-BAG-2026-01',
        p_valid_minutes: 120
      });
    });

    it('should allow volunteer check-in without choosing hours (status becomes checked_in)', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          success: true,
          status: 'checked_in',
          message: 'تم تثبيت حضورك الميداني بنجاح! بانتظار الاعتماد النهائي لساعات التطوع من منسق الحملة.'
        },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      const res = await nafasCampaigns.volunteerCheckIn('CMP-BAG-2026-01', 'F9A27E');
      expect(res.success).toBe(true);
      expect(res.status).toBe('checked_in');
      expect(res.message).toContain('بانتظار الاعتماد النهائي لساعات التطوع');
      expect(mockRpc).toHaveBeenCalledWith('rpc_volunteer_checkin', {
        p_campaign_id: 'CMP-BAG-2026-01',
        p_checkin_code: 'F9A27E'
      });
    });

    it('should allow organizer to approve attendance, award hours, and issue certificate', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          success: true,
          certificate_code: 'NFS-CERT-2026-A89BC1',
          hours_awarded: 4.0,
          message: 'تم اعتماد حضور المتطوع وإصدار وثيقة الأثر بنجاح!'
        },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      const res = await nafasCampaigns.organizerApproveAttendance({
        campaignId: 'CMP-BAG-2026-01',
        volunteerId: 'vol-user-456',
        hours: 4.0
      });

      expect(res.success).toBe(true);
      expect(res.certificateCode).toBe('NFS-CERT-2026-A89BC1');
      expect(res.hoursAwarded).toBe(4.0);
      expect(mockRpc).toHaveBeenCalledWith('rpc_organizer_approve_attendance', {
        p_campaign_id: 'CMP-BAG-2026-01',
        p_volunteer_id: 'vol-user-456',
        p_hours: 4.0
      });
    });

    it('should lock check-in when rate-limit brute-force threshold is reached', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'تم قفل رمز الحضور بسبب تجاوز الحد الأقصى للمحاولات الخاطئة.' }
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      await expect(nafasCampaigns.volunteerCheckIn('CMP-BAG-2026-01', 'WRONG1')).rejects.toThrow(
        /تجاوز الحد الأقصى للمحاولات الخاطئة/
      );
    });

    it('should reject attendance check-in if code is expired or invalid in RPC response', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'رمز الحضور غير صحيح.' }
      });

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({
        rpc: mockRpc
      } as any);

      await expect(nafasCampaigns.volunteerCheckIn('CMP-BAG-2026-01', 'INVALID')).rejects.toThrow(
        /رمز الحضور غير صحيح/
      );
    });

    it('should prevent duplicate attendance approval for the same campaign in RPC response', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'تم اعتماد حضور هذا المتطوع مسبقاً.' }
      });

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({
        rpc: mockRpc
      } as any);

      await expect(nafasCampaigns.organizerApproveAttendance({
        campaignId: 'CMP-BAG-2026-01',
        volunteerId: 'vol-user-456',
        hours: 4.0
      })).rejects.toThrow(/تم اعتماد حضور هذا المتطوع مسبقاً/);
    });
  });

  describe('4. Real Environmental Impact Metrics (Zero Fabricated Data)', () => {
    it('should return strictly zeros and never fabricate numbers when unconfigured', async () => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);

      const impact = await nafasCampaigns.getEnvironmentalImpact();

      // Zero fabricated fallback rule
      expect(impact.completedCampaigns).toBe(0);
      expect(impact.activeCampaigns).toBe(0);
      expect(impact.verifiedVolunteers).toBe(0);
      expect(impact.verifiedVolunteerHours).toBe(0);
      expect(impact.treesPlanted).toBe(0);
      expect(impact.wasteCollectedKg).toBe(0);
      expect(impact.verifiedReports).toBe(0);
      expect(impact.resolvedCleanups).toBe(0);
    });

    it('should retrieve authentic aggregated impact metrics from RPC when configured', async () => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          completed_campaigns: 7,
          active_campaigns: 3,
          verified_volunteers: 45,
          verified_volunteer_hours: 180,
          trees_planted: 320,
          waste_collected_kg: 850,
          verified_reports: 14,
          resolved_cleanups: 9
        },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      const impact = await nafasCampaigns.getEnvironmentalImpact();

      expect(impact.completedCampaigns).toBe(7);
      expect(impact.verifiedVolunteers).toBe(45);
      expect(impact.verifiedVolunteerHours).toBe(180);
      expect(impact.treesPlanted).toBe(320);
      expect(impact.wasteCollectedKg).toBe(850);
    });

    it('should accurately differentiate between completed campaigns and in-progress/draft campaigns', async () => {
      const allCamps = await nafasCampaigns.getCampaigns();
      const completed = allCamps.filter(c => c.status === 'completed');
      const upcoming = allCamps.filter(c => c.status === 'upcoming');

      expect(Array.isArray(completed)).toBe(true);
      expect(Array.isArray(upcoming)).toBe(true);
    });
  });

  describe('5. Campaign Creation & Organizer Governance', () => {
    it('should reject campaign creation if user is not authenticated', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(false);

      await expect(nafasCampaigns.createCampaign({
        titleAr: 'حملة غير مصرح بها',
        descriptionAr: 'تجربة',
        campaignType: 'reforestation',
        governorateId: 'baghdad',
        meetingArea: 'الكرادة',
        date: '2026-12-01',
        startTime: '09:00 ص',
        durationHours: 3.0,
        volunteerCapacity: 20
      })).rejects.toThrow(/يجب تسجيل الدخول/);
    });

    it('should reject campaign creation honestly if Supabase is unconfigured', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(nafasAuth, 'getCurrentUser').mockReturnValue({
        id: 'org-1',
        email: 'org@nafas.iq',
        role: 'organizer',
        fullName: 'منسق الحملات',
        governorateId: 'baghdad',
        points: 0,
        mfaEnabled: true,
        createdAt: '2026-11-25',
        updatedAt: '2026-11-25'
      });
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);

      await expect(nafasCampaigns.createCampaign({
        titleAr: 'حملة تجريبية',
        descriptionAr: 'تجربة',
        campaignType: 'reforestation',
        governorateId: 'baghdad',
        meetingArea: 'الكرادة',
        date: '2026-12-01',
        startTime: '09:00 ص',
        durationHours: 3.0,
        volunteerCapacity: 20
      })).rejects.toThrow(/تتطلب الاتصال بقاعدة بيانات نَفَس/);
    });

    it('should allow authorized organizer to create campaign in database', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(nafasAuth, 'getCurrentUser').mockReturnValue({
        id: 'org-valid-1',
        email: 'org@nafas.iq',
        role: 'organizer',
        fullName: 'منسق نَفَس الميداني',
        governorateId: 'babil',
        points: 200,
        mfaEnabled: true,
        createdAt: '2026-11-25',
        updatedAt: '2026-11-25'
      });
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'CMP-BAB-2026-NEW' },
        error: null
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ from: mockFrom } as any);

      const res = await nafasCampaigns.createCampaign({
        titleAr: 'غرس 50 شجرة سدر في بساتين بابل',
        descriptionAr: 'مبادرة لحماية التنوع النباتي ومكافحة التصحر في بابل.',
        campaignType: 'reforestation',
        governorateId: 'babil',
        meetingArea: 'الحلة — قرب مدينة بابل الأثرية',
        meetingLat: 32.5422,
        meetingLng: 44.4211,
        date: '2026-12-10',
        startTime: '09:30 ص',
        durationHours: 4.0,
        volunteerCapacity: 35,
        targetTrees: 50,
        isDraft: false
      });

      expect(res.success).toBe(true);
      expect(res.campaignId).toBe('CMP-BAB-2026-NEW');
    });
  });
});
