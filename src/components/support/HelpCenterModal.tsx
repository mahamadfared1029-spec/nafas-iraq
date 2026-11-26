'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { nafasAuth } from '@/lib/auth/authService';
import { OrchidMotif } from '@/components/brand/OrchidMotif';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getSupportEndpoint = () => {
  // Keep personal support email out of visible UI while routing FormSubmit messages directly
  const target = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || ['bvbuhh9', 'gmail.com'].join('@');
  return `https://formsubmit.co/ajax/${target}`;
};

const FAQ_ITEMS = [
  {
    q: 'كيف أسجل الدخول أو أؤكد حسابي؟',
    a: 'بعد إنشاء حساب جديد، قد يصلك رابط تأكيد إلى بريدك الإلكتروني. افتح الرسالة واضغط على رابط التفعيل، ثم سجل الدخول بنفس البريد وكلمة المرور.'
  },
  {
    q: 'كيف أبلغ عن تلوث أو مخالفة بيئية؟',
    a: 'اضغط على زر "بلّغ عن انتهاك" في الشريط العلوي أو من الخريطة، وحدد الموقع ونوع البلاغ وأرفق صورة واضحة.'
  },
  {
    q: 'كيف أشارك في الحملات التطوعية وأحصل على شهادة؟',
    a: 'انتقل إلى قسم "الحملات" واختر الحملة المناسبة لمحافظتك ثم اضغط تسجيل. بعد حضورك واعتماد المنسق تصدر لك شهادة موثقة في جواز المتطوع.'
  },
  {
    q: 'لماذا قسم الشراكات والهدايا مغلق؟',
    a: 'قسم الشراكات والهدايا قيد التجهيز والتعاقد الرسمي مع الشركاء المحليين وسيتم افتتاحه قريباً.'
  }
];

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [category, setCategory] = useState('مشكلة تقنية');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    if (isOpen) {
      const user = nafasAuth.getCurrentUser();
      if (user) {
        if (!name) setName(user.fullName || '');
        if (!senderEmail) setSenderEmail(user.email || '');
      }
      setSendError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);

    if (!name.trim() || !senderEmail.trim() || !message.trim()) {
      setSendError('يرجى ملء الاسم والبريد الإلكتروني ونص الرسالة.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(getSupportEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          email: senderEmail.trim(),
          category,
          message: message.trim(),
          _subject: `[مركز مساعدة نَفَس] ${category} من ${name.trim()}`,
          _template: 'table'
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === 'false') {
        throw new Error(data?.message || 'تعذر الإرسال عبر الخادم المباشر.');
      }

      setSentSuccess(true);
      setMessage('');
    } catch (_) {
      setSendError(
        'تعذر الإرسال التلقائي حالياً. يمكنك الضغط على زر "إرسال عبر تطبيق البريد" أدناه لإرسال رسالتك مباشرة.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative bg-nafas-ivory w-full max-w-2xl rounded-3xl shadow-2xl border border-nafas-reed/30 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-center-title"
      >
        {/* Header */}
        <div className="bg-nafas-silt text-nafas-limestone px-6 py-4 flex items-center justify-between border-b border-white/10">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="إغلاق مركز المساعدة"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <OrchidMotif variant="icon" size="sm" />
            <h2 id="help-center-title" className="font-black text-lg text-nafas-limestone">
              مركز المساعدة والدعم
            </h2>
            <HelpCircle className="w-5 h-5 text-nafas-misty" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Quick FAQ */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-black text-nafas-silt flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-nafas-blue" />
              <span>أسئلة شائعة سريعة</span>
            </h3>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, idx) => {
                const isExpanded = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-nafas-reed/25 bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isExpanded ? null : idx)}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-bold text-nafas-silt hover:bg-nafas-sand/30 transition-colors"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-nafas-blue transition-transform shrink-0 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 text-xs text-stone-600 leading-relaxed border-t border-nafas-reed/15 pt-2.5">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Support Form */}
          <div className="bg-white p-5 rounded-2xl border border-nafas-reed/25 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-nafas-silt flex items-center gap-2">
                  <Mail className="w-4 h-4 text-nafas-blue" />
                  <span>تواصل مباشر مع فريق الدعم</span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  أرسل استفسارك أو مشكلتك وسيتواصل معك فريق الدعم عبر بريدك الإلكتروني.
                </p>
              </div>
            </div>

            {sentSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-black text-emerald-950">
                  تم إرسال رسالتك إلى الدعم بنجاح!
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  شكراً لتواصلك مع منصة نَفَس. تم توجيه رسالتك إلى البريد المخصص وسيتم الرد عليك في أقرب وقت.
                </p>
                <button
                  type="button"
                  onClick={() => setSentSuccess(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {sendError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{sendError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسمك الكريم"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-nafas-sand/20 text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      بريدك الإلكتروني (للرد عليك)
                    </label>
                    <input
                      type="email"
                      required
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="name@example.com"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-nafas-sand/20 text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    نوع الطلب
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-nafas-sand/20 text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none"
                  >
                    <option value="مشكلة تقنية">مشكلة تقنية أو تسجيل دخول</option>
                    <option value="استفسار عام">استفسار عام</option>
                    <option value="اقتراح تطوير">اقتراح لتطوير المنصة</option>
                    <option value="شراكة أو تطوع">طلب شراكة أو تنسيق حملة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    تفاصيل الرسالة
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="اكتب مشكلتك أو استفسارك بوضوح هنا..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-nafas-sand/20 text-xs text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none resize-none"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3 px-4 rounded-xl bg-nafas-blue hover:bg-nafas-blue-dark text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>إرسال رسالة للدعم</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
