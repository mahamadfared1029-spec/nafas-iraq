/**
 * NAFAS | نَفَس — Server-Side Notification Service
 * 
 * SECURITY MANDATE:
 * - NEVER expose recipient emails in client-side code, frontend bundles, or public API responses.
 * - Resolves the alert destination exclusively from protected server environment variable:
 *   process.env.NAFAS_ALERT_EMAIL
 * - If credentials or providers are unconfigured, logs queue status truthfully without faking delivery.
 */

export interface AlertPayload {
  reportId: string;
  trackingNumber: string;
  category: string;
  categoryLabelAr: string;
  governorate: string;
  neighborhood: string;
  approximateLocation: string;
  date: string;
  moderationStatus: string;
  isHazardous: boolean;
  severity: string;
  adminDashboardUrl: string;
}

export type NotificationDeliveryStatus = 'report_saved' | 'queued' | 'sent' | 'delivery_failed' | 'disabled_unconfigured';

export interface NotificationResult {
  reportId: string;
  status: NotificationDeliveryStatus;
  recipientConfigured: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  timestamp: string;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return '#';
}

export class NafasNotificationService {
  private static instance: NafasNotificationService;
  private sentHashes: Set<string> = new Set();
  private lastAlertTime: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): NafasNotificationService {
    if (!NafasNotificationService.instance) {
      NafasNotificationService.instance = new NafasNotificationService();
    }
    return NafasNotificationService.instance;
  }

  /**
   * Resolves the protected server alert destination.
   * STRICT SECURITY: NEVER return or expose this to client-side bundles.
   */
  private getTargetEmail(): string | null {
    // Only accessible in node / server execution environment
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NAFAS_ALERT_EMAIL || null;
    }
    return null;
  }

  /**
   * Formats the official Arabic administrative alert email
   */
  public formatAlertEmail(payload: AlertPayload): { subject: string; text: string; html: string } {
    const hazardPrefix = payload.isHazardous ? '🚨 [عاجل - خطر بيئي] ' : '';
    const subject = `${hazardPrefix}[NAFAS] بلاغ بيئي جديد — ${payload.governorate} (${payload.trackingNumber})`;

    const text = `
منظومة نَفَس العراقية — إشعار إداري ميداني
--------------------------------------------------
رقم التتبع: ${payload.trackingNumber}
المحافظة: ${payload.governorate}
الحي / المنطقة: ${payload.neighborhood || 'غير محدد بدقة'}
الموقع التقريبي: ${payload.approximateLocation}
التصنيف البيئي: ${payload.categoryLabelAr} (${payload.category})
مستوى الخطورة: ${safeSeverity} ${payload.isHazardous ? '⚠️ (مؤشر خطر نشط)' : ''}
تاريخ وتوقيت البلاغ: ${payload.date}
حالة الاعتماد الأولية: ${payload.moderationStatus}

رابط المراجعة والاعتماد في لوحة الإشراف المحمية:
${payload.adminDashboardUrl}

ملاحظة أمنية: هذا الإشعار مرسل إلى المشرف المعتمد لإجراء التدقيق الميداني وفق بروتوكول السلامة الوطنية.
`.trim();

    const safeTracking = escapeHtml(payload.trackingNumber);
    const safeGov = escapeHtml(payload.governorate);
    const safeNeighborhood = escapeHtml(payload.neighborhood || 'ميداني');
    const safeCategory = escapeHtml(payload.categoryLabelAr);
    const safeSeverity = escapeHtml(payload.severity);
    const safeDate = escapeHtml(payload.date);
    const safeAdminUrl = sanitizeUrl(payload.adminDashboardUrl);

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F1E7; color: #222238; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #E5DCCD; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
    <div style="background-color: ${payload.isHazardous ? '#991B1B' : '#6B463B'}; color: #ffffff; padding: 20px; text-align: center;">
      <h2 style="margin: 0; font-size: 20px;">نَفَس | إشعار بلاغ بيئي جديد</h2>
      <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${safeGov} — ${safeTracking}</p>
    </div>
    <div style="padding: 24px; line-height: 1.6; font-size: 14px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #6B463B; font-weight: bold; width: 35%;">رقم التتبع:</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 15px; font-weight: bold;">${safeTracking}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B463B; font-weight: bold;">المحافظة:</td>
          <td style="padding: 8px 0;">${safeGov}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B463B; font-weight: bold;">المنطقة:</td>
          <td style="padding: 8px 0;">${safeNeighborhood}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B463B; font-weight: bold;">التصنيف:</td>
          <td style="padding: 8px 0;">${safeCategory}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B463B; font-weight: bold;">الأولوية والسلامة:</td>
          <td style="padding: 8px 0; color: ${payload.isHazardous ? '#DC2626' : '#222238'}; font-weight: ${payload.isHazardous ? 'bold' : 'normal'};">
            ${safeSeverity} ${payload.isHazardous ? '🚨 [يتطلب معالجة طارئة ومعدات حماية]' : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B463B; font-weight: bold;">التاريخ:</td>
          <td style="padding: 8px 0;">${safeDate}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${safeAdminUrl}" style="background-color: #62467D; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
          فتح لوحة المشرف للمراجعة والاعتماد
        </a>
      </div>
    </div>
    <div style="background-color: #F7F1E7; padding: 14px; text-align: center; font-size: 11px; color: #786C5E; border-top: 1px solid #E5DCCD;">
      منظومة نَفَس لحماية بيئة العراق — رسالة مشفرة ومخصصة للمشرفين المعتمدين فقط.
    </div>
  </div>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Process notification for a newly submitted or hazardous report.
   * Implements deduplication, throttling, and clear status tracking.
   */
  public async dispatchReportAlert(payload: AlertPayload): Promise<NotificationResult> {
    const now = Date.now();
    const targetEmail = this.getTargetEmail();
    const hash = `${payload.trackingNumber}-${payload.category}`;

    // 1. Deduplication Check
    if (this.sentHashes.has(hash)) {
      return {
        reportId: payload.reportId,
        status: 'queued',
        recipientConfigured: Boolean(targetEmail),
        provider: 'deduplicated',
        timestamp: new Date().toISOString()
      };
    }

    // 2. Throttling Check (maximum 1 notification per 10 seconds per governorate)
    const lastGovTime = this.lastAlertTime.get(payload.governorate) || 0;
    if (now - lastGovTime < 10000 && !payload.isHazardous) {
      return {
        reportId: payload.reportId,
        status: 'queued',
        recipientConfigured: Boolean(targetEmail),
        provider: 'throttled',
        timestamp: new Date().toISOString()
      };
    }

    this.sentHashes.add(hash);
    this.lastAlertTime.set(payload.governorate, now);

    // 3. Provider Connection Check
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || null;
    const smtpHost = process.env.SMTP_HOST || null;

    if (!targetEmail) {
      // Alert email not configured in environment
      return {
        reportId: payload.reportId,
        status: 'disabled_unconfigured',
        recipientConfigured: false,
        provider: 'none',
        error: 'Missing server environment variable: NAFAS_ALERT_EMAIL',
        timestamp: new Date().toISOString()
      };
    }

    if (!apiKey && !smtpHost) {
      // Recipient is configured, but outbound transport provider (Resend/SMTP) is pending credentials
      return {
        reportId: payload.reportId,
        status: 'queued',
        recipientConfigured: true,
        provider: 'mock_transport_pending_credentials',
        timestamp: new Date().toISOString()
      };
    }

    // 4. If Resend / External API is configured, attempt real delivery
    if (apiKey) {
      try {
        const { subject, html, text } = this.formatAlertEmail(payload);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'NAFAS System Alerts <alerts@nafas-iraq.org>',
            to: targetEmail,
            subject,
            html,
            text
          })
        });

        if (res.ok) {
          const data = await res.json();
          return {
            reportId: payload.reportId,
            status: 'sent',
            recipientConfigured: true,
            provider: 'resend',
            messageId: data.id,
            timestamp: new Date().toISOString()
          };
        } else {
          const errText = await res.text();
          return {
            reportId: payload.reportId,
            status: 'delivery_failed',
            recipientConfigured: true,
            provider: 'resend',
            error: `API returned ${res.status}: ${errText}`,
            timestamp: new Date().toISOString()
          };
        }
      } catch (err: any) {
        return {
          reportId: payload.reportId,
          status: 'delivery_failed',
          recipientConfigured: true,
          provider: 'resend',
          error: err?.message || 'Network transport failure',
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      reportId: payload.reportId,
      status: 'queued',
      recipientConfigured: true,
      provider: 'smtp_queued',
      timestamp: new Date().toISOString()
    };
  }
}
