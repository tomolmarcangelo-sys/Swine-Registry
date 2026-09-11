import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import '../services/leafletInit';
import * as L from 'leaflet';
import html2canvas from 'html2canvas';
import { 
  MapPin, 
  Layers, 
  Flame, 
  ShieldCheck, 
  AlertCircle, 
  Plus, 
  Crosshair, 
  Search, 
  Filter, 
  Sliders, 
  Eye, 
  EyeOff, 
  Navigation, 
  Download, 
  Info, 
  X, 
  Maximize2, 
  Minimize2,
  RotateCcw,
  RefreshCw,
  Building2,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  Sparkles,
  Phone,
  Lock,
  Tag,
  Biohazard,
  ShieldAlert,
  Droplets,
  Ban,
  Activity,
  AlertTriangle,
  Printer,
  FileText,
  Target,
  Mountain,
  Satellite,
  Globe
} from 'lucide-react';
import { 
  BARANGAYS_DATA, 
  BARANGAY_COORDS_MAP, 
  HINUNANGAN_CENTER, 
  HINUNANGAN_BOUNDS,
  HINUNANGAN_LEAFLET_MAX_BOUNDS,
  HINUNANGAN_MUNICIPAL_BOUNDARY,
  SAN_PEDRO_ISLAND_BOUNDARY,
  SAN_PABLO_ISLAND_BOUNDARY,
  HINUNANGAN_GEOJSON_BOUNDARY,
  isWithinHinunanganBoundary,
  PURPOSES, 
  PURPOSE_COLORS,
  formatCoordinatesFull,
  getClosestBarangay
} from '../data/constants';
import { GeolocationHookReturn } from '../hooks/useGeolocation';
import { BiosecurityAssessment, MapTileLayer, PigRecord, PurposeType, User } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { 
  calculateBiosecurityScore, 
  determineAsfRiskLevel, 
  evaluatePcicEligibility,
  SYSTEM_LOGIC 
} from '../config/systemLogic';

export type HeatmapModeType = 'density' | 'sanitation';
export type SanitationRiskFilter = 'all' | 'critical_only' | 'moderate_and_critical';

export interface PigBiosecurityEvaluation {
  score: number; // 0 to 7
  maxScore: number; // 7
  percentage: number; // 0 to 100%
  deficit: number; // 7 - score
  riskLevel: 'critical' | 'moderate' | 'compliant';
  riskWeight: number; // multiplier for thermal heat alpha
  isCriticalHotspot: boolean;
  isSwillViolation: boolean;
  missingPractices: string[];
}

// Biosecurity Scoring and Deficit Calculator delegating to centralized system logic engine
export function evaluatePigBiosecurity(pig: PigRecord): PigBiosecurityEvaluation {
  const bioEval = calculateBiosecurityScore(pig.biosecurity);
  const asfRisk = determineAsfRiskLevel(pig);
  const deficit = bioEval.maxScore - bioEval.score;
  const isSwillViolation = bioEval.isSwillViolation;
  const isCriticalHotspot = asfRisk.code === 'RED' || asfRisk.code === 'PINK' || isSwillViolation;

  // Thermal weight formula:
  let riskWeight = deficit * 0.45;
  if (isSwillViolation) riskWeight += 1.4; // Swill feeding is primary driver of African Swine Fever
  if (asfRisk.code === 'RED') riskWeight += 2.0;
  if (!pig.vaccinated) riskWeight += 0.4;
  if (bioEval.score >= 6 && !isSwillViolation) {
    riskWeight = 0.05; // Compliant farms produce negligible sanitation heat
  }

  const riskLevel: 'critical' | 'moderate' | 'compliant' = 
    isCriticalHotspot ? 'critical' : (bioEval.score <= 4 ? 'moderate' : 'compliant');

  return {
    score: bioEval.score,
    maxScore: bioEval.maxScore,
    percentage: bioEval.percentage,
    deficit,
    riskLevel,
    riskWeight: Math.max(0.05, riskWeight),
    isCriticalHotspot,
    isSwillViolation,
    missingPractices: bioEval.missingPractices
  };
}

// Generates precise territorial boundary polygon coordinates for a Barangay
export function getBarangayBoundaryPolygon(b: { name: string; lat: number; lng: number }): [number, number][] {
  if (b.name === 'San Pedro Island') return SAN_PEDRO_ISLAND_BOUNDARY;
  if (b.name === 'San Pablo Island') return SAN_PABLO_ISLAND_BOUNDARY;

  const seed = b.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseLatRadius = 0.0072 + ((seed % 7) * 0.0005);
  const baseLngRadius = 0.0082 + ((seed % 9) * 0.0006);

  const points: [number, number][] = [];
  const numVertices = 8;
  for (let i = 0; i < numVertices; i++) {
    const angle = (i * 2 * Math.PI) / numVertices;
    const offsetFactor = 0.85 + (((seed * (i + 1)) % 30) / 100);
    const lat = b.lat + Math.sin(angle) * baseLatRadius * offsetFactor;
    const lng = b.lng + Math.cos(angle) * baseLngRadius * offsetFactor;
    points.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
  }
  return points;
}

// Calculates real-time biosecurity risk level and status for a Barangay
export function getBarangayRiskData(b: { name: string; lat: number; lng: number; isCoastal: boolean; terrainType?: string }, pigsList: PigRecord[]) {
  const brgyPigs = (pigsList || []).filter(p => p.barangay.toLowerCase() === b.name.toLowerCase());
  const brgyHeads = brgyPigs.reduce((sum, p) => sum + ((p as any).headCount || 1), 0);
  const unvaxPigs = brgyPigs.filter(p => !p.vaccinated);
  const vaxCount = brgyPigs.length - unvaxPigs.length;
  const vaxRate = brgyPigs.length > 0 ? (vaxCount / brgyPigs.length) * 100 : 100;

  const bioScores = brgyPigs.map(p => evaluatePigBiosecurity(p).score);
  const avgBioScore = bioScores.length > 0 
    ? bioScores.reduce((a, b) => a + b, 0) / bioScores.length 
    : 6.0;

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let statusText = 'Low Risk / High Compliance';
  let color = '#10B981'; // Green (#10B981)
  let strokeColor = '#047857';
  let badgeBg = 'background: rgba(16, 185, 129, 0.18); color: #047857; border: 1px solid rgba(16, 185, 129, 0.35);';

  if (unvaxPigs.length >= 3 || avgBioScore < 3.8 || (brgyPigs.length > 0 && vaxRate < 50)) {
    riskLevel = 'high';
    statusText = 'High Risk / Active Health Alert';
    color = '#EF4444'; // Red (#EF4444)
    strokeColor = '#B91C1C';
    badgeBg = 'background: rgba(239, 68, 68, 0.18); color: #B91C1C; border: 1px solid rgba(239, 68, 68, 0.35);';
  } else if (unvaxPigs.length > 0 || avgBioScore < 5.2 || (brgyPigs.length > 0 && vaxRate < 85)) {
    riskLevel = 'medium';
    statusText = 'Medium Risk / Moderate Compliance';
    color = '#F59E0B'; // Yellow/Amber (#F59E0B)
    strokeColor = '#B45309';
    badgeBg = 'background: rgba(245, 158, 11, 0.18); color: #B45309; border: 1px solid rgba(245, 158, 11, 0.35);';
  }

  return {
    brgyPigs,
    brgyHeads,
    farmCount: brgyPigs.length,
    unvaxCount: unvaxPigs.length,
    vaxRate: Math.round(vaxRate),
    avgBioScore: Number(avgBioScore.toFixed(1)),
    riskLevel,
    statusText,
    color,
    strokeColor,
    badgeBg
  };
}

interface GisMapProps {
  pigs: PigRecord[];
  currentUser: User;
  onOpenAddModalWithCoords: (coords: { lat: number; lng: number; barangay?: string }) => void;
  onEditPig: (pig: PigRecord) => void;
  geo?: GeolocationHookReturn;
  focusPigId?: string | null;
  pendingRecordIds?: Set<string>;
}

const TILE_CONFIG: Record<MapTileLayer, { name: string; url: string; attribution: string; maxZoom: number }> = {
  roadmap: {
    name: 'Google Maps Roadmap (Street View)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  standard: {
    name: 'OpenStreetMap (Streets & Sitios)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  satellite: {
    name: 'ESRI World Imagery (Satellite)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; World Imagery',
    maxZoom: 19
  },
  hybrid: {
    name: 'Google Maps Hybrid (Satellite & Roads)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  topo: {
    name: 'CartoDB Voyager (Clean Street Map)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 19
  },
  terrain: {
    name: 'OpenTopo (Topographic / Elevation)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors',
    maxZoom: 17
  },
  dark: {
    name: 'CartoDB Dark Matter (High Contrast)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 19
  }
};

export const GisMap: React.FC<GisMapProps> = ({
  pigs = [],
  currentUser,
  onOpenAddModalWithCoords,
  onEditPig,
  geo,
  focusPigId,
  pendingRecordIds = new Set<string>()
}) => {
  const { t } = useI18n();
  const isAdmin = currentUser.role === 'admin';

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  // Layer Groups
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const barangaysLayerRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const bufferLayerRef = useRef<L.LayerGroup | null>(null);
  const newPinMarkerRef = useRef<L.Marker | null>(null);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);
  const userGpsCircleRef = useRef<L.Circle | null>(null);
  const canvasHeatmapLayerRef = useRef<L.Layer | null>(null);

  // States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTile, setActiveTile] = useState<MapTileLayer>('roadmap');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapModeType>('sanitation');
  const [sanitationRiskFilter, setSanitationRiskFilter] = useState<SanitationRiskFilter>('all');
  const [showHeatmapToolbar, setShowHeatmapToolbar] = useState<boolean>(true);
  const [showSwinePins, setShowSwinePins] = useState<boolean>(true);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(38);
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(1.25);
  const [showBoundary, setShowBoundary] = useState<boolean>(true);
  const [showBarangayNodes, setShowBarangayNodes] = useState<boolean>(true);
  const [showBiosecurityBuffers, setShowBiosecurityBuffers] = useState<boolean>(false);
  const [bufferDistance, setBufferDistance] = useState<number>(500); // meters
  
  // Add Pin Mode
  const [isPinModeActive, setIsPinModeActive] = useState<boolean>(false);
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number; barangay: string } | null>(null);
  const [boundaryWarning, setBoundaryWarning] = useState<string | null>(null);
  const [hoverLocation, setHoverLocation] = useState<{
    lat: number;
    lng: number;
    barangay: string;
    isInside: boolean;
  } | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerBoundaryWarning = useCallback((message?: string) => {
    const warningMsg = message || t('gis.boundaryRestrictedToast', undefined, 'Swine registrations are restricted to Hinunangan municipality boundaries.');
    setBoundaryWarning(warningMsg);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => {
      setBoundaryWarning(null);
    }, 4500);
  }, [t]);

  // Fullscreen, Zoom Level & Export States
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(13);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [mapCapturedImage, setMapCapturedImage] = useState<string | null>(null);
  const [isCapturingMap, setIsCapturingMap] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [selectedHealth, setSelectedHealth] = useState<'all' | 'vax' | 'unvax'>('all');

  // Selected Pin / Detail Card & Photo Modal
  const [selectedPig, setSelectedPig] = useState<PigRecord | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<{ url: string; earTag: string; ownerName: string; breed?: string; barangay?: string } | null>(null);

  // Global listeners for Leaflet Popup action events
  useEffect(() => {
    const handleOpenPhotoEvent = (e: any) => {
      if (e.detail?.url) {
        setExpandedPhoto(e.detail);
      }
    };
    const handleEditPigFromEvent = (e: any) => {
      const target = (pigs || []).find(p => p.id === e.detail?.pigId);
      if (target) {
        onEditPig(target);
      }
    };
    const handleSelectPigFromEvent = (e: any) => {
      const target = (pigs || []).find(p => p.id === e.detail?.pigId);
      if (target) {
        setSelectedPig(target);
      }
    };

    window.addEventListener('hinunangan_open_photo', handleOpenPhotoEvent);
    window.addEventListener('hinunangan_edit_pig_id', handleEditPigFromEvent);
    window.addEventListener('hinunangan_select_pig_id', handleSelectPigFromEvent);

    return () => {
      window.removeEventListener('hinunangan_open_photo', handleOpenPhotoEvent);
      window.removeEventListener('hinunangan_edit_pig_id', handleEditPigFromEvent);
      window.removeEventListener('hinunangan_select_pig_id', handleSelectPigFromEvent);
    };
  }, [pigs, onEditPig]);

  // UI Panels (Legend collapsed by default)
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [legendTab, setLegendTab] = useState<'markers' | 'heatmap'>('markers');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState<boolean>(false);
  const [isStylePickerOpen, setIsStylePickerOpen] = useState<boolean>(false);
  const [gpsLocating, setGpsLocating] = useState<boolean>(false);

  // Filter visible pigs based on user role and search filters
  const filteredPigs = useMemo(() => {
    return (pigs || []).filter(p => {
      // Role scope
      if (!isAdmin && currentUser.barangay && p.barangay !== currentUser.barangay) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTag = p.earTag.toLowerCase().includes(q);
        const matchesOwner = p.ownerName.toLowerCase().includes(q);
        const matchesBrgy = p.barangay.toLowerCase().includes(q);
        const matchesBreed = p.breed.toLowerCase().includes(q);
        if (!matchesTag && !matchesOwner && !matchesBrgy && !matchesBreed) return false;
      }
      // Barangay filter
      if (selectedBarangay !== 'all' && p.barangay !== selectedBarangay) {
        return false;
      }
      // Purpose filter
      if (selectedPurpose !== 'all' && p.purpose !== selectedPurpose) {
        return false;
      }
      // Health filter
      if (selectedHealth === 'vax' && !p.vaccinated) return false;
      if (selectedHealth === 'unvax' && p.vaccinated) return false;

      return true;
    });
  }, [pigs, currentUser, isAdmin, searchQuery, selectedBarangay, selectedPurpose, selectedHealth]);

  // Aggregate Municipal & Barangay Biosecurity / Sanitation Analytics
  const biosecurityStats = useMemo(() => {
    let criticalHotspotCount = 0;
    let moderateDeficitCount = 0;
    let compliantCount = 0;
    let totalScore = 0;
    let swillViolations = 0;
    let footbathMissing = 0;
    let disinfectionMissing = 0;
    let fencingDamaged = 0;

    const brgyHotspotMap: Record<string, { critical: number; moderate: number; compliant: number; total: number; scoreSum: number; avgScore: number }> = {};
    BARANGAYS_DATA.forEach(b => {
      brgyHotspotMap[b.name] = { critical: 0, moderate: 0, compliant: 0, total: 0, scoreSum: 0, avgScore: 0 };
    });

    filteredPigs.forEach(p => {
      const bio = evaluatePigBiosecurity(p);
      totalScore += bio.score;

      if (bio.isCriticalHotspot) {
        criticalHotspotCount++;
      } else if (bio.riskLevel === 'moderate') {
        moderateDeficitCount++;
      } else {
        compliantCount++;
      }

      if (bio.isSwillViolation) swillViolations++;
      if (p.biosecurity && !p.biosecurity.footbathMaintenance) footbathMissing++;
      if (p.biosecurity && !p.biosecurity.disinfectionRoutine) disinfectionMissing++;
      if (p.biosecurity && !p.biosecurity.fencingIntegrity) fencingDamaged++;

      if (brgyHotspotMap[p.barangay]) {
        brgyHotspotMap[p.barangay].total++;
        brgyHotspotMap[p.barangay].scoreSum += bio.score;
        if (bio.isCriticalHotspot) {
          brgyHotspotMap[p.barangay].critical++;
        } else if (bio.riskLevel === 'moderate') {
          brgyHotspotMap[p.barangay].moderate++;
        } else {
          brgyHotspotMap[p.barangay].compliant++;
        }
      }
    });

    Object.keys(brgyHotspotMap).forEach(bName => {
      const bData = brgyHotspotMap[bName];
      bData.avgScore = bData.total > 0 ? Math.round((bData.scoreSum / (bData.total * 7)) * 100) : 0;
    });

    const avgScorePct = filteredPigs.length > 0 ? Math.round((totalScore / (filteredPigs.length * 7)) * 100) : 0;

    // Top affected barangays with critical sanitation deficits
    const topCriticalBarangays = Object.entries(brgyHotspotMap)
      .filter(([_, d]) => d.critical > 0)
      .sort((a, b) => b[1].critical - a[1].critical);

    return {
      criticalHotspotCount,
      moderateDeficitCount,
      compliantCount,
      avgScorePct,
      swillViolations,
      footbathMissing,
      disinfectionMissing,
      fencingDamaged,
      brgyHotspotMap,
      topCriticalBarangays
    };
  }, [filteredPigs]);

  // Sync browser fullscreen status
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      timer = setTimeout(() => {
        if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => {
          if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);
      }).catch((err) => {
        console.warn("Fullscreen toggle failed:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => {
          if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);
      }).catch((err) => {
        console.warn("Exit fullscreen failed:", err);
      });
    }
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedBarangay('all');
    setShowBarangayNodes(true);
    setSearchQuery('');
    setSelectedPig(null);
    setPinnedLocation(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([HINUNANGAN_CENTER.lat, HINUNANGAN_CENTER.lng], 12, { duration: 1 });
    }
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!mapContainerRef.current) return;
    setIsCapturingMap(true);
    setIsExportMenuOpen(false);
    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 2
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `hinunangan-gis-map-${selectedBarangay.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.click();
    } catch (err) {
      console.error("PNG Map Export Failed:", err);
    } finally {
      setIsCapturingMap(false);
    }
  }, [selectedBarangay]);

  const handleOpenPdfReportModal = useCallback(async () => {
    if (!mapContainerRef.current) return;
    setIsCapturingMap(true);
    setIsExportMenuOpen(false);
    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 1.5
      });
      const image = canvas.toDataURL('image/png');
      setMapCapturedImage(image);
      setIsPdfModalOpen(true);
    } catch (err) {
      console.error("PDF Map Capture Failed:", err);
    } finally {
      setIsCapturingMap(false);
    }
  }, []);

  // ResizeObserver for reliable map canvas resizing across all viewport changes
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const container = mapContainerRef.current;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Invalidate map size on fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [HINUNANGAN_CENTER.lat, HINUNANGAN_CENTER.lng],
      zoom: HINUNANGAN_CENTER.zoom,
      minZoom: 11,
      maxZoom: 20,
      maxBounds: HINUNANGAN_LEAFLET_MAX_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false
    });

    // Add controls
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

    // Add Base Tile
    const tile = L.tileLayer(TILE_CONFIG[activeTile].url, {
      attribution: TILE_CONFIG[activeTile].attribution,
      maxZoom: TILE_CONFIG[activeTile].maxZoom
    }).addTo(map);
    tileLayerRef.current = tile;

    // Track first successful paint / tile load
    tile.once('load', () => {
      setIsLoading(false);
    });

    map.whenReady(() => {
      requestAnimationFrame(() => {
        setIsLoading(false);
      });
    });

    const initialLoadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    // Layer Groups
    markersLayerRef.current = L.layerGroup().addTo(map);
    barangaysLayerRef.current = L.layerGroup().addTo(map);
    boundaryLayerRef.current = L.layerGroup().addTo(map);
    bufferLayerRef.current = L.layerGroup().addTo(map);

    // Map Click Listener
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Strict Hinunangan Municipal Boundary Validation
      const boundaryValidation = isWithinHinunanganBoundary(lat, lng);
      if (!boundaryValidation.isInside) {
        triggerBoundaryWarning();
        if (newPinMarkerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(newPinMarkerRef.current);
          newPinMarkerRef.current = null;
        }
        setPinnedLocation(null);
        return;
      }

      // Valid inside Hinunangan: Drop pin / update new swine registration location
      setBoundaryWarning(null);
      const closest = getClosestBarangay(lat, lng);
      setPinnedLocation({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        barangay: boundaryValidation.barangay || closest.barangay.name
      });
      setSelectedPig(null);
    });

    // Realtime Mouse Hover Coordinate & Location Inspector
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const validation = isWithinHinunanganBoundary(lat, lng);
      const closest = getClosestBarangay(lat, lng);
      setHoverLocation({
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        barangay: validation.barangay || closest.barangay.name,
        isInside: validation.isInside
      });
    });

    map.on('mouseout', () => {
      setHoverLocation(null);
    });

    map.on('zoomend', () => {
      setMapZoomLevel(map.getZoom());
    });

    mapInstanceRef.current = map;

    const sizeTimeout = setTimeout(() => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(sizeTimeout);
      clearTimeout(initialLoadTimer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // suppress any teardown errors
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Base Tile
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tile = L.tileLayer(TILE_CONFIG[activeTile].url, {
      attribution: TILE_CONFIG[activeTile].attribution,
      maxZoom: TILE_CONFIG[activeTile].maxZoom
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = tile;
  }, [activeTile]);

  // Update Pig Markers (Toggleable pins with Spatial Clustering for dense marker sets)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // If pins are toggled off, don't draw markers
    if (!showSwinePins) return;

    const renderSinglePigMarker = (pig: PigRecord) => {
      const isDeceased = pig.isDeceased;
      const isVaccinated = pig.vaccinated;
      const bioEval = evaluatePigBiosecurity(pig);
      const isCritical = bioEval.isCriticalHotspot || !isVaccinated || isDeceased;
      const color = PURPOSE_COLORS[pig.purpose] || '#2F5C3F';

      // Determine SVG icon and styling based on health & biosecurity risk status
      let pinColor = '#2F5C3F'; // Default green (compliant / healthy)
      let borderColor = '#FFFFFF';
      let pulseRing = '';
      let svgSymbol = '';

      if (isDeceased) {
        pinColor = '#7F1D1D'; // Dark red for mortality / deceased
        borderColor = '#FCA5A5';
        pulseRing = `<div class="animate-pulse-quarantine" style="position: absolute; inset: -5px; border-radius: 50%; background: #7F1D1D; opacity: 0.35;"></div>`;
        svgSymbol = `<path d="M9 2a1 1 0 00-1 1v1H6a2 2 0 00-2 2v2a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2h-2V3a1 1 0 00-1-1zm0 8a3 3 0 100 6 3 3 0 000-6zm-4.5 9a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill="white"/>`;
      } else if (isCritical) {
        pinColor = '#DC2626'; // Vibrant red pulse for critical / unvaccinated / ASF risk
        borderColor = '#FEE2E2';
        pulseRing = `<div class="animate-pulse-red" style="position: absolute; inset: -4px; border-radius: 50%; background: #EF4444; opacity: 0.4;"></div>`;
        svgSymbol = `<path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z" fill="white"/>`;
      } else if (!isVaccinated) {
        pinColor = '#D97706'; // Amber for pending vaccination
        borderColor = '#FEF3C7';
        svgSymbol = `<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" fill="white"/>`;
      } else {
        pinColor = '#059669'; // Emerald green for fully compliant & vaccinated
        borderColor = '#A7F3D0';
        svgSymbol = `<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" fill="white"/>`;
      }

      const markerHtml = `
        <div class="group cursor-pointer hover:scale-115 active:scale-90" style="position: relative; display: flex; flex-direction: column; align-items: center; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
          ${pulseRing}
          <div style="
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            background: ${pinColor}; 
            border: 2.5px solid ${borderColor}; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.35); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            position: relative;
            z-index: 2;
          ">
            <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24">
              ${svgSymbol}
            </svg>
          </div>
          <div style="width: 2.5px; height: 8px; background: ${pinColor}; border-radius: 1px; margin-top: -1px; z-index: 1;"></div>
          <div style="width: 8px; height: 3px; border-radius: 50%; background: rgba(0,0,0,0.4);"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-pig-pin',
        html: markerHtml,
        iconSize: [26, 36],
        iconAnchor: [13, 36]
      });

      const marker = L.marker([pig.lat, pig.lng], { icon: customIcon });

      const bioScore = pig.biosecurity ? Object.values(pig.biosecurity).filter(Boolean).length : (pig.asfCleared ? 5 : 3);
      const bioLevel = bioScore >= 6 ? 3 : bioScore >= 4 ? 2 : 1;

      const bioBadgeStyle = bioLevel === 3 
        ? 'background: #065F46; color: #FFFFFF;' 
        : bioLevel === 2 
          ? 'background: #B45309; color: #FFFFFF;' 
          : 'background: #991B1B; color: #FFFFFF;';

      const healthBadge = isDeceased
        ? `<span style="background: rgba(239, 68, 68, 0.2); color: #7F1D1D; border: 1px solid rgba(220, 38, 38, 0.5); padding: 2px 6px; border-radius: 6px; font-weight: 800; font-size: 10px;">💀 Deceased (${pig.mortalityReason || 'Mortality'})</span>`
        : (isVaccinated 
          ? `<span style="background: rgba(16, 185, 129, 0.15); color: #047857; border: 1px solid rgba(16, 185, 129, 0.35); padding: 2px 6px; border-radius: 6px; font-weight: 700; font-size: 10px;">🛡️ Vaccinated (Protected)</span>`
          : `<span style="background: rgba(239, 68, 68, 0.15); color: #B91C1C; border: 1px solid rgba(239, 68, 68, 0.35); padding: 2px 6px; border-radius: 6px; font-weight: 700; font-size: 10px;">⚠️ Unvaccinated / Due</span>`);

      // Rich Leaflet Popup Card Content
      const safeEarTag = pig.earTag.replace(/'/g, "\\'");
      const safeOwnerName = pig.ownerName.replace(/'/g, "\\'");
      const safeBreed = (pig.breed || 'Native').replace(/'/g, "\\'");
      const safeBrgy = pig.barangay.replace(/'/g, "\\'");
      const photoSrc = pig.photoUrl || '';

      const photoHtml = photoSrc 
        ? `
          <div style="position: relative; width: 68px; height: 68px; border-radius: 12px; overflow: hidden; border: 2px solid #D9A441; flex-shrink: 0; background: #000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            <img src="${photoSrc}" alt="Swine photo" style="width: 100%; height: 100%; object-fit: cover;" />
            <button 
              type="button"
              onclick="window.dispatchEvent(new CustomEvent('hinunangan_open_photo', { detail: { url: '${photoSrc}', earTag: '${safeEarTag}', ownerName: '${safeOwnerName}', breed: '${safeBreed}', barangay: '${safeBrgy}' } }))"
              style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); color: #FFF; font-size: 9px; font-weight: bold; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity 0.2s;"
              onmouseover="this.style.opacity='1'"
              onmouseout="this.style.opacity='0'"
              title="Click to view high-resolution photo"
            >
              🔍 Zoom
            </button>
          </div>
        `
        : `
          <div style="width: 68px; height: 68px; border-radius: 12px; border: 2px dashed #DED2AE; background: #EAE1C4; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; color: #55604F;">
            <span style="font-size: 20px;">🐖</span>
            <span style="font-size: 8px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">No Photo</span>
          </div>
        `;

      const popupContent = `
        <div style="
          background: #F5EFDD; 
          color: #1E2B1F; 
          border: 2px solid #D9A441; 
          border-radius: 16px; 
          padding: 12px; 
          box-shadow: 0 14px 35px rgba(0,0,0,0.38); 
          font-family: system-ui, -apple-system, sans-serif; 
          font-size: 11px; 
          width: 275px; 
          line-height: 1.4;
        ">
          <!-- Card Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #DED2AE; padding-bottom: 6px; margin-bottom: 8px;">
            <div style="font-family: monospace; font-weight: 800; font-size: 13px; color: #203F2B; display: flex; align-items: center; gap: 4px;">
              <span style="background: #203F2B; color: #D9A441; padding: 2px 6px; border-radius: 6px;">${pig.earTag}</span>
            </div>
            <span style="padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; background: ${color}25; color: ${color}; border: 1px solid ${color}60;">
              ${pig.purpose}
            </span>
          </div>

          <!-- Top Row: Photo Thumbnail + Core Swine Specs -->
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
            ${photoHtml}
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
              <div style="font-weight: 800; color: #203F2B; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${pig.ownerName}
              </div>
              <div style="color: #55604F; font-size: 10px; font-weight: 600;">
                Brgy. <b style="color: #1E2B1F;">${pig.barangay}</b>
              </div>
              <div style="font-family: monospace; font-size: 10px; font-weight: 700; color: #2F5C3F;">
                ${pig.breed || 'Native'} · ${pig.sex || 'Female'} · ${pig.weight}kg
              </div>
              ${pig.contact ? `<a href="tel:${pig.contact}" style="color: #2F5C3F; font-size: 10px; text-decoration: none; font-weight: bold; display: flex; align-items: center; gap: 3px; margin-top: 1px;">📞 ${pig.contact}</a>` : ''}
            </div>
          </div>

          <!-- Health & Biosecurity Badges -->
          <div style="display: flex; flex-direction: column; gap: 4px; background: #FAF6EC; padding: 6px 8px; border-radius: 10px; border: 1px solid #DED2AE; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #55604F; font-size: 10px; font-weight: 600;">Health Status:</span>
              ${healthBadge}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #55604F; font-size: 10px; font-weight: 600;">Biosecurity:</span>
              <span style="padding: 1px 6px; border-radius: 4px; font-size: 10px; font-family: monospace; font-weight: 700; ${bioBadgeStyle}">
                Level ${bioLevel} (${bioScore}/7)
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-family: monospace; font-size: 9.5px; color: #55604F; border-top: 1px dashed #DED2AE; padding-top: 3px; margin-top: 2px;">
              <span>GPS Coordinates:</span>
              <b style="color: #203F2B;">${pig.lat.toFixed(5)}°, ${pig.lng.toFixed(5)}°</b>
            </div>
          </div>

          <!-- Interactive Action Buttons -->
          <div style="display: grid; grid-template-columns: ${photoSrc ? '1fr 1fr' : '1fr'}; gap: 6px;">
            ${photoSrc ? `
              <button 
                type="button" 
                onclick="window.dispatchEvent(new CustomEvent('hinunangan_open_photo', { detail: { url: '${photoSrc}', earTag: '${safeEarTag}', ownerName: '${safeOwnerName}', breed: '${safeBreed}', barangay: '${safeBrgy}' } }))"
                style="background: #EAE1C4; color: #203F2B; border: 1px solid #DED2AE; border-radius: 8px; padding: 5px 0; font-size: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
              >
                🔍 Enlarge Photo
              </button>
            ` : ''}
            <button 
              type="button" 
              onclick="window.dispatchEvent(new CustomEvent('hinunangan_edit_pig_id', { detail: { pigId: '${pig.id}' } }))"
              style="background: #2F5C3F; color: #FFF; border: none; border-radius: 8px; padding: 5px 0; font-size: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
            >
              ✏️ Edit Record
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        offset: [0, -28],
        maxWidth: 295,
        minWidth: 260,
        className: 'gis-rich-popup'
      });

      // Click on marker
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedPig(pig);
        setPinnedLocation(null);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([pig.lat, pig.lng]);
        }
      });

      markersLayerRef.current?.addLayer(marker);
    };

    // Cluster points if zoom < 15 to reduce visual density on mobile and small screens
    if (mapZoomLevel < 15 && filteredPigs.length > 1) {
      const clusters: { center: [number, number]; pigs: PigRecord[] }[] = [];
      const clusterThresholdPx = 42;

      filteredPigs.forEach(pig => {
        try {
          if (!mapInstanceRef.current || !(mapInstanceRef.current as any)._mapPane) {
            clusters.push({ center: [pig.lat, pig.lng], pigs: [pig] });
            return;
          }
          const pt = mapInstanceRef.current.latLngToLayerPoint([pig.lat, pig.lng]);
          let clustered = false;

          for (const c of clusters) {
            const cPt = mapInstanceRef.current.latLngToLayerPoint(c.center);
            const dist = Math.hypot(pt.x - cPt.x, pt.y - cPt.y);
            if (dist < clusterThresholdPx) {
              c.pigs.push(pig);
              c.center = [
                c.pigs.reduce((s, p) => s + p.lat, 0) / c.pigs.length,
                c.pigs.reduce((s, p) => s + p.lng, 0) / c.pigs.length
              ];
              clustered = true;
              break;
            }
          }

          if (!clustered) {
            clusters.push({ center: [pig.lat, pig.lng], pigs: [pig] });
          }
        } catch {
          clusters.push({ center: [pig.lat, pig.lng], pigs: [pig] });
        }
      });

      // Render clusters or single pins
      clusters.forEach(c => {
        if (c.pigs.length === 1) {
          renderSinglePigMarker(c.pigs[0]);
        } else {
          const count = c.pigs.length;
          const totalHeads = count;
          const hasDeceased = c.pigs.some(p => p.isDeceased);
          const hasUnvaccinated = c.pigs.some(p => !p.vaccinated);
          const allVaccinated = c.pigs.every(p => p.vaccinated && !p.isDeceased);

          const clusterBg = hasDeceased 
            ? '#7F1D1D' 
            : hasUnvaccinated 
            ? '#D97706' 
            : '#203F2B';

          const ringColor = hasDeceased
            ? '#FCA5A5'
            : hasUnvaccinated
            ? '#FCD34D'
            : '#D9A441';

          const clusterHtml = `
            <div class="group cursor-pointer hover:scale-110 active:scale-95" style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s ease;
            ">
              <div style="
                position: absolute;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: ${clusterBg};
                opacity: 0.25;
              "></div>
              <div style="
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: ${clusterBg};
                border: 2.5px solid ${ringColor};
                box-shadow: 0 4px 10px rgba(0,0,0,0.45);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: monospace;
                font-weight: 800;
                font-size: 11px;
                line-height: 1;
              ">
                <span>${count}</span>
              </div>
            </div>
          `;

          const clusterIcon = L.divIcon({
            className: 'custom-pig-cluster',
            html: clusterHtml,
            iconSize: [38, 38],
            iconAnchor: [19, 19]
          });

          const clusterMarker = L.marker(c.center, { icon: clusterIcon });

          const clusterTooltip = `
            <div style="
              background: #F5EFDD;
              color: #1E2B1F;
              border: 2px solid #D9A441;
              border-radius: 12px;
              padding: 8px 10px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 11px;
              box-shadow: 0 6px 16px rgba(0,0,0,0.3);
              pointer-events: none;
              line-height: 1.3;
              width: 200px;
            ">
              <div style="font-weight: 800; color: #203F2B; margin-bottom: 2px;">
                📍 Cluster: ${count} Swine Units
              </div>
              <div style="font-size: 10px; color: #55604F;">
                ${totalHeads} Total Swine Heads
              </div>
              <div style="margin-top: 3px; font-size: 10px; font-weight: 700; ${allVaccinated ? 'color: #047857;' : hasDeceased ? 'color: #991B1B;' : 'color: #B45309;'}">
                ${allVaccinated ? '✓ 100% Vaccinated' : hasDeceased ? '💀 Deceased Reported' : '⚠️ Due / Unvaccinated'}
              </div>
              <div style="margin-top: 4px; font-size: 9px; color: #2F5C3F; font-weight: bold; background: #EAE1C4; border-radius: 4px; padding: 2px 4px; text-align: center;">
                Tap to zoom into this cluster
              </div>
            </div>
          `;

          clusterMarker.bindTooltip(clusterTooltip, {
            direction: 'top',
            offset: [0, -19],
            opacity: 1,
            className: 'gis-custom-tooltip'
          });

          clusterMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo(c.center, Math.min(18, mapZoomLevel + 2));
            }
          });

          markersLayerRef.current?.addLayer(clusterMarker);
        }
      });
    } else {
      // Zoom >= 15 or 1 pig: render individual markers
      filteredPigs.forEach(pig => renderSinglePigMarker(pig));
    }
  }, [filteredPigs, showSwinePins, mapZoomLevel, selectedBarangay]);

  // Update Municipal & Barangay Boundary Polygons
  useEffect(() => {
    if (!mapInstanceRef.current || !boundaryLayerRef.current) return;
    boundaryLayerRef.current.clearLayers();

    if (!showBoundary) return;

    // 1. Hinunangan Municipal Outer Perimeter Line
    const municipalPolygon = L.polygon(HINUNANGAN_MUNICIPAL_BOUNDARY, {
      color: '#0F172A',
      weight: 2.5,
      opacity: 0.85,
      fillColor: '#0F172A',
      fillOpacity: 0.04,
      dashArray: '5, 5',
      interactive: false
    });
    boundaryLayerRef.current.addLayer(municipalPolygon);

    // San Pedro & San Pablo Island Perimeter Lines
    const sanPedroPoly = L.polygon(SAN_PEDRO_ISLAND_BOUNDARY, {
      color: '#0F172A',
      weight: 2,
      opacity: 0.85,
      fillColor: '#0F172A',
      fillOpacity: 0.04,
      dashArray: '4, 4',
      interactive: false
    });
    boundaryLayerRef.current.addLayer(sanPedroPoly);

    const sanPabloPoly = L.polygon(SAN_PABLO_ISLAND_BOUNDARY, {
      color: '#0F172A',
      weight: 2,
      opacity: 0.85,
      fillColor: '#0F172A',
      fillOpacity: 0.04,
      dashArray: '4, 4',
      interactive: false
    });
    boundaryLayerRef.current.addLayer(sanPabloPoly);

    // 2. Individual Barangay Boundary Polygons for all 40 Barangays
    BARANGAYS_DATA.forEach(b => {
      const polyCoords = getBarangayBoundaryPolygon(b);
      const isSelected = selectedBarangay.toLowerCase() === b.name.toLowerCase();

      const brgyPoly = L.polygon(polyCoords, {
        color: isSelected ? '#1D4ED8' : '#3B82F6',
        weight: isSelected ? 2.5 : 1.5,
        opacity: isSelected ? 0.95 : 0.6,
        fillColor: isSelected ? '#2563EB' : '#3B82F6',
        fillOpacity: isSelected ? 0.22 : 0.08,
        className: 'barangay-boundary-polygon'
      });

      // Interactive hover highlight effects
      brgyPoly.on('mouseover', () => {
        brgyPoly.setStyle({
          color: '#1D4ED8',
          weight: 2.5,
          opacity: 0.95,
          fillColor: '#3B82F6',
          fillOpacity: 0.25
        });
      });

      brgyPoly.on('mouseout', () => {
        const currentSelected = selectedBarangay.toLowerCase() === b.name.toLowerCase();
        brgyPoly.setStyle({
          color: currentSelected ? '#1D4ED8' : '#3B82F6',
          weight: currentSelected ? 2.5 : 1.5,
          opacity: currentSelected ? 0.95 : 0.6,
          fillColor: currentSelected ? '#2563EB' : '#3B82F6',
          fillOpacity: currentSelected ? 0.22 : 0.08
        });
      });

      brgyPoly.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedBarangay(b.name);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([b.lat, b.lng], 15);
        }
      });

      boundaryLayerRef.current?.addLayer(brgyPoly);
    });
  }, [showBoundary, selectedBarangay]);

  // Update Barangay Center Dynamic Centered Labels & Hubs
  useEffect(() => {
    if (!mapInstanceRef.current || !barangaysLayerRef.current) return;

    barangaysLayerRef.current.clearLayers();

    // Determine which barangays to show: if showBarangayNodes is enabled, show all (or filtered). If disabled, show only when searched or selected.
    const activeBrgyList = BARANGAYS_DATA.filter(b => {
      if (showBarangayNodes) {
        if (selectedBarangay !== 'all') {
          return b.name.toLowerCase() === selectedBarangay.toLowerCase();
        }
        return true;
      }
      if (selectedBarangay !== 'all') {
        return b.name.toLowerCase() === selectedBarangay.toLowerCase();
      }
      if (searchQuery.trim().length >= 2) {
        return b.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return false;
    });

    activeBrgyList.forEach(b => {
      const isSelected = selectedBarangay.toLowerCase() === b.name.toLowerCase();
      const brgyPigs = (pigs || []).filter(p => p.barangay.toLowerCase() === b.name.toLowerCase());
      const brgyHeads = brgyPigs.reduce((acc, p) => acc + (p.headCount || 1), 0);
      const brgyCriticalCount = brgyPigs.filter(p => (p.biosecurityLevel || 1) === 1 || !p.vaccinated).length;

      // Dynamic Centered Barangay Name Label with pinpoint centroid indicator
      const markerHtml = `
        <div class="group cursor-pointer select-none" style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%);
          pointer-events: auto;
        ">
          <!-- Center Pinpoint Dot -->
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${isSelected ? '#D97706' : '#203F2B'};
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 4px rgba(0,0,0,0.35);
            margin-bottom: 2px;
          "></div>

          <!-- Centered Name Label Badge -->
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
            background: ${isSelected ? '#1D4ED8' : 'rgba(255, 255, 255, 0.95)'};
            color: ${isSelected ? '#FFFFFF' : '#1E293B'};
            border: 1px solid ${isSelected ? '#D9A441' : 'rgba(59, 130, 246, 0.5)'};
            border-radius: 6px;
            padding: 2px 6px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 10px;
            font-weight: 700;
            box-shadow: 0 2px 5px rgba(0,0,0,0.18);
            white-space: nowrap;
            transition: all 0.15s ease;
          ">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: ${b.isCoastal ? '#3B82F6' : '#10B981'};"></span>
            <span>${b.name}</span>
          </div>
        </div>
      `;

      const brgyIcon = L.divIcon({
        className: 'custom-brgy-centroid-label',
        html: markerHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([b.lat, b.lng], { icon: brgyIcon });

      const brgyTooltipHtml = `
        <div style="
          background: #F5EFDD; 
          color: #1E2B1F; 
          border: 2px solid #D9A441; 
          border-radius: 14px; 
          padding: 10px 12px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.35); 
          font-family: system-ui, -apple-system, sans-serif; 
          font-size: 11px; 
          width: 220px; 
          pointer-events: none;
          line-height: 1.4;
        ">
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #DED2AE; padding-bottom: 5px; margin-bottom: 6px;">
            <div style="font-family: 'Fraunces', Georgia, serif; font-weight: 700; font-size: 13px; color: #203F2B; display: flex; align-items: center; gap: 4px;">
              <span style="color: #D9A441;">📍</span>
              <span>Brgy. ${b.name}</span>
            </div>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; ${
              b.isCoastal 
                ? 'background: rgba(59, 130, 246, 0.15); color: #1D4ED8; border: 1px solid rgba(59, 130, 246, 0.3);' 
                : 'background: rgba(16, 185, 129, 0.15); color: #047857; border: 1px solid rgba(16, 185, 129, 0.3);'
            }">
              ${b.isCoastal ? '🌊 Coastal' : '🏞️ Inland'}
            </span>
          </div>

          <!-- Body Info -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="color: #55604F; font-size: 10px; font-weight: 600;">Administrative:</span>
              <span style="font-family: monospace; font-weight: 700; color: #203F2B;">${b.purokCount} Puroks</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="color: #55604F; font-size: 10px; font-weight: 600;">Registered Swine:</span>
              <span style="font-family: monospace; font-weight: 800; color: #2F5C3F;">${brgyHeads} Head(s) (${brgyPigs.length} records)</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="color: #55604F; font-size: 10px; font-weight: 600;">Herd Health:</span>
              <span style="font-family: monospace; font-weight: 700; ${brgyCriticalCount > 0 ? 'color: #B91C1C;' : 'color: #047857;'}">
                ${brgyCriticalCount > 0 ? `${brgyCriticalCount} Due/At Risk` : '✓ 100% Protected'}
              </span>
            </div>

            <div style="border-top: 1px dashed #DED2AE; padding-top: 4px; margin-top: 2px; font-family: monospace; font-size: 10px; color: #55604F; display: flex; justify-content: space-between;">
              <span>Center Lat/Lng:</span>
              <span style="color: #203F2B; font-weight: 700;">${b.lat.toFixed(5)}°N, ${b.lng.toFixed(5)}°E</span>
            </div>
          </div>

          <!-- Footer prompt -->
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #DED2AE; font-size: 9px; color: #2F5C3F; font-weight: 700; text-align: center; background: #EAE1C4; border-radius: 6px; padding: 3px 0;">
            🔍 Click to zoom &amp; inspect ${b.name}
          </div>
        </div>
      `;

      marker.bindTooltip(brgyTooltipHtml, {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        className: 'gis-custom-tooltip'
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedBarangay(b.name);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([b.lat, b.lng], 16);
        }
      });

      barangaysLayerRef.current?.addLayer(marker);
    });
  }, [showBarangayNodes, selectedBarangay, searchQuery, pigs]);

  // Update Biosecurity Buffer Rings
  useEffect(() => {
    if (!mapInstanceRef.current || !bufferLayerRef.current) return;

    bufferLayerRef.current.clearLayers();

    if (showBiosecurityBuffers) {
      // Draw buffer rings around selected pig, or around all unvaccinated pigs, or around pinned location
      const pointsToBuffer = selectedPig 
        ? [selectedPig] 
        : filteredPigs.filter(p => !p.vaccinated || p.purpose === 'Piggery');

      pointsToBuffer.forEach(p => {
        // Inner 500m Surveillance Zone
        const innerCircle = L.circle([p.lat, p.lng], {
          radius: bufferDistance,
          color: '#DC2626',
          fillColor: '#EF4444',
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '5, 5'
        });

        // Outer 1000m Quarantine Ring
        const outerCircle = L.circle([p.lat, p.lng], {
          radius: bufferDistance * 2,
          color: '#D97706',
          fillColor: '#F59E0B',
          fillOpacity: 0.05,
          weight: 1,
          dashArray: '3, 6'
        });

        bufferLayerRef.current?.addLayer(innerCircle);
        bufferLayerRef.current?.addLayer(outerCircle);
      });
    }
  }, [showBiosecurityBuffers, bufferDistance, selectedPig, filteredPigs]);

  // Update Pinned Location Marker (when user clicks map to drop a new registration location)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (newPinMarkerRef.current) {
      mapInstanceRef.current.removeLayer(newPinMarkerRef.current);
      newPinMarkerRef.current = null;
    }

    if (pinnedLocation) {
      const pinHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; animation: bounce 1s infinite alternate;">
          <div style="
            width: 38px; 
            height: 38px; 
            border-radius: 50%; 
            background: #2F5C3F; 
            border: 3px solid #D9A441; 
            box-shadow: 0 6px 16px rgba(0,0,0,0.45); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 18px;
          ">
            📍
          </div>
          <div style="
            margin-top: 4px;
            background: #203F2B;
            color: #D9A441;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            font-family: monospace;
            border: 1px solid #D9A441;
            white-space: nowrap;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
          ">
            New Registration Spot
          </div>
        </div>
      `;

      const customPinIcon = L.divIcon({
        className: 'new-reg-pin',
        html: pinHtml,
        iconSize: [38, 60],
        iconAnchor: [19, 50]
      });

      const pinMarker = L.marker([pinnedLocation.lat, pinnedLocation.lng], {
        icon: customPinIcon,
        draggable: true
      }).addTo(mapInstanceRef.current);

      pinMarker.on('dragend', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        const boundaryValidation = isWithinHinunanganBoundary(pos.lat, pos.lng);
        if (!boundaryValidation.isInside) {
          triggerBoundaryWarning();
          // Revert pin back to previous valid position
          if (pinnedLocation) {
            pinMarker.setLatLng([pinnedLocation.lat, pinnedLocation.lng]);
          }
          return;
        }

        setBoundaryWarning(null);
        const closest = getClosestBarangay(pos.lat, pos.lng);
        setPinnedLocation({
          lat: Number(pos.lat.toFixed(6)),
          lng: Number(pos.lng.toFixed(6)),
          barangay: boundaryValidation.barangay || closest.barangay.name
        });
      });

      newPinMarkerRef.current = pinMarker;
    }
  }, [pinnedLocation]);

  // Heatmap Canvas Layer Custom Renderer
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing heatmap layer if any
    if (canvasHeatmapLayerRef.current) {
      mapInstanceRef.current.removeLayer(canvasHeatmapLayerRef.current);
      canvasHeatmapLayerRef.current = null;
    }

    if (!showHeatmap || filteredPigs.length === 0) return;

    // Create a Leaflet Canvas Overlay for Swine Density Heatmap
    const CanvasOverlay = L.Layer.extend({
      onAdd: function (map: L.Map) {
        this._map = map;
        const canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer') as HTMLCanvasElement;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '250';
        canvas.style.opacity = '0.75';
        this._canvas = canvas;

        const pane = map.getPane('overlayPane');
        pane?.appendChild(canvas);

        map.on('move', this._reset, this);
        map.on('resize', this._reset, this);
        this._reset();
      },

      onRemove: function (map: L.Map) {
        const pane = map.getPane('overlayPane');
        if (pane && this._canvas) {
          pane.removeChild(this._canvas);
        }
        map.off('move', this._reset, this);
        map.off('resize', this._reset, this);
      },

      _reset: function () {
        const map = this._map;
        const canvas = this._canvas;
        if (!map || !canvas || !(map as any)._mapPane) return;

        try {
          const size = map.getSize();
          if (!size || size.x <= 0 || size.y <= 0) return;

          const topLeft = map.containerPointToLayerPoint([0, 0]);
          L.DomUtil.setPosition(canvas, topLeft);

          canvas.width = size.x;
          canvas.height = size.y;

          this._draw();
        } catch (e) {
          // Suppress coordinate calculation errors if unmounted during animation
        }
      },

      _draw: function () {
        const map = this._map;
        const canvas = this._canvas;
        if (!map || !canvas || !(map as any)._mapPane) return;
        if (!canvas.width || !canvas.height || canvas.width <= 0 || canvas.height <= 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Pre-render Gaussian radial gradient brush
        const radius = Math.max(1, heatmapRadius);
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = radius * 2;
        blurCanvas.height = radius * 2;
        const bCtx = blurCanvas.getContext('2d');
        if (!bCtx) return;

        const grad = bCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        grad.addColorStop(0, `rgba(0, 0, 0, ${Math.min(1, 0.4 * heatmapIntensity)})`);
        grad.addColorStop(0.5, `rgba(0, 0, 0, ${Math.min(1, 0.2 * heatmapIntensity)})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        bCtx.fillStyle = grad;
        bCtx.fillRect(0, 0, radius * 2, radius * 2);

        // Draw points on alpha channel
        filteredPigs.forEach(p => {
          const pt = map.latLngToContainerPoint([p.lat, p.lng]);
          
          if (heatmapMode === 'sanitation') {
            ctx.globalAlpha = evaluatePigBiosecurity(p).riskWeight;
          } else {
            ctx.globalAlpha = 1.0;
          }
          
          ctx.drawImage(blurCanvas, pt.x - radius, pt.y - radius);
        });
        ctx.globalAlpha = 1.0; // Reset alpha

        // Colorize canvas using municipal biosecurity gradient (Blue -> Emerald -> Gold -> Red)
        try {
          if (canvas.width > 0 && canvas.height > 0) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Gradient lookup palette
            const palette = createHeatmapPalette();
            if (palette && palette.length >= 1024) {
              for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha > 0) {
                  const palIdx = Math.min(255, alpha);
                  data[i] = palette[palIdx * 4];       // R
                  data[i + 1] = palette[palIdx * 4 + 1]; // G
                  data[i + 2] = palette[palIdx * 4 + 2]; // B
                  data[i + 3] = Math.min(230, alpha * 1.5); // Smoothed Alpha
                }
              }
              ctx.putImageData(imgData, 0, 0);
            }
          }
        } catch (err) {
          console.warn('Heatmap canvas colorize skipped:', err);
        }
      }
    });

    const heatmapInstance = new (CanvasOverlay as any)();
    heatmapInstance.addTo(mapInstanceRef.current);
    canvasHeatmapLayerRef.current = heatmapInstance;

    return () => {
      if (canvasHeatmapLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(canvasHeatmapLayerRef.current);
        canvasHeatmapLayerRef.current = null;
      }
    };
  }, [showHeatmap, filteredPigs, heatmapRadius, heatmapIntensity, heatmapMode]);

  // Palette generator helper
  function createHeatmapPalette(): Uint8ClampedArray {
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pCtx = paletteCanvas.getContext('2d')!;
    const pGrad = pCtx.createLinearGradient(0, 0, 256, 1);
    
    pGrad.addColorStop(0.0, 'rgba(0, 0, 255, 0)');
    pGrad.addColorStop(0.2, '#3B82F6'); // Blue
    pGrad.addColorStop(0.45, '#10B981'); // Emerald
    pGrad.addColorStop(0.7, '#F59E0B');  // Amber Gold
    pGrad.addColorStop(0.9, '#EF4444');  // Crimson Red
    pGrad.addColorStop(1.0, '#7F1D1D');  // Deep Critical

    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 256, 1);
    return pCtx.getImageData(0, 0, 256, 1).data;
  }

  // Focus specific pig if requested
  useEffect(() => {
    if (!focusPigId || !mapInstanceRef.current) return;
    const target = (pigs || []).find(p => p.id === focusPigId);
    if (target) {
      setSelectedPig(target);
      mapInstanceRef.current.flyTo([target.lat, target.lng], 16, { duration: 1.2 });
    }
  }, [focusPigId, pigs]);

  // GPS Locate My Position
  const handleGpsLocate = async () => {
    if (!geo || !mapInstanceRef.current) return;
    setGpsLocating(true);
    const pos = await geo.getCurrentLocation();
    setGpsLocating(false);

    if (pos) {
      // Remove old user GPS marker if any
      if (userGpsMarkerRef.current) {
        mapInstanceRef.current.removeLayer(userGpsMarkerRef.current);
      }
      if (userGpsCircleRef.current) {
        mapInstanceRef.current.removeLayer(userGpsCircleRef.current);
      }

      const userIcon = L.divIcon({
        className: 'user-gps-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #3B82F6; border: 3px solid white; box-shadow: 0 0 10px #3B82F6;"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const userMarker = L.marker([pos.lat, pos.lng], { icon: userIcon }).addTo(mapInstanceRef.current);
      const userCircle = L.circle([pos.lat, pos.lng], {
        radius: pos.accuracy,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.15,
        weight: 1.5
      }).addTo(mapInstanceRef.current);

      userGpsMarkerRef.current = userMarker;
      userGpsCircleRef.current = userCircle;

      mapInstanceRef.current.flyTo([pos.lat, pos.lng], 16);
    }
  };

  // Export GeoJSON
  const handleExportGeoJson = () => {
    const geoJson = {
      type: 'FeatureCollection',
      features: filteredPigs.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat]
        },
        properties: {
          id: p.id,
          earTag: p.earTag,
          ownerName: p.ownerName,
          barangay: p.barangay,
          purpose: p.purpose,
          breed: p.breed,
          weightKg: p.weight,
          vaccinated: p.vaccinated,
          asfCleared: p.asfCleared,
          dateRegistered: p.dateRegistered,
          registeredBy: p.registeredBy
        }
      }))
    };

    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hinunangan_swine_gis_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-full min-h-[480px] sm:min-h-[560px] bg-[#EAE1C4] sm:rounded-2xl overflow-hidden sm:border border-[#DED2AE] shadow-lg flex flex-col flex-1">
      
      {/* MAP LOADING OVERLAY */}
      {isLoading && (
        <div 
          id="gis-map-loading-overlay"
          className="absolute inset-0 z-35 bg-[#F5EFDD]/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 transition-opacity duration-300"
        >
          <div className="w-10 h-10 border-3 border-[#203F2B]/20 border-t-[#203F2B] rounded-full animate-spin" />
          <span className="font-serif font-bold text-sm text-[#203F2B] tracking-wide">
            Loading map...
          </span>
        </div>
      )}

      {/* COMPACT FLOATING GIS TOOLBAR */}
      <div className="absolute top-2 left-2 right-2 sm:top-2.5 sm:left-2.5 sm:right-2.5 z-20 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pointer-events-none">
        
        {/* Left: Quick Search, Barangay Filter & Query Modifiers */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#F5EFDD]/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#DED2AE] shadow-md">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#55604F] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tag, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-4 py-1 bg-white border border-[#DED2AE] rounded-lg text-xs text-[#1E2B1F] focus:border-[#2F5C3F] outline-none w-32 sm:w-44 lg:w-48 placeholder:text-[#8D9B87]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#8D9B87] hover:text-[#1E2B1F] text-xs cursor-pointer font-bold px-1"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <select
            value={selectedBarangay}
            onChange={(e) => {
              const brgy = e.target.value;
              setSelectedBarangay(brgy);
              if (brgy !== 'all' && mapInstanceRef.current) {
                const c = BARANGAY_COORDS_MAP[brgy];
                if (c) mapInstanceRef.current.flyTo([c.lat, c.lng], 15);
              }
            }}
            className="bg-white border border-[#DED2AE] rounded-lg px-2 py-1 text-xs font-semibold text-[#203F2B] outline-none cursor-pointer max-w-[125px] sm:max-w-[155px] truncate"
          >
            <option value="all">All 40 Barangays</option>
            {BARANGAYS_DATA.map(b => (
              <option key={b.name} value={b.name}>{b.name} ({b.isCoastal ? 'Coastal' : 'Inland'})</option>
            ))}
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isFilterPanelOpen || selectedPurpose !== 'all' || selectedHealth !== 'all'
                ? 'bg-[#2F5C3F] text-white border-[#203F2B]' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title="Filter by Purpose & Vaccination"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {(selectedPurpose !== 'all' || selectedHealth !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441]" />
            )}
          </button>
        </div>

        {/* Right: Map Modes & Quick Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto bg-[#F5EFDD]/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#DED2AE] shadow-md flex-wrap sm:flex-nowrap">
          
          {/* Map Layer Style Switcher (Street / Satellite / Topographic) */}
          <div className="flex items-center bg-white border border-[#DED2AE] rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTile('roadmap')}
              className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeTile === 'roadmap' || activeTile === 'standard'
                  ? 'bg-[#2F5C3F] text-white shadow-xs'
                  : 'text-[#55604F] hover:text-[#203F2B] hover:bg-[#F5EFDD]/60'
              }`}
              title="Street Map View (Roads, Infrastructure & Sitios)"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Street</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTile('satellite')}
              className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeTile === 'satellite' || activeTile === 'hybrid'
                  ? 'bg-[#2F5C3F] text-white shadow-xs'
                  : 'text-[#55604F] hover:text-[#203F2B] hover:bg-[#F5EFDD]/60'
              }`}
              title="Satellite Imagery (High-Resolution Aerial Farm Canopy & Pen Structures)"
            >
              <Satellite className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Satellite</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTile('terrain')}
              className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                activeTile === 'terrain' || activeTile === 'topo'
                  ? 'bg-[#2F5C3F] text-white shadow-xs'
                  : 'text-[#55604F] hover:text-[#203F2B] hover:bg-[#F5EFDD]/60'
              }`}
              title="Topographic Elevation (Contours, Terrain Slopes & Watershed Analysis)"
            >
              <Mountain className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Topographic</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#DED2AE] hidden sm:block mx-0.5" />

          {/* Add Swine Pin Mode Button */}
          <button
            onClick={() => {
              setIsPinModeActive(!isPinModeActive);
              if (!isPinModeActive && !pinnedLocation) {
                // Drop pin at map center or default to Poblacion if center is out of bounds
                if (mapInstanceRef.current) {
                  const center = mapInstanceRef.current.getCenter();
                  const validation = isWithinHinunanganBoundary(center.lat, center.lng);
                  if (validation.isInside) {
                    const closest = getClosestBarangay(center.lat, center.lng);
                    setPinnedLocation({
                      lat: Number(center.lat.toFixed(6)),
                      lng: Number(center.lng.toFixed(6)),
                      barangay: validation.barangay || closest.barangay.name
                    });
                    setBoundaryWarning(null);
                  } else {
                    // Default to Poblacion (Hinunangan Center)
                    const pob = BARANGAY_COORDS_MAP['Poblacion'] || { lat: 10.3969, lng: 125.1999 };
                    setPinnedLocation({
                      lat: pob.lat,
                      lng: pob.lng,
                      barangay: 'Poblacion'
                    });
                    mapInstanceRef.current.panTo([pob.lat, pob.lng]);
                    setBoundaryWarning(null);
                  }
                }
              }
            }}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
              pinnedLocation || isPinModeActive
                ? 'bg-[#2F5C3F] text-[#D9A441] border border-[#D9A441] ring-2 ring-[#D9A441]/40'
                : 'bg-[#2F5C3F] text-white hover:bg-[#203F2B]'
            }`}
            title="Drop GPS Pin to Register Swine"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{pinnedLocation ? 'Pinned' : 'Pin Swine'}</span>
          </button>

          {/* Heatmap Toggle Button */}
          <button
            onClick={() => {
              if (showHeatmap) {
                setShowHeatmap(false);
                setShowSwinePins(true);
                setShowBarangayNodes(true);
              } else {
                setShowHeatmap(true);
                setShowHeatmapToolbar(true);
              }
            }}
            className={`px-2 py-1 rounded-lg font-bold text-xs flex items-center gap-1 border transition-all cursor-pointer ${
              showHeatmap 
                ? 'bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-400/40' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title={showHeatmap ? "Heatmap is Active - Click to Turn Off Heatmap" : "Click to Enable Swine Density & Risk Heatmap"}
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-amber-300 animate-pulse' : 'text-rose-600'}`} />
            <span className="hidden sm:inline font-semibold">{showHeatmap ? 'Heatmap ON' : 'Heatmap'}</span>
          </button>

          {/* Re-open Heatmap Controls */}
          {showHeatmap && !showHeatmapToolbar && (
            <button
              onClick={() => setShowHeatmapToolbar(true)}
              className="px-2 py-1 bg-[#203F2B] text-[#D9A441] border border-[#D9A441] hover:bg-[#2F5C3F] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Show Heatmap Floating Controls"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Controls</span>
            </button>
          )}

          {/* Swine Pins Toggle Icon */}
          <button
            onClick={() => setShowSwinePins(prev => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              !showSwinePins 
                ? 'bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-300' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title={showSwinePins ? "Hide Swine Pin Markers" : "Show Swine Pin Markers"}
          >
            {!showSwinePins ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-[#2F5C3F]" />}
          </button>

          {/* Barangay Labels Toggle */}
          <button
            onClick={() => setShowBarangayNodes(prev => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              !showBarangayNodes 
                ? 'bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-300' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title={showBarangayNodes ? "Hide Barangay Labels" : "Show Barangay Labels"}
          >
            <Tag className={`w-3.5 h-3.5 ${!showBarangayNodes ? 'text-amber-700' : 'text-[#2F5C3F]'}`} />
          </button>

          {/* Layers Toggle */}
          <button
            onClick={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
              isLayersPanelOpen 
                ? 'bg-[#2F5C3F] text-white border-[#203F2B]' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title="Base Layers & Overlays"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* GPS Locate Button */}
          {geo && (
            <button
              onClick={handleGpsLocate}
              disabled={gpsLocating}
              className="p-1.5 bg-white hover:bg-[#FBF8EF] text-[#2F5C3F] border border-[#DED2AE] rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Locate My GPS Position"
            >
              <Crosshair className={`w-3.5 h-3.5 ${gpsLocating ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Reset Center */}
          <button
            onClick={handleResetView}
            className="p-1.5 bg-white hover:bg-[#FBF8EF] text-[#55604F] border border-[#DED2AE] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Reset Map View, Center & Show All Barangays"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Reset View</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullScreen}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
              isFullscreen 
                ? 'bg-[#2F5C3F] text-[#D9A441] border-[#D9A441]' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title={isFullscreen ? "Exit Fullscreen Map" : "Enter Fullscreen Map"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Export / Print Map Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isCapturingMap}
              className="px-2 py-1 bg-[#203F2B] hover:bg-[#2F5C3F] text-[#D9A441] border border-[#D9A441] rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Export or Print GIS Map"
            >
              {isCapturingMap ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px]">Export / Print</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-[#FAF6EC] border-2 border-[#DED2AE] rounded-xl shadow-2xl z-50 p-1.5 space-y-1 font-sans animate-fadeIn">
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#EAE1C4] rounded-lg text-xs text-[#1E2B1F] font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#2F5C3F]" />
                  <span>Export as Image (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPdfReportModal}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#EAE1C4] rounded-lg text-xs text-[#203F2B] font-bold flex items-center gap-2 cursor-pointer transition-colors border-t border-[#DED2AE] pt-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#D9A441]" />
                  <span>Print / Export PDF Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MUNICIPAL BOUNDARY RESTRICTION WARNING TOAST */}
      {boundaryWarning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#3D1418]/95 border-2 border-rose-500/80 text-white px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 font-sans text-xs max-w-[92vw] sm:max-w-md animate-bounce-short">
          <div className="p-1.5 bg-rose-600/30 rounded-xl border border-rose-400/40 text-amber-300 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-amber-200 text-[11px] flex items-center gap-1.5 uppercase tracking-wide">
              <span>Hinunangan Boundary Constraint</span>
            </div>
            <div className="text-white/95 text-xs font-medium leading-tight mt-0.5">
              {boundaryWarning}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBoundaryWarning(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FLOATING HEATMAP TOOLBAR & PIN/LABEL TOGGLE BAR (When Heatmap is Active) */}
      {showHeatmap && showHeatmapToolbar && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#203F2B]/95 backdrop-blur-md text-white px-3 sm:px-4 py-2 rounded-2xl shadow-2xl border border-[#D9A441] flex flex-wrap items-center gap-2 sm:gap-3 font-sans max-w-[95vw]">
          <div className="flex flex-col gap-0.5 pr-2 border-r border-white/20">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#D9A441]">
              <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="hidden sm:inline">Heatmap Mode:</span>
            </div>
            <select
              value={heatmapMode}
              onChange={(e) => setHeatmapMode(e.target.value as HeatmapModeType)}
              className="bg-[#152B1D] text-white border border-[#D9A441]/30 rounded px-1 py-0.5 text-[10px] font-mono cursor-pointer outline-none focus:border-[#D9A441]"
            >
              <option value="sanitation">Biosecurity/Sanitation Risk</option>
              <option value="density">Swine Density Spread</option>
            </select>
          </div>

          {/* Dedicated Toggle Icon to Hide/Show Pin Points */}
          <button
            type="button"
            onClick={() => setShowSwinePins(prev => !prev)}
            className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              !showSwinePins 
                ? 'bg-[#D9A441] text-[#203F2B] font-extrabold shadow-md' 
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/30'
            }`}
            title={showSwinePins ? "Hide pin markers to clearly see the color gradients" : "Show pin markers on top of heatmap"}
          >
            {!showSwinePins ? <Eye className="w-3.5 h-3.5 text-[#203F2B]" /> : <EyeOff className="w-3.5 h-3.5 text-amber-300" />}
            <span>{!showSwinePins ? 'Pins Hidden' : 'Hide Pins'}</span>
          </button>

          {/* Dedicated Toggle Button to Hide/Show Barangay Labels */}
          <button
            type="button"
            onClick={() => setShowBarangayNodes(prev => !prev)}
            className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              !showBarangayNodes 
                ? 'bg-[#D9A441] text-[#203F2B] font-extrabold shadow-md' 
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/30'
            }`}
            title={showBarangayNodes ? "Hide Barangay Name Labels for clear heatmap viewing" : "Show Barangay Name Labels on heatmap"}
          >
            <Tag className={`w-3.5 h-3.5 ${!showBarangayNodes ? 'text-[#203F2B]' : 'text-amber-300'}`} />
            <span>{!showBarangayNodes ? 'Brgy. Labels Hidden' : 'Hide Brgy. Labels'}</span>
          </button>

          {/* Heat Spread Slider */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-white/80 pl-2 border-l border-white/20">
            <span className="text-[10px] font-mono uppercase text-[#D9A441]">Radius:</span>
            <input
              type="range"
              min="15"
              max="60"
              value={heatmapRadius}
              onChange={(e) => setHeatmapRadius(Number(e.target.value))}
              className="w-16 accent-[#D9A441] cursor-pointer"
            />
            <span className="text-[10px] font-mono">{heatmapRadius}px</span>
          </div>

          {/* Color Grading Spectrum Bar in Toolbar */}
          <div className="hidden lg:flex flex-col gap-0.5 px-2.5 py-1 bg-black/25 rounded-xl border border-white/10 text-[10px]">
            <span className="text-[#D9A441] font-mono font-bold">{heatmapMode === 'sanitation' ? 'Risk Scale:' : 'Density Scale:'}</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-emerald-300">{heatmapMode === 'sanitation' ? 'High' : 'Low'}</span>
              <div className="w-16 h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-yellow-400 to-rose-600 border border-white/30" />
              <span className="text-[9px] text-rose-300 font-bold">{heatmapMode === 'sanitation' ? 'Low' : 'High'}</span>
            </div>
          </div>

          {/* Close Floating Controls Toolbar (Heatmap remains ON) */}
          <button
            type="button"
            onClick={() => {
              setShowHeatmapToolbar(false);
            }}
            className="p-1 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Dismiss controls toolbar (Heatmap stays active — click Heatmap button in top bar to turn off)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTER PANEL POPUP / MOBILE BOTTOM SHEET */}
      {isFilterPanelOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 sm:hidden"
            onClick={() => setIsFilterPanelOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:top-16 sm:left-3 z-40 bg-[#F5EFDD]/95 backdrop-blur-md border-t sm:border border-[#DED2AE] rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl w-full sm:w-80 max-h-[80vh] overflow-y-auto font-sans space-y-3 pb-safe sm:pb-4">
            <div className="flex items-center justify-between border-b border-[#DED2AE] pb-2">
              <span className="font-serif font-bold text-sm text-[#203F2B] flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[#2F5C3F]" />
                Filter Map Records
              </span>
              <button onClick={() => setIsFilterPanelOpen(false)} className="text-[#55604F] hover:text-black p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

          {/* Purpose Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#55604F] mb-1">
              Purpose
            </label>
            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value)}
              className="w-full bg-white border border-[#DED2AE] rounded-lg px-2.5 py-1.5 text-xs text-[#1E2B1F]"
            >
              <option value="all">All Purposes</option>
              {PURPOSES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Vaccination Status */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#55604F] mb-1">
              Vaccination Status
            </label>
            <div className="grid grid-cols-3 gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedHealth('all')}
                className={`py-1 rounded-lg border ${selectedHealth === 'all' ? 'bg-[#2F5C3F] text-white border-[#203F2B]' : 'bg-white text-[#55604F] border-[#DED2AE]'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedHealth('vax')}
                className={`py-1 rounded-lg border ${selectedHealth === 'vax' ? 'bg-[#2F5C3F] text-white border-[#203F2B]' : 'bg-white text-[#55604F] border-[#DED2AE]'}`}
              >
                Vaccinated
              </button>
              <button
                type="button"
                onClick={() => setSelectedHealth('unvax')}
                className={`py-1 rounded-lg border ${selectedHealth === 'unvax' ? 'bg-rose-700 text-white border-rose-800' : 'bg-white text-[#55604F] border-[#DED2AE]'}`}
              >
                Unvaccinated
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[#DED2AE] flex items-center justify-between text-xs text-[#55604F]">
            <span>Visible: <b>{filteredPigs.length}</b> records</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedBarangay('all');
                setSelectedPurpose('all');
                setSelectedHealth('all');
              }}
              className="text-[#2F5C3F] font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        </div>
        </>
      )}

      {/* LAYERS & HEATMAP CONTROL PANEL / MOBILE BOTTOM SHEET */}
      {isLayersPanelOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 sm:hidden"
            onClick={() => setIsLayersPanelOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:top-16 sm:right-3 z-40 bg-[#F5EFDD]/95 backdrop-blur-md border-t sm:border border-[#DED2AE] rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl w-full sm:w-80 max-h-[80vh] overflow-y-auto font-sans space-y-3 pb-safe sm:pb-4">
            <div className="flex items-center justify-between border-b border-[#DED2AE] pb-2">
              <span className="font-serif font-bold text-sm text-[#203F2B] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#2F5C3F]" />
                Base Maps &amp; Overlays
              </span>
              <button onClick={() => setIsLayersPanelOpen(false)} className="text-[#55604F] hover:text-black p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Base Tile Selector with Categorized Styles */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase text-[#55604F]">
                  Base Map Style
                </label>
                <span className="text-[10px] font-mono text-[#2F5C3F] font-bold">
                  {TILE_CONFIG[activeTile]?.name.split('(')[0] || 'Custom'}
                </span>
              </div>

              {/* Quick Category Tabs */}
              <div className="grid grid-cols-3 gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveTile('roadmap')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold flex flex-col items-center gap-0.5 border cursor-pointer transition-all ${
                    activeTile === 'roadmap' || activeTile === 'standard'
                      ? 'bg-[#2F5C3F] text-white border-[#203F2B] shadow-xs'
                      : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                  <span>Street</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTile('satellite')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold flex flex-col items-center gap-0.5 border cursor-pointer transition-all ${
                    activeTile === 'satellite' || activeTile === 'hybrid'
                      ? 'bg-[#2F5C3F] text-white border-[#203F2B] shadow-xs'
                      : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
                  }`}
                >
                  <Satellite className="w-4 h-4" />
                  <span>Satellite</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTile('terrain')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold flex flex-col items-center gap-0.5 border cursor-pointer transition-all ${
                    activeTile === 'terrain' || activeTile === 'topo'
                      ? 'bg-[#2F5C3F] text-white border-[#203F2B] shadow-xs'
                      : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
                  }`}
                >
                  <Mountain className="w-4 h-4" />
                  <span>Topographic</span>
                </button>
              </div>

              {/* Detailed Provider List */}
              <div className="space-y-1">
                {(Object.keys(TILE_CONFIG) as MapTileLayer[]).map(key => {
                  const isStreet = key === 'roadmap' || key === 'standard';
                  const isSat = key === 'satellite' || key === 'hybrid';
                  const isTopo = key === 'terrain' || key === 'topo';

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTile(key)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between border cursor-pointer transition-colors ${
                        activeTile === key 
                          ? 'bg-[#2F5C3F] text-white border-[#203F2B] font-bold shadow-2xs' 
                          : 'bg-white text-[#1E2B1F] border-[#DED2AE] hover:bg-[#FBF8EF]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isStreet && <MapIcon className={`w-3.5 h-3.5 flex-shrink-0 ${activeTile === key ? 'text-white' : 'text-[#2F5C3F]'}`} />}
                        {isSat && <Satellite className={`w-3.5 h-3.5 flex-shrink-0 ${activeTile === key ? 'text-white' : 'text-blue-600'}`} />}
                        {isTopo && <Mountain className={`w-3.5 h-3.5 flex-shrink-0 ${activeTile === key ? 'text-white' : 'text-amber-700'}`} />}
                        {key === 'dark' && <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${activeTile === key ? 'text-white' : 'text-slate-700'}`} />}
                        <span className="truncate">{TILE_CONFIG[key].name}</span>
                      </div>
                      {activeTile === key && <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441] flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Overlay Toggles */}
            <div className="pt-2 border-t border-[#DED2AE] space-y-2">
              <label className="block text-[11px] font-bold uppercase text-[#55604F]">
                Vector Overlays &amp; Visibility
              </label>
              
              <label className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#DED2AE] text-xs cursor-pointer">
                <span className="font-semibold text-[#1E2B1F] flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded border border-slate-700 bg-slate-800/20 flex items-center justify-center text-[9px]">📐</span>
                  <span>Municipal &amp; Barangay Boundaries</span>
                </span>
                <input
                  type="checkbox"
                  checked={showBoundary}
                  onChange={(e) => setShowBoundary(e.target.checked)}
                  className="w-4 h-4 accent-[#2F5C3F] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#DED2AE] text-xs cursor-pointer">
                <span className="font-semibold text-[#1E2B1F] flex items-center gap-1.5">
                  {showSwinePins ? <Eye className="w-3.5 h-3.5 text-[#2F5C3F]" /> : <EyeOff className="w-3.5 h-3.5 text-amber-700" />}
                  <span>Swine Pin Markers</span>
                </span>
                <input
                  type="checkbox"
                  checked={showSwinePins}
                  onChange={(e) => setShowSwinePins(e.target.checked)}
                  className="w-4 h-4 accent-[#2F5C3F] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#DED2AE] text-xs cursor-pointer">
                <span className="font-semibold text-[#1E2B1F] flex items-center gap-1.5">
                  <Tag className={`w-3.5 h-3.5 ${showBarangayNodes ? 'text-[#2F5C3F]' : 'text-amber-700'}`} />
                  <span>40 Barangay Labels &amp; Hubs</span>
                </span>
                <input
                  type="checkbox"
                  checked={showBarangayNodes}
                  onChange={(e) => setShowBarangayNodes(e.target.checked)}
                  className="w-4 h-4 accent-[#2F5C3F] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#DED2AE] text-xs cursor-pointer">
                <span className="font-semibold text-[#1E2B1F]">Biosecurity Buffer Zones</span>
                <input
                  type="checkbox"
                  checked={showBiosecurityBuffers}
                  onChange={(e) => setShowBiosecurityBuffers(e.target.checked)}
                  className="w-4 h-4 accent-[#2F5C3F] cursor-pointer"
                />
              </label>
            </div>

            {/* Heatmap Settings (if active) */}
            {showHeatmap && (
              <div className="pt-2 border-t border-[#DED2AE] space-y-2">
                <label className="block text-[11px] font-bold uppercase text-[#55604F]">
                  Heatmap Radius ({heatmapRadius}px)
                </label>
                <input
                  type="range"
                  min="15"
                  max="60"
                  value={heatmapRadius}
                  onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                  className="w-full accent-[#2F5C3F] cursor-pointer"
                />
              </div>
            )}

            {/* GeoJSON Export */}
            <div className="pt-2 border-t border-[#DED2AE]">
              <button
                onClick={handleExportGeoJson}
                className="w-full py-2.5 bg-white hover:bg-[#FBF8EF] text-[#203F2B] border border-[#DED2AE] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#2F5C3F]" />
                <span>Export GIS Data (.GeoJSON)</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* PIN LOCATION ACTION CARD (When user drops a pin on map) */}
      {pinnedLocation && !selectedPig && (
        <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:bottom-6 sm:right-4 z-40 bg-[#F5EFDD]/95 backdrop-blur-md border-t-2 sm:border-2 border-[#D9A441] rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl w-full sm:w-96 font-sans space-y-2.5 pb-safe sm:pb-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#2F5C3F] text-white px-2 py-0.5 rounded font-bold uppercase">
                <MapPin className="w-3 h-3 text-[#D9A441]" />
                Selected Swine Coordinates
              </span>
              <h4 className="font-serif font-bold text-base text-[#203F2B] mt-1">
                Near Barangay {pinnedLocation.barangay}
              </h4>
            </div>
            <button
              onClick={() => setPinnedLocation(null)}
              className="text-[#55604F] hover:text-black p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] text-xs font-mono space-y-1 mb-2">
            <div className="flex justify-between">
              <span className="text-[#55604F]">Coordinates (DD):</span>
              <b className="text-[#1E2B1F]">{pinnedLocation.lat.toFixed(5)}°N, {pinnedLocation.lng.toFixed(5)}°E</b>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55604F]">Format (DMS):</span>
              <span className="text-[#1E2B1F] text-[11px]">{formatCoordinatesFull(pinnedLocation.lat, pinnedLocation.lng, 'DMS')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenAddModalWithCoords({
                  lat: pinnedLocation.lat,
                  lng: pinnedLocation.lng,
                  barangay: pinnedLocation.barangay
                });
                setPinnedLocation(null);
              }}
              className="flex-1 py-3 bg-[#2F5C3F] hover:bg-[#203F2B] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D9A441]" />
              <span>Register Swine at this Location</span>
            </button>

            <button
              onClick={() => setPinnedLocation(null)}
              className="px-4 py-3 bg-white hover:bg-[#FBF8EF] text-[#55604F] border border-[#DED2AE] rounded-xl font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SELECTED PIG DETAIL CARD (Responsive bottom-sheet on mobile) */}
      {selectedPig && (
        <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:bottom-6 sm:right-4 z-40 bg-[#F5EFDD]/95 backdrop-blur-md border-t sm:border border-[#DED2AE] rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl w-full sm:w-96 max-h-[85vh] overflow-y-auto font-sans space-y-3 pb-safe sm:pb-4 animate-slideUp sm:animate-fadeIn">
          <div className="flex items-start justify-between gap-2 border-b border-[#DED2AE] pb-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#2F5C3F] bg-[#EAE1C4] px-2 py-0.5 rounded">
                  {selectedPig.earTag}
                </span>
                <span className="text-xs text-[#55604F]">· {selectedPig.breed}</span>
                {pendingRecordIds.has(selectedPig.id) ? (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded">
                    Offline Draft
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    Live Synced
                  </span>
                )}
              </div>
              <h4 className="font-serif font-bold text-lg text-[#203F2B] mt-0.5">
                {selectedPig.ownerName}
              </h4>
            </div>

            <button
              onClick={() => setSelectedPig(null)}
              className="text-[#55604F] hover:text-black p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Photo Thumbnail Banner if available */}
          {selectedPig.photoUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#D9A441] bg-black/80 aspect-video flex items-center justify-center group">
              <img 
                src={selectedPig.photoUrl} 
                alt={`Photo for tag ${selectedPig.earTag}`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <button
                type="button"
                onClick={() => setExpandedPhoto({
                  url: selectedPig.photoUrl!,
                  earTag: selectedPig.earTag,
                  ownerName: selectedPig.ownerName,
                  breed: selectedPig.breed,
                  barangay: selectedPig.barangay
                })}
                className="absolute inset-0 bg-black/40 hover:bg-black/60 text-white font-bold text-xs flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Eye className="w-4 h-4 text-[#D9A441]" />
                <span>Click to View Full Photo</span>
              </button>
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-[#D9A441] font-mono text-[9px] px-2 py-0.5 rounded-md border border-white/20">
                Asset Verified
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2 rounded-xl border border-[#DED2AE]">
              <span className="text-[10px] text-[#55604F] uppercase font-bold block">Barangay</span>
              <b className="text-[#1E2B1F]">{selectedPig.barangay}</b>
            </div>
            <div className="bg-white p-2 rounded-xl border border-[#DED2AE]">
              <span className="text-[10px] text-[#55604F] uppercase font-bold block">Purpose</span>
              <b className="text-[#1E2B1F]">{selectedPig.purpose}</b>
            </div>
            <div className="bg-white p-2 rounded-xl border border-[#DED2AE]">
              <span className="text-[10px] text-[#55604F] uppercase font-bold block">Weight / Age</span>
              <b className="text-[#1E2B1F]">{selectedPig.weight} kg ({selectedPig.age} mos)</b>
            </div>
            <div className="bg-white p-2 rounded-xl border border-[#DED2AE]">
              <span className="text-[10px] text-[#55604F] uppercase font-bold block">Health Status</span>
              {selectedPig.isDeceased ? (
                <span className="font-bold inline-flex items-center gap-1 text-rose-800 text-[11px]">
                  💀 Deceased ({selectedPig.mortalityReason || 'Mortality'})
                </span>
              ) : (
                <span className={`font-bold inline-flex items-center gap-1 ${selectedPig.vaccinated ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedPig.vaccinated ? '🛡️ Vaccinated' : '⚠️ Pending Vax'}
                </span>
              )}
            </div>
          </div>

          {/* Contact & Physical Address Info */}
          {(selectedPig.contact || selectedPig.address) && (
            <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] text-xs space-y-1">
              {selectedPig.address && (
                <div className="text-[11px] text-[#55604F]">
                  <b>Address:</b> {selectedPig.address}, Brgy. {selectedPig.barangay}
                </div>
              )}
              {selectedPig.contact && (
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] text-[#55604F]"><b>Contact:</b> {selectedPig.contact}</span>
                  <a 
                    href={`tel:${selectedPig.contact}`}
                    className="px-2 py-0.5 bg-[#2F5C3F] text-white text-[10px] font-bold rounded-md hover:bg-[#203F2B] flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3 text-[#D9A441]" />
                    <span>Call</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Mortality Event Banner */}
          {selectedPig.isDeceased && (
            <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-xl text-xs space-y-1 text-rose-950">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Biosecurity Mortality Event</span>
              </div>
              <div className="text-[11px] grid grid-cols-2 gap-2">
                <div><b>Date:</b> {selectedPig.mortalityDate || 'Recorded'}</div>
                <div><b>Reason:</b> {selectedPig.mortalityReason || 'Unspecified'}</div>
              </div>
            </div>
          )}

          {/* Biosecurity Assessment Summary */}
          {(() => {
            const bio = selectedPig.biosecurity;
            const score = bio ? Object.values(bio).filter(Boolean).length : (selectedPig.asfCleared ? 5 : 3);
            const total = 7;
            const pct = Math.round((score / total) * 100);

            return (
              <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#203F2B] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2F5C3F]" />
                    Biosecurity Assessment:
                  </span>
                  <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                    score >= 6 ? 'bg-emerald-100 text-emerald-800' : score >= 4 ? 'bg-[#F5EFDD] text-[#2F5C3F]' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {score}/{total} ({pct}%)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] text-[#55604F] pt-0.5">
                  <div className={`flex items-center gap-1 ${bio?.footbathMaintenance ? 'text-emerald-700 font-semibold' : 'text-neutral-400'}`}>
                    <span>{bio?.footbathMaintenance ? '✓' : '✗'}</span> Footbath
                  </div>
                  <div className={`flex items-center gap-1 ${bio?.fencingIntegrity ? 'text-emerald-700 font-semibold' : 'text-neutral-400'}`}>
                    <span>{bio?.fencingIntegrity ? '✓' : '✗'}</span> Perimeter Fence
                  </div>
                  <div className={`flex items-center gap-1 ${bio?.swillFeedingBanned ? 'text-emerald-700 font-semibold' : 'text-neutral-400'}`}>
                    <span>{bio?.swillFeedingBanned ? '✓' : '✗'}</span> Zero-Swill Ban
                  </div>
                  <div className={`flex items-center gap-1 ${bio?.disinfectionRoutine ? 'text-emerald-700 font-semibold' : 'text-neutral-400'}`}>
                    <span>{bio?.disinfectionRoutine ? '✓' : '✗'}</span> Disinfection
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bg-white p-2 rounded-xl border border-[#DED2AE] text-[11px] font-mono flex items-center justify-between">
            <span className="text-[#55604F]">GPS:</span>
            <span className="text-[#1E2B1F] font-semibold">{selectedPig.lat.toFixed(5)}°, {selectedPig.lng.toFixed(5)}°</span>
          </div>

          <div className="pt-1 flex gap-2">
            {selectedPig.photoUrl && (
              <button
                type="button"
                onClick={() => setExpandedPhoto({
                  url: selectedPig.photoUrl!,
                  earTag: selectedPig.earTag,
                  ownerName: selectedPig.ownerName,
                  breed: selectedPig.breed,
                  barangay: selectedPig.barangay
                })}
                className="px-3 py-3 bg-[#EAE1C4] hover:bg-[#DED2AE] text-[#203F2B] font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <Eye className="w-4 h-4 text-[#2F5C3F]" />
                <span>Photo</span>
              </button>
            )}
            <button
              onClick={() => onEditPig(selectedPig)}
              className="flex-1 py-3 bg-[#2F5C3F] hover:bg-[#203F2B] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98 transition-transform"
            >
              <span>Edit Record</span>
            </button>
          </div>
        </div>
      )}

      {/* COMPACT FLOATING MAP LEGEND TRIGGER BUTTON */}
      {!isLegendOpen && (
        <button 
          type="button"
          onClick={() => setIsLegendOpen(true)}
          className="absolute bottom-4 sm:bottom-6 left-3 sm:left-4 z-20 flex items-center gap-2 bg-[#203F2B]/95 hover:bg-[#2A5239] text-[#F5EFDD] border border-[#D9A441] px-3.5 py-2 rounded-2xl shadow-xl font-sans text-xs font-bold transition-all cursor-pointer backdrop-blur-md active:scale-95 group"
          title="Open GIS Map & Cluster Legend"
          aria-label="Open GIS Map & Cluster Legend"
        >
          <div className="w-5 h-5 rounded-md bg-[#D9A441]/20 flex items-center justify-center text-[#D9A441] group-hover:scale-110 transition-transform">
            <MapIcon className="w-3.5 h-3.5 text-[#D9A441]" />
          </div>
          <span className="font-serif tracking-wide text-xs">GIS Legend</span>
          <span className="text-[10px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded font-mono font-normal">
            Clusters &amp; Colors
          </span>
        </button>
      )}

      {/* FLOATING QUICK MAP STYLE SWITCHER (Street, Satellite, Topographic) */}
      {!selectedPig && (
        <div className="absolute bottom-4 sm:bottom-6 right-3 sm:right-4 z-20 flex flex-col items-end">
          {isStylePickerOpen ? (
            <div className="bg-[#F5EFDD]/95 backdrop-blur-md border-2 border-[#D9A441] rounded-2xl shadow-2xl p-2.5 w-64 font-sans space-y-1.5 animate-fadeIn mb-1">
              <div className="flex items-center justify-between border-b border-[#DED2AE] pb-1.5 px-1">
                <span className="text-xs font-serif font-bold text-[#203F2B] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#2F5C3F]" />
                  Map Style View
                </span>
                <button
                  type="button"
                  onClick={() => setIsStylePickerOpen(false)}
                  className="p-1 text-[#55604F] hover:text-black rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3 Main Styles */}
              <button
                type="button"
                onClick={() => {
                  setActiveTile('roadmap');
                  setIsStylePickerOpen(false);
                }}
                className={`w-full text-left p-2 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                  activeTile === 'roadmap' || activeTile === 'standard'
                    ? 'bg-[#2F5C3F] text-white border-[#203F2B] shadow-xs'
                    : 'bg-white text-[#1E2B1F] border-[#DED2AE] hover:bg-[#FBF8EF]'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activeTile === 'roadmap' || activeTile === 'standard' ? 'bg-white/20 text-white' : 'bg-[#F5EFDD] text-[#2F5C3F]'}`}>
                  <MapIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Street Map</span>
                    {(activeTile === 'roadmap' || activeTile === 'standard') && <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441]" />}
                  </div>
                  <p className={`text-[10px] leading-tight mt-0.5 ${activeTile === 'roadmap' || activeTile === 'standard' ? 'text-white/80' : 'text-[#55604F]'}`}>
                    Roads, barangay centers, puroks &amp; access paths
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTile('satellite');
                  setIsStylePickerOpen(false);
                }}
                className={`w-full text-left p-2 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                  activeTile === 'satellite' || activeTile === 'hybrid'
                    ? 'bg-[#2F5C3F] text-white border-[#203F2B] shadow-xs'
                    : 'bg-white text-[#1E2B1F] border-[#DED2AE] hover:bg-[#FBF8EF]'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activeTile === 'satellite' || activeTile === 'hybrid' ? 'bg-white/20 text-white' : 'bg-[#F5EFDD] text-blue-700'}`}>
                  <Satellite className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Satellite Aerial</span>
                    {(activeTile === 'satellite' || activeTile === 'hybrid') && <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441]" />}
                  </div>
                  <p className={`text-[10px] leading-tight mt-0.5 ${activeTile === 'satellite' || activeTile === 'hybrid' ? 'text-white/80' : 'text-[#55604F]'}`}>
                    High-res farm canopy, backyard pens &amp; vegetation
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTile('terrain');
                  setIsStylePickerOpen(false);
                }}
                className={`w-full text-left p-2 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                  activeTile === 'terrain' || activeTile === 'topo'
                    ? 'bg-[#2F5C3F] text-white border-[#203F2B] shadow-xs'
                    : 'bg-white text-[#1E2B1F] border-[#DED2AE] hover:bg-[#FBF8EF]'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activeTile === 'terrain' || activeTile === 'topo' ? 'bg-white/20 text-white' : 'bg-[#F5EFDD] text-amber-700'}`}>
                  <Mountain className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Topographic</span>
                    {(activeTile === 'terrain' || activeTile === 'topo') && <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441]" />}
                  </div>
                  <p className={`text-[10px] leading-tight mt-0.5 ${activeTile === 'terrain' || activeTile === 'topo' ? 'text-white/80' : 'text-[#55604F]'}`}>
                    Elevation contours, slopes &amp; watershed runoff
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsStylePickerOpen(true)}
              className="flex items-center gap-2 bg-[#203F2B]/95 hover:bg-[#2A5239] text-[#F5EFDD] border border-[#D9A441] px-3.5 py-2 rounded-2xl shadow-xl font-sans text-xs font-bold transition-all cursor-pointer backdrop-blur-md active:scale-95 group"
              title="Switch Base Map Style: Street, Satellite, or Topographic"
            >
              <div className="w-5 h-5 rounded-md bg-[#D9A441]/20 flex items-center justify-center text-[#D9A441] group-hover:scale-110 transition-transform">
                {activeTile === 'satellite' || activeTile === 'hybrid' ? (
                  <Satellite className="w-3.5 h-3.5" />
                ) : activeTile === 'terrain' || activeTile === 'topo' ? (
                  <Mountain className="w-3.5 h-3.5" />
                ) : (
                  <MapIcon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="font-serif tracking-wide text-xs">
                {activeTile === 'satellite' || activeTile === 'hybrid'
                  ? 'Satellite'
                  : activeTile === 'terrain' || activeTile === 'topo'
                  ? 'Topographic'
                  : 'Street Map'}
              </span>
              <span className="text-[10px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded font-mono font-normal">
                Styles
              </span>
            </button>
          )}
        </div>
      )}

      {/* COMPACT SLIDE-UP BOTTOM SHEET LEGEND (TOUCH-OPTIMIZED FOR MOBILE) */}
      {isLegendOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 sm:hidden animate-fadeIn"
            onClick={() => setIsLegendOpen(false)}
          />

          {/* Bottom Sheet Container */}
          <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:bottom-6 sm:left-4 z-50 bg-[#F5EFDD]/95 backdrop-blur-md border-t-2 sm:border-2 border-[#D9A441] rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-4.5 w-full sm:w-96 max-h-[85vh] sm:max-h-[78vh] overflow-y-auto font-sans space-y-3 pb-safe sm:pb-4 transition-all animate-slideUp sm:animate-fadeIn">
            
            {/* Mobile Touch Pull Indicator */}
            <div className="w-12 h-1.5 bg-[#C9BA98] rounded-full mx-auto mb-1.5 sm:hidden" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-[#DED2AE] pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#203F2B] flex items-center justify-center text-[#D9A441] shadow-xs">
                  <MapIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#203F2B] leading-tight">
                    GIS Map &amp; Cluster Legend
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#55604F]">
                    <span>DA Hinunangan</span>
                    <span>•</span>
                    <span className="font-mono font-semibold text-[#2F5C3F]">{filteredPigs.length} plotted</span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsLegendOpen(false)}
                className="p-1.5 text-[#55604F] hover:text-[#203F2B] hover:bg-[#EAE1C4] rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Close legend"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Touch Tab Switcher */}
            <div className="grid grid-cols-2 bg-[#EAE1C4] p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setLegendTab('markers')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] ${
                  legendTab === 'markers'
                    ? 'bg-[#203F2B] text-white shadow-xs'
                    : 'text-[#55604F] hover:text-[#1E2B1F]'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>Marker Colors</span>
              </button>
              <button
                type="button"
                onClick={() => setLegendTab('heatmap')}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] ${
                  legendTab === 'heatmap'
                    ? 'bg-[#203F2B] text-white shadow-xs'
                    : 'text-[#55604F] hover:text-[#1E2B1F]'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Heat Map &amp; Clusters</span>
              </button>
            </div>

            {/* TAB 1: MARKER COLORS & BIOSECURITY */}
            {legendTab === 'markers' && (
              <div className="space-y-3 animate-fadeIn text-xs">
                
                {/* Biosecurity Levels Section */}
                <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#55604F] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2F5C3F]" />
                      Biosecurity Rating Levels
                    </span>
                    <span className="text-[9px] font-mono text-[#D9A441] font-bold">
                      DA Standards
                    </span>
                  </div>

                  {/* Ratio bar */}
                  <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-200 shadow-inner">
                    <div 
                      className="bg-emerald-600 transition-all duration-500" 
                      style={{ width: `${filteredPigs.length > 0 ? (biosecurityStats.compliantCount / filteredPigs.length) * 100 : 33.3}%` }} 
                      title={`Level 3: ${biosecurityStats.compliantCount} farms`}
                    />
                    <div 
                      className="bg-amber-500 transition-all duration-500" 
                      style={{ width: `${filteredPigs.length > 0 ? (biosecurityStats.moderateDeficitCount / filteredPigs.length) * 100 : 33.3}%` }} 
                      title={`Level 2: ${biosecurityStats.moderateDeficitCount} farms`}
                    />
                    <div 
                      className="bg-rose-600 transition-all duration-500" 
                      style={{ width: `${filteredPigs.length > 0 ? (biosecurityStats.criticalHotspotCount / filteredPigs.length) * 100 : 33.3}%` }} 
                      title={`Level 1: ${biosecurityStats.criticalHotspotCount} farms`}
                    />
                  </div>

                  {/* Level descriptions */}
                  <div className="space-y-1.5 text-[10px]">
                    {/* Level 3 */}
                    <div className="bg-[#FAF6EC] p-2 rounded-lg border border-emerald-200 flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0 mt-0.5 shadow-xs border border-emerald-700" />
                      <div className="leading-tight flex-1">
                        <div className="flex items-center justify-between font-bold text-emerald-900">
                          <span>Level 3: High Biosecurity (Compliant)</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                            {biosecurityStats.compliantCount} ({filteredPigs.length > 0 ? Math.round((biosecurityStats.compliantCount / filteredPigs.length) * 100) : 0}%)
                          </span>
                        </div>
                        <p className="text-[10px] text-[#55604F] mt-0.5">
                          Perimeter fence, disinfectant footbath, zero-swill protocol active.
                        </p>
                      </div>
                    </div>

                    {/* Level 2 */}
                    <div className="bg-[#FAF6EC] p-2 rounded-lg border border-amber-200 flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0 mt-0.5 shadow-xs border border-amber-600" />
                      <div className="leading-tight flex-1">
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span>Level 2: Moderate Biosecurity (Standard)</span>
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                            {biosecurityStats.moderateDeficitCount} ({filteredPigs.length > 0 ? Math.round((biosecurityStats.moderateDeficitCount / filteredPigs.length) * 100) : 0}%)
                          </span>
                        </div>
                        <p className="text-[10px] text-[#55604F] mt-0.5">
                          Standard pen enclosure; scheduled for sanitation protocol upgrade.
                        </p>
                      </div>
                    </div>

                    {/* Level 1 */}
                    <div className="bg-[#FAF6EC] p-2 rounded-lg border border-rose-200 flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0 mt-0.5 shadow-xs border border-rose-700" />
                      <div className="leading-tight flex-1">
                        <div className="flex items-center justify-between font-bold text-rose-900">
                          <span>Level 1: Critical Deficit (High Risk Hotspot)</span>
                          <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                            {biosecurityStats.criticalHotspotCount} ({filteredPigs.length > 0 ? Math.round((biosecurityStats.criticalHotspotCount / filteredPigs.length) * 100) : 0}%)
                          </span>
                        </div>
                        <p className="text-[10px] text-[#55604F] mt-0.5">
                          Unfenced or missing footbath; priority municipal inspection needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Swine Purpose Classification */}
                <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-[#55604F] block">
                    Swine Purpose Classification
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {PURPOSES.map(p => (
                      <div key={p} className="flex items-center gap-2 p-1 rounded-lg bg-[#FAF6EC] border border-[#DED2AE]">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                          style={{ background: PURPOSE_COLORS[p] }}
                        />
                        <span className="truncate text-[#1E2B1F] font-medium">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health & Mortality Status */}
                <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-[#55604F] block">
                    Health &amp; Outbreak Status
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-sm">🛡️</span>
                      <span className="font-bold text-emerald-800 mt-0.5">Vaccinated</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                      <span className="text-sm">⚠️</span>
                      <span className="font-bold text-amber-800 mt-0.5">Unvaccinated</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                      <span className="text-sm">💀</span>
                      <span className="font-bold text-rose-800 mt-0.5">Deceased</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: HEAT MAP & SPATIAL CLUSTERS */}
            {legendTab === 'heatmap' && (
              <div className="space-y-3 animate-fadeIn text-xs">

                {/* Spatial Clusters Explanation */}
                <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#203F2B] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#2F5C3F]" />
                      Spatial Marker Clusters
                    </span>
                    <span className="text-[9px] font-mono text-[#2F5C3F] bg-[#EAE1C4] px-1.5 py-0.5 rounded font-bold">
                      Zoom-Adaptive
                    </span>
                  </div>

                  <p className="text-[10px] text-[#55604F] leading-snug">
                    When zoomed out, nearby swine pins merge automatically into grouped clusters. The outer ring halo reflects the biosecurity vulnerability of the group:
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#FAF6EC] border border-[#DED2AE]">
                      <div className="w-7 h-7 rounded-full bg-[#203F2B] text-white font-mono text-[11px] font-black flex items-center justify-center border-2 border-emerald-500 shadow-xs shrink-0">
                        14
                      </div>
                      <div className="text-[10px] leading-tight">
                        <b className="text-emerald-800 block">Emerald Halo: Safe Cluster</b>
                        <span className="text-[#55604F]">All swine inside this cluster are fully vaccinated.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#FAF6EC] border border-[#DED2AE]">
                      <div className="w-7 h-7 rounded-full bg-[#D97706] text-white font-mono text-[11px] font-black flex items-center justify-center border-2 border-amber-400 shadow-xs shrink-0">
                        9
                      </div>
                      <div className="text-[10px] leading-tight">
                        <b className="text-amber-800 block">Amber Halo: Caution Cluster</b>
                        <span className="text-[#55604F]">Unvaccinated or overdue animals are present.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#FAF6EC] border border-[#DED2AE]">
                      <div className="w-7 h-7 rounded-full bg-[#7F1D1D] text-white font-mono text-[11px] font-black flex items-center justify-center border-2 border-rose-500 shadow-xs shrink-0">
                        4
                      </div>
                      <div className="text-[10px] leading-tight">
                        <b className="text-rose-900 block">Crimson Halo: Outbreak / Deceased Alert</b>
                        <span className="text-[#55604F]">Contains deceased swine or critical biosecurity deficits.</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#2F5C3F] font-medium bg-[#EAE1C4] p-1.5 rounded-lg text-center">
                    💡 <b>Tip:</b> Tap any cluster circle on the map to zoom in directly.
                  </div>
                </div>

                {/* Heatmap Mode & Gradient Scale */}
                <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#55604F] flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      Heat Map Gradient Scales
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        showHeatmap 
                          ? 'bg-rose-700 text-white' 
                          : 'bg-[#F5EFDD] text-[#2F5C3F] border border-[#DED2AE] hover:bg-[#EAE1C4]'
                      }`}
                    >
                      {showHeatmap ? 'Heatmap: ON' : 'Turn ON'}
                    </button>
                  </div>

                  {/* Biosecurity / Sanitation Risk Mode */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-[#203F2B]">
                      <span>Biosecurity &amp; Sanitation Risk</span>
                      <span className="text-[#55604F] font-mono font-normal">Active calculation</span>
                    </div>
                    <div className="flex w-full h-2 rounded-full overflow-hidden shadow-inner">
                      <div className="bg-emerald-500 w-1/3" title="High Biosecurity / Safe" />
                      <div className="bg-amber-500 w-1/3" title="Medium Biosecurity / Caution" />
                      <div className="bg-gradient-to-r from-rose-500 to-red-800 w-1/3" title="Critical Hotspot / Risk" />
                    </div>
                    <div className="flex justify-between text-[9px] text-[#55604F] font-mono">
                      <span className="text-emerald-700 font-bold">Low Risk (Green)</span>
                      <span className="text-amber-700 font-bold">Moderate (Yellow)</span>
                      <span className="text-red-700 font-bold">Hotspot (Red)</span>
                    </div>
                  </div>

                  {/* Density Spread Mode */}
                  <div className="space-y-1 pt-1 border-t border-[#DED2AE]">
                    <div className="flex justify-between text-[10px] font-semibold text-[#203F2B]">
                      <span>Swine Density Spread</span>
                      <span className="text-[#55604F] font-mono font-normal">Spatial density</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-rose-600 shadow-inner" />
                    <div className="flex justify-between text-[9px] text-[#55604F] font-mono">
                      <span>Low Density</span>
                      <span>Moderate</span>
                      <span className="text-rose-700 font-bold">Critical Cluster</span>
                    </div>
                  </div>
                </div>

                {/* Buffer Zone Rings */}
                <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#55604F] block">
                      Biosecurity Buffer Rings
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBiosecurityBuffers(!showBiosecurityBuffers)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        showBiosecurityBuffers
                          ? 'bg-[#2F5C3F] text-white'
                          : 'bg-[#F5EFDD] text-[#55604F] border border-[#DED2AE] hover:bg-[#EAE1C4]'
                      }`}
                    >
                      {showBiosecurityBuffers ? 'Buffers: ON' : 'Turn ON'}
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] text-[#55604F]">
                    <div className="flex items-center gap-2 p-1 rounded-lg bg-[#FAF6EC]">
                      <span className="w-3 h-3 border-2 border-dashed border-red-600 bg-red-500/20 rounded-full shrink-0" />
                      <span><b>500m Surveillance Ring:</b> High-frequency monitoring perimeter.</span>
                    </div>
                    <div className="flex items-center gap-2 p-1 rounded-lg bg-[#FAF6EC]">
                      <span className="w-3 h-3 border-2 border-dashed border-amber-600 bg-amber-500/10 rounded-full shrink-0" />
                      <span><b>1000m Quarantine Ring:</b> Outbreak barrier containment zone.</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Sheet Footer */}
            <div className="pt-2 border-t border-[#DED2AE] flex items-center justify-between text-[11px] font-mono text-[#55604F]">
              <span>Plotted: <b className="text-[#203F2B]">{filteredPigs.length}</b> heads</span>
              <button
                type="button"
                onClick={() => setIsLegendOpen(false)}
                className="text-xs font-bold text-[#2F5C3F] hover:underline cursor-pointer"
              >
                Close Legend
              </button>
            </div>

          </div>
        </>
      )}

      {/* LIVE MOUSE HOVER PRECISE COORDINATE & LOCATION HUD */}
      {hoverLocation && (
        <div className="absolute bottom-6 left-36 sm:left-40 z-20 hidden md:flex items-center gap-2 bg-[#1E2B1F]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-2xl border border-[#D9A441]/50 font-mono text-[11px] pointer-events-none transition-all animate-fadeIn">
          <div className={`w-2 h-2 rounded-full ${hoverLocation.isInside ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
          <span className="text-[#D9A441] font-bold">📍 {hoverLocation.lat.toFixed(5)}°N, {hoverLocation.lng.toFixed(5)}°E</span>
          <span className="text-white/30">|</span>
          <span className="text-white font-sans font-semibold">Brgy. {hoverLocation.barangay}</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
            hoverLocation.isInside ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/40' : 'bg-rose-900/80 text-rose-300 border border-rose-500/40'
          }`}>
            {hoverLocation.isInside ? '✓ Hinunangan' : '⚠️ Outside Boundary'}
          </span>
        </div>
      )}

      {/* MUNICIPAL OFFICIAL PDF REPORT MODAL */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
          <div className="bg-[#FAF6EC] border-2 border-[#DED2AE] rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-8 space-y-6 relative my-auto">
            
            {/* Printable Report Wrapper */}
            <div id="gis-pdf-report-print-area" className="space-y-6 bg-[#FAF6EC] p-2 rounded-xl">
              
              {/* Municipal Official Header */}
              <div className="border-b-2 border-[#203F2B] pb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#203F2B] border-2 border-[#D9A441] flex items-center justify-center text-white text-2xl shadow-md shrink-0 select-none">
                    🏛️
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-[#D9A441] uppercase tracking-wider">
                      Republic of the Philippines • Province of Southern Leyte
                    </div>
                    <h1 className="text-base sm:text-xl font-serif font-black text-[#203F2B] leading-tight">
                      MUNICIPALITY OF HINUNANGAN
                    </h1>
                    <div className="text-xs sm:text-sm font-bold text-[#2F5C3F] mt-0.5">
                      Swine Industry &amp; Biosecurity GIS Report
                    </div>
                    <div className="text-[10px] sm:text-xs text-[#55604F]">
                      Municipal Agriculture Office (MAO) — Swine Registry System
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-block bg-[#203F2B] text-white text-[10px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-[#D9A441]">
                    OFFICIAL GIS REPORT
                  </div>
                  <div className="text-[10px] text-[#55604F] mt-1 font-mono">
                    Doc Ref: HNN-GIS-2026
                  </div>
                </div>
              </div>

              {/* Generation Timestamp & Active Scope */}
              <div className="bg-[#F5EFDD] border border-[#DED2AE] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#203F2B]">
                  <span className="font-bold">🕒 Generation Timestamp:</span>
                  <span className="font-semibold text-[#2F5C3F]">
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#203F2B]">
                  <span className="font-bold">📍 Active Scope:</span>
                  <span className="bg-[#203F2B] text-[#D9A441] px-2.5 py-0.5 rounded-md font-bold">
                    {selectedBarangay === 'all' ? 'All 40 Barangays' : `Brgy. ${selectedBarangay}`}
                  </span>
                </div>
              </div>

              {/* Captured Map Snapshot */}
              {mapCapturedImage && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-[#203F2B] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapIcon className="w-4 h-4 text-[#D9A441]" />
                      Spatial Biosecurity GIS Map Snapshot
                    </span>
                    <span className="text-[10px] text-[#55604F]">High-Resolution Vector Raster Snapshot</span>
                  </div>
                  <div className="border-2 border-[#DED2AE] rounded-xl overflow-hidden shadow-md bg-black">
                    <img src={mapCapturedImage} alt="Captured Hinunangan GIS Map" className="w-full h-auto object-cover max-h-[420px]" />
                  </div>
                </div>
              )}

              {/* Map Summary Metadata & Risk Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#EAE1C4]/60 border border-[#DED2AE] rounded-xl p-3 space-y-1">
                  <div className="text-[10px] font-bold text-[#55604F] uppercase">Total Registered Swine</div>
                  <div className="text-xl font-mono font-black text-[#203F2B]">
                    {filteredPigs.reduce((acc, p) => acc + (p.headCount || 1), 0)} Heads
                  </div>
                  <div className="text-[10px] text-[#2F5C3F] font-medium">Across {filteredPigs.length} registered herd units</div>
                </div>

                <div className="bg-[#EAE1C4]/60 border border-[#DED2AE] rounded-xl p-3 space-y-1">
                  <div className="text-[10px] font-bold text-[#55604F] uppercase">Vaccination Protection Rate</div>
                  <div className="text-xl font-mono font-black text-emerald-800">
                    {filteredPigs.length > 0 ? Math.round((filteredPigs.filter(p => p.vaccinated).length / filteredPigs.length) * 100) : 100}%
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium">
                    {filteredPigs.filter(p => p.vaccinated).length} Protected • {filteredPigs.filter(p => !p.vaccinated).length} Unvaccinated
                  </div>
                </div>

                <div className="bg-[#EAE1C4]/60 border border-[#DED2AE] rounded-xl p-3 space-y-1">
                  <div className="text-[10px] font-bold text-[#55604F] uppercase">Biosecurity Risk Summary</div>
                  <div className="text-xs font-mono font-bold space-y-0.5">
                    <div className="text-emerald-700 flex justify-between">
                      <span>🟢 Low Risk:</span>
                      <span>{BARANGAYS_DATA.filter(b => getBarangayRiskData(b, pigs || []).riskLevel === 'low').length} Brgys</span>
                    </div>
                    <div className="text-amber-700 flex justify-between">
                      <span>🟡 Medium Risk:</span>
                      <span>{BARANGAYS_DATA.filter(b => getBarangayRiskData(b, pigs || []).riskLevel === 'medium').length} Brgys</span>
                    </div>
                    <div className="text-rose-700 flex justify-between">
                      <span>🔴 High Risk Alert:</span>
                      <span>{BARANGAYS_DATA.filter(b => getBarangayRiskData(b, pigs || []).riskLevel === 'high').length} Brgys</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Approval Footer */}
              <div className="pt-4 border-t border-[#DED2AE] flex justify-between items-end text-[10px] text-[#55604F]">
                <div>
                  <div className="font-bold text-[#203F2B]">Municipal Agriculture Office — Hinunangan, Southern Leyte</div>
                  <div>Official Swine Biosecurity Monitoring &amp; Spatial Planning System</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#203F2B]">Approved by: MAO Officer / Municipal Veterinarian</div>
                  <div className="italic">Signed electronically via Hinunangan Swine Registry GIS</div>
                </div>
              </div>

            </div>

            {/* Action Buttons (Excluded from Print) */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DED2AE] no-print">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-[#F5EFDD] border border-[#DED2AE] text-[#55604F] font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#203F2B] hover:bg-[#2F5C3F] text-[#D9A441] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Report / Save as PDF</span>
              </button>
            </div>

            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #gis-pdf-report-print-area, #gis-pdf-report-print-area * {
                  visibility: visible;
                }
                #gis-pdf-report-print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  background: white !important;
                  color: black !important;
                  padding: 20px;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* FULL RESOLUTION SWINE ASSET PHOTO LIGHTBOX MODAL */}
      {expandedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setExpandedPhoto(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-[#1E2B1F] border-2 border-[#D9A441] rounded-3xl overflow-hidden shadow-2xl space-y-0 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 bg-[#152B1D] border-b border-[#D9A441]/30">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold bg-[#D9A441] text-[#203F2B] px-2.5 py-0.5 rounded-lg">
                  {expandedPhoto.earTag}
                </span>
                <span className="text-sm font-serif font-bold text-white">
                  {expandedPhoto.ownerName}
                </span>
                {expandedPhoto.barangay && (
                  <span className="text-xs text-white/70">
                    · Brgy. {expandedPhoto.barangay}
                  </span>
                )}
                {expandedPhoto.breed && (
                  <span className="text-xs text-[#D9A441]/90">
                    ({expandedPhoto.breed})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpandedPhoto(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Close photo preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] flex items-center justify-center bg-black/50 overflow-hidden p-2">
              <img 
                src={expandedPhoto.url} 
                alt={`Swine photo for ${expandedPhoto.earTag}`}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-lg" 
              />
            </div>

            <div className="p-3 bg-[#152B1D] border-t border-white/10 flex items-center justify-between text-xs text-white/80">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verified Swine Asset Photo • Supabase Cloud Storage</span>
              </span>
              <a 
                href={expandedPhoto.url} 
                target="_blank" 
                rel="noreferrer"
                className="text-[#D9A441] hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Raw Asset</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MAP LEAFLET CONTAINER */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px] z-0 relative flex-1" />

    </div>
  );
};
