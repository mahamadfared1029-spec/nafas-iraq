/**
 * NAFAS Iraq — Campaign & Volunteer Service (Phase 2A)
 * Connects securely to Supabase for:
 * 1. Campaign Discovery, Filtering & Lifecycle (Draft, Upcoming, In Progress, Completed, Cancelled)
 * 2. Race-Condition-Proof Campaign Registration & Cancellation
 * 3. Server-Validated Dynamic Field Check-in Codes & Attendance Verification
 * 4. Real Verified Volunteer Records & Digital Certificates
 * 5. Aggregated Environmental Impact Metrics from Live Database Rows
 */

import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { nafasAuth } from '../auth/authService';
import { VolunteerCampaign, UserRegistration, IssuedCertificate, CampaignType, CampaignStatus } from '@/types';
import { INITIAL_CAMPAIGNS, IRAQ_GOVERNORATES } from '../constants';

export interface CampaignFilterOptions {
  governorateId?: string;
  campaignType?: CampaignType | 'all';
  status?: CampaignStatus | 'all';
}

export interface RegisterResult {
  success: boolean;
  message: string;
  registrationId?: string;
}

export interface AttendanceVerifyResult {
  success: boolean;
  message: string;
  certificateCode?: string;
  hoursAwarded?: number;
}

export interface EnvironmentalImpactSummary {
  completedCampaigns: number;
  activeCampaigns: number;
  verifiedVolunteers: number;
  verifiedVolunteerHours: number;
  treesPlanted: number;
  wasteCollectedKg: number;
  verifiedReports: number;
  resolvedCleanups: number;
}

class CampaignService {
  /**
   * Fetch all visible campaigns with optional filters
   */
  public async getCampaigns(options?: CampaignFilterOptions): Promise<VolunteerCampaign[]> {
    if (!isSupabaseConfigured()) {
      return this.filterStaticCampaigns(INITIAL_CAMPAIGNS, options);
    }

    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('campaigns')
        .select('*')
        .order('campaign_date', { ascending: true });

      if (options?.governorateId && options.governorateId !== 'all') {
        query = query.eq('governorate_id', options.governorateId);
      }

      if (options?.campaignType && options.campaignType !== 'all') {
        query = query.eq('campaign_type', options.campaignType);
      }

      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      } else {
        // Exclude draft unless owned by current user
        query = query.neq('status', 'draft');
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return this.filterStaticCampaigns(INITIAL_CAMPAIGNS, options);
      }

      return data.map(this.mapDbToCampaign);
    } catch (err) {
      console.warn('Fallback to static campaigns:', err);
      return this.filterStaticCampaigns(INITIAL_CAMPAIGNS, options);
    }
  }

  /**
   * Create a new campaign (Organizers & Admins only)
   */
  public async createCampaign(payload: {
    titleAr: string;
    titleKu?: string;
    titleEn?: string;
    descriptionAr: string;
    campaignType: CampaignType;
    governorateId: string;
    meetingArea: string;
    meetingLat?: number;
    meetingLng?: number;
    date: string;
    startTime: string;
    durationHours: number;
    volunteerCapacity: number;
    targetTrees?: number;
    wasteCollectedKg?: number;
    safetyEquipment?: string[];
    isDraft?: boolean;
  }): Promise<{ success: boolean; campaignId?: string; message: string }> {
    if (!nafasAuth.isAuthenticated()) {
      throw new Error('يجب تسجيل الدخول لإنشاء حملة تطوعية.');
    }

    const user = nafasAuth.getCurrentUser();
    if (!user) {
      throw new Error('بيانات المستخدم غير متوفرة.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('خدمة إنشاء الحملات تتطلب الاتصال بقاعدة بيانات نَفَس (Supabase). تعذر حفظ الحملة.');
    }

    const supabase = getSupabaseClient();
    const id = `CMP-${payload.governorateId.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        id,
        title_ar: payload.titleAr,
        title_ku: payload.titleKu || null,
        title_en: payload.titleEn || null,
        description_ar: payload.descriptionAr,
        campaign_type: payload.campaignType,
        governorate_id: payload.governorateId,
        meeting_area: payload.meetingArea,
        meeting_lat: payload.meetingLat || null,
        meeting_lng: payload.meetingLng || null,
        campaign_date: payload.date,
        start_time: payload.startTime,
        duration_hours: payload.durationHours,
        volunteer_capacity: payload.volunteerCapacity,
        target_trees: payload.targetTrees || 0,
        waste_collected_kg: payload.wasteCollectedKg || 0,
        organizer_id: user.id,
        organizer_name: user.fullName || 'منسق نَفَس',
        status: payload.isDraft ? 'draft' : 'upcoming'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`فشل إنشاء الحملة: ${error.message}`);
    }

    return {
      success: true,
      campaignId: data.id,
      message: payload.isDraft 
        ? 'تم حفظ مسودة الحملة بنجاح.' 
        : 'تم نشر الحملة البيئية وإتاحتها لتسجيل المتطوعين!'
    };
  }

  /**
   * Register for a campaign (with race-condition protection via RPC)
   */
  public async registerForCampaign(campaignId: string): Promise<RegisterResult> {
    if (!nafasAuth.isAuthenticated()) {
      throw new Error('يجب تسجيل الدخول للتسجيل في الحملات التطوعية.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('التسجيل في الحملات البيئية يتطلب اتصالاً مباشراً بقاعدة البيانات لضمان عدم تجاوز السعة الاستيعابية.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('rpc_register_for_campaign', {
      p_campaign_id: campaignId
    });

    if (error) {
      throw new Error(error.message || 'تعذر إتمام التسجيل في الحملة.');
    }

    return {
      success: data?.success ?? true,
      message: data?.message || 'تم تسجيلك بنجاح في الحملة التطوعية!',
      registrationId: data?.registration_id
    };
  }

  /**
   * Cancel a campaign registration
   */
  public async cancelRegistration(campaignId: string): Promise<{ success: boolean; message: string }> {
    if (!nafasAuth.isAuthenticated()) {
      throw new Error('يجب تسجيل الدخول لإلغاء التسجيل.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('إلغاء التسجيل يتطلب اتصالاً مباشراً بقاعدة بيانات نَفَس.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('rpc_cancel_campaign_registration', {
      p_campaign_id: campaignId
    });

    if (error) {
      throw new Error(error.message || 'فشل إلغاء التسجيل.');
    }

    return {
      success: true,
      message: data?.message || 'تم إلغاء التسجيل بنجاح.'
    };
  }

  /**
   * Fetch user's registered campaign IDs and participation history
   */
  public async getUserRegistrations(): Promise<UserRegistration[]> {
    if (!nafasAuth.isAuthenticated() || !isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = getSupabaseClient();
      const user = nafasAuth.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('campaign_registrations')
        .select(`
          id,
          campaign_id,
          registered_at,
          attended,
          attended_at,
          status,
          verified_hours,
          campaigns (
            title_ar,
            governorate_id,
            campaign_date
          )
        `)
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false });

      if (error || !data) return [];

      return data.map((item: any) => ({
        id: item.id,
        campaignId: item.campaign_id,
        campaignTitle: item.campaigns?.title_ar || 'حملة نَفَس البيئية',
        governorateId: item.campaigns?.governorate_id || 'baghdad',
        date: item.campaigns?.campaign_date,
        userName: user.fullName || 'متطوع نَفَس',
        userPhone: user.phoneMasked || '',
        registeredAt: item.registered_at,
        attended: item.attended || item.status === 'attended',
        attendedAt: item.attended_at,
        status: item.status || (item.attended ? 'attended' : 'registered'),
        verifiedHours: Number(item.verified_hours || 0),
        certificateIssued: item.attended || item.status === 'attended'
      }));
    } catch {
      return [];
    }
  }

  /**
   * Generate an expiring 6-digit field check-in code (Organizer/Staff only)
   */
  public async generateCheckInCode(
    campaignId: string, 
    validityMinutes: number = 180
  ): Promise<{ code: string; expiresAt: string }> {
    if (!nafasAuth.isAuthenticated()) {
      throw new Error('يجب تسجيل الدخول لتوليد رمز التحقق.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('توليد رمز الحضور الميداني المشفر يتطلب اتصالاً بقاعدة البيانات.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('rpc_generate_campaign_checkin_code', {
      p_campaign_id: campaignId,
      p_valid_minutes: validityMinutes
    });

    if (error || !data) {
      throw new Error(error?.message || 'فشل توليد رمز التحقق الميداني.');
    }

    return {
      code: data.check_in_code,
      expiresAt: data.expires_at
    };
  }

  /**
   * Verify Attendance using Check-in Code or by Organizer
   */
  /**
   * Volunteer field check-in (Records presence, status becomes 'checked_in').
   * Volunteers cannot self-award hours or self-issue certificates.
   */
  public async volunteerCheckIn(
    campaignId: string,
    checkInCode: string
  ): Promise<{ success: boolean; message: string; status: 'checked_in' }> {
    if (!nafasAuth.isAuthenticated()) {
      throw new Error('يجب تسجيل الدخول لتثبيت الحضور الميداني.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('تثبيت الحضور الميداني يتطلب الاتصال بقاعدة بيانات نَفَس (Supabase).');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('rpc_volunteer_checkin', {
      p_campaign_id: campaignId,
      p_checkin_code: checkInCode.trim().toUpperCase()
    });

    if (error) {
      throw new Error(error.message || 'فشل تثبيت الحضور الميداني.');
    }

    if (data && data.success === false) {
      throw new Error(data.message || 'فشل تثبيت الحضور الميداني.');
    }

    return {
      success: true,
      status: 'checked_in',
      message: data?.message || 'تم تثبيت حضورك الميداني بنجاح! بانتظار الاعتماد النهائي لساعات التطوع من منسق الحملة.'
    };
  }

  /**
   * Organizer/Staff approve volunteer attendance and award certified hours.
   * Generates official certificate with SHA-256 digest.
   */
  public async organizerApproveAttendance(params: {
    campaignId: string;
    volunteerId: string;
    hours?: number;
  }): Promise<AttendanceVerifyResult> {
    if (!nafasAuth.isAuthenticated()) {
      throw new Error('يجب تسجيل الدخول لاعتماد الحضور.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('اعتماد الحضور وإصدار الشهادات يتطلب الاتصال بقاعدة بيانات نَفَس (Supabase).');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('rpc_organizer_approve_attendance', {
      p_campaign_id: params.campaignId,
      p_volunteer_id: params.volunteerId,
      p_hours: params.hours || null
    });

    if (error) {
      throw new Error(error.message || 'فشل اعتماد الحضور وإصدار الشهادة.');
    }

    return {
      success: true,
      message: data?.message || 'تم اعتماد حضور المتطوع وإصدار وثيقة الأثر بنجاح!',
      certificateCode: data?.certificate_code,
      hoursAwarded: data?.hours_awarded
    };
  }

  /**
   * General attendance verification handler (backward-compatible).
   * If volunteerId is provided, delegates to organizer approval.
   * Otherwise delegates to volunteerCheckIn (ignoring any self-selected hours).
   */
  public async verifyAttendance(params: {
    campaignId: string;
    volunteerId?: string;
    checkInCode: string;
    hours?: number;
  }): Promise<AttendanceVerifyResult> {
    if (params.volunteerId) {
      return this.organizerApproveAttendance({
        campaignId: params.campaignId,
        volunteerId: params.volunteerId,
        hours: params.hours
      });
    }

    const res = await this.volunteerCheckIn(params.campaignId, params.checkInCode);
    return {
      success: res.success,
      message: res.message
    };
  }

  /**
   * Fetch verified environmental impact metrics from real database rows.
   * Honest metrics: returns 0 for unconfigured/offline states, never fabricated numbers.
   */
  public async getEnvironmentalImpact(): Promise<EnvironmentalImpactSummary> {
    const emptyImpact: EnvironmentalImpactSummary = {
      completedCampaigns: 0,
      activeCampaigns: 0,
      verifiedVolunteers: 0,
      verifiedVolunteerHours: 0,
      treesPlanted: 0,
      wasteCollectedKg: 0,
      verifiedReports: 0,
      resolvedCleanups: 0
    };

    if (!isSupabaseConfigured()) {
      return emptyImpact;
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('rpc_get_environmental_impact_summary');

      if (error || !data) {
        return emptyImpact;
      }

      return {
        completedCampaigns: Number(data.completed_campaigns || 0),
        activeCampaigns: Number(data.active_campaigns || 0),
        verifiedVolunteers: Number(data.verified_volunteers || 0),
        verifiedVolunteerHours: Number(data.verified_volunteer_hours || 0),
        treesPlanted: Number(data.trees_planted || 0),
        wasteCollectedKg: Number(data.waste_collected_kg || 0),
        verifiedReports: Number(data.verified_reports || 0),
        resolvedCleanups: Number(data.resolved_cleanups || 0)
      };
    } catch {
      return emptyImpact;
    }
  }

  /**
   * Fetch Certificates for current user
   */
  public async getUserCertificates(): Promise<IssuedCertificate[]> {
    if (!nafasAuth.isAuthenticated() || !isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = getSupabaseClient();
      const user = nafasAuth.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_revoked', false)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((c: any) => ({
        id: c.id,
        verificationCode: c.verification_code,
        participantName: c.participant_name,
        campaignTitle: c.campaign_title,
        governorate: c.governorate,
        hoursAwarded: Number(c.hours_awarded),
        issueDate: c.issue_date,
        organizerSignature: c.organizer_signature,
        digitalSealHash: c.digital_seal_hash,
        revoked: c.is_revoked,
        revokedReason: c.revoked_reason
      }));
    } catch {
      return [];
    }
  }

  // --- Private Helpers ---

  private mapDbToCampaign(row: any): VolunteerCampaign {
    return {
      id: row.id,
      titleAr: row.title_ar,
      titleKu: row.title_ku || '',
      titleEn: row.title_en || '',
      descriptionAr: row.description_ar,
      descriptionKu: row.description_ku || '',
      descriptionEn: row.description_en || '',
      campaignType: (row.campaign_type as CampaignType) || 'reforestation',
      governorateId: row.governorate_id,
      meetingArea: row.meeting_area,
      meetingCoordinates: row.meeting_lat && row.meeting_lng 
        ? { lat: Number(row.meeting_lat), lng: Number(row.meeting_lng) } 
        : undefined,
      date: row.campaign_date,
      startTime: row.start_time,
      durationHours: Number(row.duration_hours),
      targetTrees: Number(row.target_trees || 0),
      treesPlanted: Number(row.trees_planted || 0),
      wasteCollectedKg: Number(row.waste_collected_kg || 0),
      volunteerCapacity: Number(row.volunteer_capacity),
      registeredCount: Number(row.registered_count || 0),
      confirmedCount: Number(row.registered_count || 0),
      organizer: row.organizer_name,
      organizerId: row.organizer_id,
      organizerRole: 'منسق بيئي معتمد',
      safetyEquipment: ['مستلزمات سلامة ميدانية', 'قفازات وقاية', 'مياه شرب معبأة'],
      status: (row.status as CampaignStatus) || 'upcoming',
      certificateEligible: true
    };
  }

  private filterStaticCampaigns(
    campaigns: VolunteerCampaign[], 
    options?: CampaignFilterOptions
  ): VolunteerCampaign[] {
    return campaigns.filter(c => {
      if (options?.governorateId && options.governorateId !== 'all' && c.governorateId !== options.governorateId) {
        return false;
      }
      if (options?.campaignType && options.campaignType !== 'all' && c.campaignType !== options.campaignType) {
        return false;
      }
      if (options?.status && options.status !== 'all' && c.status !== options.status) {
        return false;
      }
      return true;
    });
  }
}

export const nafasCampaigns = new CampaignService();
