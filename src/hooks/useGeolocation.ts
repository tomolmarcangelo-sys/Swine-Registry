import { useState, useEffect, useCallback } from 'react';

export interface GeoLocationState {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GeolocationHookReturn {
  position: GeoLocationState | null;
  error: string | null;
  loading: boolean;
  active: boolean;
  getCurrentLocation: () => Promise<GeoLocationState | null>;
  startWatching: () => void;
  stopWatching: () => void;
}

export function useGeolocation(): GeolocationHookReturn {
  const [position, setPosition] = useState<GeoLocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handleSuccess = (pos: GeolocationPosition): GeoLocationState => {
    const geoState: GeoLocationState = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp
    };
    setPosition(geoState);
    setError(null);
    setLoading(false);
    return geoState;
  };

  const handleError = (err: GeolocationPositionError) => {
    let msg = 'Unable to retrieve location';
    if (err.code === err.PERMISSION_DENIED) {
      msg = 'Location permission denied by user or browser.';
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      msg = 'Location information is unavailable.';
    } else if (err.code === err.TIMEOUT) {
      msg = 'The request to get user location timed out.';
    }
    setError(msg);
    setLoading(false);
  };

  const getCurrentLocation = useCallback(async (): Promise<GeoLocationState | null> => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      return null;
    }

    setLoading(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const state = handleSuccess(pos);
          resolve(state);
        },
        (err) => {
          handleError(err);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, []);

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    if (watchId !== null) return;

    setActive(true);
    const id = navigator.geolocation.watchPosition(
      (pos) => handleSuccess(pos),
      (err) => handleError(err),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );
    setWatchId(id);
  }, [watchId]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setActive(false);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    position,
    error,
    loading,
    active,
    getCurrentLocation,
    startWatching,
    stopWatching
  };
}
