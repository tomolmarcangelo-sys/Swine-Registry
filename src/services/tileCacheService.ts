import { cacheMapTileToIdb, countCachedMapTiles } from './indexedDbService';

// Hinunangan bounding box in Southern Leyte, Philippines
// Latitude: ~10.32 to ~10.48 N, Longitude: ~125.13 to ~125.29 E
export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
  return { x, y };
}

export function getHinunanganTileList(minZoom = 12, maxZoom = 15): TileCoord[] {
  const minLat = 10.32;
  const maxLat = 10.48;
  const minLng = 125.13;
  const maxLng = 125.29;

  const tiles: TileCoord[] = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    const nw = latLngToTile(maxLat, minLng, z);
    const se = latLngToTile(minLat, maxLng, z);

    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) {
        tiles.push({ z, x, y });
      }
    }
  }

  return tiles;
}

export interface CacheProgress {
  total: number;
  completed: number;
  failed: number;
  percent: number;
  isDownloading: boolean;
  isComplete: boolean;
}

export async function preCacheHinunanganTiles(
  onProgress?: (p: CacheProgress) => void
): Promise<{ success: boolean; totalCached: number }> {
  const tiles = getHinunanganTileList(12, 14); // Zoom 12 to 14 covers the whole municipality
  const total = tiles.length;
  let completed = 0;
  let failed = 0;

  // Prefer standard Cache Storage API if available, else IndexedDB
  const cacheAvailable = typeof caches !== 'undefined';
  let osmCache: Cache | null = null;
  if (cacheAvailable) {
    try {
      osmCache = await caches.open('osm-tile-cache');
    } catch {
      osmCache = null;
    }
  }

  for (const { z, x, y } of tiles) {
    const subdomains = ['a', 'b', 'c'];
    const s = subdomains[(x + y) % subdomains.length];
    const url = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const key = `tile_${z}_${x}_${y}`;

    try {
      if (osmCache) {
        // Check if already in cache
        const match = await osmCache.match(url);
        if (!match) {
          const res = await fetch(url, { mode: 'cors' });
          if (res.ok) {
            await osmCache.put(url, res.clone());
            const blob = await res.blob();
            await cacheMapTileToIdb(key, blob);
          }
        }
      } else {
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          await cacheMapTileToIdb(key, blob);
        }
      }
      completed++;
    } catch {
      failed++;
    }

    if (onProgress) {
      onProgress({
        total,
        completed,
        failed,
        percent: Math.round((completed / total) * 100),
        isDownloading: true,
        isComplete: false
      });
    }

    // Small delay to prevent rate-limiting
    await new Promise((res) => setTimeout(res, 20));
  }

  const finalCount = await countCachedMapTiles();

  if (onProgress) {
    onProgress({
      total,
      completed,
      failed,
      percent: 100,
      isDownloading: false,
      isComplete: true
    });
  }

  return { success: true, totalCached: finalCount || completed };
}
