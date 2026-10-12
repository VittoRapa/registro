'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiClient, ApiError } from '@/lib/api-client';

interface SchoolProfile {
  id: string;
  name: string;
  code: string;
  academicCycle: string;
  settings: {
    gradingSystem?: string;
    minGrade?: number;
    maxGrade?: number;
    passingGrade?: number;
  };
}

export default function SchoolSettingsPage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [academicCycle, setAcademicCycle] = useState('SUPERIORE');
  const [gradingSystem, setGradingSystem] = useState('DECIMALS');
  const [minGrade, setMinGrade] = useState(1);
  const [maxGrade, setMaxGrade] = useState(10);
  const [passingGrade, setPassingGrade] = useState(6);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: school, isLoading } = useQuery<SchoolProfile>({
    queryKey: ['school-profile'],
    queryFn: () => apiClient<SchoolProfile>('/school'),
  });

  useEffect(() => {
    if (school) {
      setName(school.name || '');
      setAcademicCycle(school.academicCycle || 'SUPERIORE');
      if (school.settings) {
        setGradingSystem(school.settings.gradingSystem || 'DECIMALS');
        setMinGrade(school.settings.minGrade ?? 1);
        setMaxGrade(school.settings.maxGrade ?? 10);
        setPassingGrade(school.settings.passingGrade ?? 6);
      }
    }
  }, [school]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient('/school', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          academicCycle,
          settings: {
            gradingSystem,
            minGrade: Number(minGrade),
            maxGrade: Number(maxGrade),
            passingGrade: Number(passingGrade),
          },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
      setStatusMsg({ type: 'success', text: 'Impostazioni della scuola salvate con successo!' });
    },
    onError: (err: ApiError) => {
      setStatusMsg({ type: 'error', text: err.problem?.detail || 'Errore durante il salvataggio' });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          Impostazioni Istituto e Parametri
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configurazione generale dell'istituto scolastico e parametri di valutazione.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`rounded-lg p-4 text-sm flex items-center gap-2 border ${
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

      {isLoading ? (
        <div className="py-12 text-center text-slate-500">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-2" />
          Caricamento impostazioni...
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStatusMsg(null);
            updateMutation.mutate();
          }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anagrafica Istituto</CardTitle>
              <CardDescription>Dati identificativi della scuola</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium">Nome della Scuola *</label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Codice Meccanografico (Ministeriale)</label>
                  <Input
                    disabled
                    value={school?.code || ''}
                    className="mt-1 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Il codice meccanografico identifica il tenant e non può essere modificato.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium">Ciclo Scolastico</label>
                  <select
                    value={academicCycle}
                    onChange={(e) => setAcademicCycle(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 mt-1"
                  >
                    <option value="PRIMARIA">Scuola Primaria</option>
                    <option value="MEDIE">Scuola Secondaria di I Grado</option>
                    <option value="SUPERIORE">Scuola Secondaria di II Grado</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parametri di Valutazione e Voti</CardTitle>
              <CardDescription>Regole per l'attribuzione dei voti nel registro docente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium">Scala di Valutazione</label>
                <select
                  value={gradingSystem}
                  onChange={(e) => setGradingSystem(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 mt-1"
                >
                  <option value="DECIMALS">Decimi con decimali (es. 6.5, 7.25)</option>
                  <option value="QUARTERS">Decimi con quarti (es. 6+, 6.5, 7-)</option>
                  <option value="INTEGERS">Interi da 1 a 10</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium">Voto Minimo</label>
                  <Input
                    type="number"
                    value={minGrade}
                    onChange={(e) => setMinGrade(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Voto di Sufficienza</label>
                  <Input
                    type="number"
                    value={passingGrade}
                    onChange={(e) => setPassingGrade(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Voto Massimo</label>
                  <Input
                    type="number"
                    value={maxGrade}
                    onChange={(e) => setMaxGrade(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} className="flex items-center gap-2">
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salva Modifiche
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
