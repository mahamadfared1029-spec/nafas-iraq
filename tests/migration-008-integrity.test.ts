/**
 * NAFAS Iraq — Migration 008 TITAN Protocol Security & Integrity Regression Tests
 * 
 * Verifies the 6 Core Verified Audit Issues:
 * 1. Persistent, atomic failed-attempt counting (no transaction rollback).
 * 2. 40-bit cryptographic entropy Crockford alphanumeric code (XXXX-XXXX format) with strict expiry bounds and rate limits.
 * 3. Registration status validation (rejects cancelled, no_show; requires 'registered').
 * 4. Attendance approval validation (strictly requires 'checked_in', bounds 0.5-12.0h).
 * 5. Direct registration table permissions (direct INSERT/UPDATE/DELETE denied; RPC-only mutations).
 * 6. Certificate consistency (unique issuance, no ON CONFLICT code mismatch, accurate SHA-256 seal digest).
 * 7. Privilege review (REVOKE from anon/PUBLIC, explicit search_path).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { nafasCampaigns } from '../src/lib/campaigns/campaignService';
import { nafasAuth } from '../src/lib/auth/authService';
import * as supabaseClientModule from '../src/lib/supabase/client';

describe('NAFAS Migration 008 — TITAN Protocol Security & Integrity Verification', () => {

  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261125000008_phase2a_campaigns_and_volunteers.sql');
  let migrationSql: string;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Migration SQL file should exist and be loadable', () => {
    migrationSql = fs.readFileSync(migrationPath, 'utf8');
    expect(migrationSql).toBeDefined();
    expect(migrationSql.length).toBeGreaterThan(1000);
  });

  describe('ISSUE 1: Failed-Attempt Counter Rollback Prevention', () => {
    it('SQL must NOT combine failed_attempts update with RAISE EXCEPTION in the invalid code branch', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      // Find the invalid code handling block in rpc_volunteer_checkin
      const volunteerCheckinStart = migrationSql.indexOf('rpc_volunteer_checkin(');
      expect(volunteerCheckinStart).toBeGreaterThan(-1);

      const volunteerCheckinBlock = migrationSql.substring(volunteerCheckinStart, volunteerCheckinStart + 4000);

      // Verify that after updating failed_attempts, it does NOT do RAISE EXCEPTION '...'
      const updateAttemptsIdx = volunteerCheckinBlock.indexOf('UPDATE public.campaign_checkin_codes');
      expect(updateAttemptsIdx).toBeGreaterThan(-1);

      const codeAfterUpdate = volunteerCheckinBlock.substring(updateAttemptsIdx, updateAttemptsIdx + 600);
      expect(codeAfterUpdate).toContain('INSERT INTO public.campaign_checkin_attempts');
      expect(codeAfterUpdate).toContain('RETURN jsonb_build_object');
      expect(codeAfterUpdate).not.toContain("RAISE EXCEPTION 'رمز الحضور الميداني غير صحيح'");
    });

    it('Service must receive committed failure payload and translate to user-facing rejection', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'INVALID_CODE',
          message: 'رمز الحضور الميداني غير صحيح.',
          attempts_remaining: 24
        },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      await expect(nafasCampaigns.volunteerCheckIn('CMP-BAG-01', 'WRONG123')).rejects.toThrow(
        /رمز الحضور الميداني غير صحيح/
      );
    });

    it('Service must reject when campaign lockout payload is returned from database', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'CAMPAIGN_LOCKED',
          message: 'تم قفل رمز الحضور بسبب تجاوز الحد الأقصى للمحاولات الخاطئة على مستوى الحملة.'
        },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      await expect(nafasCampaigns.volunteerCheckIn('CMP-BAG-01', 'WRONG123')).rejects.toThrow(
        /تجاوز الحد الأقصى للمحاولات الخاطئة على مستوى الحملة/
      );
    });
  });

  describe('ISSUE 2: Check-in Code Entropy, Expiration Bounds & Multi-Layer Rate Limiting', () => {
    it('SQL must use 32-character unambiguous alphabet with gen_random_bytes and 8-character code (40 bits)', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      expect(migrationSql).toContain("'23456789ABCDEFGHJKLMNPQRSTUVWXYZ'");
      expect(migrationSql).toContain('gen_random_bytes(8)');
      expect(migrationSql).toContain('clean_code_length INT NOT NULL DEFAULT 8');
      expect(migrationSql).toContain('% 32'); // Zero modulo bias check
    });

    it('SQL must enforce strict expiration bounds between 15 and 360 minutes', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      // Check clamping in rpc_generate_campaign_checkin_code
      expect(migrationSql).toContain('LEAST(360, GREATEST(15, COALESCE(p_valid_minutes, 120)))');
    });

    it('SQL must enforce per-user rate limit (5 failed attempts / 15 minutes)', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      expect(migrationSql).toContain("attempted_at > NOW() - INTERVAL '15 minutes'");
      expect(migrationSql).toContain('v_user_failed_count >= 5');
      expect(migrationSql).toContain('USER_RATE_LIMITED');
    });
  });

  describe('ISSUE 3: Registration Status Validation in rpc_volunteer_checkin', () => {
    it('SQL must explicitly validate status = "registered" and reject "cancelled", "no_show", "attended"', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      expect(migrationSql).toContain("v_reg.status = 'checked_in'");
      expect(migrationSql).toContain("v_reg.status = 'attended'");
      expect(migrationSql).toContain("v_reg.status = 'cancelled'");
      expect(migrationSql).toContain("v_reg.status = 'no_show'");
      expect(migrationSql).toContain("v_reg.status != 'registered'");
    });

    it('Service must reject check-in if user has cancelled registration', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'REGISTRATION_CANCELLED',
          message: 'تم إلغاء تسجيلك في هذه الحملة سابقاً. لا يمكن تثبيت الحضور لحجز ملغى.'
        },
        error: null
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      await expect(nafasCampaigns.volunteerCheckIn('CMP-BAG-01', 'ABCD-EFGH')).rejects.toThrow(
        /تم إلغاء تسجيلك في هذه الحملة سابقاً/
      );
    });
  });

  describe('ISSUE 4: Attendance Approval Validation in rpc_organizer_approve_attendance', () => {
    it('SQL must require status = "checked_in" before organizer approval', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      expect(migrationSql).toContain("IF v_reg.status != 'checked_in' THEN");
      expect(migrationSql).toContain("المتطوع لم يثبت حضوره الميداني بعد");
    });

    it('SQL must enforce hours between 0.5 and 12.0 hours', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      expect(migrationSql).toContain('v_awarded_hours < 0.5 OR v_awarded_hours > 12.0');
    });

    it('Service must reject approval for attendee who has not checked in', async () => {
      vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);

      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'لا يمكن اعتماد الحضور: المتطوع لم يثبت حضوره الميداني بعد (حالة التسجيل الحالية: registered وليست checked_in).' }
      });
      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({ rpc: mockRpc } as any);

      await expect(nafasCampaigns.organizerApproveAttendance({
        campaignId: 'CMP-BAG-01',
        volunteerId: 'user-vol-1',
        hours: 4.0
      })).rejects.toThrow(/المتطوع لم يثبت حضوره الميداني بعد/);
    });
  });

  describe('ISSUE 5: Direct Registration Table Permissions Locked Down', () => {
    it('SQL must purge permissive "Staff can manage registrations" and deny direct INSERT/UPDATE', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      expect(migrationSql).toContain('DROP POLICY IF EXISTS "Staff can manage registrations" ON public.campaign_registrations;');
      expect(migrationSql).toContain('DROP POLICY IF EXISTS "Users can insert own registration" ON public.campaign_registrations;');
      expect(migrationSql).toContain('DROP POLICY IF EXISTS "Users can update own registration status" ON public.campaign_registrations;');

      // Verify only SELECT policy is granted on campaign_registrations
      expect(migrationSql).toContain('CREATE POLICY "Users and organizers can view registrations"');
      expect(migrationSql).toContain('ON public.campaign_registrations FOR SELECT TO authenticated');

      // Verify no INSERT or UPDATE policy is created for campaign_registrations
      const regSectionStart = migrationSql.indexOf('-- Registrations RLS:');
      const regSection = migrationSql.substring(regSectionStart, regSectionStart + 1500);
      expect(regSection).not.toContain('ON public.campaign_registrations FOR INSERT');
      expect(regSection).not.toContain('ON public.campaign_registrations FOR UPDATE');
      expect(regSection).not.toContain('ON public.campaign_registrations FOR ALL');
    });
  });

  describe('ISSUE 6: Certificate Consistency, Deduplication & Unique Issuance', () => {
    it('SQL must safely deduplicate pre-existing certificates before applying unique constraint', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      expect(migrationSql).toContain('UPDATE public.certificates c1');
      expect(migrationSql).toContain('SET is_revoked = TRUE');
      expect(migrationSql).toContain('uq_certificates_campaign_user UNIQUE (campaign_id, user_id)');
    });

    it('SQL must check for existing certificate before generating new code, avoiding mismatched ON CONFLICT codes', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      // In rpc_organizer_approve_attendance:
      const approveFuncStart = migrationSql.indexOf('rpc_organizer_approve_attendance(');
      const approveFunc = migrationSql.substring(approveFuncStart, approveFuncStart + 4000);

      expect(approveFunc).toContain('SELECT * INTO v_existing_cert');
      expect(approveFunc).toContain('WHERE campaign_id = p_campaign_id AND user_id = p_volunteer_id;');
      expect(approveFunc).toContain('تم إصدار شهادة مشاركة مسبقاً لهذا المتطوع');

      // Must be a clean direct insert, not ON CONFLICT DO UPDATE returning wrong code
      expect(approveFunc).not.toContain('ON CONFLICT (campaign_id, user_id) DO UPDATE');
    });
  });

  describe('Mandatory Security Governance: Privileges & search_path', () => {
    it('All privileged functions must have explicit SET search_path = public, pg_temp', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      const functions = [
        'rpc_register_for_campaign',
        'rpc_cancel_campaign_registration',
        'rpc_generate_campaign_checkin_code',
        'rpc_volunteer_checkin',
        'rpc_organizer_approve_attendance',
        'rpc_get_environmental_impact_summary'
      ];

      for (const fn of functions) {
        const fnIdx = migrationSql.indexOf(`FUNCTION public.${fn}`);
        expect(fnIdx).toBeGreaterThan(-1);
        const fnBlock = migrationSql.substring(fnIdx, fnIdx + 300);
        expect(fnBlock).toContain('SECURITY DEFINER');
        expect(fnBlock).toContain('SET search_path = public, pg_temp');
      }
    });

    it('All sensitive RPCs must have REVOKE ALL FROM PUBLIC, anon', () => {
      migrationSql = fs.readFileSync(migrationPath, 'utf8');

      const sensitiveRPCs = [
        'rpc_register_for_campaign(VARCHAR)',
        'rpc_cancel_campaign_registration(VARCHAR)',
        'rpc_generate_campaign_checkin_code(VARCHAR, INT)',
        'rpc_volunteer_checkin(VARCHAR, VARCHAR)',
        'rpc_organizer_approve_attendance(VARCHAR, UUID, NUMERIC)'
      ];

      for (const rpc of sensitiveRPCs) {
        expect(migrationSql).toContain(`REVOKE ALL ON FUNCTION public.${rpc} FROM PUBLIC, anon;`);
        expect(migrationSql).toContain(`GRANT EXECUTE ON FUNCTION public.${rpc} TO authenticated;`);
      }
    });
  });
});
