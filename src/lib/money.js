// ─── Money ────────────────────────────────────────────────────────────────
// Every amount is an integer number of CENTS.
// In floating point 0.1 + 0.2 !== 0.3: on an invoice that becomes a one-cent
// discrepancy you cannot explain. Rounding happens once, at the end.

/** "20,50" or "20.50" → 2050 */
export function toCents(text) {
  if (typeof text === 'number') return Math.round(text * 100)
  const clean = String(text).trim().replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** 2050 → "20,50" */
export function fromCents(cents) {
  const sign = cents < 0 ? '-' : ''
  const a = Math.abs(cents)
  return `${sign}${Math.floor(a / 100)},${String(a % 100).padStart(2, '0')}`
}

/** 118000 → "1.180,00 €" */
export function formatEuro(cents) {
  const sign = cents < 0 ? '-' : ''
  const a = Math.abs(cents)
  const whole = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}${whole},${String(a % 100).padStart(2, '0')} €`
}

/** Readable percentage: 25 → "+25%", 0 → "base" */
export function formatPercent(p) {
  if (!p) return 'base'
  const s = Number.isInteger(p) ? String(p) : String(p).replace('.', ',')
  return `+${s}%`
}
