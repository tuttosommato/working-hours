// ─── Denaro ───────────────────────────────────────────────────────────────
// Tutti gli importi sono interi in CENTESIMI.
// In virgola mobile 0.1 + 0.2 !== 0.3: su una fattura diventa un centesimo
// di scarto che non sai spiegare. Si arrotonda una sola volta, alla fine.

/** "20,50" o "20.50" → 2050 */
export function aCentesimi(testo) {
  if (typeof testo === 'number') return Math.round(testo * 100)
  const pulito = String(testo).trim().replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(pulito)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** 2050 → "20,50" */
export function daCentesimi(cent) {
  const segno = cent < 0 ? '-' : ''
  const a = Math.abs(cent)
  return `${segno}${Math.floor(a / 100)},${String(a % 100).padStart(2, '0')}`
}

/** 118000 → "1.180,00 €" */
export function euro(cent) {
  const segno = cent < 0 ? '-' : ''
  const a = Math.abs(cent)
  const intero = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${segno}${intero},${String(a % 100).padStart(2, '0')} €`
}

/** Percentuale leggibile: 25 → "+25%", 0 → "base" */
export function percentuale(p) {
  if (!p) return 'base'
  const s = Number.isInteger(p) ? String(p) : String(p).replace('.', ',')
  return `+${s}%`
}
