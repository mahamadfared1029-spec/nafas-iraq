'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Smartphone,
  Eye,
  EyeOff,
  Info,
  ExternalLink,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { nafasAuth, MfaEnrollmentResult } from '@/lib/auth/authService';
import { getSupabaseUrl } from '@/lib/supabase/client';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import { NafasLogo } from '../brand/NafasLogo';

export type AuthModalMode = 
  | 'login' 
  | 'register' 
  | 'forgot' 
  | 'reset-password' 
  | 'mfa-challenge' 
  | 'mfa-enroll';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  initialMode?: AuthModalMode;
  notice?: string | null;
}

function getFormattedQrCode(raw: string): string {
  if (!raw) return '';
  let svgContent = raw;
  if (raw.startsWith('data:image/svg+xml')) {
    const idx = raw.indexOf('<svg');
    if (idx !== -1) {
      svgContent = raw.slice(idx);
    }
  }

  // Ensure viewBox exists and preserveAspectRatio is set so the QR code scales without clipping
  if (svgContent.includes('<svg') && !svgContent.includes('viewBox')) {
    svgContent = svgContent.replace(
      /<svg width="(\d+)" height="(\d+)"/i,
      '<svg width="$1" height="$2" viewBox="0 0 $1 $2" preserveAspectRatio="xMidYMid meet"'
    );
  }

  return `data:image/svg+xml;utf-8,${encodeURIComponent(svgContent)}`;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login', notice }: AuthModalProps) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [governorateId, setGovernorateId] = useState('baghdad');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Show/Hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password reset fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // MFA Challenge fields
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');

  // MFA Enrollment fields
  const [enrollFactorId, setEnrollFactorId] = useState('');
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [enrollCode, setEnrollCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [mfaEnrolledSuccess, setMfaEnrolledSuccess] = useState(false);
  const [alreadyEnrolledFactor, setAlreadyEnrolledFactor] = useState<any | null>(null);
  const [replacingFactorId, setReplacingFactorId] = useState<string | null>(null);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);

  // General States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if Google Provider is configured and operational on Supabase
  useEffect(() => {
    async function checkGoogle() {
      try {
        const baseUrl = getSupabaseUrl();
        if (!baseUrl) {
          setGoogleAvailable(false);
          return;
        }
        const url = `${baseUrl}/auth/v1/authorize?provider=google`;
        const res = await fetch(url);
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.msg?.includes('provider is not enabled')) {
            setGoogleAvailable(false);
            return;
          }
        }
        setGoogleAvailable(true);
      } catch (_) {
        setGoogleAvailable(false);
      }
    }
    checkGoogle();
  }, []);

  // Sync mode with prop changes & reset transient messages when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setLoading(false);
      setGoogleLoading(false);
      if (initialMode) {
        setMode(initialMode);
      }
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery') || hash.includes('reset-password')) {
        setMode('reset-password');
      }
    }
  }, [isOpen]);

  // Load MFA Enrollment details when entering mfa-enroll mode
  useEffect(() => {
    if (mode === 'mfa-enroll' && isOpen && !qrCodeSvg && nafasAuth.isAuthenticated()) {
      startMfaEnrollment();
    }
  }, [mode, isOpen]);

  if (!isOpen) return null;

  const startMfaEnrollment = async (replacingId?: string) => {
    setError(null);
    setLoading(true);
    try {
      if (!replacingId) {
        const factors = await nafasAuth.listMfaFactors();
        const verified = (factors.all || factors.totp || []).find((f: any) => f.status === 'verified');
        if (verified) {
          setAlreadyEnrolledFactor(verified);
          setLoading(false);
          return;
        }
      }

      const res: MfaEnrollmentResult = await nafasAuth.enrollMfaFactor();
      setEnrollFactorId(res.factorId);
      setQrCodeSvg(res.qrCodeSvg);
      setTotpSecret(res.secret);
      setTotpUri(res.uri || '');
      setReplacingFactorId(replacingId || null);
      setConfirmReplaceOpen(false);
      setAlreadyEnrolledFactor(null);
    } catch (err: any) {
      setError(err?.message || 'فشل تهيئة المصادقة الثنائية.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await nafasAuth.signIn({ email, password });
      
      if (res.mfaStatus?.requiresMfa && res.mfaStatus.factorId && res.mfaStatus.challengeId) {
        setMfaFactorId(res.mfaStatus.factorId);
        setMfaChallengeId(res.mfaStatus.challengeId);
        setMode('mfa-challenge');
        setSuccessMessage('يرجى إدخال رمز التحقق المكون من 6 أرقام من تطبيق المصادقة.');
        return;
      }

      setSuccessMessage('تم تسجيل الدخول بنجاح! أهلاً بك.');
      setTimeout(() => {
        onClose();
        onAuthSuccess?.();
      }, 450);
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل الدخول. يرجى التحقق من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await nafasAuth.signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'فشل الاتصال بخدمة Google. يرجى المحاولة لاحقاً.');
      setGoogleLoading(false);
    }
  };

  const handleMfaChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await nafasAuth.verifyMfaLogin(mfaFactorId, mfaChallengeId, mfaCode);
      setSuccessMessage('تم تأكيد المصادقة الثنائية (AAL2) وتسجيل الدخول بنجاح!');
      setTimeout(() => {
        onClose();
        onAuthSuccess?.();
      }, 450);
    } catch (err: any) {
      setError(err?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agreeTerms) {
      setError('يرجى الموافقة على ميثاق حماية البيئة وسياسة الاستخدام.');
      return;
    }
    setLoading(true);
    try {
      const res = await nafasAuth.signUp({
        email,
        password,
        fullName,
        governorateId
      });
      setSuccessMessage(res.messageAr);
      if (res.hasSession || nafasAuth.isAuthenticated()) {
        setTimeout(() => {
          onClose();
          onAuthSuccess?.();
        }, 500);
      } else {
        // Email confirmation required by Supabase: keep modal open and switch to login mode
        setMode('login');
      }
    } catch (err: any) {
      setError(err?.message || 'فشل إنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await nafasAuth.requestPasswordReset(email);
      setSuccessMessage(res.messageAr);
    } catch (err: any) {
      setError(err?.message || 'فشل إرسال رابط الاستعادة.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن لا تقل عن 8 أحرف وأرقام.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setLoading(true);
    try {
      const res = await nafasAuth.updatePassword(newPassword);
      setSuccessMessage(res.messageAr);
      setTimeout(() => {
        setMode('login');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث كلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await nafasAuth.verifyMfaEnrollment(
        enrollFactorId, 
        enrollCode, 
        replacingFactorId || undefined
      );
      setSuccessMessage(res.messageAr);
      setMfaEnrolledSuccess(true);
      setReplacingFactorId(null);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'فشل تفعيل المصادقة الثنائية.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (totpSecret) {
      navigator.clipboard.writeText(totpSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222238]/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5DCCD] overflow-hidden max-h-[92vh] flex flex-col"
        dir="rtl"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#62467D] via-[#6B463B] to-[#222238] p-5 text-white text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-2">
            <div className="bg-[#F7F1E7] p-2 rounded-2xl shadow-md">
              <NafasLogo size="sm" />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'login' && 'تسجيل الدخول إلى نَفَس'}
            {mode === 'mfa-challenge' && 'التحقق الثنائي المشدد (MFA)'}
            {mode === 'register' && 'انضم إلى حماة بيئة العراق'}
            {mode === 'forgot' && 'استعادة كلمة المرور'}
            {mode === 'reset-password' && 'تعيين كلمة مرور جديدة'}
            {mode === 'mfa-enroll' && 'إعداد المصادقة متعددة العوامل (TOTP)'}
          </h2>
          <p className="text-xs text-white/80 mt-1">
            خلّي العراق يتنفس — منصة العمل البيئي والمجتمعي
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Guest Action Prompt Notice (if provided) */}
          {notice && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed shadow-sm">
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          {(mode === 'login' || mode === 'register') && (
            <div className="flex border-b border-[#E5DCCD] mb-5">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
                  mode === 'login'
                    ? 'border-[#62467D] text-[#62467D]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                دخول
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 pb-2.5 text-sm font-semibold transition-colors border-b-2 ${
                  mode === 'register'
                    ? 'border-[#62467D] text-[#62467D]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                حساب جديد
              </button>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <div className="space-y-4">
              {/* Google OAuth Button - Displayed only when genuinely configured and operational */}
              {googleAvailable === true && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl border border-gray-300 shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#62467D]" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>المتابعة باستخدام Google</span>
                  </button>

                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#E5DCCD]"></div>
                    </div>
                    <div className="relative flex justify-center text-[11px]">
                      <span className="bg-white px-3 text-gray-500 font-medium">أو عبر البريد الإلكتروني</span>
                    </div>
                  </div>
                </>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B463B] mb-1.5">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pr-10 pl-3.5 py-2.5 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-[#6B463B]">
                      كلمة المرور
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); }}
                      className="text-xs text-[#62467D] hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-11 py-2.5 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#62467D] hover:bg-[#52386A] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>تسجيل الدخول</span>
                </button>
              </form>
            </div>
          )}

          {/* 2. MFA CHALLENGE FORM (AAL2 Step) */}
          {mode === 'mfa-challenge' && (
            <form onSubmit={handleMfaChallenge} className="space-y-4">
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-xs text-purple-900">
                <Smartphone className="w-6 h-6 text-[#62467D] shrink-0" />
                <p>
                  هذا الحساب محمي بالتحقق الثنائي المشدد (MFA). افتح تطبيق المصادقة (Google Authenticator أو 1Password) على هاتفك وأدخل الرمز المكون من 6 أرقام.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B463B] mb-1.5 text-center">
                  رمز التحقق (6 أرقام)
                </label>
                <div className="relative max-w-[200px] mx-auto">
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg py-2.5 bg-[#F7F1E7]/40 border-2 border-[#62467D]/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full py-3 bg-[#62467D] hover:bg-[#52386A] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>تأكيد الرمز وتسجيل الدخول</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  الرجوع لتسجيل الدخول العادي
                </button>
              </div>
            </form>
          )}

          {/* 3. REGISTER FORM */}
          {mode === 'register' && (
            <div className="space-y-4">
              {/* Google OAuth Quick Register Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl border border-gray-300 shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#62467D]" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>إنشاء حساب سريع باستخدام Google</span>
              </button>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5DCCD]"></div>
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="bg-white px-3 text-gray-500 font-medium">أو بالتسجيل المباشر</span>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#6B463B] mb-1">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <User className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="الاسم الثلاثي"
                      className="w-full pr-10 pl-3.5 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B463B] mb-1">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pr-10 pl-3.5 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B463B] mb-1">
                    المحافظة
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={governorateId}
                      onChange={(e) => setGovernorateId(e.target.value)}
                      className="w-full pr-10 pl-3.5 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                    >
                      {IRAQ_GOVERNORATES.map((gov) => (
                        <option key={gov.id} value={gov.id}>
                          {gov.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B463B] mb-1">
                    كلمة المرور (8 رموز على الأقل)
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-11 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded text-[#62467D] focus:ring-[#62467D]"
                  />
                  <label htmlFor="agree-terms" className="text-xs text-gray-600">
                    أوافق على ميثاق حماية بيئة العراق ومشاركة البيانات الميدانية
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#62467D] hover:bg-[#52386A] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>إنشاء حساب مواطن بيئي</span>
                </button>
              </form>
            </div>
          )}

          {/* 4. FORGOT PASSWORD (REQUEST RECOVERY) */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                أدخل بريدك الإلكتروني المسجل وسنرسل لك تعليمات استعادة كلمة المرور المشفرة عبر خادم الهوية الرسمي.
              </p>
              <div>
                <label className="block text-xs font-bold text-[#6B463B] mb-1.5">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="absolute right-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pr-10 pl-3.5 py-2.5 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#62467D] hover:bg-[#52386A] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
                <span>إرسال رابط الاستعادة</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-[#62467D] hover:underline"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </form>
          )}

          {/* 5. RESET PASSWORD FORM (NEW PASSWORD INPUT) */}
          {mode === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <p className="font-bold mb-1">جلسة استعادة آمنة وموثقة:</p>
                <p>
                  أدخل كلمة مرور جديدة وقوية لحسابك. يتم تشفير كلمة المرور وتحديثها في خادم الهوية مباشرة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B463B] mb-1">
                  كلمة المرور الجديدة (8 أحرف وأرقام على الأقل)
                </label>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-11 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                    aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B463B] mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-11 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#62467D] hover:bg-[#52386A] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>حفظ كلمة المرور الجديدة وتأمين الحساب</span>
              </button>
            </form>
          )}

          {/* 6. USER-FACING MFA ENROLLMENT (TOTP SETUP) */}
          {mode === 'mfa-enroll' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#62467D]" />
                  <span>تفعيل المصادقة متعددة العوامل (TOTP MFA):</span>
                </p>
                <p>
                  امسح رمز الاستجابة السريعة (QR) أدناه باستخدام تطبيق المصادقة على هاتفك (Google Authenticator أو 1Password)، ثم أدخل رمز التحقق لتأكيد التفعيل.
                </p>
              </div>

              {loading && !qrCodeSvg && (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-[#62467D]" />
                  <span className="text-xs">جاري تهيئة مفاتيح المصادقة الثنائية...</span>
                </div>
              )}

              {/* Verified factor already active */}
              {alreadyEnrolledFactor && !qrCodeSvg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900 mb-1">المصادقة الثنائية مفعلة ونشطة بالفعل</h4>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      حسابك محمي بتطبيق المصادقة (Google Authenticator) ومسجل ببروتوكول الأمان العالي (AAL2).
                    </p>
                  </div>

                  {confirmReplaceOpen ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2.5 text-right">
                      <p className="font-bold flex items-center gap-1.5 text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>تأكيد استبدال مفتاح المصادقة (إجراء آمن ضد الانقطاع):</span>
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        سيظل مفتاحك الحالي نشطاً لحماية حسابك ولن يتم إلغاؤه إلا بعد مسح الرمز الجديد وتأكيد رمز التحقق بنجاح.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => startMfaEnrollment(alreadyEnrolledFactor.id)}
                          disabled={loading}
                          className="flex-1 py-2 px-3 bg-[#62467D] hover:bg-[#52386A] text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          <span>متابعة وتوليد رمز QR الجديد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReplaceOpen(false)}
                          className="py-2 px-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg text-xs hover:bg-gray-50"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmReplaceOpen(true)}
                        disabled={loading}
                        className="w-full py-2.5 px-3 bg-white hover:bg-gray-50 text-[#62467D] font-bold text-xs rounded-xl border border-[#62467D]/30 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>استبدال مفتاح المصادقة بمفتاح جديد</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2 px-3 bg-[#62467D] hover:bg-[#52386A] text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        تم، إغلاق
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Error fallback with safe retry (cleans ONLY unverified factors) */}
              {error && !qrCodeSvg && !alreadyEnrolledFactor && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center space-y-2.5">
                  <p className="text-xs text-red-700 font-semibold">{error}</p>
                  <button
                    type="button"
                    onClick={() => startMfaEnrollment()}
                    disabled={loading}
                    className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>تنظيف المحاولات المعلقة وإعادة المحاولة</span>
                  </button>
                </div>
              )}

              {qrCodeSvg && (
                <div className="space-y-4">
                  {/* Responsive unclipped QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white border border-[#E5DCCD] rounded-2xl shadow-sm">
                    <img 
                      src={getFormattedQrCode(qrCodeSvg)} 
                      alt="رمز الاستجابة السريعة لمصادقة TOTP" 
                      className="w-48 h-48 sm:w-56 sm:h-56 max-w-full object-contain mx-auto block rounded-lg"
                    />
                    <p className="text-[11px] text-gray-500 mt-2 text-center">
                      امسح الرمز بكاميرا تطبيق Google Authenticator
                    </p>
                  </div>

                  {/* One-Tap Mobile App Link (for users opening on mobile) */}
                  {totpUri && (
                    <a
                      href={totpUri}
                      className="w-full py-2.5 px-3 bg-[#62467D]/10 hover:bg-[#62467D]/20 text-[#62467D] font-bold text-xs rounded-xl border border-[#62467D]/30 transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح وتثبيت في تطبيق المصادقة مباشرة على هذا الهاتف</span>
                    </a>
                  )}

                  {/* Secret Key Manual Copy */}
                  <div className="bg-[#F7F1E7]/50 p-3 rounded-xl border border-[#E5DCCD]">
                    <label className="block text-[11px] font-bold text-[#6B463B] mb-1.5">
                      أو انسخ المفتاح السري يدوياً وألصقه في تطبيق المصادقة:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={totpSecret}
                        className="flex-1 font-mono text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 select-all tracking-wider text-center font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="py-2 px-3 bg-[#62467D] hover:bg-[#52386A] text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
                        title="نسخ المفتاح السري"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedSecret ? 'تم النسخ!' : 'نسخ المفتاح'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Verification Input Form */}
                  <form onSubmit={handleVerifyEnrollment} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-[#6B463B] mb-1 text-center">
                        أدخل الرمز المكون من 6 أرقام لتأكيد التفعيل:
                      </label>
                      <div className="max-w-[200px] mx-auto">
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          maxLength={6}
                          value={enrollCode}
                          onChange={(e) => setEnrollCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="000000"
                          className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg py-2 bg-[#F7F1E7]/40 border-2 border-[#62467D]/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || enrollCode.length !== 6 || mfaEnrolledSuccess}
                      className="w-full py-2.5 bg-[#62467D] hover:bg-[#52386A] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>تأكيد وتفعيل التحقق الثنائي</span>
                    </button>
                  </form>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-gray-500 hover:underline"
                >
                  إلغاء وإغلاق
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#F7F1E7]/60 border-t border-[#E5DCCD] text-center flex items-center justify-center px-6 shrink-0">
          <span className="text-[11px] text-gray-500">
            حماية وهوية مشفرة ببروتوكول الأمان العالي — نَفَس العراق
          </span>
        </div>
      </div>
    </div>
  );
}
