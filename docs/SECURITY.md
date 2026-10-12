# Modello di Sicurezza (Security Model)

## 1. Principi Guida
La sicurezza dei dati nel Registro Elettronico è progettata in conformità con i requisiti del Garante per la Protezione dei Dati Personali (GDPR) e con le linee guida AgID per la Pubblica Amministrazione.

## 2. Autenticazione e Autorizzazione
- **Password Hashing**: Algoritmo **Argon2id** con salt crittografico dedicato.
- **Sessioni Stateless / JWT**:
  - `Access Token` a vita breve (default: 15 minuti).
  - `Refresh Token` a rotazione persistito su database in forma hash (`SHA-256`) per revoca immediata.
- **RBAC (Role-Based Access Control)**:
  - Ruoli: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`.
  - Matrice granulare verificata a livello di Guard e Interceptor.

## 3. Isolamento Multi-Tenant
- Ogni scuola opera in isolamento logico.
- Tutte le entità di dominio referenziano obbligatoriamente `schoolId`.
- Query protette da clausole di filtraggio garantite sia a livello applicativo sia tramite `TenantGuard`.

## 4. Protezione dell'Integrità dei Dati e dei File Caricati
- **Scansione Antivirus**: Integrazione con ClamAV tramite coda asincrona BullMQ prima di rendere disponibile qualsiasi file nel bucket S3/MinIO.
- **Validazione MIME-Type**: Verifica dei magic bytes all'upload (non solo dell'estensione file dichiarata).
- **Crittografia a Riposo (Encryption-at-Rest)**: I dati sensibili specifici sono cifrati tramite algoritmo simmetrico **AES-256-GCM** utilizzando la chiave `ENCRYPTION_KEY`.

## 5. Audit Log Immutabile
- Tutte le operazioni di scrittura (creazione, modifica, cancellazione dei voti, assenze, circolari) generano un record immutabile nella tabella `audit_logs` con IP, user-agent, timestamp e payload difforme.
