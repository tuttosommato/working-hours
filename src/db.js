// ─── Persistenza locale (IndexedDB) ───────────────────────────────────────
// I dati non lasciano mai il dispositivo. Nessun server, nessun account.
// Il rovescio della medaglia: se cancelli i dati del sito o cambi telefono
// spariscono. Per questo l'app insiste sul backup JSON.

const DB_NAME = 'ore-lavorate'
const DB_VERSION = 1
const SESSIONI = 'sessioni'
const CONFIG = 'config'

let _db = null

function apri() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(SESSIONI)) {
        const store = db.createObjectStore(SESSIONI, { keyPath: 'id' })
        store.createIndex('data', 'data')
      }
      if (!db.objectStoreNames.contains(CONFIG)) {
        db.createObjectStore(CONFIG)
      }
    }
    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

function tx(store, modo, fn) {
  return apri().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, modo)
    const req = fn(t.objectStore(store))
    t.oncomplete = () => resolve(req ? req.result : undefined)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  }))
}

export const nuovoId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const tutteLeSessioni = () => tx(SESSIONI, 'readonly', s => s.getAll())

export const salvaSessione = (sessione) =>
  tx(SESSIONI, 'readwrite', s => s.put(sessione))

export const eliminaSessione = (id) =>
  tx(SESSIONI, 'readwrite', s => s.delete(id))

export const leggiConfig = (chiave) =>
  tx(CONFIG, 'readonly', s => s.get(chiave))

export const scriviConfig = (chiave, valore) =>
  tx(CONFIG, 'readwrite', s => s.put(valore, chiave))

/** Sostituisce l'intero contenuto (import di un backup) */
export async function ripristina({ sessioni = [], impostazioni = null }) {
  const db = await apri()
  await new Promise((resolve, reject) => {
    const t = db.transaction([SESSIONI, CONFIG], 'readwrite')
    const store = t.objectStore(SESSIONI)
    store.clear()
    for (const s of sessioni) store.put(s)
    if (impostazioni) t.objectStore(CONFIG).put(impostazioni, 'impostazioni')
    t.oncomplete = resolve
    t.onerror = () => reject(t.error)
  })
}

/**
 * Chiede al browser di non eliminare i dati sotto pressione di spazio.
 * Su iOS non è garantito: il backup resta l'unica vera rete di sicurezza.
 */
export async function richiediPersistenza() {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch { /* ignora */ }
  return false
}
