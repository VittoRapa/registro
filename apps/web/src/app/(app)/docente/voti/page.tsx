'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Plus,
  Users,
  Loader2,
  Trash2,
  Edit2,
  FileSpreadsheet,
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
  class: { id: string; name: string; year: number; section: string };
  subject: { id: string; name: string; code: string };
}

interface EnrolledStudent {
  id: string;
  status: string;
  studentProfile: {
    id: string;
    matricola: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

interface GradeRecord {
  id: string;
  value: number;
  displayValue?: string;
  weight: number;
  type: 'SCRITTO' | 'ORALE' | 'PRATICO' | 'PROGETTO' | 'TEST';
  date: string;
  description?: string;
  studentProfileId: string;
  teachingAssignmentId: string;
}

export default function TeacherGradesPage() {
  const queryClient = useQueryClient();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Q1');
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [gradeToEdit, setGradeToEdit] = useState<GradeRecord | null>(null);
  const [reasonForChange, setReasonForChange] = useState('');

  // Single grade form state
  const [singleStudentId, setSingleStudentId] = useState('');
  const [singleValue, setSingleValue] = useState('7');
  const [singleWeight, setSingleWeight] = useState('1');
  const [singleType, setSingleType] = useState<'SCRITTO' | 'ORALE' | 'PRATICO' | 'PROGETTO' | 'TEST'>('ORALE');
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [singleDesc, setSingleDesc] = useState('');

  // Bulk grade form state
  const [bulkTitle, setBulkTitle] = useState('');
  const [bulkType, setBulkType] = useState<'SCRITTO' | 'ORALE' | 'PRATICO' | 'PROGETTO' | 'TEST'>('SCRITTO');
  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});

  // 1. Fetch Teacher Assignments
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<TeachingAssignment[]>({
    queryKey: ['my-teaching-assignments'],
    queryFn: async () => {
      return apiClient.get<TeachingAssignment[]>('/teaching-assignments/my');
    },
  });

  const activeAssignment = assignments.find((a) => a.id === selectedAssignmentId) || assignments[0];
  const currentAssignmentId = activeAssignment?.id || '';
  const currentClassId = activeAssignment?.class?.id || '';

  // 2. Fetch Enrolled Students for selected class
  const { data: students = [], isLoading: isLoadingStudents } = useQuery<EnrolledStudent[]>({
    queryKey: ['class-students', currentClassId],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<EnrolledStudent[]>(`/classes/${currentClassId}/enrollments`);
    },
    enabled: !!currentClassId,
  });

  // 3. Fetch Grades for selected assignment
  const { data: grades = [], isLoading: isLoadingGrades } = useQuery<GradeRecord[]>({
    queryKey: ['assignment-grades', currentAssignmentId],
    queryFn: async () => {
      if (!currentAssignmentId) return [];
      return apiClient.get<GradeRecord[]>(`/grades?teachingAssignmentId=${currentAssignmentId}`);
    },
    enabled: !!currentAssignmentId,
  });

  // 4. Mutations
  const createSingleGradeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/grades', {
        teachingAssignmentId: currentAssignmentId,
        studentProfileId: singleStudentId,
        value: parseFloat(singleValue),
        displayValue: singleValue,
        weight: parseFloat(singleWeight),
        type: singleType,
        date: singleDate,
        description: singleDesc || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-grades', currentAssignmentId] });
      setSingleModalOpen(false);
      setSingleDesc('');
    },
    onError: (err: ApiError) => {
      alert(`Errore inserimento voto: ${err.message}`);
    },
  });

  const createBulkGradesMutation = useMutation({
    mutationFn: async () => {
      const studentGrades = Object.entries(bulkValues)
        .filter(([_, val]) => val.trim() !== '')
        .map(([studentProfileId, val]) => ({
          studentProfileId,
          value: parseFloat(val),
          displayValue: val,
        }));

      return apiClient.post('/grades/bulk', {
        teachingAssignmentId: currentAssignmentId,
        type: bulkType,
        date: bulkDate,
        title: bulkTitle,
        grades: studentGrades,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-grades', currentAssignmentId] });
      setBulkModalOpen(false);
      setBulkTitle('');
      setBulkValues({});
    },
    onError: (err: ApiError) => {
      alert(`Errore inserimento voti di classe: ${err.message}`);
    },
  });

  const updateGradeMutation = useMutation({
    mutationFn: async () => {
      if (!gradeToEdit) return;
      return apiClient.patch(`/grades/${gradeToEdit.id}`, {
        value: gradeToEdit.value,
        displayValue: gradeToEdit.value.toString(),
        description: gradeToEdit.description,
        reasonForChange,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-grades', currentAssignmentId] });
      setEditModalOpen(false);
      setGradeToEdit(null);
      setReasonForChange('');
    },
    onError: (err: ApiError) => {
      alert(`Errore aggiornamento voto: ${err.message}`);
    },
  });

  const deleteGradeMutation = useMutation({
    mutationFn: async (gradeId: string) => {
      const reason = prompt('Motivazione cancellazione voto (obbligatoria per audit log):');
      if (!reason) return;
      return apiClient.delete(`/grades/${gradeId}?reason=${encodeURIComponent(reason)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-grades', currentAssignmentId] });
    },
    onError: (err: ApiError) => {
      alert(`Errore cancellazione: ${err.message}`);
    },
  });

  // Calculate student stats helper
  const getStudentGrades = (studentProfileId: string) => {
    return grades.filter((g) => g.studentProfileId === studentProfileId);
  };

  const calculateStudentAverage = (studentProfileId: string) => {
    const list = getStudentGrades(studentProfileId);
    if (list.length === 0) return { arithmetic: null, weighted: null };
    const sum = list.reduce((acc, g) => acc + g.value, 0);
    const arithmetic = sum / list.length;

    const weightedSum = list.reduce((acc, g) => acc + g.value * (g.weight || 1), 0);
    const totalWeight = list.reduce((acc, g) => acc + (g.weight || 1), 0);
    const weighted = totalWeight > 0 ? weightedSum / totalWeight : arithmetic;

    return { arithmetic, weighted };
  };

  const activeStudents = students.filter((s) => s.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-emerald-600" />
            Registro Valutazioni & Voti
          </h1>
          <p className="text-sm text-slate-500">
            Gestisci voti orali, scritti, pratici e compiti in classe con calcolo automatico medie ponderate.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            disabled={!currentAssignmentId}
            onClick={() => {
              if (activeStudents.length > 0 && activeStudents[0]) {
                setSingleStudentId(activeStudents[0].studentProfile.id);
              }
              setSingleModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuovo Voto Singolo
          </Button>

          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            disabled={!currentAssignmentId}
            onClick={() => {
              const initial: Record<string, string> = {};
              activeStudents.forEach((s) => {
                initial[s.studentProfile.id] = '';
              });
              setBulkValues(initial);
              setBulkModalOpen(true);
            }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Valutazione di Classe (Verifica)
          </Button>
        </div>
      </div>

      {/* Selectors Bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Classe e Materia</label>
            <select
              className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={currentAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              disabled={isLoadingAssignments}
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  Classe {a.class.name} — {a.subject.name}
                </option>
              ))}
              {assignments.length === 0 && <option value="">Nessun insegnamento assegnato</option>}
            </select>
          </div>

          <div className="w-48">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Periodo Didattico</label>
            <select
              className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              <option value="Q1">1° Quadrimestre</option>
              <option value="Q2">2° Quadrimestre</option>
              <option value="ALL">Anno Intero</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Grades Matrix Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Griglia Valutazioni Studenti</CardTitle>
              <CardDescription>
                {activeAssignment ? `Classe ${activeAssignment.class.name} • ${activeAssignment.subject.name}` : 'Seleziona una classe'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {activeStudents.length} Studenti
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {grades.length} Voti inseriti
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingStudents || isLoadingGrades ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Caricamento dati voti...
            </div>
          ) : activeStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Nessuno studente iscritto a questa classe.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-64">Studente</TableHead>
                  <TableHead>Voti Registrati</TableHead>
                  <TableHead className="w-28 text-center">Media Aritm.</TableHead>
                  <TableHead className="w-28 text-center font-bold">Media Pond.</TableHead>
                  <TableHead className="w-24 text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeStudents.map((student, idx) => {
                  const studentGrades = getStudentGrades(student.studentProfile.id);
                  const { arithmetic, weighted } = calculateStudentAverage(student.studentProfile.id);

                  return (
                    <TableRow key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <TableCell className="text-center font-mono text-xs text-slate-400">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {student.studentProfile.user.lastName} {student.studentProfile.user.firstName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Matr: {student.studentProfile.matricola}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {studentGrades.length === 0 ? (
                            <span className="text-xs italic text-slate-400">Nessun voto registrato</span>
                          ) : (
                            studentGrades.map((g) => {
                              const isPositive = g.value >= 6.0;
                              return (
                                <div
                                  key={g.id}
                                  className={`group relative inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border transition-shadow shadow-xs cursor-pointer ${
                                    isPositive
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                                  }`}
                                  title={`${g.type} (${g.date}): ${g.description || 'Senza descrizione'} - Peso: ${g.weight}`}
                                  onClick={() => {
                                    setGradeToEdit(g);
                                    setEditModalOpen(true);
                                  }}
                                >
                                  <span>{g.displayValue || g.value}</span>
                                  <span className="text-[10px] font-normal opacity-70">
                                    {g.type[0]}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {arithmetic !== null ? (
                          <span
                            className={
                              arithmetic >= 6
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-red-600 dark:text-red-400 font-semibold'
                            }
                          >
                            {arithmetic.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {weighted !== null ? (
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              weighted >= 6
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200'
                            }`}
                          >
                            {weighted.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSingleStudentId(student.studentProfile.id);
                            setSingleModalOpen(true);
                          }}
                          title="Aggiungi voto allo studente"
                        >
                          <Plus className="h-4 w-4 text-slate-500" />
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

      {/* Modal 1: Inserisci Singolo Voto */}
      {singleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              Inserisci Singolo Voto
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Assegna una valutazione per la prova orale o compito individuale.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Studente
                </label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                  value={singleStudentId}
                  onChange={(e) => setSingleStudentId(e.target.value)}
                >
                  {activeStudents.map((s) => (
                    <option key={s.studentProfile.id} value={s.studentProfile.id}>
                      {s.studentProfile.user.lastName} {s.studentProfile.user.firstName} ({s.studentProfile.matricola})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Voto (es. 7, 7.5, 8)
                  </label>
                  <Input
                    type="number"
                    step="0.25"
                    min="1"
                    max="10"
                    value={singleValue}
                    onChange={(e) => setSingleValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Peso Ponderato
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="3"
                    value={singleWeight}
                    onChange={(e) => setSingleWeight(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipologia Prova
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                    value={singleType}
                    onChange={(e) => setSingleType(e.target.value as GradeRecord['type'])}
                  >
                    <option value="ORALE">Orale</option>
                    <option value="SCRITTO">Scritto</option>
                    <option value="PRATICO">Pratico</option>
                    <option value="PROGETTO">Progetto</option>
                    <option value="TEST">Test Rapido</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data Valutazione
                  </label>
                  <Input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Descrizione / Argomento (Opzionale)
                </label>
                <Input
                  placeholder="Es. Interrogazione su Dante, Canto V"
                  value={singleDesc}
                  onChange={(e) => setSingleDesc(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSingleModalOpen(false)}>
                  Annulla
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={createSingleGradeMutation.isPending}
                  onClick={() => createSingleGradeMutation.mutate()}
                >
                  {createSingleGradeMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Conferma Voto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Valutazione di Classe (Bulk) */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Inserimento Valutazione di Classe (Verifica / Prova Scritta)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Inserisci i voti per tutti gli studenti con una singola operazione atomica.
            </p>

            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Titolo Verifica / Prova
                  </label>
                  <Input
                    placeholder="Es. Verifica scritta sul Romanticismo"
                    value={bulkTitle}
                    onChange={(e) => setBulkTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data Verifica
                  </label>
                  <Input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-48">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tipologia Prova
                </label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value as GradeRecord['type'])}
                >
                  <option value="SCRITTO">Scritto</option>
                  <option value="PRATICO">Pratico</option>
                  <option value="TEST">Test</option>
                  <option value="PROGETTO">Progetto</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Studente</TableHead>
                    <TableHead className="w-32">Voto (1 - 10)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeStudents.map((s) => (
                    <TableRow key={s.studentProfile.id}>
                      <TableCell className="font-medium text-sm">
                        {s.studentProfile.user.lastName} {s.studentProfile.user.firstName}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.25"
                          min="1"
                          max="10"
                          placeholder="es. 7"
                          value={bulkValues[s.studentProfile.id] || ''}
                          onChange={(e) =>
                            setBulkValues({
                              ...bulkValues,
                              [s.studentProfile.id]: e.target.value,
                            })
                          }
                          className="h-8"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                {Object.values(bulkValues).filter((v) => v.trim() !== '').length} voti pronti per l&apos;inserimento
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBulkModalOpen(false)}>
                  Annulla
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!bulkTitle.trim() || createBulkGradesMutation.isPending}
                  onClick={() => createBulkGradesMutation.mutate()}
                >
                  {createBulkGradesMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Registra Tutti i Voti
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Modifica / Correzione Voto con Audit */}
      {editModalOpen && gradeToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-amber-600" />
              Correzione Voto (Tracciata in Audit)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Finestra di modifica consentita (entro 7 giorni). È richiesta una motivazione formale.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Valore Voto Corretto
                </label>
                <Input
                  type="number"
                  step="0.25"
                  min="1"
                  max="10"
                  value={gradeToEdit.value}
                  onChange={(e) =>
                    setGradeToEdit({
                      ...gradeToEdit,
                      value: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Descrizione
                </label>
                <Input
                  value={gradeToEdit.description || ''}
                  onChange={(e) =>
                    setGradeToEdit({
                      ...gradeToEdit,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Motivazione della Rettifica (Obbligatoria)
                </label>
                <Input
                  placeholder="Es. Errore materiale di calcolo punteggio"
                  value={reasonForChange}
                  onChange={(e) => setReasonForChange(e.target.value)}
                />
              </div>

              <div className="mt-6 flex justify-between items-center">
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    deleteGradeMutation.mutate(gradeToEdit.id);
                    setEditModalOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Elimina
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                    Chiudi
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!reasonForChange.trim() || updateGradeMutation.isPending}
                    onClick={() => updateGradeMutation.mutate()}
                  >
                    {updateGradeMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salva Correzione
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
