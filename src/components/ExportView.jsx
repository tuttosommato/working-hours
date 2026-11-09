import { useState, useMemo, useRef } from 'react'
import { daysOfMonth, monthLabel, monthOf, todayISO, durationText } from '../lib/time.js'
import { formatEuro } from '../lib/money.js'
import { computePeriod } from '../lib/calc.js'
import { hoursList, payReport, tsvTable, monthTitle } from '../lib/export.js'
import { LeftIcon, RightIcon, CopyIcon, CheckIcon } from './Icons.jsx'

const TABS = [
  { id: 'list', name: 'Elenco ore' },
  { id: 'report', name: 'Compensi' },
  { id: 'table', name: 'Tabella' },
]

function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ExportView({ sessions, settings, onRestore }) {
  const [month, setMonth] = useState(monthOf(todayISO()))
  const [tab, setTab] = useState('list')
  const [copied, setCopied] = useState(false)
  const fileInput = useRef(null)

  const days = useMemo(() => daysOfMonth(month).map(date => ({
    date,
    sessions: sessions.filter(s => s.date === date),
  })), [sessions, month])

  const period = useMemo(() => computePeriod(days, settings), [days, settings])

  const text = useMemo(() => {
    if (tab === 'list') return hoursList(days)
    if (tab === 'report') return payReport(days, settings, monthTitle(month))
    return tsvTable(days, settings)
  }, [tab, days, settings, month])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for browsers without the async clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  function downloadBackup() {
    const data = { version: 1, exportedAt: new Date().toISOString(), settings, sessions }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ore-lavorate-backup-${todayISO()}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  async function loadBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.sessions)) throw new Error('formato non riconosciuto')
      if (!confirm(`Sostituire i dati attuali con ${data.sessions.length} sessioni dal backup?`)) return
      await onRestore(data)
      alert('Backup ripristinato.')
    } catch (error) {
      alert(`Impossibile leggere il file: ${error.message}`)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="view">
      <div className="cal-header">
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mese precedente">
          <LeftIcon />
        </button>
        <span className="cal-month">{monthLabel(month)}</span>
        <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mese successivo">
          <RightIcon />
        </button>
      </div>

      <div className="summary">
        <div className="summary-cell">
          <div className="label">Giorni lavorati</div>
          <div className="value">{period.days.length}</div>
        </div>
        <div className="summary-cell">
          <div className="label">Ore totali</div>
          <div className="value">{durationText(period.totalMinutes)}</div>
        </div>
        <div className="summary-cell">
          <div className="label">Di cui maggiorate</div>
          <div className="value">{durationText(period.totalMinutes - period.regularMinutes)}</div>
        </div>
        <div className="summary-cell">
          <div className="label">Compenso</div>
          <div className="value">{formatEuro(period.totalCents)}</div>
        </div>
      </div>

      <div className="segmented">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.name}
          </button>
        ))}
      </div>

      {period.days.length === 0 ? (
        <div className="empty-state">Nessuna sessione registrata in questo mese.</div>
      ) : (
        <>
          <textarea readOnly value={text} rows={16} onFocus={e => e.target.select()} />
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn" onClick={copy}>
              {copied
                ? <><CheckIcon width={18} height={18} /> Copiato</>
                : <><CopyIcon width={18} height={18} /> Copia negli appunti</>}
            </button>
          </div>
          {tab === 'table' && (
            <div className="note">Questo formato è separato da tabulazioni: incollandolo in Numbers, Excel o Fogli Google si distribuisce automaticamente nelle colonne.</div>
          )}
          {tab === 'report' && (
            <div className="note">Il report riporta in testa i parametri usati, così il calcolo resta verificabile anche a distanza di mesi.</div>
          )}
        </>
      )}

      <div className="section">
        <h3>Backup</h3>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 0 }}>
          I dati vivono solo in questo browser. Se cancelli i dati del sito o cambi dispositivo spariscono:
          il backup è l'unica rete di sicurezza.
        </p>
        <div className="actions">
          <button className="btn secondary" onClick={downloadBackup}>Scarica backup (.json)</button>
          <button className="btn secondary" onClick={() => fileInput.current?.click()}>Ripristina da backup</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={loadBackup} />
        </div>
      </div>
    </div>
  )
}
