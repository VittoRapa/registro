'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
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

type AgendaEventType = 'VERIFICA' | 'INTERROGAZIONE' | 'USCITA' | 'EVENTO' | 'RIUNIONE' | 'FESTIVO';

interface AgendaEvent {
  id: string;
  title: string;
  description?: string;
  type: AgendaEventType;
  startAt: string;
  endAt?: string;
  allDay: boolean;
  class?: { id: string; name: string };
}

export default function TeacherAgendaPage() {
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AgendaEventType>('VERIFICA');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [allDay, setAllDay] = useState(false);

  // Fetch teacher assignments
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<TeachingAssignment[]>({
    queryKey: ['my-teaching-assignments'],
    queryFn: async () => apiClient.get<TeachingAssignment[]>('/teaching-assignments/my'),
  });

  const activeAssignment = assignments.find((a) => a.class.id === selectedClassId) || assignments[0];
  const currentClassId = activeAssignment?.class?.id || '';

  // Fetch events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<AgendaEvent[]>({
    queryKey: ['agenda-events', currentClassId],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<AgendaEvent[]>(`/agenda?classId=${currentClassId}`);
    },
    enabled: !!currentClassId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const startAt = allDay
        ? `${startDate}T00:00:00.000Z`
        : `${startDate}T${startTime}:00.000Z`;

      return apiClient.post('/agenda', {
        classId: currentClassId,
        type,
        title,
        description: description || undefined,
        startAt,
        allDay,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events', currentClassId] });
      setModalOpen(false);
      setTitle('');
      setDescription('');
    },
    onError: (err: ApiError) => {
      alert(`Errore inserimento evento in agenda: ${err.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/agenda/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events', currentClassId] });
    },
    onError: (err: ApiError) => {
      alert(`Errore cancellazione: ${err.message}`);
    },
  });

  const getEventBadge = (eventType: AgendaEventType) => {
    switch (eventType) {
      case 'VERIFICA':
        return <Badge className="bg-red-500 text-white hover:bg-red-600">Verifica Scritta</Badge>;
      case 'INTERROGAZIONE':
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Interrogazione</Badge>;
      case 'USCITA':
        return <Badge className="bg-indigo-500 text-white hover:bg-indigo-600">Uscita Didattica</Badge>;
      case 'RIUNIONE':
        return <Badge className="bg-purple-500 text-white hover:bg-purple-600">Riunione / CdC</Badge>;
      case 'FESTIVO':
        return <Badge className="bg-slate-500 text-white hover:bg-slate-600">Festività</Badge>;
      default:
        return <Badge variant="outline">Evento</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-emerald-600" />
            Agenda di Classe & Calendario Verifiche
          </h1>
          <p className="text-sm text-slate-500">
            Pianifica verifiche, interrogazioni programmate e uscite didattiche visibili a studenti e famiglie.
          </p>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          disabled={!currentClassId}
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Pianifica Evento
        </Button>
      </div>

      {/* Class Selector */}
      <Card>
        <CardContent className="p-4">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Classe</label>
          <select
            className="w-full sm:w-80 h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm"
            value={currentClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={isLoadingAssignments}
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.class.id}>
                Classe {a.class.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg">Eventi e Verifiche Programmate</CardTitle>
          <CardDescription>
            {activeAssignment ? `Classe ${activeAssignment.class.name}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingEvents ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Caricamento agenda...
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Nessun evento o verifica programmata per questa classe.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                  <TableHead className="w-32">Tipologia</TableHead>
                  <TableHead>Descrizione Evento</TableHead>
                  <TableHead className="w-44">Data & Ora</TableHead>
                  <TableHead className="w-20 text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>{getEventBadge(ev.type)}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {ev.title}
                      </div>
                      {ev.description && (
                        <div className="text-xs text-slate-500 mt-0.5">{ev.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {new Date(ev.startAt).toLocaleDateString('it-IT')}{' '}
                      {!ev.allDay && (
                        <span className="text-slate-400">
                          alle {new Date(ev.startAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Eliminare questo evento dall&apos;agenda?')) {
                            deleteMutation.mutate(ev.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Nuovo Evento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-emerald-600" />
              Pianifica Evento in Agenda
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Classe {activeAssignment?.class.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tipologia
                </label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                  value={type}
                  onChange={(e) => setType(e.target.value as AgendaEventType)}
                >
                  <option value="VERIFICA">Verifica Scritta</option>
                  <option value="INTERROGAZIONE">Interrogazione Programmata</option>
                  <option value="USCITA">Uscita Didattica / Visita</option>
                  <option value="EVENTO">Evento / Progetto</option>
                  <option value="RIUNIONE">Riunione / Consiglio</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Titolo
                </label>
                <Input
                  placeholder="Es. Verifica di Matematica su Equazioni"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Dettagli / Argomenti
                </label>
                <textarea
                  className="w-full h-20 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                  placeholder="Capitoli da studiare o indicazioni utili..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Ora d&apos;inizio
                  </label>
                  <Input
                    type="time"
                    disabled={allDay}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="allDayCheck" className="text-xs text-slate-600 dark:text-slate-400">
                  Evento per l&apos;intera giornata
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Annulla
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!title.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salva in Agenda
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
