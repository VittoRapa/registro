'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, BookOpen, ShieldCheck, ArrowUpRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

export default function AdminOverviewPage() {
  const { user } = useAuthStore();

  const { data: usersCount } = useQuery({
    queryKey: ['admin-stats-users'],
    queryFn: () => apiClient<{ meta: { totalItems: number } }>('/users?limit=1'),
  });

  const { data: teachersCount } = useQuery({
    queryKey: ['admin-stats-teachers'],
    queryFn: () => apiClient<{ meta: { totalItems: number } }>('/users?role=TEACHER&limit=1'),
  });

  const { data: studentsCount } = useQuery({
    queryKey: ['admin-stats-students'],
    queryFn: () => apiClient<{ meta: { totalItems: number } }>('/users?role=STUDENT&limit=1'),
  });

  const { data: classesList } = useQuery({
    queryKey: ['admin-stats-classes'],
    queryFn: () => apiClient<unknown[]>('/classes'),
  });

  const { data: subjectsList } = useQuery({
    queryKey: ['admin-stats-subjects'],
    queryFn: () => apiClient<unknown[]>('/subjects'),
  });

  const stats = [
    {
      title: 'Utenti Istituzionali',
      value: usersCount?.meta?.totalItems ?? '-',
      description: 'Totale account censiti nel tenant',
      icon: Users,
      href: '/admin/utenti',
    },
    {
      title: 'Corpo Docente',
      value: teachersCount?.meta?.totalItems ?? '-',
      description: 'Docenti attivi con cattedra',
      icon: BookOpen,
      href: '/admin/utenti?role=TEACHER',
    },
    {
      title: 'Studenti Iscritti',
      value: studentsCount?.meta?.totalItems ?? '-',
      description: 'Studenti con anagrafica e matricola',
      icon: GraduationCap,
      href: '/admin/utenti?role=STUDENT',
    },
    {
      title: 'Classi Attive',
      value: classesList ? classesList.length : '-',
      description: 'Sezioni censite per l\'anno in corso',
      icon: GraduationCap,
      href: '/admin/classi',
    },
    {
      title: 'Materie a Catalogo',
      value: subjectsList ? subjectsList.length : '-',
      description: 'Discipline curriculari configurate',
      icon: BookOpen,
      href: '/admin/materie',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Panoramica Amministrativa
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Benvenuto nel pannello di gestione di {user?.school?.name || 'questa scuola'}.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.title} href={s.href}>
              <Card className="hover:border-blue-500 transition-all cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                  <Icon className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    {s.value}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                    <span>{s.description}</span>
                    <ArrowUpRight className="h-3 w-3 text-slate-400" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & Security Banner */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Azioni Rapide
            </CardTitle>
            <CardDescription>Operazioni frequenti di configurazione e anagrafica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/utenti/importa"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 transition-colors"
            >
              <div>
                <div className="font-medium text-sm">Importazione Massiva CSV</div>
                <div className="text-xs text-slate-500">
                  Carica elenchi di classi, docenti o studenti da file ministeriale o CSV
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/utenti"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 transition-colors"
            >
              <div>
                <div className="font-medium text-sm">Crea Singolo Utente</div>
                <div className="text-xs text-slate-500">
                  Aggiungi un docente o studente e genera le credenziali di attivazione
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/impostazioni"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 transition-colors"
            >
              <div>
                <div className="font-medium text-sm">Parametri di Valutazione</div>
                <div className="text-xs text-slate-500">
                  Configura scala voti, arrotondamenti e quadrimestri attivi
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-200">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Isolamento Multi-Tenant e Sicurezza
            </CardTitle>
            <CardDescription className="text-blue-700/80 dark:text-blue-400">
              Conformità e parametri di isolamento istituzionale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900/80 dark:text-blue-300">
            <p>
              Tutti i dati, le anagrafiche, i registri e le comunicazioni sono confinati rigidamente all'interno del perimetro del codice meccanografico della scuola.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <li>Codici fiscali cifrati a riposo con chiave AES-256-GCM.</li>
              <li>Password con hashing forte Argon2id e rotazione token di sessione.</li>
              <li>Tracciamento immutabile di tutte le operazioni di scrittura nel registro audit.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
