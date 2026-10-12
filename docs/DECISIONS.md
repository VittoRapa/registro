# Architectural Decision Records (ADR)

## ADR-001: Scelta dello Stack Tecnologico Monorepo Full-Stack

### Stato
Accettato (2026-10-12)

### Contesto
Il progetto "Registro Elettronico con Appunti Condivisi" deve garantire elevati standard di manutenibilità, type safety end-to-end, conformità alle normative scolastiche italiane e scalabilità multi-istituto. È necessario definire uno stack solido per il backend, il frontend e la gestione del repository monorepo.

### Decisione
Abbiamo selezionato la seguente combinazione tecnologica:

1. **Monorepo**: `pnpm workspaces` con **Turborepo**
   - *Motivazione*: Efficienza nel caching delle build, installazione atomica delle dipendenze con symlink pnpm e orchestrazione fluida dei pacchetti condivisi.
2. **Backend**: **NestJS 10** + **Express**
   - *Motivazione*: Architettura modulare enterprise, supporto first-class per Dependency Injection, OpenAPI 3.1 automatico tramite `@nestjs/swagger`, compatibilità con BullMQ e Prisma.
3. **Frontend**: **Next.js 15 (App Router)** + **React 19** + **Tailwind CSS v4** + **shadcn/ui**
   - *Motivazione*: Server Components per tempi di caricamento rapidi e SEO per la vetrina pubblica, rendering fluido, adozione del moderno engine CSS di Tailwind v4 e componenti UI accessibili.
4. **Database & ORM**: **PostgreSQL 16** + **Prisma 6**
   - *Motivazione*: Modello relazionale robusto con supporto UUID v4 nativo, integrità referenziale per schemi scolastici complessi, migrazioni dichiarative e query builder fortemente tipizzato.
5. **Cache & Queue**: **Redis 7** + **BullMQ**
   - *Motivazione*: Gestione asincrona ad alte prestazioni per scansione antivirus (ClamAV), generazione PDF (Gotenberg) e notifiche broadcast/email.
6. **Object Storage**: **MinIO (S3 compatible)**
   - *Motivazione*: Standard S3 senza vendor lock-in, deploy locale semplice in Docker e scalabilità orizzontale in cloud privato.
7. **Strumenti Ausiliari**:
   - **ClamAV**: Scansione antimalware preventiva su ogni file caricato prima della pubblicazione negli appunti condivisi.
   - **Gotenberg 8**: Conversione e generazione reportistica PDF conforme agli standard ministeriali.
   - **Pino**: Logging strutturato ad alte prestazioni con formattazione JSON in produzione.

### Conseguenze
- **Positive**: Type-safety assoluta condivisa tra API e Web tramite `@registro/shared`, separazione netta delle responsabilità, sviluppo locale riproducibile via Docker Compose.
- **Negative / Trade-off**: Curva di apprendimento iniziale per il setup del monorepo e rispetto rigoroso di TypeScript `strict` senza `any`.
