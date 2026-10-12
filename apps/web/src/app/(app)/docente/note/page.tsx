'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  ThumbsUp,
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

interface EnrolledStudent {
  id: string;
  studentProfile: {
    id: string;
    matricola: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

type DisciplinaryNoteType = 'NOTA' | 'RICHIAMO' | 'SOSPENSIONE' | 'ANNOTAZIONE_POSITIVA';

interface DisciplinaryNoteItem {
  id: string;
  type: DisciplinaryNoteType;
  text: string;
  date: string;
  parentAcknowledgedAt?: string;
  visibleToParent: boolean;
  studentProfile?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  author: {
    firstName: string;
    lastName: string;
  };
}

export default function TeacherDisciplinaryNotesPage() {
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [targetType, setTargetType] = useState<'STUDENT' | 'CLASS'>('STUDENT');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [type, setType] = useState<DisciplinaryNoteType>('NOTA');
  const [text, setText] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visibleToParent, setVisibleToParent] = useState(true);

  // 1. Fetch teacher assignments
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<TeachingAssignment[]>({
    queryKey: ['my-teaching-assignments'],
    queryFn: async () => apiClient.get<TeachingAssignment[]>('/teaching-assignments/my'),
  });

  const activeAssignment = assignments.find((a) => a.class.id === selectedClassId) || assignments[0];
  const currentClassId = activeAssignment?.class?.id || '';

  // 2. Fetch enrolled students
  const { data: students = [] } = useQuery<EnrolledStudent[]>({
    queryKey: ['class-students', currentClassId],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<EnrolledStudent[]>(`/classes/${currentClassId}/enrollments`);
    },
    enabled: !!currentClassId,
  });

  // 3. Fetch notes for class
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery<DisciplinaryNoteItem[]>({
    queryKey: ['disciplinary-notes', currentClassId],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<DisciplinaryNoteItem[]>(`/disciplinary-notes?classId=${currentClassId}`);
    },
    enabled: !!currentClassId,
  });

  // 4. Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/disciplinary-notes', {
        classId: currentClassId,
        studentProfileId: targetType === 'STUDENT' ? selectedStudentId : undefined,
        type,
        text,
        date,
        visibleToParent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary-notes', currentClassId] });
      setModalOpen(false);
      setText('');
    },
    onError: (err: ApiError) => {
      alert(`Errore inserimento nota disciplinare: ${err.message}`);
    },
  });

  const getNoteBadge = (noteType: DisciplinaryNoteType) => {
    switch (noteType) {
      case 'NOTA':
        return <Badge className="bg-red-600 text-white">Nota Disciplinare</Badge>;
      case 'RICHIAMO':
        return <Badge className="bg-amber-600 text-white">Richiamo Verbale</Badge>;
      case 'SOSPENSIONE':
        return <Badge className="bg-purple-900 text-white font-bold">Sospensione</Badge>;
      case 'ANNOTAZIONE_POSITIVA':
        return <Badge className="bg-emerald-600 text-white flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Nota di Merito</Badge>;
      default:
        return <Badge variant="outline">{noteType}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
            Note Disciplinari & Comunicazioni Famiglie
          </h1>
          <p className="text-sm text-slate-500">
            Registra annotazioni comportamentali, note di classe e verificane la presa visione da parte dei genitori.
          </p>
        </div>

        <Button
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          disabled={!currentClassId}
          onClick={() => {
            if (students.length > 0 && students[0]) {
              setSelectedStudentId(students[0].studentProfile.id);
            }
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuova Nota / Richiamo
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

      {/* Notes List */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg">Registro Note della Classe</CardTitle>
          <CardDescription>
            {activeAssignment ? `Classe ${activeAssignment.class.name}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingNotes ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Caricamento note disciplinari...
            </div>
          ) : notes.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Nessuna nota disciplinare registrata per questa classe.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead className="w-48">Destinatario</TableHead>
                  <TableHead>Motivazione / Testo della Nota</TableHead>
                  <TableHead className="w-32">Data</TableHead>
                  <TableHead className="w-40 text-center">Presa Visione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{getNoteBadge(n.type)}</TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {n.studentProfile ? (
                        `${n.studentProfile.user.lastName} ${n.studentProfile.user.firstName}`
                      ) : (
                        <span className="italic text-slate-500">Intera Classe</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-800 dark:text-slate-200">{n.text}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Docente: {n.author.lastName} {n.author.firstName}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {new Date(n.date).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell className="text-center">
                      {n.parentAcknowledgedAt ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Firmata
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(n.parentAcknowledgedAt).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3.5 w-3.5" /> In attesa
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Nuova Nota */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Inserisci Nota Disciplinare o Richiamo
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Classe {activeAssignment?.class.name}
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={targetType === 'STUDENT' ? 'default' : 'outline'}
                  size="sm"
                  className={targetType === 'STUDENT' ? 'bg-emerald-600' : ''}
                  onClick={() => setTargetType('STUDENT')}
                >
                  Singolo Studente
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'CLASS' ? 'default' : 'outline'}
                  size="sm"
                  className={targetType === 'CLASS' ? 'bg-emerald-600' : ''}
                  onClick={() => setTargetType('CLASS')}
                >
                  Intera Classe
                </Button>
              </div>

              {targetType === 'STUDENT' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Seleziona Studente
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                  >
                    {students.map((s) => (
                      <option key={s.studentProfile.id} value={s.studentProfile.id}>
                        {s.studentProfile.user.lastName} {s.studentProfile.user.firstName} ({s.studentProfile.matricola})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipologia
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                    value={type}
                    onChange={(e) => setType(e.target.value as DisciplinaryNoteType)}
                  >
                    <option value="NOTA">Nota Disciplinare</option>
                    <option value="RICHIAMO">Richiamo Verbale</option>
                    <option value="ANNOTAZIONE_POSITIVA">Nota di Merito</option>
                    <option value="SOSPENSIONE">Proposta Sospensione</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Descrizione Comportamento
                </label>
                <textarea
                  className="w-full h-24 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                  placeholder="Descrivi dettagliatamente l'accaduto in classe..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="visibleParent"
                  checked={visibleToParent}
                  onChange={(e) => setVisibleToParent(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="visibleParent" className="text-xs text-slate-600 dark:text-slate-400">
                  Visibile ai genitori sul registro elettronico
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Annulla
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={!text.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Registra Nota
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
