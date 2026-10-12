'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Smartphone,
  Trash2,
  Loader2,
  CheckCircle2,
  Laptop,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface ActiveSession {
  id: string;
  deviceInfo: string | null;
  createdAt: string;
  isCurrent?: boolean;
}

export default function SecurityProfilePage() {
  const queryClient = useQueryClient();
  const { user, checkAuth } = useAuthStore();

  // 2FA Setup Flow State
  const [setupStep, setSetupStep] = useState<'idle' | 'scanning' | 'completed'>('idle');
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [totpVerificationCode, setTotpVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Disable 2FA state
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [isDisableOpen, setIsDisableOpen] = useState(false);

  // Fetch active sessions
  const { data: sessions, isLoading: isSessionsLoading } = useQuery<ActiveSession[]>({
    queryKey: ['active-sessions'],
    queryFn: () => apiClient<ActiveSession[]>('/auth/sessions'),
  });

  // Start 2FA setup mutation
  const startSetupMutation = useMutation({
    mutationFn: () => apiClient<{ secret: string; qrCodeDataUrl: string }>('/auth/2fa/setup', { method: 'POST' }),
    onSuccess: (data) => {
      setSetupData(data);
      setSetupStep('scanning');
      setSetupError(null);
    },
    onError: (err: ApiError) => {
      setSetupError(err.problem?.detail || 'Impossibile avviare la configurazione 2FA');
    },
  });

  // Enable 2FA mutation
  const enableMutation = useMutation({
    mutationFn: () =>
      apiClient<{ backupCodes: string[] }>('/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({
          secret: setupData?.secret,
          code: totpVerificationCode.trim(),
        }),
      }),
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setSetupStep('completed');
      checkAuth();
    },
    onError: (err: ApiError) => {
      setSetupError(err.problem?.detail || 'Codice TOTP di verifica non valido');
    },
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: () =>
      apiClient('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim(),
        }),
      }),
    onSuccess: () => {
      setIsDisableOpen(false);
      setSetupStep('idle');
      checkAuth();
      alert('Autenticazione a due fattori disattivata.');
    },
    onError: (err: ApiError) => {
      setSetupError(err.problem?.detail || 'Password o codice non validi');
    },
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-sessions'] }),
  });

  // Logout all mutation
  const logoutAllMutation = useMutation({
    mutationFn: () => apiClient('/auth/logout-all', { method: 'POST' }),
    onSuccess: () => {
      window.location.href = '/login';
    },
  });

  // GDPR Data Export mutation
  const [isExporting, setIsExporting] = useState(false);
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const data = await apiClient<unknown>('/users/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `registro_dati_personali_${user?.username || 'utente'}_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert('Errore durante il download dell\'archivio dati personali.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          Sicurezza Account e Sessioni
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configura l'autenticazione a due fattori (2FA) e monitora i dispositivi connessi.
        </p>
      </div>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                Autenticazione a Due Fattori (TOTP)
              </CardTitle>
              <CardDescription>
                Aggiunge un livello di sicurezza fondamentale richiedendo un codice dalla tua app authenticator (Google Authenticator, Microsoft Authenticator o 1Password).
              </CardDescription>
            </div>
            <Badge variant={user?.twoFactorEnabled ? 'success' : 'secondary'}>
              {user?.twoFactorEnabled ? '2FA Attivo' : 'Non Attivo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {setupError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">
              {setupError}
            </div>
          )}

          {!user?.twoFactorEnabled && setupStep === 'idle' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                La tua scuola raccomanda l'attivazione della verifica a 2 fattori per proteggere i dati del registro.
              </p>
              <Button
                onClick={() => startSetupMutation.mutate()}
                disabled={startSetupMutation.isPending}
                className="shrink-0"
              >
                {startSetupMutation.isPending ? 'Preparazione...' : 'Attiva 2FA Ora'}
              </Button>
            </div>
          )}

          {setupStep === 'scanning' && setupData && (
            <div className="space-y-4 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900">
              <div className="text-sm font-semibold">1. Scansiona il codice QR con la tua App</div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code preview */}
                <div className="p-2 bg-white rounded-lg border shadow-sm">
                  <img
                    src={setupData.qrCodeDataUrl}
                    alt="Codice QR 2FA"
                    className="w-44 h-44"
                  />
                </div>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p>In alternativa, puoi inserire la chiave segreta manualmente:</p>
                  <code className="bg-slate-200 dark:bg-slate-800 p-1.5 rounded block font-mono select-all text-slate-900 dark:text-slate-100">
                    {setupData.secret}
                  </code>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="text-sm font-semibold">2. Inserisci il codice a 6 cifre per confermare</div>
                <div className="flex gap-2 max-w-xs">
                  <Input
                    maxLength={6}
                    placeholder="123456"
                    value={totpVerificationCode}
                    onChange={(e) => setTotpVerificationCode(e.target.value)}
                    className="text-center font-mono tracking-widest"
                  />
                  <Button
                    onClick={() => enableMutation.mutate()}
                    disabled={enableMutation.isPending || totpVerificationCode.length < 6}
                  >
                    {enableMutation.isPending ? 'Verifica...' : 'Conferma'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {setupStep === 'completed' && backupCodes.length > 0 && (
            <div className="space-y-4 p-4 border rounded-xl bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                2FA Attivato! Salva i tuoi Codici di Backup
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Conservali in un luogo sicuro. Ciascun codice può essere utilizzato una sola volta per accedere se perdi il telefono:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-center">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-2 border rounded font-semibold">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}

          {user?.twoFactorEnabled && setupStep !== 'completed' && (
            <div className="flex items-center justify-between p-4 border rounded-xl bg-emerald-50/30 border-emerald-200">
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                La verifica in due passaggi è attiva e protegge questo account ad ogni accesso.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDisableOpen(true)}
                className="text-red-600 hover:bg-red-50"
              >
                Disattiva 2FA
              </Button>
            </div>
          )}

          {isDisableOpen && (
            <div className="p-4 border rounded-xl bg-red-50/40 border-red-200 space-y-3">
              <div className="text-sm font-semibold text-red-900">Conferma Disattivazione 2FA</div>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <Input
                  type="password"
                  placeholder="Password attuale"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
                <Input
                  placeholder="Codice 2FA o backup"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => disableMutation.mutate()}>
                  Conferma Disattivazione
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsDisableOpen(false)}>
                  Annulla
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Laptop className="h-5 w-5 text-blue-600" />
                Sessioni e Dispositivi Connessi
              </CardTitle>
              <CardDescription>
                Elenco dei browser e dispositivi attualmente autorizzati ad accedere con il tuo account.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Vuoi terminare tutte le sessioni su altri dispositivi?')) {
                  logoutAllMutation.mutate();
                }
              }}
              className="text-red-600 hover:bg-red-50 text-xs"
            >
              Disconnetti Tutti
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isSessionsLoading ? (
            <div className="py-6 text-center text-slate-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
              Caricamento sessioni...
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Laptop className="h-4 w-4 text-slate-500" />
                      <span>{s.deviceInfo || 'Browser web'}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Accesso creato: {new Date(s.createdAt).toLocaleString('it-IT')}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeSessionMutation.mutate(s.id)}
                    className="text-slate-400 hover:text-red-600"
                    title="Termina sessione"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">Nessuna altra sessione attiva.</p>
          )}
        </CardContent>
      </Card>

      {/* GDPR Data Portability Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileDown className="h-5 w-5 text-blue-600" />
                Portabilità Dati Personali (GDPR Art. 20)
              </CardTitle>
              <CardDescription>
                Scarica una copia strutturata in formato JSON interoperabile contenente tutti i tuoi dati personali, voti, presenze, compiti, appunti e messaggi archiviati nel sistema.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={isExporting}
              className="gap-2 shrink-0"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generazione archivio...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-blue-600" />
                  Scarica Archivio Completo (JSON)
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
