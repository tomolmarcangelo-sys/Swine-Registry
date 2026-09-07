import React, { useEffect } from 'react';
import '../services/leafletInit';
import { MapContainer, TileLayer, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Default coordinates for Hinunangan, Southern Leyte
const HINUNANGAN_COORDINATES: [number, number] = [10.4022, 125.1978];
const DEFAULT_ZOOM = 13;
const GOOGLE_SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];

/**
 * Helper child component to fix map canvas rendering issues (grey/blank tiles)
 * when the container initializes or changes dimensions.
 */
export const MapCanvasFix: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // 1. Trigger immediately on mount if pane ready
    if (map && (map as any)._mapPane) {
      map.invalidateSize();
    }

    // 2. Fallback timeout to ensure DOM container transitions/layouts have finished
    const timer = setTimeout(() => {
      if (map && (map as any)._mapPane) {
        map.invalidateSize();
      }
    }, 250);

    // 3. Trigger on window resize events
    const handleResize = () => {
      if (map && (map as any)._mapPane) {
        map.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
};

export interface GisGoogleMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  height?: string;
  children?: React.ReactNode;
}

/**
 * Production-ready GisGoogleMap component with Google Maps base layer toggling
 * (Street View & Hybrid Satellite) and canvas invalidation fix.
 */
export const GisGoogleMap: React.FC<GisGoogleMapProps> = ({
  center = HINUNANGAN_COORDINATES,
  zoom = DEFAULT_ZOOM,
  className = '',
  height = 'h-[600px]',
  children,
}) => {
  return (
    <div
      id="gis-google-map-container"
      className={`relative w-full ${height} rounded-xl overflow-hidden shadow-md border border-stone-200 dark:border-stone-700 ${className}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* Canvas auto-invalidation fix */}
        <MapCanvasFix />

        {/* Layer switchers for Google Maps */}
        <LayersControl position="topright">
          {/* 1. Roadmap / Street View (Default Checked) */}
          <LayersControl.BaseLayer checked name="Street View (Roadmap)">
            <TileLayer
              attribution="&copy; Google Maps"
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={GOOGLE_SUBDOMAINS}
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

          {/* 2. Satellite / Hybrid View */}
          <LayersControl.BaseLayer name="Satellite View (Hybrid)">
            <TileLayer
              attribution="&copy; Google Maps"
              url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              subdomains={GOOGLE_SUBDOMAINS}
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Any custom markers, polygons, or child components */}
        {children}
      </MapContainer>
    </div>
  );
};

export default GisGoogleMap;
