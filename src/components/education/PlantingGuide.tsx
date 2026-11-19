'use client';

import React, { useState } from 'react';
import { useNafas } from '@/lib/store';
import { IRAQ_GOVERNORATES, PLANTING_RECOMMENDATIONS } from '@/lib/constants';
import { 
  Sprout, 
  Droplets, 
  Sun, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  BookOpen, 
  Info 
} from 'lucide-react';

export const PlantingGuide: React.FC = () => {
  const { t } = useNafas();
  const [selectedGovId, setSelectedGovId] = useState<string>('baghdad');
  
  // Current month (1-12)
  const currentMonth = new Date().getMonth() + 1; // e.g. 11 for November

  const selectedGov = IRAQ_GOVERNORATES.find(g => g.id === selectedGovId) || IRAQ_GOVERNORATES[0];

  const suitablePlants = PLANTING_RECOMMENDATIONS.filter(p => 
    p.suitableGovernorates.includes('all') || p.suitableGovernorates.includes(selectedGovId)
  );

  const monthNamesAr = [
    'كانون الثاني (1)', 'شباط (2)', 'آذار (3)', 'نيسان (4)', 
    'أيار (5)', 'حزيران (6)', 'تموز (7)', 'آب (8)', 
    'أيلول (9)', 'تشرين الأول (10)', 'تشرين الثاني (11)', 'كانون الأول (12)'
  ];

  return (
    <section className="py-16 bg-nafas-ivory border-b border-nafas-reed/10 font-arabic text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nafas-misty text-nafas-blue text-xs font-bold mb-2">
              <Sprout className="w-4 h-4 text-nafas-blue" />
              <span>الإرشاد الزراعي المناخي الأصيل</span>
            </div>
            <h2 className="text-3xl font-black text-nafas-silt">
              {t.plantingGuideTitle}
            </h2>
            <p className="text-sm text-nafas-neutral-slate mt-1 max-w-2xl">
              {t.plantingGuideSubtitle}
            </p>
          </div>

          {/* Governorate Selector */}
          <div className="flex items-center gap-2 bg-nafas-sand p-2 rounded-2xl border border-nafas-reed/10 self-start md:self-auto">
            <MapPin className="w-4 h-4 text-nafas-blue" />
            <label className="text-xs font-bold text-nafas-silt">المحافظة:</label>
            <select
              value={selectedGovId}
              onChange={(e) => setSelectedGovId(e.target.value)}
              className="text-xs font-arabic bg-nafas-ivory border border-nafas-reed/15 rounded-xl px-3 py-1.5 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
            >
              {IRAQ_GOVERNORATES.map(gov => (
                <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Governorate Climate Profile */}
        <div className="p-6 rounded-3xl bg-nafas-sand border border-nafas-reed/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-nafas-blue">
              الخصائص المناخية لمنطقة: {selectedGov.nameAr}
            </span>
            <h3 className="text-lg font-black text-nafas-silt">
              {selectedGov.climateZone}
            </h3>
            <p className="text-xs text-nafas-neutral-slate">
              {selectedGov.descriptionAr}
            </p>
          </div>

          <div className="bg-nafas-ivory px-4 py-3 rounded-2xl border border-nafas-reed/10 text-xs space-y-1 shrink-0">
            <span className="text-gray-500 font-bold block">شهر الغرس الحالي:</span>
            <span className="text-nafas-blue font-bold text-sm block">
              {monthNamesAr[currentMonth - 1]}
            </span>
            <span className="text-[10px] text-nafas-blue font-bold">
              موسم مثالي لتأسيس الجذور قبل حرارة الصيف
            </span>
          </div>
        </div>

        {/* Suitable Species Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suitablePlants.map(plant => {
            const isPlantingNow = plant.bestPlantingMonths.includes(currentMonth);

            return (
              <div
                key={plant.id}
                className="bg-nafas-ivory rounded-3xl p-6 border border-nafas-reed/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  
                  {/* Status Tag */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-gray-500 italic">
                      {plant.scientificName}
                    </span>
                    {isPlantingNow && (
                      <span className="text-xs font-bold bg-nafas-misty text-nafas-blue px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-nafas-blue" />
                        <span>مناسب للغرس هذا الشهر!</span>
                      </span>
                    )}
                  </div>

                  {/* Arabic Common Name */}
                  <h3 className="text-lg font-black text-nafas-silt">
                    {plant.speciesNameAr}
                  </h3>

                  {/* Tolerances Badges */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                      <Droplets className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                      <span className="text-[10px] text-gray-500 block">الاحتياج المائي</span>
                      <span className="font-bold text-blue-900">{plant.waterNeed === 'low' ? 'قليل' : 'معتدل'}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                      <Sun className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                      <span className="text-[10px] text-gray-500 block">تحمل الحرارة</span>
                      <span className="font-bold text-amber-900">{plant.heatTolerance === 'extreme' ? 'فائق (50°+)' : 'عالي'}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-nafas-misty/40 border border-nafas-reed/30">
                      <Sprout className="w-4 h-4 text-nafas-blue mx-auto mb-1" />
                      <span className="text-[10px] text-gray-500 block">تحمل الملوحة</span>
                      <span className="font-bold text-nafas-silt">{plant.salinityTolerance === 'high' ? 'عالي' : 'متوسط'}</span>
                    </div>
                  </div>

                  {/* Ecological Value */}
                  <div className="text-xs text-nafas-neutral-slate leading-relaxed border-t border-nafas-reed/20 pt-3">
                    <strong className="text-nafas-silt block mb-1">الأهمية البيئية لبلاد الرافدين:</strong>
                    {plant.ecologicalRole}
                  </div>

                </div>

                {/* Practical Care Tips */}
                <div className="mt-4 pt-3 border-t border-nafas-reed/20 bg-nafas-sand/50 p-3 rounded-2xl text-[11px] text-nafas-neutral-slate">
                  <strong>نصيحة الري والعناية:</strong> {plant.careTips}
                </div>

              </div>
            );
          })}
        </div>

        {/* Scientific Source Citation Disclaimer */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-nafas-reed/30 text-xs text-nafas-neutral-slate flex items-start gap-3">
          <Info className="w-5 h-5 text-nafas-blue shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong>المصادر العلمية المعتمدة:</strong> تم إعداد التوصيات بالاستناد إلى أبحاث كلية الزراعة في جامعة بغداد، ودراسات معهد الغابات ومكافحة التصحر، والتقارير الفنية لمنظمة الأغذية والزراعة (الفاو) لبيئة بلاد الرافدين.
          </div>
        </div>

      </div>
    </section>
  );
};
