import { useState } from 'react'
import { grigliaMese, etichettaMese, meseDi, oggiISO, fromISO } from '../lib/time.js'
import { IconaSinistra, IconaDestra } from './Icone.jsx'

const DOW = ['l', 'm', 'm', 'g', 'v', 's', 'd']

function spostaMese(mese, n) {
  const [y, m] = mese.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Mini anteprima nella barra: un puntino per giorno del mese */
export function MiniCalendario({ dataCorrente, giorniConSessioni }) {
  const mese = meseDi(dataCorrente)
  const settimane = grigliaMese(mese)
  const celle = settimane.flat()
  return (
    <div className="mini-cal" aria-hidden="true">
      {celle.map((iso, i) => (
        <span
          key={i}
          className={!iso ? 'vuoto' : iso === dataCorrente ? 'oggi' : giorniConSessioni.has(iso) ? 'pieno' : ''}
        />
      ))}
    </div>
  )
}

export default function Calendario({ dataCorrente, giorniConSessioni, onScegli, onChiudi }) {
  const [mese, setMese] = useState(meseDi(dataCorrente))
  const settimane = grigliaMese(mese)
  const oggi = oggiISO()

  return (
    <>
      <div className="velo" onClick={onChiudi} />
      <div className="sheet" role="dialog" aria-label="Calendario">
        <div className="maniglia" />
        <div className="cal-testa">
          <button className="icona-btn" onClick={() => setMese(spostaMese(mese, -1))} aria-label="Mese precedente">
            <IconaSinistra />
          </button>
          <span className="cal-mese">{etichettaMese(mese)}</span>
          <button className="icona-btn" onClick={() => setMese(spostaMese(mese, 1))} aria-label="Mese successivo">
            <IconaDestra />
          </button>
        </div>

        <div className="cal-griglia">
          {DOW.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
          {settimane.flat().map((iso, i) => {
            if (!iso) return <div key={i} className="cal-cella vuota" />
            const classi = ['cal-cella']
            if (iso === oggi) classi.push('oggi')
            if (iso === dataCorrente) classi.push('scelta')
            return (
              <button key={i} className={classi.join(' ')} onClick={() => { onScegli(iso); onChiudi() }}>
                <span>{fromISO(iso).getDate()}</span>
                {giorniConSessioni.has(iso)
                  ? <span className="cal-punto" />
                  : <span className="cal-vuoto-punto" />}
              </button>
            )
          })}
        </div>

        <div className="azioni">
          <button className="btn secondario" onClick={() => { onScegli(oggi); onChiudi() }}>Vai a oggi</button>
        </div>
      </div>
    </>
  )
}
