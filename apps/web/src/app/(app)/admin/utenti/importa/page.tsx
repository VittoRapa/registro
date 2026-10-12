'use client';

import { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface ImportPreviewRow {
  rowNumber: number;
  role: string;
  firstName: string;
  lastName: string;
  email?: string;
  className?: string;
  status: 'VALID' | 'INVALID';
  errors: string[];
}

interface ImportDryRunResponse {
  dryRun: boolean;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    classesToCreate: string[];
    usersToCreate: number;
  };
  rows: ImportPreviewRow[];
}

interface ImportExecuteResponse {
  dryRun: boolean;
  classesCreated: number;
  usersCreated: number;
  credentials: {
    username: string;
    temporaryPassword: string;
    activationToken: string;
    role: string;
    firstName: string;
    lastName: string;
    email?: string;
  }[];
}

export default function CsvImportPage() {
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [preview, setPreview] = useState<ImportDryRunResponse | null>(null);
  const [result, setResult] = useState<ImportExecuteResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreview(null);
    setResult(null);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleDryRun = async () => {
    if (!csvContent) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient<ImportDryRunResponse>('/imports/csv', {
        method: 'POST',
        body: JSON.stringify({
          csvContent,
          dryRun: true,
        }),
      });
      setPreview(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problem.detail || 'Errore durante la validazione del CSV');
      } else {
        setErrorMsg('Errore di comunicazione con il server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!csvContent) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiClient<ImportExecuteResponse>('/imports/csv', {
        method: 'POST',
        body: JSON.stringify({
          csvContent,
          dryRun: false,
        }),
      });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problem.detail || 'Errore durante l\'importazione definitiva');
      } else {
        setErrorMsg('Errore di comunicazione con il server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sample = `role,firstName,lastName,email,classYear,classSection,matricola,employeeCode
TEACHER,Mario,Rossi,mario.rossi@scuola.it,,,DOC-101
TEACHER,Lucia,Verdi,lucia.verdi@scuola.it,,,DOC-102
STUDENT,Alessandro,Bianchi,,1,A,2025001,
STUDENT,Giulia,Ferrari,,1,A,2025002,
STUDENT,Matteo,Esposito,,2,B,2025003,`;

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modello_importazione_utenti.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCredentialsCsv = () => {
    if (!result?.credentials) return;

    let csv = 'username,password_temporanea,token_attivazione,ruolo,nome,cognome,email\n';
    result.credentials.forEach((c) => {
      csv += `${c.username},${c.temporaryPassword},${c.activationToken},${c.role},"${c.firstName}","${c.lastName}",${c.email || ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `credenziali_generate_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-blue-600" />
          Importazione Massiva da File CSV
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Carica elenchi di docenti, studenti e classi in blocco con rilevamento automatico del separatore e validazione preventiva.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          {errorMsg}
        </div>
      )}

      {/* Upload Box & Instructions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Caricamento File CSV</CardTitle>
            <CardDescription>
              Seleziona un file CSV formattato con intestazioni. Supporta virgola (,) e punto e virgola (;).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
              <Upload className="mx-auto h-10 w-10 text-slate-400 mb-2" />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className="font-semibold text-blue-600 hover:text-blue-500 text-sm">
                  Scegli un file dal tuo computer
                </span>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-xs text-slate-500 mt-1">File CSV UTF-8 fino a 10MB</p>
              {fileName && (
                <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                  <FileCheck className="h-3.5 w-3.5" />
                  {fileName} ({csvContent.split('\n').length} righe)
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={!csvContent || isLoading}
                onClick={handleDryRun}
                className="flex items-center gap-2"
              >
                {isLoading && !result ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Valida Anteprima (Dry-Run)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Template info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modello di Esempio</CardTitle>
            <CardDescription>Scarica il template CSV con tutte le colonne previste</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Il file deve includere l'intestazione:
              <br />
              <code className="text-[11px] bg-slate-100 dark:bg-slate-800 p-1 rounded block mt-1">
                role, firstName, lastName, email, classYear, classSection, matricola, employeeCode
              </code>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleTemplate}
              className="w-full flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Scarica Modello CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results View */}
      {result && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Importazione Completata con Successo!
            </CardTitle>
            <CardDescription className="text-emerald-800/80">
              Tutti i record sono stati salvati nel database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm font-medium">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
                Nuove classi create: <strong>{result.classesCreated}</strong>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
                Utenti creati con credenziali: <strong>{result.usersCreated}</strong>
              </div>
            </div>

            <Button
              onClick={downloadCredentialsCsv}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Scarica Elenco Credenziali Temporanee (CSV)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dry Run Preview View */}
      {preview && !result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Esito Validazione Preventiva</CardTitle>
              <CardDescription>
                {preview.summary.totalRows} righe analizzate • {preview.summary.validRows} valide •{' '}
                {preview.summary.invalidRows} con errori
              </CardDescription>
            </div>
            {preview.summary.invalidRows === 0 && (
              <Button
                onClick={handleExecuteImport}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Conferma ed Esegui Importazione
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Riga</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Nominativo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Esito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.slice(0, 50).map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell className="font-mono text-xs">{r.rowNumber}</TableCell>
                      <TableCell>{r.role}</TableCell>
                      <TableCell className="font-medium">
                        {r.lastName} {r.firstName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{r.email || '-'}</TableCell>
                      <TableCell>{r.className || '-'}</TableCell>
                      <TableCell>
                        {r.status === 'VALID' ? (
                          <Badge variant="success">Valida</Badge>
                        ) : (
                          <div>
                            <Badge variant="destructive">Errore</Badge>
                            <div className="text-[11px] text-red-600 mt-0.5">{r.errors.join(', ')}</div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
