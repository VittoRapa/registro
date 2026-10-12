'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

export default function SubjectsCataloguePage() {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: subjects, isLoading } = useQuery<SubjectItem[]>({
    queryKey: ['admin-subjects'],
    queryFn: () => apiClient<SubjectItem[]>('/subjects'),
  });

  const createSubjectMutation = useMutation({
    mutationFn: () =>
      apiClient('/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          color,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      setIsCreateOpen(false);
      setName('');
      setCode('');
      setColor('#3B82F6');
      setErrorMsg(null);
    },
    onError: (err: ApiError) => {
      setErrorMsg(err.problem?.detail || 'Errore durante la creazione della materia');
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Catalogo Materie Curriculari
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configurazione delle discipline di insegnamento e codici identificativi.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuova Materia
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colore</TableHead>
              <TableHead>Codice</TableHead>
              <TableHead>Nome Disciplina</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                  Caricamento materie...
                </TableCell>
              </TableRow>
            ) : subjects && subjects.length > 0 ? (
              subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div
                      className="h-5 w-5 rounded-full border border-slate-300 shadow-sm"
                      style={{ backgroundColor: s.color || '#94a3b8' }}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">{s.code}</TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{s.name}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                  Nessuna materia presente a catalogo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Creazione Materia */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogHeader>
          <DialogTitle>Aggiungi Materia a Catalogo</DialogTitle>
          <DialogDescription>
            Inserisci il nome esteso e un codice breve (es. MAT per Matematica).
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSubjectMutation.mutate();
          }}
          className="space-y-4"
        >
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-medium">Nome Disciplina *</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Matematica"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Codice Breve *</label>
              <Input
                required
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Es. MAT"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Colore Identificativo</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded border p-0.5 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-500">{color}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={createSubjectMutation.isPending}>
              {createSubjectMutation.isPending ? 'Salvataggio...' : 'Salva Materia'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
