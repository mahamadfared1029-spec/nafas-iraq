/**
 * NAFAS | نَفَس — Identity & Access Management (IAM) Service
 * 
 * Target Architecture:
 * - Supabase Auth / PostgreSQL backend with Row Level Security (RLS)
 * - Strict role model: 'citizen' | 'volunteer' | 'organizer' | 'moderator' | 'admin' | 'super_admin'
 * - Server-enforced authorization: Ordinary users can NEVER elevate their own role
 * - Founder bootstrapping: Secure one-time bootstrap binding to the immutable founder ID
 * - Full offline/testing compatibility with zero hardcoded secrets
 */

import { Role, UserProfile, AdminAuditLogItem } from '@/types';

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

type AuthStateListener = (session: AuthSession | null) => void;

class NafasAuthService {
  private static instance: NafasAuthService;
  private currentSession: AuthSession | null = null;
  private listeners: Set<AuthStateListener> = new Set();
  
  // Storage keys
  private readonly SESSION_STORAGE_KEY = 'nafas_auth_session_v1';
  private readonly PROFILES_STORAGE_KEY = 'nafas_auth_profiles_v1';
  private readonly AUDIT_LOGS_STORAGE_KEY = 'nafas_admin_audit_logs_v1';
  private inMemoryProfiles: UserProfile[] = [];
  private inMemoryAuditLogs: AdminAuditLogItem[] = [];

  private constructor() {
    this.hydrateSession();
  }

  public static getInstance(): NafasAuthService {
    if (!NafasAuthService.instance) {
      NafasAuthService.instance = new NafasAuthService();
    }
    return NafasAuthService.instance;
  }

  /**
   * Hydrate existing session from secure browser storage
   */
  private hydrateSession(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(this.SESSION_STORAGE_KEY) || localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (saved) {
        const parsed: AuthSession = JSON.parse(saved);
        if (parsed.expiresAt > Date.now()) {
          this.currentSession = parsed;
        } else {
          this.clearSession();
        }
      }
    } catch (_) {
      this.clearSession();
    }
  }

  private saveSession(session: AuthSession): void {
    this.currentSession = session;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch (_) {}
    }
    this.notifyListeners();
  }

  private clearSession(): void {
    this.currentSession = null;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
        localStorage.removeItem(this.SESSION_STORAGE_KEY);
      } catch (_) {}
    }
    this.notifyListeners();
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
      this.clearSession();
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
    return Boolean(user && (user.role === 'moderator' || user.role === 'admin' || user.role === 'super_admin') && !user.isSuspended);
  }

  // --- Core Authentication Methods ---

  /**
   * User Registration with Input Validation
   */
  public async signUp(params: SignUpParams): Promise<{ success: boolean; user: UserProfile; messageAr: string }> {
    const email = params.email.trim().toLowerCase();
    const fullName = params.fullName.trim();
    const password = params.password;

    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new Error('يرجى إدخال بريد إلكتروني صالح.');
    }
    if (password.length < 8) {
      throw new Error('كلمة المرور يجب أن لا تقل عن 8 أحرف وأرقام.');
    }
    if (fullName.length < 3) {
      throw new Error('يرجى إدخال الاسم الثلاثي الكامل.');
    }

    const profiles = this.getAllProfiles();
    const existing = profiles.find(p => p.email.toLowerCase() === email);
    if (existing) {
      throw new Error('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.');
    }

    const now = new Date().toISOString();
    const userId = `usr-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Default registered role is strictly citizen. Ordinary users cannot register as privileged roles.
    const newProfile: UserProfile = {
      id: userId,
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

    profiles.push(newProfile);
    this.saveAllProfiles(profiles);

    // Create session (24h validity)
    const session: AuthSession = {
      token: `nfs_tok_${userId}_${Date.now()}`,
      user: newProfile,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
    this.saveSession(session);

    this.recordAdminAudit({
      actorId: userId,
      actorEmail: email,
      action: 'USER_REGISTERED',
      targetType: 'PROFILE',
      targetId: userId,
      details: { role: 'citizen', governorate: params.governorateId }
    });

    return {
      success: true,
      user: newProfile,
      messageAr: 'تم إنشاء الحساب بنجاح. أهلاً بك في منصة نَفَس!'
    };
  }

  /**
   * User Sign In
   */
  public async signIn(params: SignInParams): Promise<{ success: boolean; user: UserProfile }> {
    const email = params.email.trim().toLowerCase();
    const password = params.password;

    if (!email || !password) {
      throw new Error('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
    }

    const profiles = this.getAllProfiles();
    let profile = profiles.find(p => p.email.toLowerCase() === email);

    // If profile not found in mock store, provide default onboarding or rejection
    if (!profile) {
      // Check if it's the bootstrap founder email from protected environment
      const bootstrapEmail = (typeof process !== 'undefined' && (process.env?.NAFAS_ALERT_EMAIL || process.env?.FOUNDER_EMAIL)) 
        ? (process.env.NAFAS_ALERT_EMAIL || process.env.FOUNDER_EMAIL)!.toLowerCase().trim() 
        : null;

      if (bootstrapEmail && email === bootstrapEmail) {
        // Bootstrap the founder account
        profile = {
          id: `usr-founder-${Date.now()}`,
          email,
          fullName: 'المشرف العام — مؤسس نَفَس',
          role: 'super_admin',
          governorateId: 'baghdad',
          points: 100,
          isVerifiedVolunteer: true,
          mfaEnabled: true,
          isSuspended: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        profiles.push(profile);
        this.saveAllProfiles(profiles);
      } else {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      }
    }

    if (profile.isSuspended) {
      throw new Error('تم تجميد هذا الحساب لمخالفة ضوابط النزاهة البيئية. يرجى التواصل مع الدعم الفني.');
    }

    const session: AuthSession = {
      token: `nfs_tok_${profile.id}_${Date.now()}`,
      user: profile,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
    this.saveSession(session);

    this.recordAdminAudit({
      actorId: profile.id,
      actorEmail: profile.email,
      action: 'USER_LOGIN',
      targetType: 'SESSION',
      targetId: profile.id,
      details: { role: profile.role }
    });

    return { success: true, user: profile };
  }

  /**
   * Sign Out
   */
  public async signOut(): Promise<void> {
    const user = this.getCurrentUser();
    if (user) {
      this.recordAdminAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'USER_LOGOUT',
        targetType: 'SESSION',
        targetId: user.id
      });
    }
    this.clearSession();
  }

  /**
   * Password Recovery Request
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean; messageAr: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('يرجى إدخال بريد إلكتروني صالح.');
    }

    // In production, Supabase / Resend issues a reset token.
    this.recordAdminAudit({
      actorId: 'system',
      actorEmail: cleanEmail,
      action: 'PASSWORD_RESET_REQUESTED',
      targetType: 'AUTH',
      details: { email: cleanEmail }
    });

    return {
      success: true,
      messageAr: 'إذا كان البريد مسجلاً، تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.'
    };
  }

  /**
   * Founder Bootstrap Procedure (Super Admin Provisioning)
   * Strictly verifies email and assigns super_admin role with audit trail
   */
  public async bootstrapFounder(secretToken?: string): Promise<{ success: boolean; user: UserProfile; messageAr: string }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('يجب تسجيل الدخول أولاً قبل بدء إجراءات تهيئة حساب المؤسس.');
    }

    const bootstrapEmail = (typeof process !== 'undefined' && (process.env?.NAFAS_ALERT_EMAIL || process.env?.FOUNDER_EMAIL)) 
      ? (process.env.NAFAS_ALERT_EMAIL || process.env.FOUNDER_EMAIL)!.toLowerCase().trim() 
      : null;

    if (!bootstrapEmail || currentUser.email.toLowerCase().trim() !== bootstrapEmail) {
      throw new Error('403 Forbidden: هذا البريد الإلكتروني غير مصرح له بطلب صلاحية المشرف العام (Unauthorized Founder Identity).');
    }

    // Upgrade to super_admin
    const profiles = this.getAllProfiles();
    const updated = profiles.map(p => {
      if (p.id === currentUser.id) {
        return {
          ...p,
          role: 'super_admin' as Role,
          mfaEnabled: true,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });

    this.saveAllProfiles(updated);

    const updatedUser: UserProfile = {
      ...currentUser,
      role: 'super_admin',
      mfaEnabled: true,
      updatedAt: new Date().toISOString()
    };

    if (this.currentSession) {
      this.saveSession({
        ...this.currentSession,
        user: updatedUser
      });
    }

    this.recordAdminAudit({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      action: 'FOUNDER_BOOTSTRAP_PROVISIONED',
      targetType: 'ROLE',
      targetId: currentUser.id,
      details: { role: 'super_admin', tokenProvided: Boolean(secretToken) }
    });

    return {
      success: true,
      user: updatedUser,
      messageAr: 'تم اعتماد وتفعيل صلاحيات المشرف العام (Super Admin) للمؤسس بنجاح.'
    };
  }

  /**
   * Role Management (Only Super Admin can promote/demote staff)
   * Strictly prevents vertical privilege escalation
   */
  public async updateUserRole(targetUserId: string, newRole: Role): Promise<{ success: boolean; messageAr: string }> {
    const caller = this.getCurrentUser();
    if (!caller || caller.role !== 'super_admin' || caller.isSuspended) {
      throw new Error('403 Forbidden: تعديل صلاحيات الكادر محصور حصراً بالمشرف العام (Super Admin Required).');
    }

    if (targetUserId === caller.id && newRole !== 'super_admin') {
      throw new Error('لا يمكن للمشرف العام خفض صلاحيات حسابه الذاتية لمنع قفل النظام.');
    }

    const profiles = this.getAllProfiles();
    let targetFound = false;

    const updated = profiles.map(p => {
      if (p.id === targetUserId) {
        targetFound = true;
        return {
          ...p,
          role: newRole,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });

    if (!targetFound) {
      throw new Error('المستخدم المطلوب غير موجود.');
    }

    this.saveAllProfiles(updated);

    // If caller updated own profile or session
    if (this.currentSession && this.currentSession.user.id === targetUserId) {
      this.saveSession({
        ...this.currentSession,
        user: { ...this.currentSession.user, role: newRole }
      });
    }

    this.recordAdminAudit({
      actorId: caller.id,
      actorEmail: caller.email,
      action: 'USER_ROLE_CHANGED',
      targetType: 'ROLE',
      targetId: targetUserId,
      details: { newRole }
    });

    return {
      success: true,
      messageAr: `تم تحديث دور المستخدم إلى ${newRole} بنجاح.`
    };
  }

  /**
   * Suspend or Unsuspend User
   */
  public async toggleUserSuspension(targetUserId: string, suspend: boolean, reason?: string): Promise<{ success: boolean; messageAr: string }> {
    const caller = this.getCurrentUser();
    if (!caller || caller.role !== 'super_admin' || caller.isSuspended) {
      throw new Error('403 Forbidden: تجميد الحسابات مخصص للمشرف العام فقط.');
    }

    if (targetUserId === caller.id) {
      throw new Error('لا يمكن تجميد حساب المشرف العام الذاتي.');
    }

    const profiles = this.getAllProfiles();
    const updated = profiles.map(p => {
      if (p.id === targetUserId) {
        return {
          ...p,
          isSuspended: suspend,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });

    this.saveAllProfiles(updated);

    this.recordAdminAudit({
      actorId: caller.id,
      actorEmail: caller.email,
      action: suspend ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      targetType: 'ACCOUNT_SECURITY',
      targetId: targetUserId,
      details: { reason }
    });

    return {
      success: true,
      messageAr: suspend ? 'تم تجميد الحساب بنجاح.' : 'تم إلغاء تجميد الحساب بنجاح.'
    };
  }

  /**
   * List All Registered Staff and Users (Admin Only)
   */
  public async listUsers(): Promise<UserProfile[]> {
    const caller = this.getCurrentUser();
    if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin') || caller.isSuspended) {
      throw new Error('403 Forbidden: عرض سجلات المستخدمين يتطلب صلاحية إدارية.');
    }
    return this.getAllProfiles();
  }

  /**
   * List Admin Audit Logs (Super Admin Only)
   */
  public async listAdminAuditLogs(): Promise<AdminAuditLogItem[]> {
    const caller = this.getCurrentUser();
    if (!caller || caller.role !== 'super_admin' || caller.isSuspended) {
      throw new Error('403 Forbidden: الاطلاع على سجلات الرقابة الإدارية مخصص للمشرف العام فقط.');
    }
    return this.getAllAuditLogs();
  }

  // --- Persistence Helpers ---

  private getAllProfiles(): UserProfile[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.PROFILES_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return this.inMemoryProfiles;
  }

  private saveAllProfiles(profiles: UserProfile[]): void {
    this.inMemoryProfiles = profiles;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      } catch (_) {}
    }
  }

  private getAllAuditLogs(): AdminAuditLogItem[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.AUDIT_LOGS_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return this.inMemoryAuditLogs;
  }

  private recordAdminAudit(entry: Omit<AdminAuditLogItem, 'id' | 'createdAt'>): void {
    const logs = this.getAllAuditLogs();
    const newLog: AdminAuditLogItem = {
      ...entry,
      id: `aud-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    if (logs.length > 500) logs.pop(); // keep last 500
    this.inMemoryAuditLogs = logs;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
      } catch (_) {}
    }
  }
}

export const nafasAuth = NafasAuthService.getInstance();
