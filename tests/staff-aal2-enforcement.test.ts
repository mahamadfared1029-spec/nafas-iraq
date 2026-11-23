import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NafasReportService } from '@/lib/reports/reportService';
import { nafasAuth } from '@/lib/auth/authService';

describe('NAFAS Staff AAL2 Security Enforcement', () => {
  const reportService = NafasReportService.getInstance();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should block non-staff from updating report status', async () => {
    vi.spyOn(nafasAuth, 'getCurrentUser').mockReturnValue({
      id: 'citizen-1',
      email: 'citizen@test.iq',
      fullName: 'Citizen Tester',
      role: 'citizen',
      governorateId: 'baghdad',
      points: 10,
      isVerifiedVolunteer: false,
      mfaEnabled: false,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await expect(
      reportService.updateReportStatus('rep-1', 'verified', 'Test note')
    ).rejects.toThrow('403 Forbidden: تحديث حالة البلاغات البيئية محصور بمشرفي المنصة المعتمدين.');
  });

  it('should block staff at AAL1 (without secondary factor) from updating report status', async () => {
    vi.spyOn(nafasAuth, 'getCurrentUser').mockReturnValue({
      id: 'staff-1',
      email: 'moderator@test.iq',
      fullName: 'Moderator Tester',
      role: 'moderator',
      governorateId: 'baghdad',
      points: 50,
      isVerifiedVolunteer: true,
      mfaEnabled: false,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Mock verifyAal2Assurance returning false (AAL1 only)
    vi.spyOn(nafasAuth, 'verifyAal2Assurance').mockResolvedValue(false);

    await expect(
      reportService.updateReportStatus('rep-1', 'verified', 'Test note')
    ).rejects.toThrow('403 Forbidden: هذا الإجراء الإداري يتطلب التحقق الثنائي النشط (AAL2 Required).');
  });

  it('should block staff at AAL1 from retrieving all citizen private reports', async () => {
    vi.spyOn(nafasAuth, 'getCurrentUser').mockReturnValue({
      id: 'staff-1',
      email: 'moderator@test.iq',
      fullName: 'Moderator Tester',
      role: 'moderator',
      governorateId: 'baghdad',
      points: 50,
      isVerifiedVolunteer: true,
      mfaEnabled: false,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    vi.spyOn(nafasAuth, 'verifyAal2Assurance').mockResolvedValue(false);

    await expect(
      reportService.getAllReportsForStaff()
    ).rejects.toThrow('403 Forbidden: هذا الإجراء الإداري يتطلب التحقق الثنائي النشط (AAL2 Required).');
  });

  it('should allow staff at AAL2 to proceed past authorization check', async () => {
    vi.spyOn(nafasAuth, 'getCurrentUser').mockReturnValue({
      id: 'staff-1',
      email: 'moderator@test.iq',
      fullName: 'Moderator Tester',
      role: 'moderator',
      governorateId: 'baghdad',
      points: 50,
      isVerifiedVolunteer: true,
      mfaEnabled: true,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    vi.spyOn(nafasAuth, 'verifyAal2Assurance').mockResolvedValue(true);
    vi.spyOn(reportService, 'isConfigured').mockReturnValue(false);

    // Should proceed past AAL2 check and only fail at database configuration check
    await expect(
      reportService.updateReportStatus('rep-1', 'verified', 'Test note')
    ).rejects.toThrow('تحديث حالة البلاغ يتطلب اتصالاً نشطاً بقاعدة البيانات.');
  });
});
