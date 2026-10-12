'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  Layers,
  TrendingUp,
  Award,
  Loader2,
  FileDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { StudentNav } from '@/components/navigation/student-nav';
import { GradeSimulator } from '@/components/grades/grade-simulator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  role: string;
  studentProfile?: { id: string; matricola: string };
  parentLinksAsParent?: Array<{
    studentProfile: {
      id: string;
      user: { firstName: string; lastName: string };
    };
  }>;
}

interface GradeRecord {
  id: string;
  value: number;
  displayValue?: string;
  weight: number;
  type: string;
  date: string;
  description?: string;
  teachingAssignment: {
    subject: { id: string; name: string; color?: string };
    teacher?: { user: { lastName: string } };
  };
}

interface StudentSummary {
  studentProfileId: string;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    subjectColor: string | null;
    gradesCount: number;
    arithmeticAverage: number;
    weightedAverage: number;
  }>;
  overall: {
    gradesCount: number;
    arithmeticAverage: number;
    weightedAverage: number;
  };
}

export default function StudentGradesPage() {
  const { user } = useAuthStore();
  const [selectedTerm, setSelectedTerm] = useState('ALL');

  // 1. Fetch user profile
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['my-profile'],
    queryFn: async () => apiClient.get<UserProfile>('/users/me/profile'),
  });

  const isParent = user?.role === 'PARENT';
  const studentProfileId = isParent
    ? profile?.parentLinksAsParent?.[0]?.studentProfile?.id
    : profile?.studentProfile?.id;

  // 2. Fetch grades summary & averages
  const { data: summary, isLoading: isLoadingSummary } = useQuery<StudentSummary | null>({
    queryKey: ['student-grades-summary', studentProfileId, selectedTerm],
    queryFn: async () => {
      if (!studentProfileId) return null;
      return apiClient.get<StudentSummary>(
        `/grades/summary?studentProfileId=${studentProfileId}${selectedTerm !== 'ALL' ? `&termId=${selectedTerm}` : ''}`
      );
    },
    enabled: !!studentProfileId,
  });

  // 3. Fetch detailed grades list
  const { data: gradesList = [], isLoading: isLoadingGrades } = useQuery<GradeRecord[]>({
    queryKey: ['student-grades-list', studentProfileId, selectedTerm],
    queryFn: async () => {
      if (!studentProfileId) return [];
      return apiClient.get<GradeRecord[]>(
        `/grades?studentProfileId=${studentProfileId}${selectedTerm !== 'ALL' ? `&termId=${selectedTerm}` : ''}`
      );
    },
    enabled: !!studentProfileId,
  });

  // Group grades by subject
  const gradesBySubject: Record<string, GradeRecord[]> = {};
  gradesList.forEach((g) => {
    const sName = g.teachingAssignment?.subject?.name || 'Altro';
    if (!gradesBySubject[sName]) gradesBySubject[sName] = [];
    gradesBySubject[sName].push(g);
  });

  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadReportCard = async () => {
    if (!studentProfileId) {
      toast.error('Profilo studente non trovato');
      return;
    }
    setDownloadingReport(true);
    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiUrl}/reports/report-card/${studentProfileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Impossibile generare la pagella');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pagella_${studentProfileId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Pagella scolastica generata e scaricata con successo!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore download pagella';
      toast.error(msg);
    } finally {
      setDownloadingReport(false);
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
              <GraduationCap className="h-7 w-7 text-emerald-600" />
              Valutazioni & Media Scolastica
            </h1>
            <p className="text-sm text-slate-500">
              {isParent ? 'Andamento scolastico di tuo figlio' : 'Il tuo andamento scolastico'} suddiviso per materia e periodo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReportCard}
              disabled={downloadingReport || !studentProfileId}
              className="gap-1.5 border-slate-300 dark:border-slate-700"
            >
              {downloadingReport ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              ) : (
                <FileDown className="h-4 w-4 text-emerald-600" />
              )}
              Scarica Pagella (PDF)
            </Button>

            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="h-9 px-3 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs"
            >
              <option value="ALL">Anno Intero</option>
              <option value="Q1">1° Quadrimestre</option>
              <option value="Q2">2° Quadrimestre</option>
            </select>
          </div>
        </div>

        {/* Overall Statistics Cards */}
        {summary?.overall && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-emerald-600 p-3 text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Media Ponderata Globale
                  </div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
                    {summary.overall.weightedAverage > 0 ? summary.overall.weightedAverage.toFixed(2) : '—'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-blue-100 dark:bg-blue-950 p-3 text-blue-600 dark:text-blue-400">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Media Aritmetica
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {summary.overall.arithmeticAverage > 0 ? summary.overall.arithmeticAverage.toFixed(2) : '—'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-purple-100 dark:bg-purple-950 p-3 text-purple-600 dark:text-purple-400">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Voti Totali
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {summary.overall.gradesCount}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subject Breakdown Table */}
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg">Riepilogo Materie & Medie</CardTitle>
            <CardDescription>Visualizza tutti i voti e le medie calcolate per ciascuna disciplina</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingSummary || isLoadingGrades ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Caricamento voti...
              </div>
            ) : summary?.subjects.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Nessuna valutazione ancora registrata nel periodo selezionato.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                    <TableHead className="w-64">Materia</TableHead>
                    <TableHead>Voti Registrati</TableHead>
                    <TableHead className="w-28 text-center">Media Aritm.</TableHead>
                    <TableHead className="w-28 text-center font-bold">Media Pond.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.subjects.map((sub) => {
                    const list = gradesBySubject[sub.subjectName] || [];
                    const isPassing = sub.weightedAverage >= 6.0;

                    return (
                      <TableRow key={sub.subjectId}>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {sub.subjectName}
                          </div>
                          <div className="text-xs text-slate-400">
                            {list.length} prove svolte
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {list.map((g) => {
                              const pos = g.value >= 6.0;
                              return (
                                <div
                                  key={g.id}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border shadow-xs ${
                                    pos
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                                  }`}
                                  title={`${g.type} (${new Date(g.date).toLocaleDateString('it-IT')}): ${g.description || 'Nessuna descrizione'}`}
                                >
                                  <span>{g.displayValue || g.value}</span>
                                  <span className="text-[10px] font-normal opacity-70">
                                    {g.type[0]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {sub.arithmeticAverage > 0 ? (
                            <span className={sub.arithmeticAverage >= 6 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {sub.arithmeticAverage.toFixed(2)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {sub.weightedAverage > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                isPassing
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200'
                              }`}
                            >
                              {sub.weightedAverage.toFixed(2)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Grade Target Simulator */}
        <div className="mt-8">
          <GradeSimulator
            initialAverage={summary?.overall.weightedAverage || 6.0}
            initialCount={summary?.overall.gradesCount || gradesList.length || 4}
          />
        </div>
      </main>
    </div>
  );
}
