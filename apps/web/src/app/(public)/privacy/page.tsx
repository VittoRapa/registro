import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Informativa sul Trattamento dei Dati Personali (Privacy) - Registro Elettronico',
  description: 'Informativa resa ai sensi degli articoli 13 e 14 del Regolamento UE 2016/679 (GDPR)',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Informativa Privacy e Trattamento Dati (GDPR)
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR) e D.Lgs. 196/2003 novellato da D.Lgs. 101/2018
              </p>
            </div>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna al Login
            </Button>
          </Link>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">1. Titolare del Trattamento e DPO</h2>
            <p>
              Il Titolare del Trattamento è l'Istituzione Scolastica autonoma di appartenenza dell'utente, legalmente rappresentata dal Dirigente Scolastico pro tempore.
              L'elenco dei recapiti istituzionali del Titolare e del Responsabile della Protezione dei Dati (DPO / RPD) nominato ai sensi dell'art. 37 del GDPR è consultabile presso la segreteria o sul portale istituzionale d'istituto.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">2. Finalità e Base Giuridica del Trattamento</h2>
            <p>
              I dati personali forniti o acquisiti nel contesto della piattaforma sono trattati esclusivamente per l'assolvimento dei compiti istituzionali e normativi affidati alla scuola, con particolare riferimento a:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gestione del Registro Elettronico (D.L. 6 luglio 2012 n. 95, convertito con modificazioni dalla L. 7 agosto 2012 n. 135);</li>
              <li>Monitoraggio didattico, verbalizzazione dei voti, rilevazione presenze, assenze e giustificazioni;</li>
              <li>Comunicazioni scuola-famiglia, prenotazione colloqui e condivisione materiale didattico e appunti;</li>
              <li>Adempimento di obblighi di legge, tutela della salute e sicurezza in ambiente scolastico.</li>
            </ul>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              Base giuridica: Esecuzione di un compito di interesse pubblico o connesso all'esercizio di pubblici poteri (Art. 6, par. 1, lett. e) GDPR) e obbligo legale (Art. 6, par. 1, lett. c) GDPR).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">3. Trattamento dei Dati dei Minori</h2>
            <p>
              Nel pieno rispetto dell'art. 8 del GDPR e dell'art. 2-quinquies del D.Lgs. 101/2018, i dati relativi agli studenti minori di età sono trattati con garanzie rafforzate di tutela e trasparenza.
              L'accesso alle informazioni di profitto, presenze e sanzioni disciplinari è riservato ai docenti autorizzati, allo studente e agli esercenti la potestà genitoriale / tutori legali certificati tramite associazione accreditata dalla segreteria.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">4. Misure di Sicurezza Tecniche e Organizzative</h2>
            <p>
              La piattaforma implementa misure all'avanguardia per garantire riservatezza, integrità e disponibilità dei dati:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Crittografia a riposo:</strong> I dati sensibili e i contenuti riservati sono protetti tramite cifratura forte AES-256-GCM;</li>
              <li><strong>Crittografia in transito:</strong> Protocollo obbligatorio TLS 1.3 con HSTS e Perfect Forward Secrecy;</li>
              <li><strong>Autenticazione:</strong> Hashing credenziali basato su Argon2id, protezione contro attacchi brute-force e supporto nativo per autenticazione a due fattori TOTP (RFC 6238);</li>
              <li><strong>Separazione Multi-Tenant:</strong> Isolamento rigoroso a livello logico e applicativo tra istituti scolastici differenti (nessuna contaminazione incrociata dei dati);</li>
              <li><strong>Audit Logging Immutabile:</strong> Registrazione conforme a standard dei log di accesso e modifica con conservazione certificata (RFC 4180).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">5. Conservazione dei Dati</h2>
            <p>
              I dati del registro e le valutazioni sono conservati per il tempo strettamente necessario al compimento degli obblighi d'istruzione e secondo i piani di conservazione e scarto dei documenti archivistici scolastici approvati dal Ministero dell'Istruzione e del Merito.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">6. Diritti dell'Interessato e Portabilità</h2>
            <p>
              Ai sensi degli artt. 15-22 del GDPR, l'interessato ha diritto di richiedere l'accesso ai propri dati personali, la rettifica, l'integrazione o la limitazione del trattamento.
            </p>
            <p>
              In conformità all'art. 20 del GDPR (Diritto alla portabilità dei dati), ciascun utente autenticato può in qualsiasi momento scaricare una copia integrale e interoperabile in formato JSON dei propri dati direttamente dall'area <em>Profilo &gt; Sicurezza &gt; Portabilità Dati Personali</em>.
            </p>
            <p>
              Gli interessati possono presentare reclamo all'Autorità Garante per la Protezione dei Dati Personali (Piazza Venezia 11, 00187 Roma - www.garanteprivacy.it).
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
          <span>Versione 1.0 — Aggiornata ad Aprile 2026</span>
          <div className="space-x-4">
            <Link href="/termini" className="hover:underline">Termini di Servizio</Link>
            <Link href="/accessibilita" className="hover:underline">Accessibilità AGID</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
