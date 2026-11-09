# Ore lavorate

PWA per registrare le sessioni di lavoro, calcolare il compenso con maggiorazioni
e produrre l'elenco ore da incollare in fattura.

**I dati non lasciano mai il dispositivo.** Nessun server, nessun account, nessuna
sincronizzazione: le sessioni vivono in IndexedDB, nel browser che le ha scritte.

---

## Avvio

```bash
npm install
npm run dev      # sviluppo
npm test         # test del motore di calcolo
npm run build    # build di produzione in dist/
```

## Pubblicazione su GitHub Pages

Il codice deve stare online perché il telefono possa scaricarlo *la prima volta*.
Dopo di che funziona offline: il service worker serve tutto dalla cache.

1. Crea un repository (il nome predefinito atteso è `ore-lavorate`; se ne usi un
   altro, il workflow lo rileva da solo).
2. Impostazioni del repo → Pages → Source: **GitHub Actions**.
3. `git push` su `main`. Il workflow in `.github/workflows/deploy.yml` esegue i
   test, costruisce e pubblica.
4. Dal telefono apri l'URL una volta, poi **Condividi → Aggiungi a schermata Home**.

Il codice sarà pubblico, ma non contiene nulla di tuo: solo logica di calcolo.
Se preferisci tenerlo privato, un repo privato su Netlify o Vercel dà un URL non
indicizzato con lo stesso risultato.

---

## Come è fatta

```
src/
  lib/
    time.js      date e orari come stringhe, durate, scavallamento mezzanotte
    denaro.js    importi in centesimi interi
    calc.js      motore di calcolo: sessione → giorno → periodo   ← il cuore
    esporta.js   generazione dei testi da copiare
    __tests__/   32 test, soprattutto sui casi limite
  components/    interfaccia (vista giorno, calendario, form, export, impostazioni)
  db.js          IndexedDB
  App.jsx        stato e navigazione
```

### Tre livelli di calcolo

- **Sessione**: una fascia di lavoro continua. Può scavallare la mezzanotte.
- **Giorno**: più sessioni insieme. È il livello a cui si applica la soglia delle
  ore giornaliere, che quindi *attraversa* le sessioni (8 h al mattino + 4 h la
  sera = 4 h di straordinario, anche se nessuna delle due sessioni da sola supera
  la soglia).
- **Periodo**: l'aggregazione mensile per il report.

Una sessione appartiene al giorno in cui **inizia**: 19:30–01:00 del 21 ottobre è
tutta del 21.

### Due scelte tecniche che evitano bug classici

**Date e orari sono stringhe**, non oggetti `Date`. Usare timestamp significa
trascinarsi dietro fuso orario e ora legale, con bug che compaiono solo nei due
weekend di marzo e ottobre.

**Gli importi sono interi in centesimi.** In virgola mobile `0.1 + 0.2 !== 0.3`:
su una fattura diventa un centesimo di scarto inspiegabile. L'arrotondamento
avviene una volta sola, sul singolo segmento di calcolo.

### Maggiorazioni

Due cause indipendenti, impostabili:

- **fuori fascia** — ore al di fuori dell'intervallo a tariffa base (es. prima
  delle 8:00 o dopo le 20:00);
- **straordinario** — ore oltre la soglia giornaliera.

Un'ora può ricadere in entrambe. La regola di **cumulo** decide cosa succede:

| Regola | +25% e +25% danno |
|---|---|
| massima (predefinita) | +25% |
| somma | +50% |
| composto | +56,25% |

Scegli quella concordata con il committente. Il report riporta sempre in testa i
parametri usati, così il calcolo resta verificabile a distanza di mesi.

---

## Export

Tre formati, tutti con un pulsante di copia:

1. **Elenco ore** — il formato per la fattura:
   ```
   21/10/2026 (C.P. Fabrizio Frizzi + Teulada)
   Ore lavorate: 12 (9:00-17:00 + 19:30-23:30)
   Mansione: P
   ```
2. **Compensi** — il calcolo scomposto giorno per giorno, con i parametri in testa.
3. **Tabella** — separata da tabulazioni, si incolla in Numbers, Excel o Fogli Google.

---

## Backup

I dati stanno nello storage del browser. Se cancelli i dati del sito, cambi
telefono o iOS libera spazio, spariscono. L'app chiede al browser lo storage
persistente, ma su iOS non è garantito.

**Scarica il backup JSON a fine mese**, insieme al report. È in fondo alla
schermata Export, con il ripristino accanto.

---

## Limiti noti

- Le impostazioni sono un set unico, applicato anche ai mesi passati. Se cambi la
  tariffa, i report precedenti cambiano. Il passo successivo naturale è congelare
  i parametri nella sessione al momento del salvataggio.
- Le pause non sono gestite: 12:00–16:00 vale 4 ore piene.
- Le sessioni sovrapposte vengono segnalate ma contate entrambe.
