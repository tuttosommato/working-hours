import { useState, useEffect } from 'react'
import { IMPOSTAZIONI_DEFAULT, CUMULO_ETICHETTE } from '../lib/calc.js'
import { aCentesimi, daCentesimi } from '../lib/denaro.js'

export default function VistaImpostazioni({ imp, onSalva }) {
  const [v, setV] = useState({ ...imp, tariffaTesto: daCentesimi(imp.tariffaOrariaCent) })
  const [salvato, setSalvato] = useState(false)

  useEffect(() => { setV({ ...imp, tariffaTesto: daCentesimi(imp.tariffaOrariaCent) }) }, [imp])

  const campo = (k) => (e) => setV({ ...v, [k]: e.target.value })

  function salva(e) {
    e.preventDefault()
    const { tariffaTesto, ...resto } = v
    onSalva({
      ...resto,
      tariffaOrariaCent: aCentesimi(tariffaTesto),
      maggFuoriFascia: Number(v.maggFuoriFascia) || 0,
      maggStraordinario: Number(v.maggStraordinario) || 0,
      maxOreGiornaliere: Number(v.maxOreGiornaliere) || 0,
    })
    setSalvato(true)
    setTimeout(() => setSalvato(false), 1800)
  }

  return (
    <form className="vista" onSubmit={salva}>
      <h2>Impostazioni</h2>
      <p className="sottotitolo">
        Valgono per tutti i calcoli, compresi i mesi già registrati. Rileggi il report dopo averle cambiate.
      </p>

      <div className="sezione" style={{ marginTop: 0 }}>
        <h3>Compenso</h3>
        <div className="campo">
          <label htmlFor="tariffa">Tariffa oraria base (€/h)</label>
          <input id="tariffa" type="text" inputMode="decimal" value={v.tariffaTesto}
                 onChange={campo('tariffaTesto')} />
        </div>
      </div>

      <div className="sezione">
        <h3>Fascia oraria</h3>
        <p style={{ fontSize: 14, color: 'var(--inchiostro-3)', marginTop: 0 }}>
          Le ore dentro la fascia valgono la tariffa base; quelle fuori prendono la maggiorazione.
          Impostando inizio e fine uguali la fascia copre le 24 ore e nessuna ora risulta fuori fascia.
        </p>
        <div className="coppia">
          <div className="campo">
            <label htmlFor="fi">Inizio fascia base</label>
            <input id="fi" type="time" value={v.fasciaInizio} onChange={campo('fasciaInizio')} />
          </div>
          <div className="campo">
            <label htmlFor="ff">Fine fascia base</label>
            <input id="ff" type="time" value={v.fasciaFine} onChange={campo('fasciaFine')} />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="mff">Maggiorazione fuori fascia (%)</label>
          <input id="mff" type="number" min="0" step="1" inputMode="numeric"
                 value={v.maggFuoriFascia} onChange={campo('maggFuoriFascia')} />
        </div>
      </div>

      <div className="sezione">
        <h3>Straordinario</h3>
        <div className="campo">
          <label htmlFor="max">
            Ore massime giornaliere
            <span className="aiuto"> — conteggiate sul giorno intero, anche tra sessioni diverse. 0 disattiva la soglia.</span>
          </label>
          <input id="max" type="number" min="0" step="0.5" inputMode="decimal"
                 value={v.maxOreGiornaliere} onChange={campo('maxOreGiornaliere')} />
        </div>
        <div className="campo">
          <label htmlFor="ms">Maggiorazione oltre la soglia (%)</label>
          <input id="ms" type="number" min="0" step="1" inputMode="numeric"
                 value={v.maggStraordinario} onChange={campo('maggStraordinario')} />
        </div>
      </div>

      <div className="sezione">
        <h3>Quando le due maggiorazioni si incontrano</h3>
        <p style={{ fontSize: 14, color: 'var(--inchiostro-3)', marginTop: 0 }}>
          Un'ora può essere insieme straordinario e fuori fascia (per esempio la decima ora, alle 22:00).
          Questa scelta decide cosa succede in quel caso.
        </p>
        <div className="campo">
          <select value={v.cumulo} onChange={campo('cumulo')} aria-label="Regola di cumulo">
            {Object.entries(CUMULO_ETICHETTE).map(([k, testo]) => (
              <option key={k} value={k}>{testo}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="azioni">
        <button type="submit" className="btn">{salvato ? 'Salvato' : 'Salva impostazioni'}</button>
        <button type="button" className="btn pericolo"
                onClick={() => { if (confirm('Ripristinare i valori iniziali?')) onSalva({ ...IMPOSTAZIONI_DEFAULT }) }}>
          Ripristina valori predefiniti
        </button>
      </div>
    </form>
  )
}
