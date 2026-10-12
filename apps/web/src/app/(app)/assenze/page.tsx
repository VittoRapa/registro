'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Plus,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { StudentNav } from '@/components/navigation/student-nav';
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

interface UserProfile {
  id: string;
  role: string;
  studentProfile?: { id: string; matricola: string };
  parentLinksAsParent?: Array<{
    canJustify: boolean;
    studentProfile: {
      id: string;
      matricola: string;
      user: { firstName: string; lastName: string };
    };
  }>;
}

interface AttendanceRecordItem {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_EXIT';
  minutesLate?: number;
  lessonRecord: {
    date: string;
    periodNumber: number;
    topic?: string;
    teachingAssignment: { subject: { name: string } };
  };
}

interface AttendanceHistoryResponse {
  records: AttendanceRecordItem[];
  stats: {
    totalLessons: number;
    present: number;
    absent: number;
    late: number;
    earlyExit: number;
    attendanceRate: number;
  };
}

type JustificationReasonType = 'MALATTIA' | 'FAMIGLIA' | 'ALTRO';

export default function StudentAttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reasonType, setReasonType] = useState<JustificationReasonType>('MALATTIA');
  const [reasonText, setReasonText] = useState('');

  // 1. Fetch user profile
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['my-profile'],
    queryFn: async () => apiClient.get<UserProfile>('/users/me/profile'),
  });

  const isParent = user?.role === 'PARENT';
  const studentProfileId = isParent
    ? profile?.parentLinksAsParent?.[0]?.studentProfile?.id
    : profile?.studentProfile?.id;

  // 2. Fetch attendance history & statistics
  const { data: history, isLoading } = useQuery<AttendanceHistoryResponse | null>({
    queryKey: ['student-attendance-history', studentProfileId],
    queryFn: async () => {
      if (!studentProfileId) return null;
      return apiClient.get<AttendanceHistoryResponse>(`/attendance/students/${studentProfileId}`);
    },
    enabled: !!studentProfileId,
  });

  // 3. Justification submission mutation
  const submitJustificationMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/attendance/justifications', {
        studentProfileId,
        dateFrom,
        dateTo,
        reasonType,
        reasonText: reasonText || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance-history', studentProfileId] });
      setModalOpen(false);
      setReasonText('');
      alert('Richiesta di giustificazione inviata con successo alla segreteria e ai docenti.');
    },
    onError: (err: ApiError) => {
      alert(`Errore invio giustificazione: ${err.message}`);
    },
  });

  const getStatusBadge = (status: string, minutes?: number) => {
    switch (status) {
      case 'PRESENT':
        return <Badge className="bg-emerald-600 text-white">Presente</Badge>;
      case 'ABSENT':
        return <Badge className="bg-red-600 text-white">Assente</Badge>;
      case 'LATE':
        return <Badge className="bg-amber-500 text-white">Ritardo {minutes ? `(${minutes}m)` : ''}</Badge>;
      case 'EARLY_EXIT':
        return <Badge className="bg-purple-600 text-white">Uscita Anticipata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <StudentNav />

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Clock className="h-7 w-7 text-emerald-600" />
              Libretto Presenze & Giustificazioni
            </h1>
            <p className="text-sm text-slate-500">
              Storico delle lezioni, assenze, ritardi e invio giustificazioni digitali.
            </p>
          </div>

          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            disabled={!studentProfileId}
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Invia Giustificazione
          </Button>
        </div>

        {/* Stats summary cards */}
        {history?.stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-slate-500 font-semibold uppercase">Tasso Presenze</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {history.stats.attendanceRate}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-slate-500 font-semibold uppercase">Ore Totali</div>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
                  {history.stats.totalLessons}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-slate-500 font-semibold uppercase">Assenze</div>
                <div className="text-2xl font-black text-red-600 mt-1">
                  {history.stats.absent}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-slate-500 font-semibold uppercase">Ritardi</div>
                <div className="text-2xl font-black text-amber-500 mt-1">
                  {history.stats.late}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-slate-500 font-semibold uppercase">Uscite Anticipate</div>
                <div className="text-2xl font-black text-purple-600 mt-1">
                  {history.stats.earlyExit}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Records Table */}
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg">Registro Orario delle Presenze</CardTitle>
            <CardDescription>Elenco dettagliato di tutte le ore di lezione e del relativo stato</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Caricamento libretto presenze...
              </div>
            ) : !history || history.records.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Nessuna registrazione di presenza registrata finora.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead className="w-20 text-center">Ora</TableHead>
                    <TableHead>Materia & Argomento Trattato</TableHead>
                    <TableHead className="w-36 text-center">Stato Presenza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {new Date(rec.lessonRecord.date).toLocaleDateString('it-IT')}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">
                        {rec.lessonRecord.periodNumber}°
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {rec.lessonRecord.teachingAssignment?.subject?.name || 'Lezione'}
                        </div>
                        {rec.lessonRecord.topic && (
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {rec.lessonRecord.topic}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(rec.status, rec.minutesLate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal: Invia Giustificazione */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                Invia Giustificazione Digitale
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Modulo formale di giustificazione per assenza o ritardo.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Dal giorno
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Al giorno (incluso)
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Motivo
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                    value={reasonType}
                    onChange={(e) => setReasonType(e.target.value as JustificationReasonType)}
                  >
                    <option value="MALATTIA">Motivi di Salute / Malattia</option>
                    <option value="FAMIGLIA">Motivi Familiari</option>
                    <option value="ALTRO">Altro / Impegno Improrogabile</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Note esplicative (Opzionale)
                  </label>
                  <textarea
                    className="w-full h-20 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                    placeholder="Specifiche o allegati medici se richiesti dal regolamento scolastico..."
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Annulla
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={submitJustificationMutation.isPending}
                    onClick={() => submitJustificationMutation.mutate()}
                  >
                    {submitJustificationMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Conferma Giustificazione
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
