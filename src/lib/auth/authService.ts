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
import { getBasePath } from '@/lib/basePath';
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

export interface MfaEnrollmentResult {
  factorId: string;
  qrCodeSvg: string;
  secret: string;
  uri: string;
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
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        // Construct safe initial citizen profile if row is awaiting trigger or for Google OAuth
        const now = new Date().toISOString();
        const initialProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'مواطن نَفَس',
          role: 'citizen' as Role,
          governorate_id: user.user_metadata?.governorate_id || 'baghdad',
          points: 0,
          is_verified_volunteer: false,
          mfa_enabled: false,
          is_suspended: false,
          created_at: now,
          updated_at: now
        };

        try {
          await supabase.from('profiles').upsert(initialProfile, { onConflict: 'id' });
          const { data: refetched } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (refetched) {
            profile = refetched;
          }
        } catch (_) {}
      }

      const activeProfile = profile || {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'مواطن نَفَس',
        role: 'citizen' as Role,
        governorate_id: user.user_metadata?.governorate_id || 'baghdad',
        points: 0,
        is_verified_volunteer: false,
        mfa_enabled: false,
        is_suspended: false,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      };

      const userProfile: UserProfile = {
        id: activeProfile.id,
        email: activeProfile.email,
        fullName: activeProfile.full_name,
        role: activeProfile.role as Role,
        governorateId: activeProfile.governorate_id,
        points: activeProfile.points || 0,
        isVerifiedVolunteer: Boolean(activeProfile.is_verified_volunteer),
        mfaEnabled: Boolean(activeProfile.mfa_enabled),
        isSuspended: Boolean(activeProfile.is_suspended),
        createdAt: activeProfile.created_at,
        updatedAt: activeProfile.updated_at
      };

      this.currentSession = {
        token: session.access_token,
        user: userProfile,
        expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600 * 1000
      };

      this.notifyListeners();
    } catch (_) {
      if (session?.user) {
        const user = session.user;
        this.currentSession = {
          token: session.access_token,
          user: {
            id: user.id,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || user.user_metadata?.name || 'مواطن نَفَس',
            role: 'citizen',
            governorateId: user.user_metadata?.governorate_id || 'baghdad',
            points: 0,
            isVerifiedVolunteer: false,
            mfaEnabled: false,
            isSuspended: false,
            createdAt: user.created_at,
            updatedAt: user.updated_at || user.created_at
          },
          expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600 * 1000
        };
      } else {
        this.currentSession = null;
      }
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
  public async signUp(params: SignUpParams): Promise<{ success: boolean; hasSession: boolean; user?: UserProfile; messageAr: string }> {
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
      if (authError.message?.toLowerCase().includes('only request this after') || authError.status === 429) {
        throw new Error('تم إرسال طلب قبل قليل. يرجى الانتظار 20 ثانية قبل المحاولة مرة أخرى، أو تفقد بريدك الإلكتروني لتأكيد الحساب.');
      }
      if (authError.message?.toLowerCase().includes('already registered')) {
        throw new Error('هذا البريد الإلكتروني مسجل مسبقاً. يمكنك تسجيل الدخول مباشرة أو استعادة كلمة المرور.');
      }
      throw new Error(`فشل إنشاء الحساب: ${authError.message}`);
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
      hasSession: Boolean(authData.session),
      user: userProfile,
      messageAr: authData.session 
        ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح!' 
        : 'تم إنشاء الحساب بنجاح! يرجى فتح بريدك الإلكتروني والضغط على رابط التأكيد لتفعيل الحساب، ثم تسجيل الدخول.'
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
      if (authError.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('حسابك بانتظار التفعيل: يرجى فتح بريدك الإلكتروني والضغط على رابط التأكيد ثم تسجيل الدخول.');
      }
      if (authError.message?.toLowerCase().includes('invalid login credentials')) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      }
      throw new Error(`تعذر تسجيل الدخول: ${authError.message}`);
    }

    if (!authData.user || !authData.session) {
      throw new Error('فشل تسجيل الدخول: جلسة المصادقة مفقودة.');
    }

    // Retrieve authoritative profile from database (with auto-bootstrap if awaiting trigger)
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      const now = new Date().toISOString();
      const initialProfile = {
        id: authData.user.id,
        email: authData.user.email || email,
        full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'مواطن نَفَس',
        role: 'citizen' as Role,
        governorate_id: authData.user.user_metadata?.governorate_id || 'baghdad',
        points: 0,
        is_verified_volunteer: false,
        mfa_enabled: false,
        is_suspended: false,
        created_at: now,
        updated_at: now
      };
      try {
        await supabase.from('profiles').upsert(initialProfile, { onConflict: 'id' });
        const { data: refetched } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        profile = refetched || initialProfile;
      } catch (_) {
        profile = initialProfile;
      }
    }

    if (profile.is_suspended) {
      await supabase.auth.signOut();
      throw new Error('تم تجميد هذا الحساب لمخالفة ضوابط النزاهة البيئية. يرجى التواصل مع إدارة المنصة.');
    }

    // Check MFA requirements
    let mfaStatus: MfaVerificationResult = { requiresMfa: false };
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if ((aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') || profile.mfa_enabled) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = 
          factors?.totp?.find(f => f.status === 'verified') || 
          factors?.all?.find(f => f.status === 'verified');

        if (verifiedFactor) {
          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId: verifiedFactor.id
          });

          if (!challengeError && challenge) {
            mfaStatus = {
              requiresMfa: true,
              factorId: verifiedFactor.id,
              challengeId: challenge.id
            };
          }
        }
      }
    } catch (_) {}

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
   * Verify TOTP code during Sign In challenge
   */
  public async verifyMfaLogin(factorId: string, challengeId: string, code: string): Promise<{ success: boolean; user: UserProfile }> {
    const cleanCode = code ? code.trim() : '';
    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('يرجى إدخال رمز التحقق المكون من 6 أرقام من تطبيق المصادقة.');
    }

    if (!this.isConfigured()) {
      throw new Error('التحقق من الرمز يتطلب اتصالاً نشطاً بـ Supabase.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: cleanCode
    });

    if (error || !data) {
      throw new Error(`رمز المصادقة غير صحيح أو انتهت صلاحيته: ${error?.message || 'فشل التحقق من الرمز'}`);
    }

    // Refresh session to update assurance level to AAL2
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      await this.syncSessionFromSupabase(sessionData.session);
    }

    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('تعذر تحميل بيانات المستخدم بعد التحقق من الرمز.');
    }

    return {
      success: true,
      user
    };
  }

  /**
   * Update Password (for Password Reset flow or User Profile update)
   */
  public async updatePassword(newPassword: string): Promise<{ success: boolean; messageAr: string }> {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('كلمة المرور يجب أن لا تقل عن 8 أحرف وأرقام.');
    }

    if (!this.isConfigured()) {
      throw new Error('تحديث كلمة المرور يتطلب اتصالاً نشطاً بـ Supabase Auth.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      throw new Error(`فشل تعيين كلمة المرور: ${error.message}`);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      await this.syncSessionFromSupabase(sessionData.session);
    }

    return {
      success: true,
      messageAr: 'تم تعيين كلمة المرور الجديدة وتأمين الحساب بنجاح!'
    };
  }

  /**
   * Enroll a new TOTP factor for user-facing MFA setup.
   * SAFETY PROTOCOL:
   * - Automatically cleans ONLY unverified factors from previous incomplete sessions.
   * - NEVER removes or deletes active verified factors on enrollment retries or errors.
   */
  public async enrollMfaFactor(): Promise<MfaEnrollmentResult> {
    if (!this.isAuthenticated()) {
      throw new Error('يجب تسجيل الدخول أولاً لإعداد المصادقة متعددة العوامل.');
    }

    if (!this.isConfigured()) {
      throw new Error('إعداد المصادقة متعددة العوامل يتطلب ربط Supabase Auth.');
    }

    const supabase = getSupabaseClient();

    // 1. Proactively auto-clean ONLY unverified factors from previous incomplete attempts.
    // STRICT RULE: Never delete or unenroll verified factors.
    try {
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      const allFactors = existingFactors?.all || existingFactors?.totp || [];
      for (const factor of allFactors) {
        if (factor.status === 'unverified') {
          try {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 2. Generate a guaranteed-unique friendly name
    const uniqueFriendlyName = `NAFAS-TOTP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    let enrollRes = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'NAFAS',
      friendlyName: uniqueFriendlyName
    });

    // 3. If an error occurs on duplicate unverified factors, clean ONLY unverified factors and retry
    // SAFETY RULE: Never delete verified factors as a generic recovery mechanism
    if (enrollRes.error) {
      const errMsg = enrollRes.error.message || '';
      if (errMsg.includes('already exists') || errMsg.includes('friendly name')) {
        try {
          const { data: list } = await supabase.auth.mfa.listFactors();
          const all = list?.all || list?.totp || [];
          for (const factor of all) {
            if (factor.status === 'unverified') {
              try {
                await supabase.auth.mfa.unenroll({ factorId: factor.id });
              } catch (_) {}
            }
          }
          enrollRes = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            issuer: 'NAFAS',
            friendlyName: `NAFAS-TOTP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
          });
        } catch (_) {}
      }
    }

    const { data, error } = enrollRes;

    if (error || !data || !data.totp) {
      if (error?.message?.includes('already exists') || error?.message?.includes('friendly name') || error?.message?.includes('maximum')) {
        throw new Error('يوجد عامل مصادقة ثنائية مفعل ونشط بالفعل على هذا الحساب. لاستبدال المفتاح النشط، يرجى تأكيد الاستبدال صراحة عبر إجراء الاستبدال الآمن.');
      }
      throw new Error(`فشل تهيئة المصادقة الثنائية: ${error?.message || 'خطأ غير معروف'}`);
    }

    return {
      factorId: data.id,
      qrCodeSvg: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri
    };
  }

  /**
   * Verify and activate TOTP factor enrollment with a 6-digit code.
   * If replacing an existing active verified factor, safely retires the old factor
   * ONLY AFTER the new factor is successfully verified and active.
   */
  public async verifyMfaEnrollment(
    factorId: string, 
    code: string,
    replaceOldFactorId?: string
  ): Promise<{ success: boolean; messageAr: string }> {
    const cleanCode = code ? code.trim() : '';
    if (!factorId || cleanCode.length !== 6) {
      throw new Error('يرجى إدخال رمز التحقق المكون من 6 أرقام من تطبيق المصادقة.');
    }

    if (!this.isConfigured()) {
      throw new Error('التحقق من الرمز يتطلب اتصالاً نشطاً بـ Supabase.');
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: cleanCode
    });

    if (error) {
      throw new Error(`رمز المصادقة غير صحيح أو منتهي الصلاحية: ${error.message}`);
    }

    // Secure replacement procedure: retire previous factor ONLY after new factor is verified
    if (replaceOldFactorId && replaceOldFactorId !== factorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: replaceOldFactorId });
      } catch (unenrollErr: any) {
        console.warn('Failed to retire replaced factor:', unenrollErr?.message);
      }
    }

    const currentUser = this.getCurrentUser();
    if (currentUser) {
      await supabase
        .from('profiles')
        .update({ mfa_enabled: true, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);

      if (this.currentSession) {
        this.currentSession.user.mfaEnabled = true;
        this.notifyListeners();
      }
    }

    return {
      success: true,
      messageAr: 'تم تفعيل المصادقة متعددة العوامل (TOTP MFA) بنجاح وحسابك محمي الآن بمستوى AAL2!'
    };
  }

  /**
   * List all registered MFA factors for current user
   */
  public async listMfaFactors(): Promise<{ all: any[]; totp: any[] }> {
    if (!this.isConfigured() || !this.isAuthenticated()) {
      return { all: [], totp: [] };
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return { all: [], totp: [] };
    return {
      all: data.all || [],
      totp: data.totp || []
    };
  }

  /**
   * Check whether user has at least one active, verified MFA factor enrolled in Supabase
   */
  public async hasVerifiedMfaFactor(): Promise<boolean> {
    if (!this.isConfigured() || !this.isAuthenticated()) return false;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data) return false;
      const verified = (data.all || data.totp || []).some((f: any) => f.status === 'verified');
      return verified;
    } catch (_) {
      return false;
    }
  }

  /**
   * Get current session's actual Authenticator Assurance Level ('aal1' | 'aal2')
   */
  public async getSessionAssuranceLevel(): Promise<'aal1' | 'aal2'> {
    if (!this.isConfigured() || !this.isAuthenticated()) return 'aal1';
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) return 'aal1';
      return data.currentLevel === 'aal2' ? 'aal2' : 'aal1';
    } catch (_) {
      return 'aal1';
    }
  }

  /**
   * Get complete MFA status, clearly distinguishing enrolled verified factors
   * from the current session's actual AAL2 status
   */
  public async getMfaSecuritySummary(): Promise<{
    hasVerifiedFactor: boolean;
    sessionAssuranceLevel: 'aal1' | 'aal2';
    verifiedFactorCount: number;
    unverifiedFactorCount: number;
  }> {
    if (!this.isConfigured() || !this.isAuthenticated()) {
      return {
        hasVerifiedFactor: false,
        sessionAssuranceLevel: 'aal1',
        verifiedFactorCount: 0,
        unverifiedFactorCount: 0
      };
    }

    try {
      const supabase = getSupabaseClient();
      const [factorsRes, aalRes] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      ]);

      const all = factorsRes.data?.all || factorsRes.data?.totp || [];
      const verified = all.filter((f: any) => f.status === 'verified');
      const unverified = all.filter((f: any) => f.status === 'unverified');
      const level = aalRes.data?.currentLevel === 'aal2' ? 'aal2' : 'aal1';

      return {
        hasVerifiedFactor: verified.length > 0,
        sessionAssuranceLevel: level,
        verifiedFactorCount: verified.length,
        unverifiedFactorCount: unverified.length
      };
    } catch (_) {
      return {
        hasVerifiedFactor: false,
        sessionAssuranceLevel: 'aal1',
        verifiedFactorCount: 0,
        unverifiedFactorCount: 0
      };
    }
  }

  /**
   * Unenroll an existing MFA factor.
   * SAFETY PROTOCOL:
   * - Retiring an active verified factor requires explicit user confirmation
   *   and an active AAL2 session to prevent accidental administrative lockout.
   * - Unverified (stale) factors may be unenrolled freely during cleanup.
   */
  public async unenrollMfaFactor(
    factorId: string,
    confirmExplicit = false
  ): Promise<{ success: boolean; messageAr: string }> {
    if (!this.isConfigured() || !this.isAuthenticated()) {
      throw new Error('يجب تسجيل الدخول لإلغاء عامل المصادقة.');
    }

    if (!factorId) {
      throw new Error('معرف عامل المصادقة مطلوب لإتمام الإلغاء.');
    }

    const supabase = getSupabaseClient();

    // Check if the target factor is currently verified
    const { data: factorList } = await supabase.auth.mfa.listFactors();
    const targetFactor = (factorList?.all || factorList?.totp || []).find((f: any) => f.id === factorId);

    if (targetFactor && targetFactor.status === 'verified') {
      if (!confirmExplicit) {
        throw new Error('إلغاء مفتاح المصادقة النشط يتطلب تأكيداً صريحاً لحماية الحساب من التعطيل غير المقصود.');
      }

      // Check session assurance before allowing removal of an active verified factor
      const hasAal2 = await this.verifyAal2Assurance();
      if (!hasAal2) {
        throw new Error('403 Forbidden: إلغاء مفتاح المصادقة النشط يتطلب جلسة مؤكدة بالتحقق الثنائي النشط (AAL2).');
      }
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      throw new Error(`فشل إلغاء عامل المصادقة: ${error.message}`);
    }

    const { data: remaining } = await supabase.auth.mfa.listFactors();
    const hasRemainingVerified = (remaining?.all || remaining?.totp || []).some((f: any) => f.status === 'verified');

    const currentUser = this.getCurrentUser();
    if (currentUser && !hasRemainingVerified) {
      await supabase
        .from('profiles')
        .update({ mfa_enabled: false, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);

      if (this.currentSession) {
        this.currentSession.user.mfaEnabled = false;
        this.notifyListeners();
      }
    }

    return {
      success: true,
      messageAr: 'تم إلغاء عامل المصادقة بنجاح.'
    };
  }

  /**
   * Google OAuth Sign In
   * Uses Supabase Auth with Google Identity Provider and account selector prompt
   */
  public async signInWithGoogle(): Promise<{ url?: string }> {
    if (!this.isConfigured()) {
      throw new Error('بوابة المصادقة السحابية (Supabase Auth) غير متصلة حالياً.');
    }

    const supabase = getSupabaseClient();
    const base = getBasePath();
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${base ? `${base}/` : '/'}`
      : 'https://mahamadfared1029-spec.github.io/nafas-iraq/';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline'
        },
        redirectTo: redirectUrl
      }
    });

    if (error) {
      throw new Error(`فشل تسجيل الدخول عبر Google: ${error.message}`);
    }

    if (!data?.url) {
      throw new Error('لم يتم استلام رابط تسجيل الدخول من خادم Google.');
    }

    // Pre-flight probe to catch "provider is not enabled" before sending user to a raw JSON error page
    try {
      const probe = await fetch(data.url);
      if (!probe.ok) {
        const probeJson = await probe.json().catch(() => null);
        if (probeJson?.msg?.includes('provider is not enabled') || probeJson?.error_code === 'validation_failed') {
          throw new Error('تسجيل الدخول عبر Google يتطلب تفعيل مزوّد Google في لوحة تحكم Supabase > Auth > Providers. يمكنك استخدام تسجيل الدخول بالبريد وكلمة المرور حالياً.');
        }
      }
    } catch (probeErr: any) {
      if (probeErr?.message?.includes('Google يتطلب تفعيل')) {
        throw probeErr;
      }
    }

    if (typeof window !== 'undefined') {
      window.location.href = data.url;
    }

    return { url: data.url };
  }

  /**
   * Set or update Founder Administrative PIN
   * Requires authenticated super_admin session with verified AAL2
   */
  public async setFounderPin(pin: string): Promise<{ success: boolean; messageAr: string }> {
    const cleanPin = pin ? pin.trim() : '';
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8 || !/^[0-9]+$/.test(cleanPin)) {
      throw new Error('الرمز السري الإداري يجب أن يتكون من 4 إلى 8 أرقام فقط.');
    }

    const hasAal2 = await this.verifyAal2Assurance();
    if (!hasAal2) {
      throw new Error('403 Forbidden: هذا الإجراء الإداري يتطلب التحقق الثنائي النشط (AAL2 Required).');
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      throw new Error('غير مصرح لك بضبط الرمز الإداري. هذه الميزة مخصصة للمشرف العام فقط.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('set_founder_pin', { p_pin: cleanPin });

    if (error) {
      throw new Error(`فشل ضبط الرمز الإداري: ${error.message}`);
    }

    return {
      success: true,
      messageAr: data?.message || 'تم حفظ الرمز السري الإداري بنجاح وتأمينه بالتشفير المتقدم.'
    };
  }

  /**
   * Verify Founder Administrative PIN
   * Invokes rate-limited server-side cryptographic verification
   */
  public async verifyFounderPin(pin: string): Promise<{ success: boolean; messageAr: string }> {
    const cleanPin = pin ? pin.trim() : '';
    if (!cleanPin) {
      throw new Error('يرجى إدخال الرمز السري.');
    }

    const hasAal2 = await this.verifyAal2Assurance();
    if (!hasAal2) {
      throw new Error('403 Forbidden: هذا الإجراء الإداري يتطلب التحقق الثنائي النشط (AAL2 Required).');
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      throw new Error('غير مصرح. التحقق من الرمز الإداري مخصص للمشرف العام فقط.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('verify_founder_pin', { p_pin: cleanPin });

    if (error) {
      throw new Error(`فشل التحقق من الرمز: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'الرمز السري غير صحيح.');
    }

    return {
      success: true,
      messageAr: data?.message || 'تم التحقق من الرمز السري بنجاح.'
    };
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
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/#reset-password`
      : 'https://mahamadfared1029-spec.github.io/nafas-iraq/#reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl
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

    // 1. Invoke protected server Edge Function (executes with service_role securely on server)
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('provision-founder', {
      body: { bootstrapToken: secretToken.trim() }
    });

    if (edgeError || edgeData?.error) {
      throw new Error(`فشل اعتماد صلاحية المشرف العام من الخادم: ${edgeError?.message || edgeData?.error || 'Edge Function Failed'}`);
    }

    // 2. Refresh user profile from database
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
   * Verify whether the current user session has Authenticator Assurance Level 2 (AAL2)
   */
  public async verifyAal2Assurance(): Promise<boolean> {
    if (!this.isConfigured()) return true;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) return false;
      return data.currentLevel === 'aal2';
    } catch (_) {
      return false;
    }
  }

  /**
   * Role Management (Server Enforced by Row Level Security)
   */
  public async updateUserRole(targetUserId: string, newRole: Role): Promise<{ success: boolean; messageAr: string }> {
    const caller = this.getCurrentUser();
    if (!caller || caller.role !== 'super_admin' || caller.isSuspended) {
      throw new Error('403 Forbidden: تعديل صلاحيات الكادر محصور حصراً بالمشرف العام (Super Admin Required).');
    }

    const hasAal2 = await this.verifyAal2Assurance();
    if (!hasAal2) {
      throw new Error('403 Forbidden: هذا الإجراء الإداري يتطلب التحقق الثنائي النشط (AAL2 Required).');
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

    const hasAal2 = await this.verifyAal2Assurance();
    if (!hasAal2) {
      throw new Error('403 Forbidden: هذا الإجراء الإداري يتطلب التحقق الثنائي النشط (AAL2 Required).');
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

    const hasAal2 = await this.verifyAal2Assurance();
    if (!hasAal2) {
      throw new Error('403 Forbidden: هذا الإجراء الإداري يتطلب التحقق الثنائي النشط (AAL2 Required).');
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
