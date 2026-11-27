'use client';

import React, { useState, useMemo } from 'react';
import { useNafas } from '@/lib/store';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import { VolunteerCampaign, IssuedCertificate, CampaignType } from '@/types';
import { nafasAuth } from '@/lib/auth/authService';
import { nafasCampaigns } from '@/lib/campaigns/campaignService';
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Sprout, 
  AlertCircle, 
  Award, 
  CheckCircle2, 
  X, 
  UserPlus, 
  CheckSquare,
  QrCode,
  PlusCircle,
  Sparkles,
  Waves,
  Trash2,
  Recycle,
  BookOpen,
  Flower2,
  ChevronLeft,
  KeyRound,
  FileCheck2,
  ExternalLink
} from 'lucide-react';

interface CampaignListProps {
  onViewCertificate?: (cert: IssuedCertificate) => void;
  onRequireAuth?: (notice?: string) => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({ onViewCertificate, onRequireAuth }) => {
  const { 
    campaigns, 
    role, 
    t, 
    registerForCampaign, 
    cancelCampaignRegistration, 
    verifyAttendance,
    userRegisteredCampaignIds,
    passport 
  } = useNafas();

  // Filters
  const [selectedGovId, setSelectedGovId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<CampaignType | 'all'>('all');

  // Modals state
  const [detailModalCampaign, setDetailModalCampaign] = useState<VolunteerCampaign | null>(null);
  const [registerModalCampaign, setRegisterModalCampaign] = useState<VolunteerCampaign | null>(null);
  const [volunteerName, setVolunteerName] = useState(passport.userName || 'مواطن نَفَس');
  const [regSuccessMessage, setRegSuccessMessage] = useState(false);

  // Field Attendance Check-In (Volunteer)
  const [checkInModalCampaign, setCheckInModalCampaign] = useState<VolunteerCampaign | null>(null);
  const [enteredCheckInCode, setEnteredCheckInCode] = useState('');
  const [checkInFeedback, setCheckInFeedback] = useState<string | null>(null);
  const [checkInSuccessCert, setCheckInSuccessCert] = useState<IssuedCertificate | null>(null);
  const [volunteerCheckedInNotice, setVolunteerCheckedInNotice] = useState<string | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Organizer Check-In & Code Generation
  const [organizerActionCampaign, setOrganizerActionCampaign] = useState<VolunteerCampaign | null>(null);
  const [activeOrganizerCode, setActiveOrganizerCode] = useState<string | null>(null);
  const [activeOrganizerCodeExpiry, setActiveOrganizerCodeExpiry] = useState<string | null>(null);
  const [codeGenLoading, setCodeGenLoading] = useState(false);
  const [attendeeNameInput, setAttendeeNameInput] = useState('سجاد العبيدي');
  const [hoursInput, setHoursInput] = useState(3.5);
  const [issuedCertFeedback, setIssuedCertFeedback] = useState<IssuedCertificate | null>(null);

  // Create Campaign Modal (Organizers & Admins)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    titleAr: '',
    titleKu: '',
    titleEn: '',
    descriptionAr: '',
    campaignType: 'reforestation' as CampaignType,
    governorateId: 'baghdad',
    meetingArea: '',
    meetingLat: 33.3152,
    meetingLng: 44.3661,
    date: '2026-12-01',
    startTime: '09:00 ص',
    durationHours: 3.5,
    volunteerCapacity: 30,
    targetTrees: 25,
    wasteCollectedKg: 0,
    isDraft: false
  });
  const [createStatusMsg, setCreateStatusMsg] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Filter logic
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchGov = selectedGovId === 'all' || c.governorateId === selectedGovId;
      const matchType = selectedType === 'all' || c.campaignType === selectedType;
      return matchGov && matchType;
    });
  }, [campaigns, selectedGovId, selectedType]);

  const isOrganizerOrAdmin = (role as string) === 'organizer' || (role as string) === 'moderator' || (role as string) === 'admin' || (role as string) === 'super_admin';

  // Campaign Type Badge Details Helper
  const getTypeBadge = (type: CampaignType) => {
    switch (type) {
      case 'reforestation':
        return { label: 'تشجير وتخضير', icon: Sprout, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'river_protection':
        return { label: 'حماية الأنهر', icon: Waves, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'cleanup':
        return { label: 'تنظيف بيئي', icon: Trash2, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'recycling':
        return { label: 'إعادة تدوير', icon: Recycle, bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'education':
        return { label: 'توعية بيئية', icon: BookOpen, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'biodiversity':
        return { label: 'التنوع الأحيائي', icon: Flower2, bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'مبادرة بيئية', icon: Sparkles, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerModalCampaign) return;

    const ok = registerForCampaign(registerModalCampaign.id, volunteerName);
    if (ok) {
      setRegSuccessMessage(true);
      setTimeout(() => {
        setRegSuccessMessage(false);
        setRegisterModalCampaign(null);
      }, 1800);
    }
  };

  // Handle Volunteer Field Check-In
  const handleVolunteerCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInModalCampaign || !enteredCheckInCode.trim()) return;

    setCheckInLoading(true);
    setCheckInFeedback(null);
    try {
      const res = await nafasCampaigns.volunteerCheckIn(
        checkInModalCampaign.id,
        enteredCheckInCode.trim()
      );

      setVolunteerCheckedInNotice(res.message);
    } catch (err: any) {
      setCheckInFeedback(err?.message || 'رمز الحضور غير صحيح أو انتهت صلاحيته.');
    } finally {
      setCheckInLoading(false);
    }
  };

  // Organizer Generate 6-digit Code & QR
  const handleGenerateCheckInCode = async () => {
    if (!organizerActionCampaign) return;
    setCodeGenLoading(true);
    try {
      const res = await nafasCampaigns.generateCheckInCode(organizerActionCampaign.id);
      setActiveOrganizerCode(res.code);
      setActiveOrganizerCodeExpiry(res.expiresAt);
    } catch (err: any) {
      alert(err?.message || 'فشل توليد رمز التحقق الميداني.');
    } finally {
      setCodeGenLoading(false);
    }
  };

  // Organizer Manual Attendance Verify Submit
  const handleVerifyAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizerActionCampaign) return;

    const cert = verifyAttendance(organizerActionCampaign.id, attendeeNameInput, hoursInput);
    setIssuedCertFeedback(cert);
  };

  // Create Campaign Submit
  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateStatusMsg(null);
    try {
      const res = await nafasCampaigns.createCampaign({
        titleAr: createForm.titleAr,
        titleKu: createForm.titleKu,
        titleEn: createForm.titleEn,
        descriptionAr: createForm.descriptionAr,
        campaignType: createForm.campaignType,
        governorateId: createForm.governorateId,
        meetingArea: createForm.meetingArea,
        meetingLat: createForm.meetingLat,
        meetingLng: createForm.meetingLng,
        date: createForm.date,
        startTime: createForm.startTime,
        durationHours: createForm.durationHours,
        volunteerCapacity: createForm.volunteerCapacity,
        targetTrees: createForm.targetTrees,
        wasteCollectedKg: createForm.wasteCollectedKg,
        isDraft: createForm.isDraft
      });

      setCreateStatusMsg(res.message);
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateStatusMsg(null);
      }, 1500);
    } catch (err: any) {
      setCreateStatusMsg(err?.message || 'فشل حفظ الحملة.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <section className="py-12 bg-nafas-ivory border-b border-nafas-reed/10 font-arabic text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-nafas-reed/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-nafas-blue">
              <Users className="w-4 h-4" />
              <span>العمل الميداني الجماعي — رئة العراق تتنفس</span>
            </div>
            <h2 className="text-3xl font-black text-nafas-silt mt-1">
              الحملات البيئية التطوعية
            </h2>
            <p className="text-sm text-nafas-neutral-slate mt-1 max-w-2xl">
              سواعد شباب العراق تجتمع لغرس الأشجار وتنظيف الأنهار وفرز النفايات وحماية التنوع الأحيائي لبلاد الرافدين.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Create Campaign (Organizers / Admins) */}
            {isOrganizerOrAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 rounded-xl bg-nafas-silt hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>إنشاء حملة بيئية جديدة</span>
              </button>
            )}

            {/* Governorate Filter */}
            <div className="flex items-center gap-2 bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-1.5 shadow-sm">
              <MapPin className="w-4 h-4 text-nafas-blue" />
              <select
                value={selectedGovId}
                onChange={(e) => setSelectedGovId(e.target.value)}
                className="text-xs font-bold bg-transparent text-nafas-silt focus:outline-none cursor-pointer"
                aria-label="تصفية بالمحافظة"
              >
                <option value="all">كل المحافظات (18)</option>
                {IRAQ_GOVERNORATES.map(gov => (
                  <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Campaign Type Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: 'كل المبادرات', icon: Sparkles },
            { id: 'reforestation', label: 'تشجير وتخضير', icon: Sprout },
            { id: 'river_protection', label: 'حماية الأنهر', icon: Waves },
            { id: 'cleanup', label: 'تنظيف بيئي', icon: Trash2 },
            { id: 'recycling', label: 'فرز وتدوير', icon: Recycle },
            { id: 'education', label: 'توعية بيئية', icon: BookOpen },
            { id: 'biodiversity', label: 'تنوع أحيائي', icon: Flower2 },
          ].map(tab => {
            const Icon = tab.icon;
            const active = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  active
                    ? 'bg-nafas-blue text-white border-nafas-blue shadow-sm'
                    : 'bg-nafas-sand/80 text-nafas-silt border-nafas-reed/15 hover:bg-nafas-sand'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-nafas-blue'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Campaign Cards Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="bg-nafas-cream/60 rounded-3xl p-10 border border-nafas-walnut/20 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-nafas-walnut/10 text-nafas-walnut flex items-center justify-center mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-nafas-ink">لا توجد حملات معلنة تطابق هذا التصفح</h3>
              <p className="text-xs text-nafas-walnut font-medium leading-relaxed">
                {selectedGovId !== 'all' || selectedType !== 'all'
                  ? 'لم يتم تسجيل مبادرات معتمدة بهذا النوع والمحافظة حالياً. يمكنك تصفح كافة المبادرات أو اقتراح حملة جديدة.'
                  : 'باب التطوع مفتوح للجميع. يتم اعتماد المبادرات الميدانية تباعاً والتأكد من خطط السلامة.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map(campaign => {
              const govName = IRAQ_GOVERNORATES.find(g => g.id === campaign.governorateId)?.nameAr || 'العراق';
              const spotsLeft = campaign.volunteerCapacity - campaign.registeredCount;
              const isFull = spotsLeft <= 0;
              const isRegistered = userRegisteredCampaignIds.includes(campaign.id);
              const typeBadge = getTypeBadge(campaign.campaignType || 'reforestation');
              const TypeIcon = typeBadge.icon;

              return (
                <div
                  key={campaign.id}
                  className="bg-nafas-sand rounded-3xl p-6 border border-nafas-reed/15 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    
                    {/* Top row: Type Badge + Governorate */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-sm ${typeBadge.bg}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        <span>{typeBadge.label}</span>
                      </span>

                      <span className="text-xs font-bold bg-nafas-ivory text-nafas-silt px-3 py-1 rounded-full border border-nafas-reed/10 flex items-center gap-1 shadow-sm">
                        <MapPin className="w-3.5 h-3.5 text-nafas-blue" />
                        <span>{govName}</span>
                      </span>
                    </div>

                    {/* Title and Short Description */}
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-black text-nafas-silt leading-snug">
                        {campaign.titleAr}
                      </h3>
                      <p className="text-xs text-nafas-neutral-slate line-clamp-2 leading-relaxed">
                        {campaign.descriptionAr}
                      </p>
                    </div>

                    {/* Metadata Box */}
                    <div className="space-y-2 text-xs text-nafas-neutral-slate border-t border-b border-nafas-reed/10 py-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-nafas-silt">
                          <Calendar className="w-3.5 h-3.5 text-nafas-blue" />
                          <span>{campaign.date} ({campaign.startTime})</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          <span>{campaign.durationHours} ساعات</span>
                        </span>
                      </div>

                      <div className="text-[11px] text-nafas-silt font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{campaign.meetingArea}</span>
                      </div>

                      <div className="text-[11px] text-nafas-blue flex items-center gap-1 font-semibold">
                        <Award className="w-3.5 h-3.5 text-nafas-blue shrink-0" />
                        <span>شهادة مشاركة رقمية معتمدة برمز QR وساعات رسمية</span>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-nafas-silt">
                          المسجلون: {campaign.registeredCount} من أصل {campaign.volunteerCapacity}
                        </span>
                        <span className={`font-bold ${isFull ? 'text-red-600' : 'text-nafas-blue'}`}>
                          {isFull ? 'اكتملت المقاعد' : `${spotsLeft} مقاعد متبقية`}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-nafas-ivory overflow-hidden border border-nafas-reed/10">
                        <div
                          className="h-full bg-nafas-blue rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (campaign.registeredCount / campaign.volunteerCapacity) * 100)}%` }}
                        />
                      </div>
                    </div>

                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-2 space-y-2">
                    {/* Registration State Button */}
                    {isRegistered ? (
                      <div className="space-y-2">
                        <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>أنت مسجل في هذه الحملة</span>
                          </span>
                          <button
                            onClick={() => cancelCampaignRegistration(campaign.id)}
                            className="text-[11px] text-red-600 hover:underline font-bold"
                          >
                            إلغاء الحجز
                          </button>
                        </div>

                        {/* Volunteer Field Check-In Button */}
                        <button
                          onClick={() => {
                            setCheckInModalCampaign(campaign);
                            setEnteredCheckInCode('');
                            setCheckInFeedback(null);
                            setCheckInSuccessCert(null);
                          }}
                          className="w-full py-2.5 rounded-xl bg-nafas-blue hover:bg-nafas-blue/90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>تأكيد الحضور الميداني (Check-In)</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={isFull}
                        onClick={() => {
                          if (!nafasAuth.isAuthenticated()) {
                            if (onRequireAuth) {
                              onRequireAuth('تسجيل التطوع في الحملات الميدانية يتطلب حساباً موثقاً لاحتساب ساعاتك البيئية وإصدار الشهادات.');
                            }
                            return;
                          }
                          setRegisterModalCampaign(campaign);
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow transition-all ${
                          isFull
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-nafas-blue hover:bg-nafas-blue/90 text-white active:scale-95'
                        }`}
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>{isFull ? 'اكتملت المقاعد' : t.registerNow}</span>
                      </button>
                    )}

                    {/* Details Trigger */}
                    <button
                      onClick={() => setDetailModalCampaign(campaign)}
                      className="w-full py-2 rounded-xl text-xs font-bold text-nafas-silt hover:bg-nafas-ivory border border-nafas-reed/20 flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>تفاصيل الحملة وموقع التجمع</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Organizer Actions */}
                    {isOrganizerOrAdmin && (
                      <button
                        onClick={() => {
                          setOrganizerActionCampaign(campaign);
                          setActiveOrganizerCode(null);
                          setIssuedCertFeedback(null);
                        }}
                        className="w-full py-2 rounded-xl text-[11px] font-bold border border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5 text-purple-700" />
                        <span>لوحة المنظم: رمز QR الميداني وتوثيق الحضور</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 1. Campaign Details Modal */}
      {detailModalCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-nafas-ivory w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-nafas-reed/20 space-y-5 animate-in fade-in zoom-in-95 text-right font-arabic max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-nafas-reed/20 pb-3">
              <button 
                onClick={() => setDetailModalCampaign(null)} 
                className="p-1 rounded-full hover:bg-gray-100 text-nafas-silt"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-black text-nafas-silt">
                تفاصيل الحملة البيئية
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-xs font-bold text-nafas-blue block mb-1">
                  {IRAQ_GOVERNORATES.find(g => g.id === detailModalCampaign.governorateId)?.nameAr}
                </span>
                <h4 className="text-2xl font-black text-nafas-silt">
                  {detailModalCampaign.titleAr}
                </h4>
              </div>

              <div className="p-4 bg-nafas-sand rounded-2xl border border-nafas-reed/15 space-y-2">
                <div className="font-bold text-sm text-nafas-silt">وصف المبادرة الميدانية:</div>
                <p className="text-nafas-neutral-slate leading-relaxed">
                  {detailModalCampaign.descriptionAr}
                </p>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-nafas-sand rounded-xl border border-nafas-reed/10 space-y-1">
                  <div className="font-bold text-nafas-silt flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-nafas-blue" />
                    <span>التاريخ والوقت:</span>
                  </div>
                  <div className="text-nafas-neutral-slate">
                    {detailModalCampaign.date} • {detailModalCampaign.startTime} ({detailModalCampaign.durationHours} ساعات)
                  </div>
                </div>

                <div className="p-3 bg-nafas-sand rounded-xl border border-nafas-reed/10 space-y-1">
                  <div className="font-bold text-nafas-silt flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-nafas-blue" />
                    <span>نقطة التجمع الميداني:</span>
                  </div>
                  <div className="text-nafas-neutral-slate">
                    {detailModalCampaign.meetingArea}
                  </div>
                </div>

                <div className="p-3 bg-nafas-sand rounded-xl border border-nafas-reed/10 space-y-1">
                  <div className="font-bold text-nafas-silt flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-nafas-blue" />
                    <span>الجهة المنظمة:</span>
                  </div>
                  <div className="text-nafas-neutral-slate">
                    {detailModalCampaign.organizer} ({detailModalCampaign.organizerRole})
                  </div>
                </div>

                <div className="p-3 bg-nafas-sand rounded-xl border border-nafas-reed/10 space-y-1">
                  <div className="font-bold text-nafas-silt flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-nafas-blue" />
                    <span>ساعات التطوع المعتمدة:</span>
                  </div>
                  <div className="text-nafas-neutral-slate">
                    {detailModalCampaign.durationHours} ساعة رسمية في جواز نَفَس
                  </div>
                </div>
              </div>

              {/* Safety Equipment Checklist */}
              {detailModalCampaign.safetyEquipment && detailModalCampaign.safetyEquipment.length > 0 && (
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>معدات السلامة والوقاية الميدانية المتوفرة:</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-amber-800 list-disc list-inside">
                    {detailModalCampaign.safetyEquipment.map((eq, i) => (
                      <li key={i}>{eq}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Partner Rewards Notice */}
              {detailModalCampaign.partnerRewardsNotice && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 leading-relaxed">
                  🎁 <strong>حوافز الشركاء البيئيين:</strong> {detailModalCampaign.partnerRewardsNotice}
                </div>
              )}

              {/* Modal Action */}
              <div className="pt-2">
                {userRegisteredCampaignIds.includes(detailModalCampaign.id) ? (
                  <button
                    onClick={() => {
                      cancelCampaignRegistration(detailModalCampaign.id);
                      setDetailModalCampaign(null);
                    }}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow transition-all"
                  >
                    إلغاء التسجيل في هذه الحملة وإتاحة المقعد
                  </button>
                ) : (
                  <button
                    disabled={detailModalCampaign.volunteerCapacity <= detailModalCampaign.registeredCount}
                    onClick={() => {
                      setRegisterModalCampaign(detailModalCampaign);
                      setDetailModalCampaign(null);
                    }}
                    className="w-full py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue/90 text-white font-bold text-xs shadow transition-all disabled:bg-gray-300"
                  >
                    حجز مقعد والتسجيل في المبادرة الآن
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Volunteer Registration Modal */}
      {registerModalCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-nafas-ivory w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-nafas-reed/15 space-y-5 animate-in fade-in zoom-in-95 text-right font-arabic">
            <div className="flex items-center justify-between border-b border-nafas-reed/20 pb-3">
              <button 
                onClick={() => setRegisterModalCampaign(null)} 
                className="p-1 rounded-full hover:bg-gray-100 text-nafas-silt"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black text-nafas-silt">
                تأكيد التسجيل في حملة التطوع
              </h3>
            </div>

            {regSuccessMessage ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-xl font-bold text-nafas-silt">{t.registeredSuccess}</h4>
                <p className="text-xs text-nafas-neutral-slate">
                  تم حجز مقعدك بنجاح. أُضيفت الحملة إلى جواز نَفَس الخاص بك.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="p-3 bg-nafas-sand rounded-xl text-xs space-y-1">
                  <div className="font-bold text-nafas-silt">{registerModalCampaign.titleAr}</div>
                  <div className="text-nafas-neutral-slate">الموعد: {registerModalCampaign.date} في {registerModalCampaign.meetingArea}</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-nafas-silt mb-1">
                    اسم المتطوع الكامل (لإصدار الشهادة الرقمية المعتمدة):
                  </label>
                  <input
                    type="text"
                    required
                    value={volunteerName}
                    onChange={(e) => setVolunteerName(e.target.value)}
                    className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2.5 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
                  />
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-nafas-reed/30 text-xs text-nafas-neutral-slate leading-relaxed">
                  🛡️ <strong>حماية الخصوصية:</strong> رقم هاتفك وبياناتك الشخصية مشفرة ولا تظهر للعامة. يتم تزويد منسق الحملة فقط بقائمة الأسماء للتحقق عند نقطة التجمع.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue text-nafas-ivory font-bold text-sm shadow transition-all active:scale-95"
                >
                  تأكيد المشاركة والانضمام للحملة
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. Volunteer Field Check-In Modal (Entering 6-digit Code) */}
      {checkInModalCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-nafas-ivory w-full max-w-md rounded-3xl p-6 shadow-2xl border border-nafas-reed/20 space-y-5 animate-in fade-in zoom-in-95 text-right font-arabic">
            <div className="flex items-center justify-between border-b border-nafas-reed/20 pb-3">
              <button 
                onClick={() => {
                  setCheckInModalCampaign(null);
                  setVolunteerCheckedInNotice(null);
                  setCheckInFeedback(null);
                }} 
                className="p-1 rounded-full hover:bg-gray-100 text-nafas-silt"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black text-nafas-silt flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-nafas-blue" />
                <span>التحقق الميداني وتثبيت الحضور</span>
              </h3>
            </div>

            {volunteerCheckedInNotice ? (
              <div className="p-6 text-center space-y-4">
                <ShieldCheck className="w-14 h-14 text-emerald-600 mx-auto" />
                <h4 className="text-xl font-bold text-nafas-silt">
                  تم تثبيت الحضور الميداني بنجاح!
                </h4>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 leading-relaxed font-bold">
                  {volunteerCheckedInNotice}
                </div>
                <p className="text-xs text-nafas-neutral-slate">
                  حالة تسجيلك الآن: <span className="text-emerald-700 font-bold">حاضر في الميدان</span>. سيتم اعتماد ساعات التطوع الموثقة وإصدار الشهادة الرسمية من قبل منسق الحملة.
                </p>
                <button
                  onClick={() => {
                    setCheckInModalCampaign(null);
                    setVolunteerCheckedInNotice(null);
                    setCheckInFeedback(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-nafas-silt text-white text-xs font-bold shadow"
                >
                  إغلاق النافذة
                </button>
              </div>
            ) : checkInSuccessCert ? (
              <div className="p-6 text-center space-y-4">
                <Award className="w-14 h-14 text-emerald-600 mx-auto" />
                <h4 className="text-xl font-bold text-nafas-silt">
                  تم تأكيد حضورك الميداني وتوثيق الساعات بنجاح!
                </h4>
                <div className="bg-nafas-sand p-3 rounded-2xl border border-nafas-reed/10 text-xs font-mono font-bold text-nafas-blue">
                  وثيقة الأثر: {checkInSuccessCert.verificationCode}
                </div>
                <p className="text-xs text-nafas-neutral-slate">
                  تمت إضافة {checkInSuccessCert.hoursAwarded} ساعة تطوع معتمدة إلى جواز نَفَس الخاص بك.
                </p>
                <button
                  onClick={() => {
                    if (onViewCertificate) onViewCertificate(checkInSuccessCert);
                    setCheckInModalCampaign(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-nafas-silt text-white text-xs font-bold shadow"
                >
                  معاينة الشهادة الرقمية الرسمية
                </button>
              </div>
            ) : (
              <form onSubmit={handleVolunteerCheckIn} className="space-y-4">
                <div className="p-3 bg-nafas-sand rounded-xl text-xs space-y-1">
                  <div className="font-bold text-nafas-silt">{checkInModalCampaign.titleAr}</div>
                  <div className="text-nafas-neutral-slate">الموقع: {checkInModalCampaign.meetingArea}</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-nafas-silt mb-1.5">
                    أدخل رمز الحضور الميداني المكون من 6 خانات (المعروض من قِبل منسق الحملة):
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="مثال: AB79K2"
                    value={enteredCheckInCode}
                    onChange={(e) => setEnteredCheckInCode(e.target.value.toUpperCase())}
                    className="w-full text-center text-lg font-mono font-bold tracking-widest bg-nafas-sand border border-nafas-reed/20 rounded-xl px-3 py-3 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
                  />
                </div>

                {checkInFeedback && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                    {checkInFeedback}
                  </div>
                )}

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 leading-relaxed">
                  🛡️ <strong>نزاهة التطوع:</strong> هذا الرمز مؤقت وصالح أثناء وقت الحملة فقط. يمنع التحقق التلقائي العشوائي ويضمن تسجيل الحضور لمن هم في الموقع الفعلي.
                </div>

                <button
                  type="submit"
                  disabled={checkInLoading || !enteredCheckInCode.trim()}
                  className="w-full py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue/90 text-white font-bold text-xs shadow transition-all active:scale-95 disabled:bg-gray-300"
                >
                  {checkInLoading ? 'جاري التحقق من الخادم...' : 'تثبيت الحضور واستلام وثيقة الأثر'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. Organizer Attendance & QR Code Modal */}
      {organizerActionCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-nafas-ivory w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-nafas-reed/15 space-y-5 animate-in fade-in zoom-in-95 text-right font-arabic max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-nafas-reed/20 pb-3">
              <button 
                onClick={() => { setOrganizerActionCampaign(null); setIssuedCertFeedback(null); }} 
                className="p-1 rounded-full hover:bg-gray-100 text-nafas-silt"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black text-nafas-silt">
                لوحة المنظم: التحقق الميداني واعتماد الحضور
              </h3>
            </div>

            {/* Dynamic Check-in Code Box */}
            <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-3xl space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-900">
                <QrCode className="w-4 h-4 text-purple-700" />
                <span>رمز التحقق الميداني الديناميكي (Live Field Token)</span>
              </div>

              {activeOrganizerCode ? (
                <div className="space-y-2">
                  <div className="text-4xl font-mono font-black tracking-widest text-purple-900 bg-white py-3 px-6 rounded-2xl border border-purple-200 shadow-sm inline-block">
                    {activeOrganizerCode}
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium">
                    يتم إبراز هذا الرمز للمتطوعين لتأكيد حضورهم في الموقع. الرمز مؤقت ومقاوم للتكرار.
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerateCheckInCode}
                  disabled={codeGenLoading}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow transition-all active:scale-95"
                >
                  {codeGenLoading ? 'جاري التوليد...' : 'توليد رمز حضور ميداني جديد'}
                </button>
              )}
            </div>

            {issuedCertFeedback ? (
              <div className="p-6 text-center space-y-4">
                <Award className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-xl font-bold text-nafas-silt">
                  تم إصدار الشهادة الرسمية وتوثيق الساعات!
                </h4>
                <div className="bg-nafas-sand p-3 rounded-xl text-xs font-mono font-bold text-nafas-blue">
                  رمز التحقق: {issuedCertFeedback.verificationCode}
                </div>
                <button
                  onClick={() => {
                    if (onViewCertificate) onViewCertificate(issuedCertFeedback);
                    setOrganizerActionCampaign(null);
                    setIssuedCertFeedback(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-nafas-silt text-white text-xs font-bold"
                >
                  معاينة الشهادة الرقمية المعتمدة
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyAttendanceSubmit} className="space-y-4 border-t border-nafas-reed/10 pt-4">
                <div className="text-xs font-bold text-nafas-silt">
                  أو يمكنك تسجيل حضور المتطوع يدوياً بالاسم:
                </div>

                <div>
                  <label className="block text-xs font-bold text-nafas-silt mb-1">
                    اسم المتطوع الحاضر:
                  </label>
                  <input
                    type="text"
                    required
                    value={attendeeNameInput}
                    onChange={(e) => setAttendeeNameInput(e.target.value)}
                    className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-nafas-silt mb-1">
                    ساعات التطوع الموثقة فعلياً:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={hoursInput}
                    onChange={(e) => setHoursInput(parseFloat(e.target.value) || 3.5)}
                    className="w-full text-xs font-mono bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue text-white font-bold text-sm shadow transition-all active:scale-95"
                >
                  تثبيت الحضور وإصدار الشهادة
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. Create Campaign Modal (Organizer / Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-nafas-ivory w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-nafas-reed/20 space-y-5 animate-in fade-in zoom-in-95 text-right font-arabic max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-nafas-reed/20 pb-3">
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-1 rounded-full hover:bg-gray-100 text-nafas-silt"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-black text-nafas-silt flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-nafas-blue" />
                <span>إطلاق حملة بيئية جديدة</span>
              </h3>
            </div>

            {createStatusMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
                {createStatusMsg}
              </div>
            )}

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-nafas-silt mb-1">عنوان الحملة (بالعربية):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: غرس 50 شجرة سدر على ضفاف نهر الفرات"
                  value={createForm.titleAr}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, titleAr: e.target.value }))}
                  className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-nafas-silt mb-1">نوع المبادرة البيئية:</label>
                  <select
                    value={createForm.campaignType}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, campaignType: e.target.value as CampaignType }))}
                    className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  >
                    <option value="reforestation">تشجير وتخضير</option>
                    <option value="river_protection">حماية الأنهر والمسطحات</option>
                    <option value="cleanup">تنظيف بيئي ورفع النفايات</option>
                    <option value="recycling">فرز وإعادة تدوير مجتمعي</option>
                    <option value="education">توعية بيئية وتدريب</option>
                    <option value="biodiversity">حماية التنوع الحيوي</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-nafas-silt mb-1">المحافظة:</label>
                  <select
                    value={createForm.governorateId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, governorateId: e.target.value }))}
                    className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  >
                    {IRAQ_GOVERNORATES.map(g => (
                      <option key={g.id} value={g.id}>{g.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-nafas-silt mb-1">وصف المبادرة وخطة العمل:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="اكتب أهداف الحملة، ما سيتم إنجازه، وما يحتاجه المتطوعون..."
                  value={createForm.descriptionAr}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, descriptionAr: e.target.value }))}
                  className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl p-3 text-nafas-silt"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-nafas-silt mb-1">تاريخ الحملة:</label>
                  <input
                    type="date"
                    required
                    value={createForm.date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  />
                </div>

                <div>
                  <label className="block font-bold text-nafas-silt mb-1">وقت التجمع:</label>
                  <input
                    type="text"
                    required
                    placeholder="09:00 ص"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  />
                </div>

                <div>
                  <label className="block font-bold text-nafas-silt mb-1">مدة الحملة (ساعات):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    value={createForm.durationHours}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, durationHours: parseFloat(e.target.value) || 3.5 }))}
                    className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-nafas-silt mb-1">نقطة التجمع الميدانية التفصيلية:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: البصرة — كورنيش العشار، قرب مدخل الميناء التراثي"
                  value={createForm.meetingArea}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, meetingArea: e.target.value }))}
                  className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-nafas-silt mb-1">الحد الأقصى للمتطوعين:</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={createForm.volunteerCapacity}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, volunteerCapacity: parseInt(e.target.value) || 30 }))}
                    className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  />
                </div>

                <div>
                  <label className="block font-bold text-nafas-silt mb-1">
                    {createForm.campaignType === 'reforestation' ? 'الأشجار المستهدفة:' : 'النفايات المستهدفة (كغم):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.campaignType === 'reforestation' ? createForm.targetTrees : createForm.wasteCollectedKg}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (createForm.campaignType === 'reforestation') {
                        setCreateForm(prev => ({ ...prev, targetTrees: val }));
                      } else {
                        setCreateForm(prev => ({ ...prev, wasteCollectedKg: val }));
                      }
                    }}
                    className="w-full bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={createLoading}
                  onClick={() => setCreateForm(prev => ({ ...prev, isDraft: false }))}
                  className="flex-1 py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue/90 text-white font-bold text-xs shadow transition-all active:scale-95 disabled:bg-gray-300"
                >
                  {createLoading ? 'جاري الحفظ...' : 'نشر الحملة وإتاحتها للتسجيل'}
                </button>

                <button
                  type="button"
                  disabled={createLoading}
                  onClick={(e) => {
                    setCreateForm(prev => ({ ...prev, isDraft: true }));
                    handleCreateCampaignSubmit(e);
                  }}
                  className="px-4 py-3 rounded-xl border border-nafas-reed/20 bg-nafas-sand hover:bg-nafas-ivory text-nafas-silt font-bold text-xs transition-colors"
                >
                  حفظ كمسودة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};
