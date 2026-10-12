# Operational Runbook

## 1. Avvio Rapido dell'Ambiente Locale

### Prerequisiti
- Node.js >= 22.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose

### Passaggi
```bash
# 1. Clona il repository ed entra nella cartella
cd c:\Users\paolo\Documents\registro

# 2. Avvia i servizi infrastrutturali di supporto
docker-compose up -d

# 3. Installa le dipendenze
pnpm install

# 4. Genera il client Prisma
pnpm --filter @registro/api prisma:generate

# 5. Avvia tutti i servizi in modalità sviluppo
pnpm dev
```

## 2. Health Checks e Diagnostica
- **API Liveness**: `GET http://localhost:4000/api/v1/health`
- **API Readiness (DB status)**: `GET http://localhost:4000/api/v1/health/ready`
- **MinIO Console**: `http://localhost:9001` (Credenziali: `minioadmin` / `minioadmin`)
- **Mailpit Web UI**: `http://localhost:8025` (SMTP: `localhost:1025`)
- **Swagger UI**: `http://localhost:4000/docs`

## 3. Gestione del Database
```bash
# Applicare migrazioni in sviluppo
pnpm --filter @registro/api prisma migrate dev

# Ispezionare il database con Prisma Studio
pnpm --filter @registro/api prisma studio
```

## 4. Backup, Ripristino & Disaster Recovery (Spec 19 - GDPR & Sicurezza)

Il sistema include procedure automatizzate per dump logico conforme a PostgreSQL con compressione gzip e controllo di integrità crittografica SHA-256.

### Esecuzione Backup Logico
```powershell
# Esegue il dump compresso in ./backups/ con manifest SHA-256
powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1
```
Il backup genera:
- `backups/backup_YYYY-MM-DDTHH-mm-ss.json.gz`: dump compresso gzip (livello 9) contenente tutte le tabelle, chiavi, colonne e sequenze.
- `backups/backup_YYYY-MM-DDTHH-mm-ss.manifest.json`: metadati di controllo con checksum crittografica SHA-256, conteggio record e riassunto per tabella.

### Procedura di Disaster Recovery e Ripristino
```powershell
# Ripristina l'ultimo backup disponibile (verifica automatica SHA-256)
powershell -ExecutionPolicy Bypass -File scripts/restore-db.ps1

# Oppure specifica un file di backup esatto
powershell -ExecutionPolicy Bypass -File scripts/restore-db.ps1 -BackupFile ./backups/backup_2026-10-12T18-18-42.json.gz
```
La procedura applica:
1. Validazione crittografica del checksum SHA-256 rispetto al manifest.
2. Disabilitazione temporanea dei vincoli (`SET session_replication_role = 'replica';`).
3. Truncate atomico in cascata e reinserimento dei dati originali.
4. Riallineamento delle sequenze e riattivazione delle regole di integrità referenziale (`session_replication_role = 'origin'`).

---

## 5. Load Testing & Verifica Prestazioni (k6)

Il file `scripts/load-test.js` simula scenari utente realistici (autenticazione JWT Argon2id, consultazione voti, esplorazione bacheca appunti, mazzi studio SM-2).

### Metriche e Soglie di Accettazione (Spec 16 Fase 4 & Spec 19)
- **Target Concorrenza**: Ramping fino a **200 RPS** sustained con 100-150 VUs.
- **Latenza p95**: `http_req_duration < 500ms`
- **Latenza p99**: `http_req_duration < 1200ms`
- **Tasso di Errore**: `failed_requests < 1%`
- **Login Argon2id**: `login_duration p95 < 600ms`
- **Consultazione Voti**: `grades_duration p95 < 300ms`

### Esecuzione del Test
```bash
# Esecuzione con k6 CLI puntando all'API locale
k6 run scripts/load-test.js

# Oppure specificando un target URL personalizzato
k6 run -e API_URL=http://localhost:4000/api/v1 scripts/load-test.js
```

---

## 6. Procedure di Manutenzione e Risoluzione Problemi
- **Errore di validazione env**: Controllare il file `.env`. L'applicazione NestJS valida le variabili all'avvio con Zod e si rifiuta di partire in caso di omissioni.
- **Embedded PostgreSQL locale su Windows**:
  ```powershell
  # Avvio manuale dei servizi persistenti
  powershell -ExecutionPolicy Bypass -File scripts/start-services.ps1

  # Arresto pulito di tutti i processi Node/Postgres
  powershell -ExecutionPolicy Bypass -File scripts/stop-services.ps1
  ```
- **Reset dei container Docker (se utilizzati)**:
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```
