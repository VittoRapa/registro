'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient, getApiBaseUrl } from '@/lib/api-client';

interface AuditLogItem {
  id: string;
  action: string;
  actorRole: string | null;
  actorUser?: { username: string; firstName: string; lastName: string } | null;
  entityType: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  before: unknown;
  after: unknown;
}

interface AuditApiResponse {
  data: AuditLogItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery<AuditApiResponse>({
    queryKey: ['admin-audit', page, actionFilter],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;
      return apiClient<AuditApiResponse>('/audit', { params });
    },
  });

  const getActionBadge = (action: string) => {
    if (action.includes('CREATED') || action.includes('SUCCESS')) {
      return <Badge variant="success">{action}</Badge>;
    }
    if (action.includes('SUSPENDED') || action.includes('FAILED') || action.includes('BLOCKED')) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    return <Badge variant="secondary">{action}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <History className="h-6 w-6 text-blue-600" />
          Registro Immutabile di Audit
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tracciamento cronologico e certificato di tutte le modifiche anagrafiche, accessi e azioni amministrative.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">Tutte le Azioni</option>
          <option value="USER_CREATED">Creazione Utente</option>
          <option value="USER_UPDATED">Modifica Utente</option>
          <option value="USER_SUSPENDED">Sospensione Utente</option>
          <option value="LOGIN_SUCCESS">Login Riuscito</option>
          <option value="LOGIN_FAILED">Login Fallito</option>
        </select>

        <a
          href={`${getApiBaseUrl()}/audit-logs/export-csv`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Download className="h-4 w-4" />
          Esporta Registro CSV (RFC 4180)
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e Ora</TableHead>
              <TableHead>Azione</TableHead>
              <TableHead>Attore</TableHead>
              <TableHead>Entità</TableHead>
              <TableHead>Indirizzo IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                  Caricamento registro eventi...
                </TableCell>
              </TableRow>
            ) : data?.data && data.data.length > 0 ? (
              data.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString('it-IT')}
                  </TableCell>
                  <TableCell>{getActionBadge(item.action)}</TableCell>
                  <TableCell>
                    {item.actorUser ? (
                      <div className="text-xs font-medium">
                        {item.actorUser.firstName} {item.actorUser.lastName}{' '}
                        <span className="text-slate-400 font-normal">({item.actorUser.username})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sistema</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.entityType} {item.entityId ? `#${item.entityId.slice(0, 8)}` : ''}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-400">
                    {item.ip || '-'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Nessun evento registrato per i filtri selezionati.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500">
              Pagina {data.meta.page} di {data.meta.totalPages} ({data.meta.totalItems} eventi)
            </span>
            <div className="space-x-2">
              <Button
                size="sm"
                variant="outline"
                disabled={data.meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Precedente
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={data.meta.page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Successiva
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
