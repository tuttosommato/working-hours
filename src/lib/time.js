// ─── Time ─────────────────────────────────────────────────────────────────
// Core rule: dates and times are ALWAYS strings ("2026-11-06", "09:30").
// Never Date objects for arithmetic: time zones and DST introduce bugs that
// only surface in March and October.

export const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
export const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

/** "09:30" → 570 minutes since midnight */
export function toMin(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

/** 570 → "9:30" (no leading zero, matching the export format) */
export function fromMin(min) {
  const m = ((min % 1440) + 1440) % 1440
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

/** 570 → "09:30" (for <input type="time">) */
export function fromMinPadded(min) {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * A session's extent, in minutes from the start of its starting day. When the
 * end is <= the start the session crosses midnight, so the end is pushed into
 * the following day (+1440).
 */
export function span(session) {
  const a = toMin(session.startTime)
  let b = toMin(session.endTime)
  if (b <= a) b += 1440
  return [a, b]
}

export function durationMin(session) {
  const [a, b] = span(session)
  return b - a
}

/** "2026-11-06" → "06/11/2026" */
export function formatDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Today in ISO form, in local time (not toISOString, which is UTC) */
export function todayISO() {
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

/** Adds days to an ISO date, staying in the local calendar */
export function addDays(iso, n) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function monthOf(iso) {
  return iso.slice(0, 7) // "2026-11"
}

/** The ISO days of a month given as "2026-11" */
export function daysOfMonth(month) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return Array.from({ length: last }, (_, i) =>
    `${month}-${String(i + 1).padStart(2, '0')}`)
}

/** Calendar grid: weeks starting on Monday */
export function monthGrid(month) {
  const days = daysOfMonth(month)
  const first = fromISO(days[0])
  const offset = (first.getDay() + 6) % 7 // Monday = 0
  const cells = Array(offset).fill(null).concat(days)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function dayName(iso) {
  return DAYS[fromISO(iso).getDay()]
}

/** 510 minutes → "8 h 30m" ; 480 → "8 h" */
export function durationText(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}m`
}

/** 510 minutes → "8,5" (the hour format used in the export list) */
export function decimalHours(min) {
  const hours = min / 60
  if (Number.isInteger(hours)) return String(hours)
  return hours.toFixed(2).replace(/0$/, '').replace('.', ',')
}
