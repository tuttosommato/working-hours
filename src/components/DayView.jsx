import { useRef, useState, useMemo } from 'react'
import { computeDay } from '../lib/calc.js'
import { dayName, fromISO, MONTHS, durationText, span, fromMin, todayISO } from '../lib/time.js'
import { formatEuro } from '../lib/money.js'

const SWIPE_THRESHOLD = 55   // px past which the gesture changes day
const DRAG_RESISTANCE = 0.55 // the content follows the finger, but slower

export default function DayView({ date, sessions, settings, onOpenForm, onChangeDay }) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touch = useRef(null)

  const day = useMemo(() => computeDay(sessions, settings), [sessions, settings])
  const dateObj = fromISO(date)
  const isToday = date === todayISO()

  // Which surcharge each session received (for the tags)
  const flagsBySession = useMemo(() => {
    const map = {}
    for (const seg of day.segments) {
      const flags = map[seg.sessionId] || (map[seg.sessionId] = { overtime: false, outOfBand: false })
      if (seg.overtime) flags.overtime = true
      if (seg.outOfBand) flags.outOfBand = true
    }
    return map
  }, [day])

  function onTouchStart(event) {
    const t = event.touches[0]
    touch.current = { x: t.clientX, y: t.clientY, axis: null }
  }

  function onTouchMove(event) {
    if (!touch.current) return
    const t = event.touches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    if (touch.current.axis === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      touch.current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (touch.current.axis !== 'x') return
    setDragging(true)
    setOffsetX(dx * DRAG_RESISTANCE)
  }

  function onTouchEnd() {
    if (touch.current?.axis === 'x') {
      const threshold = SWIPE_THRESHOLD * DRAG_RESISTANCE
      if (offsetX > threshold) onChangeDay(-1)
      else if (offsetX < -threshold) onChangeDay(1)
    }
    touch.current = null
    setDragging(false)
    setOffsetX(0)
  }

  return (
    <>
      <header className="day-header">
        <div className="day-number">{String(dateObj.getDate()).padStart(2, '0')}</div>
        <div className="day-text">
          <span className="day-weekday">{dayName(date)}</span>
          <span className="day-month">{MONTHS[dateObj.getMonth()]} {dateObj.getFullYear()}</span>
        </div>
        {isToday && <span className="day-today">oggi</span>}
      </header>

      <div className="swipe"
           onTouchStart={onTouchStart} onTouchMove={onTouchMove}
           onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        <div className={`swipe-content${dragging ? ' dragging' : ''}`}
             style={{ transform: `translateX(${offsetX}px)` }}>

          {day.sessions.length === 0 ? (
            <button className="add" onClick={() => onOpenForm({})}>
              <span className="plus">+</span> Aggiungi una sessione
            </button>
          ) : (
            <>
              <div className="sessions">
                {day.sessions.map(session => {
                  const [start, end] = span(session)
                  const flags = flagsBySession[session.id] || {}
                  return (
                    <button key={session.id} className="session" onClick={() => onOpenForm(session)}>
                      <div className="session-row">
                        <span className="session-time">{fromMin(start)}–{fromMin(end)}</span>
                        <span className="session-duration">{durationText(end - start)}</span>
                      </div>
                      {session.location && <span className="session-location">{session.location}</span>}
                      <div className="session-meta">
                        {session.task && <span className="tag task">{session.task}</span>}
                        {flags.overtime && <span className="tag overtime">straordinario</span>}
                        {flags.outOfBand && <span className="tag out-of-band">fuori fascia</span>}
                        {session.notes && <span className="tag">{session.notes}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>

              <button className="add compact" style={{ marginTop: 10 }} onClick={() => onOpenForm({})}>
                <span className="plus">+</span> Aggiungi
              </button>

              <div className="day-total">
                <div>
                  <div className="total-label">Totale giornata</div>
                  <div className="total-hours">
                    {durationText(day.totalMinutes)}
                    {day.overtimeMinutes > 0 && ` · ${durationText(day.overtimeMinutes)} straordinario`}
                  </div>
                </div>
                <div className="total-value">{formatEuro(day.totalCents)}</div>
              </div>

              {day.overlaps.length > 0 && (
                <div className="notice">
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
