'use client';

import React from 'react';
import { PlantRecord, HazardRecord, SourceRecord } from '@/types/plants';
import { getPlantHazard, botanicalData } from '@/lib/plantSearch';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  BookOpen, 
  Info, 
  HeartHandshake, 
  Flame, 
  Eye, 
  Hand, 
  PawPrint, 
  Baby, 
  Wheat, 
  Sprout, 
  MapPin,
  Calendar
} from 'lucide-react';

interface PlantDetailModalProps {
  plant: PlantRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTriageWithPlant?: (plantId: string) => void;
}

export const PlantDetailModal: React.FC<PlantDetailModalProps> = ({
  plant,
  isOpen,
  onClose,
  onOpenTriageWithPlant
}) => {
  if (!isOpen || !plant) return null;

  const hazard: HazardRecord | undefined = getPlantHazard(plant.id);

  // Helper to fetch source info
  const getSource = (sourceId: string): SourceRecord | undefined => {
    return botanicalData.sources.find(s => s.id === sourceId);
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return { label: 'شديد السمية والخطورة', bg: 'bg-red-50 text-red-700 border-red-300' };
      case 'high':
        return { label: 'عالي الخطورة', bg: 'bg-orange-50 text-orange-700 border-orange-300' };
      case 'moderate':
        return { label: 'متوسط الخطورة (مهيّج)', bg: 'bg-amber-50 text-amber-700 border-amber-300' };
      case 'low':
        return { label: 'منخفض الخطورة / تحسسي', bg: 'bg-blue-50 text-blue-700 border-blue-300' };
      default:
        return { label: 'التقييم غير متوفر / قيد المراجعة', bg: 'bg-stone-100 text-stone-700 border-stone-300' };
    }
  };

  const severityBadge = getSeverityBadge(hazard?.severity || plant.hazards?.severity);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-arabic text-right animate-fadeIn">
      <div 
        className="relative bg-nafas-ivory rounded-3xl max-w-3xl w-full border border-nafas-reed/20 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plant-detail-title"
      >
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-nafas-reed/15 flex items-center justify-between bg-stone-50/80">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 transition-colors focus:ring-2 focus:ring-nafas-blue outline-none"
            aria-label="إغلاق التفاصيل"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 ${severityBadge.bg}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{severityBadge.label}</span>
            </span>

            {plant.review_status === 'hold_distribution_review' && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                حجب التوزع للمراجعة
              </span>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 text-stone-800">
          
          {/* Main Title & Latin Taxon */}
          <div className="space-y-2 border-b border-stone-200 pb-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 id="plant-detail-title" className="text-2xl sm:text-3xl font-black text-nafas-silt">
                  {plant.locale?.common_names?.[0]?.name || plant.taxon.scientific_name}
                </h2>
                <p className="text-sm font-sans italic text-stone-600 tracking-wide mt-1">
                  {plant.taxon.scientific_name} {plant.taxon.authority}
                </p>
              </div>
              <div className="text-left font-sans text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-700">Family:</span> {plant.taxon.family}
              </div>
            </div>

            {/* Other Common Names (Arabic & Kurdish) */}
            {plant.locale?.common_names && plant.locale.common_names.length > 1 && (
              <div className="pt-2 flex flex-wrap gap-2 items-center text-xs">
                <span className="text-stone-500 font-bold">تسميات أخرى:</span>
                {plant.locale.common_names.slice(1).map((cn, idx) => (
                  <span 
                    key={idx} 
                    className="bg-stone-200/70 text-stone-800 px-2.5 py-1 rounded-md font-medium flex items-center gap-1"
                  >
                    <span>{cn.name}</span>
                    <span className="text-[10px] text-stone-500 font-sans">({cn.language})</span>
                  </span>
                ))}
              </div>
            )}

            {/* Synonyms */}
            {plant.taxon.synonyms && plant.taxon.synonyms.length > 0 && (
              <div className="text-xs text-stone-500 font-sans italic flex flex-wrap gap-2 items-center pt-1">
                <span className="font-arabic not-italic font-bold text-stone-600">المرادفات العلمية:</span>
                {plant.taxon.synonyms.map((syn, idx) => (
                  <span key={idx} className="bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                    {syn}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description & Habitat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-1.5">
              <span className="text-xs font-bold text-nafas-blue flex items-center gap-1.5">
                <Info className="w-4 h-4 text-nafas-blue" />
                الوصف المورفولوجي:
              </span>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {plant.locale?.description || 'الوصف قيد التوثيق العلمي.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-1.5">
              <span className="text-xs font-bold text-nafas-blue flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-nafas-blue" />
                الموطن والبيئة الطبيعية:
              </span>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {plant.locale?.habitat || 'البيئة غير محددة بدقة في السجل.'}
              </p>
            </div>
          </div>

          {/* HAZARDS & TOXICITY WARNING SECTION */}
          {hazard ? (
            <div className="p-6 rounded-3xl bg-red-50/80 border border-red-200 space-y-4">
              <div className="flex items-center justify-between border-b border-red-200/80 pb-3">
                <div className="flex items-center gap-2 text-red-900 font-black text-base">
                  <Flame className="w-5 h-5 text-red-600" />
                  <span>الملف السمومي والمخاطر السريرية</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                  {severityBadge.label}
                </span>
              </div>

              {/* Target Audiences & Routes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white/80 p-3 rounded-xl border border-red-100 space-y-1">
                  <span className="font-bold text-red-950 block">الفئات الحساسة المعرضة للخطر:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {hazard.target_audiences?.map((aud, idx) => (
                      <span key={idx} className="bg-red-100 text-red-900 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                        {aud === 'children' && <Baby className="w-3 h-3 text-red-700" />}
                        {aud === 'pets' && <PawPrint className="w-3 h-3 text-red-700" />}
                        {aud === 'pregnancy' && <HeartHandshake className="w-3 h-3 text-red-700" />}
                        <span>
                          {aud === 'children' ? 'الأطفال' : 
                           aud === 'pets' ? 'الحيوانات الأليفة' : 
                           aud === 'pregnancy' ? 'الحوامل' : 
                           aud === 'livestock' ? 'المواشي' : aud}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-red-100 space-y-1">
                  <span className="font-bold text-red-950 block">مسارات الخطر الموثقة:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {hazard.routes?.map((rt, idx) => (
                      <span key={idx} className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                        {rt === 'eyes' && <Eye className="w-3 h-3 text-amber-700" />}
                        {rt === 'skin' && <Hand className="w-3 h-3 text-amber-700" />}
                        <span>
                          {rt === 'ingestion' ? 'الابتلاع الفموي' :
                           rt === 'skin' ? 'التلامس الجلدي' :
                           rt === 'eyes' ? 'التهيج العيني' :
                           rt === 'pollen' ? 'لقاح تحسسي' :
                           rt === 'food' ? 'تسمم غذائي' : rt}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toxic Parts */}
              {hazard.toxic_parts && hazard.toxic_parts.length > 0 && (
                <div className="text-xs text-red-900">
                  <span className="font-bold">الأجزاء السامة: </span>
                  <span>{hazard.toxic_parts.join('، ')}</span>
                </div>
              )}

              {/* Symptoms */}
              {hazard.symptoms_ar && hazard.symptoms_ar.length > 0 && (
                <div className="bg-white/80 p-4 rounded-xl border border-red-100 space-y-2 text-xs">
                  <span className="font-bold text-red-950 block">الأعراض السريرية الشائعة:</span>
                  <ul className="list-disc list-inside space-y-1 text-red-900">
                    {hazard.symptoms_ar.map((sym, idx) => (
                      <li key={idx} className="leading-relaxed">{sym}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Immediate First Aid Actions */}
              {hazard.first_aid_ar && (
                <div className="bg-red-900 text-white p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-black text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    <span>إجراءات الإسعاف الأولي الإلزامية:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-50">
                    {hazard.first_aid_ar.immediate_actions?.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                  {hazard.first_aid_ar.veterinary_note && (
                    <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-700/50 text-amber-200 text-[11px] mt-2">
                      <span className="font-bold">تنبيه بيطري: </span>
                      {hazard.first_aid_ar.veterinary_note}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-stone-100 border border-stone-200 text-xs text-stone-700 space-y-1.5">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-stone-600" />
                <span>حالة التقييم السمومي: التقييم غير متوفر</span>
              </div>
              <p className="leading-relaxed text-stone-600">
                لم يتم إدراج سجل سمومي قطعي لهذا النوع في المسودة الحالية. 
                <strong className="text-red-700"> تحذير: عدم وجود وسام خطر لا يعني أبداً أن النبات آمن للأكل أو للاستخدام المنزلي.</strong>
              </p>
            </div>
          )}

          {/* Plant Care & Growth Guide */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-nafas-silt text-sm flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-600" />
                إرشادات العناية والتحمل في البيئة العراقية
              </span>
              {plant.care?.verified_in_iraq ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  موثق في العراق
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                  غير مؤكد في السجلات العراقية
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-stone-700 pt-1">
              {plant.care?.sunlight && (
                <div><span className="font-bold text-stone-900">الإضاءة والشمس:</span> {plant.care.sunlight}</div>
              )}
              {plant.care?.watering && (
                <div><span className="font-bold text-stone-900">الري والرطوبة:</span> {plant.care.watering}</div>
              )}
              {plant.care?.soil && (
                <div><span className="font-bold text-stone-900">نوع التربة:</span> {plant.care.soil}</div>
              )}
              {plant.care?.tolerance_iraq && (
                <div><span className="font-bold text-stone-900">تحمل صيف العراق:</span> {plant.care.tolerance_iraq}</div>
              )}
            </div>

            {plant.care?.caution && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <span className="font-bold">محاذير زراعية: </span>
                {plant.care.caution}
              </div>
            )}
          </div>

          {/* Documented Distribution in Iraq */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3 text-xs">
            <span className="font-bold text-nafas-silt text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-nafas-blue" />
              التوزع الجغرافي الموثق في العراق
            </span>

            {plant.distributions && plant.distributions.length > 0 ? (
              <div className="space-y-2">
                {plant.distributions.map((dist, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-stone-900">
                        {dist.region_ar ? dist.region_ar : 'عموم العراق (مثبت قطرياً دون حصر بمحافظة)'}
                      </span>
                      <span className="text-stone-500 text-[11px] mr-2">
                        الحالة: {dist.status === 'native' ? 'أصيل (Native)' :
                                 dist.status === 'wild_documented' ? 'بري موثق' :
                                 dist.status === 'introduced' ? 'دخيل (Introduced)' :
                                 dist.status === 'ornamental' ? 'زينة شائعة' :
                                 dist.status === 'cultivated' ? 'مزروع' : dist.status}
                      </span>
                    </div>

                    {dist.notes && (
                      <span className="text-stone-600 text-[11px] block w-full">{dist.notes}</span>
                    )}

                    {dist.evidence_sources && dist.evidence_sources.length > 0 && (
                      <div className="flex gap-1.5 pt-1">
                        {dist.evidence_sources.map(sId => (
                          <span key={sId} className="px-2 py-0.5 rounded bg-stone-200/80 text-[10px] text-stone-700 font-sans">
                            مصدر: {sId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-500">لا توجد سجلات توزع جغرافية موثقة حالياً لهذا النوع.</p>
            )}
          </div>

          {/* Scientific Evidence Sources Cards */}
          <div className="space-y-3 text-xs border-t border-stone-200 pt-5">
            <div className="flex items-center gap-1.5 font-bold text-stone-900 text-sm">
              <BookOpen className="w-4 h-4 text-nafas-blue" />
              <span>المصادر والمراجع العلمية المعتمدة لهذا السجل:</span>
            </div>

            <div className="space-y-2">
              {plant.locale?.common_names?.[0]?.evidence_sources?.map((sId) => {
                const src = getSource(sId);
                if (!src) return null;
                return (
                  <div key={sId} className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-stone-900">{src.title_ar || src.title_en}</div>
                      <div className="text-stone-500 text-[11px]">{src.citation}</div>
                      <div className="text-[10px] text-stone-400">درجة الدليل: {src.evidence_tier}</div>
                    </div>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white border border-stone-300 text-nafas-blue hover:bg-stone-100 flex items-center gap-1 font-bold text-[11px] shrink-0"
                      >
                        <span>رابط المرجع</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-4 bg-stone-100/90 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 text-xs font-bold transition-colors"
          >
            إغلاق النافذة
          </button>

          {onOpenTriageWithPlant && (
            <button
              onClick={() => {
                onClose();
                onOpenTriageWithPlant(plant.id);
              }}
              className="px-5 py-2.5 rounded-xl bg-nafas-blue text-nafas-ivory hover:bg-nafas-blue/90 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>فحص وتشخيص مشاكل هذا النبات</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
