// ─── Tempo ────────────────────────────────────────────────────────────────
// Regola di fondo: date e orari sono SEMPRE stringhe ("2026-11-06", "09:30").
// Mai oggetti Date per i calcoli: fusi orari e ora legale introducono bug
// che si manifestano solo a marzo e a ottobre.

export const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

/** "09:30" → 570 minuti dalla mezzanotte */
export function toMin(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

/** 570 → "9:30" (senza zero iniziale, come nell'export richiesto) */
export function fromMin(min) {
  const m = ((min % 1440) + 1440) % 1440
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** 570 → "09:30" (per gli <input type="time">) */
export function fromMinPad(min) {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Estensione di una sessione in minuti assoluti dall'inizio del giorno di
 * partenza. Se la fine è <= inizio la sessione scavalca la mezzanotte e
 * la fine viene spinta nel giorno successivo (+1440).
 */
export function span(sessione) {
  const a = toMin(sessione.oraInizio)
  let b = toMin(sessione.oraFine)
  if (b <= a) b += 1440
  return [a, b]
}

export function durataMin(sessione) {
  const [a, b] = span(sessione)
  return b - a
}

/** "2026-11-06" → "06/11/2026" */
export function dataIT(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Oggi in formato ISO, nel fuso locale (non toISOString, che usa UTC) */
export function oggiISO() {
  return toISO(new Date())
}

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Somma giorni a una data ISO restando nel calendario locale */
export function addGiorni(iso, n) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function meseDi(iso) {
  return iso.slice(0, 7) // "2026-11"
}

/** Elenco dei giorni ISO di un mese "2026-11" */
export function giorniDelMese(mese) {
  const [y, m] = mese.split('-').map(Number)
  const ultimo = new Date(y, m, 0).getDate()
  return Array.from({ length: ultimo }, (_, i) =>
    `${mese}-${String(i + 1).padStart(2, '0')}`)
}

/** Griglia del calendario: settimane che iniziano di lunedì */
export function grigliaMese(mese) {
  const giorni = giorniDelMese(mese)
  const primo = fromISO(giorni[0])
  const offset = (primo.getDay() + 6) % 7 // lunedì = 0
  const celle = Array(offset).fill(null).concat(giorni)
  while (celle.length % 7 !== 0) celle.push(null)
  const settimane = []
  for (let i = 0; i < celle.length; i += 7) settimane.push(celle.slice(i, i + 7))
  return settimane
}

export function etichettaMese(mese) {
  const [y, m] = mese.split('-').map(Number)
  return `${MESI[m - 1]} ${y}`
}

export function nomeGiorno(iso) {
  return GIORNI[fromISO(iso).getDay()]
}

/** 510 minuti → "8 h 30m" ; 480 → "8 h" */
export function durataTesto(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}m`
}

/** 510 minuti → "8,5" (formato ore dell'elenco da copiare) */
export function oreDecimali(min) {
  const ore = min / 60
  if (Number.isInteger(ore)) return String(ore)
  return ore.toFixed(2).replace(/0$/, '').replace('.', ',')
}
