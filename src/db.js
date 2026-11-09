// ─── Local persistence (IndexedDB) ────────────────────────────────────────
// Data never leaves the device. No server, no account.
// The flip side: clearing site data or switching phones wipes it. That is why
// the app insists on the JSON backup.

const DB_NAME = 'ore-lavorate'
// Bumped to 2 when the store was renamed from 'sessioni' to 'sessions'.
// Without the bump, onupgradeneeded never runs on a database that already
// exists and every transaction fails with "not a known object store name".
const DB_VERSION = 2
const SESSIONS = 'sessions'
const LEGACY_SESSIONS = 'sessioni'
const CONFIG = 'config'

let cachedDb = null

function open() {
  if (cachedDb) return Promise.resolve(cachedDb)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(SESSIONS)) {
        const store = db.createObjectStore(SESSIONS, { keyPath: 'id' })
        store.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains(CONFIG)) {
        db.createObjectStore(CONFIG)
      }
      // The old store never held anything worth keeping, so it is dropped
      // rather than migrated.
      if (db.objectStoreNames.contains(LEGACY_SESSIONS)) {
        db.deleteObjectStore(LEGACY_SESSIONS)
      }
    }
    request.onsuccess = () => { cachedDb = request.result; resolve(cachedDb) }
    request.onerror = () => reject(request.error)
  })
}

function transaction(storeName, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = fn(tx.objectStore(storeName))
    tx.oncomplete = () => resolve(request ? request.result : undefined)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  }))
}

export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const allSessions = () => transaction(SESSIONS, 'readonly', s => s.getAll())

export const saveSession = (session) =>
  transaction(SESSIONS, 'readwrite', s => s.put(session))

export const deleteSession = (id) =>
  transaction(SESSIONS, 'readwrite', s => s.delete(id))

export const readConfig = (key) =>
  transaction(CONFIG, 'readonly', s => s.get(key))

export const writeConfig = (key, value) =>
  transaction(CONFIG, 'readwrite', s => s.put(value, key))

/** Replaces the entire contents (restoring a backup) */
export async function restore({ sessions = [], settings = null }) {
  const db = await open()
  await new Promise((resolve, reject) => {
    const tx = db.transaction([SESSIONS, CONFIG], 'readwrite')
    const store = tx.objectStore(SESSIONS)
    store.clear()
    for (const session of sessions) store.put(session)
    if (settings) tx.objectStore(CONFIG).put(settings, 'settings')
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Asks the browser not to evict the data under storage pressure.
 * Not guaranteed on iOS: the backup remains the only real safety net.
 */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch { /* ignore */ }
  return false
}
