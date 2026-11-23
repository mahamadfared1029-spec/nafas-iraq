'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import { VolunteerCampaign, IssuedCertificate } from '@/types';
import { nafasAuth } from '@/lib/auth/authService';
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
  CheckSquare 
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
    passport 
  } = useNafas();

  const [selectedGovId, setSelectedGovId] = useState<string>('all');
  const [registerModalCampaign, setRegisterModalCampaign] = useState<VolunteerCampaign | null>(null);
  const [volunteerName, setVolunteerName] = useState(passport.userName);
  const [regSuccessMessage, setRegSuccessMessage] = useState(false);
  const [organizerActionCampaign, setOrganizerActionCampaign] = useState<VolunteerCampaign | null>(null);
  const [attendeeNameInput, setAttendeeNameInput] = useState('سجاد العبيدي');
  const [hoursInput, setHoursInput] = useState(3.5);
  const [issuedCertFeedback, setIssuedCertFeedback] = useState<IssuedCertificate | null>(null);

  const filteredCampaigns = campaigns.filter(c => 
    selectedGovId === 'all' || c.governorateId === selectedGovId
  );

  const isOrganizerOrAdmin = role === 'organizer' || role === 'admin';

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerModalCampaign) return;

    const ok = registerForCampaign(registerModalCampaign.id, volunteerName);
    if (ok) {
      setRegSuccessMessage(true);
      setTimeout(() => {
        setRegSuccessMessage(false);
        setRegisterModalCampaign(null);
      }, 2000);
    }
  };

  const handleVerifyAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizerActionCampaign) return;

    const cert = verifyAttendance(organizerActionCampaign.id, attendeeNameInput, hoursInput);
    setIssuedCertFeedback(cert);
  };

  return (
    <section className="py-12 bg-nafas-ivory border-b border-nafas-reed/10 font-arabic text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-nafas-blue">
              <Users className="w-4 h-4" />
              <span>العمل الميداني الجماعي</span>
            </div>
            <h2 className="text-3xl font-black text-nafas-silt mt-1">
              {t.campaignsNav}
            </h2>
            <p className="text-sm text-nafas-neutral-slate">
              سواعد شباب العراق تجتمع لغرس الأشجار وتنظيف الأنهار وحماية التراث الطبيعي لبلاد الرافدين.
            </p>
          </div>

          {/* Governorate Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-nafas-neutral-slate whitespace-nowrap">
              تصفية بالمحافظة:
            </label>
            <select
              value={selectedGovId}
              onChange={(e) => setSelectedGovId(e.target.value)}
              className="text-xs bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
            >
              <option value="all">كل المحافظات</option>
              {IRAQ_GOVERNORATES.map(gov => (
                <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campaign Cards Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="bg-nafas-cream/60 rounded-3xl p-10 border border-nafas-walnut/20 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-nafas-walnut/10 text-nafas-walnut flex items-center justify-center mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-nafas-ink">لا توجد حملات ميدانية معلنة حالياً</h3>
              <p className="text-xs text-nafas-walnut font-medium leading-relaxed">
                {selectedGovId !== 'all' 
                  ? 'لم يتم تسجيل حملات معتمدة في هذه المحافظة حتى الآن. يمكنك استعراض كل المحافظات أو اقتراح حملة جديدة.'
                  : 'باب التطوع مفتوح للجميع. المنصة في مرحلة الانطلاق الميداني، وسيتم إعلان المبادرات التطوعية تباعاً فور اعتمادها رسمياً.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map(campaign => {
            const govName = IRAQ_GOVERNORATES.find(g => g.id === campaign.governorateId)?.nameAr || 'العراق';
            const spotsLeft = campaign.volunteerCapacity - campaign.registeredCount;
            const isFull = spotsLeft <= 0;

            return (
              <div
                key={campaign.id}
                className="bg-nafas-sand rounded-3xl p-6 border border-nafas-reed/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  
                  {/* Governorate and Target pill */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold bg-nafas-ivory text-nafas-silt px-3 py-1 rounded-full border border-nafas-reed/10 flex items-center gap-1.5 shadow-sm">
                      <MapPin className="w-3.5 h-3.5 text-nafas-blue" />
                      <span>{govName}</span>
                    </span>
                    
                    {campaign.targetTrees > 0 && (
                      <span className="text-xs font-mono font-bold bg-nafas-misty text-nafas-blue px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sprout className="w-3.5 h-3.5 text-nafas-blue" />
                        <span>{campaign.targetTrees} شتلة</span>
                      </span>
                    )}
                  </div>

                  {/* Title and Description */}
                  <div>
                    <h3 className="text-lg font-black text-nafas-silt leading-snug">
                      {campaign.titleAr}
                    </h3>
                    <p className="text-xs text-nafas-neutral-slate mt-2 line-clamp-2 leading-relaxed">
                      {campaign.descriptionAr}
                    </p>
                  </div>

                  {/* Metadata List */}
                  <div className="space-y-2 text-xs text-nafas-neutral-slate border-t border-b border-nafas-reed/10 py-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-nafas-blue" />
                        <span>{campaign.date} ({campaign.startTime})</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-nafas-silt/70y" />
                        <span>{campaign.durationHours} ساعات</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-nafas-silt font-medium">
                      📍 {campaign.meetingArea}
                    </div>

                    <div className="text-[11px] text-nafas-blue flex items-center gap-1 font-semibold">
                      <Award className="w-3.5 h-3.5 text-nafas-blue" />
                      <span>شهادة مشاركة رقمية معتمدة برمز QR</span>
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
                <div className="pt-4 mt-2 space-y-2">
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
                        : 'bg-nafas-blue hover:bg-nafas-blue text-white active:scale-95'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isFull ? 'قائمة الانتظار مغلقة' : t.registerNow}</span>
                  </button>

                  {/* Organizer Check-in Trigger */}
                  {isOrganizerOrAdmin && (
                    <button
                      onClick={() => setOrganizerActionCampaign(campaign)}
                      className="w-full py-2 rounded-xl text-xs font-bold border border-nafas-reed text-nafas-silt hover:bg-nafas-ivory flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-nafas-blue" />
                      <span>تسجيل حضور المتطوعين وإصدار الشهادات (المنظم)</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
        )}

      </div>

      {/* Volunteer Registration Modal */}
      {registerModalCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-nafas-ivory w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-nafas-reed/15 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-nafas-reed/20 pb-3">
              <button onClick={() => setRegisterModalCampaign(null)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-nafas-silt" />
              </button>
              <h3 className="text-lg font-black text-nafas-silt">
                تأكيد التسجيل في حملة التطوع
              </h3>
            </div>

            {regSuccessMessage ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-nafas-blue mx-auto" />
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
                    اسم المتطوع الكامل (لإصدار الشهادة):
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
                  className="w-full py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue text-nafas-ivory font-bold text-sm shadow"
                >
                  تأكيد المشاركة والانضمام للحملة
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Organizer Attendance & Certificate Modal */}
      {organizerActionCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-nafas-ivory w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-nafas-reed/15 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-nafas-reed/20 pb-3">
              <button onClick={() => { setOrganizerActionCampaign(null); setIssuedCertFeedback(null); }} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-nafas-silt" />
              </button>
              <h3 className="text-lg font-black text-nafas-silt">
                لوحة المنظم: تأكيد الحضور وإصدار الشهادة
              </h3>
            </div>

            {issuedCertFeedback ? (
              <div className="p-6 text-center space-y-4">
                <Award className="w-12 h-12 text-nafas-blue mx-auto" />
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
                  className="w-full py-2.5 rounded-xl bg-nafas-silt text-nafas-ivory text-xs font-bold"
                >
                  معاينة الشهادة الرقمية المعتمدة
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyAttendanceSubmit} className="space-y-4">
                <div className="text-xs text-nafas-neutral-slate">
                  بصفتك منسقاً معتمداً، يمكنك تثبيت حضور المتطوعين فعلياً في الميدان لمنحهم ساعات التطوع وإصدار الشهادة الرقمية المعتمدة.
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
                  className="w-full py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue-dark text-nafas-ivory font-bold text-sm shadow"
                >
                  تثبيت الحضور وإصدار الشهادة برمز QR
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </section>
  );
};
