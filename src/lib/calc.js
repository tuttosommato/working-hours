// ─── Motore di calcolo ────────────────────────────────────────────────────
// Funzioni pure: nessun accesso al database, nessuno stato. È ciò che le
// rende testabili — e qui i test servono davvero, perché un errore finisce
// in fattura.
//
// Tre livelli:
//   sessione → la singola fascia di lavoro (può scavalcare la mezzanotte)
//   giorno   → più sessioni insieme: la soglia delle ore le attraversa
//   mese     → aggregazione per il report
//
// Una sessione appartiene al giorno in cui INIZIA, anche se finisce il
// giorno dopo (19:30–01:00 del 21/10 è tutta del 21/10).

import { span, toMin, fromMin, durataTesto } from './time.js'

export const IMPOSTAZIONI_DEFAULT = {
  tariffaOrariaCent: 2000,      // 20,00 €/h
  fasciaInizio: '08:00',        // inizio fascia a tariffa base
  fasciaFine: '20:00',          // fine fascia a tariffa base
  maggFuoriFascia: 25,          // % sulle ore fuori dalla fascia base
  maxOreGiornaliere: 8,         // soglia oltre la quale scatta lo straordinario
  maggStraordinario: 25,        // % sulle ore oltre la soglia
  cumulo: 'massimo',            // 'massimo' | 'somma' | 'composto'
}

export const CUMULO_ETICHETTE = {
  massimo: 'si applica solo la maggiorazione più alta',
  somma: 'le maggiorazioni si sommano (+25% e +25% → +50%)',
  composto: 'le maggiorazioni si moltiplicano (+25% e +25% → +56,25%)',
}

/** Un minuto di orologio cade dentro la fascia a tariffa base? */
export function inFascia(minutoOrologio, imp) {
  const a = toMin(imp.fasciaInizio)
  const b = toMin(imp.fasciaFine)
  if (a === b) return true          // fascia su 24h: non esiste "fuori fascia"
  if (a < b) return minutoOrologio >= a && minutoOrologio < b
  return minutoOrologio >= a || minutoOrologio < b   // fascia che scavalca la mezzanotte
}

/** Percentuale di maggiorazione risultante dalla combinazione dei due casi */
export function maggiorazione({ fuoriFascia, straordinario }, imp) {
  const a = fuoriFascia ? Number(imp.maggFuoriFascia) || 0 : 0
  const b = straordinario ? Number(imp.maggStraordinario) || 0 : 0
  if (!a && !b) return 0
  if (imp.cumulo === 'somma') return a + b
  if (imp.cumulo === 'composto') {
    return Math.round(((1 + a / 100) * (1 + b / 100) - 1) * 10000) / 100
  }
  return Math.max(a, b)
}

export function etichettaSegmento({ fuoriFascia, straordinario }) {
  const voci = []
  if (straordinario) voci.push('straordinario')
  if (fuoriFascia) voci.push('fuori fascia')
  return voci.length ? voci.join(' + ') : 'ordinario'
}

function importoCent(minuti, magg, imp) {
  // Arrotondamento una sola volta, sul segmento.
  return Math.round((imp.tariffaOrariaCent * minuti * (100 + magg)) / 6000)
}

/**
 * Calcola un giorno intero.
 * @param {Array} sessioni  sessioni del giorno (stesso campo `data`)
 * @param {Object} imp      impostazioni
 * @returns {{sessioni, segmenti, minutiTotali, minutiOrdinari,
 *            minutiFuoriFascia, minutiStraordinari, totaleCent, sovrapposizioni}}
 */
export function calcolaGiorno(sessioni, imp = IMPOSTAZIONI_DEFAULT) {
  const ordinate = [...sessioni]
    .map(s => ({ sessione: s, span: span(s) }))
    .sort((x, y) => x.span[0] - y.span[0])

  // Sovrapposizioni: non le correggiamo, le segnaliamo.
  const sovrapposizioni = []
  for (let i = 1; i < ordinate.length; i++) {
    if (ordinate[i].span[0] < ordinate[i - 1].span[1]) {
      sovrapposizioni.push([ordinate[i - 1].sessione.id, ordinate[i].sessione.id])
    }
  }

  const sogliaMin = (Number(imp.maxOreGiornaliere) || 0) * 60
  let cumulati = 0
  const segmenti = []

  for (const { sessione, span: [a, b] } of ordinate) {
    let corrente = null
    for (let t = a; t < b; t++) {
      cumulati++
      const straordinario = sogliaMin > 0 && cumulati > sogliaMin
      const fuoriFascia = !inFascia(((t % 1440) + 1440) % 1440, imp)
      if (corrente && corrente.straordinario === straordinario &&
          corrente.fuoriFascia === fuoriFascia) {
        corrente.fine = t + 1
      } else {
        if (corrente) segmenti.push(corrente)
        corrente = {
          sessioneId: sessione.id,
          luogo: sessione.luogo,
          mansione: sessione.mansione,
          inizio: t,
          fine: t + 1,
          straordinario,
          fuoriFascia,
        }
      }
    }
    if (corrente) segmenti.push(corrente)
  }

  for (const seg of segmenti) {
    seg.minuti = seg.fine - seg.inizio
    seg.magg = maggiorazione(seg, imp)
    seg.importoCent = importoCent(seg.minuti, seg.magg, imp)
    seg.orario = `${fromMin(seg.inizio)}–${fromMin(seg.fine)}`
    seg.etichetta = etichettaSegmento(seg)
    seg.durata = durataTesto(seg.minuti)
  }

  const somma = (f) => segmenti.filter(f).reduce((n, s) => n + s.minuti, 0)

  return {
    sessioni: ordinate.map(o => o.sessione),
    segmenti,
    minutiTotali: segmenti.reduce((n, s) => n + s.minuti, 0),
    minutiOrdinari: somma(s => !s.straordinario && !s.fuoriFascia),
    minutiFuoriFascia: somma(s => s.fuoriFascia),
    minutiStraordinari: somma(s => s.straordinario),
    totaleCent: segmenti.reduce((n, s) => n + s.importoCent, 0),
    sovrapposizioni,
  }
}

/**
 * Aggrega un insieme di giorni.
 * @param {Array<{data, sessioni}>} giorni
 */
export function calcolaPeriodo(giorni, imp = IMPOSTAZIONI_DEFAULT) {
  const dettaglio = giorni
    .filter(g => g.sessioni.length > 0)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(g => ({ data: g.data, ...calcolaGiorno(g.sessioni, imp) }))

  const acc = (k) => dettaglio.reduce((n, g) => n + g[k], 0)

  const perLuogo = {}
  for (const g of dettaglio) {
    for (const s of g.segmenti) {
      const k = s.luogo || '—'
      if (!perLuogo[k]) perLuogo[k] = { luogo: k, minuti: 0, totaleCent: 0 }
      perLuogo[k].minuti += s.minuti
      perLuogo[k].totaleCent += s.importoCent
    }
  }

  return {
    giorni: dettaglio,
    minutiTotali: acc('minutiTotali'),
    minutiOrdinari: acc('minutiOrdinari'),
    minutiFuoriFascia: acc('minutiFuoriFascia'),
    minutiStraordinari: acc('minutiStraordinari'),
    totaleCent: acc('totaleCent'),
    perLuogo: Object.values(perLuogo).sort((a, b) => b.minuti - a.minuti),
  }
}
