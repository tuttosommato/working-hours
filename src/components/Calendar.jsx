import { useState } from 'react'
import { monthGrid, monthLabel, monthOf, todayISO, fromISO } from '../lib/time.js'
import { LeftIcon, RightIcon } from './Icons.jsx'

const WEEKDAYS = ['l', 'm', 'm', 'g', 'v', 's', 'd']

function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Thumbnail in the top bar: one dot per day of the month */
export function MiniCalendar({ currentDate, daysWithSessions }) {
  const cells = monthGrid(monthOf(currentDate)).flat()
  return (
    <div className="mini-cal" aria-hidden="true">
      {cells.map((iso, i) => (
        <span
          key={i}
          className={!iso ? 'blank' : iso === currentDate ? 'today' : daysWithSessions.has(iso) ? 'filled' : ''}
        />
      ))}
    </div>
  )
}

export default function Calendar({ currentDate, daysWithSessions, onPick, onClose }) {
  const [month, setMonth] = useState(monthOf(currentDate))
  const weeks = monthGrid(month)
  const today = todayISO()

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Calendario">
        <div className="handle" />
        <div className="cal-header">
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mese precedente">
            <LeftIcon />
          </button>
          <span className="cal-month">{monthLabel(month)}</span>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mese successivo">
            <RightIcon />
          </button>
        </div>

        <div className="cal-grid">
          {WEEKDAYS.map((d, i) => <div key={i} className="cal-weekday">{d}</div>)}
          {weeks.flat().map((iso, i) => {
            if (!iso) return <div key={i} className="cal-cell blank" />
            const classes = ['cal-cell']
            if (iso === today) classes.push('today')
            if (iso === currentDate) classes.push('selected')
            return (
              <button key={i} className={classes.join(' ')} onClick={() => { onPick(iso); onClose() }}>
                <span>{fromISO(iso).getDate()}</span>
                {daysWithSessions.has(iso)
                  ? <span className="cal-dot" />
                  : <span className="cal-dot-placeholder" />}
              </button>
            )
          })}
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={() => { onPick(today); onClose() }}>Vai a oggi</button>
        </div>
      </div>
    </>
  )
}
