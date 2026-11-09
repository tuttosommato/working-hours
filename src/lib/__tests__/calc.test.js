import { describe, it, expect } from 'vitest'
import { computeDay, computePeriod, inBand, surcharge, DEFAULT_SETTINGS } from '../calc.js'
import { span, durationMin, decimalHours, daysOfMonth } from '../time.js'
import { toCents, fromCents, formatEuro } from '../money.js'
import { hoursList } from '../export.js'

const settings = { ...DEFAULT_SETTINGS } // 20,00 €/h · 8:00-20:00 +25% · max 8h +25% · maximum

const S = (id, startTime, endTime, location = 'Site', task = 'P', date = '2026-10-07') =>
  ({ id, date, startTime, endTime, location, task })

describe('time', () => {
  it('computes a plain session', () => {
    expect(durationMin(S('a', '09:00', '17:00'))).toBe(480)
  })
  it('handles crossing midnight', () => {
    expect(durationMin(S('a', '19:30', '01:00'))).toBe(330)
    expect(span(S('a', '22:00', '02:00'))).toEqual([1320, 1560])
  })
  it('treats 00:00-00:00 as 24 hours, not zero', () => {
    expect(durationMin(S('a', '00:00', '00:00'))).toBe(1440)
  })
  it('formats decimal hours', () => {
    expect(decimalHours(480)).toBe('8')
    expect(decimalHours(510)).toBe('8,5')
    expect(decimalHours(255)).toBe('4,25')
  })
  it('knows how long months are', () => {
    expect(daysOfMonth('2026-02').length).toBe(28)
    expect(daysOfMonth('2024-02').length).toBe(29)
    expect(daysOfMonth('2026-10').length).toBe(31)
  })
})

describe('money', () => {
  it('round-trips without losing cents', () => {
    expect(toCents('20,50')).toBe(2050)
    expect(toCents('20.5')).toBe(2050)
    expect(fromCents(2050)).toBe('20,50')
    expect(formatEuro(118000)).toBe('1.180,00 €')
  })
  it('does not suffer from float error', () => {
    // 0.1 + 0.2 !== 0.3 in floating point; in cents it is exact
    expect(toCents('0,10') + toCents('0,20')).toBe(toCents('0,30'))
  })
})

describe('time bands', () => {
  it('tells inside from outside the band', () => {
    expect(inBand(9 * 60, settings)).toBe(true)
    expect(inBand(7 * 60 + 59, settings)).toBe(false)
    expect(inBand(20 * 60, settings)).toBe(false)   // 20:00 is already outside
    expect(inBand(19 * 60 + 59, settings)).toBe(true)
  })
  it('handles a band crossing midnight', () => {
    const nightly = { ...settings, bandStart: '22:00', bandEnd: '06:00' }
    expect(inBand(23 * 60, nightly)).toBe(true)
    expect(inBand(2 * 60, nightly)).toBe(true)
    expect(inBand(12 * 60, nightly)).toBe(false)
  })
  it('treats start === end as no out-of-band hours', () => {
    const always = { ...settings, bandStart: '00:00', bandEnd: '00:00' }
    expect(inBand(3 * 60, always)).toBe(true)
  })
})

describe('combining surcharges', () => {
  const flags = { outOfBand: true, overtime: true }
  it('maximum: they do not stack', () => {
    expect(surcharge(flags, { ...settings, combination: 'maximum' })).toBe(25)
  })
  it('sum: they add up', () => {
    expect(surcharge(flags, { ...settings, combination: 'sum' })).toBe(50)
  })
  it('compound: they multiply', () => {
    expect(surcharge(flags, { ...settings, combination: 'compound' })).toBe(56.25)
  })
})

describe('day computation', () => {
  it('a full day inside the band and under the threshold is all at base rate', () => {
    const day = computeDay([S('a', '09:00', '17:00')], settings)
    expect(day.totalMinutes).toBe(480)
    expect(day.overtimeMinutes).toBe(0)
    expect(day.outOfBandMinutes).toBe(0)
    expect(day.totalCents).toBe(16000)        // 8 h × 20,00
    expect(day.segments).toHaveLength(1)
  })

  it('exactly at the threshold does not trigger overtime', () => {
    const day = computeDay([S('a', '09:00', '17:00')], settings)
    expect(day.overtimeMinutes).toBe(0)
  })

  it('one minute past the threshold does', () => {
    const day = computeDay([S('a', '09:00', '17:01')], settings)
    expect(day.overtimeMinutes).toBe(1)
  })

  it('hours before 8:00 are out of band', () => {
    const day = computeDay([S('a', '05:00', '13:00')], settings)
    expect(day.outOfBandMinutes).toBe(180)   // 5:00-8:00
    expect(day.overtimeMinutes).toBe(0)
    // 3 h at +25% (25,00) + 5 h at base (20,00)
    expect(day.totalCents).toBe(3 * 2500 + 5 * 2000)
  })

  it('the daily threshold cuts across two separate sessions', () => {
    const day = computeDay([
      S('a', '09:00', '17:00', 'Site A'),   // 8 h → uses up the threshold
      S('b', '19:30', '23:30', 'Site B'),   // 4 h → all overtime
    ], settings)
    expect(day.totalMinutes).toBe(720)
    expect(day.overtimeMinutes).toBe(240)
    // within the second session, 19:30-20:00 is overtime but inside the band,
    // 20:00-23:30 is both overtime and out of band
    const outside = day.segments.filter(s => s.outOfBand)
    expect(outside.reduce((n, s) => n + s.minutes, 0)).toBe(210)
  })

  it('with "maximum" combination, overtime plus out of band stays at +25%', () => {
    const day = computeDay([
      S('a', '09:00', '17:00'),
      S('b', '20:00', '22:00'),
    ], settings)
    const segment = day.segments.find(s => s.overtime && s.outOfBand)
    expect(segment.surcharge).toBe(25)
    expect(day.totalCents).toBe(8 * 2000 + 2 * 2500)
  })

  it('with "sum" combination, the same stretch is worth +50%', () => {
    const summed = { ...settings, combination: 'sum' }
    const day = computeDay([
      S('a', '09:00', '17:00'),
      S('b', '20:00', '22:00'),
    ], summed)
    const segment = day.segments.find(s => s.overtime && s.outOfBand)
    expect(segment.surcharge).toBe(50)
    expect(day.totalCents).toBe(8 * 2000 + 2 * 3000)
  })

  it('a session crossing midnight stays in its starting day', () => {
    const day = computeDay([S('a', '18:00', '01:00')], settings)
    expect(day.totalMinutes).toBe(420)
    // 18:00-20:00 inside the band (120), 20:00-01:00 outside (300)
    expect(day.outOfBandMinutes).toBe(300)
  })

  it('reports overlapping sessions without altering them', () => {
    const day = computeDay([
      S('a', '09:00', '13:00'),
      S('b', '12:00', '16:00'),
    ], settings)
    expect(day.overlaps).toHaveLength(1)
    expect(day.totalMinutes).toBe(480)   // both stretches are still counted
  })

  it('an empty day does not blow up', () => {
    const day = computeDay([], settings)
    expect(day.totalMinutes).toBe(0)
    expect(day.totalCents).toBe(0)
  })
})

describe('period', () => {
  const days = [
    { date: '2026-10-07', sessions: [S('a', '09:00', '17:00', 'Site A', 'P', '2026-10-07')] },
    { date: '2026-10-10', sessions: [S('b', '05:00', '13:00', 'Site B', 'T', '2026-10-10')] },
    { date: '2026-10-21', sessions: [
      S('c', '09:00', '17:00', 'Site A', 'P', '2026-10-21'),
      S('d', '19:30', '23:30', 'Site B', 'P', '2026-10-21'),
    ] },
  ]

  it('aggregates hours and pay', () => {
    const period = computePeriod(days, settings)
    expect(period.totalMinutes).toBe(480 + 480 + 720)
    expect(period.days).toHaveLength(3)
    expect(period.byLocation.map(l => l.location).sort()).toEqual(['Site A', 'Site B'])
  })

  it('skips days without sessions', () => {
    const period = computePeriod([...days, { date: '2026-10-09', sessions: [] }], settings)
    expect(period.days).toHaveLength(3)
  })
})

describe('hours list for copying', () => {
  it('reproduces the required format', () => {
    const text = hoursList([
      { date: '2026-10-07', sessions: [S('a', '09:00', '17:00', 'Site A', 'P', '2026-10-07')] },
    ])
    expect(text).toBe(
      '07/10/2026 (Site A)\n' +
      'Ore lavorate: 8 (9:00-17:00)\n' +
      'Mansione: P'
    )
  })

  it('joins several sessions of the same day with a plus', () => {
    const text = hoursList([
      { date: '2026-10-21', sessions: [
        S('c', '09:00', '17:00', 'Site A', 'P', '2026-10-21'),
        S('d', '19:30', '23:30', 'Site B', 'P', '2026-10-21'),
      ] },
    ])
    expect(text).toBe(
      '21/10/2026 (Site A + Site B)\n' +
      'Ore lavorate: 12 (9:00-17:00 + 19:30-23:30)\n' +
      'Mansione: P'
    )
  })

  it('sorts sessions by start time', () => {
    const text = hoursList([
      { date: '2026-10-21', sessions: [
        S('d', '19:30', '23:30', 'Site B', 'P', '2026-10-21'),
        S('c', '09:00', '17:00', 'Site A', 'P', '2026-10-21'),
      ] },
    ])
    expect(text).toContain('(Site A + Site B)')
    expect(text).toContain('(9:00-17:00 + 19:30-23:30)')
  })
})
