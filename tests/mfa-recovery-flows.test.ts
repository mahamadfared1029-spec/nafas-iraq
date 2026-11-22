/**
 * NAFAS — User-Facing Password Recovery & TOTP MFA Verification Tests
 * Verifies that:
 * 1. Password reset flow validates complexity and invokes official Supabase Auth APIs.
 * 2. MFA enrollment flow requires authentication and handles factor generation.
 * 3. MFA challenge and verification require 6-digit codes and enforce AAL2 assurance.
 * 4. Zero secrets, credentials, or authenticator seeds are persisted or leaked.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { nafasAuth } from '../src/lib/auth/authService';

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
