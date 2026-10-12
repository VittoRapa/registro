# Manuale Operativo di Deploy & Ambienti (Step 15)

Questo documento descrive l'architettura dei deployment, le configurazioni d'ambiente e le procedure per pubblicare e testare il **Registro Elettronico** in produzione, staging o tramite anteprima pubblica.

---

## 1. Architettura di Deploy

Il sistema è basato su un'architettura **Full-Stack disaccoppiata**:

```
                  ┌──────────────────────────────────────────────┐
                  │                 Utente Finale                │
                  │         (Browser Web / Mobile Tablet)        │
                  └──────────────────────┬───────────────────────┘
                                         │
                         HTTPS           │           HTTPS
                ┌────────────────────────┴────────────────────────┐
                ▼                                                 ▼
   ┌───────────────────────────┐                     ┌───────────────────────────┐
   │    Frontend (Next.js 15)  │                     │     Backend (NestJS 10)   │
   │    Hosting: Netlify       │ ── API Fetch / SSE ─▶     Hosting: Render / VPS │
   │    App Router + React 19  │                     │     120 Endpoint REST     │
   └───────────────────────────┘                     └─────────────┬─────────────┘
                                                                   │
                                                     ┌─────────────┴─────────────┐
                                                     ▼                           ▼
                                      ┌───────────────────────────┐ ┌───────────────────────────┐
                                      │   PostgreSQL 16 (RLS)     │ │   Redis 7 (BullMQ)        │
                                      │   Hosting: Neon / Render  │ │   Hosting: Upstash / VPS  │
                                      └───────────────────────────┘ └───────────────────────────┘
```

---

## 2. Opzione A: Deploy Cloud Frontend su Netlify

Netlify ospita l'applicazione web Next.js 15 (`apps/web`).

### Configurazione Inclusa nel Repository
- `netlify.toml` (nella root del monorepo e in `apps/web/netlify.toml`)
- Plugin nativo: `@netlify/plugin-nextjs`
- Build command: `pnpm --filter @registro/web build`
- Publish directory: `apps/web/.next`

### Passaggi per la Pubblicazione su Netlify:
1. Accedi alla dashboard di **Netlify** ([https://app.netlify.com](https://app.netlify.com)).
2. Clicca su **Add new site** -> **Import an existing project**.
3. Collega il tuo repository GitHub / GitLab.
4. Netlify rileverà automaticamente il file `netlify.toml`:
   - **Base directory**: `apps/web` (oppure root con `base = "apps/web"`)
   - **Build command**: `pnpm --filter @registro/web build`
   - **Publish directory**: `apps/web/.next`
5. Nella sezione **Environment Variables** su Netlify, imposta:
   ```env
   NODE_VERSION=22
   NEXT_PUBLIC_API_URL=https://tuo-backend-render.onrender.com/api/v1
   ```
6. Clicca su **Deploy site**.
   Il sito sarà attivo su un URL pubblico del tipo `https://tuo-registro.netlify.app`.

---

## 3. Opzione B: Deploy Cloud Backend & DB su Render (o Neon)

Poiché Netlify non supporta database persistenti né server Node continui, il backend NestJS e il DB PostgreSQL vanno ospitati su un provider cloud (es. **Render** o **Railway** con datacenter in Europa - Francoforte/Germania per conformità GDPR).

### Deploy con Blueprint 1-Click (`render.yaml`)
1. Accedi a [https://dashboard.render.com](https://dashboard.render.com).
2. Clicca su **New +** -> **Blueprint**.
3. Seleziona il repository del Registro Elettronico.
4. Render leggerà automaticamente il file `render.yaml` incluso nel progetto:
   - Crea un'istanza gratuita di **PostgreSQL 16** (`registro-postgres`) nella regione di Francoforte (Germania).
   - Crea un servizio web **NestJS API** (`registro-api`) su Node 22.
   - Genera automaticamente le chiavi crittografiche JWT e AES-256.
5. Al termine della compilazione:
   - Esegui una tantum il comando di seed dalla shell di Render:
     ```bash
     pnpm --filter @registro/api prisma db push
     pnpm --filter @registro/api prisma db seed
     ```
   - Prendi l'URL pubblico generato da Render (es. `https://registro-api.onrender.com`) e incollalo nella variabile `NEXT_PUBLIC_API_URL` di Netlify.

---

## 4. Opzione C: Deploy Container Singolo-Server (Hetzner / VPS Linux con Caddy)

In conformità al capitolo 15.4 delle specifiche tecniche, il deploy consigliato per il pilota è un singolo server VPS UE (es. Hetzner CCX 4 vCPU, 16 GB RAM) con Docker Compose e Caddy per il reverse proxy con certificati HTTPS automatici.

```bash
# 1. Clona il repository sul server
git clone <tuo-repo-url> /opt/registro
cd /opt/registro

# 2. Configura il file .env di produzione
cp .env.example .env
nano .env

# 3. Avvia lo stack completo di produzione
docker compose -f docker-compose.prod.yml up -d --build

# 4. Applica migrazioni e dati seed
docker compose -f docker-compose.prod.yml exec api pnpm --filter @registro/api prisma migrate deploy
docker compose -f docker-compose.prod.yml exec api pnpm --filter @registro/api prisma db seed
```

---

## 5. Opzione D: Anteprima Immediata dal Tuo PC (Cloudflare Tunnel)

Se desideri testare il registro immediatamente dal tuo smartphone, tablet o con altri utenti senza dover configurare carte o account cloud complessi:

1. Avvia i servizi locali persistenti:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1
   ```
2. Installa ed esegui `cloudflared` (o `localtunnel`):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Genera un link pubblico HTTPS (es. `https://random-scuola.trycloudflare.com`) immediatamente funzionante da qualsiasi connessione 4G/5G o Wi-Fi.

---

## 6. Credenziali e Profili Demo Pronti all'Uso

Tutti i profili sono già presenti nel database di seed con password predefinita:

| Ruolo | Username | Password | Ambito di Test |
| :--- | :--- | :--- | :--- |
| **Studente (1A)** | `studente.20250001` | `Password123!#` | Consultazione voti, medie, pagella PDF, compiti, appunti condivisi, mazzi studio SM-2 |
| **Studente (Debito)** | `studente.20250002` | `Password123!#` | Verifica insufficienza in matematica (4½), alert carenze formative, ritardi |
| **Docente (Matematica)** | `docente.bianchi0` | `Password123!#` | Firma registro, appello, inserimento voti, compiti in agenda, colloqui |
| **Docente (Italiano)** | `docente.verdi1` | `Password123!#` | Classe 2A, voti scritto/orale, programmazione didattica |
| **Genitore** | `genitore.rossi` | `Password123!#` | Monitoraggio studente Mario Rossi, giustifiche assenze, prenotazione colloqui |
| **Genitore (Bianchi)** | `genitore.bianchi` | `Password123!#` | Monitoraggio studente Luca Bianchi |
| **Admin Scuola (Preside)** | `admin.davinci` | `Password123!#` | Gestione liceo, classi, docenti, studenti, audit log, circolari |
| **Vicepreside** | `vicepreside.davinci` | `Password123!#` | Funzioni vicarie, orari, circolari |
| **Super Admin** | `superadmin` | `SuperAdmin2026!#` | Piattaforma multi-tenant, gestione globale istituti |
