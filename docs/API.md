# Documentazione Ufficiale API REST (OpenAPI 3.1)

Le API del Registro Elettronico sono progettate secondo i principi **RESTful**, architettura **Multi-Tenant** isolata per istituto scolastico e contratti tipizzati **OpenAPI 3.1**.

## 1. Accesso e Documentazione Interattiva
Quando il servizio backend è attivo in ambiente locale o staging:
- **Swagger UI Interattivo**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **Specifiche OpenAPI JSON**: [http://localhost:4000/docs-json](http://localhost:4000/docs-json)
- **Base URL di produzione**: `https://api.registro.scuola.it/api/v1`
- **Base URL di sviluppo**: `http://localhost:4000/api/v1`

---

## 2. Standard e Convenzioni HTTP

### Autenticazione e Header
- **Bearer Token**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Tenant Context**: Il tenant dell'istituto scolastico è ricavato in modo trasparente dal claim JWT `schoolId` oppure risolto tramite sottodominio/header `X-School-Id` per gli endpoint pubblici.
- **Idempotenza**: Sugli endpoint critici di inserimento massivo (`POST /grades/bulk`, `POST /attendance/bulk`) è supportato l'header `Idempotency-Key: <UUID>` per prevenire doppi inserimenti accidentali.

### Formato degli Errori (RFC 9457 Problem Details)
Tutti gli errori HTTP restituiti dall'applicazione rispettano lo standard `application/problem+json`:
```json
{
  "type": "https://registro.scuola.it/errors/validation-failed",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "I dati inviati non rispettano le regole di validazione.",
  "instance": "/api/v1/grades",
  "timestamp": "2026-10-12T19:00:00.000Z",
  "errors": {
    "value": ["Il voto deve essere compreso tra 1 e 10"]
  }
}
```

---

## 3. Mappa Completa dei Moduli e degli Endpoint

### 3.1 Autenticazione e Sicurezza (`/auth`)
- `POST /auth/login`: Autenticazione credenziali (username/email + Argon2id), supporto 2FA TOTP (RFC 6238). Restituisce `accessToken`, `refreshToken`, `user`.
- `POST /auth/refresh`: Rotazione atomica del refresh token con blacklist SHA-256 su Redis.
- `POST /auth/logout`: Revoca immediata della sessione e invalidazione del refresh token.
- `POST /auth/activate`: Attivazione primo accesso per studenti e docenti con token monouso e consenso genitoriale per under 14.
- `POST /auth/forgot-password` e `POST /auth/reset-password`: Procedura di reimpostazione sicura password con token firmato e scadenza a 15 minuti.
- `GET /auth/me`: Profilo dell'utente connesso, ruoli, permessi e cattedre attive.
- `POST /auth/2fa/setup`: Generazione segreto TOTP cifrato AES-256-GCM con QR Code.
- `POST /auth/2fa/verify`: Validazione codice a 6 cifre e abilitazione definitiva del secondo fattore.

### 3.2 Registro Voti e Prove Didattiche (`/grades`)
- `GET /grades`: Elenco voti filtrabili per studente, materia, quadrimestre (`termId`) e tipo prova.
- `POST /grades`: Inserimento voto singolo con peso percentuale, data e visibilità immediata o differita.
- `POST /grades/bulk`: Inserimento voti per l'intera classe in un'unica transazione protetta da audit log.
- `PATCH /grades/:id`: Modifica voto entro la finestra consentita con motivazione obbligatoria.
- `DELETE /grades/:id`: Cancellazione logica (soft delete) con tracciamento immutabile per la dirigenza.
- `GET /grades/summary`: Calcolo automatico della media aritmetica e ponderata per materia e globale.

### 3.3 Presenze, Appello e Giustifiche (`/attendance`)
- `GET /attendance`: Consultazione libretto presenze, ritardi brevi e uscite anticipate.
- `POST /attendance/register`: Registrazione appello giornaliero per la classe e l'ora di lezione.
- `POST /attendance/justifications`: Presentazione giustificazione di assenza da parte del genitore/studente maggiorenne con allegato opzionale.
- `PATCH /attendance/justifications/:id/review`: Approvazione o rigetto giustifica da parte del docente coordinatore.

### 3.4 Lezioni, Argomenti e Compiti (`/lessons`, `/homework`)
- `GET /lessons`: Elenco lezioni svolte per classe e materia.
- `POST /lessons`: Firma digitale della lezione con inserimento argomenti trattati.
- `GET /homework`: Elenco compiti assegnati con data di scadenza e allegati.
- `POST /homework`: Assegnazione nuovo compito con notifica automatica alla classe.
- `PATCH /homework/:id/status`: Checklist personale di completamento per lo studente (`DONE` / `TODO`).

### 3.5 Appunti Condivisi & Materiali Didattici (`/shared-notes`, `/files`)
- `GET /shared-notes`: Catalogo appunti con ricerca full-text PostgreSQL, filtri per materia, anno e rating bayesiano.
- `POST /shared-notes`: Pubblicazione appunto in formato Markdown con formule matematiche KaTeX o file allegato.
- `GET /shared-notes/:id`: Dettaglio appunto con visualizzatore, licenza d'uso e commenti.
- `POST /shared-notes/:id/rating`: Valutazione comunitaria da 1 a 5 stelle con ponderazione bayesiana.
- `POST /shared-notes/:id/verify`: Marcatura "Verificato dal Docente" per valorizzazione accademica.
- `POST /shared-notes/:id/report`: Segnalazione per violazione copyright, contenuti inappropriati o spam.
- `POST /files/upload-url`: Generazione URL pre-firmato S3/MinIO per upload sicuro e scansione asincrona ClamAV.

### 3.6 Studio Assistito con Flashcard SM-2 (`/flashcards`)
- `GET /flashcards/decks`: Elenco mazzi di studio per materia e classe.
- `POST /flashcards/decks`: Creazione nuovo mazzo di flashcard.
- `POST /flashcards/decks/:id/cards`: Aggiunta scheda con fronte, retro e suggerimento opzionale.
- `GET /flashcards/decks/:id/due`: Estrazione delle sole schede in scadenza per il ripasso giornaliero.
- `POST /flashcards/cards/:id/review`: Valutazione qualità memorizzazione (grado 0-5) con ricalcolo intervallo SM-2 e fattore di facilità (`easeFactor >= 1.3`).

### 3.7 Scrutini, Pagelle e Report PDF (`/reports`)
- `GET /reports/report-card/:studentId`: Generazione in tempo reale della Scheda di Valutazione Periodica Ufficiale (Pagella PDF) con medie ponderate, presenze e firma del Dirigente Scolastico.
- `GET /reports/class-board/:classId`: Generazione Tabellone Voti di Classe in formato PDF orizzontale (Landscape) con matrice studenti x materie.

### 3.8 Comunicazioni, Colloqui e Notifiche (`/announcements`, `/meetings`, `/notifications`, `/events`)
- `GET /announcements`: Bacheca circolari e avvisi scolastici con presa visione obbligatoria.
- `GET /meetings/slots`: Disponibilità oraria dei docenti per i colloqui con i genitori.
- `POST /meetings/bookings`: Prenotazione appuntamento con gestione capienza e link stanza virtuale.
- `GET /notifications`: Feed notifiche in-app dell'utente.
- `GET /events`: Canale Server-Sent Events (SSE) in tempo reale per recapito istantaneo di eventi e keep-alive.
- `GET /calendar/feed.ics`: Feed iCalendar conforme RFC 5545 per sincronizzazione automatica lezioni ed esami.

### 3.9 Gestione Amministrativa e Audit (`/admin`, `/audit-logs`)
- `GET /admin/users` e `POST /admin/users`: Gestione account della scuola (CRUD, sospensione, reset credenziali).
- `POST /admin/users/import-csv`: Import massivo utenti e classi con generazione automatica matricole e credenziali.
- `GET /audit-logs`: Registro immutabile delle operazioni sensibili (chi ha fatto cosa, quando, da quale IP).
- `GET /audit-logs/export-csv`: Esportazione forense in formato RFC 4180 CSV per ispezioni e conformità legale.

### 3.10 Privacy e Portabilità Dati GDPR (`/users/me/export`)
- `GET /users/me/export`: Esportazione fascicolo digitale interoperabile in formato JSON ai sensi dell'Art. 20 GDPR.
- `GET /app-config`: Endpoint di configurazione client per versioning, kill-switch e feature flags.
