# Changelog

Tutte le modifiche rilevanti a questo progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/)
e questo progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

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
