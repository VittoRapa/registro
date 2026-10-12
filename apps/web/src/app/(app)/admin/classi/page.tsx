'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Plus, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api-client';

interface ClassItem {
  id: string;
  name: string;
  year: number;
  section: string;
  academicYear: { id: string; name: string };
  _count?: { enrollments: number };
}

interface StudentInClass {
  id: string;
  status: string;
  studentProfile: {
    matricola: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
    };
  };
}

export default function ClassesManagementPage() {
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [year, setYear] = useState<number>(1);
  const [section, setSection] = useState<string>('A');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch classes
  const { data: classes, isLoading } = useQuery<ClassItem[]>({
    queryKey: ['admin-classes'],
    queryFn: () => apiClient<ClassItem[]>('/classes'),
  });

  // Fetch students enrolled in selected class
  const { data: enrolledStudents, isLoading: isEnrolledLoading } = useQuery<StudentInClass[]>({
    queryKey: ['admin-class-students', selectedClass?.id],
    queryFn: () => apiClient<StudentInClass[]>(`/classes/${selectedClass?.id}/students`),
    enabled: !!selectedClass,
  });

  // Fetch active academic year
  const { data: academicYears } = useQuery<{ id: string; name: string; isActive: boolean }[]>({
    queryKey: ['academic-years'],
    queryFn: () => apiClient<{ id: string; name: string; isActive: boolean }[]>('/academic-years'),
  });

  const activeYear = academicYears?.find((ay) => ay.isActive) || academicYears?.[0];

  const createClassMutation = useMutation({
    mutationFn: () =>
      apiClient('/classes', {
        method: 'POST',
        body: JSON.stringify({
          year: Number(year),
          section: section.trim().toUpperCase(),
          academicYearId: activeYear?.id,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      setIsCreateOpen(false);
      setYear(1);
      setSection('A');
      setErrorMsg(null);
    },
    onError: (err: ApiError) => {
      setErrorMsg(err.problem?.detail || 'Errore durante la creazione della classe');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            Classi e Sezioni Scolastiche
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestione delle classi per l'anno scolastico attivo {activeYear ? `(${activeYear.name})` : ''}.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuova Classe
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-2" />
          Caricamento classi...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes && classes.length > 0 ? (
            classes.map((c) => (
              <Card
                key={c.id}
                className="hover:border-blue-500 transition-all cursor-pointer"
                onClick={() => setSelectedClass(c)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xl font-bold">Classe {c.name}</CardTitle>
                  <span className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold px-2 py-0.5 rounded">
                    Anno {c.year}°
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>Sezione {c.section}</span>
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <span className="text-xs text-blue-600 hover:underline">Vedi studenti iscritti →</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-slate-500 border rounded-xl border-dashed">
              Nessuna classe presente. Crea la prima classe o importa il file CSV.
            </div>
          )}
        </div>
      )}

      {/* Modal Iscritti alla Classe */}
      <Dialog open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
        <DialogHeader>
          <DialogTitle>Studenti Iscritti - Classe {selectedClass?.name}</DialogTitle>
          <DialogDescription>
            Elenco anagrafico degli studenti attualmente attivi in questa sezione.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isEnrolledLoading ? (
            <div className="py-8 text-center text-slate-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
              Caricamento studenti iscritti...
            </div>
          ) : enrolledStudents && enrolledStudents.length > 0 ? (
            <div className="max-h-80 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matricola</TableHead>
                    <TableHead>Nominativo</TableHead>
                    <TableHead>Username</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolledStudents.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.studentProfile.matricola}</TableCell>
                      <TableCell className="font-medium">
                        {e.studentProfile.user.lastName} {e.studentProfile.user.firstName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {e.studentProfile.user.username}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-center py-6 text-slate-500">
              Nessuno studente iscritto a questa classe al momento.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setSelectedClass(null)}>Chiudi</Button>
        </DialogFooter>
      </Dialog>

      {/* Modal Creazione Classe */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogHeader>
          <DialogTitle>Crea Nuova Classe</DialogTitle>
          <DialogDescription>
            Specifica l'anno di corso e la sezione alfabetica per la nuova classe.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createClassMutation.mutate();
          }}
          className="space-y-4"
        >
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Anno di Corso (1-5)</label>
              <Input
                type="number"
                min={1}
                max={5}
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="text-xs font-medium">Sezione (A, B, C...)</label>
              <Input
                type="text"
                maxLength={2}
                required
                value={section}
                onChange={(e) => setSection(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={createClassMutation.isPending}>
              {createClassMutation.isPending ? 'Creazione...' : 'Crea Classe'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
