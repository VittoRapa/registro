import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Termini e Condizioni di Utilizzo - Registro Elettronico',
  description: 'Condizioni generali di utilizzo della piattaforma e regole di condotta della community scolastica',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Termini e Condizioni di Utilizzo
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Regolamento d'uso dei servizi digitali, del registro elettronico e dello spazio appunti condivisi
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">1. Oggetto e Ambito di Applicazione</h2>
            <p>
              I presenti Termini disciplinano l'accesso e l'utilizzo della piattaforma informatica denominata "Registro Elettronico e Appunti Condivisi" da parte della comunità scolastica (personale docente, studenti, genitori ed esercenti la potestà genitoriale, personale di segreteria e dirigenza).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">2. Credenziali di Accesso e Custodia</h2>
            <p>
              L'account assegnato a ciascun utente è strettamente personale e non cedibile a terzi:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>L'utente ha l'obbligo di custodire le proprie credenziali (username, password e codici temporanei TOTP 2FA) con la massima diligenza;</li>
              <li>È severamente vietato consentire l'accesso al registro a soggetti non autorizzati con il proprio account;</li>
              <li>In caso di sospetta compromissione delle credenziali, l'utente è tenuto a reimpostare la password tempestivamente e segnalare l'accaduto all'amministratore d'istituto.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">3. Condivisione Didattica e Moderazione Appunti</h2>
            <p>
              La sezione "Appunti Condivisi" è uno strumento pensato per favorire la cooperazione scolastica e lo studio tra pari. Ciascun autore è responsabile dei contenuti pubblicati:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Copyright e Proprietà Intellettuale:</strong> È vietato caricare dispense protette da copyright senza autorizzazione o libri di testo coperti da diritto d'autore;</li>
              <li><strong>Contenuti vietati:</strong> È rigorosamente proibito pubblicare materiale ingiurioso, denigratorio, pornografico, discriminatorio o che leda la dignità altrui;</li>
              <li><strong>Moderazione e Segnalazioni:</strong> Tutti i contenuti sono soggetti a scansione antivirus ClamAV, verifica anti-plagio e moderazione da parte del corpo docente e degli amministratori scolastici. Contenuti non conformi verranno rimossi e l'autore potrà incorrere in sanzioni disciplinari;</li>
              <li><strong>Rating Bayesiano:</strong> La reputazione e la visibilità degli appunti sono calcolate tramite algoritmi ponderati per premiare la qualità didattica certificata.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">4. Valore Giuridico dei Dati di Registro</h2>
            <p>
              Il Registro Elettronico costituisce a tutti gli effetti atto pubblico facente fede delle attività didattiche, delle presenze e delle valutazioni registrate dai docenti nell'esercizio delle loro funzioni. Qualsiasi tentativo di alterazione o manomissione dei dati informatici costituisce reato perseguibile ai sensi del Codice Penale.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">5. Sospensione e Risoluzione</h2>
            <p>
              L'amministrazione scolastica si riserva il diritto di sospendere l'accesso alla piattaforma per gli utenti che violino i presenti termini, con riserva di attivare i procedimenti disciplinari previsti dai regolamenti d'istituto e dallo Statuto delle Studentesse e degli Studenti.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
          <span>Versione 1.0 — Aggiornata ad Aprile 2026</span>
          <div className="space-x-4">
            <Link href="/privacy" className="hover:underline">Informativa Privacy</Link>
            <Link href="/accessibilita" className="hover:underline">Accessibilità AGID</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
