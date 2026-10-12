'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  CheckCircle2,
  Users,
  PenTool,
  Save,
  Loader2,
  AlertTriangle,
  Sparkles,
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
      username: string;
    };
  };
}

interface TeachingAssignment {
  id: string;
  subject: { id: string; name: string };
}

type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_EXIT';

export default function ClassRegistryRollCallPage() {
  const params = useParams();
  const classId = params.classId as string;
  const queryClient = useQueryClient();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [periodNumber, setPeriodNumber] = useState(1);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');

  // Attendance state map: studentProfileId -> status
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatusType>>({});
  const [minutesLateMap] = useState<Record<string, number>>({});
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch enrolled students
  const { data: students, isLoading: isStudentsLoading } = useQuery<EnrolledStudent[]>({
    queryKey: ['class-enrolled-students', classId],
    queryFn: () => apiClient<EnrolledStudent[]>(`/classes/${classId}/students`),
  });

  // Fetch teaching assignments for this class
  const { data: assignments } = useQuery<TeachingAssignment[]>({
    queryKey: ['class-assignments', classId],
    queryFn: () => apiClient<TeachingAssignment[]>(`/teaching-assignments?classId=${classId}`),
  });

  // Auto-select first assignment
  useEffect(() => {
    if (assignments && assignments.length > 0 && assignments[0] && !selectedAssignmentId) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  // Set default all present when students load
  useEffect(() => {
    if (students && Object.keys(attendanceMap).length === 0) {
      const initialMap: Record<string, AttendanceStatusType> = {};
      students.forEach((s) => {
        initialMap[s.studentProfile.id] = 'PRESENT';
      });
      setAttendanceMap(initialMap);
    }
  }, [students, attendanceMap]);

  // Sign lesson & submit roll call mutation
  const signAndSaveMutation = useMutation({
    mutationFn: async () => {
      // 1. Sign lesson
      const lesson = await apiClient<{ id: string }>('/lessons/sign', {
        method: 'POST',
        body: JSON.stringify({
          classId,
          teachingAssignmentId: selectedAssignmentId,
          date,
          periodNumber: Number(periodNumber),
          topic,
          notes,
        }),
      });

      // 2. Submit bulk roll call
      const records = Object.entries(attendanceMap).map(([studentProfileId, status]) => ({
        studentProfileId,
        status,
        minutesLate: status === 'LATE' ? minutesLateMap[studentProfileId] || 10 : undefined,
      }));

      await apiClient(`/attendance/lessons/${lesson.id}/bulk`, {
        method: 'POST',
        body: JSON.stringify({ records }),
      });

      return lesson;
    },
    onSuccess: () => {
      setStatusMsg({
        type: 'success',
        text: 'Ora di lezione firmata e appello salvato con successo!',
      });
      queryClient.invalidateQueries({ queryKey: ['class-lessons', classId] });
    },
    onError: (err: ApiError) => {
      setStatusMsg({
        type: 'error',
        text: err.problem?.detail || 'Errore durante la registrazione dell\'appello',
      });
    },
  });

  const setAllPresent = () => {
    if (!students) return;
    const allPresent: Record<string, AttendanceStatusType> = {};
    students.forEach((s) => {
      allPresent[s.studentProfile.id] = 'PRESENT';
    });
    setAttendanceMap(allPresent);
  };

  const presentCount = Object.values(attendanceMap).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === 'ABSENT').length;
  const lateCount = Object.values(attendanceMap).filter((s) => s === 'LATE').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-600" />
            Registro di Classe & Appello Rapido
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Firma dell'ora di lezione, inserimento argomento e appello presenze degli studenti.
          </p>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center gap-2">
          <Badge variant="success" className="px-3 py-1 text-xs">
            {presentCount} Presenti
          </Badge>
          <Badge variant="destructive" className="px-3 py-1 text-xs">
            {absentCount} Assenti
          </Badge>
          {lateCount > 0 && (
            <Badge variant="warning" className="px-3 py-1 text-xs">
              {lateCount} Ritardi
            </Badge>
          )}
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 border ${
            statusMsg.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Lesson Signature Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PenTool className="h-5 w-5 text-emerald-600" />
            Dati Lezione e Firma
          </CardTitle>
          <CardDescription>
            Definisci la materia, l'ora di lezione e l'argomento trattato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium">Data Lezione</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Ora di Lezione</label>
              <select
                value={periodNumber}
                onChange={(e) => setPeriodNumber(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 mt-1"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <option key={p} value={p}>
                    {p}ª Ora
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Materia di Insegnamento</label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 mt-1"
              >
                {assignments?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label className="text-xs font-medium">Argomento della Lezione *</label>
              <Input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Es. Teorema di Pitagora ed esercizi guidati"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Note Didattiche o Disciplinari</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note interne o compiti assegnati per casa"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roll Call Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Appello degli Studenti
            </CardTitle>
            <CardDescription>
              Seleziona lo stato per ciascuno studente (appello completabile in &lt;30 secondi)
            </CardDescription>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={setAllPresent}
            className="flex items-center gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Tutti Presenti
          </Button>
        </CardHeader>
        <CardContent>
          {isStudentsLoading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600 mb-2" />
              Caricamento studenti...
            </div>
          ) : students && students.length > 0 ? (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nominativo Studente</TableHead>
                    <TableHead>Matricola</TableHead>
                    <TableHead className="text-center">Stato Presenza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((item, idx) => {
                    const studentId = item.studentProfile.id;
                    const currentStatus = attendanceMap[studentId] || 'PRESENT';

                    return (
                      <TableRow key={studentId}>
                        <TableCell className="font-mono text-xs text-slate-400">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.studentProfile.user.lastName} {item.studentProfile.user.firstName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {item.studentProfile.matricola}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceMap((prev) => ({ ...prev, [studentId]: 'PRESENT' }))
                              }
                              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                currentStatus === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              P
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceMap((prev) => ({ ...prev, [studentId]: 'ABSENT' }))
                              }
                              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                currentStatus === 'ABSENT'
                                  ? 'bg-red-600 text-white shadow'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              A
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceMap((prev) => ({ ...prev, [studentId]: 'LATE' }))
                              }
                              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                currentStatus === 'LATE'
                                  ? 'bg-amber-500 text-white shadow'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              R
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceMap((prev) => ({ ...prev, [studentId]: 'EARLY_EXIT' }))
                              }
                              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                currentStatus === 'EARLY_EXIT'
                                  ? 'bg-purple-600 text-white shadow'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              U
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-6 text-sm text-slate-500">
              Nessun allievo iscritto a questa classe.
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              size="lg"
              disabled={signAndSaveMutation.isPending || !topic}
              onClick={() => signAndSaveMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              {signAndSaveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvataggio in corso...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Firma Lezione e Salva Appello
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
