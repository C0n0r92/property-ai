/**
 * Client-side caching using IndexedDB for map data
 * Provides fast access to cached property data
 */

const DB_NAME = 'property-ml-cache';
const DB_VERSION = 1;
const STORE_NAME = 'mapData';

interface CachedData {
  properties: any[];
  listings: any[];
  rentals: any[];
  timestamp: number;
  version: string;
}

const CACHE_VERSION = '1.0';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  return dbPromise;
}

export async function getCachedData(): Promise<CachedData | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('mapData');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result as CachedData | undefined;
        if (!data) {
          resolve(null);
          return;
        }

        // Check if cache is still valid
        const age = Date.now() - data.timestamp;
        if (age > CACHE_TTL || data.version !== CACHE_VERSION) {
          resolve(null);
          return;
        }

        resolve(data);
      };
    });
  } catch (error) {
    console.warn('Failed to read from cache:', error);
    return null;
  }
}

export async function setCachedData(data: {
  properties: any[];
  listings: any[];
  rentals: any[];
}): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const cachedData: CachedData = {
        ...data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };

      const request = store.put(cachedData, 'mapData');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to write to cache:', error);
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('mapData');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}



