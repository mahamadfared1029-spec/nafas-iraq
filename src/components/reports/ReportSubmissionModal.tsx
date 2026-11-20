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
  UploadCloud,
  Navigation,
  Loader2,
  Trash2
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
  
  // Real location state (no random math)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    if (initialCoords?.lat && initialCoords?.lng) {
      return { lat: initialCoords.lat, lng: initialCoords.lng };
    }
    const gov = IRAQ_GOVERNORATES.find(g => g.id === (initialCoords?.governorateId || 'baghdad')) || IRAQ_GOVERNORATES[0];
    return { lat: gov.lat, lng: gov.lng };
  });
  const [locationSource, setLocationSource] = useState<'gps' | 'manual_picker' | 'initial_coords'>(
    initialCoords ? 'initial_coords' : 'manual_picker'
  );
  const [accuracyM, setAccuracyM] = useState<number | undefined>(initialCoords ? 15 : 5000);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  // Real image upload state (no stock photo fallbacks)
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageFileSize, setImageFileSize] = useState<number>(0);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isHazardousDetected, setIsHazardousDetected] = useState<boolean>(false);
  const [submittedTracking, setSubmittedTracking] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleGovernorateChange = (newGovId: string) => {
    setGovernorateId(newGovId);
    // If location is manual picker, update coordinates to selected governorate center
    if (locationSource === 'manual_picker') {
      const gov = IRAQ_GOVERNORATES.find(g => g.id === newGovId);
      if (gov) {
        setCoords({ lat: gov.lat, lng: gov.lng });
        setAccuracyM(5000);
      }
    }
  };

  // Real device GPS acquisition
  const handleAcquireGPS = () => {
    if (!navigator.geolocation) {
      setGpsMessage('جهازك لا يدعم خاصية تحديد الموقع الجغرافي GPS.');
      return;
    }
    setGpsLoading(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        // Verify coordinates are approximately within Iraqi territorial extent (lat 29-38, lng 38-49)
        if (latitude < 28.5 || latitude > 38.5 || longitude < 38.0 || longitude > 49.5) {
          setGpsMessage('الموقع المقروء خارج النطاق الجغرافي للعراق. تم الاحتفاظ بمركز المحافظة.');
          setGpsLoading(false);
          return;
        }
        setCoords({ lat: Number(latitude.toFixed(6)), lng: Number(longitude.toFixed(6)) });
        setAccuracyM(Math.round(accuracy));
        setLocationSource('gps');
        setGpsMessage(`تم التقاط الإحداثيات بنجاح بدقة ±${Math.round(accuracy)} متر.`);
        setGpsLoading(false);
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === 1) {
          setGpsMessage('تم رفض الإذن لتحديد الموقع. يمكنك استخدام مركز المحافظة أو الإحداثيات اليدوية.');
        } else if (error.code === 2) {
          setGpsMessage('تعذر التقاط إشارة GPS حالياً. يرجى التأكد من تشغيل خدمات الموقع.');
        } else {
          setGpsMessage('انتهت مهلة طلب الموقع. تم استخدام مركز المحافظة المحددة.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  // Real device image file upload and validation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);
    if (!file) return;

    // Allowed mime types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.');
      return;
    }

    // Size limit: 5 MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError('حجم الصورة يتجاوز الحد المسموح به (5 ميغابايت). يرجى تقليل حجمها.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setImageFileName(file.name);
      setImageFileSize(file.size);
    };
    reader.onerror = () => {
      setImageError('فشلت قراءة ملف الصورة. يرجى المحاولة مجدداً.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setImageFileName('');
    setImageFileSize(0);
    setImageError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const selectedGov = IRAQ_GOVERNORATES.find(g => g.id === governorateId) || IRAQ_GOVERNORATES[0];
    
    // Explicit coordinates check - strictly NO Math.random()
    const finalLat = coords?.lat ?? selectedGov.lat;
    const finalLng = coords?.lng ?? selectedGov.lng;

    if (finalLat < 28.5 || finalLat > 38.5 || finalLng < 38.0 || finalLng > 49.5) {
      setFormError('إحداثيات البلاغ خارج النطاق الجغرافي للعراق.');
      return;
    }

    const report = addReport({
      title: title || `${CATEGORY_INFO[category].labelAr} في ${neighborhood || selectedGov.nameAr}`,
      description: description || 'تم تسجيل البلاغ الميداني مع إحداثيات الموقع وصور الحالة الأولية.',
      category,
      severity,
      governorateId,
      neighborhood: neighborhood || selectedGov.nameAr,
      lat: finalLat,
      lng: finalLng,
      location_source: locationSource,
      accuracy_m: accuracyM,
      source_layer_version: 'gbOpen-IRQ-ADM1-2022',
      imageBeforeUrl: imagePreview, // Real user image or empty string - strictly NO stock photos
      imageBeforeName: imageFileName || undefined,
      imageBeforeSize: imageFileSize || undefined,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-nafas-silt/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="relative bg-nafas-ivory w-full max-w-2xl rounded-3xl shadow-2xl border border-nafas-reed/15 overflow-hidden animate-in fade-in zoom-in-95 text-right font-arabic"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header */}
        <div className="bg-nafas-sand px-6 py-4 border-b border-nafas-reed/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-nafas-misty/50 text-nafas-silt transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-black text-nafas-silt text-lg">
              {step === 3 ? 'تم تأكيد البلاغ بنجاح' : 'تسجيل بلاغ بيئي ميداني'}
            </span>
            <AlertTriangle className="w-5 h-5 text-nafas-blue" />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {step === 3 ? (
            /* Step 3: Success Screen */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-nafas-misty text-nafas-blue flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-nafas-silt">
                  {t.submitSuccessTitle}
                </h3>
                <p className="text-sm text-nafas-neutral-slate max-w-md mx-auto">
                  {t.submitSuccessMessage}
                </p>
              </div>

              {/* Tracking Code Box */}
              <div className="bg-nafas-sand border-2 border-dashed border-nafas-blue/50 rounded-2xl p-5 max-w-sm mx-auto space-y-2">
                <span className="text-xs text-nafas-neutral-slate font-bold block">
                  رقم التتبع الميداني الخاص بك:
                </span>
                <div className="text-2xl font-mono font-black text-nafas-blue tracking-wider">
                  {submittedTracking}
                </div>
                <button
                  onClick={copyTrackingToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-nafas-silt text-nafas-ivory text-xs font-bold flex items-center gap-1.5 mx-auto hover:bg-nafas-silt/90 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'تم النسخ!' : 'نسخ رقم التتبع'}</span>
                </button>
              </div>

              {/* Truthful Status & Safety Notice (Replacing unsupported auto-referral claim) */}
              <div className="bg-amber-50/80 border border-amber-200/80 text-amber-900 p-4 rounded-2xl text-xs max-w-md mx-auto text-right space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>حالة المتابعة الميدانية:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900">
                  تم استلام البلاغ داخل نَفَس للمراجعة، ولم تُؤكَّد إحالته إلى جهة رسمية بعد.
                </p>
                {isHazardousDetected && (
                  <p className="text-[11px] font-bold text-red-700 pt-1 border-t border-amber-200/60">
                    ⚠️ نظراً لاحتواء البلاغ على مواد أو مخلفات قد تكون خطرة، يُمنع اقتراب المتطوعين أو لمسها، ويرجى الاتصال بالدفاع المدني (115) للحالات الطارئة.
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full max-w-xs py-3 rounded-xl bg-nafas-blue hover:bg-nafas-blue text-nafas-ivory font-bold text-sm shadow transition-colors"
              >
                العودة إلى الخريطة التفاعلية
              </button>
            </div>
          ) : (
            /* Steps 1 & 2 Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold text-nafas-silt mb-2">
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
                          ? 'border-nafas-blue bg-nafas-blue/10 text-nafas-silt ring-2 ring-nafas-blue/20'
                          : 'border-nafas-reed/30 hover:border-nafas-reed/30 text-nafas-neutral-slate'
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
                  <label className="block text-xs font-bold text-nafas-silt mb-1">
                    2. المحافظة:
                  </label>
                  <select
                    value={governorateId}
                    onChange={(e) => handleGovernorateChange(e.target.value)}
                    className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2.5 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
                  >
                    {IRAQ_GOVERNORATES.map(gov => (
                      <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-nafas-silt mb-1">
                    الحي / الشارع أو المعلم القريب:
                  </label>
                  <input
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="مثال: الكرادة / شارع المسبح"
                    className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2.5 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
                  />
                </div>
              </div>

              {/* Geolocation Section (No Random Coordinates) */}
              <div className="bg-nafas-sand/50 p-4 rounded-2xl border border-nafas-reed/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-nafas-silt flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-nafas-blue" />
                    <span>إحداثيات الموقع الميداني:</span>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    locationSource === 'gps' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : locationSource === 'initial_coords' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {locationSource === 'gps' ? 'GPS جهاز دقيق' : locationSource === 'initial_coords' ? 'نقر الخريطة' : 'مركز المحافظة'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 text-xs font-mono bg-white px-3 py-2 rounded-xl border border-nafas-reed/30 text-nafas-silt">
                    {coords ? `${coords.lat.toFixed(5)}°N, ${coords.lng.toFixed(5)}°E (${accuracyM ? '±' + accuracyM + 'م' : 'تقريبي'})` : 'لم تُحدد الإحداثيات'}
                  </div>

                  <button
                    type="button"
                    onClick={handleAcquireGPS}
                    disabled={gpsLoading}
                    className="px-3.5 py-2 rounded-xl bg-nafas-blue hover:bg-nafas-blue text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {gpsLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جارٍ الالتقاط...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5" />
                        <span>التقاط GPS الحالي</span>
                      </>
                    )}
                  </button>
                </div>

                {gpsMessage && (
                  <p className="text-[11px] text-nafas-silt/80">{gpsMessage}</p>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-nafas-silt mb-1">
                    عنوان مختصر للمشكلة:
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تراكم مخلفات بلاستيكية تعيق مجرى النهر"
                    className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2.5 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-nafas-silt mb-1">
                    تفاصيل إضافية ووصف المشكلة:
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="صف حجم التراكم، المخاطر المترتبة، وإذا كان هناك حرق أو روائح منبعثة..."
                    className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
                  />
                </div>
              </div>

              {/* Real Photo Upload Area (No Stock Photos) */}
              <div>
                <label className="block text-xs font-bold text-nafas-silt mb-1">
                  صورة ميدانية توثيقية من هاتفك أو جهازك (JPG/PNG/WebP حتى 5MB):
                </label>
                
                {imagePreview ? (
                  <div className="relative rounded-2xl border-2 border-nafas-blue/30 bg-nafas-sand/40 p-3 flex items-center justify-between gap-3">
                    <img
                      src={imagePreview}
                      alt="معاينة الصورة المرفوعة"
                      className="w-24 h-16 object-cover rounded-xl border border-nafas-reed/30 shadow-xs"
                    />
                    <div className="flex-1 text-right text-xs">
                      <p className="font-bold text-nafas-silt truncate max-w-[200px]">{imageFileName || 'صورة_ميدانية.jpg'}</p>
                      <p className="text-[11px] text-nafas-neutral-slate">{(imageFileSize / 1024).toFixed(1)} كيلوبايت · توثيق أصلي</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                      title="حذف الصورة"
                      aria-label="حذف الصورة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-nafas-reed/40 hover:border-nafas-blue/60 rounded-2xl p-5 text-center bg-nafas-sand/40 hover:bg-nafas-sand/70 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-nafas-blue group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-nafas-blue block">اضغط لاختيار صورة أو التقاطها بكاميرا الهاتف</span>
                      <span className="text-[10px] text-nafas-neutral-slate">لا يتم استبدال الصور المفقودة بصور مزيفة</span>
                    </div>
                  </label>
                )}

                {imageError && (
                  <p className="text-xs text-red-600 mt-1.5 font-bold">{imageError}</p>
                )}
              </div>

              {/* Privacy and Anonymous Toggle */}
              <div className="p-3 bg-gray-50 rounded-xl border border-nafas-reed/30 flex items-center justify-between">
                <span className="text-xs text-nafas-neutral-slate font-arabic">
                  {t.anonymousSubmit}
                </span>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-nafas-blue rounded border-nafas-reed/40 focus:ring-nafas-blue"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
                  {formError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-nafas-blue hover:bg-nafas-blue text-nafas-ivory font-bold text-sm shadow-md hover:shadow-lg transition-all"
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
