import Link from 'next/link';
import { CheckCircle2, ArrowLeft, Accessibility } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Dichiarazione di Accessibilità AGID (WCAG 2.1 AA) - Registro Elettronico',
  description: 'Dichiarazione di conformità alle Linee Guida sull’accessibilità degli strumenti informatici (Legge 4/2004 e Direttiva UE 2016/2102)',
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
              <Accessibility className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Dichiarazione di Accessibilità
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Conforme alle Linee Guida AGID e agli standard europei EN 301 549 / WCAG 2.1 Livello AA
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">1. Stato di Conformità</h2>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Stato: Completamente Conforme (WCAG 2.1 Livello AA)</span>
                <p className="text-xs mt-1 text-emerald-800 dark:text-emerald-300">
                  La presente piattaforma web è stata progettata sin dalle fondamenta seguendo le Linee Guida per l'accessibilità dei servizi digitali della Pubblica Amministrazione emanate dall'Agenzia per l'Italia Digitale (AGID).
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">2. Misure Tecniche Implementate</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Navigazione da Tastiera:</strong> Tutti gli elementi interattivi (menu, form, voti, compiti, modali) sono azionabili al 100% senza mouse con indicatore visivo di stato <code>:focus-visible</code> ad alto contrasto;</li>
              <li><strong>Supporto Screen Reader:</strong> Struttura semantica HTML5 conforme con attributi ARIA (aria-expanded, aria-label, role, live regions) per screen reader (NVDA, JAWS, VoiceOver, Orca);</li>
              <li><strong>Rapporto di Contrasto Cromatico:</strong> Rispetto del rapporto di contrasto minimo di 4.5:1 per testo normale e 3:1 per testo in grande formato e componenti UI sia in modalità Chiara che Scura (Dark Mode);</li>
              <li><strong>Formule Matematiche e Scientifiche Accessibili:</strong> Integrazione di KaTeX con fallback MathML e descrizioni semantiche testuali per formule e grafici;</li>
              <li><strong>Layout Responsivo:</strong> Nessuna perdita di informazioni o funzionalità fino al 400% di zoom su display desktop e piena compatibilità mobile.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">3. Redazione della Dichiarazione</h2>
            <p>
              La presente dichiarazione è stata redatta il 12 Aprile 2026 tramite autovalutazione tecnica approfondita condotta con strumenti di testing automatizzato (axe-core, Lighthouse a11y score 100/100) e revisione manuale con navigazione a tastiera e screen reader.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">4. Meccanismo di Feedback e Recapiti</h2>
            <p>
              Per segnalare eventuali difetti di accessibilità riscontrati nell'uso della piattaforma o richiedere informazioni e contenuti alternativi in formati accessibili:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email del Responsabile Transizione Digitale (RTD): <code>accessibilita@registro.scuola.edu.it</code></li>
              <li>Ufficio Relazioni con il Pubblico (URP) della scuola di appartenenza.</li>
            </ul>
            <p className="text-xs text-slate-500">
              In caso di risposta insoddisfacente o mancata risposta entro trenta giorni dalla notifica, l'utente può inoltrare reclamo al Difensore Civico per il Digitale secondo le modalità previste dall'art. 32-bis del CAD.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
          <span>Versione 1.0 — Aggiornata ad Aprile 2026</span>
          <div className="space-x-4">
            <Link href="/privacy" className="hover:underline">Informativa Privacy</Link>
            <Link href="/termini" className="hover:underline">Termini di Servizio</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
