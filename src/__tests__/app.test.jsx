/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import App from '../App.jsx'
import * as db from '../db.js'

// Smoke test: l'app si monta, registra una sessione e la ritrova.
// Serve a escludere la schermata bianca, non a sostituire la prova sul telefono.

describe('App', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    const tutte = await db.tutteLeSessioni()
    for (const s of tutte) await db.eliminaSessione(s.id)
  })

  it('mostra la giornata corrente con il placeholder di aggiunta', async () => {
    render(<App />)
    expect(await screen.findByText(/Aggiungi una sessione/i)).toBeTruthy()
    const oggi = new Date()
    expect(screen.getByText(String(oggi.getDate()).padStart(2, '0'))).toBeTruthy()
  })

  it('salva una sessione e la mostra con il totale del giorno', async () => {
    render(<App />)
    fireEvent.click(await screen.findByText(/Aggiungi una sessione/i))

    fireEvent.change(screen.getByLabelText('Inizio'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Fine'), { target: { value: '21:00' } })
    fireEvent.change(screen.getByLabelText('Luogo'), { target: { value: 'Luogo B' } })
    fireEvent.click(screen.getByText('Salva'))

    await waitFor(() => expect(screen.getByText('9:00–21:00')).toBeTruthy())
    expect(screen.getByText('Luogo B')).toBeTruthy()
    // 12 h con soglia a 8 h → straordinario, e 20:00–21:00 è fuori fascia
    expect(screen.getByText('straordinario')).toBeTruthy()
    expect(screen.getByText('fuori fascia')).toBeTruthy()
    // 8 h base (160) + 4 h a +25% (100) = 260,00 €
    expect(screen.getByText('260,00 €')).toBeTruthy()
  })

  it('apre il calendario dalla miniatura e permette di cambiare giorno', async () => {
    render(<App />)
    fireEvent.click(await screen.findByLabelText(/Calendario di/i))
    expect(await screen.findByText('Vai a oggi')).toBeTruthy()
  })

  it('naviga alle altre schermate dal menu', async () => {
    render(<App />)
    fireEvent.click(await screen.findByLabelText('Apri il menu'))
    fireEvent.click(screen.getByText('Impostazioni'))
    expect(await screen.findByLabelText(/Tariffa oraria base/i)).toBeTruthy()
  })
})
