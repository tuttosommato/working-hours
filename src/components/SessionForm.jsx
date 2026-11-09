import { useState, useMemo } from 'react'
import { durationMin, durationText, toMin, formatDate } from '../lib/time.js'
import { TrashIcon } from './Icons.jsx'

export default function SessionForm({ session, date, knownLocations, knownTasks, onSave, onDelete, onClose }) {
  const isNew = !session.id
  const [startTime, setStartTime] = useState(session.startTime || '09:00')
  const [endTime, setEndTime] = useState(session.endTime || '17:00')
  const [location, setLocation] = useState(session.location || '')
  const [task, setTask] = useState(session.task || '')
  const [notes, setNotes] = useState(session.notes || '')

  const minutes = useMemo(() => durationMin({ startTime, endTime }), [startTime, endTime])
  const crossesMidnight = toMin(endTime) <= toMin(startTime)

  function save(event) {
    event.preventDefault()
    onSave({
      ...session,
      date,
      startTime,
      endTime,
      location: location.trim(),
      task: task.trim(),
      notes: notes.trim(),
    })
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <form className="sheet" onSubmit={save}>
        <div className="handle" />
        <h2 style={{ margin: '0 0 2px', fontSize: 19, fontWeight: 600 }}>
          {isNew ? 'Nuova sessione' : 'Modifica sessione'}
        </h2>
        <p className="subtitle" style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--ink-3)' }}>
          {formatDate(date)}
        </p>

        <div className="pair">
          <div className="field">
            <label htmlFor="start">Inizio</label>
            <input id="start" type="time" value={startTime} required
                   onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="end">Fine</label>
            <input id="end" type="time" value={endTime} required
                   onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="note" style={{ marginTop: -4, marginBottom: 18 }}>
          Durata: <strong>{durationText(minutes)}</strong>
          {crossesMidnight && ' · la sessione prosegue dopo la mezzanotte e resta contata in questo giorno'}
        </div>

        <div className="field">
          <label htmlFor="location">Luogo</label>
          <input id="location" type="text" value={location} list="locations" autoComplete="off"
                 onChange={e => setLocation(e.target.value)} />
          <datalist id="locations">
            {knownLocations.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="task">Mansione <span className="hint">— sigla libera, solo descrittiva</span></label>
          <input id="task" type="text" value={task} list="tasks" autoComplete="off"
                 onChange={e => setTask(e.target.value)} />
          <datalist id="tasks">
            {knownTasks.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="notes">Note <span className="hint">— non compaiono nell'elenco ore</span></label>
          <input id="notes" type="text" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="actions">
          <button type="submit" className="btn">Salva</button>
          <button type="button" className="btn secondary" onClick={onClose}>Annulla</button>
          {!isNew && (
            <button type="button" className="btn danger"
                    onClick={() => { if (confirm('Eliminare questa sessione?')) onDelete(session.id) }}>
              <TrashIcon width={17} height={17} /> Elimina
            </button>
          )}
        </div>
      </form>
    </>
  )
}
