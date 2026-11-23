/**
 * NAFAS — Hosted Service Authorization & Data Integrity Verification Tests
 * Direct live verification against the hosted Supabase infrastructure:
 * 1. Unauthenticated invocation of worker Edge Function is rejected with 401.
 * 2. Invocation with invalid worker secret is rejected with 401.
 * 3. Unauthenticated invocation of founder provisioning Edge Function is rejected with 401.
 * 4. Anonymous direct access to private storage evidence objects is rejected.
 * 5. Anonymous access to admin audit logs via REST endpoint is rejected with 401.
 */

import { describe, it, expect } from 'vitest';

const HOSTED_URL = 'https://ucaavthzcmobobilbmqu.supabase.co';

describe('NAFAS — Hosted Infrastructure Security & Authorization Gate', () => {
  it('should reject unauthenticated calls to process-notifications Edge Function with 401', async (ctx) => {
    try {
      const res = await fetch(`${HOSTED_URL}/functions/v1/process-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 1 })
      });
      expect(res.status).toBe(401);
    } catch (err: any) {
      if (err.message?.includes('fetch failed') || err.name === 'TypeError') {
        console.warn('[SKIPPED/BLOCKED] Hosted network unreachable for process-notifications test:', err.message);
        ctx.skip();
        return;
      }
      throw err;
    }
  });

  it('should reject calls with invalid worker secret with 401', async (ctx) => {
    try {
      const res = await fetch(`${HOSTED_URL}/functions/v1/process-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer rogue_worker_key_invalid'
        },
        body: JSON.stringify({ batchSize: 1 })
      });
      expect(res.status).toBe(401);
    } catch (err: any) {
      if (err.message?.includes('fetch failed') || err.name === 'TypeError') {
        console.warn('[SKIPPED/BLOCKED] Hosted network unreachable for invalid secret test:', err.message);
        ctx.skip();
        return;
      }
      throw err;
    }
  });

  it('should reject unauthenticated founder provisioning calls with 401', async (ctx) => {
    try {
      const res = await fetch(`${HOSTED_URL}/functions/v1/provision-founder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrapToken: 'arbitrary_token' })
      });
      expect(res.status).toBe(401);
    } catch (err: any) {
      if (err.message?.includes('fetch failed') || err.name === 'TypeError') {
        console.warn('[SKIPPED/BLOCKED] Hosted network unreachable for founder provisioning test:', err.message);
        ctx.skip();
        return;
      }
      throw err;
    }
  });

  it('should reject anonymous direct access to private storage bucket objects', async (ctx) => {
    try {
      const res = await fetch(`${HOSTED_URL}/storage/v1/object/authenticated/report-evidence/test.jpg`, {
        method: 'GET'
      });
      // Storage service returns 400 Bad Request or 401 Unauthorized for unauthenticated requests
      expect([400, 401, 403]).toContain(res.status);
    } catch (err: any) {
      if (err.message?.includes('fetch failed') || err.name === 'TypeError') {
        console.warn('[SKIPPED/BLOCKED] Hosted network unreachable for storage bucket test:', err.message);
        ctx.skip();
        return;
      }
      throw err;
    }
  });

  it('should reject anonymous queries to admin_audit_logs REST endpoint with 401', async (ctx) => {
    try {
      const res = await fetch(`${HOSTED_URL}/rest/v1/admin_audit_logs`, {
        method: 'GET'
      });
      expect(res.status).toBe(401);
    } catch (err: any) {
      if (err.message?.includes('fetch failed') || err.name === 'TypeError') {
        console.warn('[SKIPPED/BLOCKED] Hosted network unreachable for admin audit logs test:', err.message);
        ctx.skip();
        return;
      }
      throw err;
    }
  });
});
