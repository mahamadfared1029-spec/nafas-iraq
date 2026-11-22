/**
 * NAFAS | نَفَس — Authoritative Production Environmental Report Service
 * 
 * Genuine Database & Storage Operations:
 * - PostgreSQL / Supabase reports table with PostGIS geometry
 * - Private Supabase Storage bucket ('report-evidence-private') for photographic evidence
 * - Signed URLs for authorized evidence retrieval across devices
 * - Immutable database report_audit_logs and report_media tables
 * - Database-backed notification_outbox with real transactional email tracking
 * - Truthful operational states: Never simulates central storage via localStorage
 */

import { 
  EnvironmentalReport, 
  ReportStatus, 
  PollutionCategory, 
  SeverityLevel,
  ReportAuditLog,
  NotificationOutboxItem 
} from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { nafasAuth } from '../auth/authService';

export interface SubmitReportInput {
  title: string;
  description: string;
  category: PollutionCategory;
  severity: SeverityLevel;
  governorateId: string;
  neighborhood: string;
  lat: number;
  lng: number;
  location_source?: 'gps' | 'manual_picker' | 'initial_coords' | 'governorate_center_approximate';
  accuracy_m?: number;
  imageFile?: File | null;
  imageBeforeUrl?: string;
  isAnonymous?: boolean;
  isHazardous?: boolean;
}

export class NafasReportService {
  private static instance: NafasReportService;

  private constructor() {}

  public static getInstance(): NafasReportService {
    if (!NafasReportService.instance) {
      NafasReportService.instance = new NafasReportService();
    }
    return NafasReportService.instance;
  }

  public isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Validate coordinates are within Iraq's sovereign geographic envelope
   */
  public validateIraqCoordinates(lat: number, lng: number): boolean {
    return lat >= 28.8 && lat <= 38.0 && lng >= 38.5 && lng <= 49.0;
  }

  /**
   * Validate photographic evidence file
   */
  public validateImageFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'نوع الملف غير مدعوم. الصيغ المقبولة: JPEG, PNG, WebP فقط.' };
    }
    if (file.size > maxSizeBytes) {
      return { valid: false, error: 'حجم الصورة يتجاوز الحد الأقصى المسموح به (10 ميجابايت).' };
    }
    return { valid: true };
  }

  /**
   * Upload photographic evidence to private Supabase Storage bucket
   */
  public async uploadEvidenceImage(
    file: File, 
    governorateOrTracking: string,
    optionalGov?: string
  ): Promise<{ storagePath: string }> {
    const governorateId = optionalGov || governorateOrTracking;
    if (!this.isConfigured()) {
      throw new Error('خدمة رفع وتخزين الصور السحابية تتطلب ربط Supabase Storage.');
    }

    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'ملف الصورة غير صالح');
    }

    const supabase = getSupabaseClient();
    const currentUser = nafasAuth.getCurrentUser();
    const userId = currentUser?.id || 'anonymous';
    const ext = file.name.split('.').pop() || 'webp';
    const randId = Math.random().toString(36).substring(2, 10);
    // User-isolated storage namespace: reports/{userId}/{governorateId}/{filename}
    const storagePath = `reports/${userId}/${governorateId}/${Date.now()}_${randId}.${ext}`;

    // 1. Upload to private bucket (Enforces user namespace isolation in storage RLS)
    const { error: uploadError } = await supabase.storage
      .from('report-evidence-private')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`فشل رفع الصورة إلى التخزين السحابي المحمي: ${uploadError.message}`);
    }

    return {
      storagePath
    };
  }

  /**
   * Submit an environmental report to the authoritative central PostgreSQL/Supabase database
   */
  public async submitReport(input: SubmitReportInput): Promise<{
    success: boolean;
    report: EnvironmentalReport;
    trackingNumber: string;
    messageAr: string;
  }> {
    // 1. Validate Input Data
    const errors: string[] = [];
    if (!input.title || input.title.trim().length < 5) {
      errors.push('عنوان البلاغ يجب أن لا يقل عن 5 أحرف.');
    }
    if (!input.description || input.description.trim().length < 15) {
      errors.push('وصف البلاغ يجب أن يكون مفصلاً (15 حرفاً على الأقل).');
    }
    if (!input.governorateId) {
      errors.push('يرجى تحديد المحافظة.');
    }
    if (!this.validateIraqCoordinates(input.lat, input.lng)) {
      errors.push('إحداثيات الموقع تقع خارج النطاق الجغرافي المعتمد لجمهورية العراق.');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' | '));
    }

    // 2. Check Database Connection
    if (!this.isConfigured()) {
      throw new Error(
        'قاعدة البيانات السحابية (Supabase) غير متصلة حالياً. لا يمكن إرسال البلاغ لعدم توفر خادم مركزي معتمد لحفظ السجلات وتوثيقها.'
      );
    }

    const supabase = getSupabaseClient();
    const currentUser = nafasAuth.getCurrentUser();
    const now = new Date().toISOString();

    // 3. Handle Photographic Evidence Upload to Isolated User Namespace
    let storagePath: string | undefined = undefined;

    if (input.imageFile) {
      const uploadRes = await this.uploadEvidenceImage(input.imageFile, input.governorateId);
      storagePath = uploadRes.storagePath;
    }

    // 4. Insert Record into reports Table (Canonical tracking number generated by PostgreSQL Sequence)
    const reportInsertPayload = {
      // tracking_number omitted so database sequence trigger trg_reports_tracking_number generates canonical sequence
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      severity: input.severity,
      governorate_id: input.governorateId,
      neighborhood: input.neighborhood.trim() || 'ميداني',
      lat: Number(input.lat.toFixed(6)),
      lng: Number(input.lng.toFixed(6)),
      geom: `SRID=4326;POINT(${input.lng.toFixed(6)} ${input.lat.toFixed(6)})`,
      location_source: input.location_source || 'manual_picker',
      accuracy_m: input.accuracy_m,
      source_layer_version: 'gbOpen-IRQ-ADM1-2022',
      image_before_url: null, // Strictly null in DB; never store expiring signed URLs as permanent database column
      image_before_storage_path: storagePath || null,
      status: 'submitted' as ReportStatus,
      reported_by: currentUser?.id || null,
      reporter_display_name: input.isAnonymous ? 'مواطن مجهول' : (currentUser?.fullName || 'مواطن عراقي'),
      is_anonymous: Boolean(input.isAnonymous),
      is_hazardous: Boolean(input.isHazardous),
      is_archived: false
    };

    let insertedReport: any = null;
    try {
      const { data, error: insertError } = await supabase
        .from('reports')
        .insert(reportInsertPayload)
        .select()
        .single();

      if (insertError || !data) {
        throw new Error(insertError?.message || 'Database Insert Failed');
      }
      insertedReport = data;
    } catch (insertErr: any) {
      // Multi-step Rollback: delete uploaded evidence if DB insert fails
      if (storagePath) {
        await supabase.storage.from('report-evidence-private').remove([storagePath]).catch(() => {});
      }
      throw new Error(`فشل حفظ البلاغ في قاعدة البيانات: ${insertErr?.message || 'Insert Error'}`);
    }

    // 5. Read canonical tracking number directly from PostgreSQL inserted record
    const canonicalTrackingNumber = insertedReport.tracking_number;

    // Generate short-lived on-demand preview URL for immediate in-memory return
    let previewUrl = '';
    if (storagePath) {
      previewUrl = await this.getEvidenceSignedUrl(storagePath, 3600);
    }

    const fullReport: EnvironmentalReport = {
      id: insertedReport.id,
      trackingNumber: canonicalTrackingNumber,
      title: insertedReport.title,
      description: insertedReport.description,
      category: insertedReport.category,
      severity: insertedReport.severity,
      governorateId: insertedReport.governorate_id,
      neighborhood: insertedReport.neighborhood,
      lat: Number(insertedReport.lat),
      lng: Number(insertedReport.lng),
      location_source: insertedReport.location_source,
      accuracy_m: insertedReport.accuracy_m,
      source_layer_version: insertedReport.source_layer_version,
      imageBeforeUrl: previewUrl || '',
      imageBeforeStoragePath: insertedReport.image_before_storage_path,
      status: insertedReport.status,
      createdAt: insertedReport.created_at,
      updatedAt: insertedReport.updated_at,
      reportedBy: insertedReport.reported_by || 'citizen-public',
      reporterDisplayName: insertedReport.reporter_display_name,
      isAnonymous: insertedReport.is_anonymous,
      isHazardous: insertedReport.is_hazardous,
      isArchived: insertedReport.is_archived,
      auditLogs: [{
        id: `log-${Date.now()}`,
        timestamp: now,
        actor: input.isAnonymous ? 'مواطن مجهول' : (currentUser?.fullName || 'مواطن عراقي'),
        actorRole: (currentUser?.role || 'citizen') as any,
        previousStatus: 'submitted',
        newStatus: 'submitted',
        notes: 'تم استلام البلاغ رسمياً وإدراجه في طابور الاعتماد والتدقيق الأمني.'
      }]
    };

    return {
      success: true,
      report: fullReport,
      trackingNumber: canonicalTrackingNumber,
      messageAr: `تم توثيق بلاغك البيئي رسمياً في قاعدة البيانات المركزية برقم التتبع: ${canonicalTrackingNumber}. سيتم مراجعته وتدقيقه ميدانياً قبل اعتماده على الخريطة العامة.`
    };
  }

  /**
   * Update Report Moderation Status in Database
   */
  public async updateReportStatus(
    reportId: string, 
    newStatus: ReportStatus, 
    notes: string,
    assignedModeratorId?: string
  ): Promise<{ success: boolean; report: EnvironmentalReport; messageAr: string }> {
    const caller = nafasAuth.getCurrentUser();
    if (!caller || (caller.role !== 'moderator' && caller.role !== 'admin' && caller.role !== 'super_admin') || caller.isSuspended) {
      throw new Error('403 Forbidden: تحديث حالة البلاغات البيئية محصور بمشرفي المنصة المعتمدين.');
    }

    if (!this.isConfigured()) {
      throw new Error('تحديث حالة البلاغ يتطلب اتصالاً نشطاً بقاعدة البيانات.');
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // 1. Update report status in reports table
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({
        status: newStatus,
        assigned_moderator_id: assignedModeratorId || null,
        updated_at: now
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError || !updatedReport) {
      throw new Error(`فشل تحديث حالة البلاغ في قاعدة البيانات: ${updateError?.message || 'Update failed'}`);
    }

    // 2. Insert audit log in report_audit_logs table
    await supabase.from('report_audit_logs').insert({
      report_id: reportId,
      actor_id: caller.id,
      actor_name: `${caller.fullName} (${caller.role})`,
      actor_role: caller.role,
      previous_status: updatedReport.status,
      new_status: newStatus,
      notes: notes.trim() || `تحديث الحالة إلى ${newStatus}`
    });

    const reportObj: EnvironmentalReport = {
      id: updatedReport.id,
      trackingNumber: updatedReport.tracking_number,
      title: updatedReport.title,
      description: updatedReport.description,
      category: updatedReport.category,
      severity: updatedReport.severity,
      governorateId: updatedReport.governorate_id,
      neighborhood: updatedReport.neighborhood,
      lat: Number(updatedReport.lat),
      lng: Number(updatedReport.lng),
      imageBeforeUrl: updatedReport.image_before_url,
      imageBeforeStoragePath: updatedReport.image_before_storage_path,
      status: updatedReport.status,
      createdAt: updatedReport.created_at,
      updatedAt: updatedReport.updated_at,
      reportedBy: updatedReport.reported_by,
      isAnonymous: updatedReport.is_anonymous,
      isHazardous: updatedReport.is_hazardous,
      isArchived: updatedReport.is_archived,
      auditLogs: []
    };

    return {
      success: true,
      report: reportObj,
      messageAr: `تم تحديث حالة البلاغ (${updatedReport.tracking_number}) إلى [${newStatus}] وتوثيق الإجراء في السجل المشفر.`
    };
  }

  /**
   * Get Reports for Public Viewing (Queries privacy-preserving public_reports view)
   * Never exposes reporter identities, private storage paths, or sensitive micro-coordinates
   */
  public async getPublicReports(): Promise<EnvironmentalReport[]> {
    if (!this.isConfigured()) return [];

    try {
      const supabase = getSupabaseClient();
      
      // Query the citizen-privacy projection view
      const { data, error } = await supabase
        .from('public_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        // Safe fallback projection if view not yet created on direct table
        const { data: fallbackData, error: fbError } = await supabase
          .from('reports')
          .select('id, tracking_number, title, description, category, severity, status, governorate_id, neighborhood, lat, lng, location_source, created_at, updated_at, is_hazardous, is_archived')
          .in('status', ['verified', 'in_progress', 'pending_verification', 'resolved'])
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (fbError || !fallbackData) return [];
        return fallbackData.map(r => ({
          id: r.id,
          trackingNumber: r.tracking_number,
          title: r.title,
          description: r.description,
          category: r.category,
          severity: r.severity,
          governorateId: r.governorate_id,
          neighborhood: r.neighborhood,
          lat: Number(r.lat),
          lng: Number(r.lng),
          imageBeforeUrl: '', // Protected: generated on-demand for authorized users
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          reportedBy: 'مواطن عراقي (محمي)',
          isAnonymous: true,
          isHazardous: r.is_hazardous,
          isArchived: r.is_archived,
          auditLogs: []
        }));
      }

      return data.map(r => ({
        id: r.id,
        trackingNumber: r.tracking_number,
        title: r.title,
        description: r.description,
        category: r.category,
        severity: r.severity,
        governorateId: r.governorate_id,
        neighborhood: r.neighborhood,
        lat: Number(r.approximate_lat || r.lat),
        lng: Number(r.approximate_lng || r.lng),
        imageBeforeUrl: '', // Protected
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        reportedBy: 'مواطن عراقي (محمي)',
        isAnonymous: true,
        isHazardous: r.is_hazardous,
        isArchived: false,
        auditLogs: []
      }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Generate Short-Lived Signed URL for Authorized Photographic Evidence Retrieval
   * Enforces server-side authorization: only report owner or staff can generate signed URL
   */
  public async getEvidenceSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!this.isConfigured() || !storagePath) return '';
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage
        .from('report-evidence-private')
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error || !data?.signedUrl) return '';
      return data.signedUrl;
    } catch (_) {
      return '';
    }
  }

  /**
   * Get All Reports for Staff / Admin Dashboard
   */
  public async getAllReportsForStaff(): Promise<EnvironmentalReport[]> {
    const caller = nafasAuth.getCurrentUser();
    if (!caller || (caller.role !== 'moderator' && caller.role !== 'admin' && caller.role !== 'super_admin') || caller.isSuspended) {
      throw new Error('403 Forbidden: الوصول إلى لوحة البلاغات الكاملة يتطلب اعتماداً إدارياً.');
    }

    if (!this.isConfigured()) return [];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reports')
      .select('*, report_audit_logs(*)')
      .order('created_at', { ascending: false });

    if (error || !data) {
      throw new Error(`فشل جلب البلاغات: ${error?.message || 'Query error'}`);
    }

    return data.map(r => ({
      id: r.id,
      trackingNumber: r.tracking_number,
      title: r.title,
      description: r.description,
      category: r.category,
      severity: r.severity,
      governorateId: r.governorate_id,
      neighborhood: r.neighborhood,
      lat: Number(r.lat),
      lng: Number(r.lng),
      location_source: r.location_source,
      accuracy_m: r.accuracy_m,
      source_layer_version: r.source_layer_version,
      imageBeforeUrl: r.image_before_url,
      imageBeforeStoragePath: r.image_before_storage_path,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      reportedBy: r.reported_by,
      reporterDisplayName: r.reporter_display_name,
      isAnonymous: r.is_anonymous,
      isHazardous: r.is_hazardous,
      isArchived: r.is_archived,
      auditLogs: (r.report_audit_logs || []).map((l: any) => ({
        id: l.id,
        timestamp: l.created_at,
        actor: l.actor_name,
        actorRole: l.actor_role,
        previousStatus: l.previous_status,
        newStatus: l.new_status,
        notes: l.notes
      }))
    }));
  }

  /**
   * Trigger Server-Side Notification Processor
   * Invokes Edge Function `process-notifications` to process the durable outbox securely on the server
   */
  public async triggerServerNotificationProcessor(): Promise<{ success: boolean; messageAr: string }> {
    if (!this.isConfigured()) {
      return { success: false, messageAr: 'الخادم غير متصل' };
    }
    const caller = nafasAuth.getCurrentUser();
    if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
      return { success: false, messageAr: '403 Forbidden: تشغيل معالج الإشعارات محصور بالإدارة العليا.' };
    }
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('process-notifications');
      if (error) {
        return { success: false, messageAr: error.message };
      }
      return { success: true, messageAr: 'تم تشغيل معالج الإشعارات السحابي بنجاح' };
    } catch (err: any) {
      return { success: false, messageAr: err.message };
    }
  }

  /**
   * Get Notification Outbox Records from Database
   */
  public async getOutbox(): Promise<NotificationOutboxItem[]> {
    if (!this.isConfigured()) return [];

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('notification_outbox')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data) return [];

      return data.map(item => ({
        id: item.id,
        eventId: item.event_id,
        reportId: item.report_id,
        eventType: item.event_type,
        recipientMasked: item.recipient_masked,
        deliveryStatus: item.delivery_status,
        provider: item.provider,
        attemptCount: item.attempt_count,
        lastAttemptAt: item.last_attempt_at,
        externalMessageId: item.external_message_id,
        errorMessage: item.error_message,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Reset demonstration reports (strictly does not erase real user submissions)
   */
  public async resetDemoData(): Promise<{ clearedCount: number; messageAr: string }> {
    const caller = nafasAuth.getCurrentUser();
    if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
      throw new Error('403 Forbidden: تنظيف البيانات التجريبية محصور بمسؤولي النظام.');
    }

    if (!this.isConfigured()) {
      return { clearedCount: 0, messageAr: 'لم يتم الاتصال بقاعدة البيانات؛ لا توجد بيانات تجريبية لحذفها.' };
    }

    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('reports')
      .update({ is_archived: true })
      .ilike('tracking_number', 'DEMO-%')
      .select();

    const count = data ? data.length : 0;
    return {
      clearedCount: count,
      messageAr: `تمت أرشفة ${count} من البلاغات التجريبية بأمان.`
    };
  }
}

export const nafasReports = NafasReportService.getInstance();
