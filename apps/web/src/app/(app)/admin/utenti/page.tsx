'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  UserPlus,
  Ban,
  CheckCircle,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Role } from '@registro/shared';

interface UserListItem {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED' | 'DELETED';
  lastLoginAt: string | null;
  twoFactorEnabled: boolean;
  studentProfile?: {
    matricola: string;
    enrollments: { class: { id: string; name: string } }[];
  } | null;
  teacherProfile?: {
    employeeCode: string;
  } | null;
}

interface UsersApiResponse {
  data: UserListItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export default function UsersManagementPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.STUDENT);
  const [newClassId, setNewClassId] = useState('');
  const [newEmployeeCode, setNewEmployeeCode] = useState('');
  const [newMatricola, setNewMatricola] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    temporaryPassword?: string;
    activationToken?: string;
    username: string;
  } | null>(null);

  // Fetch users
  const { data, isLoading } = useQuery<UsersApiResponse>({
    queryKey: ['admin-users', page, roleFilter, statusFilter, searchQuery],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.q = searchQuery;
      return apiClient<UsersApiResponse>('/users', { params });
    },
  });

  // Fetch classes for dropdown
  const { data: classes } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['classes-lookup'],
    queryFn: () => apiClient<{ id: string; name: string }[]>('/classes'),
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: (userId: string) => apiClient(`/users/${userId}/suspend`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => apiClient(`/users/${userId}/reactivate`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => apiClient<{ temporaryPassword: string }>(`/users/${userId}/reset-password`, { method: 'POST' }),
    onSuccess: (res) => {
      alert(`Nuova password temporanea generata: ${res.temporaryPassword}`);
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient<{ user: { username: string }; credentials: { temporaryPassword: string; activationToken: string } }>('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      setCreatedCredentials({
        username: res.user.username,
        temporaryPassword: res.credentials?.temporaryPassword,
        activationToken: res.credentials?.activationToken,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: ApiError) => {
      setCreateError(err.problem?.detail || 'Errore durante la creazione dell\'utente.');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createMutation.mutate({
      role: newRole,
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      email: newEmail.trim() || undefined,
      classId: newRole === Role.STUDENT && newClassId ? newClassId : undefined,
      matricola: newRole === Role.STUDENT && newMatricola ? newMatricola.trim() : undefined,
      employeeCode: newRole === Role.TEACHER && newEmployeeCode ? newEmployeeCode.trim() : undefined,
    });
  };

  const resetForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewRole(Role.STUDENT);
    setNewClassId('');
    setNewEmployeeCode('');
    setNewMatricola('');
    setCreateError(null);
    setCreatedCredentials(null);
    setIsCreateOpen(false);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return <Badge variant="destructive">Super Admin</Badge>;
      case Role.SCHOOL_ADMIN:
        return <Badge variant="default">Dirigente</Badge>;
      case Role.TEACHER:
        return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">Docente</Badge>;
      case Role.STUDENT:
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Studente</Badge>;
      case Role.PARENT:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Genitore</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Attivo</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive">Sospeso</Badge>;
      case 'INVITED':
        return <Badge variant="warning">In Attesa</Badge>;
      case 'DELETED':
        return <Badge variant="outline">Anonimizzato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Gestione Utenti Istituzionali
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ricerca, anagrafica, creazione e controllo accessi per docenti, studenti e genitori.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Nuovo Utente
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca per nome, cognome, email o username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">Tutti i Ruoli</option>
          <option value="TEACHER">Docenti</option>
          <option value="STUDENT">Studenti</option>
          <option value="PARENT">Genitori</option>
          <option value="SCHOOL_ADMIN">Amministratori</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">Tutti gli Stati</option>
          <option value="ACTIVE">Attivo</option>
          <option value="INVITED">In Attesa</option>
          <option value="SUSPENDED">Sospeso</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utente</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Classe / Matricola</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                  Caricamento elenco utenti...
                </TableCell>
              </TableRow>
            ) : data?.data && data.data.length > 0 ? (
              data.data.map((u) => {
                const activeEnrollment = u.studentProfile?.enrollments?.[0]?.class?.name;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {u.lastName} {u.firstName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {u.username} {u.email ? `• ${u.email}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      {activeEnrollment ? (
                        <span className="font-semibold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          Classe {activeEnrollment}
                        </span>
                      ) : u.teacherProfile?.employeeCode ? (
                        <span className="text-xs text-slate-500 font-mono">
                          {u.teacherProfile.employeeCode}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(u.status)}</TableCell>
                    <TableCell>
                      {u.twoFactorEnabled ? (
                        <span className="text-xs text-emerald-600 font-medium">Attivo</span>
                      ) : (
                        <span className="text-xs text-slate-400">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Reset Password"
                        onClick={() => {
                          if (confirm(`Resettare la password per ${u.username}?`)) {
                            resetPasswordMutation.mutate(u.id);
                          }
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>

                      {u.status === 'ACTIVE' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          title="Sospendi Utente"
                          onClick={() => {
                            if (confirm(`Confermi la sospensione di ${u.username}? Le sessioni saranno revocate.`)) {
                              suspendMutation.mutate(u.id);
                            }
                          }}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : u.status === 'SUSPENDED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Riattiva Utente"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => reactivateMutation.mutate(u.id)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Nessun utente trovato con i filtri selezionati.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500">
              Pagina {data.meta.page} di {data.meta.totalPages} ({data.meta.totalItems} utenti totali)
            </span>
            <div className="space-x-2">
              <Button
                size="sm"
                variant="outline"
                disabled={data.meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Precedente
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={data.meta.page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Successiva
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Creazione Utente */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogHeader>
          <DialogTitle>Crea Nuovo Utente Istituzionale</DialogTitle>
          <DialogDescription>
            Inserisci i dati anagrafici. Verranno generate automaticamente le credenziali e il token di attivazione.
          </DialogDescription>
        </DialogHeader>

        {createdCredentials ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              <div className="font-semibold text-sm">Utente Creato con Successo!</div>
              <div className="mt-2 text-xs space-y-1 font-mono">
                <div><strong>Username:</strong> {createdCredentials.username}</div>
                <div><strong>Password provvisoria:</strong> {createdCredentials.temporaryPassword}</div>
                {createdCredentials.activationToken && (
                  <div><strong>Token di attivazione:</strong> {createdCredentials.activationToken}</div>
                )}
              </div>
              <div className="mt-3 text-[11px] text-emerald-800 dark:text-emerald-300">
                Copia queste credenziali e consegnali all'utente. Al primo accesso dovrà reimpostare la password.
              </div>
            </div>

            <DialogFooter>
              <Button onClick={resetForm}>Chiudi</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">
                {createError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Nome *</label>
                <Input
                  required
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="Es. Mario"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Cognome *</label>
                <Input
                  required
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="Es. Rossi"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Email Istituzionale</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="mario.rossi@scuola.it (opzionale)"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Ruolo *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 mt-1"
              >
                <option value={Role.STUDENT}>Studente</option>
                <option value={Role.TEACHER}>Docente</option>
                <option value={Role.PARENT}>Genitore</option>
                <option value={Role.SCHOOL_ADMIN}>Amministratore Scolastico</option>
              </select>
            </div>

            {newRole === Role.STUDENT && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Classe Iniziale</label>
                  <select
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 mt-1"
                  >
                    <option value="">Nessuna classe</option>
                    {classes?.map((c) => (
                      <option key={c.id} value={c.id}>
                        Classe {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Matricola</label>
                  <Input
                    value={newMatricola}
                    onChange={(e) => setNewMatricola(e.target.value)}
                    placeholder="20250001"
                  />
                </div>
              </div>
            )}

            {newRole === Role.TEACHER && (
              <div>
                <label className="text-xs font-medium">Codice Dipendente (Matricola Docente)</label>
                <Input
                  value={newEmployeeCode}
                  onChange={(e) => setNewEmployeeCode(e.target.value)}
                  placeholder="DOC-012"
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creazione...
                  </>
                ) : (
                  'Crea Utente'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
