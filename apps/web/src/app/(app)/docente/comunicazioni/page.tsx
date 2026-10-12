'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClient, ApiError } from '@/lib/api-client';

interface TeachingAssignment {
  id: string;
  class: { id: string; name: string };
  subject: { id: string; name: string };
}

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  requiresAck: boolean;
  createdAt: string;
  class?: { id: string; name: string };
  author: { firstName: string; lastName: string };
  _count: { reads: number };
}

export default function TeacherAnnouncementsPage() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'CLASS' | 'SCHOOL'>('CLASS');
  const [requiresAck, setRequiresAck] = useState(false);

  // 1. Fetch teacher assignments
  const { data: assignments = [] } = useQuery<TeachingAssignment[]>({
    queryKey: ['my-teaching-assignments'],
    queryFn: async () => apiClient.get<TeachingAssignment[]>('/teaching-assignments/my'),
  });

  // 2. Fetch announcements
  const { data: announcements = [], isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ['announcements-list'],
    queryFn: async () => apiClient.get<AnnouncementItem[]>('/announcements'),
  });

  // 3. Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/announcements', {
        title,
        body,
        classId: targetType === 'CLASS' ? selectedClassId || assignments[0]?.class?.id : undefined,
        requiresAck,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-list'] });
      setModalOpen(false);
      setTitle('');
      setBody('');
      setRequiresAck(false);
    },
    onError: (err: ApiError) => {
      alert(`Errore pubblicazione circolare: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Bell className="h-7 w-7 text-emerald-600" />
            Comunicazioni & Circolari
          </h1>
          <p className="text-sm text-slate-500">
            Pubblica comunicazioni scolastiche per le tue classi con opzione di firma obbligatoria.
          </p>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          onClick={() => {
            if (assignments.length > 0 && assignments[0]) {
              setSelectedClassId(assignments[0].class.id);
            }
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuova Comunicazione
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg">Circolari Istituzionali & Comunicati</CardTitle>
          <CardDescription>Elenco comunicazioni pubblicate sul registro</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Caricamento comunicazioni...
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Nessuna comunicazione pubblicata finora.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                  <TableHead>Titolo Comunicazione</TableHead>
                  <TableHead className="w-36">Destinatari</TableHead>
                  <TableHead className="w-36">Autore</TableHead>
                  <TableHead className="w-32">Data</TableHead>
                  <TableHead className="w-28 text-center">Letture</TableHead>
                  <TableHead className="w-36 text-center">Firma Richiesta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.body}</div>
                    </TableCell>
                    <TableCell>
                      {item.class ? (
                        <Badge variant="outline">Classe {item.class.name}</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          Tutta la Scuola
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {item.author.lastName} {item.author.firstName}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
                        <Eye className="h-3.5 w-3.5" /> {item._count?.reads || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.requiresAck ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200">
                          Obbligatoria
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Sola lettura</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Nuova Comunicazione */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-600" />
              Nuova Comunicazione / Circolare
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Invia un avviso ufficiale agli studenti o alle famiglie.
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={targetType === 'CLASS' ? 'default' : 'outline'}
                  size="sm"
                  className={targetType === 'CLASS' ? 'bg-emerald-600' : ''}
                  onClick={() => setTargetType('CLASS')}
                >
                  Specifica Classe
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'SCHOOL' ? 'default' : 'outline'}
                  size="sm"
                  className={targetType === 'SCHOOL' ? 'bg-emerald-600' : ''}
                  onClick={() => setTargetType('SCHOOL')}
                >
                  Intero Istituto
                </Button>
              </div>

              {targetType === 'CLASS' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Classe Destinataria
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    {assignments.map((a) => (
                      <option key={a.id} value={a.class.id}>
                        Classe {a.class.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Oggetto / Titolo Circolare
                </label>
                <Input
                  placeholder="Es. Circolare n. 42: Viaggio di istruzione a Firenze"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Testo della Comunicazione
                </label>
                <textarea
                  className="w-full h-32 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                  placeholder="Scrivi qui il corpo della circolare con tutte le informazioni per studenti e genitori..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresAckCheck"
                  checked={requiresAck}
                  onChange={(e) => setRequiresAck(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="requiresAckCheck" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Richiedi presa visione / firma digitale obbligatoria ai genitori
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Annulla
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!title.trim() || !body.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Pubblica Circolare
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
