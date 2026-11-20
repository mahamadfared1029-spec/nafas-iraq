'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNafas } from '@/lib/store';
import { 
  IRAQ_VECTOR_PROVINCES, 
  IRAQ_RIVERS, 
  projectLatLngToSvg, 
  findProvinceByLatLng,
  ProvinceVectorItem
} from '@/data/iraqVectorMapData';
import { MASTER_MAP_PINS, MapPinItem } from '@/lib/iraqGeoData';
import { EnvironmentalReport } from '@/types';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  Filter, 
  Sprout, 
  Sparkles, 
  MapPin, 
  Info, 
  CheckCircle2, 
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';

interface VectorReportEntry {
  id: string;
  refId: string;
  kind: 'planting' | 'cleanup';
  title: string;
  provinceId: string;
  provinceNameAr: string;
  neighborhood?: string;
  date?: string;
  statusText?: string;
  statusLabel?: string;
  reportedBy?: string;
  summary?: string;
  evidenceUrl?: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  rawReport?: EnvironmentalReport;
  rawPinItem?: MapPinItem;
}

interface IraqVectorMapProps {
  onSelectReport?: (report: EnvironmentalReport) => void;
  onSelectPinItem?: (item: MapPinItem) => void;
  className?: string;
}

export const IraqVectorMap: React.FC<IraqVectorMapProps> = ({
  onSelectReport,
  onSelectPinItem,
  className = ''
}) => {
  const { reports, campaigns, selectedGovernorateId, setSelectedGovernorateId, language } = useNafas();

  // Selected province filter
  const [selectedProvince, setSelectedProvince] = useState<string>(
    selectedGovernorateId && selectedGovernorateId !== 'all' ? selectedGovernorateId : ''
  );

  // Selected type: 'all' | 'planting' | 'cleanup'
  const [kindFilter, setKindFilter] = useState<'all' | 'planting' | 'cleanup'>('all');

  // Toggle rivers display
  const [showRivers, setShowRivers] = useState<boolean>(true);

  // SVG ViewBox viewport state: { x, y, w, h }
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 720,
    h: 690
  });

  // Selected report / pin for inspection modal/card
  const [activeReport, setActiveReport] = useState<VectorReportEntry | null>(null);

  // Synchronize with external selected governorate
  useEffect(() => {
    if (selectedGovernorateId && selectedGovernorateId !== 'all') {
      const match = IRAQ_VECTOR_PROVINCES.find(p => p.id === selectedGovernorateId);
      if (match) {
        setSelectedProvince(match.id);
        fitProvince(match.id);
      }
    } else if (selectedGovernorateId === 'all') {
      setSelectedProvince('');
      setViewBox({ x: 0, y: 0, w: 720, h: 690 });
    }
  }, [selectedGovernorateId]);

  // Types definitions matching nafas-iraq-map.html
  const typesConfig = {
    planting: { name: 'تشجير', color: '#1B7340', mark: '✦', bg: 'bg-[#1B7340]/15 text-[#1B7340]' },
    cleanup: { name: 'تنظيف', color: '#17527D', mark: '●', bg: 'bg-[#17527D]/15 text-[#17527D]' }
  };

  // Convert permitted reports, campaigns, and master pins into projected vector entries
  const allEntries = useMemo<VectorReportEntry[]>(() => {
    const list: VectorReportEntry[] = [];
    const acceptedIds = new Set<string>();

    // 1. Process public/permitted reports from store
    reports.forEach(r => {
      // Must be permitted for public publication and not rejected
      if (r.status === 'rejected') return;
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return;
      if (r.lat < 28 || r.lat > 39 || r.lng < 38 || r.lng > 50) return;

      const proj = projectLatLngToSvg(r.lat, r.lng);
      const province = findProvinceByLatLng(r.lat, r.lng);
      if (!province) return;

      // Determine kind: flora -> planting; garbage, dumping, water, debris -> cleanup
      const kind: 'planting' | 'cleanup' = 
        r.category === 'flora' || r.title.includes('تشجير') || r.title.includes('غرس') || r.title.includes('شجر')
          ? 'planting'
          : 'cleanup';

      const entryId = `report-${r.id}`;
      acceptedIds.add(entryId);

      list.push({
        id: entryId,
        refId: r.id,
        kind,
        title: r.title,
        provinceId: province.id,
        provinceNameAr: province.nameAr,
        neighborhood: r.neighborhood,
        date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-IQ') : undefined,
        statusText: r.status === 'resolved' ? 'تمت المعالجة' : 'قيد المتابعة الميدانية',
        statusLabel: r.status === 'resolved' ? 'معالج' : 'نشط',
        reportedBy: r.reportedBy,
        summary: r.description,
        evidenceUrl: r.imageBeforeUrl,
        x: proj.x,
        y: proj.y,
        lat: r.lat,
        lng: r.lng,
        rawReport: r
      });
    });

    // 2. Process curated master pins
    MASTER_MAP_PINS.forEach(pin => {
      const pinId = `pin-${pin.id}`;
      if (acceptedIds.has(pinId)) return;
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return;
      if (pin.lat < 28 || pin.lat > 39 || pin.lng < 38 || pin.lng > 50) return;

      const proj = projectLatLngToSvg(pin.lat, pin.lng);
      const province = findProvinceByLatLng(pin.lat, pin.lng);
      const provId = province ? province.id : pin.governorateId;
      const provName = province ? province.nameAr : (IRAQ_VECTOR_PROVINCES.find(p => p.id === pin.governorateId)?.nameAr || 'العراق');

      const kind: 'planting' | 'cleanup' = pin.type === 'planting' ? 'planting' : 'cleanup';

      acceptedIds.add(pinId);
      list.push({
        id: pinId,
        refId: pin.refId || pin.id,
        kind,
        title: pin.title,
        provinceId: provId,
        provinceNameAr: provName,
        neighborhood: pin.neighborhood,
        statusText: pin.statusLabelAr,
        statusLabel: pin.status === 'completed' || pin.status === 'resolved' ? 'مكتمل' : 'ميداني',
        reportedBy: pin.organizerOrReporter,
        summary: pin.summary,
        evidenceUrl: pin.evidenceUrl,
        x: proj.x,
        y: proj.y,
        lat: pin.lat,
        lng: pin.lng,
        rawPinItem: pin
      });
    });

    return list;
  }, [reports]);

  // Filter entries based on selected province and kind filter
  const visibleEntries = useMemo(() => {
    return allEntries.filter(r => {
      const matchProv = !selectedProvince || r.provinceId === selectedProvince;
      const matchKind = kindFilter === 'all' || r.kind === kindFilter;
      return matchProv && matchKind;
    });
  }, [allEntries, selectedProvince, kindFilter]);

  // Zoom functions
  const zoom = (factor: number) => {
    const w = Math.min(720, Math.max(115, viewBox.w * factor));
    const h = (w * 690) / 720;
    const x = Math.min(720 - w, Math.max(0, viewBox.x + (viewBox.w - w) / 2));
    const y = Math.min(690 - h, Math.max(0, viewBox.y + (viewBox.h - h) / 2));
    setViewBox({ x, y, w, h });
  };

  // Fit viewport to a selected province bounding box
  const fitProvince = (provinceId: string) => {
    if (!provinceId) {
      setViewBox({ x: 0, y: 0, w: 720, h: 690 });
      return;
    }
    const prov = IRAQ_VECTOR_PROVINCES.find(p => p.id === provinceId);
    if (!prov) return;

    const box = prov.bbox;
    const w = Math.min(720, Math.max(115, box.width * 1.32, (box.height * 1.32 * 720) / 690));
    const h = (w * 690) / 720;
    const x = Math.min(720 - w, Math.max(0, box.x + (box.width - w) / 2));
    const y = Math.min(690 - h, Math.max(0, box.y + (box.height - h) / 2));
    setViewBox({ x, y, w, h });
  };

  // Province selection handler
  const handleSelectProvince = (id: string, autoFit: boolean = true) => {
    setSelectedProvince(id);
    if (autoFit) {
      fitProvince(id);
    }
    if (id && setSelectedGovernorateId) {
      setSelectedGovernorateId(id);
    } else if (!id && setSelectedGovernorateId) {
      setSelectedGovernorateId('all');
    }
  };

  // Marker inspect click handler
  const handleInspectMarker = (entry: VectorReportEntry) => {
    setActiveReport(entry);
    if (entry.rawReport && onSelectReport) {
      onSelectReport(entry.rawReport);
    } else if (entry.rawPinItem && onSelectPinItem) {
      onSelectPinItem(entry.rawPinItem);
    }
  };

  const selectedProvinceName = useMemo(() => {
    if (!selectedProvince) return null;
    return IRAQ_VECTOR_PROVINCES.find(p => p.id === selectedProvince)?.nameAr || null;
  }, [selectedProvince]);

  return (
    <div className={`space-y-4 font-sans text-nafas-ink ${className}`} dir="rtl">
      
      {/* Top Controls Header Bar */}
      <div className="bg-[#FFFCF5] p-3.5 sm:p-4 rounded-2xl border border-nafas-walnut/15 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nafas-orchid/10 text-nafas-orchid flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-nafas-ink">خريطة العراق التفاعلية</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nafas-orchid/10 text-nafas-orchid">
                19 محافظة + الرافدين
              </span>
            </div>
            <p className="text-xs text-nafas-walnut/70">
              إسقاط جغرافي متّجه فائق الدقة لبلاغات التشجير والتنظيف الميداني المعتمدة
            </p>
          </div>
        </div>

        {/* Quick View Stats */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-nafas-limestone border border-nafas-walnut/15 flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1B7340]"></span>
            <span>تشجير: <strong className="text-[#1B7340]">{allEntries.filter(e => e.kind === 'planting').length}</strong></span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-nafas-limestone border border-nafas-walnut/15 flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#17527D]"></span>
            <span>تنظيف: <strong className="text-[#17527D]">{allEntries.filter(e => e.kind === 'cleanup').length}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Interactive Map + Side Filter Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Map Viewport Area (8 Columns on desktop) */}
        <div className="lg:col-span-8 bg-[#DFD5C0] border-2 border-[#C4B59F] rounded-2xl overflow-hidden relative shadow-md">
          
          {/* Map Floating Toolbar */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 bg-[#FFFCF5]/95 backdrop-blur-sm p-1.5 rounded-xl border border-nafas-walnut/25 shadow-md">
            <button
              type="button"
              onClick={() => zoom(0.75)}
              disabled={viewBox.w <= 120}
              className="p-2 rounded-lg hover:bg-nafas-limestone active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition text-nafas-ink"
              title="تكبير"
              aria-label="تكبير الخريطة"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => zoom(1 / 0.75)}
              disabled={viewBox.w >= 720}
              className="p-2 rounded-lg hover:bg-nafas-limestone active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition text-nafas-ink"
              title="تصغير"
              aria-label="تصغير الخريطة"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-px bg-nafas-walnut/20 my-0.5"></div>
            <button
              type="button"
              onClick={() => handleSelectProvince('', true)}
              className="p-2 rounded-lg hover:bg-nafas-limestone active:scale-95 transition text-nafas-orchid font-bold"
              title="إعادة ضبط الرؤية لكل العراق"
              aria-label="إعادة ضبط الرؤية لكل العراق"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Active Hover / Province Name Indicator */}
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <span className="px-3 py-1.5 rounded-xl bg-[#FFFCF5]/95 backdrop-blur-sm border border-nafas-walnut/25 text-xs font-bold text-nafas-ink shadow-sm">
              {selectedProvinceName ? `المحافظة المحددة: ${selectedProvinceName}` : 'جمهورية العراق (19 محافظة)'}
            </span>
          </div>

          {/* Interactive Vector SVG Canvas */}
          <div className="w-full flex items-center justify-center p-1 sm:p-2 bg-[#E5DCB8]/40">
            <svg
              id="nafas-iraq-vector-canvas"
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              className="w-full h-[52vh] sm:h-[62vh] max-h-[690px] min-h-[360px] select-none transition-all duration-300 ease-out"
              aria-label="خريطة حدود محافظات العراق ونهري دجلة والفرات"
              role="region"
            >
              {/* Definitions and Clipping Mask */}
              <defs>
                {/* Background topographic gradient */}
                <radialGradient id="iraq-canvas-grad" cx="50%" cy="45%" r="65%">
                  <stop offset="0%" stopColor="#EAE2D2" />
                  <stop offset="100%" stopColor="#DCD2BD" />
                </radialGradient>
                <clipPath id="iraq-mask">
                  {IRAQ_VECTOR_PROVINCES.map(prov => (
                    <use key={`mask-${prov.id}`} href={`#g-${prov.id}`} />
                  ))}
                </clipPath>
              </defs>

              {/* Background Canvas Rect */}
              <rect x="0" y="0" width="720" height="690" fill="url(#iraq-canvas-grad)" />

              {/* Provinces Paths Group */}
              <g id="map-regions">
                {IRAQ_VECTOR_PROVINCES.map((prov, index) => {
                  const isSelected = selectedProvince === prov.id;
                  
                  // Rich authentic Mesopotamian topography color mapping:
                  // Non-white, highly pigmented clay, silt, sand, and terracotta earth
                  const PROVINCE_PALETTE: Record<string, string> = {
                    anbar: '#CEB896',        // Desert Sand & Loam
                    karbala: '#C8A882',      // River Silt
                    najaf: '#D4BEA2',        // Fired Clay
                    babil: '#C49A76',        // Babylonian Terracotta Brick
                    baghdad: '#BFA07A',      // Mesopotamian Heartland Loam
                    qadisiyah: '#D4BEA2',    // Silt Clay
                    muthanna: '#CEB896',     // Southern Steppe Earth
                    'dhi-qar': '#C8A882',    // Marshland Silt
                    basra: '#C49A76',        // Shatt al-Arab Alluvial Loam
                    maysan: '#BFA07A',       // Marsh Silt
                    wasit: '#CEB896',        // Eastern Tigris Plain
                    nineveh: '#C8A882',      // Upper Tigris Loam
                    duhok: '#D4BEA2',        // Northern Foothill Stone
                    'salah-al-din': '#BFA07A',// Middle Tigris Earth
                    diyala: '#C49A76',       // Orchard Loam
                    kirkuk: '#CEB896',       // Foothill Clay
                    erbil: '#C8A882',        // Arbil Plain Loam
                    sulaymaniyah: '#BFA07A', // Mountain Silt
                    halabja: '#D4BEA2'       // Valley Orchard Clay
                  };

                  const fallbackFills = ['#C8A882', '#D4BEA2', '#BFA07A', '#CEB896', '#C49A76'];
                  let fillColor = PROVINCE_PALETTE[prov.id] || fallbackFills[index % fallbackFills.length];
                  if (isSelected) fillColor = '#62467D';

                  return (
                    <path
                      key={prov.id}
                      id={`g-${prov.id}`}
                      d={prov.d}
                      tabIndex={0}
                      role="button"
                      aria-label={prov.nameAr}
                      aria-pressed={isSelected}
                      onClick={() => handleSelectProvince(prov.id, true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectProvince(prov.id, true);
                        }
                      }}
                      className="cursor-pointer transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-nafas-orchid hover:opacity-90"
                      style={{
                        fill: fillColor,
                        stroke: isSelected ? '#181424' : '#3E2C1E',
                        strokeWidth: isSelected ? 2.8 : 1.6,
                        strokeLinejoin: 'round',
                        vectorEffect: 'non-scaling-stroke',
                        fillRule: 'evenodd'
                      }}
                    >
                      <title>{prov.nameAr}</title>
                    </path>
                  );
                })}
              </g>

              {/* Rivers Group: Tigris (دجلة) and Euphrates (الفرات) with casing for high contrast */}
              {showRivers && (
                <g id="map-rivers" clipPath="url(#iraq-mask)" aria-hidden="true">
                  {/* Tigris Casing */}
                  <path
                    className="pointer-events-none"
                    d={IRAQ_RIVERS.tigris}
                    fill="none"
                    stroke="#8FBBD9"
                    strokeWidth={5.5}
                    opacity={0.65}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Tigris River - Solid Vivid Mesopotamian Blue */}
                  <path
                    className="pointer-events-none"
                    d={IRAQ_RIVERS.tigris}
                    fill="none"
                    stroke="#17527D"
                    strokeWidth={3.2}
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>نهر دجلة الخالد</title>
                  </path>

                  {/* Euphrates Casing */}
                  <path
                    className="pointer-events-none"
                    d={IRAQ_RIVERS.euphrates}
                    fill="none"
                    stroke="#8FBBD9"
                    strokeWidth={5.5}
                    opacity={0.65}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Euphrates River - Dashed Vivid Mesopotamian Blue */}
                  <path
                    className="pointer-events-none"
                    d={IRAQ_RIVERS.euphrates}
                    fill="none"
                    stroke="#17527D"
                    strokeWidth={3.2}
                    strokeDasharray="9 4"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>نهر الفرات العظيم</title>
                  </path>
                </g>
              )}

              {/* Reports and Planting/Cleanup Markers Group */}
              <g id="map-reports">
                {visibleEntries.map(entry => {
                  const cfg = typesConfig[entry.kind];
                  const isSelected = activeReport?.id === entry.id;

                  return (
                    <g
                      key={entry.id}
                      className="cursor-pointer transition-transform duration-150 hover:scale-125 focus:scale-125 outline-none"
                      transform={`translate(${entry.x}, ${entry.y})`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${cfg.name}: ${entry.title}`}
                      onClick={() => handleInspectMarker(entry)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleInspectMarker(entry);
                        }
                      }}
                    >
                      {/* Outer pulse/glow on selected */}
                      {isSelected && (
                        <circle
                          r="12"
                          fill={cfg.color}
                          opacity="0.3"
                          className="animate-ping"
                        />
                      )}
                      
                      {/* Marker Base Circle */}
                      <circle
                        r={isSelected ? "9" : "7.5"}
                        fill={cfg.color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? "2.5" : "1.8"}
                        className="shadow-sm"
                      />
                      
                      {/* Inner Emblem Mark (✦ for planting, ● for cleanup) */}
                      <text
                        textAnchor="middle"
                        y="3.5"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        className="pointer-events-none select-none font-sans"
                      >
                        {cfg.mark}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Map Footer Attribution note */}
          <div className="bg-white/80 border-t border-nafas-walnut/10 px-3 py-1.5 flex items-center justify-between text-[11px] text-nafas-walnut/80">
            <span>حدود المحافظات من geoBoundaries CC0 + OSM حلبجة · الأنهار من Natural Earth</span>
            <span className="font-semibold text-nafas-orchid">نَفَس — مسار بلاد الرافدين</span>
          </div>
        </div>

        {/* Side Panel: Filters, Legend, Report Details (4 Columns on desktop) */}
        <div className="lg:col-span-4 space-y-3.5">
          
          {/* Filter Card */}
          <div className="bg-[#FFFCF5] p-4 rounded-2xl border border-nafas-walnut/15 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-nafas-ink flex items-center gap-2">
                <Filter className="w-4 h-4 text-nafas-orchid" />
                تصفية الخريطة والمحافظات
              </h3>
              {(selectedProvince || kindFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectProvince('', true);
                    setKindFilter('all');
                  }}
                  className="text-xs text-nafas-orchid hover:underline"
                >
                  إلغاء التصفية
                </button>
              )}
            </div>

            {/* Province Select Dropdown */}
            <div className="space-y-1">
              <label htmlFor="vector-province-select" className="text-xs font-semibold text-nafas-walnut block">
                اختر المحافظة:
              </label>
              <select
                id="vector-province-select"
                value={selectedProvince}
                onChange={(e) => handleSelectProvince(e.target.value, true)}
                className="w-full bg-white border border-nafas-walnut/25 rounded-xl px-3 py-2 text-sm text-nafas-ink focus:outline-none focus:ring-2 focus:ring-nafas-orchid"
              >
                <option value="">كل العراق (19 محافظة)</option>
                {IRAQ_VECTOR_PROVINCES.map(prov => (
                  <option key={prov.id} value={prov.id}>
                    {prov.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Kind Filter: Planting vs Cleanup */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-nafas-walnut block">نوع النشاط البيئي:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setKindFilter('all')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition ${
                    kindFilter === 'all'
                      ? 'bg-nafas-orchid text-white border-nafas-orchid'
                      : 'bg-white text-nafas-ink border-nafas-walnut/20 hover:bg-nafas-limestone'
                  }`}
                >
                  الكل ({allEntries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setKindFilter('planting')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1 ${
                    kindFilter === 'planting'
                      ? 'bg-[#28654a] text-white border-[#28654a]'
                      : 'bg-white text-nafas-ink border-nafas-walnut/20 hover:bg-nafas-limestone'
                  }`}
                >
                  <span>✦</span>
                  <span>تشجير</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKindFilter('cleanup')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1 ${
                    kindFilter === 'cleanup'
                      ? 'bg-[#235c88] text-white border-[#235c88]'
                      : 'bg-white text-nafas-ink border-nafas-walnut/20 hover:bg-nafas-limestone'
                  }`}
                >
                  <span>●</span>
                  <span>تنظيف</span>
                </button>
              </div>
            </div>

            {/* Rivers Toggle Checkbox */}
            <div className="pt-2 border-t border-nafas-walnut/10 flex items-center justify-between text-xs">
              <label htmlFor="toggle-rivers-check" className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  id="toggle-rivers-check"
                  type="checkbox"
                  checked={showRivers}
                  onChange={(e) => setShowRivers(e.target.checked)}
                  className="rounded text-nafas-orchid focus:ring-nafas-orchid w-4 h-4 cursor-pointer"
                />
                <span>عرض مسار نهري دجلة والفرات</span>
              </label>
            </div>

            {/* Map Legend */}
            <div className="pt-2 border-t border-nafas-walnut/10">
              <div className="flex flex-wrap gap-2.5 text-xs text-nafas-walnut">
                <span className="flex items-center gap-1">
                  <span className="w-4 h-0.5 bg-[#286998] inline-block"></span>
                  <span>دجلة</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-0.5 border-t border-dashed border-[#286998] inline-block"></span>
                  <span>الفرات</span>
                </span>
                <span className="flex items-center gap-1 text-[#28654a] font-semibold">
                  <span>✦</span>
                  <span>تشجير</span>
                </span>
                <span className="flex items-center gap-1 text-[#235c88] font-semibold">
                  <span>●</span>
                  <span>تنظيف</span>
                </span>
              </div>
            </div>
          </div>

          {/* Active Inspection Card (When a marker is clicked) */}
          {activeReport ? (
            <div className="bg-[#FFFCF5] p-4 rounded-2xl border-2 border-nafas-orchid/40 shadow-md space-y-2.5 animate-fadeIn">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${typesConfig[activeReport.kind].bg}`}>
                    {typesConfig[activeReport.kind].name}
                  </span>
                  <span className="text-xs text-nafas-walnut/70">
                    {activeReport.provinceNameAr} {activeReport.neighborhood ? `· ${activeReport.neighborhood}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReport(null)}
                  className="p-1 rounded-lg hover:bg-nafas-walnut/10 text-nafas-walnut"
                  aria-label="إغلاق التفاصيل"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="font-bold text-sm text-nafas-ink leading-snug">
                {activeReport.title}
              </h4>

              {activeReport.summary && (
                <p className="text-xs text-nafas-walnut leading-relaxed line-clamp-3">
                  {activeReport.summary}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-nafas-walnut/10 text-xs">
                <span className="text-nafas-walnut/70">
                  الحالة: <strong>{activeReport.statusText || activeReport.statusLabel}</strong>
                </span>
                {activeReport.rawReport && onSelectReport && (
                  <button
                    type="button"
                    onClick={() => onSelectReport(activeReport.rawReport!)}
                    className="px-3 py-1 bg-nafas-orchid text-white font-bold rounded-lg text-xs hover:bg-nafas-orchid/90 transition"
                  >
                    عرض البلاغ كاملاً
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Summary Status Box */
            <div className="bg-[#FFFCF5] p-4 rounded-2xl border border-nafas-walnut/15 text-xs text-nafas-walnut space-y-2">
              <div className="flex items-center gap-2 font-bold text-nafas-ink">
                <Info className="w-4 h-4 text-nafas-orchid" />
                <span>
                  {selectedProvinceName ? `محافظة ${selectedProvinceName}` : 'عموم العراق'}
                </span>
              </div>
              <p>
                {visibleEntries.length > 0 
                  ? `يوجد حالياً ${visibleEntries.length} بلاغ ونشاط بيئي معتمد في هذا النطاق. اضغط على أي دبوس لمراجعة التفاصيل الميدانية.`
                  : 'لا توجد بلاغات منشورة مطابقة للتصفية الحالية في هذه المحافظة.'}
              </p>
            </div>
          )}

          {/* Quick List of Visible Reports */}
          <div className="bg-[#FFFCF5] p-4 rounded-2xl border border-nafas-walnut/15 shadow-sm space-y-2 max-h-[300px] overflow-y-auto">
            <h4 className="font-bold text-xs text-nafas-ink">
              البلاغات الظاهرة ({visibleEntries.length})
            </h4>
            {visibleEntries.length === 0 ? (
              <p className="text-xs text-nafas-walnut/70 py-2">لا توجد بلاغات تطابق الفلتر الحالي.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {visibleEntries.slice(0, 10).map(entry => (
                  <li key={`list-${entry.id}`}>
                    <button
                      type="button"
                      onClick={() => handleInspectMarker(entry)}
                      className={`w-full text-right p-2 rounded-xl transition flex items-center justify-between border ${
                        activeReport?.id === entry.id
                          ? 'bg-nafas-orchid/10 border-nafas-orchid text-nafas-orchid font-bold'
                          : 'bg-white border-nafas-walnut/10 hover:border-nafas-walnut/30 text-nafas-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full ${entry.kind === 'planting' ? 'bg-[#28654a]' : 'bg-[#235c88]'}`} />
                        <span className="truncate">{entry.title}</span>
                      </div>
                      <span className="text-[10px] text-nafas-walnut/70 shrink-0">
                        {entry.provinceNameAr}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
