'use client';

import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { nafasAuth } from '@/lib/auth/authService';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import { NafasLogo } from '../brand/NafasLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'bootstrap';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'bootstrap'>(initialMode);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [governorateId, setGovernorateId] = useState('baghdad');
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await nafasAuth.signIn({ email, password });
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
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5DCCD] overflow-hidden"
        dir="rtl"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#62467D] via-[#6B463B] to-[#222238] p-6 text-white text-center relative">
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
            {mode === 'register' && 'انضم إلى حماة بيئة العراق'}
            {mode === 'forgot' && 'استعادة كلمة المرور'}
            {mode === 'bootstrap' && 'تهيئة حساب المؤسس — المشرف العام'}
          </h2>
          <p className="text-xs text-white/80 mt-1">
            خلّي العراق يتنفس — منصة العمل البيئي والمجتمعي
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
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
          {mode !== 'bootstrap' && (
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

          {/* LOGIN FORM */}
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

          {/* REGISTER FORM */}
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

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                أدخل بريدك الإلكتروني المسجل وسنرسل لك تعليمات استعادة كلمة المرور المشفرة.
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

          {/* FOUNDER BOOTSTRAP PROVISIONING */}
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
                  رمز التحقق الإداري (اختياري)
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
        <div className="p-4 bg-[#F7F1E7]/60 border-t border-[#E5DCCD] text-center flex items-center justify-between px-6">
          <span className="text-[11px] text-gray-500">
            حماية وهوية مشفرة ببروتوكول الأمان العالي
          </span>
          {mode !== 'bootstrap' && (
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
