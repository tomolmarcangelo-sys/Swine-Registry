import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as L from 'leaflet';
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
  Ruler, 
  Info, 
  X, 
  Maximize2, 
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
  AlertTriangle
} from 'lucide-react';
import { 
  BARANGAYS_DATA, 
  BARANGAY_COORDS_MAP, 
  HINUNANGAN_CENTER, 
  HINUNANGAN_BOUNDS,
  HINUNANGAN_LEAFLET_MAX_BOUNDS,
  HINUNANGAN_MUNICIPAL_BOUNDARY,
  PURPOSES, 
  PURPOSE_COLORS,
  formatCoordinatesFull,
  formatDistance,
  calculateDistanceMeters,
  getClosestBarangay
} from '../data/constants';
import { GeolocationHookReturn } from '../hooks/useGeolocation';
import { BiosecurityAssessment, MapTileLayer, PigRecord, PurposeType, User } from '../types';

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

// Biosecurity Scoring and Deficit Calculator
export function evaluatePigBiosecurity(pig: PigRecord): PigBiosecurityEvaluation {
  const bio = pig.biosecurity;
  if (!bio) {
    const baseScore = pig.asfCleared && pig.vaccinated ? 5 : (pig.asfCleared ? 3 : 1);
    const deficit = 7 - baseScore;
    const isCritical = baseScore <= 3;
    return {
      score: baseScore,
      maxScore: 7,
      percentage: Math.round((baseScore / 7) * 100),
      deficit,
      riskLevel: isCritical ? 'critical' : baseScore <= 5 ? 'moderate' : 'compliant',
      riskWeight: isCritical ? 2.2 : (baseScore <= 5 ? 1.0 : 0.15),
      isCriticalHotspot: isCritical,
      isSwillViolation: false,
      missingPractices: ['Unassessed Baseline Status']
    };
  }

  const missing: string[] = [];
  let score = 0;

  if (bio.footbathMaintenance) score++; else missing.push('No Disinfectant Footbath');
  if (bio.fencingIntegrity) score++; else missing.push('Compromised Perimeter Fence');
  if (bio.swillFeedingBanned) score++; else missing.push('Swill Feeding Violation (Severe ASF Risk)');
  if (bio.disinfectionRoutine) score++; else missing.push('No Regular Pen Disinfection');
  if (bio.visitorLogControl) score++; else missing.push('Uncontrolled Visitor Access');
  if (bio.quarantineIsolationPen) score++; else missing.push('No Isolation / Quarantine Pen');
  if (bio.cleanWaterSource) score++; else missing.push('Unprotected Water Source');

  const deficit = 7 - score;
  const percentage = Math.round((score / 7) * 100);
  const isSwillViolation = !bio.swillFeedingBanned;
  const isCriticalHotspot = score <= 3 || isSwillViolation;

  // Thermal weight formula:
  // Deficit scaled by 0.45, plus severe weight for non-negotiable DA ASF rules (swill ban & footbath)
  let riskWeight = deficit * 0.45;
  if (isSwillViolation) riskWeight += 1.4; // Swill feeding is primary driver of African Swine Fever
  if (!bio.footbathMaintenance) riskWeight += 0.5;
  if (!bio.disinfectionRoutine) riskWeight += 0.5;
  if (!pig.vaccinated) riskWeight += 0.4;

  if (score >= 6 && !isSwillViolation) {
    riskWeight = 0.05; // Compliant farms produce negligible sanitation heat
  }

  const riskLevel: 'critical' | 'moderate' | 'compliant' = 
    isCriticalHotspot ? 'critical' : (score <= 5 ? 'moderate' : 'compliant');

  return {
    score,
    maxScore: 7,
    percentage,
    deficit,
    riskLevel,
    riskWeight: Math.max(0.05, riskWeight),
    isCriticalHotspot,
    isSwillViolation,
    missingPractices: missing
  };
}

interface GisMapProps {
  pigs: PigRecord[];
  currentUser: User;
  onOpenAddModalWithCoords: (coords: { lat: number; lng: number; barangay?: string }) => void;
  onEditPig: (pig: PigRecord) => void;
  geo?: GeolocationHookReturn;
  focusPigId?: string | null;
}

const TILE_CONFIG: Record<MapTileLayer, { name: string; url: string; attribution: string; maxZoom: number }> = {
  standard: {
    name: 'OpenStreetMap (Streets)',
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
  terrain: {
    name: 'OpenTopo (Terrain / Elevation)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors',
    maxZoom: 17
  },
  topo: {
    name: 'CartoDB Voyager (Clean)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    maxZoom: 19
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
  focusPigId
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  // Layer Groups
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const barangaysLayerRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const bufferLayerRef = useRef<L.LayerGroup | null>(null);
  const measureLayerRef = useRef<L.LayerGroup | null>(null);
  const newPinMarkerRef = useRef<L.Marker | null>(null);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);
  const userGpsCircleRef = useRef<L.Circle | null>(null);
  const canvasHeatmapLayerRef = useRef<L.Layer | null>(null);

  // States
  const [activeTile, setActiveTile] = useState<MapTileLayer>('satellite');
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

  // Measure Mode
  const [isMeasureMode, setIsMeasureMode] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [measureDistance, setMeasureDistance] = useState<number | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [selectedHealth, setSelectedHealth] = useState<'all' | 'vax' | 'unvax'>('all');

  // Selected Pin / Detail Card
  const [selectedPig, setSelectedPig] = useState<PigRecord | null>(null);

  // UI Panels
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(true);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState<boolean>(false);
  const [gpsLocating, setGpsLocating] = useState<boolean>(false);

  const isAdmin = currentUser.role === 'admin';

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

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [HINUNANGAN_CENTER.lat, HINUNANGAN_CENTER.lng],
      zoom: HINUNANGAN_CENTER.zoom,
      minZoom: 12,
      maxZoom: 19,
      maxBounds: HINUNANGAN_LEAFLET_MAX_BOUNDS,
      maxBoundsViscosity: 1.0,
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

    // Layer Groups
    markersLayerRef.current = L.layerGroup().addTo(map);
    barangaysLayerRef.current = L.layerGroup().addTo(map);
    boundaryLayerRef.current = L.layerGroup().addTo(map);
    bufferLayerRef.current = L.layerGroup().addTo(map);
    measureLayerRef.current = L.layerGroup().addTo(map);

    // Map Click Listener
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Measure tool click
      if (isMeasureMode) {
        setMeasurePoints(prev => {
          const next = [...prev, { lat, lng }];
          if (next.length >= 2) {
            const d = calculateDistanceMeters(next[0].lat, next[0].lng, next[1].lat, next[1].lng);
            setMeasureDistance(d);
          }
          return next.slice(-2); // keep max 2 points
        });
        return;
      }

      // Drop pin mode or normal map click to set new swine location
      const closest = getClosestBarangay(lat, lng);
      setPinnedLocation({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        barangay: closest.barangay.name
      });
      setSelectedPig(null);
    });

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
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

  // Update Pig Markers (Toggleable pins for clean Heatmap viewing)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // If pins are toggled off (e.g. to easily view heatmap gradient colors), don't draw markers
    if (!showSwinePins) return;

    filteredPigs.forEach(pig => {
      const color = PURPOSE_COLORS[pig.purpose] || '#2F5C3F';
      const isVaccinated = pig.vaccinated;

      const markerHtml = `
        <div class="group cursor-pointer hover:scale-110" style="position: relative; display: flex; flex-direction: column; align-items: center; transition: transform 0.2s ease;">
          <div style="
            width: 26px; 
            height: 26px; 
            border-radius: 50%; 
            background: ${color}; 
            border: 2px solid white; 
            box-shadow: 0 3px 8px rgba(0,0,0,0.4); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 11px;
            font-weight: bold;
          ">
            ${isVaccinated ? '🛡️' : '⚠️'}
          </div>
          <div style="width: 2px; height: 6px; background: #203F2B;"></div>
          <div style="width: 6px; height: 3px; border-radius: 50%; background: rgba(0,0,0,0.35);"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-pig-pin',
        html: markerHtml,
        iconSize: [26, 36],
        iconAnchor: [13, 36]
      });

      const marker = L.marker([pig.lat, pig.lng], { icon: customIcon });

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
    });
  }, [filteredPigs, showSwinePins]);

  // Update Hinunangan Municipal Boundary Layer (Exclusive Domain)
  useEffect(() => {
    if (!mapInstanceRef.current || !boundaryLayerRef.current) return;

    boundaryLayerRef.current.clearLayers();

    if (!showBoundary) return;

    // Draw main municipal boundary polygon of Hinunangan
    const boundaryPolygon = L.polygon(HINUNANGAN_MUNICIPAL_BOUNDARY, {
      color: '#2F5C3F',
      weight: 2.5,
      dashArray: '8, 6',
      fillColor: '#2F5C3F',
      fillOpacity: 0.03
    });

    boundaryPolygon.bindTooltip('Municipality of Hinunangan (Official Boundary • 40 Barangays)', {
      sticky: true,
      className: 'font-sans font-bold text-xs'
    });

    boundaryLayerRef.current.addLayer(boundaryPolygon);

    // San Pedro Island (Pong Dako) Territorial Ring
    const sanPedro = L.circle([10.4620, 125.2230], {
      radius: 950,
      color: '#D9A441',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#D9A441',
      fillOpacity: 0.06
    }).bindTooltip('San Pedro Island (Pong Dako)', { sticky: true });

    // San Pablo Island (Pong Gamay) Territorial Ring
    const sanPablo = L.circle([10.4295, 125.2235], {
      radius: 800,
      color: '#D9A441',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#D9A441',
      fillOpacity: 0.06
    }).bindTooltip('San Pablo Island (Pong Gamay)', { sticky: true });

    boundaryLayerRef.current.addLayer(sanPedro);
    boundaryLayerRef.current.addLayer(sanPablo);
  }, [showBoundary]);

  // Update Barangay Center Nodes (Show only when searching or selecting barangays)
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
      const brgyIcon = L.divIcon({
        className: 'custom-brgy-node',
        html: `
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: #203F2B;
            border: 2px solid #D9A441;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-family: 'Fraunces', serif;
            font-weight: 700;
            color: #FFFFFF;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            white-space: nowrap;
            cursor: pointer;
            animation: pulse 1.5s infinite;
          ">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${b.isCoastal ? '#60A5FA' : '#34D399'};"></span>
            <span>Brgy. ${b.name}</span>
          </div>
        `,
        iconSize: [110, 24],
        iconAnchor: [55, 12]
      });

      const marker = L.marker([b.lat, b.lng], { icon: brgyIcon });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedBarangay(b.name);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([b.lat, b.lng], 16);
        }
      });

      barangaysLayerRef.current?.addLayer(marker);
    });
  }, [showBarangayNodes, selectedBarangay, searchQuery]);

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
        const closest = getClosestBarangay(pos.lat, pos.lng);
        setPinnedLocation({
          lat: Number(pos.lat.toFixed(6)),
          lng: Number(pos.lng.toFixed(6)),
          barangay: closest.barangay.name
        });
      });

      newPinMarkerRef.current = pinMarker;
    }
  }, [pinnedLocation]);

  // Update Measure Tool Layers
  useEffect(() => {
    if (!mapInstanceRef.current || !measureLayerRef.current) return;

    measureLayerRef.current.clearLayers();

    if (isMeasureMode && measurePoints.length > 0) {
      measurePoints.forEach((pt, idx) => {
        const ptMarker = L.circleMarker([pt.lat, pt.lng], {
          radius: 6,
          color: '#203F2B',
          fillColor: '#D9A441',
          fillOpacity: 1,
          weight: 2
        });
        measureLayerRef.current?.addLayer(ptMarker);
      });

      if (measurePoints.length === 2) {
        const polyline = L.polyline(
          [
            [measurePoints[0].lat, measurePoints[0].lng],
            [measurePoints[1].lat, measurePoints[1].lng]
          ],
          {
            color: '#D9A441',
            weight: 3,
            dashArray: '6, 6'
          }
        );
        measureLayerRef.current?.addLayer(polyline);
      }
    }
  }, [isMeasureMode, measurePoints]);

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
        if (!map || !canvas) return;

        const topLeft = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(canvas, topLeft);

        const size = map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;

        this._draw();
      },

      _draw: function () {
        const map = this._map;
        const canvas = this._canvas;
        if (!map || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Pre-render Gaussian radial gradient brush
        const radius = heatmapRadius;
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
          ctx.drawImage(blurCanvas, pt.x - radius, pt.y - radius);
        });

        // Colorize canvas using municipal biosecurity gradient (Blue -> Emerald -> Gold -> Red)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Gradient lookup palette
        const palette = createHeatmapPalette();

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
  }, [showHeatmap, filteredPigs, heatmapRadius, heatmapIntensity]);

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
    const target = pigs.find(p => p.id === focusPigId);
    if (target) {
      setSelectedPig(target);
      mapInstanceRef.current.flyTo([target.lat, target.lng], 16, { duration: 1.2 });
    }
  }, [focusPigId, pigs]);

  // Center on Hinunangan & Reset All Filters
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([HINUNANGAN_CENTER.lat, HINUNANGAN_CENTER.lng], HINUNANGAN_CENTER.zoom);
      setSelectedPig(null);
      setPinnedLocation(null);
    }
  };

  // Reset Barangay Isolation to show all 40 barangays & all labels
  const handleResetAllBarangays = () => {
    setSelectedBarangay('all');
    setShowBarangayNodes(true);
    setSearchQuery('');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([HINUNANGAN_CENTER.lat, HINUNANGAN_CENTER.lng], HINUNANGAN_CENTER.zoom);
      setSelectedPig(null);
    }
  };

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
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[580px] bg-[#EAE1C4] rounded-2xl overflow-hidden border border-[#DED2AE] shadow-lg flex flex-col">
      
      {/* TOP FLOATING GIS TOOLBAR */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: Quick Search & Barangay Filter */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#F5EFDD]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#DED2AE] shadow-md">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#55604F] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ear tag, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white border border-[#DED2AE] rounded-lg text-xs text-[#1E2B1F] focus:border-[#2F5C3F] outline-none w-44 sm:w-56"
            />
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
            className="bg-white border border-[#DED2AE] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#203F2B] outline-none cursor-pointer"
          >
            <option value="all">All 40 Barangays</option>
            {BARANGAYS_DATA.map(b => (
              <option key={b.name} value={b.name}>{b.name} ({b.isCoastal ? 'Coastal' : 'Inland'})</option>
            ))}
          </select>

          {/* Refresh / Show All Labels Button */}
          <button
            onClick={handleResetAllBarangays}
            className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              selectedBarangay !== 'all'
                ? 'bg-[#D9A441] text-[#203F2B] border-[#B9852A] shadow-xs animate-pulse'
                : 'bg-white text-[#2F5C3F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title="Refresh Map & Show All 40 Barangay Labels"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#203F2B]" />
            <span className="text-[11px] font-bold">Show All Labels</span>
          </button>

          {/* Filter Toggle */}
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${isFilterPanelOpen ? 'bg-[#2F5C3F] text-white border-[#203F2B]' : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'}`}
            title="Filter by Purpose & Vaccination"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Right: Map Modes & Quick Actions */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#F5EFDD]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#DED2AE] shadow-md">
          
          {/* Hinunangan Exclusive Scope Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-[#2F5C3F] bg-[#EAE1C4] px-2 py-1 rounded-lg border border-[#DED2AE]" title="GIS map locked exclusively to Hinunangan (40 Barangays)">
            <Lock className="w-3 h-3 text-[#D9A441]" />
            <span className="font-bold">Hinunangan Only</span>
          </div>

          {/* Add Swine Pin Mode Button */}
          <button
            onClick={() => {
              setIsPinModeActive(!isPinModeActive);
              if (!isPinModeActive && !pinnedLocation) {
                // Drop pin at map center
                if (mapInstanceRef.current) {
                  const center = mapInstanceRef.current.getCenter();
                  const closest = getClosestBarangay(center.lat, center.lng);
                  setPinnedLocation({
                    lat: Number(center.lat.toFixed(6)),
                    lng: Number(center.lng.toFixed(6)),
                    barangay: closest.barangay.name
                  });
                }
              }
            }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
              pinnedLocation || isPinModeActive
                ? 'bg-[#2F5C3F] text-[#D9A441] border border-[#D9A441] ring-2 ring-[#D9A441]/40'
                : 'bg-[#2F5C3F] text-white hover:bg-[#203F2B]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{pinnedLocation ? 'Pin Placed' : 'Pin New Swine'}</span>
          </button>

          {/* Heatmap Toggle Button (Turns on or off with color grading visual indicator) */}
          <button
            onClick={() => {
              if (showHeatmap) {
                // Turn off heatmap
                setShowHeatmap(false);
                setShowSwinePins(true);
                setShowBarangayNodes(true);
              } else {
                // Turn on heatmap and show toolbar
                setShowHeatmap(true);
                setShowHeatmapToolbar(true);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              showHeatmap 
                ? 'bg-rose-700 text-white border-rose-800 shadow-md ring-2 ring-rose-400/40' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title={showHeatmap ? "Heatmap is Active - Click to Turn Off Heatmap" : "Click to Enable Swine Density Heatmap"}
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-amber-300 animate-pulse' : 'text-rose-600'}`} />
            <span className="font-semibold">{showHeatmap ? 'Heatmap ON' : 'Heatmap'}</span>
            {showHeatmap && (
              <span className="hidden md:inline-flex w-7 h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-yellow-400 to-rose-600 ml-0.5 border border-white/40" />
            )}
          </button>

          {/* Re-open Heatmap Controls if user dismissed the floating bar while keeping Heatmap ON */}
          {showHeatmap && !showHeatmapToolbar && (
            <button
              onClick={() => setShowHeatmapToolbar(true)}
              className="px-2 py-1.5 bg-[#203F2B] text-[#D9A441] border border-[#D9A441] hover:bg-[#2F5C3F] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              title="Show Heatmap Floating Controls & Grading"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Controls</span>
            </button>
          )}

          {/* Dedicated Swine Pins Toggle Icon (Quick toggle especially when in Heatmap mode) */}
          <button
            onClick={() => setShowSwinePins(prev => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              !showSwinePins 
                ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300/60' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title={showSwinePins ? "Hide Swine Pin Markers (View Clean Heatmap Colors)" : "Show Swine Pin Markers"}
          >
            {!showSwinePins ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-[#2F5C3F]" />}
            <span className="hidden md:inline text-[11px]">{showSwinePins ? 'Pins ON' : 'Pins Hidden'}</span>
          </button>

          {/* Quick Barangay Labels Toggle */}
          <button
            onClick={() => setShowBarangayNodes(prev => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              !showBarangayNodes 
                ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300/60' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title={showBarangayNodes ? "Hide Barangay Labels (View Clean Map / Heatmap)" : "Show Barangay Labels"}
          >
            <Tag className={`w-3.5 h-3.5 ${!showBarangayNodes ? 'text-amber-700' : 'text-[#2F5C3F]'}`} />
            <span className="hidden lg:inline text-[11px]">{showBarangayNodes ? 'Brgy. Labels ON' : 'Brgy. Labels Hidden'}</span>
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

          {/* Measure Distance Tool */}
          <button
            onClick={() => {
              setIsMeasureMode(!isMeasureMode);
              setMeasurePoints([]);
              setMeasureDistance(null);
            }}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
              isMeasureMode 
                ? 'bg-[#D9A441] text-[#203F2B] border-[#B9852A]' 
                : 'bg-white text-[#55604F] border-[#DED2AE] hover:bg-[#FBF8EF]'
            }`}
            title="Measure Distance between points"
          >
            <Ruler className="w-3.5 h-3.5" />
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
            className="p-1.5 bg-white hover:bg-[#FBF8EF] text-[#55604F] border border-[#DED2AE] rounded-lg text-xs transition-colors cursor-pointer"
            title="Reset to Hinunangan Center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FLOATING HEATMAP TOOLBAR & PIN/LABEL TOGGLE BAR (When Heatmap is Active) */}
      {showHeatmap && showHeatmapToolbar && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#203F2B]/95 backdrop-blur-md text-white px-3 sm:px-4 py-2 rounded-2xl shadow-2xl border border-[#D9A441] flex flex-wrap items-center gap-2 sm:gap-3 font-sans max-w-[95vw]">
          <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#D9A441] pr-2 border-r border-white/20">
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="hidden sm:inline">Swine Density Heatmap</span>
            <span className="sm:hidden">Heatmap</span>
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
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-black/25 rounded-xl border border-white/10 text-[10px]">
            <span className="text-[#D9A441] font-mono font-bold">Grading:</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-blue-200">Low</span>
              <div className="w-16 h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-yellow-400 to-rose-600 border border-white/30" />
              <span className="text-[9px] text-rose-300 font-bold">High</span>
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

      {/* FILTER PANEL POPUP */}
      {isFilterPanelOpen && (
        <div className="absolute top-16 left-3 z-30 bg-[#F5EFDD] border border-[#DED2AE] rounded-2xl p-4 shadow-xl w-80 space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-[#DED2AE] pb-2">
            <span className="font-serif font-bold text-sm text-[#203F2B] flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#2F5C3F]" />
              Filter Map Records
            </span>
            <button onClick={() => setIsFilterPanelOpen(false)} className="text-[#55604F] hover:text-black">
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
      )}

      {/* LAYERS & HEATMAP CONTROL PANEL */}
      {isLayersPanelOpen && (
        <div className="absolute top-16 right-3 z-30 bg-[#F5EFDD] border border-[#DED2AE] rounded-2xl p-4 shadow-xl w-80 space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-[#DED2AE] pb-2">
            <span className="font-serif font-bold text-sm text-[#203F2B] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#2F5C3F]" />
              Base Maps &amp; Overlays
            </span>
            <button onClick={() => setIsLayersPanelOpen(false)} className="text-[#55604F] hover:text-black">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Base Tile Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#55604F] mb-1.5">
              Base Map Layer
            </label>
            <div className="space-y-1">
              {(Object.keys(TILE_CONFIG) as MapTileLayer[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTile(key)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between border ${
                    activeTile === key 
                      ? 'bg-[#2F5C3F] text-white border-[#203F2B]' 
                      : 'bg-white text-[#1E2B1F] border-[#DED2AE] hover:bg-[#FBF8EF]'
                  }`}
                >
                  <span>{TILE_CONFIG[key].name}</span>
                  {activeTile === key && <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Overlay Toggles */}
          <div className="pt-2 border-t border-[#DED2AE] space-y-2">
            <label className="block text-[11px] font-bold uppercase text-[#55604F]">
              Vector Overlays &amp; Visibility
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
                className="w-4 h-4 accent-[#2F5C3F]"
              />
            </label>

            <label className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#DED2AE] text-xs cursor-pointer">
              <span className="font-semibold text-[#1E2B1F] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>Hinunangan Municipal Boundary</span>
              </span>
              <input
                type="checkbox"
                checked={showBoundary}
                onChange={(e) => setShowBoundary(e.target.checked)}
                className="w-4 h-4 accent-[#2F5C3F]"
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
                className="w-4 h-4 accent-[#2F5C3F]"
              />
            </label>

            <label className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#DED2AE] text-xs cursor-pointer">
              <span className="font-semibold text-[#1E2B1F]">Biosecurity Buffer Zones</span>
              <input
                type="checkbox"
                checked={showBiosecurityBuffers}
                onChange={(e) => setShowBiosecurityBuffers(e.target.checked)}
                className="w-4 h-4 accent-[#2F5C3F]"
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
                className="w-full accent-[#2F5C3F]"
              />
            </div>
          )}

          {/* GeoJSON Export */}
          <div className="pt-2 border-t border-[#DED2AE]">
            <button
              onClick={handleExportGeoJson}
              className="w-full py-2 bg-white hover:bg-[#FBF8EF] text-[#203F2B] border border-[#DED2AE] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#2F5C3F]" />
              <span>Export GIS Data (.GeoJSON)</span>
            </button>
          </div>
        </div>
      )}

      {/* MEASURE TOOL POPUP BANNER */}
      {isMeasureMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#203F2B] text-white px-4 py-2 rounded-2xl shadow-xl border border-[#D9A441] flex items-center gap-3 text-xs font-mono">
          <Ruler className="w-4 h-4 text-[#D9A441]" />
          <span>
            {measurePoints.length === 0 && 'Click first point on map'}
            {measurePoints.length === 1 && 'Click second point to measure distance'}
            {measurePoints.length === 2 && measureDistance !== null && (
              <>
                Distance: <b className="text-[#D9A441] text-sm">{formatDistance(measureDistance)}</b>
              </>
            )}
          </span>
          <button
            onClick={() => {
              setIsMeasureMode(false);
              setMeasurePoints([]);
              setMeasureDistance(null);
            }}
            className="ml-2 text-white/70 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PIN LOCATION ACTION CARD (When user drops a pin on map) */}
      {pinnedLocation && !selectedPig && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-30 bg-[#F5EFDD] border-2 border-[#D9A441] rounded-2xl p-4 shadow-2xl sm:w-96 font-sans">
          <div className="flex items-start justify-between gap-2 mb-2">
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
              className="text-[#55604F] hover:text-black p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-[#DED2AE] text-xs font-mono space-y-1 mb-3">
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
              className="flex-1 py-2.5 bg-[#2F5C3F] hover:bg-[#203F2B] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D9A441]" />
              <span>Register Swine at this Location</span>
            </button>

            <button
              onClick={() => setPinnedLocation(null)}
              className="px-3 py-2.5 bg-white hover:bg-[#FBF8EF] text-[#55604F] border border-[#DED2AE] rounded-xl font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SELECTED PIG DETAIL CARD */}
      {selectedPig && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-30 bg-[#F5EFDD] border border-[#DED2AE] rounded-2xl p-4 shadow-2xl sm:w-96 font-sans space-y-3">
          <div className="flex items-start justify-between gap-2 border-b border-[#DED2AE] pb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-[#2F5C3F] bg-[#EAE1C4] px-2 py-0.5 rounded">
                  {selectedPig.earTag}
                </span>
                <span className="text-xs text-[#55604F]">· {selectedPig.breed}</span>
              </div>
              <h4 className="font-serif font-bold text-lg text-[#203F2B] mt-0.5">
                {selectedPig.ownerName}
              </h4>
            </div>

            <button
              onClick={() => setSelectedPig(null)}
              className="text-[#55604F] hover:text-black p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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
              <span className={`font-bold inline-flex items-center gap-1 ${selectedPig.vaccinated ? 'text-emerald-700' : 'text-rose-700'}`}>
                {selectedPig.vaccinated ? '🛡️ Vaccinated' : '⚠️ Pending Vax'}
              </span>
            </div>
          </div>

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

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onEditPig(selectedPig)}
              className="flex-1 py-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Edit Record</span>
            </button>
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([selectedPig.lat, selectedPig.lng], 18);
                }
              }}
              className="px-3 py-2 bg-white hover:bg-[#FBF8EF] text-[#203F2B] border border-[#DED2AE] font-bold rounded-xl text-xs"
            >
              Zoom In
            </button>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE MAP LEGEND (COLLAPSIBLE) */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#F5EFDD]/95 backdrop-blur-md border border-[#DED2AE] rounded-2xl shadow-xl font-sans overflow-hidden max-w-[280px] sm:max-w-xs transition-all">
        <div 
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="flex items-center justify-between px-3 py-2 bg-[#203F2B] text-white cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <MapIcon className="w-3.5 h-3.5 text-[#D9A441]" />
            <span className="font-serif font-bold text-xs tracking-wide">GIS Map Legend</span>
          </div>
          {isLegendOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </div>

        {isLegendOpen && (
          <div className="p-3 space-y-2.5 text-xs">
            {/* Purpose Categories */}
            <div>
              <span className="text-[10px] font-bold uppercase text-[#55604F] block mb-1.5">
                Swine Classification
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {PURPOSES.map(p => (
                  <div key={p} className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ background: PURPOSE_COLORS[p] }}
                    />
                    <span className="truncate text-[#1E2B1F]">{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Health & Pin status */}
            <div className="pt-2 border-t border-[#DED2AE] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1">
                <span>🛡️</span>
                <span className="text-[#1E2B1F]">Vaccinated</span>
              </div>
              <div className="flex items-center gap-1">
                <span>⚠️</span>
                <span className="text-rose-700 font-semibold">Unvaccinated</span>
              </div>
            </div>

            {/* Heatmap scale if active */}
            {showHeatmap && (
              <div className="pt-2 border-t border-[#DED2AE] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#55604F] block">
                    Heatmap Density Scale
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowBarangayNodes(prev => !prev)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer transition-colors ${
                        !showBarangayNodes
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#F5EFDD] text-[#55604F] hover:bg-[#EAE1C4]'
                      }`}
                      title={showBarangayNodes ? "Hide Barangay Labels for clean heatmap" : "Show Barangay Labels"}
                    >
                      {!showBarangayNodes ? 'Labels: OFF' : 'Labels: ON'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSwinePins(prev => !prev)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer transition-colors ${
                        !showSwinePins
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#F5EFDD] text-[#55604F] hover:bg-[#EAE1C4]'
                      }`}
                      title={showSwinePins ? "Hide Swine Pins for clean heatmap" : "Show Swine Pins"}
                    >
                      {!showSwinePins ? 'Pins: OFF' : 'Pins: ON'}
                    </button>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-rose-600" />
                <div className="flex justify-between text-[9px] text-[#55604F] font-mono">
                  <span>Low Density</span>
                  <span>Moderate</span>
                  <span>Critical Cluster</span>
                </div>
              </div>
            )}

            {/* Buffer zone info */}
            {showBiosecurityBuffers && (
              <div className="pt-2 border-t border-[#DED2AE] text-[10px] text-[#55604F] space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 border border-dashed border-red-600 bg-red-500/20 rounded-full" />
                  <span>500m Surveillance Zone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 border border-dashed border-amber-600 bg-amber-500/10 rounded-full" />
                  <span>1000m Quarantine Ring</span>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="pt-1.5 border-t border-[#DED2AE] flex items-center justify-between text-[10px] font-mono text-[#55604F]">
              <span>Plotted: <b>{filteredPigs.length}</b> heads</span>
              <span>40 Barangays</span>
            </div>
          </div>
        )}
      </div>

      {/* MAP LEAFLET CONTAINER */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

    </div>
  );
};
