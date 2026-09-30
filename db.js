// IndexedDB `viewbox-ext` v1 (PRD §5).
const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

let dbp;
function open() {
  dbp ??= new Promise((resolve, reject) => {
    const r = indexedDB.open('viewbox-ext', 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('shows', { keyPath: 'pid' });
      const eps = db.createObjectStore('episodes', { keyPath: ['tmdbId', 'season', 'episode'] });
      eps.createIndex('tmdbId', 'tmdbId');
      eps.createIndex('airDate', 'airDate');
      db.createObjectStore('scans', { autoIncrement: true });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}

const store = async (name, mode = 'readonly') => (await open()).transaction(name, mode).objectStore(name);

export const getAll = async (name) => req((await store(name)).getAll());
export const put = async (name, value) => req((await store(name, 'readwrite')).put(value));
export const del = async (name, key) => req((await store(name, 'readwrite')).delete(key));
export const getAllKeys = async (name) => req((await store(name)).getAllKeys());
export async function putMany(name, values) {
  const s = await store(name, 'readwrite');
  values.forEach((v) => s.put(v));
  return new Promise((resolve, reject) => { s.transaction.oncomplete = resolve; s.transaction.onerror = () => reject(s.transaction.error); });
}
