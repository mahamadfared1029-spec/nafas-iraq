'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Filter, 
  Users, 
  Mail, 
  FileText, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  ChevronRight,
  ExternalLink,
  MapPin,
  Lock,
  ArrowUpDown,
  Archive,
  RotateCcw,
  EyeOff,
  KeyRound,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { nafasAuth } from '@/lib/auth/authService';
import { nafasReports } from '@/lib/reports/reportService';
import { 
  EnvironmentalReport, 
  ReportStatus, 
  UserProfile, 
  NotificationOutboxItem,
  Role,
  AdminAuditLogItem
} from '@/types';
import { IRAQ_GOVERNORATES } from '@/lib/constants';

interface FounderCommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FounderCommandCenter({ isOpen, onClose }: FounderCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'staff' | 'outbox' | 'audit' | 'reset' | 'pin'>('reports');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Data states
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [outbox, setOutbox] = useState<NotificationOutboxItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [govFilter, setGovFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<EnvironmentalReport | null>(null);

  // Moderation form
  const [modStatus, setModStatus] = useState<ReportStatus>('verified');
  const [modNotes, setModNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Founder Admin PIN States
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [pinActionLoading, setPinActionLoading] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Founder Admin PIN Verification Test States
  const [testPinInput, setTestPinInput] = useState('');
  const [showTestPin, setShowTestPin] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Load and refresh data
  const loadData = async () => {
    const user = nafasAuth.getCurrentUser();
    setCurrentUser(user);

    if (user && (user.role === 'moderator' || user.role === 'admin' || user.role === 'super_admin')) {
      try {
        const rep = await nafasReports.getAllReportsForStaff();
        setReports(rep);
      } catch (_) {}

      try {
        const out = await nafasReports.getOutbox();
        setOutbox(out);
      } catch (_) {}

      if (user.role === 'super_admin' || user.role === 'admin') {
        nafasAuth.listUsers().then(setUsers).catch(() => {});
      }
      if (user.role === 'super_admin') {
        nafasAuth.listAdminAuditLogs().then(setAuditLogs).catch(() => {});
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinFeedback(null);
    setPinError(null);

    if (pinInput.length < 4 || pinInput.length > 8 || !/^[0-9]+$/.test(pinInput)) {
      setPinError('الرمز السري الإداري يجب أن يتكون من 4 إلى 8 أرقام فقط.');
      return;
    }
    if (pinInput !== confirmPinInput) {
      setPinError('الرمزان المدخلان غير متطابقين.');
      return;
    }

    setPinActionLoading(true);
    try {
      const res = await nafasAuth.setFounderPin(pinInput);
      setPinFeedback(res.messageAr);
      setPinInput('');
      setConfirmPinInput('');
    } catch (err: any) {
      setPinError(err?.message || 'فشل حفظ الرمز الإداري.');
    } finally {
      setPinActionLoading(false);
    }
  };

  const handleTestVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestFeedback(null);
    setTestError(null);

    if (!testPinInput) {
      setTestError('يرجى إدخال الرمز لتجربة التحقق.');
      return;
    }

    setTestLoading(true);
    try {
      const res = await nafasAuth.verifyFounderPin(testPinInput);
      setTestFeedback(res.messageAr);
      setTestPinInput('');
    } catch (err: any) {
      setTestError(err?.message || 'فشل التحقق من الرمز.');
    } finally {
      setTestLoading(false);
    }
  };

  // Status metrics calculation
  const stats = useMemo(() => {
    const total = reports.length;
    const submitted = reports.filter(r => r.status === 'submitted').length;
    const underReview = reports.filter(r => r.status === 'under_review').length;
    const verified = reports.filter(r => r.status === 'verified').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;
    const rejected = reports.filter(r => r.status === 'rejected').length;
    const hazardous = reports.filter(r => r.isHazardous).length;
    return { total, submitted, underReview, verified, resolved, rejected, hazardous };
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchGov = govFilter === 'all' || r.governorateId === govFilter;
      return matchStatus && matchGov;
    });
  }, [reports, statusFilter, govFilter]);

  if (!isOpen) return null;

  // Access Control Guard
  const isAuthorized = currentUser && (
    currentUser.role === 'moderator' || 
    currentUser.role === 'admin' || 
    currentUser.role === 'super_admin'
  ) && !currentUser.isSuspended;

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#222238]/80 backdrop-blur-md" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-200 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#222238] mb-2">وصول محمي — غير مصرح</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            لوحة الإدارة والتحكم محصورة بمشرفي المنصة والمشرف العام (Super Admin) المعتمدين رسمياً.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#62467D] hover:bg-[#52386A] text-white font-bold rounded-xl shadow-md transition-all"
          >
            العودة للمنصة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  // Handle Moderation Submit
  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await nafasReports.updateReportStatus(
        selectedReport.id,
        modStatus,
        modNotes
      );
      setFeedbackMessage(res.messageAr);
      setSelectedReport(res.report);
      loadData();
    } catch (err: any) {
      setFeedbackMessage(err?.message || 'فشل التحديث');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Role Change
  const handleChangeRole = async (targetId: string, newRole: Role) => {
    try {
      await nafasAuth.updateUserRole(targetId, newRole);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'فشل تعديل الدور');
    }
  };

  // Handle Suspension
  const handleToggleSuspend = async (targetId: string, currentSuspended: boolean) => {
    try {
      await nafasAuth.toggleUserSuspension(targetId, !currentSuspended);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'فشل تعديل الحالة');
    }
  };

  // Handle Safe Demo Reset
  const handleResetDemoData = async () => {
    if (confirm('تأكيد: هل أنت متأكد من أرشفة التقارير التجريبية فقط مع الإبقاء التام على البلاغات الحقيقية؟')) {
      try {
        const res = await nafasReports.resetDemoData();
        alert(res.messageAr || `تم أرشفة ${res.clearedCount} تقرير تجريبي بنجاح.`);
        loadData();
      } catch (err: any) {
        alert(err?.message || 'فشلت عملية التنظيف');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#222238]/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="w-full max-w-6xl h-[92vh] bg-white rounded-3xl shadow-2xl border border-[#E5DCCD] flex flex-col overflow-hidden">
        
        {/* Top Navbar */}
        <div className="bg-[#222238] text-white p-4 sm:px-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#62467D] rounded-xl shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>مركز القيادة والرقابة البيئية</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {currentUser?.role === 'super_admin' ? 'المشرف العام (Super Admin)' : 'مشرف معتمد (Moderator)'}
                </span>
              </h2>
              <p className="text-xs text-white/60">
                منظومة نَفَس الوطنية — حماية البيانات والمصادقة السيادية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

        {!nafasReports.isConfigured() && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>حالة البنية التحتية السحابية: Supabase غير متصل (BLOCKED BY EXTERNAL CONFIGURATION). يرجى تزويد متغيرات البيئة NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY.</span>
            </div>
            <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 font-mono">وضع الاستعداد الأمني</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-[#F7F1E7] px-6 py-2 border-b border-[#E5DCCD] flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-[#62467D] text-white shadow-sm'
                : 'text-[#6B463B] hover:bg-white/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>إدارة البلاغات ({stats.total})</span>
            {stats.submitted > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {stats.submitted}
              </span>
            )}
          </button>

          {currentUser?.role === 'super_admin' && (
            <>
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'staff'
                    ? 'bg-[#62467D] text-white shadow-sm'
                    : 'text-[#6B463B] hover:bg-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>إدارة الكادر والمستخدمين</span>
              </button>

              <button
                onClick={() => setActiveTab('outbox')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'outbox'
                    ? 'bg-[#62467D] text-white shadow-sm'
                    : 'text-[#6B463B] hover:bg-white/60'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>صندوق الإشعارات ({outbox.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'audit'
                    ? 'bg-[#62467D] text-white shadow-sm'
                    : 'text-[#6B463B] hover:bg-white/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>سجل الرقابة الإدارية</span>
              </button>

              <button
                onClick={() => setActiveTab('pin')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'pin'
                    ? 'bg-[#62467D] text-white shadow-sm'
                    : 'text-[#6B463B] hover:bg-white/60'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>رمز المشرف العام (Admin PIN)</span>
              </button>

              <button
                onClick={() => setActiveTab('reset')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'reset'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ضبط الإنتاج والتنظيف</span>
              </button>
            </>
          )}
        </div>

        {/* Tab 1: REPORTS MANAGEMENT */}
        {activeTab === 'reports' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Reports List Column */}
            <div className="w-full md:w-1/2 lg:w-5/12 border-l border-[#E5DCCD] flex flex-col overflow-hidden bg-gray-50/50">
              
              {/* Quick Filters */}
              <div className="p-3 border-b border-[#E5DCCD] bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 text-xs bg-[#F7F1E7]/50 border border-[#E5DCCD] rounded-lg p-2 font-medium"
                  >
                    <option value="all">جميع الحالات ({reports.length})</option>
                    <option value="submitted">جديد / بانتظار الاعتماد ({stats.submitted})</option>
                    <option value="under_review">قيد المراجعة ({stats.underReview})</option>
                    <option value="verified">معتمد وموثق ({stats.verified})</option>
                    <option value="resolved">تمت المعالجة ({stats.resolved})</option>
                    <option value="rejected">مرفوض ({stats.rejected})</option>
                  </select>

                  <select
                    value={govFilter}
                    onChange={(e) => setGovFilter(e.target.value)}
                    className="flex-1 text-xs bg-[#F7F1E7]/50 border border-[#E5DCCD] rounded-lg p-2 font-medium"
                  >
                    <option value="all">كافة المحافظات</option>
                    {IRAQ_GOVERNORATES.map(g => (
                      <option key={g.id} value={g.id}>{g.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1">
                {filteredReports.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    لا توجد بلاغات تطابق معايير التصفية المحددة.
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => {
                        setSelectedReport(report);
                        setModStatus(report.status);
                        setModNotes('');
                        setFeedbackMessage(null);
                      }}
                      className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                        selectedReport?.id === report.id
                          ? 'bg-[#F7F1E7] border-[#62467D] shadow-sm'
                          : 'bg-white hover:bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-[#62467D]">
                          {report.trackingNumber}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          report.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                          report.status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                          report.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                          report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-[#222238] line-clamp-1 mb-1">
                        {report.title}
                      </h4>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#6B463B]" />
                          {report.governorateId} — {report.neighborhood}
                        </span>
                        {report.isHazardous && (
                          <span className="text-red-600 font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            خطر
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Report Details & Moderation Action Column */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
              {selectedReport ? (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between border-b pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold bg-[#62467D] text-white px-2.5 py-0.5 rounded-lg">
                          {selectedReport.trackingNumber}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(selectedReport.createdAt).toLocaleString('ar-IQ')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#222238]">
                        {selectedReport.title}
                      </h3>
                    </div>

                    <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#F7F1E7] text-[#6B463B] border border-[#E5DCCD]">
                      {selectedReport.category}
                    </span>
                  </div>

                  {/* Photo Evidence & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6B463B] mb-1.5">
                        صورة التوثيق الميداني
                      </label>
                      <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-[#E5DCCD]">
                        <img
                          src={selectedReport.imageBeforeUrl}
                          alt="توثيق البلاغ"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 bg-[#F7F1E7]/40 p-4 rounded-2xl border border-[#E5DCCD] text-xs">
                      <div>
                        <span className="text-gray-500 font-medium">المحافظة والحي:</span>
                        <p className="font-bold text-[#222238]">
                          {selectedReport.governorateId} — {selectedReport.neighborhood}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">الإحداثيات الجغرافية (WGS84):</span>
                        <p className="font-mono font-bold text-[#62467D]">
                          {selectedReport.lat.toFixed(6)}, {selectedReport.lng.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">مصدر التحديد والدقة:</span>
                        <p className="font-bold text-[#222238]">
                          {selectedReport.location_source} {selectedReport.accuracy_m ? `(±${selectedReport.accuracy_m}م)` : ''}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">المُبلّغ:</span>
                        <p className="font-bold text-[#222238]">
                          {selectedReport.reporterDisplayName || 'مواطن'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-[#6B463B] mb-1">
                      الوصف الميداني المفصل:
                    </label>
                    <p className="text-sm bg-gray-50 p-4 rounded-2xl border border-gray-200 text-[#222238] leading-relaxed">
                      {selectedReport.description}
                    </p>
                  </div>

                  {/* MODERATION ACTION FORM */}
                  <div className="p-5 bg-gradient-to-br from-[#F7F1E7] to-white rounded-2xl border-2 border-[#62467D]/20 space-y-4">
                    <h4 className="text-sm font-bold text-[#62467D] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>قرار المشرف المعتمد (اعتماد / تحديث الحالة)</span>
                    </h4>

                    {feedbackMessage && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                        {feedbackMessage}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#6B463B] mb-1">
                          تغيير الحالة إلى:
                        </label>
                        <select
                          value={modStatus}
                          onChange={(e) => setModStatus(e.target.value as ReportStatus)}
                          className="w-full text-xs bg-white border border-[#E5DCCD] rounded-xl p-2.5 font-bold"
                        >
                          <option value="under_review">قيد المراجعة والتدقيق الميداني</option>
                          <option value="verified">معتمد وموثق (نشر عام على الخريطة)</option>
                          <option value="in_progress">قيد المعالجة الميدانية</option>
                          <option value="resolved">تمت المعالجة وإزالة التلوث</option>
                          <option value="duplicate">بلاغ مكرر</option>
                          <option value="rejected">مرفوض (لا يطابق المعايير)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#6B463B] mb-1">
                          ملاحظات الاعتماد والرقابة:
                        </label>
                        <input
                          type="text"
                          value={modNotes}
                          onChange={(e) => setModNotes(e.target.value)}
                          placeholder="ملاحظة تظهر في سجل التتبع..."
                          className="w-full text-xs bg-white border border-[#E5DCCD] rounded-xl p-2.5"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleUpdateStatus}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-[#62467D] hover:bg-[#52386A] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ القرار وتوثيقه في السجل المشفر</span>
                    </button>
                  </div>

                  {/* Audit Logs Trail */}
                  <div>
                    <label className="block text-xs font-bold text-[#6B463B] mb-2">
                      سجل القرارات والتدقيق الميداني (Audit Logs):
                    </label>
                    <div className="space-y-2">
                      {selectedReport.auditLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-start justify-between gap-3">
                          <div>
                            <span className="font-bold text-[#222238]">{log.actor} ({log.actorRole})</span>
                            <p className="text-gray-600 mt-0.5">{log.notes}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString('ar-IQ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-xs text-gray-400">
                  حدد بلاغاً من القائمة الجانبية للاطلاع على تفاصيله واتخاذ قرار الإشراف.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: STAFF & USER MANAGEMENT (Super Admin Only) */}
        {activeTab === 'staff' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#222238]">
                سجل المستخدمين وتعيين صلاحيات الكادر (إشراف المؤسس)
              </h3>
              <span className="text-xs text-gray-500">
                إجمالي المسجلين: {users.length}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5DCCD] overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F7F1E7] text-[#6B463B] font-bold border-b border-[#E5DCCD]">
                  <tr>
                    <th className="p-3">الاسم الكامل</th>
                    <th className="p-3">البريد الإلكتروني</th>
                    <th className="p-3">المحافظة</th>
                    <th className="p-3">الدور الحالي</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-[#222238]">{u.fullName}</td>
                      <td className="p-3 font-mono text-gray-600">{u.email}</td>
                      <td className="p-3">{u.governorateId}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'moderator' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.isSuspended ? (
                          <span className="text-red-600 font-bold">مجمد</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">نشط</span>
                        )}
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-2">
                        {u.role !== 'super_admin' && (
                          <>
                            <button
                              onClick={() => handleChangeRole(u.id, u.role === 'moderator' ? 'citizen' : 'moderator')}
                              className="px-2.5 py-1 bg-[#62467D]/10 hover:bg-[#62467D]/20 text-[#62467D] rounded-lg font-bold text-[10px]"
                            >
                              {u.role === 'moderator' ? 'تجريد من الإشراف' : 'ترقية لمشرف'}
                            </button>
                            <button
                              onClick={() => handleToggleSuspend(u.id, Boolean(u.isSuspended))}
                              className={`px-2 py-1 rounded-lg font-bold text-[10px] ${
                                u.isSuspended ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {u.isSuspended ? 'إلغاء التجميد' : 'تجميد الحساب'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: NOTIFICATION OUTBOX */}
        {activeTab === 'outbox' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#222238]">
                  صندوق الإشعارات الإدارية الخارجية (Notification Outbox)
                </h3>
                <p className="text-xs text-gray-500">
                  مراقبة إرسال التنبيهات المباشرة إلى بريد المؤسس المشفر عبر Resend
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5DCCD] overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F7F1E7] text-[#6B463B] font-bold border-b border-[#E5DCCD]">
                  <tr>
                    <th className="p-3">معرف الحدث</th>
                    <th className="p-3">البلاغ المرتبط</th>
                    <th className="p-3">النوع</th>
                    <th className="p-3">حالة التسليم</th>
                    <th className="p-3">المزود</th>
                    <th className="p-3">التوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {outbox.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        لا توجد إشعارات مسجلة في الصندوق حالياً.
                      </td>
                    </tr>
                  ) : (
                    outbox.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-[11px] text-gray-600">{item.eventId}</td>
                        <td className="p-3 font-mono font-bold text-[#62467D]">{item.reportId}</td>
                        <td className="p-3">{item.eventType}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            item.deliveryStatus === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                            item.deliveryStatus === 'queued' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.deliveryStatus}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px]">{item.provider}</td>
                        <td className="p-3 text-gray-400">{new Date(item.createdAt).toLocaleTimeString('ar-IQ')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: ADMIN AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#222238]">
              سجل العمليات والرقابة السيادية (Admin Audit Trail)
            </h3>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#62467D]">{log.action}</span>
                    <span className="text-gray-500 mr-2">بواسطة: {log.actorEmail}</span>
                    {log.targetType && (
                      <span className="text-gray-400 mr-2">[{log.targetType}: {log.targetId}]</span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-gray-400">
                    {new Date(log.createdAt).toLocaleString('ar-IQ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: PRODUCTION RESET & LAUNCH */}
        {activeTab === 'reset' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto">
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl space-y-4">
              <div className="flex items-center gap-3 text-rose-800">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="font-bold text-sm">
                  إعادة ضبط وإطلاق الإنتاج (Clean Production Launch)
                </h4>
              </div>
              <p className="text-xs text-rose-900 leading-relaxed">
                هذا الإجراء يقوم بتنظيف البلاغات التجريبية المصطنعة (Demo Fixtures) مع الإبقاء التام على كافة البلاغات الحقيقية الموثقة من المواطنين.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleResetDemoData}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد تنظيف البلاغات التجريبية الآن</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: FOUNDER ADMIN PIN (OWNER-ONLY WITH AAL2) */}
        {activeTab === 'pin' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto">
            {/* Header info card */}
            <div className="p-5 bg-[#62467D]/10 border border-[#62467D]/20 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-[#62467D] font-bold text-sm">
                <KeyRound className="w-5 h-5 text-[#62467D]" />
                <span>الرمز السري الإداري للمؤسس (Founder Admin Secondary PIN)</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                يوفر طبقة أمان سيادية إضافية لحماية العمليات الإدارية الحساسة. يُخزن الرمز مشفراً بخوارزمية التشفير الأحادي (Bcrypt Salted Hash) في قاعدة البيانات ولا يُحفظ في المتصفح أو أي كود أمامي، ويتطلب جلسة AAL2 موثقة لتعديله.
              </p>
            </div>

            {/* Set / Update PIN Form */}
            <div className="p-6 bg-white border border-[#E5DCCD] rounded-3xl shadow-sm space-y-4">
              <h4 className="font-bold text-sm text-[#222238] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#62467D]" />
                <span>تعيين أو تغيير الرمز الإداري</span>
              </h4>

              {pinError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pinFeedback}</span>
                </div>
              )}

              <form onSubmit={handleSavePin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B463B] mb-1">
                    الرمز السري الجديد (4 إلى 8 أرقام)
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      minLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••"
                      className="w-full pr-4 pl-12 py-2.5 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                      aria-label={showPin ? 'إخفاء الرمز السري' : 'إظهار الرمز السري'}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B463B] mb-1">
                    تأكيد الرمز السري
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPin ? 'text' : 'password'}
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      minLength={4}
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••"
                      className="w-full pr-4 pl-12 py-2.5 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#62467D] text-[#222238]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                      aria-label={showConfirmPin ? 'إخفاء تأكيد الرمز' : 'إظهار تأكيد الرمز'}
                    >
                      {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pinActionLoading || pinInput.length < 4}
                  className="w-full py-2.5 bg-[#62467D] hover:bg-[#52386A] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {pinActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>حفظ الرمز السري المشفر وتوثيق الإجراء</span>
                </button>
              </form>
            </div>

            {/* Test PIN Verification Form (With rate-limiting protection) */}
            <div className="p-6 bg-white border border-[#E5DCCD] rounded-3xl shadow-sm space-y-4">
              <h4 className="font-bold text-sm text-[#222238] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>اختبار التحقق من الرمز (Test Verification)</span>
              </h4>

              {testError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{testError}</span>
                </div>
              )}

              {testFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{testFeedback}</span>
                </div>
              )}

              <form onSubmit={handleTestVerifyPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B463B] mb-1">
                    أدخل الرمز للتحقق:
                  </label>
                  <div className="relative">
                    <input
                      type={showTestPin ? 'text' : 'password'}
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      value={testPinInput}
                      onChange={(e) => setTestPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••"
                      className="w-full pr-4 pl-12 py-2.5 text-sm bg-[#F7F1E7]/40 border border-[#E5DCCD] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-[#222238]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTestPin(!showTestPin)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                      aria-label={showTestPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                    >
                      {showTestPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={testLoading || !testPinInput}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>اختبار المطابقة والتشفير</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
