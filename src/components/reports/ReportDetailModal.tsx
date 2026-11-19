'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { EnvironmentalReport, ReportStatus } from '@/types';
import { CATEGORY_INFO } from '@/lib/constants';
import { 
  X, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Clock, 
  User, 
  AlertTriangle, 
  History, 
  Edit3, 
  CheckCircle, 
  FileText 
} from 'lucide-react';

interface DetailModalProps {
  report: EnvironmentalReport | null;
  onClose: () => void;
}

export const ReportDetailModal: React.FC<DetailModalProps> = ({ report, onClose }) => {
  const { role, updateReportStatus, t } = useNafas();
  const [selectedNewStatus, setSelectedNewStatus] = useState<ReportStatus>(report?.status || 'under_review');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [statusUpdatedFeedback, setStatusUpdatedFeedback] = useState(false);

  if (!report) return null;

  const isModeratorOrAdmin = role === 'moderator' || role === 'admin';
  const catInfo = CATEGORY_INFO[report.category] || CATEGORY_INFO.garbage;
  const isResolved = report.status === 'resolved';

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    updateReportStatus(report.id, selectedNewStatus, moderatorNotes);
    setStatusUpdatedFeedback(true);
    setTimeout(() => setStatusUpdatedFeedback(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="relative bg-nafas-ivory w-full max-w-3xl rounded-3xl shadow-2xl border border-nafas-reed/15 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-nafas-sand px-6 py-4 border-b border-nafas-reed/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-nafas-misty/50 text-nafas-silt transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-nafas-blue bg-nafas-blue/10 px-2.5 py-1 rounded-md">
              {report.trackingNumber}
            </span>
            <span className="font-bold text-nafas-silt text-sm">
              تفاصيل البلاغ وسجل التحقق
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Main Title & Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nafas-reed/20 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-nafas-silt">
                {report.title}
              </h2>
              <div className="flex items-center gap-4 text-xs text-nafas-neutral-slate mt-1.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-nafas-blue" />
                  {report.neighborhood}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-nafas-silt/70y" />
                  {new Date(report.createdAt).toLocaleDateString('ar-IQ')}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-nafas-neutral-slate" />
                  {report.isAnonymous ? 'مواطن (مجهول الهوية)' : report.reportedBy}
                </span>
              </div>
            </div>

            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isResolved ? 'bg-nafas-misty text-nafas-blue' : 'bg-amber-100 text-amber-900'
              }`}>
                {isResolved ? <ShieldCheck className="w-4 h-4 text-nafas-blue" /> : <Clock className="w-4 h-4 text-amber-600" />}
                <span>{isResolved ? t.statusResolved : report.status === 'in_progress' ? t.statusInProgress : report.status === 'verified' ? t.statusVerified : t.statusUnderReview}</span>
              </span>
            </div>
          </div>

          {/* Photographic Evidence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-nafas-neutral-slate">صورة البلاغ الميداني (الحالة الأصلية):</span>
              <img
                src={report.imageBeforeUrl}
                alt="صورة قبل المعالجة"
                className="w-full aspect-[4/3] object-cover rounded-2xl border border-nafas-reed/30 shadow-sm"
              />
            </div>

            {report.imageAfterUrl ? (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-nafas-blue flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>نتيجة المعالجة الميدانية الموثقة:</span>
                </span>
                <img
                  src={report.imageAfterUrl}
                  alt="صورة بعد المعالجة"
                  className="w-full aspect-[4/3] object-cover rounded-2xl border-2 border-nafas-blue shadow-sm"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-nafas-reed/30 rounded-2xl p-6 text-center text-xs text-nafas-neutral-slate bg-gray-50">
                <Clock className="w-8 h-8 text-amber-500 mb-2" />
                <span>الموقع قيد المتابعة والتنظيف.</span>
                <span className="text-[11px] text-gray-500 mt-1">سيتم رفع صور الإنجاز فور انتهاء الحملة الميدانية.</span>
              </div>
            )}
          </div>

          {/* Description & Impact Notes */}
          <div className="bg-nafas-sand p-4 rounded-2xl border border-nafas-reed/10 space-y-2">
            <span className="text-xs font-bold text-nafas-silt block">وصف البلاغ وتفاصيل الميدان:</span>
            <p className="text-xs sm:text-sm text-nafas-neutral-slate leading-relaxed">
              {report.description}
            </p>
            {report.verificationEvidence && (
              <div className="pt-2 border-t border-nafas-reed/10 text-xs text-nafas-blue font-medium">
                <strong>الأثر الموثق:</strong> {report.verificationEvidence}
              </div>
            )}
          </div>

          {/* Audit History Timeline (Immutable Transparency Ledger) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-nafas-silt">
              <History className="w-4 h-4 text-nafas-blue" />
              <span>سجل التدقيق والمتابعة الميدانية (Audit Trail)</span>
            </div>

            <div className="border-r-2 border-nafas-blue/30 mr-2 pr-4 space-y-4">
              {report.auditLogs.map((log) => (
                <div key={log.id} className="relative space-y-1">
                  <span className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-nafas-blue border-2 border-white shadow-sm"></span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-nafas-silt">{log.actor} ({log.actorRole})</span>
                    <span className="text-nafas-neutral-slate/70 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString('ar-IQ')}
                    </span>
                  </div>
                  <p className="text-xs text-nafas-neutral-slate">
                    {log.notes}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Moderator / Admin Action Controls */}
          {isModeratorOrAdmin && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span>لوحة تحكم المشرف البيئي المعتمد (صلاحية خاصة):</span>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      تحديث حالة البلاغ:
                    </label>
                    <select
                      value={selectedNewStatus}
                      onChange={(e) => setSelectedNewStatus(e.target.value as ReportStatus)}
                      className="w-full text-xs font-arabic bg-nafas-ivory border border-amber-300 rounded-xl px-3 py-2 text-nafas-silt"
                    >
                      <option value="under_review">قيد المراجعة</option>
                      <option value="verified">موثّق ميدانياً</option>
                      <option value="in_progress">قيد المعالجة الميدانية</option>
                      <option value="resolved">تمت المعالجة بنجاح</option>
                      <option value="duplicate">بلاغ مكرر</option>
                      <option value="rejected">مستبعد (بلاغ غير صالح)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      ملاحظات التدقيق والجهة المعينة:
                    </label>
                    <input
                      type="text"
                      value={moderatorNotes}
                      onChange={(e) => setModeratorNotes(e.target.value)}
                      placeholder="أدخل سبب التعديل أو تفاصيل الحملة الميدانية..."
                      className="w-full text-xs font-arabic bg-nafas-ivory border border-amber-300 rounded-xl px-3 py-2 text-nafas-silt"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {statusUpdatedFeedback && (
                    <span className="text-xs text-nafas-blue font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>تم تحديث الحالة وحفظها في سجل التدقيق بنجاح!</span>
                    </span>
                  )}
                  <button
                    type="submit"
                    className="mr-auto px-4 py-2 rounded-xl bg-nafas-silt hover:bg-nafas-silt/90 text-nafas-ivory text-xs font-bold shadow"
                  >
                    حفظ التعديل في السجل
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
