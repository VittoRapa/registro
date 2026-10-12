# Changelog

Tutte le modifiche rilevanti a questo progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/)
e questo progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

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
