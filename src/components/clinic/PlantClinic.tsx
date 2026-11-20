'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNafas } from '@/lib/store';
import { PlantRecord, ProblemRecord, SeasonalCareRecord } from '@/types/plants';
import { getAssetUrl } from '@/lib/basePath';
import { 
  botanicalData, 
  searchAndFilterPlants, 
  checkSharedFolkNameAlert, 
  getUniquePlantFamilies, 
  getUniqueDocumentedRegions,
  getPlantHazard
} from '@/lib/plantSearch';
import { PlantDetailModal } from '@/components/clinic/PlantDetailModal';
import { PlantTriageModal } from '@/components/clinic/PlantTriageModal';
import { OrchidMotif } from '@/components/brand/OrchidMotif';
import { 
  HeartHandshake, 
  ShieldAlert, 
  Sprout, 
  Search, 
  Filter, 
  AlertTriangle, 
  BookOpen, 
  Calendar, 
  Flame, 
  Eye, 
  Hand, 
  PawPrint, 
  Baby, 
  ChevronDown, 
  ExternalLink, 
  HelpCircle, 
  Sparkles, 
  SlidersHorizontal, 
  X, 
  CheckCircle2, 
  Info, 
  Lock,
  Layers,
  PhoneCall
} from 'lucide-react';

export const PlantClinic: React.FC = () => {
  const { t } = useNafas();

  // Active Tab: 'triage' | 'catalog' | 'problems' | 'calendar' | 'policies'
  const [activeTab, setActiveTab] = useState<'triage' | 'catalog' | 'problems' | 'calendar' | 'policies'>('catalog');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedRoute, setSelectedRoute] = useState<any>('');
  const [selectedAudience, setSelectedAudience] = useState<any>('');
  const [isInvasiveOnly, setIsInvasiveOnly] = useState(false);
  const [notAssessedOnly, setNotAssessedOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals State
  const [selectedPlantForDetail, setSelectedPlantForDetail] = useState<PlantRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [triageInitialPlantId, setTriageInitialPlantId] = useState<string | undefined>(undefined);

  // Researcher Mode Toggle
  const [isResearcherMode, setIsResearcherMode] = useState(false);

  // 3D Orchid WebGL Model State
  const [show3dOrchid, setShow3dOrchid] = useState(false);
  const [selectedOrchidPart, setSelectedOrchidPart] = useState<'flower' | 'leaf' | 'root' | 'stem'>('flower');
  const orchidIframeRef = useRef<HTMLIFrameElement>(null);

  const orchidPartDetails: Record<'flower' | 'leaf' | 'root' | 'stem', { title: string; subtitle: string; description: string; careTip: string }> = {
    flower: {
      title: 'الأزهار والبتلات',
      subtitle: 'أعضاء التكاثر وجذب الملقحات الحيوية',
      description: 'تتكون الزهرة في الأوركيد من ثلاث سبلات وثلاث بتلات منها الشفة السفلية (Labellum) المتمايزة لإرشاد النحل والحشرات الملقحة. في علم النبات العلاجي، تُدرس الأزهار لاحتوائها على مركبات طيارة، وتُفحص بعناية لتمييز الأنواع السامة مثل الدفلة عن الأنواع الطبية الآمنة.',
      careTip: 'الري المعتدل وتجنب رش الماء مباشرة على البتلات يمنع تكون البقع الفطرية ويطيل فترة الإزهار.'
    },
    leaf: {
      title: 'الأوراق والمسام التنفسية',
      subtitle: 'مركز التمثيل الضوئي وتبادل الغازات',
      description: 'أوراق النبات العريض تحتضن خلايا البناء الضوئي والمسام التي تمتص ثاني أكسيد الكربون وتطلق الأكسجين. تُعتبر الأوراق المؤشر البصري الأول لصحة النبات، حيث يدل اصفرارها (Chlorosis) على نقص الحديد أو تعفن الجذور، وتدل الحروق الطرفية على ملوحة المياه.',
      careTip: 'مسح الأوراق بقطعة قماش ناعمة مبللة بالماء المقطر يزيل الغبار ويعزز قدرة النبتة على التنفس الضوئي.'
    },
    root: {
      title: 'الجذور وشعيرات الامتصاص',
      subtitle: 'الجذور الهوائية والأرضية لامتصاص الرطوبة وتثبيت النبات',
      description: 'تمتلك نباتات الأوركيد والفصائل الهوائية جذوراً مغطاة بنسيج الفيلادين (Velamen) الفضي الذي يمتص الرطوبة الجوية والندى. في بيئة العراق الجافة، تتكيف النباتات الأصيلة بجذور وتدية عميقة تصل للمياه الجوفية (مثل السدر والغاف).',
      careTip: 'تهوية التربة والتأكد من وجود ثقوب تصريف كافية في الأصيص يمنع اختناق الجذور وظهور الفطريات اللاهوائية.'
    },
    stem: {
      title: 'الساق والأنسجة الوعائية',
      subtitle: 'الدعامة الهيكلية وقنوات الخشب واللحاء',
      description: 'تحمل الساق الأوراق والأزهار وتنقل العصارة الغذائية والماء عبر الحزم الوعائية. مقاومة السيقان للرياح العاتية وتكيفها مع الجفاف عبر التخزين العصاري هي ميزة تطورية أساسية لنباتات المناطق الحارة.',
      careTip: 'تثبيت السيقان الرفيعة بدعامات خيزران وتجنب الري الزائد عند قاعدة الساق يقيها من التعفن التاجي.'
    }
  };

  useEffect(() => {
    const handleOrchidMessage = (e: MessageEvent) => {
      if (e.data?.type === 'nafas:plant-part-select') {
        const { part } = e.data.detail || {};
        if (part && ['flower', 'leaf', 'root', 'stem'].includes(part)) {
          setSelectedOrchidPart(part);
        }
      }
    };
    window.addEventListener('message', handleOrchidMessage);
    return () => window.removeEventListener('message', handleOrchidMessage);
  }, []);

  // Filtered Plants List
  const filteredPlants = useMemo(() => {
    return searchAndFilterPlants({
      query: searchQuery,
      family: selectedFamily,
      distributionStatus: selectedStatus,
      governorate: selectedRegion,
      hazardRoute: selectedRoute || undefined,
      targetAudience: selectedAudience || undefined,
      isInvasive: isInvasiveOnly,
      notAssessedOnly: notAssessedOnly,
      excludeDistributionHold: !isResearcherMode
    });
  }, [
    searchQuery, 
    selectedFamily, 
    selectedStatus, 
    selectedRegion, 
    selectedRoute, 
    selectedAudience, 
    isInvasiveOnly, 
    notAssessedOnly, 
    isResearcherMode
  ]);

  // Shared Folk Name Warning
  const folkNameAlert = useMemo(() => {
    return checkSharedFolkNameAlert(searchQuery);
  }, [searchQuery]);

  const familiesList = useMemo(() => getUniquePlantFamilies(), []);
  const regionsList = useMemo(() => getUniqueDocumentedRegions(), []);

  const openPlantDetail = (plant: PlantRecord) => {
    setSelectedPlantForDetail(plant);
    setIsDetailModalOpen(true);
  };

  const launchTriageForPlant = (plantId?: string) => {
    setTriageInitialPlantId(plantId);
    setIsTriageModalOpen(true);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedFamily('all');
    setSelectedStatus('all');
    setSelectedRegion('all');
    setSelectedRoute('');
    setSelectedAudience('');
    setIsInvasiveOnly(false);
    setNotAssessedOnly(false);
  };

  const activeFiltersCount = [
    selectedFamily !== 'all',
    selectedStatus !== 'all',
    selectedRegion !== 'all',
    Boolean(selectedRoute),
    Boolean(selectedAudience),
    isInvasiveOnly,
    notAssessedOnly
  ].filter(Boolean).length;

  return (
    <section className="py-12 bg-nafas-sand border-b border-nafas-reed/15 font-arabic text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Hero Bar */}
        <div className="relative bg-nafas-ivory rounded-3xl p-6 sm:p-10 border border-nafas-reed/20 shadow-sm overflow-hidden">
          <div className="absolute -top-12 -left-12 opacity-10 pointer-events-none">
            <OrchidMotif size="xl" />
          </div>

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nafas-misty text-nafas-blue text-xs font-bold border border-nafas-blue/20">
              <Sprout className="w-4 h-4 text-nafas-blue" />
              <span>الصيدلية النباتية في نَفَس • الإصدار العلمي 1.0.0</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-nafas-silt tracking-tight">
              الصيدلية النباتية والتوزع النباتي العراقي
            </h1>

            <p className="text-sm text-stone-700 leading-relaxed">
              منظومة علمية ومجتمعية متكاملة لتوثيق النباتات الأصيلة والبرية في العراق، فرز مخاطر التسمم المنزلي والإسعاف الأولي، وتشخيص آفات النباتات وفق خصوصية التربة والمناخ الرافديني.
            </p>

            {/* Quick Action Buttons for Emergency & Triage */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => launchTriageForPlant()}
                className="px-5 py-3 rounded-2xl bg-nafas-blue text-nafas-ivory font-black text-xs sm:text-sm hover:bg-nafas-blue/90 shadow-sm transition-all flex items-center gap-2"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>بدء الفحص النباتي والإسعاف الأولي</span>
              </button>

              <button
                onClick={() => setShow3dOrchid(!show3dOrchid)}
                className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 border ${
                  show3dOrchid
                    ? 'bg-purple-900 text-white border-purple-950 shadow-sm'
                    : 'bg-nafas-sand/80 text-nafas-silt border-nafas-reed/30 hover:bg-nafas-sand'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>{show3dOrchid ? 'إخفاء مجسم الأوركيد 3D' : 'مجسم الأوركيد الحيّ (3D)'}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('triage');
                }}
                className="px-5 py-3 rounded-2xl bg-red-50 text-red-700 border border-red-300 font-bold text-xs sm:text-sm hover:bg-red-100 transition-all flex items-center gap-2"
              >
                <Flame className="w-4 h-4 text-red-600" />
                <span>بروتوكول إسعاف الطوارئ (122)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3D ORCHID INTERACTIVE BOTANICAL ENTRANCE                */}
        {/* ======================================================== */}
        {show3dOrchid && (
          <section className="bg-nafas-ivory rounded-3xl p-5 border-2 border-purple-300/40 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-nafas-reed/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-800">
                  <OrchidMotif variant="icon" size="sm" />
                </div>
                <div>
                  <h3 className="text-base font-black text-nafas-silt">
                    مجسم الأوركيد الحيّ ثلاثي الأبعاد — تشريح النبات التعليمي
                  </h3>
                  <p className="text-xs text-nafas-silt/70">
                    نموذج تفاعلي مستوحى من Phalaenopsis لاستكشاف بنية الأوراق، الأزهار، الجذور، والساق
                  </p>
                </div>
              </div>

              {/* Accessible Alternative Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['flower', 'leaf', 'root', 'stem'] as const).map(partKey => (
                  <button
                    key={partKey}
                    onClick={() => {
                      setSelectedOrchidPart(partKey);
                      try {
                        const cw = orchidIframeRef.current?.contentWindow as any;
                        if (cw && typeof cw.choosePart === 'function') {
                          cw.choosePart(partKey);
                        }
                      } catch (e) {}
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedOrchidPart === partKey
                        ? 'bg-purple-800 text-white shadow-xs'
                        : 'bg-nafas-sand/60 text-nafas-silt hover:bg-nafas-sand border border-nafas-reed/30'
                    }`}
                  >
                    {partKey === 'flower' ? 'الأزهار' : partKey === 'leaf' ? 'الأوراق' : partKey === 'root' ? 'الجذور' : 'الساق'}
                  </button>
                ))}
              </div>
            </div>

            {/* Split View: 3D WebGL Canvas + Educational Detail Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 3D WebGL Viewport */}
              <div className="lg:col-span-8 bg-[#181622] rounded-2xl overflow-hidden h-[450px] sm:h-[520px] relative border border-nafas-reed/30">
                <iframe
                  ref={orchidIframeRef}
                  src={getAssetUrl('/nafas-orchid-3d.html')}
                  title="مجسم الأوركيد ثلاثي الأبعاد - نَفَس"
                  className="w-full h-full border-0 select-none"
                />
              </div>

              {/* Educational Card for Selected Part */}
              <div className="lg:col-span-4 bg-nafas-sand/40 rounded-2xl p-5 border border-nafas-reed/30 flex flex-col justify-between space-y-4 text-right">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                    <span>الجزء المحدد: {orchidPartDetails[selectedOrchidPart].title}</span>
                  </div>

                  <h4 className="text-base font-black text-nafas-silt">
                    {orchidPartDetails[selectedOrchidPart].subtitle}
                  </h4>

                  <p className="text-xs text-nafas-silt/80 leading-relaxed">
                    {orchidPartDetails[selectedOrchidPart].description}
                  </p>

                  <div className="bg-nafas-ivory p-3.5 rounded-xl border border-nafas-reed/20 space-y-1">
                    <span className="text-[11px] font-bold text-nafas-blue block">💡 إرشاد الرعاية الميداني:</span>
                    <p className="text-[11px] text-stone-700 leading-relaxed">
                      {orchidPartDetails[selectedOrchidPart].careTip}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-nafas-reed/20 text-[10px] text-nafas-silt/60 leading-normal">
                  ⚠️ <strong>ملاحظة توعوية:</strong> هذا المجسم الفني الهندسي للأغراض التعليمية التشريحية، ولا يُمثّل تشخيصاً زراعياً أو وصفة طبية أو دليلاً على توزع بري محلي في العراق.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-nafas-reed/20 pb-2">
          {[
            { id: 'catalog', label: 'فهرس النباتات العراقية', icon: Sprout, count: filteredPlants.length },
            { id: 'triage', label: 'التشخيص الذكي والإسعاف', icon: HeartHandshake },
            { id: 'problems', label: 'دليل الآفات والمشكلات', icon: AlertTriangle, count: botanicalData.problems.length },
            { id: 'calendar', label: 'التقويم الزراعي والمحاصيل', icon: Calendar, count: botanicalData.seasonal_care.length },
            { id: 'policies', label: 'المصادر والسياسات العلمية', icon: BookOpen, count: botanicalData.sources.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-nafas-blue text-nafas-ivory shadow-sm'
                    : 'bg-nafas-ivory text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-nafas-ivory' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PLANT CATALOG & MULTI-AXIS SEARCH                 */}
        {/* ======================================================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            
            {/* Search Box & Quick Controls */}
            <div className="bg-nafas-ivory p-6 rounded-3xl border border-nafas-reed/15 shadow-sm space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم العربي (الدفلة، الخروع، الحنظل)، السوراني (Gazna، Kurade)، اللاتيني (Nerium oleander) أو المرادفات..."
                  className="w-full pr-12 pl-10 py-3.5 rounded-2xl border border-stone-300 bg-white text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-nafas-blue outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:text-stone-700"
                    aria-label="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Shared Folk Name Warning Banner */}
              {folkNameAlert && (
                <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fadeIn ${
                  folkNameAlert.level === 'critical' 
                    ? 'bg-red-50 border-red-300 text-red-950' 
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}>
                  <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                    folkNameAlert.level === 'critical' ? 'text-red-600' : 'text-amber-600'
                  }`} />
                  <div className="space-y-1">
                    <span className="font-black block">
                      تنبيه أمان بشأن الأسماء الشعبية المشتركة:
                    </span>
                    <p className="leading-relaxed">{folkNameAlert.warningAr}</p>
                  </div>
                </div>
              )}

              {/* Filters Toggle & Active Tags */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                      showAdvancedFilters || activeFiltersCount > 0
                        ? 'bg-nafas-misty border-nafas-blue text-nafas-blue'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>فلاتر متقدمة</span>
                    {activeFiltersCount > 0 && (
                      <span className="bg-nafas-blue text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {activeFiltersCount}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  </button>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-red-700 hover:underline font-bold px-2 py-1"
                    >
                      إعادة ضبط الفلاتر
                    </button>
                  )}
                </div>

                <div className="text-xs text-stone-500">
                  عرض <strong className="text-stone-900 font-bold">{filteredPlants.length}</strong> من أصل {botanicalData.plants.length} نوعاً نباتياً
                </div>
              </div>

              {/* Advanced Multi-Axis Filters Panel */}
              {showAdvancedFilters && (
                <div className="pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn text-xs">
                  {/* 1. Family Filter */}
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">العائلة النباتية (Family):</label>
                    <select
                      value={selectedFamily}
                      onChange={(e) => setSelectedFamily(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium"
                    >
                      <option value="all">جميع العائلات النباتية</option>
                      {familiesList.map(fam => (
                        <option key={fam} value={fam}>{fam}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Distribution Status Filter */}
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">حالة التوزع في العراق:</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium"
                    >
                      <option value="all">جميع حالات التوزع</option>
                      <option value="native">أصيل في العراق (Native)</option>
                      <option value="wild_documented">بري موثق</option>
                      <option value="introduced">دخيل (Introduced)</option>
                      <option value="ornamental">زينة شائعة</option>
                      <option value="cultivated">مزروع حقلياً</option>
                    </select>
                  </div>

                  {/* 3. Documented Region / Governorate */}
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">النطاق أو المحافظة الموثقة:</label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium"
                    >
                      <option value="all">جميع المحافظات والنطاقات</option>
                      {regionsList.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Hazard Route Filter */}
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">مسار الخطر الموثق:</label>
                    <select
                      value={selectedRoute}
                      onChange={(e) => setSelectedRoute(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium"
                    >
                      <option value="">جميع المسارات</option>
                      <option value="ingestion">خطر الابتلاع الفموي</option>
                      <option value="skin">خطر التلامس الجلدي</option>
                      <option value="eyes">خطر التهيج العيني</option>
                      <option value="pollen">تحسس تنفسي / لقاح</option>
                      <option value="food">تسمم غذائي</option>
                    </select>
                  </div>

                  {/* 5. Target Audience Filter */}
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">الفئات الحساسة المعرضة للخطر:</label>
                    <select
                      value={selectedAudience}
                      onChange={(e) => setSelectedAudience(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium"
                    >
                      <option value="">جميع الفئات</option>
                      <option value="children">الأطفال</option>
                      <option value="pets">الحيوانات الأليفة (قطط/كلاب)</option>
                      <option value="pregnancy">الحوامل</option>
                      <option value="livestock">المواشي</option>
                    </select>
                  </div>

                  {/* 6. Checkboxes: Invasive & Not Assessed */}
                  <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                      <input
                        type="checkbox"
                        checked={isInvasiveOnly}
                        onChange={(e) => setIsInvasiveOnly(e.target.checked)}
                        className="rounded text-nafas-blue w-4 h-4"
                      />
                      <span>نباتات غازية أو سريعة الانتشار بيئياً (مثل ورد النيل)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                      <input
                        type="checkbox"
                        checked={notAssessedOnly}
                        onChange={(e) => setNotAssessedOnly(e.target.checked)}
                        className="rounded text-nafas-blue w-4 h-4"
                      />
                      <span>التقييم غير متوفر / قيد المراجعة السمومية</span>
                    </label>

                    {/* Researcher Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900 mr-auto">
                      <input
                        type="checkbox"
                        checked={isResearcherMode}
                        onChange={(e) => setIsResearcherMode(e.target.checked)}
                        className="rounded text-purple-700 w-4 h-4"
                      />
                      <span>إظهار السجلات المحجوبة للمراجعة (وضع الباحث)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* MANDATORY WARNING BANNER: ABSENCE OF HAZARD TAG != SAFE */}
            <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200 text-stone-700 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-nafas-blue shrink-0" />
                <span>
                  <strong>قاعدة أمان المنصة:</strong> غياب وسام الخطر عن نبتة لا يثبت أمانها للاستهلاك الآدمي أو البيطري، بل يعني أن السجل قيد التوثيق والتدقيق.
                </span>
              </div>
            </div>

            {/* Plant Grid Cards */}
            {filteredPlants.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPlants.map(plant => {
                  const hazard = getPlantHazard(plant.id);
                  const severity = hazard?.severity || plant.hazards?.severity || 'not_assessed';
                  const primaryCommonName = plant.locale?.common_names?.[0]?.name || plant.taxon.scientific_name;
                  const kurdishName = plant.locale?.common_names?.find(cn => cn.language === 'ckb-Latn' || cn.language === 'ckb');

                  return (
                    <div
                      key={plant.id}
                      className="bg-nafas-ivory rounded-3xl border border-nafas-reed/15 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        {/* Badges Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                          <span className="font-sans px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-600 font-bold border border-stone-200">
                            {plant.taxon.family}
                          </span>

                          {/* Severity badge */}
                          {severity === 'critical' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold border border-red-200 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-red-600" />
                              <span>شديد السمية</span>
                            </span>
                          ) : severity === 'high' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold border border-orange-200 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-orange-600" />
                              <span>عالي الخطورة</span>
                            </span>
                          ) : severity === 'moderate' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>متوسط الخطورة</span>
                            </span>
                          ) : severity === 'low' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                              منخفض الخطورة
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium border border-stone-200">
                              التقييم غير متوفر
                            </span>
                          )}
                        </div>

                        {/* Title & Latin Taxon */}
                        <div>
                          <h3 className="text-xl font-black text-nafas-silt group-hover:text-nafas-blue transition-colors">
                            {primaryCommonName}
                          </h3>
                          <p className="text-xs font-sans italic text-stone-500 tracking-wide mt-0.5">
                            {plant.taxon.scientific_name} {plant.taxon.authority}
                          </p>
                          {kurdishName && (
                            <p className="text-[11px] text-stone-600 font-medium mt-1">
                              بالكردية: <span className="font-sans font-bold">{kurdishName.name}</span>
                            </p>
                          )}
                        </div>

                        {/* Short Description */}
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {plant.locale?.description || 'الوصف قيد المراجعة في العينات العراقية.'}
                        </p>

                        {/* Distribution Tag */}
                        <div className="pt-1 flex flex-wrap gap-1 text-[11px]">
                          {plant.distributions?.[0] && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                              📍 {plant.distributions[0].region_ar || 'مثبت قطرياً على مستوى العراق'}
                            </span>
                          )}
                          {plant.review_status === 'hold_distribution_review' && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                              حجب التوزع
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openPlantDetail(plant)}
                          className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                          <span>التفاصيل والأدلة</span>
                        </button>

                        <button
                          onClick={() => launchTriageForPlant(plant.id)}
                          className="px-3.5 py-2 rounded-xl bg-nafas-misty hover:bg-nafas-misty/80 text-nafas-blue text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <HeartHandshake className="w-3.5 h-3.5 text-nafas-blue" />
                          <span>فحص النبتة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-nafas-ivory rounded-3xl border border-stone-200 space-y-3">
                <Sprout className="w-10 h-10 text-stone-300 mx-auto" />
                <h4 className="text-lg font-black text-stone-700">لم يتم العثور على نباتات مطابقة للبحث</h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  جرب تغيير كلمات البحث، إزالة بعض الفلاتر المحددة، أو كتابة الاسم اللاتيني.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-xl bg-nafas-blue text-nafas-ivory text-xs font-bold"
                >
                  مسح كافة الفلاتر
                </button>
              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TRIAGE & EMERGENCY LAUNCH HUB                     */}
        {/* ======================================================== */}
        {activeTab === 'triage' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card A: Emergency 122 Protocol */}
              <div className="p-8 rounded-3xl bg-red-600 text-white space-y-5 shadow-lg flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-amber-300" />
                  </div>
                  <h3 className="text-2xl font-black">
                    بروتوكول إسعاف الطوارئ الفوري (122)
                  </h3>
                  <p className="text-xs sm:text-sm text-red-50 leading-relaxed">
                    إذا كان هناك اشتباه بتسمم طفل أو شخص أو حيوان أليف نتيجة ابتلاع بذور، أوراق، أو ملامسة عصارة كاوية للعين، افتح البروتوكول فوراً دون أي قيود أو تسجيل دخول.
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-red-500">
                  <a
                    href="tel:122"
                    className="w-full py-3 rounded-2xl bg-amber-400 text-stone-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-amber-300 transition-all shadow-md"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>اتصال فوري بالإسعاف الوطني (122)</span>
                  </a>

                  <button
                    onClick={() => {
                      setTriageInitialPlantId(undefined);
                      setIsTriageModalOpen(true);
                    }}
                    className="w-full py-3 rounded-2xl bg-red-700 text-white font-bold text-xs hover:bg-red-800 transition-all"
                  >
                    عرض خطوات الإسعاف التفصيلية (العين / الجلد / الابتلاع)
                  </button>
                </div>
              </div>

              {/* Card B: Stepped Plant Health Diagnosis */}
              <div className="p-8 rounded-3xl bg-nafas-ivory border border-nafas-reed/20 shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Sprout className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="text-2xl font-black text-nafas-silt">
                    الفاحص الذكي المتدرج لمشاكل النبات
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    تشخيص استرشادي متدرج يطابق أعراض نبتتك (اصفرار، جفاف حواف، ذبول، آفات حشرية) مع قاعدة بيانات المشكلات المعتمدة لبيئة وتربة ومياه العراق.
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-stone-200">
                  <button
                    onClick={() => {
                      setTriageInitialPlantId(undefined);
                      setIsTriageModalOpen(true);
                    }}
                    className="w-full py-3 rounded-2xl bg-nafas-blue text-nafas-ivory font-black text-xs sm:text-sm hover:bg-nafas-blue/90 shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    <span>بدء أسئلة التشخيص الاسترشادي</span>
                  </button>
                  <p className="text-[11px] text-stone-500 text-center">
                    خالٍ تماماً من وصفات المبيدات الكيميائية العشوائية • متوافق مع سياسات الخصوصية
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PROBLEMS & PESTS ENCYCLOPEDIA                     */}
        {/* ======================================================== */}
        {activeTab === 'problems' && (
          <div className="space-y-6">
            <div className="bg-nafas-ivory p-6 rounded-3xl border border-nafas-reed/15 shadow-sm space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-nafas-silt">
                دليل آفات ومشكلات النبات المعتمدة في البيئة العراقية
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                مصفوفة مرجعية تضم 10 مشكلات فسيولوجية ومرضية وحشرية شائعة، مصنفة حسب مسبباتها البيئية مع إجراءات الوقاية الآمنة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {botanicalData.problems.map(prob => (
                <div 
                  key={prob.id}
                  className="p-6 rounded-3xl bg-nafas-ivory border border-stone-200 shadow-sm space-y-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <h4 className="text-lg font-black text-nafas-silt">
                        {prob.problem_ar}
                      </h4>
                      <p className="text-stone-500 font-sans text-xs italic">
                        {prob.problem_en}
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-nafas-misty text-nafas-blue font-bold text-xs">
                      {prob.category === 'water' ? 'إجهاد مائي' :
                       prob.category === 'pest' ? 'آفة حشرية' :
                       prob.category === 'disease' ? 'مرض فطري/بكتيري' :
                       prob.category === 'climate' ? 'إجهاد مناخي' :
                       prob.category === 'soil' ? 'ملوحة وتربة' : prob.category}
                    </span>
                  </div>

                  {/* Primary Symptoms */}
                  <div className="space-y-1">
                    <span className="font-bold text-stone-900 block">الأعراض الرئيسية:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-stone-700 text-[11px]">
                      {prob.primary_symptoms?.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Environmental Triggers */}
                  <div className="space-y-1">
                    <span className="font-bold text-stone-900 block">المحفزات البيئية العراقية:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-stone-700 text-[11px]">
                      {prob.environmental_triggers?.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Safe Management */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sprout className="w-4 h-4 text-emerald-700" />
                      إجراءات المكافحة الآمنة:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-emerald-950 text-[11px]">
                      {prob.safe_management_ar?.map((sm, idx) => (
                        <li key={idx}>{sm}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Mandatory Chemical Warning */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px]">
                    <span className="font-bold text-amber-900 block mb-0.5">تحذير المبيدات:</span>
                    {prob.chemical_warning_ar}
                  </div>

                  {/* Escalation criteria */}
                  <div className="text-[11px] text-stone-500 pt-1">
                    <strong>متى يُطلب فحص مخبري: </strong>{prob.escalation_criteria_ar}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SEASONAL CALENDAR & CROPS                         */}
        {/* ======================================================== */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-nafas-ivory p-6 rounded-3xl border border-nafas-reed/15 shadow-sm space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-nafas-silt">
                التقويم الزراعي والمحاصيل الموسمية في العراق
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                دليل الممارسات الزراعية وإدارة مياه الري المتوافقة مع الفصول العراقية: الحبوب الشتوية، عنبر الفرات، نخيل التمر، قصب الأهوار، والمرتفعات الشمالية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {botanicalData.seasonal_care.map(sc => (
                <div
                  key={sc.id}
                  className="p-5 rounded-3xl bg-nafas-ivory border border-stone-200 shadow-sm space-y-3.5 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <h4 className="text-base font-black text-nafas-silt">
                        {sc.crop_or_zone_ar}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                        {sc.timing_ar}
                      </span>
                    </div>

                    {/* Key Actions */}
                    <div className="space-y-1">
                      <span className="font-bold text-stone-900 block">العمليات الزراعية المفتاحية:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-stone-700 text-[11px]">
                        {sc.key_actions_ar?.map((ka, idx) => (
                          <li key={idx}>{ka}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Water Management */}
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <span className="font-bold text-nafas-blue block">إدارة مياه الري:</span>
                      <p className="text-stone-700 text-[11px] leading-relaxed">
                        {sc.water_management_ar}
                      </p>
                    </div>

                    {/* Warnings */}
                    {sc.warnings_ar && sc.warnings_ar.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[10px] space-y-0.5">
                        <span className="font-bold text-amber-900">محاذير موسمية:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {sc.warnings_ar.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Sources tag */}
                  <div className="pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                    مراجع التوثيق: {sc.evidence_sources?.join('، ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: SCIENTIFIC SOURCES & SAFETY POLICIES              */}
        {/* ======================================================== */}
        {activeTab === 'policies' && (
          <div className="space-y-8">
            
            {/* Safety Policies */}
            <div className="bg-nafas-ivory p-6 sm:p-8 rounded-3xl border border-nafas-reed/15 shadow-sm space-y-6">
              <div className="space-y-2 border-b border-stone-200 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nafas-misty text-nafas-blue text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 text-nafas-blue" />
                  <span>لوائح الأمان والنزاهة العلمية</span>
                </div>
                <h3 className="text-2xl font-black text-nafas-silt">
                  سياسات السلامة والخصوصية المعتمدة في نَفَس
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  تلتزم منصة نَفَس بأعلى معايير الحذر العلمي وحماية الأرواح والخصوصية الرقمية للمواطنين العراقيين.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {botanicalData.safety_policies.map(sp => (
                  <div 
                    key={sp.id}
                    className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2"
                  >
                    <span className="font-black text-nafas-silt block text-sm">
                      {sp.title_ar}
                    </span>
                    <p className="text-stone-700 leading-relaxed text-[11px]">
                      {sp.rule_ar}
                    </p>
                    {sp.mandatory_actions && sp.mandatory_actions.length > 0 && (
                      <div className="pt-1 border-t border-stone-100 text-[10px] text-stone-500 space-y-0.5">
                        <strong className="text-stone-700">الإجراء الإلزامي: </strong>
                        <span>{sp.mandatory_actions.join(' • ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Scientific Sources Catalog */}
            <div className="bg-nafas-ivory p-6 sm:p-8 rounded-3xl border border-nafas-reed/15 shadow-sm space-y-5">
              <div className="space-y-1 border-b border-stone-200 pb-4">
                <h3 className="text-xl font-black text-nafas-silt flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-nafas-blue" />
                  <span>فهرس المراجع والأدلة المعتمدة ({botanicalData.sources.length} مرجعاً)</span>
                </h3>
                <p className="text-xs text-stone-600">
                  تشمل هرباريوم العراق الوطني (BAG)، الحدائق النباتية الملكية كيو (K)، أدنبرة (E)، ودراسات فلورا العراق المعتمدة.
                </p>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 text-xs">
                {botanicalData.sources.slice(0, 30).map(src => (
                  <div 
                    key={src.id}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-bold font-sans text-[10px]">
                          [{src.id}]
                        </span>
                        <span className="font-bold text-stone-900">{src.title_ar || src.title_en}</span>
                      </div>
                      <p className="text-stone-600 text-[11px] leading-relaxed">{src.citation}</p>
                    </div>

                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-nafas-blue font-bold text-xs flex items-center gap-1.5 shrink-0"
                      >
                        <span>الرابط</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* PLANT DETAIL MODAL */}
      <PlantDetailModal
        plant={selectedPlantForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPlantForDetail(null);
        }}
        onOpenTriageWithPlant={(plantId) => {
          setIsDetailModalOpen(false);
          launchTriageForPlant(plantId);
        }}
      />

      {/* STEPPED TRIAGE & EMERGENCY MODAL */}
      <PlantTriageModal
        isOpen={isTriageModalOpen}
        onClose={() => {
          setIsTriageModalOpen(false);
          setTriageInitialPlantId(undefined);
        }}
        initialPlantId={triageInitialPlantId}
      />

    </section>
  );
};
