import { IconaOggi, IconaExport, IconaImpostazioni } from './Icone.jsx'

const VOCI = [
  { id: 'giorno', etichetta: 'Giornata', Icona: IconaOggi },
  { id: 'export', etichetta: 'Export e report', Icona: IconaExport },
  { id: 'impostazioni', etichetta: 'Impostazioni', Icona: IconaImpostazioni },
]

export default function Menu({ vista, onVista, onChiudi }) {
  return (
    <>
      <div className="velo" onClick={onChiudi} />
      <nav className="drawer">
        <div className="drawer-titolo">Ore lavorate</div>
        {VOCI.map(({ id, etichetta, Icona }) => (
          <button
            key={id}
            className={`voce${vista === id ? ' attiva' : ''}`}
            onClick={() => { onVista(id); onChiudi() }}
          >
            <Icona width={19} height={19} />
            {etichetta}
          </button>
        ))}
      </nav>
    </>
  )
}
