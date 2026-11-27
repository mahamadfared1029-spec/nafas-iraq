'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { botanicalData, getDocumentedGovernorateIds } from '@/lib/plantSearch';
import { PlantRecord } from '@/types/plants';
import { communityTreesService, CommunityTree, CommunityTreeType } from '@/lib/communityTreesService';
import { PlantTreeModal } from './PlantTreeModal';
import { nafasAuth } from '@/lib/auth/authService';
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
  PlusCircle,
  ShieldAlert,
  Info,
  BookOpen,
  ExternalLink,
  Box,
  Globe,
  Key,
  Settings,
  Check
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { IraqVectorMap } from './IraqVectorMap';
import { getAssetUrl } from '@/lib/basePath';
import { isPointInPolygon } from '@/lib/gisContainment';

interface MapProps {
  initialLayer?: 'vector' | 'gis' | 'botanical' | '3d';
  onSelectReport?: (report: EnvironmentalReport) => void;
  onOpenReportModalWithCoords?: (lat: number, lng: number, governorateId: string) => void;
  onSelectPinItem?: (item: MapPinItem) => void;
}

export const IraqEnvironmentalMap: React.FC<MapProps> = ({
  initialLayer,
  onSelectReport,
  onOpenReportModalWithCoords,
  onSelectPinItem
}) => {
  const { 
    reports, 
    campaigns,
    selectedGovernorateId, 
    setSelectedGovernorateId, 
    isDemoMode,
    t, 
    language 
  } = useNafas();

  // Layer mode: 'vector' | 'gis' | 'botanical' | '3d'
  // Real Interactive GIS Map is the authoritative default for civic reporting
  const [mapLayerMode, setMapLayerMode] = useState<'vector' | 'gis' | 'botanical' | '3d'>(() => {
    if (initialLayer) return initialLayer;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#map-3d' || hash === '#map3d') {
        return '3d';
      }
    }
    return 'gis';
  });

  // Keep layer mode synced when initialLayer changes
  useEffect(() => {
    if (initialLayer) {
      setMapLayerMode(initialLayer);
    }
  }, [initialLayer]);

  // Listen to hash changes for direct 3d navigation
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#map-3d' || hash === '#map3d') {
        setMapLayerMode('3d');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // 3D WebGL Map iframe & bridge state
  const map3dIframeRef = useRef<HTMLIFrameElement>(null);
  const [map3dLoaded, setMap3dLoaded] = useState(false);
  const [sync3DStatus, setSync3DStatus] = useState<{ status: 'idle' | 'synced' | 'error'; count: number; errorMsg?: string }>({ status: 'idle', count: 0 });

  // NAFAS Forest ("غابة نَفَس") community trees state
  const [communityTrees, setCommunityTrees] = useState<CommunityTree[]>([]);
  const [plantTreeModalOpen, setPlantTreeModalOpen] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authUserName, setAuthUserName] = useState<string>('');
  const [authUserIsAdmin, setAuthUserIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const unsub = nafasAuth.onAuthStateChange((session) => {
      setAuthUserId(session?.user?.id || null);
      setAuthUserName(session?.user?.fullName || '');
      const role = session?.user?.role;
      setAuthUserIsAdmin(role === 'super_admin' || role === 'admin' || role === 'moderator');
    });
    return unsub;
  }, []);

  const currentActorId = useMemo(
    () => communityTreesService.getCurrentActorId(authUserId),
    [authUserId]
  );

  const myCommunityTree = useMemo(
    () => communityTrees.find((t) => t.userId === currentActorId) || null,
    [communityTrees, currentActorId]
  );

  const sendCommunityTreesTo3D = (trees: CommunityTree[], animateTreeId?: string) => {
    try {
      const cw = map3dIframeRef.current?.contentWindow as any;
      if (!cw || typeof window === 'undefined') return;
      const mine = trees.find((t) => t.userId === currentActorId) || null;
      if (typeof cw.NAFAS_MAP?.syncCommunityTrees === 'function') {
        cw.NAFAS_MAP.syncCommunityTrees(trees, mine?.id || null, animateTreeId || null);
      }
      const targetOrigin =
        window.location.origin && window.location.origin !== 'null'
          ? window.location.origin
          : '*';
      cw.postMessage(
        {
          type: 'SYNC_COMMUNITY_TREES',
          trees,
          currentUserTreeId: mine?.id || null,
          animateTreeId: animateTreeId || null,
        },
        targetOrigin
      );
    } catch {
      // ignore cross-frame errors during unload
    }
  };

  const focusTreeOn3D = (treeId: string) => {
    try {
      const cw = map3dIframeRef.current?.contentWindow;
      if (!cw || typeof window === 'undefined') return;
      const targetOrigin =
        window.location.origin && window.location.origin !== 'null'
          ? window.location.origin
          : '*';
      cw.postMessage({ type: 'FOCUS_TREE', treeId }, targetOrigin);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let mounted = true;
    communityTreesService.listTrees().then((list) => {
      if (mounted) setCommunityTrees(list);
    });
    return () => {
      mounted = false;
    };
  }, [authUserId]);

  useEffect(() => {
    if (map3dLoaded) {
      sendCommunityTreesTo3D(communityTrees);
    }
  }, [communityTrees, map3dLoaded, currentActorId]);

  useEffect(() => {
    if (map3dLoaded) {
      sync3dMapRecords();
    }
  }, [reports, map3dLoaded]);

  const handlePlantOrUpdateTree = async (payload: {
    authorName: string;
    governorateId: string;
    lat?: number | null;
    lng?: number | null;
    treeType: CommunityTreeType;
    message: string;
  }) => {
    const { tree } = await communityTreesService.upsertTree({
      userId: authUserId,
      isAdmin: authUserIsAdmin,
      ...payload,
    });
    const enrichedTree: CommunityTree = { ...tree, isAdmin: Boolean(tree.isAdmin || authUserIsAdmin) };
    const nextList = (() => {
      const idx = communityTrees.findIndex((t) => t.userId === enrichedTree.userId || t.id === enrichedTree.id);
      if (idx >= 0) {
        return communityTrees.map((t, i) => (i === idx ? enrichedTree : t));
      }
      return [...communityTrees, enrichedTree];
    })();
    setCommunityTrees(nextList);
    sendCommunityTreesTo3D(nextList, enrichedTree.id);
    if (map3dIframeRef.current) {
      map3dIframeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Pin category filtering (for field_reports mode): 'all' | 'planting' | 'cleanup' | 'pollution' | 'activity'
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPin, setSelectedPin] = useState<MapPinItem | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [pinModeActive, setPinModeActive] = useState(false);
  const pinModeActiveRef = useRef(pinModeActive);

  // Keep ref synchronized so Leaflet event handler closure is never stale
  useEffect(() => {
    pinModeActiveRef.current = pinModeActive;
    if (mapContainerRef.current) {
      mapContainerRef.current.style.cursor = pinModeActive ? 'crosshair' : '';
    }
  }, [pinModeActive]);

  // Botanical Layer State
  // Exclude any plant on hold from public distribution
  const publicDistributionPlants = useMemo(() => {
    return botanicalData.plants.filter(p => p.review_status !== 'hold_distribution_review');
  }, []);

  const [selectedBotanicalPlantId, setSelectedBotanicalPlantId] = useState<string>(() => {
    // Default to Pontederia crassipes (ورد النيل) if available, or first plant
    const pontederia = botanicalData.plants.find(p => p.taxon?.scientific_name === 'Pontederia crassipes');
    return pontederia ? pontederia.id : (botanicalData.plants[0]?.id || '');
  });

  const selectedBotanicalPlant: PlantRecord | undefined = useMemo(() => {
    return botanicalData.plants.find(p => p.id === selectedBotanicalPlantId);
  }, [selectedBotanicalPlantId]);

  const botanicalDistributionInfo = useMemo(() => {
    if (!selectedBotanicalPlant) {
      return { governorateIds: new Set<string>(), isCountryWideOnly: true, regionsNotes: [] };
    }
    return getDocumentedGovernorateIds(selectedBotanicalPlant);
  }, [selectedBotanicalPlant]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const riversLayerRef = useRef<any>(null);
  const boundariesLayerRef = useRef<any>(null);
  const nationalBorderLayerRef = useRef<any>(null);
  const tigrisRef = useRef<any>(null);
  const euphratesRef = useRef<any>(null);
  const shattRef = useRef<any>(null);
  const govPolygonsMapRef = useRef<Map<string, any>>(new Map());

  // Basemap & Map API Key State — High-Resolution Satellite GIS is the authoritative default
  type BasemapProvider = 'satellite' | 'streets' | 'topo' | 'mapbox';
  const [basemapProvider, setBasemapProvider] = useState<BasemapProvider>('satellite');
  const basemapProviderRef = useRef<BasemapProvider>('satellite');
  useEffect(() => {
    basemapProviderRef.current = basemapProvider;
  }, [basemapProvider]);

  const [mapboxToken, setMapboxToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nafas_mapbox_token') || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    }
    return '';
  });
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [tokenInput, setTokenInput] = useState(mapboxToken);
  const [tokenSavedToast, setTokenSavedToast] = useState(false);

  // Set up or switch basemap tile layers (CartoDB is completely removed to prevent any API Key watermarks)
  const applyBasemapLayer = (L: any, map: any, provider: BasemapProvider, token?: string) => {
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    let layer: any = null;

    if (provider === 'streets') {
      // 1. OpenStreetMap Free Standard Community Tiles
      layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
    } else if (provider === 'topo') {
      // 2. High-Resolution ESRI World Topo Map (Free, Elevation, Contours & Terrain)
      layer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, USGS, Intermap, and the GIS Community',
        maxZoom: 19,
        crossOrigin: true
      });
    } else if (provider === 'mapbox') {
      const activeToken = token || mapboxToken;
      if (activeToken) {
        // High-resolution Mapbox Satellite Streets
        layer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${activeToken}`, {
          attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap',
          maxZoom: 19,
          tileSize: 512,
          zoomOffset: -1
        });
      } else {
        // High-resolution ESRI Satellite fallback
        layer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; World Imagery',
          maxZoom: 19,
          crossOrigin: true
        });
      }
    } else {
      // Default: High-Resolution ESRI World Imagery (Authentic Satellite Imagery from Space)
      layer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
        crossOrigin: true
      });

      // Clear Hybrid Vector Labels Overlay (Governorates, Cities, Places, Borders)
      const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        pane: 'overlayPane',
        opacity: 0.95,
        crossOrigin: true
      });
      labels.addTo(map);
      labelsLayerRef.current = labels;

      layer.on('tileerror', () => {
        console.warn('Satellite tile fetch notice; resilient tile retry');
      });
    }

    if (layer) {
      layer.addTo(map);
      tileLayerRef.current = layer;
    }
  };

  // Combine pins with live reports and campaigns from store
  const allMapPins = useMemo(() => {
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

    // Convert store campaigns into pin items
    const storeCampaignPins: MapPinItem[] = campaigns.map(c => {
      const gov = IRAQ_GOVERNORATES.find(g => g.id === c.governorateId);
      const isPlanting = c.campaignType === 'reforestation' || (c.targetTrees || 0) > 0;
      
      let catLabel = 'حملة بيئية مجتمعية';
      let pinColor = '#2563EB';
      if (c.campaignType === 'reforestation') {
        catLabel = 'حملة تشجير وتخضير';
        pinColor = '#16A34A';
      } else if (c.campaignType === 'river_protection') {
        catLabel = 'حماية وتطهير الأنهر';
        pinColor = '#0284C7';
      } else if (c.campaignType === 'cleanup') {
        catLabel = 'حملة تنظيف ميداني';
        pinColor = '#D97706';
      } else if (c.campaignType === 'recycling') {
        catLabel = 'فرز وإعادة تدوير';
        pinColor = '#059669';
      } else if (c.campaignType === 'education') {
        catLabel = 'توعية بيئية وتدريب';
        pinColor = '#7C3AED';
      } else if (c.campaignType === 'biodiversity') {
        catLabel = 'حماية التنوع الأحيائي';
        pinColor = '#15803D';
      }

      return {
        id: `campaign-${c.id}`,
        type: isPlanting ? 'planting' : 'cleanup',
        title: c.titleAr,
        categoryLabelAr: catLabel,
        governorateId: c.governorateId,
        neighborhood: c.meetingArea,
        lat: c.meetingCoordinates?.lat || (gov ? gov.lat : 33.3152),
        lng: c.meetingCoordinates?.lng || (gov ? gov.lng : 44.3661),
        status: c.status === 'upcoming' ? 'upcoming' : c.status === 'completed' ? 'resolved' : 'in_progress',
        statusLabelAr: c.status === 'upcoming' ? 'حملة قادمة (التسجيل متاح)' : c.status === 'completed' ? 'مكتملة وموثقة' : 'قيد التنفيذ الميداني',
        organizerOrReporter: c.organizer,
        summary: c.descriptionAr,
        color: pinColor,
        targetCount: c.targetTrees || (c.wasteCollectedKg ? Math.round(c.wasteCollectedKg) : undefined),
        volunteerCount: c.registeredCount,
        dateOrTime: `${c.date} • ${c.startTime || '09:00 ص'}`,
        refId: c.id
      };
    });

    // In demo mode only, include demo fixtures from MASTER_MAP_PINS
    const basePins: MapPinItem[] = isDemoMode ? [...MASTER_MAP_PINS] : [];

    const merged = [...basePins];
    [...storeCampaignPins, ...storeReportPins].forEach(sp => {
      if (!merged.some(m => m.refId === sp.refId)) {
        merged.push(sp);
      }
    });

    return merged;
  }, [reports, campaigns, isDemoMode]);

  // Filtered pins
  const filteredPins = useMemo(() => {
    return allMapPins.filter(pin => {
      const matchType = selectedType === 'all' || pin.type === selectedType;
      const matchGov = selectedGovernorateId === 'all' || pin.governorateId === selectedGovernorateId;
      return matchType && matchGov;
    });
  }, [allMapPins, selectedType, selectedGovernorateId]);

  // Sync real records to 3D WebGL Map when loaded (truthful coordinates only, no fabricated centroid marketing)
  const sync3dMapRecords = () => {
    if (!map3dIframeRef.current?.contentWindow) return;
    try {
      const cw = map3dIframeRef.current.contentWindow as any;
      if (cw.NAFAS_MAP && typeof cw.NAFAS_MAP.setRecords === 'function') {
        const records: Array<{ id: string; title: string; lat: number; lon: number; type: 'tree' | 'clean' | 'report' }> = [];
        
        // Push only active, non-archived authentic reports with genuine geographic coordinates within Iraq bounds
        reports.forEach(r => {
          if (r.status === 'archived' || r.status === 'rejected' || r.isArchived) return;
          if (typeof r.lat === 'number' && typeof r.lng === 'number' &&
              r.lat >= 28.5 && r.lat <= 38.5 && r.lng >= 38.0 && r.lng <= 49.5) {
            records.push({
              id: r.id,
              title: r.title,
              lat: r.lat,
              lon: r.lng,
              type: r.category === 'flora' ? 'tree' : (r.status === 'resolved' ? 'clean' : 'report')
            });
          }
        });

        // Do NOT market governorate centers as campaign field locations; only reports with field coords are synchronized

        cw.NAFAS_MAP.setRecords(records, { demo: false });
        setSync3DStatus({ status: 'synced', count: records.length });
      }
    } catch (e: any) {
      console.error('Error synchronizing 3D records:', e);
      setSync3DStatus({
        status: 'error',
        count: 0,
        errorMsg: e?.message || 'فشل مزامنة السجلات مع المجسم ثلاثي الأبعاد'
      });
      // Clear demo records on failure to prevent retaining misleading demo pins
      try {
        const cw = map3dIframeRef.current?.contentWindow as any;
        if (typeof cw?.NAFAS_MAP?.setRecords === 'function') {
          cw.NAFAS_MAP.setRecords([], { demo: false });
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    const handle3DMessage = (e: MessageEvent) => {
      // Validate origin, iframe source and data shape
      const allowedOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      if (e.origin !== allowedOrigin && e.origin !== 'null' && allowedOrigin !== '') return;
      if (map3dIframeRef.current && e.source !== map3dIframeRef.current.contentWindow) return;
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'nafas:3d-ready') {
        setMap3dLoaded(true);
        sendCommunityTreesTo3D(communityTrees);
        sync3dMapRecords();
      } else if (e.data.type === 'nafas:province-select') {
        const { name } = e.data.detail || {};
        if (name && typeof name === 'string') {
          const gov = IRAQ_GOVERNORATES.find(g => g.nameAr === name || name.includes(g.nameAr));
          if (gov) setSelectedGovernorateId(gov.id);
        }
      } else if (e.data.type === 'nafas:record-select') {
        const rec = e.data.detail;
        if (rec?.id && typeof rec.id === 'string') {
          const foundReport = reports.find(r => r.id === rec.id);
          if (foundReport && onSelectReport) {
            onSelectReport(foundReport);
          } else if (onSelectPinItem) {
            onSelectPinItem({
              id: rec.id,
              refId: rec.id,
              type: rec.type === 'tree' ? 'planting' : (rec.type === 'clean' ? 'cleanup' : 'pollution'),
              title: rec.title || 'سجل بيئي',
              categoryLabelAr: rec.type === 'tree' ? 'حملة تشجير' : (rec.type === 'clean' ? 'حملة تنظيف' : 'بلاغ ميداني'),
              governorateId: 'baghdad',
              neighborhood: 'العراق',
              lat: typeof rec.lat === 'number' ? rec.lat : 33.3152,
              lng: typeof rec.lon === 'number' ? rec.lon : 44.3661,
              status: 'in_progress',
              statusLabelAr: 'قيد المتابعة',
              organizerOrReporter: 'نَفَس',
              summary: rec.title || '',
              evidenceUrl: '',
              color: rec.type === 'tree' ? '#16A34A' : (rec.type === 'clean' ? '#2563EB' : '#C66F50')
            });
          }
        }
      }
    };

    window.addEventListener('message', handle3DMessage);
    return () => window.removeEventListener('message', handle3DMessage);
  }, [reports, campaigns, onSelectReport, onSelectPinItem, setSelectedGovernorateId]);

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

      // Centered on Iraq: 33.22, 44.0, zoom: 6.5
      const map = L.map(mapContainerRef.current, {
        center: [33.22, 44.0],
        zoom: 6.5,
        minZoom: 5.5,
        maxZoom: 18,
        zoomControl: false,
      });

      leafletMapRef.current = map;

      // Zoom control: positioned at bottomright to avoid obscuring top controls or markers
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Initialize basemap provider (CartoDB, OpenStreetMap, ESRI Satellite, or Mapbox)
      applyBasemapLayer(L, map, basemapProvider, mapboxToken);

      // 1. National Border Polyline / Polygon
      const isSat = basemapProvider === 'satellite' || basemapProvider === 'mapbox';
      const borderPoly = L.polygon(IRAQ_BORDER_COORDINATES, {
        color: isSat ? '#F59E0B' : '#6B463B',
        weight: 2.5,
        opacity: 0.9,
        fillColor: '#62467D',
        fillOpacity: isSat ? 0.0 : 0.02,
        dashArray: '5, 5'
      }).addTo(map);
      nationalBorderLayerRef.current = borderPoly;

      // 2. Governorate Boundaries Layer Group
      const boundariesLayer = L.layerGroup().addTo(map);
      boundariesLayerRef.current = boundariesLayer;
      govPolygonsMapRef.current.clear();

      GOVERNORATES_GIS_DATA.forEach(gov => {
        const poly = L.polygon(gov.polygon, {
          color: isSat ? 'rgba(255, 255, 255, 0.45)' : '#3E2C1E',
          weight: isSat ? 1.2 : 1.8,
          opacity: isSat ? 0.7 : 0.75,
          fillColor: isSat ? '#FFFFFF' : '#DFD5C0',
          fillOpacity: isSat ? 0.0 : 0.08
        });

        poly.bindTooltip(
          `<div style="font-family: inherit; font-size: 11px; font-weight: bold; color: #222238;">${gov.nameAr}</div>`,
          { permanent: false, direction: 'center', className: 'nafas-gov-tooltip' }
        );

        poly.on('mouseover', () => {
          poly.setStyle({ opacity: 1.0, weight: 2.5, fillColor: '#62467D', fillOpacity: 0.25, color: '#62467D' });
        });

        poly.on('mouseout', () => {
          // Re-apply style depending on mode
          if (mapLayerMode === 'botanical' && botanicalDistributionInfo.governorateIds.has(gov.id)) {
            poly.setStyle({ opacity: 0.95, weight: 2.8, fillColor: '#62467D', fillOpacity: 0.45, color: '#62467D' });
          } else {
            const satNow = basemapProviderRef.current === 'satellite' || basemapProviderRef.current === 'mapbox';
            poly.setStyle({
              opacity: satNow ? 0.7 : 0.75,
              weight: satNow ? 1.2 : 1.8,
              fillColor: satNow ? '#FFFFFF' : '#DFD5C0',
              fillOpacity: satNow ? 0.0 : 0.08,
              color: satNow ? 'rgba(255, 255, 255, 0.45)' : '#3E2C1E'
            });
          }
        });

        poly.on('click', () => {
          setSelectedGovernorateId(gov.id);
        });

        poly.addTo(boundariesLayer);
        govPolygonsMapRef.current.set(gov.id, poly);
      });

      // 3. Mesopotamian Rivers Layer Group (Tigris, Euphrates, Shatt al-Arab)
      const riversLayer = L.layerGroup().addTo(map);
      riversLayerRef.current = riversLayer;

      // Tigris
      const tigrisPolyline = L.polyline(TIGRIS_RIVER_PATH, {
        color: isSat ? '#38BDF8' : '#28566E',
        weight: isSat ? 4.5 : 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(riversLayer);
      tigrisRef.current = tigrisPolyline;
      tigrisPolyline.bindTooltip(
        '<div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #28566E;">نهر دجلة الخالد</div>',
        { sticky: true }
      );

      // Euphrates
      const euphratesPolyline = L.polyline(EUPHRATES_RIVER_PATH, {
        color: isSat ? '#60A5FA' : '#2563EB',
        weight: isSat ? 4.5 : 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(riversLayer);
      euphratesRef.current = euphratesPolyline;
      euphratesPolyline.bindTooltip(
        '<div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #2563EB;">نهر الفرات العظيم</div>',
        { sticky: true }
      );

      // Shatt al-Arab
      const shattPolyline = L.polyline(SHATT_AL_ARAB_PATH, {
        color: isSat ? '#0284C7' : '#1D4ED8',
        weight: isSat ? 5.5 : 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(riversLayer);
      shattRef.current = shattPolyline;
      shattPolyline.bindTooltip(
        '<div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #1D4ED8;">شط العرب</div>',
        { sticky: true }
      );

      // 4. Markers Layer Group
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Click on Map to Drop a Pin (uses live ref to prevent stale closure)
      map.on('click', (e: any) => {
        if (!pinModeActiveRef.current) return;
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));

        // Point-in-polygon verification against official GIS polygon rings (no naive nearest-center guessing)
        let matchedGovId: string | undefined = undefined;
        for (const g of GOVERNORATES_GIS_DATA) {
          if (isPointInPolygon(lat, lng, g.polygon)) {
            matchedGovId = g.id;
            break;
          }
        }

        // If outside recognized ADM1 polygon rings, label as pending review
        const resolvedGovId = matchedGovId || 'pending_review';

        if (onOpenReportModalWithCoords) {
          onOpenReportModalWithCoords(lat, lng, resolvedGovId);
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

  // Update tile layer and vector styling whenever basemap provider or token changes
  useEffect(() => {
    if (!leafletMapRef.current) return;
    import('leaflet').then(L => {
      applyBasemapLayer(L, leafletMapRef.current, basemapProvider, mapboxToken);

      const isSat = basemapProvider === 'satellite' || basemapProvider === 'mapbox';
      if (nationalBorderLayerRef.current) {
        nationalBorderLayerRef.current.setStyle({
          color: isSat ? '#F59E0B' : '#6B463B',
          fillOpacity: isSat ? 0.0 : 0.02
        });
      }
      if (tigrisRef.current) {
        tigrisRef.current.setStyle({ color: isSat ? '#38BDF8' : '#28566E', weight: isSat ? 4.5 : 4 });
      }
      if (euphratesRef.current) {
        euphratesRef.current.setStyle({ color: isSat ? '#60A5FA' : '#2563EB', weight: isSat ? 4.5 : 4 });
      }
      if (shattRef.current) {
        shattRef.current.setStyle({ color: isSat ? '#0284C7' : '#1D4ED8', weight: isSat ? 5.5 : 5 });
      }

      // Update governorate polygons to match basemap
      GOVERNORATES_GIS_DATA.forEach(gov => {
        const poly = govPolygonsMapRef.current.get(gov.id);
        if (poly && mapLayerMode !== 'botanical') {
          poly.setStyle({
            color: isSat ? 'rgba(255, 255, 255, 0.45)' : '#3E2C1E',
            weight: isSat ? 1.2 : 1.8,
            fillColor: isSat ? '#FFFFFF' : '#DFD5C0',
            fillOpacity: isSat ? 0.0 : 0.08,
            opacity: isSat ? 0.7 : 0.75
          });
        }
      });
    });
  }, [basemapProvider, mapboxToken, mapLayerMode]);

  // ResizeObserver guarantees Leaflet recalculates dimensions on any container/window resizing
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      leafletMapRef.current?.invalidateSize();
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Multi-staged invalidateSize when switching into GIS/botanical view to prevent grey/blank map
  useEffect(() => {
    if (mapLayerMode !== 'vector' && leafletMapRef.current) {
      const t1 = setTimeout(() => leafletMapRef.current?.invalidateSize(), 50);
      const t2 = setTimeout(() => leafletMapRef.current?.invalidateSize(), 200);
      const t3 = setTimeout(() => leafletMapRef.current?.invalidateSize(), 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [mapLayerMode]);

  // Update layer styles when mapLayerMode or selectedBotanicalPlant changes
  useEffect(() => {
    if (!leafletMapRef.current || !boundariesLayerRef.current) return;

    const isSat = basemapProvider === 'satellite' || basemapProvider === 'mapbox';

    if (mapLayerMode === 'botanical' && selectedBotanicalPlant) {
      const { governorateIds } = botanicalDistributionInfo;

      GOVERNORATES_GIS_DATA.forEach(gov => {
        const poly = govPolygonsMapRef.current.get(gov.id);
        if (poly) {
          if (governorateIds.has(gov.id)) {
            poly.setStyle({
              color: '#62467D',
              weight: 2.8,
              opacity: 0.95,
              fillColor: '#62467D',
              fillOpacity: 0.45
            });
            poly.setTooltipContent(
              `<div style="font-family: inherit; font-size: 11px; font-weight: bold; color: #222238;">${gov.nameAr}<br/><span style="color: #62467D; font-size: 10px;">موثق تواجد: ${selectedBotanicalPlant.locale?.common_names?.[0]?.name || selectedBotanicalPlant.taxon.scientific_name}</span></div>`
            );
          } else {
            poly.setStyle({
              color: isSat ? '#F7F1E7' : '#3E2C1E',
              weight: isSat ? 1.4 : 1.4,
              opacity: isSat ? 0.6 : 0.55,
              fillColor: isSat ? '#000000' : '#DFD5C0',
              fillOpacity: isSat ? 0.05 : 0.1
            });
            poly.setTooltipContent(
              `<div style="font-family: inherit; font-size: 11px; font-weight: bold; color: #222238;">${gov.nameAr}</div>`
            );
          }
        }
      });

      // Clear report markers in botanical mode
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }
    } else {
      // Restore Field Reports Mode
      GOVERNORATES_GIS_DATA.forEach(gov => {
        const poly = govPolygonsMapRef.current.get(gov.id);
        if (poly) {
          poly.setStyle({
            color: isSat ? '#F7F1E7' : '#3E2C1E',
            weight: isSat ? 1.4 : 1.8,
            opacity: isSat ? 0.8 : 0.75,
            fillColor: isSat ? '#FFFFFF' : '#DFD5C0',
            fillOpacity: isSat ? 0.02 : 0.12
          });
          poly.setTooltipContent(
            `<div style="font-family: inherit; font-size: 11px; font-weight: bold; color: #222238;">${gov.nameAr}</div>`
          );
        }
      });

      if (markersLayerRef.current && leafletMapRef.current) {
        import('leaflet').then(L => {
          const visiblePins = filteredPins.filter(
            (pin) => !reports.some((r) => r.id === pin.refId && (r.status === 'archived' || r.status === 'rejected' || r.isArchived))
          );
          renderPins(L, leafletMapRef.current, markersLayerRef.current, visiblePins);

          // Render NAFAS Forest community trees on the 2D GIS Leaflet map too
          const emojiMap: Record<string, string> = { palm: '🌴', sidr: '🌳', oak: '🌲', orange: '🍊' };
          communityTrees.forEach((tree) => {
            const gov = IRAQ_GOVERNORATES.find((g) => g.id === tree.governorateId);
            const tLat = typeof tree.lat === 'number' && Number.isFinite(tree.lat) ? tree.lat : gov?.lat;
            const tLng = typeof tree.lng === 'number' && Number.isFinite(tree.lng) ? tree.lng : gov?.lng;
            if (typeof tLat !== 'number' || typeof tLng !== 'number') return;

            const iconHtml = `<div style="display:flex;align-items:center;justify-content:center;width:${tree.isAdmin ? 34 : 26}px;height:${tree.isAdmin ? 34 : 26}px;border-radius:9999px;background:${tree.isAdmin ? '#FEF3C7' : '#ECFDF5'};border:2px solid ${tree.isAdmin ? '#D97706' : '#16A34A'};font-size:${tree.isAdmin ? 19 : 15}px;box-shadow:0 3px 10px rgba(0,0,0,0.3);">${emojiMap[tree.treeType] || '🌳'}</div>`;
            const divIcon = L.divIcon({
              html: iconHtml,
              className: 'nafas-tree-marker',
              iconSize: [tree.isAdmin ? 34 : 26, tree.isAdmin ? 34 : 26],
              iconAnchor: [tree.isAdmin ? 17 : 13, tree.isAdmin ? 17 : 13],
            });

            const popupEl = document.createElement('div');
            popupEl.style.direction = 'rtl';
            popupEl.style.textAlign = 'right';
            popupEl.style.fontFamily = 'inherit';
            const titleEl = document.createElement('div');
            titleEl.style.fontWeight = 'bold';
            titleEl.style.fontSize = '13px';
            titleEl.textContent = `${emojiMap[tree.treeType] || '🌳'} ${tree.authorName}${tree.isAdmin ? ' (👑 المشرف)' : ''}`;
            const govEl = document.createElement('div');
            govEl.style.fontSize = '11px';
            govEl.style.color = '#62467D';
            govEl.textContent = gov ? gov.nameAr : tree.governorateId;
            const msgEl = document.createElement('div');
            msgEl.style.fontSize = '12px';
            msgEl.style.marginTop = '4px';
            msgEl.textContent = tree.message;
            popupEl.append(titleEl, govEl, msgEl);

            L.marker([tLat, tLng], { icon: divIcon })
              .bindPopup(popupEl)
              .addTo(markersLayerRef.current);
          });
        });
      }
    }
  }, [mapLayerMode, selectedBotanicalPlantId, botanicalDistributionInfo, filteredPins, basemapProvider, communityTrees, reports]);

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
      let glyphSvg = '';
      if (pin.type === 'planting') {
        glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`;
      } else if (pin.type === 'cleanup') {
        glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;
      } else if (pin.type === 'pollution') {
        glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      } else {
        glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
      }

      const customIcon = L.divIcon({
        className: 'custom-nafas-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: ${pin.color};
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            border: 2px solid #FFFCF5;
            cursor: pointer;
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
    <div className="space-y-4 font-arabic" dir="rtl">
      {/* 0. Top Mode Selector Bar */}
      <div className="bg-[#FFFCF5] p-3 rounded-2xl border border-nafas-walnut/15 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-nafas-limestone rounded-xl border border-nafas-walnut/10">
          <button
            type="button"
            onClick={() => setMapLayerMode('vector')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mapLayerMode === 'vector'
                ? 'bg-nafas-orchid text-white shadow-sm'
                : 'text-nafas-ink hover:bg-white/80'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>خريطة العراق المتجهة (19 محافظة)</span>
          </button>

          <button
            type="button"
            onClick={() => setMapLayerMode('gis')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mapLayerMode === 'gis'
                ? 'bg-nafas-blue text-white shadow-sm'
                : 'text-nafas-ink hover:bg-white/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>خريطة الأقمار الصناعية (GIS)</span>
          </button>

          <button
            type="button"
            onClick={() => setMapLayerMode('botanical')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mapLayerMode === 'botanical'
                ? 'bg-purple-900 text-white shadow-sm'
                : 'text-nafas-ink hover:bg-white/80'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>الصيدلية والتوزع النباتي</span>
          </button>

          <button
            type="button"
            onClick={() => setMapLayerMode('3d')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mapLayerMode === '3d'
                ? 'bg-amber-900 text-white shadow-sm ring-2 ring-amber-500/50'
                : 'text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 border border-amber-300/50'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-amber-500" />
            <span>مجسم التضاريس (3D WebGL)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-amber-500 text-white shadow-sm">
              3D
            </span>
          </button>
        </div>

        {/* Standalone HTML Map page link */}
        <a
          href={getAssetUrl('/nafas-iraq-map.html')}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-nafas-orchid bg-nafas-orchid/10 hover:bg-nafas-orchid/20 transition flex items-center gap-1.5 border border-nafas-orchid/20"
          title="فتح ملف الخريطة المستقلة nafas-iraq-map.html في نافذة جديدة"
        >
          <span>الخريطة المستقلة (HTML)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 1. Vector Map Viewport */}
      <div className={mapLayerMode === 'vector' ? 'block' : 'hidden'}>
        <IraqVectorMap
          onSelectReport={onSelectReport}
          onSelectPinItem={onSelectPinItem}
        />
      </div>

      {/* 2. 3D WebGL Terrain Model Viewport */}
      {mapLayerMode === '3d' && (
        <div className="relative w-full rounded-3xl overflow-hidden border border-nafas-reed/40 shadow-xl bg-[#1a1926] flex flex-col font-arabic">
          {/* Historical Boundary Notice & GIS Metadata */}
          <div className="bg-nafas-sand border-b border-nafas-reed/30 p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-nafas-silt">
              <Info className="w-4 h-4 text-nafas-orchid shrink-0" />
              <span>
                <strong>بيان جغرافيا الرافدين:</strong> يعتمد هذا المجسم على تضاريس Mapzen/AWS وتغطية حدود geoBoundaries 2022 (18 وحدة). اعتُمدت حلبجة المحافظة الـ 19 رسمياً سنة 2025؛ لا يُعتمد هذا العرض التاريخي للتحقق الإداري الرسمي من البلاغات.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
                🌳 {communityTrees.length} شجرة مغروسة في العراق
              </span>

              {!myCommunityTree ? (
                <button
                  type="button"
                  onClick={() => setPlantTreeModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black transition-colors shadow-sm"
                >
                  🌱 ازرع شجرتك في محافظتك
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      focusTreeOn3D(myCommunityTree.id);
                      if (map3dIframeRef.current) {
                        map3dIframeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    شاهد شجرتي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlantTreeModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-nafas-ivory hover:bg-nafas-misty text-nafas-silt border border-nafas-reed/40 text-xs font-bold transition-colors"
                  >
                    تعديل رسالتي
                  </button>
                </>
              )}

              <span className="px-2.5 py-1 rounded-md bg-nafas-misty text-nafas-blue text-[11px] font-bold">
                تضخيم رأسي ×14 · أنهار 1:10m
              </span>
              {sync3DStatus.status === 'synced' && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  تمت مزامنة {sync3DStatus.count} سجل موثق
                </span>
              )}
              {sync3DStatus.status === 'error' && (
                <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 text-[11px] font-bold border border-rose-200" title={sync3DStatus.errorMsg}>
                  فشل مزامنة السجلات
                </span>
              )}
              <button
                type="button"
                onClick={sync3dMapRecords}
                className="px-2.5 py-1 rounded-md bg-nafas-blue text-white text-[11px] font-bold hover:bg-nafas-blue-dark transition-colors"
                title="مزامنة بيانات البلاغات الموثقة إلى المجسم"
              >
                مزامنة البيانات الحية
              </button>
            </div>
          </div>

          {/* Iframe Viewport */}
          <div className="relative w-full h-[620px] sm:h-[720px] bg-[#1a1926]">
            <iframe
              ref={map3dIframeRef}
              src={`${getAssetUrl('/nafas-iraq-3d.html')}?v=20261127-trees`}
              title="مجسم تضاريس العراق ثلاثي الأبعاد - نَفَس"
              className="w-full h-full border-0 select-none"
              onLoad={() => {
                setMap3dLoaded(true);
                sync3dMapRecords();
                sendCommunityTreesTo3D(communityTrees);
              }}
            />
          </div>
        </div>
      )}

      <PlantTreeModal
        isOpen={plantTreeModalOpen}
        onClose={() => setPlantTreeModalOpen(false)}
        existingTree={myCommunityTree}
        defaultAuthorName={authUserName}
        defaultGovernorateId={selectedGovernorateId !== 'all' ? selectedGovernorateId : 'baghdad'}
        onSubmit={handlePlantOrUpdateTree}
      />

      {/* 3. GIS / Botanical Leaflet Viewport */}
      <div className={`relative w-full h-[650px] sm:h-[720px] ${basemapProvider === 'satellite' ? 'bg-[#0F172A]' : 'bg-[#DFD5C0]'} rounded-3xl overflow-hidden border border-nafas-reed/40 shadow-inner flex flex-col font-arabic ${mapLayerMode === 'gis' || mapLayerMode === 'botanical' ? 'block' : 'hidden'}`}>
          
          {/* 1. Master Header Control Bar */}
          <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-col gap-2 sm:gap-2.5 pointer-events-none">
            
            {/* Row 1: Quick Camera */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 p-1 bg-nafas-ivory/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-md border border-nafas-reed/30 pointer-events-auto">
                <span className="px-2 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold text-nafas-ink flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-nafas-orchid shrink-0" />
                  <span className="hidden xs:inline">{mapLayerMode === 'gis' ? (basemapProvider === 'satellite' ? 'أقمار صناعية (GIS)' : 'بلاغات ميدانية') : 'توزع نباتي'}</span>
                  <span className="xs:hidden">{mapLayerMode === 'gis' ? 'GIS' : 'نباتي'}</span>
                </span>
              </div>

              {/* Reset Camera / Pin Button / Quick Basemap Switcher */}
              <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto flex-wrap">
                {/* Quick Basemap Switcher: Satellite vs Streets vs Topo */}
                {mapLayerMode === 'gis' && (
                  <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-nafas-ivory/95 backdrop-blur-md rounded-xl shadow-md border border-nafas-reed/30">
                    <button
                      type="button"
                      onClick={() => setBasemapProvider('satellite')}
                      className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center gap-1 ${
                        basemapProvider === 'satellite'
                          ? 'bg-nafas-blue text-white shadow-sm'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                      title="صور فضائية حقيقية من الأقمار الصناعية (ESRI World Imagery)"
                    >
                      <span>🛰️ فضائي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBasemapProvider('streets')}
                      className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center gap-1 ${
                        basemapProvider === 'streets'
                          ? 'bg-nafas-blue text-white shadow-sm'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                      title="خريطة الشوارع (OpenStreetMap)"
                    >
                      <span>🗺️ شوارع</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBasemapProvider('topo')}
                      className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center gap-1 ${
                        basemapProvider === 'topo'
                          ? 'bg-nafas-blue text-white shadow-sm'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                      title="تضاريس وارتفاعات الرافدين (ESRI World Topo Map)"
                    >
                      <span>🏔️ تضاريس</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedGovernorateId('all');
                    setSelectedType('all');
                  }}
                  className="px-2 py-1 sm:px-3 sm:py-2 bg-nafas-ivory/95 backdrop-blur-md rounded-xl text-[11px] sm:text-xs font-bold text-nafas-silt shadow-md border border-nafas-reed/30 hover:bg-nafas-sand/50 transition-all flex items-center gap-1"
                  title="إعادة ضبط عرض العراق الشامل"
                >
                  <Compass className="w-3.5 h-3.5 text-nafas-blue shrink-0" />
                  <span className="hidden sm:inline">عموم العراق</span>
                </button>

                {mapLayerMode === 'gis' && (
                  <button
                    onClick={() => setPinModeActive(!pinModeActive)}
                    className={`px-2.5 py-1 sm:px-3 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold shadow-md transition-all flex items-center gap-1 border ${
                      pinModeActive
                        ? 'bg-nafas-clay text-white border-nafas-clay animate-pulse'
                        : 'bg-nafas-ivory/95 backdrop-blur-md text-nafas-silt border-nafas-reed/30 hover:bg-nafas-sand/50'
                    }`}
                    title="انقر على الخريطة لتحديد موقع بلاغ بيئي"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-nafas-clay shrink-0" />
                    <span>{pinModeActive ? 'انقر...' : 'أشّر'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowMapSettings(!showMapSettings)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 border ${
                    showMapSettings || basemapProvider !== 'satellite'
                      ? 'bg-nafas-blue text-white border-nafas-blue ring-2 ring-nafas-blue/30'
                      : 'bg-nafas-ivory/95 backdrop-blur-md text-nafas-silt border-nafas-reed/30 hover:bg-nafas-sand/50'
                  }`}
                  title="إعدادات مزود الخريطة الجغرافية ومفتاح Mapbox API"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  <Key className="w-3 h-3 text-amber-500" />
                  <span className="hidden sm:inline">مزود ومفتاح الخريطة</span>
                </button>
              </div>
            </div>

            {/* Row 2: Mode-Specific Controls */}
            {mapLayerMode === 'gis' ? (
              /* Field Reports Category Pills */
              <div className="flex items-center gap-1.5 p-1.5 bg-nafas-ivory/95 backdrop-blur-md rounded-2xl shadow-lg border border-nafas-reed/30 pointer-events-auto overflow-x-auto max-w-full">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedType === 'all'
                      ? 'bg-nafas-silt text-nafas-ivory shadow-sm'
                      : 'text-nafas-silt/70 hover:text-nafas-silt hover:bg-nafas-sand/50'
                  }`}
                >
                  الكل ({allMapPins.length})
                </button>

            <button
              onClick={() => setSelectedType('planting')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedType === 'planting'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>تشجير</span>
            </button>

            <button
              onClick={() => setSelectedType('cleanup')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedType === 'cleanup'
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                  : 'text-blue-800 hover:bg-blue-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>تنظيف</span>
            </button>

            <button
              onClick={() => setSelectedType('pollution')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedType === 'pollution'
                  ? 'bg-nafas-clay text-white shadow-sm ring-2 ring-nafas-clay/30'
                  : 'text-stone-800 hover:bg-orange-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-nafas-clay"></span>
              <span>بلاغ تلوث</span>
            </button>

            <button
              onClick={() => setSelectedType('activity')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedType === 'activity'
                  ? 'bg-nafas-orchid text-white shadow-sm ring-2 ring-nafas-orchid/30'
                  : 'text-purple-900 hover:bg-purple-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-nafas-orchid"></span>
              <span>نشاط بيئي</span>
            </button>
          </div>
        ) : (
          /* Botanical Distribution Plant Selector */
          <div className="flex flex-wrap items-center gap-2 p-2 bg-nafas-ivory/95 backdrop-blur-md rounded-2xl shadow-lg border border-purple-200 pointer-events-auto max-w-full">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1 mr-1">
              <Sprout className="w-3.5 h-3.5 text-purple-700" />
              <span>اختر النبتة لعرض خريطة توزعها:</span>
            </span>

            <select
              value={selectedBotanicalPlantId}
              onChange={(e) => setSelectedBotanicalPlantId(e.target.value)}
              className="p-1.5 px-3 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-900 focus:ring-2 focus:ring-purple-600 outline-none"
            >
              {publicDistributionPlants.map(p => (
                <option key={p.id} value={p.id}>
                  {p.locale?.common_names?.[0]?.name || p.taxon.scientific_name} ({p.taxon.scientific_name})
                </option>
              ))}
            </select>

            {/* Quick Plant Chips */}
            <div className="hidden lg:flex items-center gap-1.5 pr-2">
              {[
                { name: 'ورد النيل', query: 'Pontederia crassipes' },
                { name: 'الدفلة', query: 'Nerium oleander' },
                { name: 'الحنظل', query: 'Citrullus colocynthis' },
                { name: 'القريص', query: 'Urtica dioica' },
                { name: 'الخروع', query: 'Ricinus communis' }
              ].map(chip => {
                const found = publicDistributionPlants.find(p => p.taxon?.scientific_name === chip.query);
                if (!found) return null;
                const isSelected = selectedBotanicalPlantId === found.id;
                return (
                  <button
                    key={chip.name}
                    onClick={() => setSelectedBotanicalPlantId(found.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-purple-900 text-white shadow-sm'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {chip.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Botanical Country-Wide Banner if applicable */}
        {mapLayerMode === 'botanical' && botanicalDistributionInfo.isCountryWideOnly && selectedBotanicalPlant && (
          <div className="p-2.5 px-4 rounded-xl bg-purple-50/95 border border-purple-300 text-purple-950 text-xs font-bold shadow-md pointer-events-auto flex items-center gap-2 max-w-lg">
            <Info className="w-4 h-4 text-purple-700 shrink-0" />
            <span>
              نطاق التوزع: مثبت على مستوى العراق قطرياً في السجلات، دون حصر علمي بمحافظة معينة.
            </span>
          </div>
        )}

        {/* Map API Key & Provider Settings Dialog */}
        {showMapSettings && (
          <div className="p-4 bg-white/98 backdrop-blur-xl rounded-2xl border border-nafas-reed/40 shadow-2xl space-y-3 font-arabic animate-in fade-in slide-in-from-top-2 pointer-events-auto max-w-md w-full">
            <div className="flex items-center justify-between pb-2 border-b border-nafas-reed/20">
              <div className="flex items-center gap-1.5 font-bold text-xs text-nafas-ink">
                <Globe className="w-4 h-4 text-nafas-blue" />
                <span>مزود الخرائط الجغرافية ومفتاح الربط (API)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMapSettings(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Connection Status Badge */}
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>الخريطة متصلة وتعمل مباشرة (مجاناً 100%)</span>
              </div>
              <span>تعمل الخريطة عبر شبكات الأقمار الصناعية ESRI Satellite و OpenStreetMap و ESRI Topo دون أي حاجة لمفتاح مدفوع أو اشتراك.</span>
            </div>

            {/* Provider Chooser */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-700">اختر نمط الخريطة الميدانية:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'satellite', name: 'الأقمار الصناعية (ESRI)', desc: 'صور فضائية مباشرة عالية الدقة' },
                  { id: 'streets', name: 'الشارع (OpenStreetMap)', desc: 'مفتوحة المصدر ودائمة' },
                  { id: 'topo', name: 'تضاريس الرافدين (ESRI Topo)', desc: 'تضاريس وارتفاعات طبيعية' },
                  { id: 'mapbox', name: 'ماب بوكس (Mapbox)', desc: mapboxToken ? 'المفتاح مفعل' : 'يتطلب مفتاح API اختياري' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setBasemapProvider(p.id as BasemapProvider);
                    }}
                    className={`p-2 rounded-xl text-right text-xs transition border flex flex-col justify-between ${
                      basemapProvider === p.id
                        ? 'bg-nafas-blue text-white border-nafas-blue shadow-sm font-bold'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className={`text-[10px] mt-0.5 ${basemapProvider === p.id ? 'text-white/80' : 'text-stone-500'}`}>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mapbox API Key Input */}
            <div className="pt-2 border-t border-nafas-reed/20 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-stone-700 flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-600" />
                  <span>مفتاح Mapbox API (اختياري):</span>
                </span>
                {mapboxToken && (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">مفعل</span>
                )}
              </div>
              <input
                type="text"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="pk.eyJ1Ijo..."
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-nafas-blue text-stone-800"
                dir="ltr"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const clean = tokenInput.trim();
                    setMapboxToken(clean);
                    if (typeof window !== 'undefined') {
                      if (clean) {
                        localStorage.setItem('nafas_mapbox_token', clean);
                        setBasemapProvider('mapbox');
                      } else {
                        localStorage.removeItem('nafas_mapbox_token');
                        if (basemapProvider === 'mapbox') setBasemapProvider('satellite');
                      }
                    }
                    setTokenSavedToast(true);
                    setTimeout(() => setTokenSavedToast(false), 2500);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-nafas-blue text-white text-xs font-bold hover:bg-nafas-blue/90 transition"
                >
                  حفظ المفتاح وتطبيق
                </button>
                {mapboxToken && (
                  <button
                    type="button"
                    onClick={() => {
                      setMapboxToken('');
                      setTokenInput('');
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('nafas_mapbox_token');
                      }
                      if (basemapProvider === 'mapbox') setBasemapProvider('satellite');
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-xs hover:bg-stone-100"
                  >
                    مسح
                  </button>
                )}
              </div>
              {tokenSavedToast && (
                <div className="text-[11px] text-emerald-700 font-bold text-center">
                  ✓ تم حفظ المفتاح وتحديث طبقة الخريطة بنجاح
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Zero State Alert Banner when no pins exist in production */}
      {filteredPins.length === 0 && mapLayerMode === 'gis' && (
        <div className="absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-sm w-[90%] bg-nafas-cream/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-nafas-walnut/30 shadow-xl text-center space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-center gap-2">
            <OrchidMotif variant="icon" size="sm" />
            <h4 className="font-arabic font-extrabold text-xs sm:text-sm text-nafas-ink">بعدنا بالبداية... وأول تغيير يبدي منك.</h4>
          </div>
          <p className="text-[11px] sm:text-xs text-nafas-walnut font-medium leading-relaxed">
            ماكو بلاغات موثقة حالياً{selectedGovernorateId !== 'all' ? ' في هذه المحافظة' : ''}. إذا شفت مشكلة بيئية، دلّينا على مكانها لنبدأ المعالجة.
          </p>
          <button
            onClick={() => {
              if (onOpenReportModalWithCoords) {
                const currentGov = IRAQ_GOVERNORATES.find(g => g.id === selectedGovernorateId) || IRAQ_GOVERNORATES[0];
                onOpenReportModalWithCoords(currentGov.lat, currentGov.lng, currentGov.id);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-nafas-copper text-white font-bold text-xs shadow hover:bg-nafas-copper/90 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>أضف أول بلاغ</span>
          </button>
        </div>
      )}

      {/* 2. Map Container */}
      <div 
        ref={mapContainerRef} 
        style={{ background: basemapProvider === 'satellite' ? '#0F172A' : '#DFD5C0' }}
        className="w-full flex-1 z-0 relative cursor-grab active:cursor-grabbing"
      />

      {/* 3. Map Legend (Bottom Right / Left in RTL) */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex flex-col gap-1.5 p-3 bg-nafas-ivory/95 backdrop-blur-md rounded-2xl border border-nafas-reed/30 shadow-lg text-[11px] text-nafas-silt max-w-xs">
        <div className="flex items-center justify-between pb-1 border-b border-nafas-reed/20 font-bold">
          <div className="flex items-center gap-1">
            <OrchidMotif variant="icon" size="sm" />
            <span>
              {mapLayerMode === 'botanical' ? 'دليل التوزع النباتي العراقي' : 'دليل الخريطة البيئية للعراق'}
            </span>
          </div>
          <span className="text-[10px] text-nafas-silt/60 font-mono">GIS Live</span>
        </div>

        {mapLayerMode === 'botanical' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-purple-800 opacity-80"></span>
              <span>محافظات موثق تواجد النبات فيها (أرجواني)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border border-stone-400 bg-stone-100"></span>
              <span>محافظات غير مسجلة رسمياً بالعينات</span>
            </div>
            <div className="pt-1 mt-1 border-t border-nafas-reed/20 text-[10px] text-stone-500">
              * تُعزل السجلات قيد المراجعة عن العرض العام
            </div>
          </>
        ) : (
          <>
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
          </>
        )}

        <div className="pt-1 mt-1 border-t border-nafas-reed/20 text-[10px] text-nafas-silt/70 flex items-center gap-1.5">
          <span className="w-4 h-1 bg-nafas-blue rounded"></span>
          <span>نهرا دجلة والفرات وشط العرب</span>
        </div>
      </div>

      {/* 4. Botanical Detail Card Floating when in botanical mode */}
      {mapLayerMode === 'botanical' && selectedBotanicalPlant && (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full animate-fadeIn hidden sm:block">
          <div className="bg-nafas-ivory/95 backdrop-blur-md rounded-3xl border border-purple-300 shadow-xl p-4 text-right space-y-2.5 text-xs text-stone-800">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div>
                <h4 className="font-black text-base text-nafas-silt">
                  {selectedBotanicalPlant.locale?.common_names?.[0]?.name || selectedBotanicalPlant.taxon.scientific_name}
                </h4>
                <p className="font-sans italic text-stone-500 text-[11px]">
                  {selectedBotanicalPlant.taxon.scientific_name}
                </p>
              </div>
              <span className="font-sans text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-bold">
                {selectedBotanicalPlant.taxon.family}
              </span>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-purple-900 block">النطاق الجغرافي المثبت:</span>
              <p className="text-[11px] text-stone-700">
                {botanicalDistributionInfo.regionsNotes.length > 0 
                  ? botanicalDistributionInfo.regionsNotes.join(' • ')
                  : 'مثبت قطرياً على عموم العراق'}
              </p>
            </div>

            <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
              {selectedBotanicalPlant.locale?.description}
            </p>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px]">
              <span className="text-stone-500">
                المحافظات المظللة: <strong className="text-purple-900">{botanicalDistributionInfo.governorateIds.size}</strong>
              </span>

              <a
                href="#clinic"
                className="text-nafas-blue font-bold hover:underline flex items-center gap-1"
              >
                <span>ملف النبتة في الصيدلية</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. Interactive Bottom Sheet for Pins */}
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

    </div>
  );
};
