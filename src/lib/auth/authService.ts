/**
 * NAFAS | نَفَس — Identity & Access Management (IAM) Service
 * 
 * Genuine Production Identity Provider Integration:
 * - Powered by Supabase Auth (PostgreSQL backend + Row Level Security)
 * - Cryptographic password verification (bcrypt/argon2 on server)
 * - True session validation via identity provider JWTs
 * - Server-enforced role authorization & Zero client-side role grants
 * - MFA assurance validation for privileged administrative roles
 * - Truthful configuration states: Never simulates identity with localStorage
 */

import { Role, UserProfile, AdminAuditLogItem } from '@/types';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: number;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  governorateId: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface MfaVerificationResult {
  requiresMfa: boolean;
  factorId?: string;
  challengeId?: string;
}

type AuthStateListener = (session: AuthSession | null) => void;

class NafasAuthService {
  private static instance: NafasAuthService;
  private currentSession: AuthSession | null = null;
  private listeners: Set<AuthStateListener> = new Set();
  private authSubscription: { unsubscribe: () => void } | null = null;

  private constructor() {
    this.initializeAuthProvider();
  }

  public static getInstance(): NafasAuthService {
    if (!NafasAuthService.instance) {
      NafasAuthService.instance = new NafasAuthService();
    }
    return NafasAuthService.instance;
  }

  /**
   * Check if genuine Supabase Auth infrastructure is connected
   */
  public isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Initialize Supabase Auth listener when configured
   */
  private async initializeAuthProvider(): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      const supabase = getSupabaseClient();
      
      // Get current active session from identity provider
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await this.syncSessionFromSupabase(session);
      }

      // Listen to server auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          await this.syncSessionFromSupabase(session);
        } else {
          this.currentSession = null;
          this.notifyListeners();
        }
      });

      this.authSubscription = subscription;
    } catch (_) {
      this.currentSession = null;
    }
  }

  /**
   * Sync profile and session from genuine Supabase Identity and Profiles table
   */
  private async syncSessionFromSupabase(session: Session): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const user = session.user;

      // Query authoritative profile from public.profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        // Construct safe initial citizen profile if row is awaiting trigger
        const userProfile: UserProfile = {
          id: user.id,
          email: user.email || '',
          fullName: user.user_metadata?.full_name || 'مواطن عراقي',
          role: 'citizen',
          governorateId: user.user_metadata?.governorate_id || 'baghdad',
          points: 0,
          isVerifiedVolunteer: false,
          mfaEnabled: false,
          isSuspended: false,
          createdAt: user.created_at,
          updatedAt: user.updated_at || user.created_at
        };

        this.currentSession = {
          token: session.access_token,
          user: userProfile,
          expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600 * 1000
        };
      } else {
        const userProfile: UserProfile = {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role as Role,
          governorateId: profile.governorate_id,
          points: profile.points,
          isVerifiedVolunteer: profile.is_verified_volunteer,
          mfaEnabled: profile.mfa_enabled,
          isSuspended: profile.is_suspended,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        };

        this.currentSession = {
          token: session.access_token,
          user: userProfile,
          expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600 * 1000
        };
      }

      this.notifyListeners();
    } catch (_) {
      this.currentSession = null;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    const session = this.currentSession;
    this.listeners.forEach(fn => {
      try {
        fn(session);
      } catch (_) {}
    });
  }

  public onAuthStateChange(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentSession);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentSession(): AuthSession | null {
    if (this.currentSession && this.currentSession.expiresAt < Date.now()) {
      this.currentSession = null;
      return null;
    }
    return this.currentSession;
  }

  public getCurrentUser(): UserProfile | null {
    const session = this.getCurrentSession();
    return session ? session.user : null;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.getCurrentSession());
  }

  public isFounderOrSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return Boolean(user && user.role === 'super_admin' && !user.isSuspended);
  }

  public isStaff(): boolean {
    const user = this.getCurrentUser();
    return Boolean(
      user && 
      (user.role === 'moderator' || user.role === 'admin' || user.role === 'super_admin') && 
      !user.isSuspended
    );
  }

  // --- Real Supabase Auth Methods ---

  /**
   * User Registration with Genuine Identity Provider
   */
  public async signUp(params: SignUpParams): Promise<{ success: boolean; user?: UserProfile; messageAr: string }> {
    const email = params.email.trim().toLowerCase();
    const fullName = params.fullName.trim();
    const password = params.password;

    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new Error('يرجى إدخال بريد إلكتروني صالح وموثق.');
    }
    if (password.length < 8) {
      throw new Error('كلمة المرور يجب أن لا تقل عن 8 أحرف وأرقام.');
    }
    if (fullName.length < 3) {
      throw new Error('يرجى إدخال الاسم الثلاثي الكامل.');
    }

    if (!this.isConfigured()) {
      throw new Error(
        'بوابة المصادقة السحابية (Supabase Auth) غير متصلة حالياً. يرجى ضبط المتغيرات البيئية NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY لتسجيل الحسابات الحقيقية.'
      );
    }

    const supabase = getSupabaseClient();

    // 1. Sign up user through Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          governorate_id: params.governorateId || 'baghdad'
        }
      }
    });

    if (authError) {
      throw new Error(`فشل إنشاء الحساب عبر خادم المصادقة: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('فشل تسجيل الحساب: لم يتم استلام كائن المستخدم من الخادم.');
    }

    // 2. Insert initial profile row into public.profiles adhering to RLS
    const now = new Date().toISOString();
    const initialProfile = {
      id: authData.user.id,
      email,
      full_name: fullName,
      role: 'citizen' as Role, // STRICT: always citizen
      governorate_id: params.governorateId || 'baghdad',
      points: 0,
      is_verified_volunteer: false,
      mfa_enabled: false,
      is_suspended: false,
      created_at: now,
      updated_at: now
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(initialProfile, { onConflict: 'id' });

    if (profileError) {
      console.warn('[NAFAS Auth] Note: Profile row creation handled by trigger or awaiting confirmation:', profileError.message);
    }

    const userProfile: UserProfile = {
      id: authData.user.id,
      email,
      fullName,
      role: 'citizen',
      governorateId: params.governorateId || 'baghdad',
      points: 0,
      isVerifiedVolunteer: false,
      mfaEnabled: false,
      isSuspended: false,
      createdAt: now,
      updatedAt: now
    };

    if (authData.session) {
      this.currentSession = {
        token: authData.session.access_token,
        user: userProfile,
        expiresAt: authData.session.expires_at ? authData.session.expires_at * 1000 : Date.now() + 3600 * 1000
      };
      this.notifyListeners();
    }

    return {
      success: true,
      user: userProfile,
      messageAr: authData.session 
        ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح!' 
        : 'تم إنشاء الحساب بنجاح. يرجى مراجعة بريدك الإلكتروني لتأكيد التسجيل قبل تسجيل الدخول.'
    };
  }

  /**
   * User Sign In with Cryptographic Server Verification
   */
  public async signIn(params: SignInParams): Promise<{ success: boolean; user: UserProfile; mfaStatus?: MfaVerificationResult }> {
    const email = params.email.trim().toLowerCase();
    const password = params.password;

    if (!email || !password) {
      throw new Error('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
    }

    if (!this.isConfigured()) {
      throw new Error(
        'بوابة المصادقة السحابية (Supabase Auth) غير متصلة حالياً. يرجى ضبط المتغيرات البيئية NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }

    const supabase = getSupabaseClient();

    // Authenticate through Supabase Identity Provider (Validates password hash)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      throw new Error(`بيانات تسجيل الدخول غير صحيحة: ${authError.message}`);
    }

    if (!authData.user || !authData.session) {
      throw new Error('فشل تسجيل الدخول: جلسة المصادقة مفقودة.');
    }

    // Retrieve authoritative profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('تعذر تحميل الملف الشخصي للمستخدم من قاعدة البيانات الرسمية.');
    }

    if (profile.is_suspended) {
      await supabase.auth.signOut();
      throw new Error('تم تجميد هذا الحساب لمخالفة ضوابط النزاهة البيئية. يرجى التواصل مع إدارة المنصة.');
    }

    // Check MFA requirements for privileged accounts
    let mfaStatus: MfaVerificationResult = { requiresMfa: false };
    if (profile.role === 'super_admin' || profile.role === 'admin') {
      try {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
          mfaStatus = { requiresMfa: true };
        }
      } catch (_) {}
    }

    const userProfile: UserProfile = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role as Role,
      governorateId: profile.governorate_id,
      points: profile.points,
      isVerifiedVolunteer: profile.is_verified_volunteer,
      mfaEnabled: Boolean(profile.mfa_enabled),
      isSuspended: Boolean(profile.is_suspended),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };

    this.currentSession = {
      token: authData.session.access_token,
      user: userProfile,
      expiresAt: authData.session.expires_at ? authData.session.expires_at * 1000 : Date.now() + 3600 * 1000
    };
    this.notifyListeners();

    return { success: true, user: userProfile, mfaStatus };
  }

  /**
   * Sign Out
   */
  public async signOut(): Promise<void> {
    if (this.isConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      } catch (_) {}
    }
    this.currentSession = null;
    this.notifyListeners();
  }

  /**
   * Password Recovery Request
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean; messageAr: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('يرجى إدخال بريد إلكتروني صالح.');
    }

    if (!this.isConfigured()) {
      throw new Error('خدمة استعادة كلمة المرور تتطلب ربط Supabase Auth.');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined
    });

    if (error) {
      throw new Error(`فشل إرسال رابط الاستعادة: ${error.message}`);
    }

    return {
      success: true,
      messageAr: 'إذا كان البريد مسجلاً، تم إرسال رابط استعادة كلمة المرور المشفر إلى بريدك الإلكتروني.'
    };
  }

  /**
   * Founder Bootstrap Procedure
   * Strictly invokes server RPC `provision_founder_account` with mandatory token validation
   */
  public async bootstrapFounder(secretToken?: string): Promise<{ success: boolean; user: UserProfile; messageAr: string }> {
    if (!this.isConfigured()) {
      throw new Error('إجراء تهيئة المؤسس يتطلب ربط قاعدة بيانات Supabase الرسمية.');
    }

    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('يجب تسجيل الدخول بالبريد الإلكتروني المؤكد أولاً.');
    }

    if (!secretToken || secretToken.trim().length < 16) {
      throw new Error('رمز التهيئة الإداري إلزامي ومكون من 16 محرفاً على الأقل لحماية حساب المشرف العام.');
    }

    const supabase = getSupabaseClient();

    // Call server-side protected RPC function
    const { data, error } = await supabase.rpc('provision_founder_account', {
      p_user_id: session.user.id,
      p_expected_email: session.user.email,
      p_bootstrap_token: secretToken.trim()
    });

    if (error) {
      throw new Error(`فشل اعتماد صلاحية المشرف العام من الخادم: ${error.message}`);
    }

    // Refresh user profile from database
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!updatedProfile || updatedProfile.role !== 'super_admin') {
      throw new Error('لم يتم تأكيد ترقية الدور إلى المشرف العام في السجل السيادي.');
    }

    const userProfile: UserProfile = {
      id: updatedProfile.id,
      email: updatedProfile.email,
      fullName: updatedProfile.full_name,
      role: 'super_admin',
      governorateId: updatedProfile.governorate_id,
      points: updatedProfile.points,
      isVerifiedVolunteer: updatedProfile.is_verified_volunteer,
      mfaEnabled: true,
      isSuspended: false,
      createdAt: updatedProfile.created_at,
      updatedAt: updatedProfile.updated_at
    };

    this.currentSession = {
      ...session,
      user: userProfile
    };
    this.notifyListeners();

    return {
      success: true,
      user: userProfile,
      messageAr: 'تم توثيق واعتماد رتبة المشرف العام (Super Admin) في قاعدة البيانات المركزية بنجاح.'
    };
  }

  /**
   * Role Management (Server Enforced by Row Level Security)
   */
  public async updateUserRole(targetUserId: string, newRole: Role): Promise<{ success: boolean; messageAr: string }> {
    const caller = this.getCurrentUser();
    if (!caller || caller.role !== 'super_admin' || caller.isSuspended) {
      throw new Error('403 Forbidden: تعديل صلاحيات الكادر محصور حصراً بالمشرف العام (Super Admin Required).');
    }

    if (!this.isConfigured()) {
      throw new Error('تعديل الصلاحيات يتطلب اتصالاً نشطاً بقاعدة البيانات المركزية.');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (error) {
      throw new Error(`فشل تحديث الدور من الخادم: ${error.message}`);
    }

    return {
      success: true,
      messageAr: `تم تحديث دور المستخدم إلى [${newRole}] رسمياً في قاعدة البيانات.`
    };
  }

  /**
   * Suspend or Unsuspend User (Server Enforced)
   */
  public async toggleUserSuspension(targetUserId: string, suspend: boolean, reason?: string): Promise<{ success: boolean; messageAr: string }> {
    const caller = this.getCurrentUser();
    if (!caller || caller.role !== 'super_admin' || caller.isSuspended) {
      throw new Error('403 Forbidden: تجميد الحسابات مخصص للمشرف العام فقط.');
    }

    if (!this.isConfigured()) {
      throw new Error('تجميد الحسابات يتطلب اتصالاً نشطاً بقاعدة البيانات.');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: suspend, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (error) {
      throw new Error(`فشل تحديث حالة الحساب: ${error.message}`);
    }

    return {
      success: true,
      messageAr: suspend ? 'تم تجميد الحساب رسمياً.' : 'تم إلغاء تجميد الحساب رسمياً.'
    };
  }

  /**
   * List All Registered Staff and Users (Admin Only)
   */
  public async listUsers(): Promise<UserProfile[]> {
    const caller = this.getCurrentUser();
    if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin') || caller.isSuspended) {
      throw new Error('403 Forbidden: عرض سجلات المستخدمين يتطلب صلاحية إدارية معتمدة.');
    }

    if (!this.isConfigured()) {
      throw new Error('جلب قائمة المستخدمين يتطلب اتصالاً نشطاً بقاعدة البيانات.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`فشل جلب المستخدمين: ${error.message}`);
    }

    return (data || []).map(p => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      role: p.role as Role,
      governorateId: p.governorate_id,
      points: p.points,
      isVerifiedVolunteer: p.is_verified_volunteer,
      mfaEnabled: p.mfa_enabled,
      isSuspended: p.is_suspended,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
  }

  /**
   * List Admin Audit Logs (Super Admin Only)
   */
  public async listAdminAuditLogs(): Promise<AdminAuditLogItem[]> {
    const caller = this.getCurrentUser();
    if (!caller || caller.role !== 'super_admin' || caller.isSuspended) {
      throw new Error('403 Forbidden: الاطلاع على سجلات الرقابة الإدارية مخصص للمشرف العام فقط.');
    }

    if (!this.isConfigured()) {
      throw new Error('جلب سجلات الرقابة يتطلب اتصالاً بقاعدة البيانات.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`فشل جلب سجل الرقابة: ${error.message}`);
    }

    return (data || []).map(l => ({
      id: l.id,
      actorId: l.actor_id,
      actorEmail: l.actor_email,
      action: l.action,
      targetType: l.target_type,
      targetId: l.target_id,
      details: l.details,
      ipHash: l.ip_hash,
      createdAt: l.created_at
    }));
  }
}

export const nafasAuth = NafasAuthService.getInstance();
