# Ore lavorate

A PWA for logging work sessions, computing pay with surcharges, and producing a
monthly summary to paste into an invoice.

**Data never leaves the device.** No server, no account, no sync: sessions live in
IndexedDB, in the browser that wrote them.

## Setup

```bash
npm install
npm run dev      # development server
npm test         # calculation engine tests
npm run build    # production build into dist/
```

## Deployment

The code has to be online so the phone can fetch it the first time. After that it
runs offline from the service worker cache.

1. Push to a GitHub repository.
2. Repo settings → Pages → Source: **GitHub Actions**.
3. `.github/workflows/deploy.yml` runs tests, builds and deploys on every push to
   `main`. The base path is derived from the repository name, so any name works.
4. Open the URL once on the phone, then add it to the home screen. On iOS this
   requires Safari.

Pages on a private repository needs a paid plan; Netlify and Vercel publish from
private repositories for free.

Note that IndexedDB is scoped to the origin. Changing the hosting domain means a
different origin and an empty database, so either settle the domain before logging
real hours or move the data with a JSON backup.

## Structure

```
src/
  lib/
    time.js      dates and times as strings, durations, midnight crossing
    denaro.js    amounts as integer cents
    calc.js      calculation engine: session → day → period
    esporta.js   export text generation
    __tests__/   32 tests, mostly edge cases
  components/    UI (day view, calendar, session form, export, settings)
  db.js          IndexedDB
  App.jsx        state and navigation
```

## Calculation model

Three levels:

- **Session** — one continuous stretch of work. May cross midnight.
- **Day** — several sessions together. The daily hour threshold applies here, so it
  cuts *across* sessions: two separate sessions can trigger overtime even when
  neither exceeds the threshold alone.
- **Period** — monthly aggregation for the report.

A session belongs to the day it **starts** in, even when it ends after midnight.

### Two decisions that avoid classic bugs

**Dates and times are strings**, not `Date` objects. Timestamps drag in time zones
and DST, producing bugs that only surface on two weekends a year.

**Amounts are integer cents.** In floating point `0.1 + 0.2 !== 0.3`, which on an
invoice becomes an unexplainable one-cent discrepancy. Rounding happens once, per
calculated segment.

### Surcharges

Two independent causes, both configurable:

- **out of band** — hours outside the base-rate time window;
- **overtime** — hours past the daily threshold.

An hour can fall under both. The **combination rule** decides what happens:

| Rule | +25% and +25% yield |
|---|---|
| maximum (default) | +25% |
| sum | +50% |
| compound | +56.25% |

Pick the one agreed with the client. The report always states the parameters used,
so a calculation stays verifiable months later.

Overtime is chronologically the **last** part of the day, not an abstract quantity
subtracted from the total.

## Export

Three formats, each with a copy button:

1. **Hours list** — the invoice format, one block per day:
   ```
   DD/MM/YYYY (location)
   Ore lavorate: H (HH:MM-HH:MM)
   Mansione: code
   ```
   Multiple sessions on one day are merged with `+`.
2. **Pay report** — the calculation broken down per day, parameters on top.
3. **Table** — tab-separated, pastes straight into a spreadsheet.

## Backup

Data sits in browser storage. Clearing site data, switching devices, or iOS
reclaiming space wipes it. The app requests persistent storage, but iOS gives no
guarantee.

Download the JSON backup alongside the monthly report. Restore is next to it in the
export screen.

## Known limits

- Settings are a single set applied retroactively, so changing the rate changes past
  reports. The natural next step is freezing the parameters into each session on
  save; the engine already takes settings as an argument.
- Breaks are not modelled: a session counts in full.
- Overlapping sessions are flagged but counted twice.
