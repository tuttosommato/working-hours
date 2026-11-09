// ─── Calculation engine ───────────────────────────────────────────────────
// Pure functions: no database access, no state. That is what makes them
// testable — and tests matter here, because an error ends up on an invoice.
//
// Three levels:
//   session → one stretch of work (may cross midnight)
//   day     → several sessions together: the hour threshold cuts across them
//   period  → aggregation for the report
//
// A session belongs to the day it STARTS in, even when it ends the next day
// (19:30–01:00 on the 21st belongs entirely to the 21st).

import { span, toMin, fromMin, durationText } from './time.js'

export const DEFAULT_SETTINGS = {
  hourlyRateCents: 2000,       // 20,00 €/h
  bandStart: '08:00',          // start of the base-rate time window
  bandEnd: '20:00',            // end of the base-rate time window
  outOfBandSurcharge: 25,      // % on hours outside the window
  maxDailyHours: 8,            // threshold past which overtime applies
  overtimeSurcharge: 25,       // % on hours past the threshold
  combination: 'maximum',      // 'maximum' | 'sum' | 'compound'
}

export const COMBINATION_LABELS = {
  maximum: 'si applica solo la maggiorazione più alta',
  sum: 'le maggiorazioni si sommano (+25% e +25% → +50%)',
  compound: 'le maggiorazioni si moltiplicano (+25% e +25% → +56,25%)',
}

/** Does a clock minute fall inside the base-rate window? */
export function inBand(clockMinute, settings) {
  const a = toMin(settings.bandStart)
  const b = toMin(settings.bandEnd)
  if (a === b) return true          // 24h window: nothing is ever out of band
  if (a < b) return clockMinute >= a && clockMinute < b
  return clockMinute >= a || clockMinute < b   // window crossing midnight
}

/** The surcharge percentage produced by combining the two causes */
export function surcharge({ outOfBand, overtime }, settings) {
  const a = outOfBand ? Number(settings.outOfBandSurcharge) || 0 : 0
  const b = overtime ? Number(settings.overtimeSurcharge) || 0 : 0
  if (!a && !b) return 0
  if (settings.combination === 'sum') return a + b
  if (settings.combination === 'compound') {
    return Math.round(((1 + a / 100) * (1 + b / 100) - 1) * 10000) / 100
  }
  return Math.max(a, b)
}

export function segmentLabel({ outOfBand, overtime }) {
  const parts = []
  if (overtime) parts.push('straordinario')
  if (outOfBand) parts.push('fuori fascia')
  return parts.length ? parts.join(' + ') : 'ordinario'
}

function amountCents(minutes, surchargePercent, settings) {
  // Rounding happens once, on the segment.
  return Math.round((settings.hourlyRateCents * minutes * (100 + surchargePercent)) / 6000)
}

/**
 * Computes a whole day.
 * @param {Array} sessions  the day's sessions (same `date` field)
 * @param {Object} settings
 * @returns {{sessions, segments, totalMinutes, regularMinutes,
 *            outOfBandMinutes, overtimeMinutes, totalCents, overlaps}}
 */
export function computeDay(sessions, settings = DEFAULT_SETTINGS) {
  const sorted = [...sessions]
    .map(s => ({ session: s, span: span(s) }))
    .sort((x, y) => x.span[0] - y.span[0])

  // Overlaps are reported, not corrected.
  const overlaps = []
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].span[0] < sorted[i - 1].span[1]) {
      overlaps.push([sorted[i - 1].session.id, sorted[i].session.id])
    }
  }

  const thresholdMin = (Number(settings.maxDailyHours) || 0) * 60
  let accumulated = 0
  const segments = []

  for (const { session, span: [a, b] } of sorted) {
    let current = null
    for (let t = a; t < b; t++) {
      accumulated++
      const overtime = thresholdMin > 0 && accumulated > thresholdMin
      const outOfBand = !inBand(((t % 1440) + 1440) % 1440, settings)
      if (current && current.overtime === overtime && current.outOfBand === outOfBand) {
        current.end = t + 1
      } else {
        if (current) segments.push(current)
        current = {
          sessionId: session.id,
          location: session.location,
          task: session.task,
          start: t,
          end: t + 1,
          overtime,
          outOfBand,
        }
      }
    }
    if (current) segments.push(current)
  }

  for (const seg of segments) {
    seg.minutes = seg.end - seg.start
    seg.surcharge = surcharge(seg, settings)
    seg.amountCents = amountCents(seg.minutes, seg.surcharge, settings)
    seg.timeRange = `${fromMin(seg.start)}–${fromMin(seg.end)}`
    seg.label = segmentLabel(seg)
    seg.duration = durationText(seg.minutes)
  }

  const sum = (predicate) => segments.filter(predicate).reduce((n, s) => n + s.minutes, 0)

  return {
    sessions: sorted.map(s => s.session),
    segments,
    totalMinutes: segments.reduce((n, s) => n + s.minutes, 0),
    regularMinutes: sum(s => !s.overtime && !s.outOfBand),
    outOfBandMinutes: sum(s => s.outOfBand),
    overtimeMinutes: sum(s => s.overtime),
    totalCents: segments.reduce((n, s) => n + s.amountCents, 0),
    overlaps,
  }
}

/**
 * Aggregates a set of days.
 * @param {Array<{date, sessions}>} days
 */
export function computePeriod(days, settings = DEFAULT_SETTINGS) {
  const detail = days
    .filter(d => d.sessions.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ date: d.date, ...computeDay(d.sessions, settings) }))

  const total = (key) => detail.reduce((n, d) => n + d[key], 0)

  const byLocation = {}
  for (const day of detail) {
    for (const seg of day.segments) {
      const key = seg.location || '—'
      if (!byLocation[key]) byLocation[key] = { location: key, minutes: 0, totalCents: 0 }
      byLocation[key].minutes += seg.minutes
      byLocation[key].totalCents += seg.amountCents
    }
  }

  return {
    days: detail,
    totalMinutes: total('totalMinutes'),
    regularMinutes: total('regularMinutes'),
    outOfBandMinutes: total('outOfBandMinutes'),
    overtimeMinutes: total('overtimeMinutes'),
    totalCents: total('totalCents'),
    byLocation: Object.values(byLocation).sort((a, b) => b.minutes - a.minutes),
  }
}
