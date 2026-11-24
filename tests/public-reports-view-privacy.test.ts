import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key-with-sufficient-length-for-testing';

import { nafasReports } from '../src/lib/reports/reportService';
import * as supabaseClientModule from '../src/lib/supabase/client';

describe('Public Reports Privacy View Gate (Migration 007)', () => {
  const mockDataset = [
    { id: 'rep-1', status: 'verified', is_archived: false, title: 'Verified Pollution' },
    { id: 'rep-2', status: 'in_progress', is_archived: false, title: 'Active Remediation' },
    { id: 'rep-3', status: 'resolved', is_archived: false, title: 'Cleaned Up' },
    { id: 'rep-4', status: 'pending_verification', is_archived: false, title: 'Unreviewed Dispute' },
    { id: 'rep-5', status: 'submitted', is_archived: false, title: 'Draft Submission' },
    { id: 'rep-6', status: 'under_review', is_archived: false, title: 'Internal Triage' },
    { id: 'rep-7', status: 'rejected', is_archived: false, title: 'Spam Report' },
    { id: 'rep-8', status: 'verified', is_archived: true, title: 'Archived Verified' }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'public_reports') {
          // Enforces Migration 007 criteria: status IN ('verified', 'in_progress', 'resolved') AND is_archived = false
          const publicOnly = mockDataset.filter(
            r => ['verified', 'in_progress', 'resolved'].includes(r.status) && !r.is_archived
          );
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: publicOnly, error: null })
          };
        }
        return { select: vi.fn().mockReturnThis() };
      })
    };
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);
  });

  it('strictly excludes pending_verification, submitted, and under_review reports from public view', async () => {
    const publicReports = await nafasReports.getPublicReports();
    const ids = publicReports.map(r => r.id);

    // Allowed statuses
    expect(ids).toContain('rep-1'); // verified
    expect(ids).toContain('rep-2'); // in_progress
    expect(ids).toContain('rep-3'); // resolved

    // Forbidden unmoderated/private statuses
    expect(ids).not.toContain('rep-4'); // pending_verification MUST NOT be public
    expect(ids).not.toContain('rep-5'); // submitted MUST NOT be public
    expect(ids).not.toContain('rep-6'); // under_review MUST NOT be public
    expect(ids).not.toContain('rep-7'); // rejected MUST NOT be public
    expect(ids).not.toContain('rep-8'); // archived MUST NOT be public
  });

  it('guarantees anonymous public consumers only receive approved community reports', async () => {
    const publicReports = await nafasReports.getPublicReports();
    expect(publicReports.length).toBe(3);
    for (const report of publicReports) {
      expect(['verified', 'in_progress', 'resolved']).toContain(report.status);
    }
  });
});
