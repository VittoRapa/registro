'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, KeyRound, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuthStore, AuthUser } from '@/lib/auth-store';
import { Role } from '@registro/shared';

interface LoginSuccessResponse {
  accessToken: string;
  user: AuthUser;
}

interface Login2FaRequiredResponse {
  requires2Fa: true;
  tempToken: string;
}

type LoginApiResponse = LoginSuccessResponse | Login2FaRequiredResponse;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [requires2Fa, setRequires2Fa] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRedirect = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
      case Role.SCHOOL_ADMIN:
        router.push('/admin');
        break;
      case Role.TEACHER:
        router.push('/docente');
        break;
      case Role.STUDENT:
      case Role.PARENT:
      default:
        router.push('/dashboard');
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (requires2Fa && tempToken) {
        // Step 2: verify 2FA TOTP code
        const res = await apiClient<LoginSuccessResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            identifier: username.trim(),
            username: username.trim(),
            password,
            totp: totpCode.trim(),
          }),
        });

        setAuth(res.user, res.accessToken);
        handleRedirect(res.user.role);
      } else {
        // Step 1: primary credentials
        const res = await apiClient<LoginApiResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            identifier: username.trim(),
            username: username.trim(),
            password,
          }),
        });

        if ('requires2Fa' in res && res.requires2Fa) {
          setRequires2Fa(true);
          setTempToken(res.tempToken);
        } else if ('accessToken' in res) {
          setAuth(res.user, res.accessToken);
          handleRedirect(res.user.role);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problem.detail || 'Credenziali non valide o errore di accesso');
      } else {
        setErrorMsg('Impossibile comunicare con il server. Riprova più tardi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Registro Elettronico
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {requires2Fa
              ? 'Verifica di sicurezza a due fattori (2FA)'
              : 'Accedi con le tue credenziali istituzionali'}
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
            <p>{errorMsg}</p>
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {!requires2Fa ? (
            <>
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Nome Utente o Email
                </label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1"
                  placeholder="mario.rossi o mario@scuola.it"
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    Password dimenticata?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            <div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300 mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 shrink-0 text-blue-600" />
                <span>Inserisci il codice temporaneo generato dalla tua app di autenticazione o un codice di backup.</span>
              </div>
              <label
                htmlFor="totpCode"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Codice OTP a 6 cifre
              </label>
              <Input
                id="totpCode"
                type="text"
                autoComplete="one-time-code"
                required
                maxLength={8}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="mt-1 tracking-widest text-center text-lg font-mono"
                placeholder="123456"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => {
                  setRequires2Fa(false);
                  setTempToken(null);
                  setTotpCode('');
                }}
                className="mt-2 text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Torna al login password
              </button>
            </div>
          )}

          <Button type="submit" className="w-full mt-4" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accesso in corso...
              </>
            ) : requires2Fa ? (
              'Conferma Codice 2FA'
            ) : (
              'Accedi al Registro'
            )}
          </Button>
        </form>

        <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5 text-center">
            Profili Demo di Test (Click per compilare rapido):
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setUsername('studente.20250001');
                setPassword('Password123!#');
                setErrorMsg(null);
              }}
              className="flex flex-col items-start rounded-lg border border-emerald-200 bg-emerald-50/70 p-2 text-left transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70"
            >
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">🎓 Studente (1A)</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Voti, Pagella, Compiti</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('docente.bianchi0');
                setPassword('Password123!#');
                setErrorMsg(null);
              }}
              className="flex flex-col items-start rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-left transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950/70"
            >
              <span className="font-semibold text-blue-800 dark:text-blue-300">👨‍🏫 Docente (Matematica)</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400">Appello, Voti, Registro</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('genitore.rossi');
                setPassword('Password123!#');
                setErrorMsg(null);
              }}
              className="flex flex-col items-start rounded-lg border border-purple-200 bg-purple-50/70 p-2 text-left transition hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/40 dark:hover:bg-purple-950/70"
            >
              <span className="font-semibold text-purple-800 dark:text-purple-300">👨‍👩‍👦 Genitore</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400">Giustifiche, Voti figlio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('admin.davinci');
                setPassword('Password123!#');
                setErrorMsg(null);
              }}
              className="flex flex-col items-start rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-left transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:hover:bg-amber-950/70"
            >
              <span className="font-semibold text-amber-800 dark:text-amber-300">🏫 Admin Scuola</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400">Classi, Utenti, Audit</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setUsername('superadmin');
              setPassword('SuperAdmin2026!#');
              setErrorMsg(null);
            }}
            className="mt-2 w-full flex items-center justify-between rounded-lg border border-red-200 bg-red-50/60 p-2 text-left transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:hover:bg-red-950/60 text-xs"
          >
            <span className="font-semibold text-red-800 dark:text-red-300">🛡️ Super Admin</span>
            <span className="text-[10px] text-red-600 dark:text-red-400">Piattaforma Multi-Tenant</span>
          </button>
        </div>

        <div className="border-t border-slate-100 pt-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 space-y-2">
          <p>Accesso protetto con cifratura e tracciamento delle sessioni istituzionali.</p>
          <div className="flex justify-center items-center gap-4 text-slate-400 dark:text-slate-500">
            <Link href="/privacy" className="hover:text-blue-600 hover:underline">
              Privacy (GDPR)
            </Link>
            <span>•</span>
            <Link href="/termini" className="hover:text-blue-600 hover:underline">
              Termini
            </Link>
            <span>•</span>
            <Link href="/accessibilita" className="hover:text-blue-600 hover:underline">
              Accessibilità AGID
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
