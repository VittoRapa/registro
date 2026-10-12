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

## 4. Procedure di Manutenzione e Risoluzione Problemi
- **Errore di validazione env**: Controllare il file `.env`. L'applicazione NestJS valida le variabili all'avvio con Zod e si rifiuta di partire in caso di omissioni.
- **Reset dei container di sviluppo**:
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```
