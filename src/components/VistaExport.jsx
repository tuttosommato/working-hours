import { useState, useMemo, useRef } from 'react'
import { giorniDelMese, etichettaMese, meseDi, oggiISO, durataTesto } from '../lib/time.js'
import { euro } from '../lib/denaro.js'
import { calcolaPeriodo } from '../lib/calc.js'
import { elencoOre, reportCompensi, tabellaTSV, titoloMese } from '../lib/esporta.js'
import { IconaSinistra, IconaDestra, IconaCopia, IconaOk } from './Icone.jsx'

const SCHEDE = [
  { id: 'elenco', nome: 'Elenco ore' },
  { id: 'report', nome: 'Compensi' },
  { id: 'tabella', nome: 'Tabella' },
]

function spostaMese(mese, n) {
  const [y, m] = mese.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function VistaExport({ sessioni, imp, onRipristina }) {
  const [mese, setMese] = useState(meseDi(oggiISO()))
  const [scheda, setScheda] = useState('elenco')
  const [copiato, setCopiato] = useState(false)
  const fileRef = useRef(null)

  const giorni = useMemo(() => giorniDelMese(mese).map(data => ({
    data,
    sessioni: sessioni.filter(s => s.data === data),
  })), [sessioni, mese])

  const p = useMemo(() => calcolaPeriodo(giorni, imp), [giorni, imp])

  const testo = useMemo(() => {
    if (scheda === 'elenco') return elencoOre(giorni)
    if (scheda === 'report') return reportCompensi(giorni, imp, titoloMese(mese))
    return tabellaTSV(giorni, imp)
  }, [scheda, giorni, imp, mese])

  async function copia() {
    try {
      await navigator.clipboard.writeText(testo)
    } catch {
      // Fallback per i browser che non espongono la clipboard async
      const ta = document.createElement('textarea')
      ta.value = testo
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopiato(true)
    setTimeout(() => setCopiato(false), 1800)
  }

  function scaricaBackup() {
    const dati = { versione: 1, esportatoIl: new Date().toISOString(), impostazioni: imp, sessioni }
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ore-lavorate-backup-${oggiISO()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  async function caricaBackup(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dati = JSON.parse(await file.text())
      if (!Array.isArray(dati.sessioni)) throw new Error('formato non riconosciuto')
      if (!confirm(`Sostituire i dati attuali con ${dati.sessioni.length} sessioni dal backup?`)) return
      await onRipristina(dati)
      alert('Backup ripristinato.')
    } catch (err) {
      alert(`Impossibile leggere il file: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="vista">
      <div className="cal-testa">
        <button className="icona-btn" onClick={() => setMese(spostaMese(mese, -1))} aria-label="Mese precedente">
          <IconaSinistra />
        </button>
        <span className="cal-mese">{etichettaMese(mese)}</span>
        <button className="icona-btn" onClick={() => setMese(spostaMese(mese, 1))} aria-label="Mese successivo">
          <IconaDestra />
        </button>
      </div>

      <div className="riepilogo">
        <div className="cella-riep">
          <div className="et">Giorni lavorati</div>
          <div className="vl">{p.giorni.length}</div>
        </div>
        <div className="cella-riep">
          <div className="et">Ore totali</div>
          <div className="vl">{durataTesto(p.minutiTotali)}</div>
        </div>
        <div className="cella-riep">
          <div className="et">Di cui maggiorate</div>
          <div className="vl">{durataTesto(p.minutiTotali - p.minutiOrdinari)}</div>
        </div>
        <div className="cella-riep">
          <div className="et">Compenso</div>
          <div className="vl">{euro(p.totaleCent)}</div>
        </div>
      </div>

      <div className="segmentato">
        {SCHEDE.map(s => (
          <button key={s.id} className={scheda === s.id ? 'attivo' : ''} onClick={() => setScheda(s.id)}>
            {s.nome}
          </button>
        ))}
      </div>

      {p.giorni.length === 0 ? (
        <div className="vuoto-stato">Nessuna sessione registrata in questo mese.</div>
      ) : (
        <>
          <textarea readOnly value={testo} rows={16} onFocus={e => e.target.select()} />
          <div className="azioni" style={{ marginTop: 12 }}>
            <button className="btn" onClick={copia}>
              {copiato ? <><IconaOk width={18} height={18} /> Copiato</> : <><IconaCopia width={18} height={18} /> Copia negli appunti</>}
            </button>
          </div>
          {scheda === 'tabella' && (
            <div className="nota">Questo formato è separato da tabulazioni: incollandolo in Numbers, Excel o Fogli Google si distribuisce automaticamente nelle colonne.</div>
          )}
          {scheda === 'report' && (
            <div className="nota">Il report riporta in testa i parametri usati, così il calcolo resta verificabile anche a distanza di mesi.</div>
          )}
        </>
      )}

      <div className="sezione">
        <h3>Backup</h3>
        <p style={{ fontSize: 14, color: 'var(--inchiostro-3)', marginTop: 0 }}>
          I dati vivono solo in questo browser. Se cancelli i dati del sito o cambi dispositivo spariscono:
          il backup è l'unica rete di sicurezza.
        </p>
        <div className="azioni">
          <button className="btn secondario" onClick={scaricaBackup}>Scarica backup (.json)</button>
          <button className="btn secondario" onClick={() => fileRef.current?.click()}>Ripristina da backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={caricaBackup} />
        </div>
      </div>
    </div>
  )
}
