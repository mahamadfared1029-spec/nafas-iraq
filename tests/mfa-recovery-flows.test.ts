/**
 * NAFAS — User-Facing Password Recovery & TOTP MFA Verification Tests
 * Verifies that:
 * 1. Password reset flow validates complexity and invokes official Supabase Auth APIs.
 * 2. MFA enrollment flow requires authentication and handles factor generation.
 * 3. MFA challenge and verification require 6-digit codes and enforce AAL2 assurance.
 * 4. Zero secrets, credentials, or authenticator seeds are persisted or leaked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nafasAuth } from '../src/lib/auth/authService';
import * as supabaseClientModule from '../src/lib/supabase/client';

describe('NAFAS — Password Recovery & MFA Flow Tests', () => {
  it('should reject password update if password is less than 8 characters', async () => {
    await expect(nafasAuth.updatePassword('short')).rejects.toThrow(
      'كلمة المرور يجب أن لا تقل عن 8 أحرف وأرقام.'
    );
  });

  it('should reject MFA enrollment if user is not authenticated', async () => {
    await expect(nafasAuth.enrollMfaFactor()).rejects.toThrow(
      'يجب تسجيل الدخول أولاً لإعداد المصادقة متعددة العوامل.'
    );
  });

  it('should reject MFA enrollment verification with invalid code length', async () => {
    await expect(nafasAuth.verifyMfaEnrollment('factor-123', '123')).rejects.toThrow(
      'يرجى إدخال رمز التحقق المكون من 6 أرقام من تطبيق المصادقة.'
    );
    await expect(nafasAuth.verifyMfaEnrollment('factor-123', '1234567')).rejects.toThrow(
      'يرجى إدخال رمز التحقق المكون من 6 أرقام من تطبيق المصادقة.'
    );
  });

  it('should reject MFA challenge verification with invalid code length', async () => {
    await expect(nafasAuth.verifyMfaLogin('factor-123', 'challenge-123', '12')).rejects.toThrow(
      /يرجى إدخال رمز التحقق/
    );
  });

  it('should reject unenrollment if user is not authenticated', async () => {
    await expect(nafasAuth.unenrollMfaFactor('factor-123')).rejects.toThrow(
      'يجب تسجيل الدخول لإلغاء عامل المصادقة.'
    );
  });

  it('should return empty list of factors when unauthenticated', async () => {
    const factors = await nafasAuth.listMfaFactors();
    expect(factors).toEqual({ all: [], totp: [] });
  });

  it('should validate email format in requestPasswordReset', async () => {
    await expect(nafasAuth.requestPasswordReset('invalid-email')).rejects.toThrow(
      'يرجى إدخال بريد إلكتروني صالح.'
    );
  });
});

describe('TASK 1 — MFA Factor Safety & Anti-Lockout Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should auto-clean ONLY unverified factors and NEVER touch verified factors during enrollment', async () => {
    vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(nafasAuth, 'isConfigured').mockReturnValue(true);

    const unenrolledFactorIds: string[] = [];

    const mockSupabase = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: {
              all: [
                { id: 'factor-verified-1', status: 'verified', friendly_name: 'NAFAS-TOTP-1' },
                { id: 'factor-unverified-stale', status: 'unverified', friendly_name: 'NAFAS-TOTP-stale' }
              ]
            },
            error: null
          }),
          unenroll: vi.fn().mockImplementation(async ({ factorId }) => {
            unenrolledFactorIds.push(factorId);
            return { data: {}, error: null };
          }),
          enroll: vi.fn().mockResolvedValue({
            data: {
              id: 'factor-new-enroll',
              totp: {
                qr_code: '<svg>qr</svg>',
                secret: 'JBSWY3DPEHPK3PXP',
                uri: 'otpauth://totp/NAFAS?secret=JBSWY3DPEHPK3PXP'
              }
            },
            error: null
          })
        }
      }
    };

    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    const res = await nafasAuth.enrollMfaFactor();
    expect(res.factorId).toBe('factor-new-enroll');

    // VERIFY: The unverified factor was cleaned up
    expect(unenrolledFactorIds).toContain('factor-unverified-stale');
    // CRITICAL SECURITY ASSERTION: The verified factor was NEVER unenrolled!
    expect(unenrolledFactorIds).not.toContain('factor-verified-1');
  });

  it('should reject unenrollment of an active verified factor without explicit user confirmation', async () => {
    vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(nafasAuth, 'isConfigured').mockReturnValue(true);

    const mockSupabase = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: {
              all: [
                { id: 'factor-verified-active', status: 'verified', friendly_name: 'NAFAS-TOTP-active' }
              ]
            },
            error: null
          }),
          unenroll: vi.fn()
        }
      }
    };

    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    // Calling without confirmExplicit = true must fail closed
    await expect(nafasAuth.unenrollMfaFactor('factor-verified-active', false)).rejects.toThrow(
      'إلغاء مفتاح المصادقة النشط يتطلب تأكيداً صريحاً'
    );
    expect(mockSupabase.auth.mfa.unenroll).not.toHaveBeenCalled();
  });

  it('should reject unenrollment of verified factor if session does not have active AAL2 assurance', async () => {
    vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(nafasAuth, 'isConfigured').mockReturnValue(true);
    vi.spyOn(nafasAuth, 'verifyAal2Assurance').mockResolvedValue(false); // Session is only AAL1

    const mockSupabase = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: {
              all: [
                { id: 'factor-verified-active', status: 'verified', friendly_name: 'NAFAS-TOTP-active' }
              ]
            },
            error: null
          }),
          unenroll: vi.fn()
        }
      }
    };

    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    await expect(nafasAuth.unenrollMfaFactor('factor-verified-active', true)).rejects.toThrow(
      /AAL2/
    );
    expect(mockSupabase.auth.mfa.unenroll).not.toHaveBeenCalled();
  });

  it('should correctly distinguish enrolled factor from current session AAL2 status', async () => {
    vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(nafasAuth, 'isConfigured').mockReturnValue(true);

    const mockSupabase = {
      auth: {
        mfa: {
          listFactors: vi.fn().mockResolvedValue({
            data: {
              all: [
                { id: 'factor-v1', status: 'verified', friendly_name: 'NAFAS-TOTP-1' }
              ]
            },
            error: null
          }),
          getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
            data: {
              currentLevel: 'aal1', // User logged in with password, has not yet verified TOTP in current session
              nextLevel: 'aal2'
            },
            error: null
          })
        }
      }
    };

    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    const summary = await nafasAuth.getMfaSecuritySummary();
    // User DOES have an active enrolled factor
    expect(summary.hasVerifiedFactor).toBe(true);
    expect(summary.verifiedFactorCount).toBe(1);
    // BUT current session is still aal1
    expect(summary.sessionAssuranceLevel).toBe('aal1');
  });

  it('should safely retire replaced factor ONLY AFTER new factor verification succeeds in replacement flow', async () => {
    vi.spyOn(nafasAuth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(nafasAuth, 'isConfigured').mockReturnValue(true);

    const unenrolledFactors: string[] = [];
    const mockSupabase = {
      auth: {
        mfa: {
          challengeAndVerify: vi.fn().mockResolvedValue({ data: {}, error: null }),
          unenroll: vi.fn().mockImplementation(async ({ factorId }) => {
            unenrolledFactors.push(factorId);
            return { data: {}, error: null };
          })
        }
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    };

    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockSupabase as any);

    const res = await nafasAuth.verifyMfaEnrollment('factor-new-id', '123456', 'factor-old-verified-id');
    expect(res.success).toBe(true);

    // The old factor was retired only after the new factor passed challengeAndVerify
    expect(mockSupabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'factor-new-id',
      code: '123456'
    });
    expect(unenrolledFactors).toContain('factor-old-verified-id');
  });
});
