import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nafasAuth } from '@/lib/auth/authService';

describe('NAFAS Production Authentication & Founder Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates founder PIN format: rejects non-numeric or short/long PINs', async () => {
    // PIN must be 4 to 8 numeric digits
    await expect(nafasAuth.setFounderPin('abc')).rejects.toThrow(/الرمز السري الإداري يجب أن يتكون من 4 إلى 8 أرقام فقط/);
    await expect(nafasAuth.setFounderPin('12')).rejects.toThrow(/الرمز السري الإداري يجب أن يتكون من 4 إلى 8 أرقام فقط/);
    await expect(nafasAuth.setFounderPin('1234567890')).rejects.toThrow(/الرمز السري الإداري يجب أن يتكون من 4 إلى 8 أرقام فقط/);
  });

  it('verifies founder PIN requires valid input', async () => {
    await expect(nafasAuth.verifyFounderPin('')).rejects.toThrow(/يرجى إدخال الرمز السري/);
  });

  it('ensures ordinary users cannot set or verify founder PIN without super_admin role and AAL2', async () => {
    // When called unauthenticated or as citizen
    await expect(nafasAuth.setFounderPin('123456')).rejects.toThrow();
    await expect(nafasAuth.verifyFounderPin('123456')).rejects.toThrow();
  });
});
