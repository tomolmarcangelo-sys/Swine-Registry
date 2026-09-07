import { PigRecord, User, SyncQueueItem } from '../types';

const DB_NAME = 'HinunanganSwineGIS_IndexedDB';
const DB_VERSION = 1;

export interface OfflineTileRecord {
  key: string;
  blob: Blob;
  timestamp: number;
}

export interface FormDraftRecord {
  id: string;
  data: any;
  updatedAt: string;
}

let dbInstance: IDBDatabase | null = null;

export async function getIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Pigs Store
      if (!db.objectStoreNames.contains('pigs')) {
        const pigsStore = db.createObjectStore('pigs', { keyPath: 'id' });
        pigsStore.createIndex('barangay', 'barangay', { unique: false });
        pigsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Users Store
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'username' });
      }

      // Mutation Sync Queue Store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Offline GIS Map Tiles Store
      if (!db.objectStoreNames.contains('mapTiles')) {
        db.createObjectStore('mapTiles', { keyPath: 'key' });
      }

      // Offline Form Drafts Store
      if (!db.objectStoreNames.contains('formDrafts')) {
        db.createObjectStore('formDrafts', { keyPath: 'id' });
      }

      // Key-Value App Settings Store
      if (!db.objectStoreNames.contains('appSettings')) {
        db.createObjectStore('appSettings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// ----------------------------------------------------
// PIGS STORAGE (IndexedDB)
// ----------------------------------------------------

export async function savePigsToIdb(pigs: PigRecord[]): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('pigs', 'readwrite');
    const store = tx.objectStore('pigs');
    
    // Clear and batch re-insert
    store.clear();
    for (const pig of pigs) {
      store.put(pig);
    }
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save pigs to IndexedDB:', err);
  }
}

export async function loadPigsFromIdb(): Promise<PigRecord[]> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('pigs', 'readonly');
    const store = tx.objectStore('pigs');
    const request = store.getAll();

    return new Promise((res) => {
      request.onsuccess = () => res(request.result || []);
      request.onerror = () => res([]);
    });
  } catch (err) {
    console.warn('Failed to load pigs from IndexedDB:', err);
    return [];
  }
}

// ----------------------------------------------------
// SYNC QUEUE STORAGE (IndexedDB)
// ----------------------------------------------------

export async function saveSyncQueueToIdb(queue: SyncQueueItem[]): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.clear();
    for (const item of queue) {
      store.put(item);
    }
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save sync queue to IndexedDB:', err);
  }
}

export async function loadSyncQueueFromIdb(): Promise<SyncQueueItem[]> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const request = store.getAll();

    return new Promise((res) => {
      request.onsuccess = () => res(request.result || []);
      request.onerror = () => res([]);
    });
  } catch (err) {
    console.warn('Failed to load sync queue from IndexedDB:', err);
    return [];
  }
}

// ----------------------------------------------------
// FORM DRAFTS (IndexedDB)
// ----------------------------------------------------

export async function saveFormDraftToIdb(draftId: string, data: any): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('formDrafts', 'readwrite');
    const store = tx.objectStore('formDrafts');
    store.put({ id: draftId, data, updatedAt: new Date().toISOString() });
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save draft to IndexedDB:', err);
  }
}

export async function loadFormDraftFromIdb(draftId: string): Promise<any | null> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('formDrafts', 'readonly');
    const store = tx.objectStore('formDrafts');
    const request = store.get(draftId);

    return new Promise((res) => {
      request.onsuccess = () => res(request.result?.data || null);
      request.onerror = () => res(null);
    });
  } catch (err) {
    console.warn('Failed to load draft from IndexedDB:', err);
    return null;
  }
}

export async function clearFormDraftFromIdb(draftId: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('formDrafts', 'readwrite');
    tx.objectStore('formDrafts').delete(draftId);
  } catch (err) {
    console.warn('Failed to clear draft from IndexedDB:', err);
  }
}

// ----------------------------------------------------
// MAP TILES CACHING (IndexedDB)
// ----------------------------------------------------

export async function cacheMapTileToIdb(key: string, blob: Blob): Promise<void> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('mapTiles', 'readwrite');
    tx.objectStore('mapTiles').put({ key, blob, timestamp: Date.now() });
  } catch (err) {
    console.warn('Failed to cache map tile to IndexedDB:', err);
  }
}

export async function getCachedMapTileFromIdb(key: string): Promise<Blob | null> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('mapTiles', 'readonly');
    const request = tx.objectStore('mapTiles').get(key);
    return new Promise((res) => {
      request.onsuccess = () => res(request.result?.blob || null);
      request.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

export async function countCachedMapTiles(): Promise<number> {
  try {
    const db = await getIndexedDB();
    const tx = db.transaction('mapTiles', 'readonly');
    const request = tx.objectStore('mapTiles').count();
    return new Promise((res) => {
      request.onsuccess = () => res(request.result || 0);
      request.onerror = () => res(0);
    });
  } catch {
    return 0;
  }
}
