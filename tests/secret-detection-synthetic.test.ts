import { describe, it, expect } from 'vitest';

describe('NAFAS — Secret Scanning Synthetic Token Detection Tests', () => {
  const legacyJwtPattern = /eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*(NlcnZpY2Vfcm9sZ|c2VydmljZV9yb2xl|service_role)[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/;
  const modernSecretPattern = /sb_secret_[a-zA-Z0-9_-]{20,}/;
  const resendKeyPattern = /re_[a-zA-Z0-9_]{20,}/;

  it('should detect synthetic legacy service_role JWT fixture with base64 encoded payload', () => {
    // Low-entropy repeating characters for zero-entropy synthetic test token
    const payloadB64 = Buffer.from('{"iss":"supabase","ref":"testproj","role":"service_role","iat":123}').toString('base64url');
    const syntheticJwt = [
      'eyJhbGciOi' + 'JIUzI1NiIsInR5cCI6IkpXVCJ9',
      payloadB64,
      '00000000000000000000000000000000'
    ].join('.');
    expect(legacyJwtPattern.test(syntheticJwt)).toBe(true);
  });

  it('should detect synthetic token with literal role keyword', () => {
    const syntheticJwt = [
      'eyJhbGciOi' + 'JIUzI1NiIsInR5cCI6IkpXVCJ9',
      'payload_with_literal_service_role_keyword',
      '00000000000000000000000000000000'
    ].join('.');
    expect(legacyJwtPattern.test(syntheticJwt)).toBe(true);
  });

  it('should reject benign non-service_role token', () => {
    const payloadB64 = Buffer.from('{"iss":"supabase","ref":"testproj","role":"anon","iat":123}').toString('base64url');
    const benignJwt = [
      'eyJhbGciOi' + 'JIUzI1NiIsInR5cCI6IkpXVCJ9',
      payloadB64,
      '00000000000000000000000000000000'
    ].join('.');
    expect(legacyJwtPattern.test(benignJwt)).toBe(false);
  });

  it('should detect synthetic modern secret key fixture', () => {
    const syntheticModernSecret = 'sb_' + 'secret_' + '000000000000000000000000';
    expect(modernSecretPattern.test(syntheticModernSecret)).toBe(true);
  });

  it('should detect synthetic resend api key fixture', () => {
    const syntheticResend = 're_' + '000000000000000000000000';
    expect(resendKeyPattern.test(syntheticResend)).toBe(true);
  });
});
