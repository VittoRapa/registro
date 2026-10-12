# Registro Elettronico con Appunti Condivisi

Piattaforma scolastica moderna full-stack per la gestione del registro di classe elettronico e la condivisione collaborativa di appunti e materiali didattici.

---

## 🏗️ Architettura e Stack Tecnologico

Il progetto è strutturato come monorepo basato su **pnpm workspaces** e **Turborepo**:

- **Backend (`apps/api`)**:
  - [NestJS 10](https://nestjs.com/) con Express
  - [Prisma 6](https://www.prisma.io/) con database [PostgreSQL 16](https://www.postgresql.org/)
  - [Redis 7](https://redis.io/) & [BullMQ](https://bullmq.io/) per code asincrone
  - Autenticazione con Argon2id, JWT a rotazione e RBAC granulare
  - Validazione rigorosa degli schemi tramite [Zod](https://zod.dev/)
  - Documentazione automatica OpenAPI 3.1 tramite `@nestjs/swagger`
  - Logging strutturato ad alte prestazioni con [Pino](https://getpino.io/)
- **Frontend (`apps/web`)**:
  - [Next.js 15](https://nextjs.org/) (App Router) & [React 19](https://react.dev/)
  - [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
  - [TanStack React Query](https://tanstack.com/query) per il caching lato client
  - [Zustand](https://github.com/pmndrs/zustand) per lo state management
- **Pacchetti Condivisi (`packages/`)**:
  - `@registro/config`: Configurazioni condivise per TypeScript (`tsconfig`) ed ESLint
  - `@registro/shared`: Tipi comuni, enums, costanti, schemi Zod e matrice permessi RBAC
- **Infrastruttura di Supporto**:
  - **MinIO**: Object storage S3-compatibile
  - **ClamAV**: Motore antivirus per scansione immediata degli allegati
  - **Gotenberg 8**: Microservizio Docker per la compilazione e stampa PDF
  - **Mailpit**: Server SMTP locale con interfaccia web di test

---

## 📋 Struttura del Monorepo

```text
registro/
├── apps/
│   ├── api/             # Backend API NestJS 10
│   ├── web/             # Frontend web Next.js 15
│   └── mobile/          # Riservato per React Native (Fase 6)
├── packages/
│   ├── config/          # Configurazioni TypeScript ed ESLint
│   └── shared/          # Codice, enums, tipi, schemi Zod condivisi
├── docs/                # Documentazione architetturale, sicurezza, privacy, runbook
├── infra/               # Dockerfile multi-stage e configurazioni Caddy
├── docker-compose.yml   # Servizi locali (Postgres, Redis, MinIO, ClamAV, Gotenberg, Mailpit)
├── pnpm-workspace.yaml  # Configurazione workspace pnpm
└── turbo.json           # Pipeline di build e caching Turborepo
```

---

## 🚀 Prerequisiti

- **Node.js**: versione `>= 22.0.0`
- **pnpm**: versione `>= 9.0.0`
- **Docker** e **Docker Compose**

---

## 🛠️ Installazione e Avvio Rapido

1. **Configurazione variabili d'ambiente**:
   ```bash
   cp .env.example .env
   ```

2. **Avvio dei servizi di supporto con Docker**:
   ```bash
   docker-compose up -d
   ```

3. **Installazione delle dipendenze**:
   ```bash
   pnpm install
   ```

4. **Generazione dei client e schemi**:
   ```bash
   pnpm --filter @registro/api prisma:generate
   ```

5. **Avvio in modalità sviluppo**:
   ```bash
   pnpm dev
   ```

- Frontend Web: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:4000](http://localhost:4000)
- Swagger / OpenAPI Docs: [http://localhost:4000/docs](http://localhost:4000/docs)
- Mailpit Web Mail: [http://localhost:8025](http://localhost:8025)
- MinIO Console: [http://localhost:9001](http://localhost:9001)

---

## 💻 Comandi Utili di Sviluppo

| Comando | Descrizione |
| :--- | :--- |
| `pnpm build` | Compila tutti i pacchetti e le applicazioni tramite Turborepo |
| `pnpm dev` | Avvia le app in modalità watch e live-reload |
| `pnpm lint` | Esegue il linter ESLint sull'intero monorepo |
| `pnpm typecheck` | Esegue la verifica rigorosa dei tipi TypeScript senza generare file |
| `pnpm format` | Formatta tutti i file secondo le regole Prettier |
| `pnpm clean` | Pulisce le cartelle di build e cache |

---

## 🤝 Linee Guida di Contribuzione

- Tutti i commit devono seguire la convenzione **Conventional Commits** (es. `feat: ...`, `fix: ...`, `chore: ...`).
- Tutto il codice sorgente, variabili e commenti devono essere in **Inglese**. I testi rivolti all'utente (UI) sono in **Italiano**.
- È proibito l'uso del tipo `any` in TypeScript: la modalità strict è attiva ovunque.
