'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Check,
  EyeOff,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface NoteReportItem {
  id: string;
  reason: 'COPYRIGHT' | 'INAPPROPRIATO' | 'ERRATO' | 'SPAM';
  details: string | null;
  status: 'PENDING' | 'RESOLVED_IGNORED' | 'RESOLVED_HIDDEN' | 'RESOLVED_REMOVED';
  createdAt: string;
  note: {
    id: string;
    title: string;
    status: string;
    author: {
      firstName: string;
      lastName: string;
      role: string;
    };
    subject?: {
      name: string;
    } | null;
  };
  reporter: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

export default function ModerationReportsPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');

  // Fetch reports
  const { data: reports = [], isLoading } = useQuery<NoteReportItem[]>({
    queryKey: ['moderation-reports', filterStatus],
    queryFn: () => {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      return apiClient.get<NoteReportItem[]>(`/moderation/reports${params}`);
    },
  });

  // Resolve report mutation
  const resolveMutation = useMutation({
    mutationFn: ({ reportId, action }: { reportId: string; action: 'IGNORE' | 'HIDE_NOTE' | 'REMOVE_NOTE' }) =>
      apiClient.post(`/moderation/reports/${reportId}/resolve`, { action }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['moderation-reports'] });
      toast.success(
        vars.action === 'IGNORE'
          ? 'Segnalazione archiviata'
          : vars.action === 'HIDE_NOTE'
          ? 'Appunto nascosto'
          : 'Appunto eliminato definitivamente',
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore risoluzione segnalazione';
      toast.error(msg);
    },
  });

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'COPYRIGHT':
        return <Badge variant="destructive" className="text-xs">Copyright</Badge>;
      case 'INAPPROPRIATO':
        return <Badge variant="destructive" className="text-xs bg-rose-600">Inappropriato</Badge>;
      case 'ERRATO':
        return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Errato</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Spam</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Moderazione Contenuti & Segnalazioni
            </h1>
            <Badge variant="outline" className="border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Sicurezza & Qualità
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Revisiona le segnalazioni inviate dagli studenti. Nota: gli appunti con 3 o più segnalazioni vengono nascosti in automatico dal sistema.
          </p>
        </div>

        {/* Filter status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Stato:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="PENDING">In attesa (Da gestire)</option>
            <option value="RESOLVED_HIDDEN">Risolti (Nascosti)</option>
            <option value="RESOLVED_IGNORED">Risolti (Ignorati)</option>
            <option value="RESOLVED_REMOVED">Risolti (Rimossi)</option>
            <option value="">Tutti</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-slate-400 text-sm">
          Caricamento segnalazioni...
        </div>
      ) : reports.length === 0 ? (
        <Card className="dark:border-slate-800">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              Nessuna segnalazione attiva
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Non ci sono segnalazioni pendenti al momento. Tutti i contenuti rispettano le linee guida.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="dark:border-slate-800">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getReasonBadge(report.reason)}
                    <Badge variant="outline" className="text-xs">
                      Stato appunto: {report.note.status}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Segnalato il {new Date(report.createdAt).toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                      {report.note.title}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Autore appunto: <strong className="text-slate-700 dark:text-slate-300">{report.note.author.firstName} {report.note.author.lastName}</strong>
                      {report.note.subject && ` • Materia: ${report.note.subject.name}`}
                    </div>
                  </div>

                  {report.details && (
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Dettagli segnalazione: </span>
                      {report.details}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400">
                    Segnalato da: {report.reporter.firstName} {report.reporter.lastName} ({report.reporter.role})
                  </div>
                </div>

                {/* Moderation Action Buttons */}
                <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                  <Link href={`/appunti/${report.note.id}`} target="_blank">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Apri Appunto
                    </Button>
                  </Link>

                  {report.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveMutation.mutate({ reportId: report.id, action: 'IGNORE' })}
                        className="gap-1.5 text-xs text-slate-600 hover:text-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Archivia (Ignora)
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveMutation.mutate({ reportId: report.id, action: 'HIDE_NOTE' })}
                        className="gap-1.5 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        Nascondi Appunto
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          if (confirm('Sei sicuro di voler rimuovere definitivamente questo appunto?')) {
                            resolveMutation.mutate({ reportId: report.id, action: 'REMOVE_NOTE' });
                          }
                        }}
                        className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Elimina Appunto
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
