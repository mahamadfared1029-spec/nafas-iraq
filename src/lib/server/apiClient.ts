/**
 * NAFAS | نَفَس — API Client Adapter & Infrastructure Status Check
 * Transparently distinguishes between Connected Production Server vs Frontend Demo Simulator.
 */

import { EnvironmentalReport, VolunteerCampaign, IssuedCertificate, ReportStatus } from '@/types';

export interface BackendStatus {
  isConfigured: boolean;
  mode: 'production' | 'demo_simulator';
  apiUrl: string | null;
  missingEnv: string[];
  noticeAr: string;
}

export class NafasApiClient {
  private static instance: NafasApiClient;
  private apiUrl: string | null;

  private constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || null;
  }

  public static getInstance(): NafasApiClient {
    if (!NafasApiClient.instance) {
      NafasApiClient.instance = new NafasApiClient();
    }
    return NafasApiClient.instance;
  }

  /**
   * Check status of server infrastructure and missing environment variables
   */
  public getStatus(): BackendStatus {
    const missing: string[] = [];
    if (!process.env.NEXT_PUBLIC_API_URL) missing.push('NEXT_PUBLIC_API_URL');
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!process.env.AUTH_SECRET) missing.push('AUTH_SECRET');
    if (!process.env.SMS_GATEWAY_API_KEY) missing.push('SMS_GATEWAY_API_KEY');

    const isConfigured = Boolean(this.apiUrl);

    return {
      isConfigured,
      mode: isConfigured ? 'production' : 'demo_simulator',
      apiUrl: this.apiUrl,
      missingEnv: missing,
      noticeAr: isConfigured
        ? 'الخادم الوطني متصل وموثّق'
        : 'يعمل التطبيق حالياً في وضع العرض التجريبي (Demo Simulator). يتطلب الإنتاج ربط خادم مصادقة وطني وقاعدة بيانات PostgreSQL مع PostGIS.'
    };
  }

  /**
   * Submit an environmental report to server or log demo fallback
   */
  public async submitReport(reportData: Partial<EnvironmentalReport>): Promise<{ success: boolean; data?: any; isDemo: boolean }> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      console.info('[NAFAS API] Running in Demo Mode: Report registered locally in client state.');
      return { success: true, isDemo: true };
    }

    const response = await fetch(`${this.apiUrl}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });

    if (!response.ok) {
      throw new Error(`فشل إرسال البلاغ إلى الخادم: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data, isDemo: false };
  }

  /**
   * Verify an environmental report (Requires real server authorization)
   */
  public async verifyReport(reportId: string, newStatus: ReportStatus, token?: string): Promise<{ success: boolean; isDemo: boolean }> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      console.warn('[NAFAS API] Demo Mode: Report verification simulated locally without server signature.');
      return { success: true, isDemo: true };
    }

    if (!token) {
      throw new Error('لا يمكن اعتماد البلاغ دون رمز مصادقة رسمي من الخادم (Missing Auth Token).');
    }

    const response = await fetch(`${this.apiUrl}/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      throw new Error(`فشل تحديث حالة البلاغ على الخادم: ${response.statusText}`);
    }

    return { success: true, isDemo: false };
  }

  /**
   * Issue a verified certificate (Strictly requires server authority)
   */
  public async issueCertificate(campaignId: string, volunteerId: string, hours: number, token?: string): Promise<{ success: boolean; certificate?: IssuedCertificate; isDemo: boolean }> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      console.warn('[NAFAS API] Demo Mode: Certificate issued as demo simulator with watermark.');
      return { success: true, isDemo: true };
    }

    if (!token) {
      throw new Error('غير مصرح لك بإصدار شهادات رسمية دون توثيق الخادم الوطني.');
    }

    const response = await fetch(`${this.apiUrl}/certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ campaignId, volunteerId, hours })
    });

    if (!response.ok) {
      throw new Error(`فشل إصدار الشهادة من الخادم: ${response.statusText}`);
    }

    const cert = await response.json();
    return { success: true, certificate: cert, isDemo: false };
  }
}

export const nafasApi = NafasApiClient.getInstance();
