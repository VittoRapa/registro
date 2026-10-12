# Conformità Privacy, GDPR & Tutela dei Minori

## 1. Quadro Normativo di Riferimento
Il trattamento dei dati personali all'interno della piattaforma "Registro Elettronico con Appunti Condivisi" è interamente conforme a:
- **Regolamento Generale sulla Protezione dei Dati (GDPR - Regolamento UE 2016/679)**.
- **Codice in materia di protezione dei dati personali (D.Lgs. 196/2003 e s.m.i. D.Lgs. 101/2018)**.
- **Linee Guida del Garante per la Protezione dei Dati Personali sul trattamento dei dati nelle istituzioni scolastiche ("La scuola a prova di privacy")**.

---

## 2. Ruoli nel Trattamento dei Dati
- **Titolare del Trattamento**: L'Istituto Scolastico cliente (nella persona del Dirigente Scolastico pro tempore), che definisce le finalità istituzionali e didattiche del registro.
- **Responsabile del Trattamento (Art. 28 GDPR)**: Il fornitore della piattaforma tecnologica, vincolato da formale Accordo di Trattamento dei Dati (Data Processing Agreement - DPA).
- **Sub-Responsabili**: Provider di infrastruttura cloud con data center rigorosamente localizzati all'interno dell'Unione Europea (es. Hetzner Germania/Finlandia o AWS regione eu-south-1 Milano). Nessun dato personale è trasferito verso paesi terzi al di fuori dello Spazio Economico Europeo (SEE).

---

## 3. Registro delle Attività di Trattamento (Art. 30 GDPR)

| Finalità del Trattamento | Base Giuridica | Categorie di Dati | Destinatari | Periodo di Conservazione |
| :--- | :--- | :--- | :--- | :--- |
| **Gestione Registro Scolastico** (voti, presenze, argomenti, compiti) | Obbligo legale (Art. 6.1.c) e Interesse pubblico (Art. 6.1.e) | Anagrafica, valutazioni, assenze, note disciplinari | Studente, genitori/tutori, docenti della classe, dirigenza | Illimitata ai sensi della normativa di archiviazione atti pubblici |
| **Comunicazioni Istituzionali** (circolari, avvisi, colloqui) | Esecuzione compiti pubblici (Art. 6.1.e) | Dati di contatto, messaggi, ricevute di lettura | Famiglie, docenti, personale scolastico | 5 anni dal termine dell'anno scolastico |
| **Condivisione Appunti e Dispense** | Consenso informato e adesione ai Termini d'Uso (Art. 6.1.a/b) | File caricati, testi Markdown, valutazioni della community | Utenti autenticati della piattaforma | Fino a cancellazione a cura dell'autore o richiesta legittima |
| **Sicurezza e Tracciamento Forense (Audit Log)** | Legittimo interesse di sicurezza (Art. 6.1.f) e obbligo legale | Indirizzi IP, User-Agent, timestamp, cronologia modifiche | Amministratore di sistema, autorità giudiziaria su richiesta | 24 mesi dal log |

---

## 4. Tutela Speciale dei Minori e Consenso Digitale (Art. 8 GDPR & D.Lgs. 101/2018)
- In conformità alla legislazione italiana, il limite di età per il consenso autonomo ai servizi digitali è fissato a **14 anni**.
- Per gli studenti **sotto i 14 anni**, l'attivazione dell'account per le funzioni collaborative (appunti e messaggistica) richiede esplicita autorizzazione congiunta registrata dal genitore/tutore legale (`guardianConsentAt`).
- Nelle schermate pubbliche e condivise degli appunti, i dati anagrafici sono minimizzati e non sono mai mostrati codici fiscali, recapiti personali o annotazioni riservate.

---

## 5. Valutazione d'Impatto sulla Protezione dei Dati (DPIA - Art. 35 GDPR)
Trattandosi di trattamento sistematico di dati relativi a soggetti vulnerabili (minori di età):
1. **Riservatezza dei Voti e delle Note**: Ciascuna valutazione scolastica e nota disciplinare è accessibile unicamente allo studente interessato, ai suoi genitori collegati e ai docenti autorizzati del consiglio di classe.
2. **Cifratura dei Dati Identificativi**: I codici fiscali e le credenziali di secondo fattore sono cifrati a riposo con chiave AES-256-GCM.
3. **Audit Trail Completo**: Qualsiasi modifica retroattiva a voti o presenze conserva la versione precedente con data e autore della rettifica.

---

## 6. Esercizio dei Diritti dell'Interessato (Artt. 15-22 GDPR)
- **Diritto di Accesso e Portabilità (Art. 20)**: Tramite l'endpoint `GET /api/v1/users/me/export` (e l'interfaccia utente in `/profilo/sicurezza`), ogni utente può scaricare in qualsiasi momento un archivio interoperabile in formato JSON contenente la totalità dei dati personali conferiti e registrati nel sistema.
- **Rettifica**: Errori anagrafici possono essere segnalati alla segreteria scolastica o corretti dal profilo.
- **Cancellazione (Diritto all'Oblio)**: Applicabile sui contenuti opzionali (appunti e commenti). Per i dati del registro ufficiale con valore legale, la conservazione è vincolata dalla normativa archivistica scolastica.

---

## 7. Procedura di Notice and Takedown (Diritto d'Autore e Contenuti)
1. Gli utenti possono segnalare qualsiasi appunto condiviso tramite il pulsante "Segnala" indicando la causale (`COPYRIGHT`, `INAPPROPRIATO`, `ERRATO`, `SPAM`).
2. Al raggiungimento di 3 segnalazioni indipendenti da parte della community, il contenuto viene **automaticamente oscurato in via cautelativa** in attesa di revisione.
3. Il docente o la dirigenza scolastica dispone della console `/docente/moderazione` per verificare, ripristinare o cancellare definitivamente i contenuti segnalati.
4. I titolari dei diritti possono richiedere la rimozione immediata all'indirizzo privacy indicato per l'istituto scolastico.
