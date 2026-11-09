import { useEffect, useMemo, useState, useCallback } from 'react'
import * as db from './db.js'
import { DEFAULT_SETTINGS } from './lib/calc.js'
import { todayISO, addDays, monthLabel, monthOf } from './lib/time.js'
import DayView from './components/DayView.jsx'
import ExportView from './components/ExportView.jsx'
import SettingsView from './components/SettingsView.jsx'
import SessionForm from './components/SessionForm.jsx'
import Calendar, { MiniCalendar } from './components/Calendar.jsx'
import Menu from './components/Menu.jsx'
import { MenuIcon } from './components/Icons.jsx'

export default function App() {
  const [ready, setReady] = useState(false)
  const [sessions, setSessions] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [date, setDate] = useState(todayISO())
  const [view, setView] = useState('day')
  const [menuOpen, setMenuOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [form, setForm] = useState(null)   // null | {} (new) | session

  useEffect(() => {
    (async () => {
      const [stored, storedSettings] = await Promise.all([
        db.allSessions(),
        db.readConfig('settings'),
      ])
      setSessions(stored)
      if (storedSettings) setSettings({ ...DEFAULT_SETTINGS, ...storedSettings })
      setReady(true)
      db.requestPersistence()
    })()
  }, [])

  const sessionsOfDay = useMemo(
    () => sessions.filter(s => s.date === date), [sessions, date])

  const daysWithSessions = useMemo(
    () => new Set(sessions.map(s => s.date)), [sessions])

  const knownLocations = useMemo(() => [...new Set(
    sessions.map(s => s.location).filter(Boolean))].sort(), [sessions])

  const knownTasks = useMemo(() => [...new Set(
    sessions.map(s => s.task).filter(Boolean))].sort(), [sessions])

  const saveSession = useCallback(async (session) => {
    const complete = session.id ? session : { ...session, id: db.newId() }
    await db.saveSession(complete)
    setSessions(previous => {
      const index = previous.findIndex(s => s.id === complete.id)
      if (index === -1) return [...previous, complete]
      const copy = [...previous]
      copy[index] = complete
      return copy
    })
    setForm(null)
  }, [])

  const deleteSession = useCallback(async (id) => {
    await db.deleteSession(id)
    setSessions(previous => previous.filter(s => s.id !== id))
    setForm(null)
  }, [])

  const saveSettings = useCallback(async (next) => {
    setSettings(next)
    await db.writeConfig('settings', next)
  }, [])

  const restore = useCallback(async (data) => {
    await db.restore(data)
    setSessions(data.sessions)
    if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
  }, [])

  // Arrow keys: handy on iPad and desktop
  useEffect(() => {
    if (view !== 'day' || form || calendarOpen || menuOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft') setDate(d => addDays(d, -1))
      if (event.key === 'ArrowRight') setDate(d => addDays(d, 1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, form, calendarOpen, menuOpen])

  if (!ready) return <div className="app" />

  return (
    <div className="app">
      <div className="bar">
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Apri il menu">
          <MenuIcon />
        </button>

        <span className="bar-title">
          {view === 'day' ? '' : view === 'export' ? 'Export e report' : 'Impostazioni'}
        </span>

        {view === 'day' ? (
          <button onClick={() => setCalendarOpen(true)} aria-label={`Calendario di ${monthLabel(monthOf(date))}`}>
            <MiniCalendar currentDate={date} daysWithSessions={daysWithSessions} />
          </button>
        ) : <div style={{ width: 42 }} />}
      </div>

      {view === 'day' && (
        <DayView
          date={date}
          sessions={sessionsOfDay}
          settings={settings}
          onOpenForm={setForm}
          onChangeDay={(n) => setDate(d => addDays(d, n))}
        />
      )}

      {view === 'export' && (
        <ExportView sessions={sessions} settings={settings} onRestore={restore} />
      )}

      {view === 'settings' && (
        <SettingsView settings={settings} onSave={saveSettings} />
      )}

      {menuOpen && (
        <Menu view={view} onView={setView} onClose={() => setMenuOpen(false)} />
      )}

      {calendarOpen && (
        <Calendar
          currentDate={date}
          daysWithSessions={daysWithSessions}
          onPick={setDate}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {form && (
        <SessionForm
          session={form}
          date={date}
          knownLocations={knownLocations}
          knownTasks={knownTasks}
          onSave={saveSession}
          onDelete={deleteSession}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}
