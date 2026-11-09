import { describe, it, expect } from 'vitest'
import { calcolaGiorno, calcolaPeriodo, inFascia, maggiorazione, IMPOSTAZIONI_DEFAULT } from '../calc.js'
import { span, durataMin, oreDecimali, giorniDelMese } from '../time.js'
import { aCentesimi, daCentesimi, euro } from '../denaro.js'
import { elencoOre } from '../esporta.js'

const imp = { ...IMPOSTAZIONI_DEFAULT } // 20,00 €/h · 8:00-20:00 +25% · max 8h +25% · massimo

const S = (id, oraInizio, oraFine, luogo = 'Studio', mansione = 'P', data = '2026-10-07') =>
  ({ id, data, oraInizio, oraFine, luogo, mansione })

describe('tempo', () => {
  it('calcola una sessione normale', () => {
    expect(durataMin(S('a', '09:00', '17:00'))).toBe(480)
  })
  it('gestisce lo scavallamento della mezzanotte', () => {
    expect(durataMin(S('a', '19:30', '01:00'))).toBe(330)
    expect(span(S('a', '22:00', '02:00'))).toEqual([1320, 1560])
  })
  it('tratta 00:00-00:00 come 24 ore, non come 0', () => {
    expect(durataMin(S('a', '00:00', '00:00'))).toBe(1440)
  })
  it('formatta le ore decimali', () => {
    expect(oreDecimali(480)).toBe('8')
    expect(oreDecimali(510)).toBe('8,5')
    expect(oreDecimali(255)).toBe('4,25')
  })
  it('conosce la lunghezza dei mesi', () => {
    expect(giorniDelMese('2026-02').length).toBe(28)
    expect(giorniDelMese('2024-02').length).toBe(29)
    expect(giorniDelMese('2026-10').length).toBe(31)
  })
})

describe('denaro', () => {
  it('converte avanti e indietro senza perdere centesimi', () => {
    expect(aCentesimi('20,50')).toBe(2050)
    expect(aCentesimi('20.5')).toBe(2050)
    expect(daCentesimi(2050)).toBe('20,50')
    expect(euro(118000)).toBe('1.180,00 €')
  })
  it('non soffre dell\'errore dei float', () => {
    // 0.1 + 0.2 !== 0.3 in virgola mobile; in centesimi è esatto
    expect(aCentesimi('0,10') + aCentesimi('0,20')).toBe(aCentesimi('0,30'))
  })
})

describe('fasce orarie', () => {
  it('riconosce dentro e fuori fascia', () => {
    expect(inFascia(9 * 60, imp)).toBe(true)
    expect(inFascia(7 * 60 + 59, imp)).toBe(false)
    expect(inFascia(20 * 60, imp)).toBe(false)   // 20:00 è già fuori
    expect(inFascia(19 * 60 + 59, imp)).toBe(true)
  })
  it('gestisce una fascia che scavalca la mezzanotte', () => {
    const notturna = { ...imp, fasciaInizio: '22:00', fasciaFine: '06:00' }
    expect(inFascia(23 * 60, notturna)).toBe(true)
    expect(inFascia(2 * 60, notturna)).toBe(true)
    expect(inFascia(12 * 60, notturna)).toBe(false)
  })
  it('fascia inizio === fine significa nessun fuori fascia', () => {
    const sempre = { ...imp, fasciaInizio: '00:00', fasciaFine: '00:00' }
    expect(inFascia(3 * 60, sempre)).toBe(true)
  })
})

describe('combinazione delle maggiorazioni', () => {
  const flags = { fuoriFascia: true, straordinario: true }
  it('massimo: non si cumulano', () => {
    expect(maggiorazione(flags, { ...imp, cumulo: 'massimo' })).toBe(25)
  })
  it('somma: si addizionano', () => {
    expect(maggiorazione(flags, { ...imp, cumulo: 'somma' })).toBe(50)
  })
  it('composto: si moltiplicano', () => {
    expect(maggiorazione(flags, { ...imp, cumulo: 'composto' })).toBe(56.25)
  })
})

describe('calcolo del giorno', () => {
  it('giornata piena dentro fascia e sotto soglia: tutto base', () => {
    const g = calcolaGiorno([S('a', '09:00', '17:00')], imp)
    expect(g.minutiTotali).toBe(480)
    expect(g.minutiStraordinari).toBe(0)
    expect(g.minutiFuoriFascia).toBe(0)
    expect(g.totaleCent).toBe(16000)        // 8 h × 20,00
    expect(g.segmenti).toHaveLength(1)
  })

  it('esattamente alla soglia non scatta lo straordinario', () => {
    const g = calcolaGiorno([S('a', '09:00', '17:00')], imp)
    expect(g.minutiStraordinari).toBe(0)
  })

  it('un minuto oltre la soglia sì', () => {
    const g = calcolaGiorno([S('a', '09:00', '17:01')], imp)
    expect(g.minutiStraordinari).toBe(1)
  })

  it('ore prima delle 8:00 sono fuori fascia', () => {
    const g = calcolaGiorno([S('a', '05:00', '13:00')], imp)
    expect(g.minutiFuoriFascia).toBe(180)   // 5:00-8:00
    expect(g.minutiStraordinari).toBe(0)
    // 3 h a +25% (25,00) + 5 h base (20,00)
    expect(g.totaleCent).toBe(3 * 2500 + 5 * 2000)
  })

  it('la soglia giornaliera attraversa due sessioni separate', () => {
    const g = calcolaGiorno([
      S('a', '09:00', '17:00', 'Luogo A'),   // 8 h → esaurisce la soglia
      S('b', '19:30', '23:30', 'Luogo B'),                // 4 h → tutte straordinario
    ], imp)
    expect(g.minutiTotali).toBe(720)
    expect(g.minutiStraordinari).toBe(240)
    // della seconda sessione, 19:30-20:00 è straordinario ma dentro fascia,
    // 20:00-23:30 è straordinario E fuori fascia
    const fuori = g.segmenti.filter(s => s.fuoriFascia)
    expect(fuori.reduce((n, s) => n + s.minuti, 0)).toBe(210)
  })

  it('con cumulo "massimo" straordinario+fuori fascia resta a +25%', () => {
    const g = calcolaGiorno([
      S('a', '09:00', '17:00'),
      S('b', '20:00', '22:00'),
    ], imp)
    const seg = g.segmenti.find(s => s.straordinario && s.fuoriFascia)
    expect(seg.magg).toBe(25)
    expect(g.totaleCent).toBe(8 * 2000 + 2 * 2500)
  })

  it('con cumulo "somma" la stessa fascia vale +50%', () => {
    const impS = { ...imp, cumulo: 'somma' }
    const g = calcolaGiorno([
      S('a', '09:00', '17:00'),
      S('b', '20:00', '22:00'),
    ], impS)
    const seg = g.segmenti.find(s => s.straordinario && s.fuoriFascia)
    expect(seg.magg).toBe(50)
    expect(g.totaleCent).toBe(8 * 2000 + 2 * 3000)
  })

  it('sessione che scavalca la mezzanotte resta nel giorno di inizio', () => {
    const g = calcolaGiorno([S('a', '18:00', '01:00')], imp)
    expect(g.minutiTotali).toBe(420)
    // 18:00-20:00 in fascia (120), 20:00-01:00 fuori fascia (300)
    expect(g.minutiFuoriFascia).toBe(300)
  })

  it('segnala le sessioni sovrapposte senza alterarle', () => {
    const g = calcolaGiorno([
      S('a', '09:00', '13:00'),
      S('b', '12:00', '16:00'),
    ], imp)
    expect(g.sovrapposizioni).toHaveLength(1)
    expect(g.minutiTotali).toBe(480)   // le ore vengono comunque contate entrambe
  })

  it('un giorno vuoto non esplode', () => {
    const g = calcolaGiorno([], imp)
    expect(g.minutiTotali).toBe(0)
    expect(g.totaleCent).toBe(0)
  })
})

describe('periodo', () => {
  const giorni = [
    { data: '2026-10-07', sessioni: [S('a', '09:00', '17:00', 'Luogo A', 'P', '2026-10-07')] },
    { data: '2026-10-10', sessioni: [S('b', '05:00', '13:00', 'Luogo B', 'T', '2026-10-10')] },
    { data: '2026-10-21', sessioni: [
      S('c', '09:00', '17:00', 'Luogo A', 'P', '2026-10-21'),
      S('d', '19:30', '23:30', 'Luogo B', 'P', '2026-10-21'),
    ] },
  ]

  it('aggrega ore e compenso', () => {
    const p = calcolaPeriodo(giorni, imp)
    expect(p.minutiTotali).toBe(480 + 480 + 720)
    expect(p.giorni).toHaveLength(3)
    expect(p.perLuogo.map(l => l.luogo).sort()).toEqual(['Luogo A', 'Luogo B'])
  })

  it('ignora i giorni senza sessioni', () => {
    const p = calcolaPeriodo([...giorni, { data: '2026-10-09', sessioni: [] }], imp)
    expect(p.giorni).toHaveLength(3)
  })
})

describe('elenco ore da copiare', () => {
  it('riproduce il formato richiesto', () => {
    const testo = elencoOre([
      { data: '2026-10-07', sessioni: [S('a', '09:00', '17:00', 'Luogo A', 'P', '2026-10-07')] },
    ])
    expect(testo).toBe(
      '07/10/2026 (Luogo A)\n' +
      'Ore lavorate: 8 (9:00-17:00)\n' +
      'Mansione: P'
    )
  })

  it('unisce più sessioni dello stesso giorno con il +', () => {
    const testo = elencoOre([
      { data: '2026-10-21', sessioni: [
        S('c', '09:00', '17:00', 'Luogo A', 'P', '2026-10-21'),
        S('d', '19:30', '23:30', 'Luogo B', 'P', '2026-10-21'),
      ] },
    ])
    expect(testo).toBe(
      '21/10/2026 (Luogo A + Luogo B)\n' +
      'Ore lavorate: 12 (9:00-17:00 + 19:30-23:30)\n' +
      'Mansione: P'
    )
  })

  it('ordina le sessioni per orario di inizio', () => {
    const testo = elencoOre([
      { data: '2026-10-21', sessioni: [
        S('d', '19:30', '23:30', 'Luogo B', 'P', '2026-10-21'),
        S('c', '09:00', '17:00', 'Luogo A', 'P', '2026-10-21'),
      ] },
    ])
    expect(testo).toContain('(Luogo A + Luogo B)')
    expect(testo).toContain('(9:00-17:00 + 19:30-23:30)')
  })
})
