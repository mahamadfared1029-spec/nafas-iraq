'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNafas } from '@/lib/store';
import { IRAQ_GOVERNORATES } from '@/lib/constants';
import { 
  IRAQ_BORDER_COORDINATES, 
  TIGRIS_RIVER_PATH, 
  EUPHRATES_RIVER_PATH, 
  SHATT_AL_ARAB_PATH,
  GOVERNORATES_GIS_DATA,
  MASTER_MAP_PINS,
  MapPinItem
} from '@/lib/iraqGeoData';
import { EnvironmentalReport } from '@/types';
import { OrchidMotif } from '@/components/brand/OrchidMotif';
import { 
  MapPin, 
  Filter, 
  Layers, 
  Sprout, 
  Sparkles, 
  AlertTriangle, 
  Heart, 
  X, 
  CheckCircle2, 
  Compass, 
  ChevronLeft,
  Calendar,
  Users,
  Eye,
  PlusCircle
} from 'lucide-react';

interface MapProps {
  onSelectReport?: (report: EnvironmentalReport) => void;
  onOpenReportModalWithCoords?: (lat: number, lng: number, governorateId: string) => void;
  onSelectPinItem?: (item: MapPinItem) => void;
}

export const IraqEnvironmentalMap: React.FC<MapProps> = ({
  onSelectReport,
  onOpenReportModalWithCoords,
  onSelectPinItem
}) => {
  const { 
    reports, 
    selectedGovernorateId, 
    setSelectedGovernorateId, 
    t, 
    language 
  } = useNafas();

  // Pin category filtering: 'all' | 'planting' | 'cleanup' | 'pollution' | 'activity'
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPin, setSelectedPin] = useState<MapPinItem | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [showGISLayers, setShowGISLayers] = useState({ rivers: true, boundaries: true });
  const [pinModeActive, setPinModeActive] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const riversLayerRef = useRef<any>(null);
  const boundariesLayerRef = useRef<any>(null);

  // Combine static GIS pins with live reports from store
  const allMapPins = React.useMemo(() => {
    // Convert store reports into pin items
    const storeReportPins: MapPinItem[] = reports.map(r => ({
      id: `report-${r.id}`,
      type: 'pollution',
      title: r.title,
      categoryLabelAr: 'بلاغ تلوث بيئي',
      governorateId: r.governorateId,
      neighborhood: r.neighborhood,
      lat: r.lat,
      lng: r.lng,
      status: r.status === 'resolved' ? 'resolved' : 'in_progress',
      statusLabelAr: r.status === 'resolved' ? 'تمت المعالجة' : 'قيد المتابعة الميدانية',
      organizerOrReporter: r.reportedBy,
      summary: r.description,
      evidenceUrl: r.imageBeforeUrl,
      color: '#C66F50',
      refId: r.id
    }));

    // Merge without duplicating IDs
    const merged = [...MASTER_MAP_PINS];
    storeReportPins.forEach(sp => {
      if (!merged.some(m => m.refId === sp.refId)) {
        merged.push(sp);
      }
    });

    return merged;
  }, [reports]);

  // Filtered pins
  const filteredPins = React.useMemo(() => {
    return allMapPins.filter(pin => {
      const matchType = selectedType === 'all' || pin.type === selectedType;
      const matchGov = selectedGovernorateId === 'all' || pin.governorateId === selectedGovernorateId;
      return matchType && matchGov;
    });
  }, [allMapPins, selectedType, selectedGovernorateId]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      const L = await import('leaflet');

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      if (!mapContainerRef.current || !isMounted) return;

      // Centered on Iraq: 33.2232, 43.6793, zoom: 6.5
      const map = L.map(mapContainerRef.current, {
        center: [33.22, 44.0],
        zoom: 6.5,
        minZoom: 5.5,
        maxZoom: 18,
        zoomControl: false, // Custom position
      });

      leafletMapRef.current = map;

      // Add zoom control to top-left (or top-right for RTL)
      L.control.zoom({ position: 'topright' }).addTo(map);

      // CartoDB Voyager tiles (warm limestone tones matching Mesopotamian palette)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // 1. National Border Polyline / Polygon
      const borderPolygon = L.polygon(IRAQ_BORDER_COORDINATES, {
        color: '#6B463B',
        weight: 2.5,
        opacity: 0.85,
        fillColor: '#62467D',
        fillOpacity: 0.02,
        dashArray: '4, 4'
      }).addTo(map);

      // 2. Governorate Boundaries Layer Group
      const boundariesLayer = L.layerGroup().addTo(map);
      boundariesLayerRef.current = boundariesLayer;

      GOVERNORATES_GIS_DATA.forEach(gov => {
        const poly = L.polygon(gov.polygon, {
          color: '#6B463B',
          weight: 1.2,
          opacity: 0.35,
          fillColor: '#F7F1E7',
          fillOpacity: 0.05
        });

        poly.bindTooltip(
          `<div style="font-family: inherit; font-size: 11px; font-weight: bold; color: #222238;">${gov.nameAr}</div>`,
          { permanent: false, direction: 'center', className: 'nafas-gov-tooltip' }
        );

        poly.on('mouseover', () => {
          poly.setStyle({ opacity: 0.9, weight: 2, fillColor: '#B797D0', fillOpacity: 0.15 });
        });

        poly.on('mouseout', () => {
          poly.setStyle({ opacity: 0.35, weight: 1.2, fillColor: '#F7F1E7', fillOpacity: 0.05 });
        });

        poly.on('click', () => {
          setSelectedGovernorateId(gov.id);
        });

        poly.addTo(boundariesLayer);
      });

      // 3. Mesopotamian Rivers Layer Group (Tigris, Euphrates, Shatt al-Arab)
      const riversLayer = L.layerGroup().addTo(map);
      riversLayerRef.current = riversLayer;

      // Tigris (دجلة الخير)
      const tigrisPolyline = L.polyline(TIGRIS_RIVER_PATH, {
        color: '#28566E',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(riversLayer);
      tigrisPolyline.bindTooltip(
        '<div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #28566E;">نهر دجلة الخالد</div>',
        { sticky: true }
      );

      // Euphrates (الفرات العظيم)
      const euphratesPolyline = L.polyline(EUPHRATES_RIVER_PATH, {
        color: '#2563EB',
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(riversLayer);
      euphratesPolyline.bindTooltip(
        '<div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #2563EB;">نهر الفرات العظيم</div>',
        { sticky: true }
      );

      // Shatt al-Arab (ملتقى النهرين)
      const shattPolyline = L.polyline(SHATT_AL_ARAB_PATH, {
        color: '#1D4ED8',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(riversLayer);
      shattPolyline.bindTooltip(
        '<div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #1D4ED8;">شط العرب</div>',
        { sticky: true }
      );

      // 4. Markers Layer Group
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Click on Map to Drop a Pin
      map.on('click', (e: any) => {
        if (!pinModeActive) return;
        const { lat, lng } = e.latlng;
        // Closest governorate
        let closestGov = 'baghdad';
        let minDist = 999;
        IRAQ_GOVERNORATES.forEach(g => {
          const d = Math.hypot(g.lat - lat, g.lng - lng);
          if (d < minDist) {
            minDist = d;
            closestGov = g.id;
          }
        });

        if (onOpenReportModalWithCoords) {
          onOpenReportModalWithCoords(lat, lng, closestGov);
          setPinModeActive(false);
        }
      });

      renderPins(L, map, markersLayer, filteredPins);
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

  // Update pins when filter or data changes
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;
    import('leaflet').then(L => {
      renderPins(L, leafletMapRef.current, markersLayerRef.current, filteredPins);
    });
  }, [filteredPins]);

  // Smooth fly-to on governorate change
  useEffect(() => {
    if (!leafletMapRef.current) return;
    if (selectedGovernorateId === 'all') {
      leafletMapRef.current.flyTo([33.22, 44.0], 6.5, { duration: 1.0 });
    } else {
      const gov = IRAQ_GOVERNORATES.find(g => g.id === selectedGovernorateId);
      if (gov) {
        leafletMapRef.current.flyTo([gov.lat, gov.lng], gov.zoom || 11, { duration: 1.2 });
      }
    }
  }, [selectedGovernorateId]);

  // Render Category Pins with SVG glyphs
  const renderPins = (L: any, map: any, layer: any, pins: MapPinItem[]) => {
    layer.clearLayers();

    pins.forEach(pin => {
      // Icon SVG depending on pin type
      let glyphSvg = '';
      if (pin.type === 'planting') {
        // Green Tree/Sprout
        glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`;
      } else if (pin.type === 'cleanup') {
        // Blue Sparkles/Droplets
        glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;
      } else if (pin.type === 'pollution') {
        // Copper Alert
        glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      } else {
        // Purple Eco Activity (Orchid / Heart)
        glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
      }

      const isResolved = pin.status === 'resolved';

      const customIcon = L.divIcon({
        className: 'custom-nafas-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: ${pin.color};
            border: 2.5px solid #FFFCF5;
            box-shadow: 0 4px 12px rgba(34, 34, 56, 0.4);
            cursor: pointer;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          ">
            ${glyphSvg}
            <div style="
              position: absolute;
              bottom: -4px;
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background-color: #222238;
              box-shadow: 0 2px 4px rgba(0,0,0,0.4);
            "></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 20]
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedPin(pin);
        setBottomSheetOpen(true);
        if (onSelectPinItem) onSelectPinItem(pin);
      });

      marker.addTo(layer);
    });
  };

  return (
    <div className="relative w-full h-[650px] sm:h-[720px] bg-nafas-sand/40 rounded-3xl overflow-hidden border border-nafas-reed/40 shadow-inner flex flex-col">
      
      {/* 1. Header Control Bar (Filters & Quick Actions) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Category Filter Pills (Clickable) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-nafas-ivory/95 backdrop-blur-md rounded-2xl shadow-lg border border-nafas-reed/30 pointer-events-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'all'
                ? 'bg-nafas-silt text-nafas-ivory shadow-sm'
                : 'text-nafas-silt/70 hover:text-nafas-silt hover:bg-nafas-sand/50'
            }`}
          >
            الكل ({allMapPins.length})
          </button>

          {/* Green: Planting */}
          <button
            onClick={() => setSelectedType('planting')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'planting'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>تشجير</span>
          </button>

          {/* Blue: Cleanup */}
          <button
            onClick={() => setSelectedType('cleanup')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'cleanup'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                : 'text-blue-800 hover:bg-blue-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>تنظيف</span>
          </button>

          {/* Copper: Pollution Reports */}
          <button
            onClick={() => setSelectedType('pollution')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'pollution'
                ? 'bg-nafas-clay text-white shadow-sm ring-2 ring-nafas-clay/30'
                : 'text-stone-800 hover:bg-orange-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-nafas-clay"></span>
            <span>بلاغ تلوث</span>
          </button>

          {/* Purple: Community Activity */}
          <button
            onClick={() => setSelectedType('activity')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedType === 'activity'
                ? 'bg-nafas-orchid text-white shadow-sm ring-2 ring-nafas-orchid/30'
                : 'text-purple-900 hover:bg-purple-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-nafas-orchid"></span>
            <span>نشاط بيئي</span>
          </button>
        </div>

        {/* Pin on map button / Reset camera */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              setSelectedGovernorateId('all');
              setSelectedType('all');
            }}
            className="px-3 py-2 bg-nafas-ivory/95 backdrop-blur-md rounded-xl text-xs font-bold text-nafas-silt shadow-md border border-nafas-reed/30 hover:bg-nafas-sand/50 transition-all flex items-center gap-1.5"
            title="إعادة ضبط عرض العراق الشامل"
          >
            <Compass className="w-3.5 h-3.5 text-nafas-blue" />
            <span className="hidden sm:inline">عموم العراق</span>
          </button>

          <button
            onClick={() => setPinModeActive(!pinModeActive)}
            className={`px-3 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 border ${
              pinModeActive
                ? 'bg-nafas-clay text-white border-nafas-clay animate-pulse'
                : 'bg-nafas-ivory/95 backdrop-blur-md text-nafas-silt border-nafas-reed/30 hover:bg-nafas-sand/50'
            }`}
            title="انقر على الخريطة لتحديد موقع بلاغ بيئي"
          >
            <PlusCircle className="w-3.5 h-3.5 text-nafas-clay" />
            <span>{pinModeActive ? 'انقر على موقع المشكلة...' : 'أشّر على الخريطة'}</span>
          </button>
        </div>
      </div>

      {/* 2. Map Container */}
      <div 
        ref={mapContainerRef} 
        className="w-full flex-1 z-0 relative cursor-grab active:cursor-grabbing"
      />

      {/* 3. Map Legend (Bottom Right / Left in RTL) */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex flex-col gap-1.5 p-3 bg-nafas-ivory/95 backdrop-blur-md rounded-2xl border border-nafas-reed/30 shadow-lg text-[11px] text-nafas-silt max-w-xs">
        <div className="flex items-center justify-between pb-1 border-b border-nafas-reed/20 font-bold">
          <div className="flex items-center gap-1">
            <OrchidMotif variant="icon" size="sm" />
            <span>دليل الخريطة البيئية للعراق</span>
          </div>
          <span className="text-[10px] text-nafas-silt/60 font-mono">GIS Live</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>حملات تشجير وتخضير (أخضر)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>حملات تنظيف المياه والأنهار (أزرق)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-nafas-clay"></span>
          <span>بلاغات تلوث موثقة (نحاسي)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-nafas-orchid"></span>
          <span>أنشطة بيئية وتوعية مجتمعية (أرجواني)</span>
        </div>
        <div className="pt-1 mt-1 border-t border-nafas-reed/20 text-[10px] text-nafas-silt/70 flex items-center gap-1.5">
          <span className="w-4 h-1 bg-nafas-blue rounded"></span>
          <span>نهرا دجلة والفرات وشط العرب</span>
        </div>
      </div>

      {/* 4. Interactive Bottom Sheet (Mobile) & Floating Detail Card (Desktop) */}
      {bottomSheetOpen && selectedPin && (
        <div className="absolute inset-x-0 bottom-0 sm:bottom-6 sm:inset-x-auto sm:left-6 z-30 max-w-md w-full animate-in slide-in-from-bottom duration-300">
          <div className="bg-nafas-ivory border-t sm:border border-nafas-reed/40 sm:rounded-3xl shadow-2xl p-5 relative text-right">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setBottomSheetOpen(false);
                setSelectedPin(null);
              }}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-nafas-sand/50 hover:bg-nafas-sand text-nafas-silt/70 hover:text-nafas-silt transition-colors"
              aria-label="إغلاق التفاصيل"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Category Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span 
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1"
                style={{ backgroundColor: selectedPin.color }}
              >
                {selectedPin.type === 'planting' && <Sprout className="w-3.5 h-3.5" />}
                {selectedPin.type === 'cleanup' && <Sparkles className="w-3.5 h-3.5" />}
                {selectedPin.type === 'pollution' && <AlertTriangle className="w-3.5 h-3.5" />}
                {selectedPin.type === 'activity' && <Heart className="w-3.5 h-3.5" />}
                <span>{selectedPin.categoryLabelAr}</span>
              </span>

              <span className="text-[11px] font-semibold text-nafas-silt/70 bg-nafas-sand/40 px-2 py-0.5 rounded-md">
                {selectedPin.statusLabelAr}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base sm:text-lg font-bold text-nafas-silt mb-1 leading-snug">
              {selectedPin.title}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1 text-xs text-nafas-silt/80 mb-3">
              <MapPin className="w-3.5 h-3.5 text-nafas-clay shrink-0" />
              <span>{selectedPin.neighborhood}</span>
            </div>

            {/* Evidence Image if available */}
            {selectedPin.evidenceUrl && (
              <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-nafas-reed/20 shadow-sm relative">
                <img 
                  src={selectedPin.evidenceUrl} 
                  alt={selectedPin.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                  توثيق ميداني معتمد
                </div>
              </div>
            )}

            {/* Summary */}
            <p className="text-xs text-nafas-silt/90 leading-relaxed mb-4">
              {selectedPin.summary}
            </p>

            {/* Metadata (Date, Organizer, Volunteers) */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-nafas-sand/30 p-2.5 rounded-xl border border-nafas-reed/20 mb-4">
              {selectedPin.dateOrTime && (
                <div className="flex items-center gap-1.5 text-nafas-silt/80">
                  <Calendar className="w-3.5 h-3.5 text-nafas-blue shrink-0" />
                  <span className="font-semibold">{selectedPin.dateOrTime}</span>
                </div>
              )}
              {selectedPin.volunteerCount && (
                <div className="flex items-center gap-1.5 text-nafas-silt/80">
                  <Users className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{selectedPin.volunteerCount} متطوع مسجل</span>
                </div>
              )}
              <div className="col-span-2 text-[11px] text-nafas-silt/70">
                المبادر / الجهة: <strong className="text-nafas-silt">{selectedPin.organizerOrReporter}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedPin.type === 'pollution' ? (
                <button
                  onClick={() => {
                    const found = reports.find(r => r.id === selectedPin.refId);
                    if (found && onSelectReport) {
                      onSelectReport(found);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-nafas-clay text-white text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  <span>عرض البلاغ وسجل التحقق</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    alert(`شكراً لاهتمامك بالمشاركة في: ${selectedPin.title}! تم تسجيلك كمتطوع أولي.`);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-nafas-blue text-nafas-ivory text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>انضم إلى هذه المبادرة</span>
                </button>
              )}

              <button
                onClick={() => setBottomSheetOpen(false)}
                className="py-2.5 px-3 rounded-xl bg-nafas-sand/50 text-nafas-silt text-xs font-bold hover:bg-nafas-sand transition-all"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
