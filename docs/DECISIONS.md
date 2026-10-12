# Architectural Decision Records (ADR)

## ADR-001: Scelta dello Stack Tecnologico Monorepo Full-Stack
### Stato: Accettato (2026-10-12)
### Contesto
Il progetto "Registro Elettronico con Appunti Condivisi" deve garantire elevati standard di manutenibilità, type safety end-to-end, conformità alle normative scolastiche italiane e scalabilità multi-istituto.
### Decisione
- **Monorepo**: `pnpm workspaces` + Turborepo.
- **Backend**: NestJS 10 (Node 22 LTS) con TypeScript strict, architettura modulare e OpenAPI 3.1 generata automaticamente.
- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + shadcn/ui.
- **Database**: PostgreSQL 16 + Prisma 6.
- **Cache / Code**: Redis 7 + BullMQ.
- **Storage**: MinIO / S3 compatibile.
- **Protezione File**: ClamAV containerizzato per scansione antimalware preventiva.

---

## ADR-002: Isolamento Multi-Tenant e Sicurezza dei Dati Scolastici
### Stato: Accettato (2026-10-12)
### Contesto
Più scuole (tenant) condividono la stessa infrastruttura di database. È un requisito bloccante che nessun utente di un istituto possa accedere, modificare o dedurre dati di un altro istituto scolastico.
### Decisione
Abbiamo adottato un approccio **a doppia barriera**:
1. **Chiave Esterna di Tenant**: La colonna `schoolId` (UUID v4) è presente su ogni entità di dominio ed è indicizzata per performance ottimali.
2. **Context Resolution trasparente**: Il middleware `TenantMiddleware` inietta `schoolId` nell'AsyncLocalStorage dal token JWT validato.
3. **TenantGuard applicativo**: Ogni controller e servizio applica filtri forzati sul tenant corrente.
4. **Isolamento della Piattaforma**: Solo le route `/platform/*` riservate a `SUPER_ADMIN` possono operare cross-tenant.

---

## ADR-003: Crittografia a Riposo Field-Level (AES-256-GCM) per Dati Sensibili
### Stato: Accettato (2026-10-12)
### Contesto
Ai sensi dell'art. 32 del GDPR e delle linee guida di sicurezza sui dati dei minori, elementi come codice fiscale, segreti TOTP per 2FA e codici di emergenza non possono essere conservati in chiaro nel database.
### Decisione
- Implementato il servizio dedicato `CryptoService` in NestJS.
- Algoritmo adottato: **AES-256-GCM** (Galois/Counter Mode), che fornisce confidenzialità e autenticazione integrata del messaggio.
- Per ogni campo cifrato viene generato un vettore di inizializzazione (IV) crittografico casuale a 12 byte, e viene memorizzato il tag di autenticazione a 16 byte.
- Password utente hashate con **Argon2id** (memory-hard, non invertibile).

---

## ADR-004: Algoritmo di Ripetizione Spaziata SuperMemo SM-2 per Flashcard e Studio
### Stato: Accettato (2026-10-12)
### Contesto
Per implementare il modulo di studio assistito (Spec 18.1) è necessario un algoritmo matematico deterministico, affidabile e ben validato dalla letteratura scientifica per pianificare gli intervalli di memorizzazione delle flashcard.
### Decisione
- Abbiamo adottato l'algoritmo classico **SuperMemo SM-2**:
  - Punteggio di qualità da 0 a 5 per ogni sessione di ripasso.
  - Se voto < 3 (risposta errata o buio), le ripetizioni si azzerano e l'intervallo torna a 1 giorno.
  - Se voto >= 3:
    - 1° ripetizione: intervallo = 1 giorno.
    - 2° ripetizione: intervallo = 6 giorni.
    - Ripetizioni successive: `intervallo = ceil(intervallo_precedente * easeFactor)`.
  - Fattore di facilità (`easeFactor`): aggiornato con la formula standard $EF' = EF + (0.1 - (5 - q) \cdot (0.08 + (5 - q) \cdot 0.02))$, con limite inferiore inderogabile a `1.3`.
- Tutti i calcoli avvengono lato server per garantire coerenza tra i client web e futuri client mobile.

---

## ADR-005: Strategia di Disaster Recovery e Backup Logico con Controllo Integrità SHA-256
### Stato: Accettato (2026-10-12)
### Contesto
In conformità ai requisiti di resilienza e continuità operativa (Spec 19), il sistema necessita di una procedura di backup e ripristino verificabile, automatizzabile e priva di dipendenze esterne non gestite.
### Decisione
- Sviluppati gli script dedicati `scripts/db-backup.js`, `scripts/db-restore.js` con wrapper PowerShell `scripts/backup-db.ps1` e `scripts/restore-db.ps1`.
- Dump logico completo di tutte le 54 tabelle, schemi e sequenze con compressione gzip a livello 9.
- Generazione contestuale di un file manifest contenente il checksum crittografico **SHA-256** del file compresso.
- In fase di restore, viene eseguito il check preventivo di corrispondenza SHA-256 per garantire l'integrità del dump prima di applicare modifiche al database.
