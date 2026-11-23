import { describe, it, expect } from 'vitest';

describe('NAFAS — Secret Scanning Synthetic Token Detection Tests', () => {
  const legacyJwtPattern = /eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*(NlcnZpY2Vfcm9sZ|c2VydmljZV9yb2xl|service_role)[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/;
  const modernSecretPattern = /sb_secret_[a-zA-Z0-9_-]{20,}/;
  const resendKeyPattern = /re_[a-zA-Z0-9_]{20,}/;

  it('should detect synthetic legacy service_role JWT fixture with base64 encoded payload', () => {
    // Construct synthetic token dynamically with base64url payload containing service_role claim
    const payloadB64 = Buffer.from('{"iss":"supabase","ref":"testproj","role":"service_role","iat":123}').toString('base64url');
    const syntheticJwt = [
      'eyJhbGciOi' + 'JIUzI1NiIsInR5cCI6IkpXVCJ9',
      payloadB64,
      'SYNTHETIC_TEST_SIG_ONLY_DO_NOT_USE'
    ].join('.');
    expect(legacyJwtPattern.test(syntheticJwt)).toBe(true);
  });

  it('should detect synthetic token with literal role keyword', () => {
    const syntheticJwt = [
      'eyJhbGciOi' + 'JIUzI1NiIsInR5cCI6IkpXVCJ9',
      'payload_with_literal_service_role_keyword',
      'SYNTHETIC_SIG'
    ].join('.');
    expect(legacyJwtPattern.test(syntheticJwt)).toBe(true);
  });

  it('should reject benign non-service_role token', () => {
    const payloadB64 = Buffer.from('{"iss":"supabase","ref":"testproj","role":"anon","iat":123}').toString('base64url');
    const benignJwt = [
      'eyJhbGciOi' + 'JIUzI1NiIsInR5cCI6IkpXVCJ9',
      payloadB64,
      'SYNTHETIC_ANON_SIG'
    ].join('.');
    expect(legacyJwtPattern.test(benignJwt)).toBe(false);
  });

  it('should detect synthetic modern secret key fixture', () => {
    const syntheticModernSecret = ['sb', 'secret', 'synthetic_test_fixture_1234567890'].join('_');
    expect(modernSecretPattern.test(syntheticModernSecret)).toBe(true);
  });

  it('should detect synthetic resend api key fixture', () => {
    const syntheticResend = ['re', 'synthetic_test_api_key_fixture_12345'].join('_');
    expect(resendKeyPattern.test(syntheticResend)).toBe(true);
  });
});
