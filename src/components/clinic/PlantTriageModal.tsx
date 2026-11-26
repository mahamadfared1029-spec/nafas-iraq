'use client';

import React, { useState } from 'react';
import { 
  TriagePathway, 
  PlantTriageAnswers, 
  ProblemMatchCandidate, 
  PlantRecord 
} from '@/types/plants';
import { 
  matchPlantProblems, 
  EMERGENCY_EXPOSURE_PROTOCOL, 
  TRIAGE_QUESTION_REASONS 
} from '@/lib/plantTriage';
import { botanicalData, getPlantHazard } from '@/lib/plantSearch';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import { 
  X, 
  AlertTriangle, 
  PhoneCall, 
  Eye, 
  Hand, 
  ShieldAlert, 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  UploadCloud, 
  Lock, 
  Info, 
  Sprout, 
  Flame, 
  HeartHandshake, 
  PawPrint, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface PlantTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlantId?: string;
}

export const PlantTriageModal: React.FC<PlantTriageModalProps> = ({
  isOpen,
  onClose,
  initialPlantId
}) => {
  // Navigation State
  const [pathway, setPathway] = useState<TriagePathway>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeReasonModal, setActiveReasonModal] = useState<string | null>(null);

  // Emergency Pathway Specific Plant Selector
  const [selectedEmergencyPlantId, setSelectedEmergencyPlantId] = useState<string>(initialPlantId || '');

  // Answers State
  const [answers, setAnswers] = useState<PlantTriageAnswers>({
    plantKnown: Boolean(initialPlantId),
    plantId: initialPlantId || '',
    plantingContext: 'unknown',
    governorateId: 'baghdad',
    environment: {
      sunlightExposure: 'unknown',
      potDrainage: 'unknown',
      waterType: 'unknown',
      recentlyRepotted: false,
      symptomOnsetDays: 'unknown'
    },
    symptomLocation: 'general',
    appearance: 'full_yellow',
    spreadRate: 'gradual_weeks',
    visibleSigns: 'none_visible'
  });

  // Results State
  const [matchResults, setMatchResults] = useState<{
    candidates: ProblemMatchCandidate[];
    isInsufficientData: boolean;
    safeRemediesSummary: string[];
  } | null>(null);

  // Specialist Referral Form
  const [referralSent, setReferralSent] = useState(false);
  const [referralText, setReferralText] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [hasPhotoAttached, setHasPhotoAttached] = useState(false);

  if (!isOpen) return null;

  const resetAll = () => {
    setPathway(null);
    setCurrentStep(0);
    setMatchResults(null);
    setReferralSent(false);
    setReferralText('');
    setPrivacyAgreed(false);
    setHasPhotoAttached(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // Step names for the Problem Triage Wizard
  const totalWizardSteps = 5;

  const handleEvaluateProblem = () => {
    const results = matchPlantProblems(answers);
    setMatchResults(results);
    setCurrentStep(totalWizardSteps); // Last view: Results
  };

  const selectedHazardRecord = selectedEmergencyPlantId 
    ? getPlantHazard(selectedEmergencyPlantId) 
    : undefined;

  const selectedEmergencyPlant = botanicalData.plants.find(p => p.id === selectedEmergencyPlantId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-arabic text-right animate-fadeIn">
      <div 
        className="relative bg-nafas-ivory rounded-3xl max-w-3xl w-full border border-nafas-reed/20 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="triage-modal-title"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-nafas-reed/15 flex items-center justify-between bg-stone-50/90">
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 transition-colors focus:ring-2 focus:ring-nafas-blue outline-none"
            aria-label="إغلاق فحص النبات"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-nafas-silt flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-emerald-700" />
              <span>فاحص النباتات وإسعاف الطوارئ</span>
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-stone-800">
          
          {/* SCREEN 0: MANDATORY TRIAGE SPLIT (غير قابل للتخطي) */}
          {pathway === null && (
            <div className="space-y-6 text-center py-4">
              <div className="space-y-2 max-w-xl mx-auto">
                <span className="inline-block px-3.5 py-1 rounded-full bg-nafas-misty text-nafas-blue text-xs font-bold">
                  الخطوة الأولى: الفرز الأولي الإلزامي
                </span>
                <h3 id="triage-modal-title" className="text-2xl sm:text-3xl font-black text-nafas-silt">
                  ما هو سبب زيارتك الآن؟
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  لحماية الأرواح، نفرز بين حالات التعرض والتسمم الطارئة للإنسان والحيوان، وبين المشاكل الزراعية وصحة النباتات.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
                {/* Option A: Emergency Exposure */}
                <button
                  onClick={() => setPathway('exposure_emergency')}
                  className="p-6 rounded-3xl bg-red-50 hover:bg-red-100/90 border-2 border-red-300 hover:border-red-500 text-right space-y-3 transition-all transform hover:-translate-y-1 shadow-sm group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-red-950 flex items-center justify-between">
                      <span>صار تعرّض لإنسان أو حيوان</span>
                      <ChevronLeft className="w-5 h-5 text-red-600 rtl:rotate-0" />
                    </h4>
                    <p className="text-xs text-red-800 leading-relaxed mt-1">
                      ابتلاع بذور أو أوراق، ملامسة عصارة حارقة للعين أو الجلد، أو تسمم حيوان أليف. يفتح بروتوكول الإسعاف الفوري مجاناً وبدون تسجيل.
                    </p>
                  </div>
                </button>

                {/* Option B: Plant Health Problem */}
                <button
                  onClick={() => {
                    setPathway('plant_problem');
                    setCurrentStep(1);
                  }}
                  className="p-6 rounded-3xl bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-nafas-blue text-right space-y-3 transition-all transform hover:-translate-y-1 shadow-sm group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-nafas-blue text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Sprout className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-stone-900 flex items-center justify-between">
                      <span>عندي مشكلة بنمو النبات</span>
                      <ChevronLeft className="w-5 h-5 text-nafas-blue rtl:rotate-0" />
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed mt-1">
                      اصفرار أوراق، ذبول، حروق شمس، حشرات وبق دقيقي، أو إجهاد مائي. تشخيص تدريجي بحسب البيئة العراقية.
                    </p>
                  </div>
                </button>
              </div>

              {/* Safety notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 max-w-xl mx-auto text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  منصة نَفَس تطبق سياسة أمان صارمة: لا تسجيل دخول ولا طلب صور لعرض الإسعافات الأولية لحالات التسمم.
                </span>
              </div>
            </div>
          )}

          {/* PATHWAY 1: EMERGENCY EXPOSURE PROTOCOL */}
          {pathway === 'exposure_emergency' && (
            <div className="space-y-6">
              {/* Emergency Banner with 911 call button */}
              <div className="p-5 sm:p-6 rounded-3xl bg-red-600 text-white space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-black text-lg sm:text-xl">
                    <ShieldAlert className="w-6 h-6 text-amber-300" />
                    <span>{EMERGENCY_EXPOSURE_PROTOCOL.generalTitle}</span>
                  </div>

                  <a
                    href="tel:911"
                    className="px-5 py-2.5 rounded-2xl bg-amber-400 text-stone-950 font-black text-sm flex items-center gap-2 hover:bg-amber-300 transition-all shadow-md shrink-0"
                  >
                    <PhoneCall className="w-4 h-4 text-stone-950" />
                    <span>اتصال فوري بالطوارئ (911)</span>
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl bg-red-700/80 border border-red-500 text-xs text-red-50 space-y-1.5">
                  <div className="font-bold text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    <span>اطلب الطوارئ فوراً (911) دون أي تأخير عند ظهور أي من هذه العلامات:</span>
                  </div>
                  <ul className="list-disc list-inside grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    {EMERGENCY_EXPOSURE_PROTOCOL.priorityCall.criticalSigns.map((sign, idx) => (
                      <li key={idx}>{sign}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Plant Specific Profile Selector */}
              <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 space-y-2">
                <label className="text-xs font-bold text-stone-800 block">
                  هل تعرف اسم النبتة التي حدث التعرّض لها؟ (اختياري لمعاينة ملف السمية):
                </label>
                <select
                  value={selectedEmergencyPlantId}
                  onChange={(e) => setSelectedEmergencyPlantId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 font-bold focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="">-- اختر من قائمة النباتات المرصودة في نَفَس أو اتركها لعرض الإرشادات العامة --</option>
                  {botanicalData.plants.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.locale?.common_names?.[0]?.name || p.taxon.scientific_name} ({p.taxon.scientific_name})
                    </option>
                  ))}
                </select>

                {selectedHazardRecord && selectedEmergencyPlant && (
                  <div className="mt-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs space-y-2">
                    <div className="font-bold text-red-950 flex items-center justify-between">
                      <span>ملف سمية: {selectedEmergencyPlant.locale?.common_names?.[0]?.name} ({selectedEmergencyPlant.taxon.scientific_name})</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-red-200 text-red-900 font-bold">
                        درجة الخطر: {selectedHazardRecord.severity}
                      </span>
                    </div>

                    {selectedHazardRecord.toxic_parts && (
                      <p className="text-red-900 text-[11px]">
                        <strong>الأجزاء السامة:</strong> {selectedHazardRecord.toxic_parts.join('، ')}
                      </p>
                    )}

                    {selectedHazardRecord.first_aid_ar?.immediate_actions && (
                      <ul className="list-disc list-inside text-red-950 space-y-1 text-[11px]">
                        {selectedHazardRecord.first_aid_ar.immediate_actions.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Standard First Aid Protocols 4-Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. Ingestion */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-red-700 text-sm">
                    <Flame className="w-4 h-4 text-red-600" />
                    <span>{EMERGENCY_EXPOSURE_PROTOCOL.ingestionProtocol.title}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-stone-700 leading-relaxed text-[11px]">
                    {EMERGENCY_EXPOSURE_PROTOCOL.ingestionProtocol.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                {/* 2. Eye Exposure */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-blue-700 text-sm">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>{EMERGENCY_EXPOSURE_PROTOCOL.eyeExposureProtocol.title}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-stone-700 leading-relaxed text-[11px]">
                    {EMERGENCY_EXPOSURE_PROTOCOL.eyeExposureProtocol.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                {/* 3. Skin Exposure */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-amber-700 text-sm">
                    <Hand className="w-4 h-4 text-amber-600" />
                    <span>{EMERGENCY_EXPOSURE_PROTOCOL.skinExposureProtocol.title}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-stone-700 leading-relaxed text-[11px]">
                    {EMERGENCY_EXPOSURE_PROTOCOL.skinExposureProtocol.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                {/* 4. Veterinary / Pets */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-black text-purple-700 text-sm">
                    <PawPrint className="w-4 h-4 text-purple-600" />
                    <span>{EMERGENCY_EXPOSURE_PROTOCOL.veterinaryProtocol.title}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-stone-700 leading-relaxed text-[11px]">
                    {EMERGENCY_EXPOSURE_PROTOCOL.veterinaryProtocol.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t border-stone-200 pt-4">
                <button
                  onClick={() => setPathway(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للخيارات الرئيسية</span>
                </button>

                <a
                  href="tel:911"
                  className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs hover:bg-red-700 flex items-center gap-2 shadow-sm"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>اتصال بالطوارئ 911</span>
                </a>
              </div>
            </div>
          )}

          {/* PATHWAY 2: PLANT PROBLEM TRIAGE WIZARD */}
          {pathway === 'plant_problem' && currentStep > 0 && currentStep < totalWizardSteps && (
            <div className="space-y-6">
              
              {/* Step indicator */}
              <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-nafas-blue">الخطوة {currentStep} من {totalWizardSteps - 1}</span>
                  <span>•</span>
                  <span>
                    {currentStep === 1 && 'سياق الزراعة والنبات'}
                    {currentStep === 2 && 'بيئة الري وتصريف الوعاء'}
                    {currentStep === 3 && 'موضع الأعراض في النبتة'}
                    {currentStep === 4 && 'مظهر التغير والمظاهر الحية'}
                  </span>
                </div>

                <button
                  onClick={() => setPathway(null)}
                  className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                >
                  تغيير المسار
                </button>
              </div>

              {/* STEP 1: Context & Plant Selection */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-nafas-silt">
                        أين مزروعة نبتتك وهل تعرف اسمها؟
                      </h4>
                      <button
                        onClick={() => setActiveReasonModal('plantingContext')}
                        className="text-xs text-nafas-blue font-bold flex items-center gap-1 hover:underline"
                        type="button"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>لماذا نسأل هذا؟</span>
                      </button>
                    </div>
                    <p className="text-xs text-stone-600">
                      طبيعة المكان تؤثر مباشرة على درجة حرارة الجذور وتراكم الأملاح.
                    </p>
                  </div>

                  {/* Context Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAnswers({ ...answers, plantingContext: 'container' })}
                      className={`p-4 rounded-2xl border text-right font-bold text-xs transition-all space-y-1 ${
                        answers.plantingContext === 'container'
                          ? 'border-nafas-blue bg-nafas-misty text-nafas-blue ring-2 ring-nafas-blue/20'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="text-sm">🪴 في أصيص / حوض منزلي</div>
                      <div className="text-[11px] text-stone-500 font-normal">داخل البيت، على الشرفة، أو في الحديقة</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswers({ ...answers, plantingContext: 'open_ground' })}
                      className={`p-4 rounded-2xl border text-right font-bold text-xs transition-all space-y-1 ${
                        answers.plantingContext === 'open_ground'
                          ? 'border-nafas-blue bg-nafas-misty text-nafas-blue ring-2 ring-nafas-blue/20'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="text-sm">🌳 في الأرض المفتوحة / الحديقة</div>
                      <div className="text-[11px] text-stone-500 font-normal">أشجار، مزروعات حقلية، أو مسطحات خضراء</div>
                    </button>
                  </div>

                  {/* Plant Selection */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-stone-800 block">
                      اختر النبتة إن كانت معروفة، أو اختر «لا أعرف»:
                    </label>
                    <select
                      value={answers.plantId}
                      onChange={(e) => setAnswers({
                        ...answers,
                        plantId: e.target.value,
                        plantKnown: Boolean(e.target.value)
                      })}
                      className="w-full p-3 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 font-bold focus:ring-2 focus:ring-nafas-blue outline-none"
                    >
                      <option value="">لا أعرف نوع النبات بالتحديد</option>
                      {botanicalData.plants.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.locale?.common_names?.[0]?.name || p.taxon.scientific_name} — {p.taxon.scientific_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Governorate */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-800 block">
                      المحافظة أو النطاق الجغرافي العراقي:
                    </label>
                    <select
                      value={answers.governorateId}
                      onChange={(e) => setAnswers({ ...answers, governorateId: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 font-bold focus:ring-2 focus:ring-nafas-blue outline-none"
                    >
                      {IRAQ_GOVERNORATES.map(g => (
                        <option key={g.id} value={g.id}>{g.nameAr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: Environmental Factors */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-nafas-silt">
                        ظروف الري والشمس والصرف
                      </h4>
                      <button
                        onClick={() => setActiveReasonModal('environment_drainage')}
                        className="text-xs text-nafas-blue font-bold flex items-center gap-1 hover:underline"
                        type="button"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>لماذا نسأل هذا؟</span>
                      </button>
                    </div>
                    <p className="text-xs text-stone-600">
                      80% من مشاكل النباتات المنزلية في العراق ترجع لركود الماء أو أشعة شمس الظهيرة الحارقة.
                    </p>
                  </div>

                  {/* Drainage */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-800 block">
                      هل توجد فتحات تصريف مفتوحة وسالكة في قاع الأصيص؟
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswers({
                          ...answers,
                          environment: { ...answers.environment, potDrainage: 'has_drain_holes' }
                        })}
                        className={`p-3 rounded-xl border text-right font-bold text-xs ${
                          answers.environment.potDrainage === 'has_drain_holes'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        نعم، سالكة ويخرج منها الماء
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswers({
                          ...answers,
                          environment: { ...answers.environment, potDrainage: 'no_drain_holes' }
                        })}
                        className={`p-3 rounded-xl border text-right font-bold text-xs ${
                          answers.environment.potDrainage === 'no_drain_holes'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        لا، الوعاء مصمت أو مسدود
                      </button>
                    </div>
                  </div>

                  {/* Sunlight Exposure */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-800 block">
                      شدة تعرض النبات للشمس:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswers({
                          ...answers,
                          environment: { ...answers.environment, sunlightExposure: 'direct_harsh' }
                        })}
                        className={`p-3 rounded-xl border text-center font-bold text-xs ${
                          answers.environment.sunlightExposure === 'direct_harsh'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        شمس مباشرة حارقة
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswers({
                          ...answers,
                          environment: { ...answers.environment, sunlightExposure: 'filtered' }
                        })}
                        className={`p-3 rounded-xl border text-center font-bold text-xs ${
                          answers.environment.sunlightExposure === 'filtered'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        ضوء مفلتر / مظلل
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswers({
                          ...answers,
                          environment: { ...answers.environment, sunlightExposure: 'indoor_low' }
                        })}
                        className={`p-3 rounded-xl border text-center font-bold text-xs ${
                          answers.environment.sunlightExposure === 'indoor_low'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        ظل داخلي ضعيف
                      </button>
                    </div>
                  </div>

                  {/* Water type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-800 block">
                      مصدر مياه الري:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswers({
                          ...answers,
                          environment: { ...answers.environment, waterType: 'tap_city' }
                        })}
                        className={`p-3 rounded-xl border text-center font-bold text-xs ${
                          answers.environment.waterType === 'tap_city'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        ماء إسالة منزلي
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswers({
                          ...answers,
                          environment: { ...answers.environment, waterType: 'well_saline' }
                        })}
                        className={`p-3 rounded-xl border text-center font-bold text-xs ${
                          answers.environment.waterType === 'well_saline'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        ماء بئر / مالح
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswers({
                          ...answers,
                          environment: { ...answers.environment, waterType: 'river' }
                        })}
                        className={`p-3 rounded-xl border text-center font-bold text-xs ${
                          answers.environment.waterType === 'river'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        نهر / جدول عذب
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Symptom Location & Spread Rate */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-nafas-silt">
                        موضع الأعراض وسرعة ظهورها
                      </h4>
                      <button
                        onClick={() => setActiveReasonModal('symptomLocation')}
                        className="text-xs text-nafas-blue font-bold flex items-center gap-1 hover:underline"
                        type="button"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>لماذا نسأل هذا؟</span>
                      </button>
                    </div>
                    <p className="text-xs text-stone-600">
                      موضع الإصابة يحدد إن كانت المشكلة في امتصاص العناصر أو جذور النبتة أو عدوى خارجية.
                    </p>
                  </div>

                  {/* Symptom Location */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'old_leaves', label: 'الأوراق السفلية القديمة' },
                      { id: 'new_leaves', label: 'الأوراق العلوية الحديثة' },
                      { id: 'top_growth', label: 'القمم النامية والبراعم' },
                      { id: 'stem', label: 'الساق والأغصان' },
                      { id: 'roots', label: 'الجذور وقاعدة التاج' },
                      { id: 'fruits', label: 'الثمار والزهور' }
                    ].map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setAnswers({ ...answers, symptomLocation: loc.id as any })}
                        className={`p-3 rounded-xl border text-right font-bold text-xs transition-colors ${
                          answers.symptomLocation === loc.id
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>

                  {/* Spread Rate */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-800 block">
                        سرعة تطور وانتشار العَرَض:
                      </label>
                      <button
                        onClick={() => setActiveReasonModal('spreadRate')}
                        className="text-[11px] text-nafas-blue font-bold flex items-center gap-1 hover:underline"
                        type="button"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>لماذا نسأل هذا؟</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAnswers({ ...answers, spreadRate: 'rapid_days' })}
                        className={`p-3 rounded-xl border text-right font-bold text-xs ${
                          answers.spreadRate === 'rapid_days'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        <div>سريع ومفاجئ (خلال يومين لـ 4 أيام)</div>
                        <div className="text-[10px] text-stone-500 font-normal">يرجح الصدمة الحرارية أو العطش أو التسمم</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswers({ ...answers, spreadRate: 'gradual_weeks' })}
                        className={`p-3 rounded-xl border text-right font-bold text-xs ${
                          answers.spreadRate === 'gradual_weeks'
                            ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        <div>تدريجي بطيء (عدة أسابيع)</div>
                        <div className="text-[10px] text-stone-500 font-normal">يرجح نقص التغذية أو تدرج الملوحة</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Appearance & Visible Signs */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-black text-nafas-silt">
                        شكل التغير والمظاهر الحية المرئية
                      </h4>
                      <button
                        onClick={() => setActiveReasonModal('visibleSigns')}
                        className="text-xs text-nafas-blue font-bold flex items-center gap-1 hover:underline"
                        type="button"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>لماذا نسأل هذا؟</span>
                      </button>
                    </div>
                    <p className="text-xs text-stone-600">
                      التشخيص البصري المباشر يمنع الاستخدام الخاطئ للمبيدات.
                    </p>
                  </div>

                  {/* Appearance */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-800 block">
                      ما هو أكثر وصف يشبه حالة الأوراق؟
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'full_yellow', label: 'اصفرار شامل للورقة' },
                        { id: 'interveinal_yellow', label: 'اصفرار بين العروق (العروق خضراء)' },
                        { id: 'burnt_margins', label: 'احتراق وجفاف حواف الأوراق' },
                        { id: 'wilt_droop', label: 'ذبول وتدلي الساق والأوراق' },
                        { id: 'spots_brown_black', label: 'بقع دائرية بنية أو سوداء' },
                        { id: 'rot_soft', label: 'تعفن لين أو اسوداد الساق/الثمر' },
                        { id: 'curling', label: 'التفاف وتجعد الأوراق' }
                      ].map(app => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setAnswers({ ...answers, appearance: app.id as any })}
                          className={`p-3 rounded-xl border text-right font-bold ${
                            answers.appearance === app.id
                              ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          {app.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visible Signs */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-stone-800 block">
                      هل توجد أي كائنات أو مظاهر مرئية بالعين أو العدسة؟
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'cottony_white', label: 'كتل قطنية بيضاء (مثل كرات القطن)', sub: 'دلالة على البق الدقيقي' },
                        { id: 'fine_webs', label: 'خيوط عنكبوتية دقيقة جداً تحت الأوراق', sub: 'دلالة على حلم الغبار' },
                        { id: 'soft_insects_honeydew', label: 'حشرات ناعمة صغيرة وإفرازات لزجة', sub: 'دلالة على المن' },
                        { id: 'none_visible', label: 'لا توجد أي حشرات أو كتل مرئية', sub: 'مشكلة فسيولوجية أو فطرية' }
                      ].map(vs => (
                        <button
                          key={vs.id}
                          type="button"
                          onClick={() => setAnswers({ ...answers, visibleSigns: vs.id as any })}
                          className={`p-3 rounded-xl border text-right font-bold ${
                            answers.visibleSigns === vs.id
                              ? 'border-nafas-blue bg-nafas-misty text-nafas-blue'
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          <div>{vs.label}</div>
                          <div className="text-[10px] text-stone-500 font-normal mt-0.5">{vs.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Nav Controls */}
              <div className="flex items-center justify-between border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>رجوع</span>
                </button>

                <div className="flex items-center gap-2">
                  {currentStep < 4 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(prev => prev + 1)}
                        className="px-3.5 py-2 rounded-xl text-stone-500 hover:text-stone-800 text-xs font-bold"
                      >
                        تخطي هذا السؤال
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(prev => prev + 1)}
                        className="px-5 py-2.5 rounded-xl bg-nafas-blue text-nafas-ivory text-xs font-bold hover:bg-nafas-blue/90 shadow-sm flex items-center gap-1.5"
                      >
                        <span>متابعة</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEvaluateProblem}
                      className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-md flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      <span>استخراج التشخيص المرجّح</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* STEP 5: RESULTS & DIAGNOSIS SCREEN */}
          {pathway === 'plant_problem' && currentStep === totalWizardSteps && matchResults && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Header */}
              <div className="space-y-1 border-b border-stone-200 pb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>نتيجة الفحص الاسترشادي</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-nafas-silt">
                  الاحتمالات المرجّحة لحالة النبتة
                </h3>
                <p className="text-xs text-stone-600">
                  تمت مطابقة إجاباتك مع مصفوفة الآفات والمشكلات الزراعية المعتمدة لبيئة العراق.
                </p>
              </div>

              {/* Insufficient data state */}
              {matchResults.isInsufficientData ? (
                <div className="p-6 rounded-3xl bg-amber-50 border border-amber-300 text-right space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-base">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                    <span>المعلومات غير كافية للتشخيص الدقيق</span>
                  </div>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    لم تتطابق الإجابات بدرجة ثقة كافية مع أي من المشكلات المرجعية الشائعة. لا تقدم منصة نَفَس تشخيصات عشوائية حفاظاً على سلامة مزروعاتك.
                  </p>
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <strong>الخطوة الموصى بها:</strong> فحص رطوبة التربة وسلامة الجذور يدوياً، أو مراجعة أقرب شعبة زراعية أو مرشد زراعي محلي.
                  </div>
                </div>
              ) : (
                /* Top Candidate Cards (up to 3) */
                <div className="space-y-4">
                  {matchResults.candidates.map((cand, idx) => (
                    <div 
                      key={cand.problem.id}
                      className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-nafas-misty text-nafas-blue flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </span>
                          <span className="text-base font-black text-nafas-silt">
                            {cand.problem.problem_ar || (cand.problem as any).name}
                          </span>
                          {cand.problem.problem_en && cand.problem.problem_en !== cand.problem.id && (
                            <span className="text-stone-400 font-sans text-[11px]">
                              ({cand.problem.problem_en})
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          نسبة التطابق: {Math.round(cand.confidenceScore * 100)}%
                        </div>
                      </div>

                      {/* Matching Evidence */}
                      <div className="space-y-1">
                        <span className="font-bold text-stone-900 block">الأدلة الداعمة لهذا الترجيح:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-stone-700 text-[11px]">
                          {cand.matchingEvidence.map((ev, eIdx) => (
                            <li key={eIdx}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Safe Actions */}
                      <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-1.5">
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <Sprout className="w-4 h-4 text-emerald-600" />
                          إجراءات الرعاية والإنقاذ الآمنة:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-stone-700 text-[11px]">
                          {(cand.nextSteps || []).map((step, sIdx) => (
                            <li key={sIdx}>{step}</li>
                          ))}
                        </ul>
                      </div>

                      {/* When to escalate */}
                      <div className="text-[11px] text-stone-600 pt-1 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-nafas-blue shrink-0 mt-0.5" />
                        <span><strong>متى يُطلب فحص مخبري أو تصعيد: </strong>{cand.whenToEscalate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STRICT BAN ON CHEMICAL RECIPES */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>تحذير أمان علمي إلزامي:</span>
                </div>
                <p className="leading-relaxed">
                  يُحظر في منصة نَفَس عرض أي خلطات مبيدات منزلية أو مقادير كيميائية سامة. تطبيق المبيدات الزراعية يخضع للوائح وزارة الزراعة العراقية ويجب أن يتم تحت إشراف مهندس زراعي مرخص لسلامة التربة والمياه الجوفية.
                </p>
              </div>

              {/* Safe Home Care Summary */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2 text-xs">
                <span className="font-bold text-stone-900 block">قواعد السلامة الزراعية العامة:</span>
                <ul className="list-disc list-inside space-y-1 text-stone-700 text-[11px]">
                  {matchResults.safeRemediesSummary.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* OPTIONAL SPECIALIST REFERRAL & PRIVACY */}
              <div className="p-5 rounded-3xl bg-stone-100 border border-stone-200 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-nafas-blue" />
                    طلب استشارة متخصصة مع خبير زراعي (اختياري)
                  </span>
                  <span className="text-[10px] bg-stone-200 text-stone-700 px-2.5 py-0.5 rounded-full font-bold">
                    بدون إنشاء حساب
                  </span>
                </div>

                {!referralSent ? (
                  <div className="space-y-3">
                    <p className="text-stone-600 leading-relaxed text-[11px]">
                      إذا كنت بحاجة إلى رأي بشري من مهندسينا المتطوعين، يمكنك ترك وصف موجز. إرفاق الصور اختياري ويخضع لسياسة الخصوصية الصارمة.
                    </p>

                    <textarea
                      value={referralText}
                      onChange={(e) => setReferralText(e.target.value)}
                      placeholder="صف أي تفاصيل إضافية عن النبتة أو الأعراض..."
                      rows={2}
                      className="w-full p-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs focus:ring-2 focus:ring-nafas-blue outline-none"
                    />

                    {/* Image Upload & Privacy terms */}
                    <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-stone-900 flex items-center gap-1.5">
                          <UploadCloud className="w-4 h-4 text-stone-600" />
                          إرفاق صورة للاسترشاد (اختياري)
                        </label>
                        <input
                          type="checkbox"
                          id="attachPhoto"
                          checked={hasPhotoAttached}
                          onChange={(e) => setHasPhotoAttached(e.target.checked)}
                          className="rounded text-nafas-blue"
                        />
                      </div>

                      <div className="text-[10px] text-stone-500 space-y-1">
                        <div className="flex items-center gap-1 text-emerald-800 font-bold">
                          <Lock className="w-3 h-3 text-emerald-700" />
                          <span>ضمانات خصوصية البيانات في نَفَس:</span>
                        </div>
                        <p>
                          1. يتم تجريد بيانات الموقع الدقيق (EXIF GPS) ورقم الجهاز قبل الحفظ.
                        </p>
                        <p>
                          2. تُحفظ الصورة لمدة أقصاها 30 يوماً للمراجعة الفنية ثم تُحذف نهائياً.
                        </p>
                        <p>
                          3. لا تُستخدم الصور في تدريب نماذج الذكاء الاصطناعي أو الإعلانات التجارية.
                        </p>
                        <p className="text-amber-800 font-bold">
                          4. الصور قرائن أولية فقط؛ لا يُعتمد عليها للجزم بصلاحية نبات مجهول للأكل.
                        </p>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="privacyAgreed"
                          checked={privacyAgreed}
                          onChange={(e) => setPrivacyAgreed(e.target.checked)}
                          className="rounded text-nafas-blue"
                        />
                        <label htmlFor="privacyAgreed" className="text-[11px] text-stone-800 font-bold cursor-pointer">
                          أوافق على معالجة الاستشارة وفق سياسة الخصوصية المذكورة.
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!privacyAgreed}
                      onClick={() => setReferralSent(true)}
                      className="w-full py-2.5 rounded-xl bg-nafas-blue text-nafas-ivory font-bold text-xs hover:bg-nafas-blue/90 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
                    >
                      إرسال الاستشارة للمرشد الزراعي
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1 text-xs">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>تم تسجيل طلب الاستشارة بنجاح!</span>
                    </div>
                    <p className="text-[11px] text-emerald-900">
                      رقم المراجعة المرجعي: #{Math.floor(100000 + Math.random() * 900000)}. سيقوم أحد المهندسين الزراعيين المعتمدين بمراجعة الحالة وفق سياسات السلامة.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Controls */}
              <div className="flex items-center justify-between border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>إعادة الفحص من البداية</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800"
                >
                  إغلاق الفاحص
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* REASON MODAL / POPOVER ("لماذا نسأل هذا السؤال؟") */}
      {activeReasonModal && TRIAGE_QUESTION_REASONS[activeReasonModal] && (
        <div className="fixed inset-0 z-60 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-3 text-right">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="font-bold text-nafas-silt text-sm flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-nafas-blue" />
                <span>{TRIAGE_QUESTION_REASONS[activeReasonModal].titleAr}</span>
              </span>
              <button
                onClick={() => setActiveReasonModal(null)}
                className="text-stone-400 hover:text-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed">
              {TRIAGE_QUESTION_REASONS[activeReasonModal].explanationAr}
            </p>

            <button
              onClick={() => setActiveReasonModal(null)}
              className="w-full py-2 rounded-xl bg-nafas-misty text-nafas-blue font-bold text-xs hover:bg-nafas-misty/80"
            >
              فهمت ذلك، شكراً
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
