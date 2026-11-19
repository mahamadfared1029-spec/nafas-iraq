'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { IRAQ_GOVERNORATES, CATEGORY_INFO } from '@/lib/constants';
import { PollutionCategory, SeverityLevel } from '@/types';
import { 
  X, 
  MapPin, 
  Camera, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  Sparkles, 
  UploadCloud 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords?: { lat: number; lng: number; governorateId: string } | null;
}

export const ReportSubmissionModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  initialCoords
}) => {
  const { addReport, t, passport } = useNafas();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [governorateId, setGovernorateId] = useState<string>(initialCoords?.governorateId || 'baghdad');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [category, setCategory] = useState<PollutionCategory>('garbage');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [reportedBy, setReportedBy] = useState<string>(passport.userName);
  const [imagePreview, setImagePreview] = useState<string>('https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80');
  const [isHazardousDetected, setIsHazardousDetected] = useState<boolean>(false);
  const [submittedTracking, setSubmittedTracking] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  // Real-time hazard keywords detection
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    const hazardKeywords = ['كيميائي', 'سام', 'إطارات', 'طبي', 'حقن', 'أسلاك', 'مستشفى', 'بطاريات', 'غاز', 'حريق'];
    const hasHazard = hazardKeywords.some(k => val.includes(k)) || category === 'burning';
    setIsHazardousDetected(hasHazard);
  };

  const handleCategoryChange = (cat: PollutionCategory) => {
    setCategory(cat);
    const catData = CATEGORY_INFO[cat];
    if (catData?.isHazardTrigger || cat === 'burning') {
      setIsHazardousDetected(true);
    } else {
      const hazardKeywords = ['كيميائي', 'سام', 'إطارات', 'طبي', 'حقن', 'أسلاك', 'مستشفى', 'بطاريات', 'غاز'];
      setIsHazardousDetected(hazardKeywords.some(k => description.includes(k)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedGov = IRAQ_GOVERNORATES.find(g => g.id === governorateId) || IRAQ_GOVERNORATES[0];
    const lat = initialCoords?.lat || (selectedGov.lat + (Math.random() - 0.5) * 0.05);
    const lng = initialCoords?.lng || (selectedGov.lng + (Math.random() - 0.5) * 0.05);

    const report = addReport({
      title: title || `${CATEGORY_INFO[category].labelAr} في ${neighborhood || selectedGov.nameAr}`,
      description: description || 'تم تسجيل البلاغ الميداني مع إحداثيات الموقع وصور الحالة الأولية.',
      category,
      severity,
      governorateId,
      neighborhood: neighborhood || selectedGov.nameAr,
      lat,
      lng,
      imageBeforeUrl: imagePreview,
      reportedBy: isAnonymous ? 'مواطن مجهول' : reportedBy,
      isAnonymous,
      isHazardous: isHazardousDetected
    });

    setSubmittedTracking(report.trackingNumber);
    setStep(3);

    // Fire celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (_) {}
  };

  const copyTrackingToClipboard = () => {
    if (submittedTracking) {
      navigator.clipboard.writeText(submittedTracking);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-midnight/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-nafas-midnight/15 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header */}
        <div className="bg-nafas-limestone px-6 py-4 border-b border-nafas-midnight/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-nafas-mist/50 text-nafas-midnight transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-black text-nafas-midnight text-lg">
              {step === 3 ? 'تم تأكيد البلاغ بنجاح' : 'تسجيل بلاغ بيئي ميداني'}
            </span>
            <AlertTriangle className="w-5 h-5 text-nafas-clay" />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {step === 3 ? (
            /* Step 3: Success Screen */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-nafas-midnight">
                  {t.submitSuccessTitle}
                </h3>
                <p className="text-sm text-nafas-neutral-slate max-w-md mx-auto">
                  {t.submitSuccessMessage}
                </p>
              </div>

              {/* Tracking Code Box */}
              <div className="bg-nafas-limestone border-2 border-dashed border-nafas-clay/50 rounded-2xl p-5 max-w-sm mx-auto space-y-2">
                <span className="text-xs text-nafas-neutral-slate font-bold block">
                  رقم التتبع الميداني الخاص بك:
                </span>
                <div className="text-2xl font-mono font-black text-nafas-clay tracking-wider">
                  {submittedTracking}
                </div>
                <button
                  onClick={copyTrackingToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-nafas-midnight text-white text-xs font-bold flex items-center gap-1.5 mx-auto hover:bg-nafas-midnight/90 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'تم النسخ!' : 'نسخ رقم التتبع'}</span>
                </button>
              </div>

              {/* Safety notice if hazardous */}
              {isHazardousDetected && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs max-w-md mx-auto text-right">
                  <strong>تنبيه السلامة:</strong> نظراً لاحتواء البلاغ على مخلفات قد تكون خطرة أو حارقة، تم إحالة الإحداثيات تلقائياً إلى فرق الدفاع المدني والبلدية المختصة.
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full max-w-xs py-3 rounded-xl bg-nafas-clay-dark hover:bg-nafas-clay text-white font-bold text-sm shadow transition-colors"
              >
                العودة إلى الخريطة التفاعلية
              </button>
            </div>
          ) : (
            /* Steps 1 & 2 Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold text-nafas-midnight mb-2">
                  1. نوع المشكلة البيئية المرصودة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(CATEGORY_INFO).map(([catKey, info]) => (
                    <button
                      type="button"
                      key={catKey}
                      onClick={() => handleCategoryChange(catKey as PollutionCategory)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-right border transition-all flex flex-col justify-between ${
                        category === catKey
                          ? 'border-nafas-clay bg-nafas-clay/10 text-nafas-midnight ring-2 ring-nafas-clay/20'
                          : 'border-gray-200 hover:border-nafas-midnight/30 text-nafas-neutral-slate'
                      }`}
                    >
                      <span>{info.labelAr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CRITICAL SAFETY WARNING BANNER IF HAZARDOUS DETECTED */}
              {isHazardousDetected && (
                <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-950 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-black text-sm text-red-700">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{t.hazardousWarningTitle}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-red-800">
                    {t.hazardousWarningDesc}
                  </p>
                  <div className="text-[11px] font-bold text-red-900 bg-red-100 p-2 rounded-lg">
                    📞 الدفاع المدني العراقي: 115 (اتصال مجاني وفوري)
                  </div>
                </div>
              )}

              {/* Governorate and Neighborhood */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-nafas-midnight mb-1">
                    2. المحافظة:
                  </label>
                  <select
                    value={governorateId}
                    onChange={(e) => setGovernorateId(e.target.value)}
                    className="w-full text-xs font-arabic bg-nafas-limestone border border-nafas-midnight/15 rounded-xl px-3 py-2.5 text-nafas-midnight focus:outline-none focus:ring-2 focus:ring-nafas-clay"
                  >
                    {IRAQ_GOVERNORATES.map(gov => (
                      <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-nafas-midnight mb-1">
                    الحي / الشارع أو المعلم القريب:
                  </label>
                  <input
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="مثال: الكرادة / شارع المسبح"
                    className="w-full text-xs font-arabic bg-nafas-limestone border border-nafas-midnight/15 rounded-xl px-3 py-2.5 text-nafas-midnight focus:outline-none focus:ring-2 focus:ring-nafas-clay"
                  />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-nafas-midnight mb-1">
                    عنوان مختصر للمشكلة:
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تراكم مخلفات بلاستيكية تعيق مجرى النهر"
                    className="w-full text-xs font-arabic bg-nafas-limestone border border-nafas-midnight/15 rounded-xl px-3 py-2.5 text-nafas-midnight focus:outline-none focus:ring-2 focus:ring-nafas-clay"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-nafas-midnight mb-1">
                    تفاصيل إضافية ووصف المشكلة:
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="صف حجم التراكم، المخاطر المترتبة، وإذا كان هناك حرق أو روائح منبعثة..."
                    className="w-full text-xs font-arabic bg-nafas-limestone border border-nafas-midnight/15 rounded-xl px-3 py-2 text-nafas-midnight focus:outline-none focus:ring-2 focus:ring-nafas-clay"
                  />
                </div>
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className="block text-xs font-bold text-nafas-midnight mb-1">
                  صورة ميدانية توثيقية (أقل من 5 ميغابايت):
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center bg-nafas-limestone/50 flex flex-col items-center justify-center gap-2">
                  <img
                    src={imagePreview}
                    alt="معاينة الصورة"
                    className="w-32 h-20 object-cover rounded-xl border border-gray-200 shadow-sm"
                  />
                  <span className="text-[11px] text-nafas-neutral-slate">
                    تم تضمين صورة نموذجية أولية للمعاينة (الحد الأقصى 5MB - JPG/PNG/WebP)
                  </span>
                </div>
              </div>

              {/* Privacy and Anonymous Toggle */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <span className="text-xs text-nafas-neutral-slate font-arabic">
                  {t.anonymousSubmit}
                </span>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-nafas-clay rounded border-gray-300 focus:ring-nafas-clay"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-nafas-clay-dark hover:bg-nafas-clay text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
              >
                تأكيد وإرسال البلاغ الميداني
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};
