// ─── Generazione dei testi da copiare ─────────────────────────────────────
import { dataIT, fromMin, span, durataTesto, oreDecimali, etichettaMese } from './time.js'
import { euro, daCentesimi, percentuale } from './denaro.js'
import { calcolaPeriodo, CUMULO_ETICHETTE } from './calc.js'

function unici(valori) {
  return [...new Set(valori.filter(v => v && String(v).trim()))]
}

/**
 * Elenco ore nel formato richiesto:
 *
 *   GG/MM/AAAA (luogo)
 *   Ore lavorate: H (HH:MM-HH:MM)
 *   Mansione: sigla
 */
export function elencoOre(giorni) {
  const righe = []
  const ordinati = [...giorni]
    .filter(g => g.sessioni.length > 0)
    .sort((a, b) => a.data.localeCompare(b.data))

  for (const g of ordinati) {
    const sessioni = [...g.sessioni].sort((a, b) => span(a)[0] - span(b)[0])
    const luoghi = unici(sessioni.map(s => s.luogo)).join(' + ') || '—'
    const mansioni = unici(sessioni.map(s => s.mansione)).join(' + ') || '—'
    const minuti = sessioni.reduce((n, s) => { const [a, b] = span(s); return n + (b - a) }, 0)
    const orari = sessioni.map(s => {
      const [a, b] = span(s)
      return `${fromMin(a)}-${fromMin(b)}`
    }).join(' + ')

    righe.push(`${dataIT(g.data)} (${luoghi})`)
    righe.push(`Ore lavorate: ${oreDecimali(minuti)} (${orari})`)
    righe.push(`Mansione: ${mansioni}`)
  }
  return righe.join('\n')
}

/** Riga leggibile con i parametri usati per il calcolo */
export function rigaParametri(imp) {
  const fascia = imp.fasciaInizio === imp.fasciaFine
    ? 'nessuna fascia oraria'
    : `fascia base ${imp.fasciaInizio}–${imp.fasciaFine} (fuori fascia ${percentuale(Number(imp.maggFuoriFascia))})`
  const soglia = Number(imp.maxOreGiornaliere) > 0
    ? `max ${imp.maxOreGiornaliere} h/giorno (oltre ${percentuale(Number(imp.maggStraordinario))})`
    : 'nessuna soglia giornaliera'
  return [
    `Tariffa base: ${daCentesimi(imp.tariffaOrariaCent)} €/h`,
    fascia,
    soglia,
    `cumulo: ${CUMULO_ETICHETTE[imp.cumulo]}`,
  ].join('\n· ')
}

/**
 * Report che mostra COME è stato calcolato il compenso: ogni giorno è
 * scomposto nei segmenti che hanno ricevuto una maggiorazione diversa.
 */
export function reportCompensi(giorni, imp, titolo) {
  const p = calcolaPeriodo(giorni, imp)
  const out = []

  out.push(`REPORT COMPENSI — ${titolo}`)
  out.push('')
  out.push('Parametri applicati:')
  out.push(`· ${rigaParametri(imp)}`)
  out.push('')
  out.push('─'.repeat(44))
  out.push('')

  for (const g of p.giorni) {
    const luoghi = unici(g.sessioni.map(s => s.luogo)).join(' + ') || '—'
    const mansioni = unici(g.sessioni.map(s => s.mansione)).join(' + ')
    out.push(`${dataIT(g.data)} — ${luoghi}${mansioni ? ` (${mansioni})` : ''}`)

    for (const s of g.sessioni) {
      const [a, b] = span(s)
      out.push(`  ${fromMin(a)}-${fromMin(b)}  ${durataTesto(b - a)}${s.luogo ? ` · ${s.luogo}` : ''}`)
    }
    for (const seg of g.segmenti) {
      const magg = seg.magg ? ` ${percentuale(seg.magg)}` : ''
      out.push(`    ${seg.orario}  ${seg.durata}  ${seg.etichetta}${magg}  →  ${euro(seg.importoCent)}`)
    }
    if (g.sovrapposizioni.length) {
      out.push('    ⚠ attenzione: sessioni sovrapposte in questo giorno')
    }
    out.push(`  Totale giorno: ${durataTesto(g.minutiTotali)} → ${euro(g.totaleCent)}`)
    out.push('')
  }

  out.push('─'.repeat(44))
  out.push('')
  out.push('RIEPILOGO')
  out.push(`Giorni lavorati: ${p.giorni.length}`)
  out.push(`Ore totali: ${durataTesto(p.minutiTotali)}`)
  out.push(`  · ordinarie: ${durataTesto(p.minutiOrdinari)}`)
  out.push(`  · fuori fascia: ${durataTesto(p.minutiFuoriFascia)}`)
  out.push(`  · straordinario: ${durataTesto(p.minutiStraordinari)}`)
  out.push('')
  if (p.perLuogo.length > 1) {
    out.push('Per luogo:')
    for (const l of p.perLuogo) {
      out.push(`  · ${l.luogo}: ${durataTesto(l.minuti)} → ${euro(l.totaleCent)}`)
    }
    out.push('')
  }
  out.push(`COMPENSO TOTALE: ${euro(p.totaleCent)}`)

  return out.join('\n')
}

/** Tabella TSV: si incolla direttamente in un foglio di calcolo */
export function tabellaTSV(giorni, imp) {
  const p = calcolaPeriodo(giorni, imp)
  const righe = [['Data', 'Luogo', 'Mansione', 'Inizio', 'Fine', 'Ore', 'Tipo', 'Maggiorazione', 'Importo €'].join('\t')]
  for (const g of p.giorni) {
    for (const seg of g.segmenti) {
      righe.push([
        dataIT(g.data),
        seg.luogo || '',
        seg.mansione || '',
        fromMin(seg.inizio),
        fromMin(seg.fine),
        oreDecimali(seg.minuti),
        seg.etichetta,
        seg.magg ? `${seg.magg}%` : '0%',
        daCentesimi(seg.importoCent),
      ].join('\t'))
    }
  }
  righe.push('')
  righe.push(['TOTALE', '', '', '', '', oreDecimali(p.minutiTotali), '', '', daCentesimi(p.totaleCent)].join('\t'))
  return righe.join('\n')
}

export function titoloMese(mese) {
  const t = etichettaMese(mese)
  return t.charAt(0).toUpperCase() + t.slice(1)
}
