/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import App from '../App.jsx'
import * as db from '../db.js'

// Smoke test: the app mounts, records a session and finds it again.
// It rules out a blank screen; it does not replace trying it on a phone.

describe('App', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    for (const session of await db.allSessions()) await db.deleteSession(session.id)
  })

  it('shows the current day with the add placeholder', async () => {
    render(<App />)
    expect(await screen.findByText(/Aggiungi una sessione/i)).toBeTruthy()
    const today = new Date()
    expect(screen.getByText(String(today.getDate()).padStart(2, '0'))).toBeTruthy()
  })

  it('saves a session and shows it with the day total', async () => {
    render(<App />)
    fireEvent.click(await screen.findByText(/Aggiungi una sessione/i))

    fireEvent.change(screen.getByLabelText('Inizio'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Fine'), { target: { value: '21:00' } })
    fireEvent.change(screen.getByLabelText('Luogo'), { target: { value: 'Site A' } })
    fireEvent.click(screen.getByText('Salva'))

    await waitFor(() => expect(screen.getByText('9:00–21:00')).toBeTruthy())
    expect(screen.getByText('Site A')).toBeTruthy()
    // 12 h against an 8 h threshold → overtime, and 20:00–21:00 is out of band
    expect(screen.getByText('straordinario')).toBeTruthy()
    expect(screen.getByText('fuori fascia')).toBeTruthy()
    // 8 h at base (160) + 4 h at +25% (100) = 260,00 €
    expect(screen.getByText('260,00 €')).toBeTruthy()
  })

  it('opens the calendar from the thumbnail', async () => {
    render(<App />)
    fireEvent.click(await screen.findByLabelText(/Calendario di/i))
    expect(await screen.findByText('Vai a oggi')).toBeTruthy()
  })

  it('navigates to the other views from the menu', async () => {
    render(<App />)
    fireEvent.click(await screen.findByLabelText('Apri il menu'))
    fireEvent.click(screen.getByText('Impostazioni'))
    expect(await screen.findByLabelText(/Tariffa oraria base/i)).toBeTruthy()
  })
})
