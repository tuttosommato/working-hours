import { TodayIcon, ExportIcon, SettingsIcon } from './Icons.jsx'

const ITEMS = [
  { id: 'day', label: 'Giornata', Icon: TodayIcon },
  { id: 'export', label: 'Export e report', Icon: ExportIcon },
  { id: 'settings', label: 'Impostazioni', Icon: SettingsIcon },
]

export default function Menu({ view, onView, onClose }) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <nav className="drawer">
        <div className="drawer-title">Ore lavorate</div>
        {ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`drawer-item${view === id ? ' active' : ''}`}
            onClick={() => { onView(id); onClose() }}
          >
            <Icon width={19} height={19} />
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}
