'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, ShieldAlert, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient, ApiError } from '@/lib/api-client';

export default function ActivateAccountPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Le due password inserite non coincidono.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('La password deve contenere almeno 8 caratteri.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await apiClient('/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
        }),
      });
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problem.detail || 'Token di attivazione non valido o scaduto.');
      } else {
        setErrorMsg('Errore di connessione. Riprova più tardi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Attivazione Account
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Imposta la tua password personale per completare l'attivazione
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6 text-center">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <p className="font-semibold text-base">Account Attivato con Successo!</p>
              <p className="text-sm mt-1">
                La tua password è stata impostata. Ora puoi accedere al Registro Elettronico.
              </p>
            </div>
            <Button onClick={() => router.push('/login')} className="w-full">
              Vai alla Pagina di Accesso <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nuova Password
                </label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Almeno 8 caratteri"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Conferma Password
                </label>
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Ripeti la password"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Attivazione in corso...
                  </>
                ) : (
                  'Attiva Account'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
