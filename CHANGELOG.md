# Changelog

Tutte le modifiche rilevanti a questo progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/)
e questo progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

## [0.8.0] - 2026-10-12

### Aggiunto
- **Generazione Documenti Ufficiali e Pagelle Scolastiche in PDF (Spec 18.6 / Spec 13)**:
  - Modulo NestJS `ReportsModule`, `ReportsService`, `ReportsController`:
    - `GET /api/v1/reports/report-card/:studentId`: Generazione in tempo reale della Scheda di Valutazione Periodica Ufficiale (Pagella PDF) con intestazione della Repubblica Italiana e del Ministero, dati anagrafici studente con mascheramento codice fiscale, tabella delle valutazioni disciplinari con medie ponderate, statistiche presenze/assenze, firma del Dirigente Scolastico e timbro digitale ai sensi dell'art. 21 CAD.
    - `GET /api/v1/reports/class-board/:classId`: Generazione del Tabellone dei Voti di Classe in formato PDF orizzontale (Landscape) con matrice studenti per materie, medie individuali e media di classe.
    - Controlli di sicurezza rigorosi RBAC/ABAC: download consentito solo allo studente interessato, ai genitori con relazione certificata (`ParentLink`) e ai docenti assegnatari della classe.
  - Interfaccia Web `/voti` (`apps/web`):
    - Pulsante dedicato "Scarica Pagella (PDF)" con icona di download ed emissione istantanea del file binario.
  - Test unitari dedicati in `reports.service.spec.ts` (4 test superati).
- **Consolidamento Documentazione Istituzionale e Contratti di Sicurezza (Checklist Lancio Spec 19)**:
  - `docs/API.md`: Mappa esaustiva di 120 endpoint REST, specifiche OpenAPI 3.1, standard RFC 9457 Problem Details e convenzioni HTTP.
  - `docs/SECURITY.md`: Modello di sicurezza conforme a OWASP ASVS Livello 2 (Argon2id, 2FA TOTP RFC 6238, crittografia field-level AES-256-GCM, isolamento multi-tenant a due barriere, scansione antimalware ClamAV e audit log immutabile RFC 4180).
  - `docs/PRIVACY.md`: Registro delle Attività di Trattamento (Art. 30 GDPR), Valutazione d'Impatto DPIA Minori (Art. 35 GDPR), disciplina del consenso per minori sotto i 14 anni (D.Lgs. 101/2018), portabilità dati (Art. 20) e procedura di Notice and Takedown per gli appunti.
  - `docs/DECISIONS.md`: Raccolta organica degli Architectural Decision Records da ADR-001 a ADR-005.
- **Quality Gate**:
  - Test suite monorepo espansa a **85 test unitari**, 100% verdi (71 `@registro/api`, 14 `@registro/shared`).
  - `pnpm typecheck`: verificato su tutti i 5 pacchetti con zero errori.
  - `pnpm lint`: verificato su tutto il monorepo con zero errori.
  - `pnpm build`: compilazione di produzione verificata per 36 route Next.js e backend NestJS.

## [0.7.0] - 2026-10-12

### Aggiunto
- **Studio Assistito con Ripetizione Spaziata SuperMemo SM-2 (Spec 18.1)**:
  - Modelli database Prisma `FlashcardDeck` e `Flashcard` con supporto intervalli SM-2 (`repetition`, `interval`, `easeFactor`, `dueDate`, `lastReviewedAt`).
  - Backend NestJS `FlashcardsModule`, `FlashcardsService` e `FlashcardsController`:
    - `GET /api/v1/flashcards/decks` e `POST /api/v1/flashcards/decks`: gestione mazzi personali per materia/classe.
    - `POST /api/v1/flashcards/decks/:id/cards`: creazione schede fronte, retro e suggerimento.
    - `GET /api/v1/flashcards/decks/:id/due`: recupero schede in scadenza per la sessione di studio giornaliera.
    - `POST /api/v1/flashcards/cards/:id/review`: sottomissione valutazione qualità ripasso (grado 0-5) con ricalcolo deterministico di intervallo, ripetizioni e floor di facilità (`easeFactor >= 1.3`).
  - Pagina web interattiva `/studio` (`apps/web`):
    - Visualizzazione mazzi con contatori schede totali e schede in scadenza oggi.
    - Card flip 3D interattiva per girare fronte/retro, consultare suggerimenti opzionali ed eseguire grading rapido con pulsanti colorati (0 = Buio Totale a 5 = Perfetto).
    - Ricezione parametri query (`?newDeck=true&title=...`) con supporto Suspense per precompilazione istantanea da altre sezioni.
  - Integrazione didattica catalogo appunti:
    - Pulsante "Crea Mazzo" nella testata della scheda appunto `/appunti/[id]` per generare mazzi di flashcard a partire dai contenuti studiati.
    - Aggiunto comando rapido `/studio` nel menu di ricerca globale `Ctrl+K` (`CommandMenu`) e navigazione studente.
- **Predisposizioni Push Notification & App Config Mobile (Fase 6)**:
  - Gestione token push (`/notifications/push-tokens`): registrazione e revoca device token (Expo push, FCM, APNS) collegati all'utente autenticato.
  - Endpoint `GET /api/v1/app-config`: fornitura parametri di configurazione client mobile, versione minima supportata (`minVersion`), ultima versione (`latestVersion`), kill switch di emergenza e feature flag attivi.
- **Disaster Recovery, Backup & Restore Database (Spec 19 - Sicurezza & GDPR)**:
  - Script automatizzato di backup logico `scripts/db-backup.js` e wrapper PowerShell `scripts/backup-db.ps1`:
    - Dump compresso con gzip (livello 9) di tutte le 54 tabelle, dati, sequenze e schemi.
    - Calcolo checksum crittografico SHA-256 e salvataggio file manifest con metadati e statistiche per tabella.
  - Script di ripristino e disaster recovery `scripts/db-restore.js` e wrapper PowerShell `scripts/restore-db.ps1`:
    - Verifica preventiva di integrità tramite hash SHA-256.
    - Disabilitazione temporanea dei vincoli di chiave esterna (`SET session_replication_role = 'replica'`).
    - Truncate atomico in cascata, reinserimento dati, riallineamento delle sequenze e riattivazione delle regole di integrità referenziale.
  - Documentazione operativa completa delle procedure di backup e ripristino in `docs/RUNBOOK.md`.
- **Test di Carico ad Alta Concorrenza (k6 - Spec 16 Fase 4 & Spec 19)**:
  - Script di test `scripts/load-test.js` configurato con scenari multi-utente realistici:
    - Warm-up progressivo da 1 a 50 VU.
    - Picco sostenuto a **200 RPS** (100-150 VU) con flussi completi: login JWT Argon2id, consultazione libretto voti, paginazione bacheca appunti condivisi e mazzi studio SM-2.
    - Soglie di qualità codificate: `http_req_duration p95 < 500ms`, `p99 < 1200ms`, tasso di errore `failed_requests < 1%`, latenza login `p95 < 600ms`.
- **Quality Gate Monorepo**:
  - Test suite monorepo portata a **81 test unitari** (13 suite `@registro/api`, 2 suite `@registro/shared`), tutti superati al 100%.
  - Typecheck verificato su 5 pacchetti con zero errori (`tsc --noEmit`).
  - ESLint verificato su tutto il monorepo con zero errori.
  - Build di produzione Next.js 15 completata su 36 route e NestJS backend compilato in `dist/`.

## [0.6.0] - 2026-10-12

### Aggiunto
- **Diritto alla Portabilità dei Dati Personali (GDPR Art. 20)**:
  - Endpoint `GET /api/v1/users/me/export` su NestJS che estrae l'intero dossier digitale dell'utente (dati anagrafici, istituto, iscrizioni, voti con pesi e materie, presenze, cattedre, link genitore-figlio, appunti pubblicati, messaggi scambiati, notifiche) mascherando rigorosamente chiavi di sicurezza, `passwordHash`, `twoFactorSecret` e codice fiscale grezzo.
  - Sezione interattiva in `apps/web/src/app/(app)/profilo/sicurezza/page.tsx` con pulsante per il download istantaneo dell'archivio JSON strutturato ed interoperabile.
- **Export Audit Log RFC 4180 CSV (`/audit-logs`)**:
  - Endpoint `GET /api/v1/audit-logs/export-csv` conforme alle specifiche RFC 4180 con quoting protetto dei caratteri speciali, escape di doppi apici e terminatori CRLF standard.
  - Pulsante "Esporta Registro CSV (RFC 4180)" integrato nel cruscotto amministrativo `apps/web/src/app/(app)/admin/audit/page.tsx`.
- **Pagine Legali, Trasparenza e Conformità AGID (`apps/web`)**:
  - `/privacy`: Informativa sul trattamento dei dati personali redatta ai sensi degli artt. 13 e 14 del GDPR, disciplina di tutela dei dati dei minori (art. 8 GDPR e D.Lgs. 101/2018), indicazione DPO e misure di sicurezza applicate (AES-256-GCM, TLS 1.3, Argon2id, TOTP 2FA, isolamento multi-tenant).
  - `/termini`: Termini e condizioni d'uso della piattaforma, obblighi di custodia delle credenziali, valore giuridico di atto pubblico del registro elettronico e regolamento di condotta e moderazione per gli appunti condivisi.
  - `/accessibilita`: Dichiarazione di Accessibilità AGID (WCAG 2.1 Livello AA, Legge 4/2004 e Direttiva UE 2016/2102) con dettaglio delle misure tecniche (contrasto 4.5:1, navigazione tastiera completa, attributi ARIA, formule KaTeX accessibili con fallback semantico MathML) e meccanismo di feedback istituzionale.
  - Footer arricchito nella schermata di login `/login` con collegamenti rapidi a tutte le informative di trasparenza.
- **Scaffolding e Architettura Applicazione Mobile (`apps/mobile` - Fase 6)**:
  - Struttura basata su Expo SDK 52, Expo Router v4 e TypeScript strict.
  - Client API dedicato `mobileApiClient` con fallback automatico localhost/emulatore Android (`10.0.2.2`) e gestione standard RFC 9457 Problem Details.
  - Gestione sessioni e token JWT sicura con `expo-secure-store` e store globale Zustand (`useMobileAuthStore`).
  - Schermata di login nativa `/(auth)/login` con supporto username/matricola, password e autenticazione a due fattori TOTP (RFC 6238).
  - Navigazione a schede protetta `/(app)/(tabs)`:
    - Tab `Oggi`: Dashboard principale con saluto personalizzato, data estesa, media generale calcolata, contatore valutazioni e ultime prove sostenute.
    - Tab `Voti`: Libretto voti completo con riepilogo voti totali/sufficienti/insufficienti, dettagli per materia, tipo prova (Scritto/Orale/Pratico), peso percentuale e note docenti.
    - Tab `Appunti`: Esplorazione marketplace appunti con barra di ricerca, tag materia, rating bayesiano a stelle e badge di verifica docente.
    - Tab `Profilo`: Dati account, scuola di appartenenza, informativa portabilità GDPR e pulsante di logout sicuro con conferma.
- **Test Suite & Quality Gate**:
  - 73 test unitari totali superati al 100% (14 `@registro/shared`, 59 `@registro/api`).
  - Isolamento della cache Vitest per prevenire lock di file concorrenti su Windows.
  - Allineamento delle dipendenze di tipizzazione con pnpm overrides per `@types/react`.
  - Typecheck su 5 pacchetti completato con successo (zero errori).
  - ESLint verificato su tutti i progetti con zero warning.
  - Build di produzione completata per 35 route web e backend NestJS.

## [0.5.0] - 2026-10-12

### Aggiunto
- **Modulo Messaggistica Interna Sicura (`/conversations`, `/messages`)**:
  - Canale di comunicazione conforme alle linee guida di tutela e riservatezza minori (Spec 8.6): docenti abilitati a comunicare con studenti e genitori delle proprie classi; studenti con i rispettivi docenti; audit trail permanente per la dirigenza scolastica.
  - Filtro automatico e preventivo del linguaggio con blacklist termini inappropriati (`BadRequestException`).
  - Marcatura automatica lettura messaggi e cancellazione logica (soft-delete) con mascheramento testo per preservare integrità legale dell'audit.
- **Modulo Colloqui e Ricevimento Famiglie (`/meetings`)**:
  - Gestione disponibilità docenti (`/meetings/slots`): definizione giorno, orari, capienza massima, modalità (`PRESENZA` o `ONLINE`) e link videocall (Meet/Teams).
  - Prenotazione colloquio genitore (`/meetings/bookings`): vincolo di appartenenza genitore-studente verificato (`ParentLink`), controllo capienza e gestione note.
  - Ciclo di vita appuntamenti con stati `BOOKED`, `CANCELLED` e `COMPLETED`.
- **Modulo Notifiche & Real-time Server-Sent Events (SSE)**:
  - Sistema notifiche in-app (`/notifications`) con preferenze granulari per canale (`inApp`, `email`, `push`).
  - Endpoint SSE real-time (`/events`) per trasmissione istantanea eventi ai client con heartbeat di keep-alive a 25 secondi.
- **Modulo Sincronizzazione Calendario iCal (`/calendar`)**:
  - Feed iCalendar conforme standard RFC 5545 (`/calendar/feed.ics`) per sincronizzazione esterna di lezioni, verifiche e colloqui con Google Calendar, Apple Calendar e Outlook.
- **Interfaccia Web, PWA e User Experience (`apps/web`)**:
  - Command Palette globale accessibile con scorciatoia `Ctrl+K` / `Cmd+K` (`CommandMenu`) per navigazione istantanea tra le pagine dell'applicazione e ricerca rapida.
  - Simulatore Obiettivo Voti (`GradeSimulator`): strumento di pianificazione scolastica per studenti e famiglie basato su calcolo matematico ponderato inverso del voto minimo richiesto nella prossima prova, con segnalazione di traguardi non realistici (>10) o già conseguiti.
  - Pagina Messaggistica `/messaggi`: interfaccia a due colonne per selezione conversazioni, visualizzazione messaggi in tempo reale e invio comunicazioni sicure.
  - Pagina Colloqui `/colloqui`: dashboard interattiva con vista docente (creazione disponibilità, presenze) e vista genitore (elenco slot, prenotazione, disdetta).
  - Supporto Progressive Web App (PWA) con manifest `manifest.json`, tema smeraldo `#059669` e configurazione display `standalone`.
  - Aggiornamento barre di navigazione `StudentNav` e `TeacherLayout` con accessi diretti a Colloqui e Messaggi.
- **Test Suite & Quality Gate**:
  - 55 test unitari per `@registro/api` inclusi test specifici su regole 8.6 di messaggistica e capienza colloqui.
  - 14 test unitari per `@registro/shared`.
  - 69 test unitari monorepo 100% superati, zero warning ESLint e 32 route statiche/dinamiche compilate per il rilascio.

## [0.4.0] - 2026-10-12

### Aggiunto
- **Modulo Storage & File Pipeline Sicura (`/files`)**:
  - Upload URL presigned per storage S3/MinIO compatibile con scadenza a 5 minuti e quota utente (max 25MB per file, 1GB per utente).
  - Validazione estensioni e tipi MIME ammessi (PDF, PNG, JPG, WEBP, DOCX, PPTX).
  - Hook per scansione antivirus (ClamAV) con stati `PENDING`, `CLEAN`, `INFECTED`.
  - Download URL sicuri con header `Content-Disposition: attachment` e URL di anteprima inline nel browser.
  - Pulizia e cancellazione programmata per file orfani non referenziati.
- **Modulo Appunti Condivisi (`/shared-notes`)**:
  - Ricerca multi-fattoriale con filtri per materia, classe, anno di corso, tag, tipologia (`FILE` / `MARKDOWN`), badge docente e ordinamento (recenti, valutazione, download, visualizzazioni).
  - Scoping visibilità e isolamento privacy rigoroso: appunti `PRIVATE` inaccessibili anche a docenti o compagni; appunti `CLASS`, `GRADE_LEVEL` e `SCHOOL` visibili esclusivamente al perimetro autorizzato.
  - Calcolo del rating con media bayesiana ponderata: $(C \cdot m + \sum)/(C + n)$ con $C=5, m=3.5$.
  - Gestione segnalibri / appunti salvati (`/bookmark`).
  - Commenti con discussioni annidate a 1 livello e finestra di modifica di 10 minuti per l'autore.
  - Soglia di auto-moderazione: oscuramento automatico (`status: HIDDEN`) al raggiungimento di 3 segnalazioni distinte da parte di utenti.
  - Badge di verifica e approvazione docente (`/verify`) con tracciamento del docente e data verifica.
- **Modulo Moderazione (`/moderation`)**:
  - Elenco segnalazioni aperte con motivazione (`COPYRIGHT`, `INAPPROPRIATO`, `ERRATO`, `SPAM`).
  - Risoluzione segnalazioni con azioni: archiviazione (ignora), oscuramento appunto (`HIDDEN`) o eliminazione definitiva (`REMOVED`).
- **Interfaccia Web Appunti Condivisi (`apps/web`)**:
  - Catalogo esplorativo `/appunti` con filtri dinamici, barra di ricerca e card interattive con valutazione a stelle e contatori download/visite.
  - Wizard di creazione `/appunti/nuovo` con tab per upload file con presigned URL o editor Markdown con anteprima split-screen in tempo reale e supporto formule matematiche LaTeX/KaTeX (`$formula$` e `$$formula$$`).
  - Pagina di dettaglio `/appunti/[id]` con visualizzatore integrato, valutazione interattiva da 1 a 5 stelle, salvataggio nei preferiti, modale di segnalazione contenuti, approvazione docente e discussione commentata con modifica a tempo.
  - Cruscotto personale `/appunti/miei` per gestione delle proprie bozze, dispense pubblicate e appunti salvati.
  - Pannello moderazione docente `/docente/moderazione` per revisione e gestione rapida delle segnalazioni della scuola.
  - Componente autonomo e performante `MarkdownViewer` per rendering sicuro di testi formattati, blocchi di codice e formule matematiche in linea e a blocco.
  - Integrazione voce "Appunti" nelle barre di navigazione di studenti (`StudentNav`) e docenti (`TeacherLayout`).

## [0.3.0] - 2026-10-12

### Aggiunto
- **Registro Lezioni & Firma Docente (`/lessons`)**:
  - Firma digitale dell'ora di lezione con associazione cattedra, data e ora del giorno.
  - Registrazione argomenti trattati, note didattiche e compiti assegnati contestuali.
  - Protezione anti-conflitto e verifica cattedra docente.
- **Appello Rapido & Libretto Presenze (`/attendance`)**:
  - Appello di classe rapido (<30 secondi) con pulsante "Tutti Presenti" e stati P (Presente), A (Assente), R (Ritardo con minuti), U (Uscita anticipata).
  - Storico presenze studente con calcolo automatico ore totali, assenze, ritardi e tasso percentuale di frequenza.
  - Modulo di richiesta giustificazione digitale per genitori e studenti maggiorenni (salute, famiglia, altro) e flusso di approvazione/rigetto da parte del docente o segreteria.
- **Orario Scolastico Didattico (`/timetable`)**:
  - Modulo orario settimanale per classi e docenti (scansione 1ª-6ª ora).
  - Algoritmo di rilevamento conflitti su sovrapposizione aula, docente o classe.
- **Valutazioni & Medie Ponderate (`/grades`)**:
  - Inserimento singolo voto e massivo per verifiche di classe (`/grades/bulk`).
  - Supporto per tipologie di prova: Orale, Scritto, Pratico, Progetto, Test Rapido.
  - Calcolo automatico in tempo reale di medie aritmetiche e medie ponderate per disciplina e globali.
  - Applicazione vincolo normativo finestra di modifica: modifiche consentite entro 7 giorni dall'inserimento con motivazione obbligatoria tracciata in audit log; blocco automatico oltre i 7 giorni superabile solo da SchoolAdmin.
  - Soft-delete dei voti con motivazione formale archiviata nel registro di audit.
- **Compiti per Casa & Assegnazioni (`/homework`)**:
  - Assegnazione compiti con data assegnazione, scadenza temporale e minutaggio stimato.
  - Gestione stato svolgimento individuale (`TODO` / `DONE`) per gli studenti iscritti.
- **Agenda di Classe & Calendario Verifiche (`/agenda`)**:
  - Pianificazione verifiche scritte, interrogazioni programmate, uscite didattiche e riunioni.
- **Note Disciplinari & Comunicazioni Famiglie (`/disciplinary-notes`)**:
  - Emissione note disciplinari individuali o per l'intera classe.
  - Tracciamento della presa visione formale e firma digitale dei genitori con timestamp.
- **Circolari & Comunicazioni Istituzionali (`/announcements`)**:
  - Pubblicazione avvisi per singola classe o intero istituto.
  - Monitoraggio letture in tempo reale e meccanismo di presa visione obbligatoria.
- **Interfaccia Web Docente (`@registro/web/docente`)**:
  - Cruscotto docente (`/docente`) con orario giornaliero e scorciatoie per appello rapido.
  - Registro interattivo di classe (`/docente/registro/[classId]`) con appello rapido, riepilogo contatori e firma lezione.
  - Griglia matriciale voti (`/docente/voti`) con medie ponderate, inserimento bulk per verifiche e modale correzione tracciata.
  - Gestione compiti (`/docente/compiti`), agenda verifiche (`/docente/agenda`), note disciplinari (`/docente/note`) e circolari (`/docente/comunicazioni`).
- **Interfaccia Web Studente & Famiglia (`@registro/web`)**:
  - Topbar unificata e reattiva (`StudentNav`) per navigazione tra bacheca, voti, presenze, compiti, orario e circolari.
  - Bacheca studente (`/dashboard`) con lezioni di oggi, compiti in scadenza, riepilogo voti e circolari da firmare.
  - Registro voti studente (`/voti`) con media aritmetica e ponderata per materia e complessiva.
  - Libretto presenze (`/assenze`) con statistiche orarie e invio giustificazioni digitali.
  - Checklist compiti (`/compiti`) con filtro e marcatura completamento TODO/DONE.
  - Quadro orario settimanale (`/orario`) e lettore circolari con firma digitale (`/comunicazioni`).
  - Endpoint `/users/me/profile` per recupero contestuale delle classi e profili collegati.

## [0.2.0] - 2026-10-12

### Aggiunto
- **Identità & Autenticazione Multi-Tenant**:
  - Servizio crittografico (`CryptoService`): hashing password con Argon2id, cifratura di campi sensibili (codice fiscale) con AES-256-GCM a riposo, hashing token SHA-256.
  - Flusso di login con username/email, password e 2FA TOTP opzionale/obbligatorio.
  - Refresh token rotation con token family e revoca automatica a cascata per rilevamento furto o riuso token.
  - Attivazione account con password iniziale e recupero credenziali.
  - Gestione sessioni attive e logout singolo o globale da tutti i dispositivi.
  - Configurazione 2FA TOTP con generazione segreto, QR code, verifica codice e codici di backup monouso.
  - Isolamento multi-tenant con `AsyncLocalStorage` (`TenantMiddleware` e `TenantGuard`) per confinamento rigoroso dei dati al codice meccanografico della scuola.
- **Piattaforma & Amministrazione Istituzionale**:
  - Modulo `/platform/schools` per gestione tenant e provisioning da parte di SuperAdmin.
  - Modulo `/school` per configurazione anagrafica istituto e parametri di valutazione da parte del Dirigente Scolastico.
  - Modulo `/users`: anagrafica, filtri avanzati per ruolo e stato, creazione singolo utente con credenziali temporanee, sospensione/riattivazione con revoca sessioni, reset password, reset 2FA, anonimizzazione GDPR.
  - Modulo `/academic-years` e `/classes`: gestione anni scolastici, quadrimestri, classi e iscrizione studenti.
  - Modulo `/subjects`: catalogo materie curriculari con codici identificativi e colore.
  - Modulo `/teaching-assignments`: assegnazione cattedre docente-classe-materia.
  - Pipeline di importazione massiva CSV (`/imports/csv`) con rilevamento automatico delimitatore (`,` / `;`), rimozione BOM, anteprima dry-run e creazione atomica con credenziali scaricabili.
  - Modulo `/audit`: registro immutabile delle operazioni anagrafiche e amministrative con filtri per azione.
- **Frontend Amministrativo (`@registro/web`)**:
  - Store di autenticazione con Zustand (`useAuthStore`) e iniezione automatica token JWT nel client API.
  - Pagina di login (`/login`) con supporto per passaggio interattivo 2FA TOTP e reindirizzamento in base al ruolo.
  - Pagina di attivazione account (`/activate/[token]`) per impostazione prima password.
  - Layout amministrativo istituzionale (`/admin`) con sidebar contestuale, badge scuola e navigazione completa.
  - Pagina panoramica (`/admin`) con metriche sintetiche su utenti, docenti, studenti, classi e materie.
  - Pagina gestione utenti (`/admin/utenti`) con filtri, paginazione, modale creazione e pulsanti di sospensione/reset.
  - Pagina importazione CSV (`/admin/utenti/importa`) con drag & drop, dry-run di validazione ed esportazione credenziali generate.
  - Pagina classi (`/admin/classi`) con visualizzazione sezioni ed esplorazione studenti iscritti.
  - Pagina materie (`/admin/materie`) con catalogo discipline e campionario colore.
  - Pagina impostazioni (`/admin/impostazioni`) con parametri di valutazione e ciclo di studi.
  - Pagina registro audit (`/admin/audit`) con cronologia eventi e badge di stato.
  - Pagina sicurezza (`/profilo/sicurezza`) con abilitazione guidata 2FA TOTP (QR code, backup codes) e revoca sessioni attive.
- **Testing & Seed**:
  - Script di seeding completo (`prisma/seed.ts`): 1 SuperAdmin, 1 Scuola, 1 SchoolAdmin, 8 Docenti con cattedre, 3 Classi, 60 Studenti iscritti.
  - Suite di test automatici estesa a 38 unit test (isolamento tenant, copertura guards di sicurezza, crittografia, validazione schemi Zod, autorizzazioni).

## [0.1.0] - 2026-10-12

### Aggiunto
- Inizializzazione monorepo con `pnpm workspaces` e `Turborepo`.
- Configurazione TypeScript strict (`@registro/config`) per librerie, NestJS e Next.js.
- Pacchetto `@registro/shared` con enums, ruoli, matrice autorizzazioni RBAC, schemi Zod di autenticazione e tipi per risposte RFC 9457.
- Backend `@registro/api` con NestJS 10, Prisma 6, validazione Zod delle variabili d'ambiente, endpoint salute (`/health`), filtri di errore standardizzati e documentazione OpenAPI 3.1 (`/docs`).
- Schema di database Prisma per la Fondazione Fase 0/1 (scuole, utenti, profili, classi, anni accademici, materie, assegnazioni, token di refresh, log di audit).
- Frontend `@registro/web` con Next.js 15, React 19, Tailwind CSS v4, componenti shadcn/ui, client HTTP tipizzato, pagine di login e dashboard.
- Orchestrazione locale Docker Compose per PostgreSQL 16, Redis 7, MinIO, ClamAV, Gotenberg 8 e Mailpit.
- Pipeline GitHub Actions CI per linting, typecheck e build.
- Documentazione operativa, record delle decisioni architetturali (ADR), modelli di sicurezza e privacy.
