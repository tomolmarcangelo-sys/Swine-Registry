import React, { useEffect, useRef, useState } from 'react';
import '../services/leafletInit';
import * as L from 'leaflet';
import { 
  MapPin, 
  Crosshair, 
  Layers, 
  Navigation, 
  Check, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  BARANGAY_COORDS_MAP, 
  getClosestBarangay, 
  HINUNANGAN_LEAFLET_MAX_BOUNDS,
  HINUNANGAN_MUNICIPAL_BOUNDARY,
  SAN_PEDRO_ISLAND_BOUNDARY,
  SAN_PABLO_ISLAND_BOUNDARY,
  isWithinHinunanganBoundary
} from '../data/constants';
import { GeolocationHookReturn } from '../hooks/useGeolocation';

interface GisFormMapProps {
  lat: number;
  lng: number;
  accuracy?: number;
  barangay: string;
  onChangeCoordinates: (coords: { lat: number; lng: number; accuracy?: number; altitude?: number }) => void;
  geo?: GeolocationHookReturn;
  onSyncBarangay?: (brgy: string) => void;
}

const TILE_SERVERS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; World Imagery'
  }
};

export const GisFormMap: React.FC<GisFormMapProps> = ({
  lat,
  lng,
  accuracy = 5,
  barangay,
  onChangeCoordinates,
  geo,
  onSyncBarangay
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);

  const [tileMode, setTileMode] = useState<'standard' | 'satellite'>('standard');
  const [gpsLocating, setGpsLocating] = useState(false);
  const [detectedBrgy, setDetectedBrgy] = useState<string>('');
  const [boundaryWarning, setBoundaryWarning] = useState<string | null>(null);

  // Update closest barangay
  useEffect(() => {
    if (lat && lng) {
      const closest = getClosestBarangay(lat, lng);
      setDetectedBrgy(closest.barangay.name);
    }
  }, [lat, lng]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = lat || 10.4025;
    const initialLng = lng || 125.2015;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      minZoom: 12,
      maxZoom: 19,
      maxBounds: HINUNANGAN_LEAFLET_MAX_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tile = L.tileLayer(TILE_SERVERS[tileMode].url, {
      attribution: TILE_SERVERS[tileMode].attribution,
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = tile;

    // Custom Pig Location Pin Icon
    const customIcon = L.divIcon({
      className: 'custom-gis-picker-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #2F5C3F; border: 3px solid #D9A441; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); color: white; font-weight: bold; font-size: 14px;">
            📍
          </div>
          <div style="width: 2px; height: 10px; background: #203F2B;"></div>
          <div style="width: 10px; height: 4px; border-radius: 50%; background: rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [32, 46],
      iconAnchor: [16, 46]
    });

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: customIcon
    }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([initialLat, initialLng], {
      radius: accuracy || 5,
      color: '#2F5C3F',
      fillColor: '#2F5C3F',
      fillOpacity: 0.15,
      weight: 1.5,
      dashArray: '4, 4'
    }).addTo(map);
    circleRef.current = circle;

    // Hinunangan Municipal Boundary Polygon Overlay
    const boundaryGroup = L.layerGroup().addTo(map);
    const boundaryPolygon = L.polygon(HINUNANGAN_MUNICIPAL_BOUNDARY, {
      color: '#1E3F2B',
      weight: 2,
      dashArray: '6, 4',
      fillColor: '#2F5C3F',
      fillOpacity: 0.03
    });
    boundaryGroup.addLayer(boundaryPolygon);

    const sanPedro = L.polygon(SAN_PEDRO_ISLAND_BOUNDARY, {
      color: '#D9A441',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#D9A441',
      fillOpacity: 0.06
    });
    const sanPablo = L.polygon(SAN_PABLO_ISLAND_BOUNDARY, {
      color: '#D9A441',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#D9A441',
      fillOpacity: 0.06
    });
    boundaryGroup.addLayer(sanPedro);
    boundaryGroup.addLayer(sanPablo);
    boundaryLayerRef.current = boundaryGroup;

    // Drag events
    marker.on('drag', (e) => {
      const pos = (e.target as L.Marker).getLatLng();
      circle.setLatLng(pos);
    });

    marker.on('dragend', (e) => {
      const pos = (e.target as L.Marker).getLatLng();
      const validation = isWithinHinunanganBoundary(pos.lat, pos.lng);
      if (!validation.isInside) {
        setBoundaryWarning('Swine registrations are restricted to Hinunangan municipality boundaries.');
        // Revert to previous valid lat/lng
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        setTimeout(() => setBoundaryWarning(null), 4000);
        return;
      }
      setBoundaryWarning(null);
      circle.setLatLng(pos);
      onChangeCoordinates({
        lat: Number(pos.lat.toFixed(6)),
        lng: Number(pos.lng.toFixed(6)),
        accuracy: 3.0
      });
      if (validation.barangay && onSyncBarangay && validation.barangay !== barangay) {
        onSyncBarangay(validation.barangay);
      }
    });

    // Map click reposition
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      const validation = isWithinHinunanganBoundary(clickLat, clickLng);
      if (!validation.isInside) {
        setBoundaryWarning('Swine registrations are restricted to Hinunangan municipality boundaries.');
        setTimeout(() => setBoundaryWarning(null), 4000);
        return;
      }
      setBoundaryWarning(null);
      marker.setLatLng([clickLat, clickLng]);
      circle.setLatLng([clickLat, clickLng]);
      onChangeCoordinates({
        lat: Number(clickLat.toFixed(6)),
        lng: Number(clickLng.toFixed(6)),
        accuracy: 3.0
      });
      if (validation.barangay && onSyncBarangay && validation.barangay !== barangay) {
        onSyncBarangay(validation.barangay);
      }
    });

    mapInstanceRef.current = map;

    // Ensure proper sizing
    const sizeTimer = setTimeout(() => {
      if (mapInstanceRef.current && (mapInstanceRef.current as any)._mapPane) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(sizeTimer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // Ignore teardown issues
        }
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // Update map when tile changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tile = L.tileLayer(TILE_SERVERS[tileMode].url, {
      attribution: TILE_SERVERS[tileMode].attribution,
      maxZoom: 19
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = tile;
  }, [tileMode]);

  // Update marker position when lat/lng props change from outside
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
    const currentMarkerPos = markerRef.current.getLatLng();
    if (
      Math.abs(currentMarkerPos.lat - lat) > 0.00001 ||
      Math.abs(currentMarkerPos.lng - lng) > 0.00001
    ) {
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(accuracy || 5);
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
    }
  }, [lat, lng, accuracy]);

  // Handle GPS Locate
  const handleGpsLocate = async () => {
    if (!geo) return;
    setGpsLocating(true);
    const pos = await geo.getCurrentLocation();
    setGpsLocating(false);
    if (pos) {
      onChangeCoordinates({
        lat: Number(pos.lat.toFixed(6)),
        lng: Number(pos.lng.toFixed(6)),
        accuracy: pos.accuracy,
        altitude: pos.altitude ?? undefined
      });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([pos.lat, pos.lng], 17);
      }
    }
  };

  // Center on current barangay
  const handleCenterBarangay = () => {
    const coords = BARANGAY_COORDS_MAP[barangay];
    if (coords && mapInstanceRef.current) {
      onChangeCoordinates({
        lat: coords.lat,
        lng: coords.lng,
        accuracy: 10
      });
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15);
    }
  };

  return (
    <div className="space-y-2">
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#203F2B] bg-[#F5EFDD] px-2.5 py-1 rounded-lg border border-[#DED2AE]">
          <MapPin className="w-3.5 h-3.5 text-[#2F5C3F]" />
          <span>Pin: <b>{lat.toFixed(5)}°N, {lng.toFixed(5)}°E</b></span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Tile Toggle */}
          <div className="flex items-center bg-[#F5EFDD] border border-[#DED2AE] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setTileMode('standard')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${tileMode === 'standard' ? 'bg-[#2F5C3F] text-white' : 'text-[#55604F]'}`}
            >
              Street
            </button>
            <button
              type="button"
              onClick={() => setTileMode('satellite')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${tileMode === 'satellite' ? 'bg-[#2F5C3F] text-white' : 'text-[#55604F]'}`}
            >
              Satellite
            </button>
          </div>

          {/* Barangay Center */}
          <button
            type="button"
            onClick={handleCenterBarangay}
            className="px-2 py-1 bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] border border-[#DED2AE] rounded-lg font-bold text-[11px] flex items-center gap-1"
            title={`Center on ${barangay}`}
          >
            <Navigation className="w-3 h-3 text-[#2F5C3F]" />
            <span>Center on {barangay}</span>
          </button>

          {/* GPS Button */}
          {geo && (
            <button
              type="button"
              onClick={handleGpsLocate}
              disabled={gpsLocating}
              className="px-2.5 py-1 bg-[#2F5C3F] hover:bg-[#203F2B] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs disabled:opacity-50"
            >
              <Crosshair className={`w-3 h-3 ${gpsLocating ? 'animate-spin' : ''}`} />
              <span>{gpsLocating ? 'Locating...' : 'My GPS'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative rounded-xl overflow-hidden border border-[#DED2AE] shadow-inner bg-[#EAE1C4]">
        <div ref={mapContainerRef} className="w-full h-56 z-0" />
        
        {/* Boundary Warning Alert */}
        {boundaryWarning && (
          <div className="absolute top-2 left-2 right-2 z-20 bg-[#3D1418]/95 border border-rose-500 text-white px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-xs flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="text-[11px] font-medium leading-tight">{boundaryWarning}</span>
          </div>
        )}

        {/* Floating guidance overlay */}
        <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-[#DED2AE] text-[10px] text-[#55604F] flex items-center gap-1.5 pointer-events-none shadow-xs">
          <HelpCircle className="w-3 h-3 text-[#2F5C3F]" />
          <span>Click anywhere or drag the pin to set exact pen location</span>
        </div>

        {/* Nearest barangay badge */}
        {!boundaryWarning && detectedBrgy && (
          <div className="absolute top-2 left-2 z-10 bg-[#203F2B]/90 text-white backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 shadow-sm">
            <span>Nearest Barangay: <b>{detectedBrgy}</b></span>
            {onSyncBarangay && detectedBrgy !== barangay && (
              <button
                type="button"
                onClick={() => onSyncBarangay(detectedBrgy)}
                className="ml-1 px-1.5 py-0.5 bg-[#D9A441] hover:bg-[#B9852A] text-[#203F2B] font-bold rounded text-[9px] cursor-pointer"
              >
                Set to {detectedBrgy}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
