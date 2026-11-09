import { useEffect, useMemo, useState, useCallback } from 'react'
import * as db from './db.js'
import { IMPOSTAZIONI_DEFAULT } from './lib/calc.js'
import { oggiISO, addGiorni, etichettaMese, meseDi } from './lib/time.js'
import VistaGiorno from './components/VistaGiorno.jsx'
import VistaExport from './components/VistaExport.jsx'
import VistaImpostazioni from './components/VistaImpostazioni.jsx'
import FormSessione from './components/FormSessione.jsx'
import Calendario, { MiniCalendario } from './components/Calendario.jsx'
import Menu from './components/Menu.jsx'
import { IconaMenu } from './components/Icone.jsx'

export default function App() {
  const [pronto, setPronto] = useState(false)
  const [sessioni, setSessioni] = useState([])
  const [imp, setImp] = useState(IMPOSTAZIONI_DEFAULT)
  const [data, setData] = useState(oggiISO())
  const [vista, setVista] = useState('giorno')
  const [menuAperto, setMenu] = useState(false)
  const [calAperto, setCal] = useState(false)
  const [form, setForm] = useState(null)   // null | {} (nuova) | sessione

  useEffect(() => {
    (async () => {
      const [s, c] = await Promise.all([db.tutteLeSessioni(), db.leggiConfig('impostazioni')])
      setSessioni(s)
      if (c) setImp({ ...IMPOSTAZIONI_DEFAULT, ...c })
      setPronto(true)
      db.richiediPersistenza()
    })()
  }, [])

  const sessioniDelGiorno = useMemo(
    () => sessioni.filter(s => s.data === data), [sessioni, data])

  const giorniConSessioni = useMemo(
    () => new Set(sessioni.map(s => s.data)), [sessioni])

  const luoghiNoti = useMemo(() => [...new Set(
    sessioni.map(s => s.luogo).filter(Boolean))].sort(), [sessioni])

  const mansioniNote = useMemo(() => [...new Set(
    sessioni.map(s => s.mansione).filter(Boolean))].sort(), [sessioni])

  const salvaSessione = useCallback(async (s) => {
    const completa = s.id ? s : { ...s, id: db.nuovoId() }
    await db.salvaSessione(completa)
    setSessioni(prec => {
      const i = prec.findIndex(x => x.id === completa.id)
      if (i === -1) return [...prec, completa]
      const copia = [...prec]
      copia[i] = completa
      return copia
    })
    setForm(null)
  }, [])

  const eliminaSessione = useCallback(async (id) => {
    await db.eliminaSessione(id)
    setSessioni(prec => prec.filter(s => s.id !== id))
    setForm(null)
  }, [])

  const salvaImpostazioni = useCallback(async (nuove) => {
    setImp(nuove)
    await db.scriviConfig('impostazioni', nuove)
  }, [])

  const ripristina = useCallback(async (dati) => {
    await db.ripristina(dati)
    setSessioni(dati.sessioni)
    if (dati.impostazioni) setImp({ ...IMPOSTAZIONI_DEFAULT, ...dati.impostazioni })
  }, [])

  // Frecce della tastiera: comode su iPad e desktop
  useEffect(() => {
    if (vista !== 'giorno' || form || calAperto || menuAperto) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setData(d => addGiorni(d, -1))
      if (e.key === 'ArrowRight') setData(d => addGiorni(d, 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [vista, form, calAperto, menuAperto])

  if (!pronto) return <div className="app" />

  return (
    <div className="app">
      <div className="barra">
        <button className="icona-btn" onClick={() => setMenu(true)} aria-label="Apri il menu">
          <IconaMenu />
        </button>

        <span className="barra-titolo">
          {vista === 'giorno' ? '' : vista === 'export' ? 'Export e report' : 'Impostazioni'}
        </span>

        {vista === 'giorno' ? (
          <button onClick={() => setCal(true)} aria-label={`Calendario di ${etichettaMese(meseDi(data))}`}>
            <MiniCalendario dataCorrente={data} giorniConSessioni={giorniConSessioni} />
          </button>
        ) : <div style={{ width: 42 }} />}
      </div>

      {vista === 'giorno' && (
        <VistaGiorno
          data={data}
          sessioni={sessioniDelGiorno}
          imp={imp}
          onApriForm={setForm}
          onCambiaGiorno={(n) => setData(d => addGiorni(d, n))}
        />
      )}

      {vista === 'export' && (
        <VistaExport sessioni={sessioni} imp={imp} onRipristina={ripristina} />
      )}

      {vista === 'impostazioni' && (
        <VistaImpostazioni imp={imp} onSalva={salvaImpostazioni} />
      )}

      {menuAperto && (
        <Menu vista={vista} onVista={setVista} onChiudi={() => setMenu(false)} />
      )}

      {calAperto && (
        <Calendario
          dataCorrente={data}
          giorniConSessioni={giorniConSessioni}
          onScegli={setData}
          onChiudi={() => setCal(false)}
        />
      )}

      {form && (
        <FormSessione
          sessione={form}
          data={data}
          luoghiNoti={luoghiNoti}
          mansioniNote={mansioniNote}
          onSalva={salvaSessione}
          onElimina={eliminaSessione}
          onChiudi={() => setForm(null)}
        />
      )}
    </div>
  )
}
