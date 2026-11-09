// ─── Export text generation ───────────────────────────────────────────────
// The user-facing strings stay in Italian: they end up on an invoice.

import { formatDate, fromMin, span, durationText, decimalHours, monthLabel } from './time.js'
import { formatEuro, fromCents, formatPercent } from './money.js'
import { computePeriod, COMBINATION_LABELS } from './calc.js'

function unique(values) {
  return [...new Set(values.filter(v => v && String(v).trim()))]
}

/**
 * Hours list, one block per day:
 *
 *   GG/MM/AAAA (luogo)
 *   Ore lavorate: H (HH:MM-HH:MM)
 *   Mansione: sigla
 */
export function hoursList(days) {
  const lines = []
  const sorted = [...days]
    .filter(d => d.sessions.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const day of sorted) {
    const sessions = [...day.sessions].sort((a, b) => span(a)[0] - span(b)[0])
    const locations = unique(sessions.map(s => s.location)).join(' + ') || '—'
    const tasks = unique(sessions.map(s => s.task)).join(' + ') || '—'
    const minutes = sessions.reduce((n, s) => { const [a, b] = span(s); return n + (b - a) }, 0)
    const ranges = sessions.map(s => {
      const [a, b] = span(s)
      return `${fromMin(a)}-${fromMin(b)}`
    }).join(' + ')

    lines.push(`${formatDate(day.date)} (${locations})`)
    lines.push(`Ore lavorate: ${decimalHours(minutes)} (${ranges})`)
    lines.push(`Mansione: ${tasks}`)
  }
  return lines.join('\n')
}

/** A readable line with the parameters used for the calculation */
export function parametersLine(settings) {
  const band = settings.bandStart === settings.bandEnd
    ? 'nessuna fascia oraria'
    : `fascia base ${settings.bandStart}–${settings.bandEnd} (fuori fascia ${formatPercent(Number(settings.outOfBandSurcharge))})`
  const threshold = Number(settings.maxDailyHours) > 0
    ? `max ${settings.maxDailyHours} h/giorno (oltre ${formatPercent(Number(settings.overtimeSurcharge))})`
    : 'nessuna soglia giornaliera'
  return [
    `Tariffa base: ${fromCents(settings.hourlyRateCents)} €/h`,
    band,
    threshold,
    `cumulo: ${COMBINATION_LABELS[settings.combination]}`,
  ].join('\n· ')
}

/**
 * A report showing HOW the pay was computed: each day is broken down into the
 * segments that received a different surcharge.
 */
export function payReport(days, settings, title) {
  const period = computePeriod(days, settings)
  const out = []

  out.push(`REPORT COMPENSI — ${title}`)
  out.push('')
  out.push('Parametri applicati:')
  out.push(`· ${parametersLine(settings)}`)
  out.push('')
  out.push('─'.repeat(44))
  out.push('')

  for (const day of period.days) {
    const locations = unique(day.sessions.map(s => s.location)).join(' + ') || '—'
    const tasks = unique(day.sessions.map(s => s.task)).join(' + ')
    out.push(`${formatDate(day.date)} — ${locations}${tasks ? ` (${tasks})` : ''}`)

    for (const session of day.sessions) {
      const [a, b] = span(session)
      out.push(`  ${fromMin(a)}-${fromMin(b)}  ${durationText(b - a)}${session.location ? ` · ${session.location}` : ''}`)
    }
    for (const seg of day.segments) {
      const extra = seg.surcharge ? ` ${formatPercent(seg.surcharge)}` : ''
      out.push(`    ${seg.timeRange}  ${seg.duration}  ${seg.label}${extra}  →  ${formatEuro(seg.amountCents)}`)
    }
    if (day.overlaps.length) {
      out.push('    ⚠ attenzione: sessioni sovrapposte in questo giorno')
    }
    out.push(`  Totale giorno: ${durationText(day.totalMinutes)} → ${formatEuro(day.totalCents)}`)
    out.push('')
  }

  out.push('─'.repeat(44))
  out.push('')
  out.push('RIEPILOGO')
  out.push(`Giorni lavorati: ${period.days.length}`)
  out.push(`Ore totali: ${durationText(period.totalMinutes)}`)
  out.push(`  · ordinarie: ${durationText(period.regularMinutes)}`)
  out.push(`  · fuori fascia: ${durationText(period.outOfBandMinutes)}`)
  out.push(`  · straordinario: ${durationText(period.overtimeMinutes)}`)
  out.push('')
  if (period.byLocation.length > 1) {
    out.push('Per luogo:')
    for (const entry of period.byLocation) {
      out.push(`  · ${entry.location}: ${durationText(entry.minutes)} → ${formatEuro(entry.totalCents)}`)
    }
    out.push('')
  }
  out.push(`COMPENSO TOTALE: ${formatEuro(period.totalCents)}`)

  return out.join('\n')
}

/** TSV table: pastes straight into a spreadsheet */
export function tsvTable(days, settings) {
  const period = computePeriod(days, settings)
  const rows = [['Data', 'Luogo', 'Mansione', 'Inizio', 'Fine', 'Ore', 'Tipo', 'Maggiorazione', 'Importo €'].join('\t')]
  for (const day of period.days) {
    for (const seg of day.segments) {
      rows.push([
        formatDate(day.date),
        seg.location || '',
        seg.task || '',
        fromMin(seg.start),
        fromMin(seg.end),
        decimalHours(seg.minutes),
        seg.label,
        seg.surcharge ? `${seg.surcharge}%` : '0%',
        fromCents(seg.amountCents),
      ].join('\t'))
    }
  }
  rows.push('')
  rows.push(['TOTALE', '', '', '', '', decimalHours(period.totalMinutes), '', '', fromCents(period.totalCents)].join('\t'))
  return rows.join('\n')
}

export function monthTitle(month) {
  const label = monthLabel(month)
  return label.charAt(0).toUpperCase() + label.slice(1)
}
