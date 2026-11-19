'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { 
  HeartHandshake, 
  AlertCircle, 
  Sprout, 
  UploadCloud, 
  CheckCircle2, 
  HelpCircle, 
  ShieldAlert, 
  Sparkles, 
  Lock 
} from 'lucide-react';

export const PlantClinic: React.FC = () => {
  const { t } = useNafas();
  
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [plantType, setPlantType] = useState('نارنج');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [consultationSubmitted, setConsultationSubmitted] = useState(false);

  const symptomGuides: Record<string, { title: string; diagnosis: string; safeRemedy: string; caution: string }> = {
    yellow_leaves: {
      title: 'اصفرار الأوراق وتراجع النمو (Chlorosis)',
      diagnosis: 'في البيئة العراقية، غالباً ما ينتج اصفرار الأوراق عن نقص امتصاص الحديد بسبب قلوية التربة الطينية، أو زيادة الملوحة في ماء الري خلال الصيف.',
      safeRemedy: 'أضف سماد هيومات البوتاسيوم العضوي أو شيلات الحديد المخلبي (EDDHA) متبوعة بري معتدل صباحاً لتسهيل الامتصاص.',
      caution: 'تجنب تماماً التسميد النيتروجيني الحبيبي في أوقات الظهيرة الحارة لتفادي احتراق الجذور.'
    },
    burnt_edges: {
      title: 'احتراق وجفاف حواف الأوراق (Heat / Salt Scorch)',
      diagnosis: 'حروق الشمس الشديدة فوق 45 درجة مئوية المصحوبة بارتفاع نسبة الأملاح في أطراف الأوراق القديمة.',
      safeRemedy: 'انقل النبات إلى موقع مظلل بنسبة 50% أو اغرس شتلة سدر لتوفير ظل نباتي طبيعي، واغسل التربة بكمية ماء عذب إضافية كل أسبوعين لطرد الأملاح.',
      caution: 'لا ترش الأوراق برذاذ الماء تحت أشعة الشمس المباشرة؛ حيث تعمل قطرات الماء كعدسات مكبرة تحرق النسيج الورقي.'
    },
    leaf_curl: {
      title: 'التفاف الأوراق وحشرة المن / حلم الغبار',
      diagnosis: 'التفاف الأوراق للأعلى أو الأسفل دلالة على إجهاد مائي شديد أو نشاط حشري خفيف.',
      safeRemedy: 'اغسل الأوراق من الأسفل بمحلول صابون بوتاسي زراعي مخفف (1 مل لكل لتر ماء) بعد غروب الشمس.',
      caution: 'يُحظر استخدام مبيدات الفوسفور العضوية المحظورة؛ التزم بالحلول العضوية الآمنة لبيئة الأطفال والطيور.'
    }
  };

  const handleSubmitConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    setConsultationSubmitted(true);
  };

  return (
    <section className="py-16 bg-nafas-sand border-b border-nafas-reed/10 font-arabic text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-nafas-misty text-nafas-blue text-xs font-bold">
            <HeartHandshake className="w-4 h-4 text-nafas-blue" />
            <span>الرعاية الزراعية المنزلية الآمنة</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-nafas-silt">
            {t.clinicTitle}
          </h2>

          <p className="text-sm text-nafas-neutral-slate leading-relaxed">
            {t.clinicSubtitle}
          </p>

          {/* Mandatory Safety & AI Disclaimer */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>إشعار أمان علمي إلزامي:</span>
            </div>
            <p className="leading-relaxed">
              {t.clinicDisclaimer}
            </p>
          </div>
        </div>

        {/* 2 Columns: Symptom Triage Tool & Consultation Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Column 1: Interactive Triage Explorer */}
          <div className="lg:col-span-7 bg-nafas-ivory p-6 sm:p-8 rounded-3xl border border-nafas-reed/10 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-nafas-blue">
                الفاحص الاسترشادي السريع:
              </span>
              <h3 className="text-xl font-black text-nafas-silt">
                اختر أكثر الأعراض شبهاً بحالة نبتتك:
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedSymptom('yellow_leaves')}
                className={`p-4 rounded-2xl text-right border text-xs font-bold transition-all space-y-1 ${
                  selectedSymptom === 'yellow_leaves'
                    ? 'border-nafas-blue bg-nafas-blue/10 text-nafas-silt ring-2 ring-nafas-blue/20'
                    : 'border-nafas-reed/30 hover:border-nafas-reed/30 text-nafas-neutral-slate'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-yellow-400 mb-2"></div>
                <div className="font-bold">اصفرار الأوراق</div>
                <div className="text-[10px] text-gray-500 font-normal">نقص حديد أو ملوحة</div>
              </button>

              <button
                onClick={() => setSelectedSymptom('burnt_edges')}
                className={`p-4 rounded-2xl text-right border text-xs font-bold transition-all space-y-1 ${
                  selectedSymptom === 'burnt_edges'
                    ? 'border-nafas-blue bg-nafas-blue/10 text-nafas-silt ring-2 ring-nafas-blue/20'
                    : 'border-nafas-reed/30 hover:border-nafas-reed/30 text-nafas-neutral-slate'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-amber-600 mb-2"></div>
                <div className="font-bold">حروق الحواف</div>
                <div className="text-[10px] text-gray-500 font-normal">إجهاد حراري صيفي</div>
              </button>

              <button
                onClick={() => setSelectedSymptom('leaf_curl')}
                className={`p-4 rounded-2xl text-right border text-xs font-bold transition-all space-y-1 ${
                  selectedSymptom === 'leaf_curl'
                    ? 'border-nafas-blue bg-nafas-blue/10 text-nafas-silt ring-2 ring-nafas-blue/20'
                    : 'border-nafas-reed/30 hover:border-nafas-reed/30 text-nafas-neutral-slate'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-nafas-blue mb-2"></div>
                <div className="font-bold">التفاف وانكماش</div>
                <div className="text-[10px] text-gray-500 font-normal">إجهاد ري أو حشرات</div>
              </button>
            </div>

            {/* Selected Symptom Detailed Safe Care Card */}
            {selectedSymptom && symptomGuides[selectedSymptom] ? (
              <div className="p-5 rounded-2xl bg-nafas-sand border border-nafas-reed/10 space-y-3 animate-in fade-in">
                <div className="font-black text-base text-nafas-silt">
                  {symptomGuides[selectedSymptom].title}
                </div>

                <div className="text-xs text-nafas-neutral-slate leading-relaxed">
                  <strong className="text-nafas-silt block mb-1">التشخيص الأولي المرجح:</strong>
                  {symptomGuides[selectedSymptom].diagnosis}
                </div>

                <div className="p-3 bg-nafas-ivory rounded-xl border border-nafas-reed/30 text-xs text-nafas-silt leading-relaxed">
                  <strong className="block mb-0.5 text-nafas-silt font-bold">المعالجة الآمنة المقترحة (بدون مبيدات خطرة):</strong>
                  {symptomGuides[selectedSymptom].safeRemedy}
                </div>

                <div className="text-[11px] text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  ⚠️ <strong>تحذير:</strong> {symptomGuides[selectedSymptom].caution}
                </div>
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-nafas-reed/30 rounded-2xl text-center text-xs text-gray-400">
                انقر على أحد الأعراض أعلاه لعرض الإرشادات التشخيصية الآمنة لبيئة العراق
              </div>
            )}

          </div>

          {/* Column 2: Submit Case & Future Roadmap Services */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Consultation Request Form */}
            <div className="bg-nafas-ivory p-6 rounded-3xl border border-nafas-reed/10 shadow-sm space-y-4">
              <h3 className="font-black text-base text-nafas-silt flex items-center gap-2">
                <Sprout className="w-5 h-5 text-nafas-blue" />
                <span>رفع استفسار لصيدلية نَفَس النباتية</span>
              </h3>

              {consultationSubmitted ? (
                <div className="p-6 text-center space-y-3 bg-nafas-misty/40 rounded-2xl border border-nafas-reed/30">
                  <CheckCircle2 className="w-10 h-10 text-nafas-blue mx-auto" />
                  <h4 className="font-bold text-sm text-nafas-silt">تم تسجيل استشارتك بنجاح!</h4>
                  <p className="text-xs text-nafas-blue">
                    سيتم فحص الحالة وإضافتها لسجل الحالات الزراعية المجتمعية الآمنة.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitConsultation} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-nafas-silt mb-1">نوع الشجرة أو النبات:</label>
                    <input
                      type="text"
                      required
                      value={plantType}
                      onChange={(e) => setPlantType(e.target.value)}
                      className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-nafas-silt mb-1">وصف الحالة وعمر الشتلة:</label>
                    <textarea
                      rows={2}
                      required
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value)}
                      placeholder="اذكر موقع النبتة (ظل/شمس)، نظام الري الحالي، والأعراض..."
                      className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-nafas-silt hover:bg-nafas-silt/90 text-nafas-ivory font-bold text-xs shadow"
                  >
                    إرسال للفحص الاسترشادي
                  </button>
                </form>
              )}
            </div>

            {/* Future Services Preview (Explicitly Gated as "قريباً") */}
            <div className="p-5 rounded-3xl bg-nafas-sand border border-nafas-reed/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-nafas-silt flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-nafas-blue" />
                  <span>خدمات الصيدلية قيد التطوير والترخيص</span>
                </span>
                <span className="bg-nafas-blue text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  قريباً
                </span>
              </div>

              <p className="text-nafas-neutral-slate text-[11px] leading-relaxed">
                التزاماً بالمصداقية، لن يتم تفعيل خدمات طلب الشتلات المعتمدة والتوصيل المنزلي والاستشارات المباشرة مع المهندسين الزراعيين إلا بعد اكتمال التنسيق المؤسسي واعتماد المشاتل المحلية الشريكة.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-nafas-reed/10 text-gray-500 text-[11px]">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>كتالوج الأسمدة العضوية ومحسنات التربة الرافدينية</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>حجز شتلات زراعية مدعومة من المشاتل المعتمدة</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
