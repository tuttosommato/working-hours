import { useRef, useState, useMemo } from 'react'
import { calcolaGiorno } from '../lib/calc.js'
import { nomeGiorno, fromISO, MESI, durataTesto, span, fromMin, oggiISO } from '../lib/time.js'
import { euro } from '../lib/denaro.js'

const SOGLIA_SWIPE = 55   // px oltre i quali il gesto cambia giorno

export default function VistaGiorno({ data, sessioni, imp, onApriForm, onCambiaGiorno }) {
  const [dx, setDx] = useState(0)
  const [trascina, setTrascina] = useState(false)
  const tocco = useRef(null)

  const giorno = useMemo(() => calcolaGiorno(sessioni, imp), [sessioni, imp])
  const d = fromISO(data)
  const èOggi = data === oggiISO()

  // Quale maggiorazione ha ricevuto ciascuna sessione (per i tag)
  const flagsPerSessione = useMemo(() => {
    const m = {}
    for (const seg of giorno.segmenti) {
      const f = m[seg.sessioneId] || (m[seg.sessioneId] = { straordinario: false, fuoriFascia: false })
      if (seg.straordinario) f.straordinario = true
      if (seg.fuoriFascia) f.fuoriFascia = true
    }
    return m
  }, [giorno])

  function inizio(e) {
    const t = e.touches[0]
    tocco.current = { x: t.clientX, y: t.clientY, bloccato: null }
  }

  function muovi(e) {
    if (!tocco.current) return
    const t = e.touches[0]
    const ax = t.clientX - tocco.current.x
    const ay = t.clientY - tocco.current.y
    if (tocco.current.bloccato === null) {
      if (Math.abs(ax) < 10 && Math.abs(ay) < 10) return
      tocco.current.bloccato = Math.abs(ax) > Math.abs(ay) ? 'x' : 'y'
    }
    if (tocco.current.bloccato !== 'x') return
    setTrascina(true)
    setDx(ax * 0.55)   // resistenza: il contenuto segue il dito ma più lentamente
  }

  function fine() {
    if (tocco.current?.bloccato === 'x') {
      const soglia = SOGLIA_SWIPE * 0.55
      if (dx > soglia) onCambiaGiorno(-1)
      else if (dx < -soglia) onCambiaGiorno(1)
    }
    tocco.current = null
    setTrascina(false)
    setDx(0)
  }

  return (
    <>
      <header className="giorno-testa">
        <div className="giorno-numero">{String(d.getDate()).padStart(2, '0')}</div>
        <div className="giorno-testo">
          <span className="giorno-settimana">{nomeGiorno(data)}</span>
          <span className="giorno-mese">{MESI[d.getMonth()]} {d.getFullYear()}</span>
        </div>
        {èOggi && <span className="giorno-oggi">oggi</span>}
      </header>

      <div className="scorri"
           onTouchStart={inizio} onTouchMove={muovi} onTouchEnd={fine} onTouchCancel={fine}>
        <div className={`scorri-contenuto${trascina ? ' trascina' : ''}`}
             style={{ transform: `translateX(${dx}px)` }}>

          {giorno.sessioni.length === 0 ? (
            <button className="aggiungi" onClick={() => onApriForm({})}>
              <span className="piu">+</span> Aggiungi una sessione
            </button>
          ) : (
            <>
              <div className="sessioni">
                {giorno.sessioni.map(s => {
                  const [a, b] = span(s)
                  const f = flagsPerSessione[s.id] || {}
                  return (
                    <button key={s.id} className="sessione" onClick={() => onApriForm(s)}>
                      <div className="sessione-riga">
                        <span className="sessione-orario">{fromMin(a)}–{fromMin(b)}</span>
                        <span className="sessione-durata">{durataTesto(b - a)}</span>
                      </div>
                      {s.luogo && <span className="sessione-luogo">{s.luogo}</span>}
                      <div className="sessione-meta">
                        {s.mansione && <span className="tag mansione">{s.mansione}</span>}
                        {f.straordinario && <span className="tag straordinario">straordinario</span>}
                        {f.fuoriFascia && <span className="tag fuori">fuori fascia</span>}
                        {s.note && <span className="tag">{s.note}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>

              <button className="aggiungi compatto" style={{ marginTop: 10 }} onClick={() => onApriForm({})}>
                <span className="piu">+</span> Aggiungi
              </button>

              <div className="totale-giorno">
                <div>
                  <div className="totale-etichetta">Totale giornata</div>
                  <div className="totale-ore">
                    {durataTesto(giorno.minutiTotali)}
                    {giorno.minutiStraordinari > 0 && ` · ${durataTesto(giorno.minutiStraordinari)} straordinario`}
                  </div>
                </div>
                <div className="totale-valore">{euro(giorno.totaleCent)}</div>
              </div>

              {giorno.sovrapposizioni.length > 0 && (
                <div className="avviso">
                  Due sessioni di questo giorno si sovrappongono: le ore vengono contate entrambe.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
