/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'

// Regression test: a database created by an earlier version of the app, with
// the store still named 'sessioni', must be upgraded rather than left broken.
// Without the version bump every transaction failed with
// "'sessions' is not a known object store name" and the screen stayed blank.

describe('upgrading from the legacy schema', () => {
  it('opens a pre-existing v1 database and creates the renamed store', async () => {
    // Recreate the old database exactly as the previous version left it.
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('ore-lavorate', 1)
      request.onupgradeneeded = () => {
        const db = request.result
        const store = db.createObjectStore('sessioni', { keyPath: 'id' })
        store.createIndex('data', 'data')
        db.createObjectStore('config')
      }
      request.onsuccess = () => { request.result.close(); resolve() }
      request.onerror = () => reject(request.error)
    })

    // Importing the module fresh makes it open the database itself.
    const db = await import('../db.js?legacy-upgrade')

    await expect(db.allSessions()).resolves.toEqual([])

    const session = {
      id: 'x1', date: '2026-11-09', startTime: '09:00', endTime: '17:00',
      location: 'Site A', task: 'P', notes: '',
    }
    await db.saveSession(session)
    await expect(db.allSessions()).resolves.toEqual([session])
  })
})
