'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNafas } from '@/lib/store';
import { IRAQ_GOVERNORATES, CATEGORY_INFO } from '@/lib/constants';
import { EnvironmentalReport, PollutionCategory, ReportStatus } from '@/types';
import { 
  MapPin, 
  Filter, 
  List, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  PlusCircle,
  Eye
} from 'lucide-react';

interface MapProps {
  onSelectReport: (report: EnvironmentalReport) => void;
  onOpenReportModalWithCoords?: (lat: number, lng: number, governorateId: string) => void;
}

export const IraqEnvironmentalMap: React.FC<MapProps> = ({
  onSelectReport,
  onOpenReportModalWithCoords
}) => {
  const { 
    reports, 
    selectedGovernorateId, 
    setSelectedGovernorateId, 
    t, 
    language 
  } = useNafas();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [pinModeActive, setPinModeActive] = useState(false);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  // Filter reports according to user selection
  const filteredReports = reports.filter(r => {
    const matchesGov = selectedGovernorateId === 'all' || r.governorateId === selectedGovernorateId;
    const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
    const matchesSearch = searchQuery === '' || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGov && matchesCat && matchesStatus && matchesSearch;
  });

  // Client-side initialization of Leaflet
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      const L = await import('leaflet');

      // Check if map already initialized
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      if (!mapContainerRef.current || !isMounted) return;

      // Center of Iraq: [33.2232, 43.6793]
      const map = L.map(mapContainerRef.current, {
        center: [33.2232, 44.0],
        zoom: 6.5,
        minZoom: 5.5,
        maxZoom: 18,
        zoomControl: true,
      });

      leafletMapRef.current = map;

      // Elegant, high-clarity CartoDB Positron / OSM tiles that harmonize with Limestone & River Mist
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Markers Layer Group
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Click to Pin Handler
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setPinnedCoords({ lat, lng });

        if (onOpenReportModalWithCoords) {
          // Find closest governorate
          let closestGov = 'baghdad';
          let minDistance = 999;
          IRAQ_GOVERNORATES.forEach(g => {
            const d = Math.hypot(g.lat - lat, g.lng - lng);
            if (d < minDistance) {
              minDistance = d;
              closestGov = g.id;
            }
          });
          onOpenReportModalWithCoords(lat, lng, closestGov);
        }
      });

      renderMarkers(L, map, markersLayer);
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers when filtered reports change
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;

    import('leaflet').then((L) => {
      renderMarkers(L, leafletMapRef.current, markersLayerRef.current);
    });
  }, [filteredReports]);

  // Handle governorate jump
  useEffect(() => {
    if (!leafletMapRef.current) return;
    if (selectedGovernorateId === 'all') {
      leafletMapRef.current.flyTo([33.2232, 44.0], 6.5);
    } else {
      const gov = IRAQ_GOVERNORATES.find(g => g.id === selectedGovernorateId);
      if (gov) {
        leafletMapRef.current.flyTo([gov.lat, gov.lng], gov.zoom || 11, {
          duration: 1.2
        });
      }
    }
  }, [selectedGovernorateId]);

  const renderMarkers = (L: any, map: any, layer: any) => {
    layer.clearLayers();

    filteredReports.forEach(report => {
      const catInfo = CATEGORY_INFO[report.category] || CATEGORY_INFO.garbage;
      const isResolved = report.status === 'resolved';

      // Custom styled HTML marker matching NAFAS brand
      const customIcon = L.divIcon({
        className: 'custom-nafas-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background-color: ${isResolved ? '#28566E' : catInfo.color};
            border: 3px solid #F4EFE5;
            box-shadow: 0 4px 12px rgba(34, 34, 56, 0.35);
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <div style="
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-color: white;
            "></div>
            ${!isResolved ? `
              <div style="
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                border: 2px solid ${catInfo.color};
                animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                opacity: 0.75;
              "></div>
            ` : ''}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([report.lat, report.lng], { icon: customIcon });

      // Popup Content
      const popupHtml = `
        <div style="font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif; text-align: right; direction: rtl; width: 220px; padding: 4px;">
          <div style="font-size: 10px; font-weight: bold; color: #28566E; margin-bottom: 2px;">
            ${report.trackingNumber}
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #302D29; line-height: 1.3; margin-bottom: 6px;">
            ${report.title}
          </div>
          <div style="font-size: 11px; color: #47465F; margin-bottom: 8px;">
            📍 ${report.neighborhood}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="
              font-size: 10px; 
              font-weight: bold; 
              padding: 2px 6px; 
              border-radius: 4px; 
              background-color: ${isResolved ? '#DCFCE7' : '#FEF3C7'}; 
              color: ${isResolved ? '#166534' : '#92400E'};
            ">
              ${isResolved ? 'تمت المعالجة بنجاح' : 'قيد المتابعة الميدانية'}
            </span>
          </div>
          <button id="view-report-${report.id}" style="
            width: 100%; 
            padding: 6px; 
            background-color: #302D29; 
            color: #F4EFE5; 
            font-size: 11px; 
            font-weight: bold; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer;
          ">
            عرض التفاصيل وسجل التدقيق ←
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-report-${report.id}`);
        if (btn) {
          btn.onclick = () => onSelectReport(report);
        }
      });

      marker.addTo(layer);
    });
  };

  return (
    <section className="py-12 bg-nafas-sand border-b border-nafas-reed/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Header & Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-nafas-blue">
              <MapPin className="w-4 h-4" />
              <span>المنظومة الجغرافية البيئية لبلاد الرافدين</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-arabic text-nafas-silt mt-1">
              {t.mapNav}
            </h2>
            <p className="text-xs sm:text-sm text-nafas-neutral-slate font-arabic">
              تصفح البلاغات البيئية الموثقة في كافة محافظات العراق، أو انقر على الخريطة لتسجيل بلاغ مباشر.
            </p>
          </div>

          {/* View Mode Toggle & Add Pin CTA */}
          <div className="flex items-center gap-3">
            <div className="bg-nafas-ivory p-1 rounded-xl border border-nafas-reed/10 flex items-center shadow-sm">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-arabic flex items-center gap-1.5 transition-colors ${
                  viewMode === 'map' ? 'bg-nafas-silt text-nafas-limestone' : 'text-nafas-neutral-slate hover:text-nafas-silt'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>الخريطة</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-arabic flex items-center gap-1.5 transition-colors ${
                  viewMode === 'list' ? 'bg-nafas-silt text-nafas-limestone' : 'text-nafas-neutral-slate hover:text-nafas-silt'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>قائمة البلاغات ({filteredReports.length})</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (onOpenReportModalWithCoords) {
                  onOpenReportModalWithCoords(33.3152, 44.3661, 'baghdad');
                }
              }}
              className="px-4 py-2 rounded-xl bg-nafas-blue hover:bg-nafas-blue text-nafas-ivory text-xs font-bold font-arabic flex items-center gap-1.5 shadow"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إبلاغ من إحداثيات جديدة</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-nafas-ivory p-4 rounded-2xl border border-nafas-reed/10 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Governorate Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-nafas-neutral-slate mb-1 font-arabic">
              {t.filterByGovernorate}
            </label>
            <select
              value={selectedGovernorateId}
              onChange={(e) => setSelectedGovernorateId(e.target.value)}
              className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
            >
              <option value="all">{t.allGovernorates}</option>
              {IRAQ_GOVERNORATES.map(gov => (
                <option key={gov.id} value={gov.id}>
                  {gov.nameAr} ({gov.activeReportsCount} بلاغ نشط)
                </option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-nafas-neutral-slate mb-1 font-arabic">
              {t.filterByCategory}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
            >
              <option value="all">{t.allCategories}</option>
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.labelAr}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-nafas-neutral-slate mb-1 font-arabic">
              {t.filterByStatus}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="submitted">{t.statusSubmitted}</option>
              <option value="under_review">{t.statusUnderReview}</option>
              <option value="verified">{t.statusVerified}</option>
              <option value="in_progress">{t.statusInProgress}</option>
              <option value="resolved">{t.statusResolved}</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-nafas-neutral-slate mb-1 font-arabic">
              بحث في البلاغات
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالحي أو رقم التتبع..."
              className="w-full text-xs font-arabic bg-nafas-sand border border-nafas-reed/15 rounded-xl px-3 py-2 text-nafas-silt focus:outline-none focus:ring-2 focus:ring-nafas-blue"
            />
          </div>

        </div>

        {/* View Content: Map View or List View */}
        {viewMode === 'map' ? (
          <div className="relative rounded-3xl overflow-hidden border-2 border-nafas-reed/15 shadow-xl bg-nafas-sand">
            
            {/* Leaflet Map Canvas */}
            <div
              ref={mapContainerRef}
              className="h-[520px] sm:h-[600px] w-full z-10"
              style={{ background: '#F4EFE5' }}
            />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 right-4 z-20 bg-nafas-ivory/95 backdrop-blur-md p-3 rounded-2xl border border-nafas-reed/10 shadow-lg text-xs font-arabic space-y-1.5 max-w-[200px]">
              <div className="font-bold text-nafas-silt border-b border-nafas-reed/20 pb-1">
                دليل الرموز على الخريطة:
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-3 h-3 rounded-full bg-nafas-blue shrink-0"></span>
                <span>تمت المعالجة بنجاح</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                <span>تراكم نفايات</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
                <span>حرق نفايات مكشوف</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
                <span>تلوث مائي ونهري</span>
              </div>
            </div>

            {/* Hint bar */}
            <div className="absolute top-4 inset-x-0 mx-auto w-max z-20 bg-nafas-silt/80 backdrop-blur-md text-nafas-limestone px-4 py-1.5 rounded-full text-xs font-arabic pointer-events-none shadow">
              💡 انقر على أي نقطة في الخريطة لتسجيل بلاغ بيئي فوري في ذلك الموقع
            </div>

          </div>
        ) : (
          /* Accessible List View Fallback */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map(report => {
              const catInfo = CATEGORY_INFO[report.category] || CATEGORY_INFO.garbage;
              const isResolved = report.status === 'resolved';

              return (
                <div
                  key={report.id}
                  onClick={() => onSelectReport(report)}
                  className="bg-nafas-ivory rounded-2xl p-5 border border-nafas-reed/10 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-right font-arabic group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-nafas-blue bg-nafas-blue/10 px-2 py-0.5 rounded">
                        {report.trackingNumber}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isResolved ? 'bg-nafas-misty text-nafas-blue' : 'bg-amber-100 text-amber-800'}`}>
                        {isResolved ? t.statusResolved : t.statusInProgress}
                      </span>
                    </div>

                    <h3 className="font-bold text-nafas-silt text-sm group-hover:text-nafas-blue transition-colors leading-snug">
                      {report.title}
                    </h3>

                    <p className="text-xs text-nafas-neutral-slate line-clamp-2">
                      {report.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-nafas-reed/20 flex items-center justify-between text-xs text-nafas-neutral-slate">
                    <span>📍 {report.neighborhood}</span>
                    <button className="text-nafas-blue font-bold text-xs flex items-center gap-1 group-hover:underline">
                      <span>التفاصيل</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
