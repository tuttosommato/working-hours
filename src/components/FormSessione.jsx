import { useState, useMemo } from 'react'
import { durataMin, durataTesto, toMin, dataIT } from '../lib/time.js'
import { IconaCestino } from './Icone.jsx'

export default function FormSessione({ sessione, data, luoghiNoti, mansioniNote, onSalva, onElimina, onChiudi }) {
  const nuova = !sessione.id
  const [oraInizio, setInizio] = useState(sessione.oraInizio || '09:00')
  const [oraFine, setFine] = useState(sessione.oraFine || '17:00')
  const [luogo, setLuogo] = useState(sessione.luogo || '')
  const [mansione, setMansione] = useState(sessione.mansione || '')
  const [note, setNote] = useState(sessione.note || '')

  const minuti = useMemo(() => durataMin({ oraInizio, oraFine }), [oraInizio, oraFine])
  const scavalla = toMin(oraFine) <= toMin(oraInizio)

  function salva(e) {
    e.preventDefault()
    onSalva({
      ...sessione,
      data,
      oraInizio,
      oraFine,
      luogo: luogo.trim(),
      mansione: mansione.trim(),
      note: note.trim(),
    })
  }

  return (
    <>
      <div className="velo" onClick={onChiudi} />
      <form className="sheet" onSubmit={salva}>
        <div className="maniglia" />
        <h2 style={{ margin: '0 0 2px', fontSize: 19, fontWeight: 600 }}>
          {nuova ? 'Nuova sessione' : 'Modifica sessione'}
        </h2>
        <p className="sottotitolo" style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--inchiostro-3)' }}>
          {dataIT(data)}
        </p>

        <div className="coppia">
          <div className="campo">
            <label htmlFor="inizio">Inizio</label>
            <input id="inizio" type="time" value={oraInizio} required
                   onChange={e => setInizio(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="fine">Fine</label>
            <input id="fine" type="time" value={oraFine} required
                   onChange={e => setFine(e.target.value)} />
          </div>
        </div>

        <div className="nota" style={{ marginTop: -4, marginBottom: 18 }}>
          Durata: <strong>{durataTesto(minuti)}</strong>
          {scavalla && ' · la sessione prosegue dopo la mezzanotte e resta contata in questo giorno'}
        </div>

        <div className="campo">
          <label htmlFor="luogo">Luogo</label>
          <input id="luogo" type="text" value={luogo} list="luoghi" autoComplete="off"
                 placeholder="es. Teulada" onChange={e => setLuogo(e.target.value)} />
          <datalist id="luoghi">
            {luoghiNoti.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>

        <div className="campo">
          <label htmlFor="mansione">Mansione <span className="aiuto">— sigla libera, solo descrittiva</span></label>
          <input id="mansione" type="text" value={mansione} list="mansioni" autoComplete="off"
                 placeholder="es. P" onChange={e => setMansione(e.target.value)} />
          <datalist id="mansioni">
            {mansioniNote.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>

        <div className="campo">
          <label htmlFor="note">Note <span className="aiuto">— non compaiono nell'elenco ore</span></label>
          <input id="note" type="text" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div className="azioni">
          <button type="submit" className="btn">Salva</button>
          <button type="button" className="btn secondario" onClick={onChiudi}>Annulla</button>
          {!nuova && (
            <button type="button" className="btn pericolo"
                    onClick={() => { if (confirm('Eliminare questa sessione?')) onElimina(sessione.id) }}>
              <IconaCestino width={17} height={17} /> Elimina
            </button>
          )}
        </div>
      </form>
    </>
  )
}
