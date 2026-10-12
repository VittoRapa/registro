'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
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

interface HomeworkItem {
  id: string;
  title: string;
  description?: string;
  assignedDate: string;
  dueDate: string;
  estimatedMinutes?: number;
  class: { id: string; name: string };
  teachingAssignment?: {
    subject: { name: string };
  };
}

export default function TeacherHomeworkPage() {
  const queryClient = useQueryClient();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New homework form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDate, setAssignedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [estimatedMinutes, setEstimatedMinutes] = useState('30');

  // 1. Fetch teacher assignments
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<TeachingAssignment[]>({
    queryKey: ['my-teaching-assignments'],
    queryFn: async () => apiClient.get<TeachingAssignment[]>('/teaching-assignments/my'),
  });

  const activeAssignment = assignments.find((a) => a.id === selectedAssignmentId) || assignments[0];
  const currentClassId = activeAssignment?.class?.id || '';

  // 2. Fetch homework
  const { data: homeworkList = [], isLoading: isLoadingHomework } = useQuery<HomeworkItem[]>({
    queryKey: ['homework-list', currentClassId],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<HomeworkItem[]>(`/homework?classId=${currentClassId}`);
    },
    enabled: !!currentClassId,
  });

  // 3. Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeAssignment) throw new Error('Nessun insegnamento selezionato');
      return apiClient.post('/homework', {
        teachingAssignmentId: activeAssignment.id,
        classId: activeAssignment.class.id,
        title,
        description: description || undefined,
        assignedDate,
        dueDate,
        estimatedMinutes: parseInt(estimatedMinutes, 10) || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-list', currentClassId] });
      setModalOpen(false);
      setTitle('');
      setDescription('');
    },
    onError: (err: ApiError) => {
      alert(`Errore assegnazione compiti: ${err.message}`);
    },
  });

  // 4. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/homework/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-list', currentClassId] });
    },
    onError: (err: ApiError) => {
      alert(`Errore cancellazione: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-emerald-600" />
            Compiti per Casa & Assegnazioni
          </h1>
          <p className="text-sm text-slate-500">
            Assegna compiti con scadenza e visualizza lo stato di svolgimento da parte della classe.
          </p>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          disabled={!activeAssignment}
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nuovo Compito
        </Button>
      </div>

      {/* Class Selector */}
      <Card>
        <CardContent className="p-4">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Classe e Materia</label>
          <select
            className="w-full sm:w-80 h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm"
            value={activeAssignment?.id || ''}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            disabled={isLoadingAssignments}
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                Classe {a.class.name} — {a.subject.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Homework List */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg">Compiti Assegnati</CardTitle>
          <CardDescription>
            {activeAssignment ? `Classe ${activeAssignment.class.name} • ${activeAssignment.subject.name}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingHomework ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Caricamento compiti...
            </div>
          ) : homeworkList.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Nessun compito assegnato per questa classe.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                  <TableHead>Titolo & Dettagli</TableHead>
                  <TableHead className="w-36">Assegnato il</TableHead>
                  <TableHead className="w-36">Scadenza</TableHead>
                  <TableHead className="w-28 text-center">Tempo stimato</TableHead>
                  <TableHead className="w-20 text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {homeworkList.map((hw) => {
                  const isExpired = new Date(hw.dueDate) < new Date(new Date().toDateString());
                  return (
                    <TableRow key={hw.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {hw.title}
                        </div>
                        {hw.description && (
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {hw.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {new Date(hw.assignedDate).toLocaleDateString('it-IT')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-mono font-medium ${
                              isExpired ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {new Date(hw.dueDate).toLocaleDateString('it-IT')}
                          </span>
                          {isExpired && (
                            <Badge variant="outline" className="text-[10px] text-slate-400 py-0 px-1">
                              Passata
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500">
                        {hw.estimatedMinutes ? `${hw.estimatedMinutes} min` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Sei sicuro di voler eliminare questo compito?')) {
                              deleteMutation.mutate(hw.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Nuovo Compito */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              Assegna Nuovo Compito
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Classe {activeAssignment?.class.name} • {activeAssignment?.subject.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Titolo Compito / Esercizi
                </label>
                <Input
                  placeholder="Es. Esercizi pag. 142 n. 1, 2, 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Istruzioni & Dettagli
                </label>
                <textarea
                  className="w-full h-24 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                  placeholder="Specifiche sul materiale da studiare o link agli appunti..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data Assegnazione
                  </label>
                  <Input
                    type="date"
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data di Scadenza (Per quando)
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tempo Stimato di Svolgimento (Minuti)
                </label>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                />
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
                  Assegna Compito
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
