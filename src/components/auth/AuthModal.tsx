'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Loader2,
  QrCode,
  Copy,
  Check,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { nafasAuth, MfaEnrollmentResult } from '@/lib/auth/authService';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import { NafasLogo } from '../brand/NafasLogo';

export type AuthModalMode = 
  | 'login' 
  | 'register' 
  | 'forgot' 
  | 'reset-password' 
  | 'mfa-challenge' 
  | 'mfa-enroll' 
  | 'bootstrap';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [governorateId, setGovernorateId] = useState('baghdad');
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

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
  const [enrollCode, setEnrollCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [mfaEnrolledSuccess, setMfaEnrolledSuccess] = useState(false);

  // General States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode with prop changes & detect recovery hashes in URL
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

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

  const startMfaEnrollment = async () => {
    setError(null);
    setLoading(true);
    try {
      const res: MfaEnrollmentResult = await nafasAuth.enrollMfaFactor();
      setEnrollFactorId(res.factorId);
      setQrCodeSvg(res.qrCodeSvg);
      setTotpSecret(res.secret);
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
      
      // Check if privileged user or account requires MFA verification (AAL2)
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
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل الدخول. يرجى التحقق من البيانات.');
    } finally {
      setLoading(false);
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
      }, 700);
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
      setTimeout(() => {
        onClose();
      }, 900);
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
      const res = await nafasAuth.verifyMfaEnrollment(enrollFactorId, enrollCode);
      setSuccessMessage(res.messageAr);
      setMfaEnrolledSuccess(true);
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

  const handleFounderBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await nafasAuth.bootstrapFounder(bootstrapToken);
      setSuccessMessage(res.messageAr);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'فشل اعتماد حساب المؤسس.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222238]/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5DCCD] overflow-hidden max-h-[90vh] flex flex-col"
        dir="rtl"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#62467D] via-[#6B463B] to-[#222238] p-5 text-white text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="إغلاق"
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
            {mode === 'bootstrap' && 'تهيئة حساب المؤسس — المشرف العام'}
          </h2>
          <p className="text-xs text-white/80 mt-1">
            خلّي العراق يتنفس — منصة العمل البيئي والمجتمعي
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
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

          {/* Mode Switcher Tabs for normal states */}
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
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6B463B] mb-1.5">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="absolute right-3.5 top-3 w-4 h-4 text-gray-400" />
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
                  <Lock className="absolute right-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3.5 py-2.5 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
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
          )}

          {/* 2. MFA CHALLENGE FORM (AAL2 Step) */}
          {mode === 'mfa-challenge' && (
            <form onSubmit={handleMfaChallenge} className="space-y-4">
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-xs text-purple-900">
                <Smartphone className="w-6 h-6 text-[#62467D] shrink-0" />
                <p>
                  هذا الحساب محمي بالتحقق الثنائي (MFA). يرجى فتح تطبيق المصادقة (Google Authenticator أو 1Password) وإدخال الرمز المكون من 6 أرقام.
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
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#6B463B] mb-1">
                  الاسم الكامل
                </label>
                <div className="relative">
                  <User className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400" />
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
                  <Mail className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400" />
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
                  <MapPin className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400" />
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
                  <Lock className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3.5 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
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
                  <Mail className="absolute right-3.5 top-3 w-4 h-4 text-gray-400" />
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
                  <Lock className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3.5 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B463B] mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <Lock className="absolute right-3.5 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3.5 py-2 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
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
                  <span>تفعيل المصادقة متعددة العوامل (TOTP Multi-Factor Authentication):</span>
                </p>
                <p>
                  امسح رمز الاستجابة السريعة (QR) أدناه باستخدام تطبيق المصادقة على هاتفك (Google Authenticator, Apple Passwords, أو 1Password)، ثم أدخل رمز التحقق.
                </p>
              </div>

              {loading && !qrCodeSvg && (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-[#62467D]" />
                  <span className="text-xs">جاري تهيئة مفاتيح المصادقة الثنائية...</span>
                </div>
              )}

              {qrCodeSvg && (
                <div className="space-y-4">
                  {/* QR Code Container */}
                  <div className="flex justify-center p-3 bg-white border border-[#E5DCCD] rounded-2xl shadow-sm">
                    <div 
                      className="w-48 h-48 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                  </div>

                  {/* Secret Key Manual Copy */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      المفتاح السري (في حال تعذر مسح الرمز):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={totpSecret}
                        className="flex-1 font-mono text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                      />
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        title="نسخ المفتاح"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
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

          {/* 7. FOUNDER BOOTSTRAP PROVISIONING */}
          {mode === 'bootstrap' && (
            <form onSubmit={handleFounderBootstrap} className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">إجراء إداري لتهيئة حساب المشرف العام (Super Admin):</p>
                <p>
                  يتم التحقق من هوية صاحب المنصة وربطه تلقائياً بصلاحيات الإشراف الشامل والمصادقة متعددة العوامل (MFA) وتوثيق الحدث في سجل الرقابة المشفر.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B463B] mb-1.5">
                  رمز التحقق الإداري
                </label>
                <div className="relative">
                  <KeyRound className="absolute right-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={bootstrapToken}
                    onChange={(e) => setBootstrapToken(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pr-10 pl-3.5 py-2.5 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#6B463B] hover:bg-[#55362E] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>تأكيد اعتماد صلاحية المشرف العام</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-gray-500 hover:underline"
                >
                  العودة للوضع العادي
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#F7F1E7]/60 border-t border-[#E5DCCD] text-center flex items-center justify-between px-6 shrink-0">
          <span className="text-[11px] text-gray-500">
            حماية وهوية مشفرة ببروتوكول الأمان العالي
          </span>
          {mode !== 'bootstrap' && mode !== 'mfa-enroll' && (
            <button
              type="button"
              onClick={() => { setMode('bootstrap'); setError(null); }}
              className="text-[11px] text-[#6B463B] font-bold hover:underline"
            >
              تهيئة المؤسس
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
