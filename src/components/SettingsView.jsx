import { useState, useEffect } from 'react'
import { DEFAULT_SETTINGS, COMBINATION_LABELS } from '../lib/calc.js'
import { toCents, fromCents } from '../lib/money.js'

export default function SettingsView({ settings, onSave }) {
  const [draft, setDraft] = useState({ ...settings, rateText: fromCents(settings.hourlyRateCents) })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft({ ...settings, rateText: fromCents(settings.hourlyRateCents) })
  }, [settings])

  const field = (key) => (event) => setDraft({ ...draft, [key]: event.target.value })

  function save(event) {
    event.preventDefault()
    const { rateText, ...rest } = draft
    onSave({
      ...rest,
      hourlyRateCents: toCents(rateText),
      outOfBandSurcharge: Number(draft.outOfBandSurcharge) || 0,
      overtimeSurcharge: Number(draft.overtimeSurcharge) || 0,
      maxDailyHours: Number(draft.maxDailyHours) || 0,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <form className="view" onSubmit={save}>
      <h2>Impostazioni</h2>
      <p className="subtitle">
        Valgono per tutti i calcoli, compresi i mesi già registrati. Rileggi il report dopo averle cambiate.
      </p>

      <div className="section" style={{ marginTop: 0 }}>
        <h3>Compenso</h3>
        <div className="field">
          <label htmlFor="rate">Tariffa oraria base (€/h)</label>
          <input id="rate" type="text" inputMode="decimal" value={draft.rateText}
                 onChange={field('rateText')} />
        </div>
      </div>

      <div className="section">
        <h3>Fascia oraria</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 0 }}>
          Le ore dentro la fascia valgono la tariffa base; quelle fuori prendono la maggiorazione.
          Impostando inizio e fine uguali la fascia copre le 24 ore e nessuna ora risulta fuori fascia.
        </p>
        <div className="pair">
          <div className="field">
            <label htmlFor="band-start">Inizio fascia base</label>
            <input id="band-start" type="time" value={draft.bandStart} onChange={field('bandStart')} />
          </div>
          <div className="field">
            <label htmlFor="band-end">Fine fascia base</label>
            <input id="band-end" type="time" value={draft.bandEnd} onChange={field('bandEnd')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="out-of-band">Maggiorazione fuori fascia (%)</label>
          <input id="out-of-band" type="number" min="0" step="1" inputMode="numeric"
                 value={draft.outOfBandSurcharge} onChange={field('outOfBandSurcharge')} />
        </div>
      </div>

      <div className="section">
        <h3>Straordinario</h3>
        <div className="field">
          <label htmlFor="max-hours">
            Ore massime giornaliere
            <span className="hint"> — conteggiate sul giorno intero, anche tra sessioni diverse. 0 disattiva la soglia.</span>
          </label>
          <input id="max-hours" type="number" min="0" step="0.5" inputMode="decimal"
                 value={draft.maxDailyHours} onChange={field('maxDailyHours')} />
        </div>
        <div className="field">
          <label htmlFor="overtime">Maggiorazione oltre la soglia (%)</label>
          <input id="overtime" type="number" min="0" step="1" inputMode="numeric"
                 value={draft.overtimeSurcharge} onChange={field('overtimeSurcharge')} />
        </div>
      </div>

      <div className="section">
        <h3>Quando le due maggiorazioni si incontrano</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 0 }}>
          Un'ora può essere insieme straordinario e fuori fascia (per esempio la decima ora, alle 22:00).
          Questa scelta decide cosa succede in quel caso.
        </p>
        <div className="field">
          <select value={draft.combination} onChange={field('combination')} aria-label="Regola di cumulo">
            {Object.entries(COMBINATION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="actions">
        <button type="submit" className="btn">{saved ? 'Salvato' : 'Salva impostazioni'}</button>
        <button type="button" className="btn danger"
                onClick={() => { if (confirm('Ripristinare i valori iniziali?')) onSave({ ...DEFAULT_SETTINGS }) }}>
          Ripristina valori predefiniti
        </button>
      </div>
    </form>
  )
}
