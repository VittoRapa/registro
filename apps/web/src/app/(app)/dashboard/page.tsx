import { BookOpen, Calendar, FileText, Bell } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Pannello di Controllo
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Benvenuto nel Registro Elettronico con Appunti Condivisi
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Orario & Lezioni
              </h2>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Visualizza le ore di lezione previste e il registro delle presenze.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Valutazioni e Voti
              </h2>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Consulta l'andamento scolastico, verifiche scritte e orali.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Appunti Condivisi
              </h2>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Esplora, carica e valuta gli appunti didattici condivisi.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Circolari & Avvisi
              </h2>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Leggi le comunicazioni scolastiche e firma per presa visione.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
