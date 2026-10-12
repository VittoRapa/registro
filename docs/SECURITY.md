# Modello di Sicurezza e Conformità OWASP ASVS Livello 2

## 1. Principi e Standard di Riferimento
La piattaforma "Registro Elettronico con Appunti Condivisi" è progettata conformemente ai controlli di sicurezza stabiliti da:
- **OWASP Application Security Verification Standard (ASVS) 4.0 - Livello 2** (Applicazioni con dati sensibili di minori).
- **Linee Guida AgID sullo sviluppo sicuro del software e interoperabilità**.
- **GDPR (Regolamento UE 2016/679) - Misure tecniche e organizzative adeguate (Art. 32)**.

---

## 2. Autenticazione, Sessioni e Credenziali (ASVS V2 & V3)
- **Hashing delle Password**: Implementato tramite algoritmo crittografico **Argon2id** (variante memory-hard resistente ad attacchi GPU/ASIC).
  - Parametri: `memoryCost: 65536 KB`, `timeCost: 3 iterazioni`, `parallelism: 4`, salt casuale a 16 byte.
- **Autenticazione a Due Fattori (2FA TOTP - RFC 6238)**:
  - Disponibile per tutti i profili e resa obbligatoria per `SCHOOL_ADMIN` e `TEACHER`.
  - Chiave segreta condivisa generata con 20 byte crittografici casuali e memorizzata a riposo con cifratura simmetrica AES-256-GCM.
  - Finestra di tolleranza ristretta a ±1 step temporale (30 secondi) con codice a 6 cifre.
- **Sessioni Stateless e Gestione Token JWT**:
  - `Access Token` a vita breve (15 minuti), firmato con chiave asimmetrica/segreto dedicato e veicolato in header Authorization.
  - `Refresh Token` a rotazione persistente: ad ogni utilizzo viene rilasciata una nuova coppia di token e revocato il precedente; hash SHA-256 salvato su DB per revoca istantanea in caso di furto.

---

## 3. Isolamento Multi-Tenant e Controllo degli Accessi (ASVS V4)
- **Multi-Tenancy con Isolamento Matematico**:
  - Ogni istituto scolastico (tenant) è identificato da un `schoolId` univoco (UUID v4).
  - Tutte le tabelle di dominio contengono la chiave esterna `schoolId`.
  - **Doppia Barriera di Protezione**:
    1. *Livello Applicativo*: `TenantMiddleware` inietta `schoolId` nel contesto di richiesta (AsyncLocalStorage) e `TenantGuard` ne valida la coerenza.
    2. *Livello ORM / Database*: Tutte le query Prisma includono il filtro obbligatorio del tenant corrente. Le query cross-tenant sono bloccate per costruzione e permesse unicamente al ruolo `SUPER_ADMIN` sulle route `/platform/*`.
- **RBAC + ABAC (Matrice dei Permessi Granulare)**:
  - Ruoli supportati: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`.
  - Verifica contestuale delle relazioni (ABAC): un docente può visualizzare e inserire voti solo nelle classi in cui possiede una cattedra attiva (`TeachingAssignment`); un genitore può visualizzare esclusivamente gli studenti per cui è certificata la relazione genitoriale (`ParentLink`).

---

## 4. Crittografia dei Dati (ASVS V6 & V9)
- **Crittografia in Transito**: Tutte le comunicazioni richiedono obbligatoriamente **TLS 1.3** con HSTS attivo (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`).
- **Crittografia a Riposo (Field-Level Encryption)**:
  - Campi sensibili (Codice Fiscale, segreti 2FA TOTP, codici di recupero) sono cifrati prima del salvataggio nel database tramite modulo dedicato `CryptoService`.
  - Algoritmo: **AES-256-GCM** con vettore di inizializzazione (IV) casuale a 12 byte per record e Authentication Tag a 16 byte per rilevare qualsiasi manomissione fisica dei record.
- **Backup Crittograficamente Verificati**:
  - Dump logici compressi con livello 9 gzip.
  - Generazione di file manifest con hash **SHA-256** per verificare l'integrità del dato prima di qualsiasi operazione di ripristino o disaster recovery.

---

## 5. Pipeline Upload File e Protezione Malware (ASVS V12)
- **Validazione Magic Bytes**: Il MIME type dei file caricati è verificato esaminando i byte di intestazione reali, prevenendo bypass basati sull'estensione del file.
- **Scansione Antivirus Asincrona**:
  - Integrazione nativa con **ClamAV** in ambiente containerizzato.
  - Tutti i file caricati per gli appunti condivisi restano in stato `PENDING` e inaccessibili al download fino all'esito `CLEAN` della scansione.
- **Storage Isolato S3**:
  - Download consentito solo tramite URL pre-firmati temporanei a vita breve (15 minuti).

---

## 6. Audit Trail Immutabile & Forense (ASVS V7 & V8)
- Tutte le operazioni di scrittura (creazione, modifica, cancellazione di voti, assenze, note disciplinari, cambi permessi) sono registrate in modo sincrono nella tabella `audit_logs`.
- Metadati registrati: `actorId`, `schoolId`, `action`, `resource`, `resourceId`, `ipAddress`, `userAgent`, `diff` (stato precedente e successivo in JSONB).
- **Esportazione Conforme RFC 4180**: L'endpoint `/api/v1/audit-logs/export-csv` permette l'estrazione conforme ad uso legale e ispettivo.

---

## 7. Protezione Denial of Service & Rate Limiting
- Rate limiting granulare tramite memoria/Redis con finestra mobile:
  - Endpoint di login: massimo 5 tentativi consecutivi per IP prima del blocco temporaneo.
  - Endpoint upload: limiti di frequenza e dimensione massima file (50 MB per documenti, 5 MB per immagini).
  - Richieste generali: soglia di 200 RPS per tenant testata e validata con script di carico k6.
