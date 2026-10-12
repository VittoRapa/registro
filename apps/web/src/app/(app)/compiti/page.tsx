'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { StudentNav } from '@/components/navigation/student-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  role: string;
  studentProfile?: {
    enrollments: Array<{ class: { id: string; name: string } }>;
  };
  parentLinksAsParent?: Array<{
    studentProfile: {
      enrollments: Array<{ class: { id: string; name: string } }>;
    };
  }>;
}

interface HomeworkItem {
  id: string;
  title: string;
  description?: string;
  assignedDate: string;
  dueDate: string;
  estimatedMinutes?: number;
  class: { id: string; name: string };
  teachingAssignment?: {
    subject: { name: string; color?: string };
    teacher?: { user: { lastName: string } };
  };
  studentStatuses?: Array<{
    status: 'TODO' | 'DONE';
  }>;
}

export default function StudentHomeworkPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'ALL' | 'TODO' | 'DONE'>('ALL');

  // 1. Fetch user profile
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['my-profile'],
    queryFn: async () => apiClient.get<UserProfile>('/users/me/profile'),
  });

  const isParent = user?.role === 'PARENT';
  const activeClass = isParent
    ? profile?.parentLinksAsParent?.[0]?.studentProfile?.enrollments?.[0]?.class
    : profile?.studentProfile?.enrollments?.[0]?.class;
  const currentClassId = activeClass?.id;

  // 2. Fetch homework list
  const { data: homeworkList = [], isLoading } = useQuery<HomeworkItem[]>({
    queryKey: ['homework-list', currentClassId],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<HomeworkItem[]>(`/homework?classId=${currentClassId}`);
    },
    enabled: !!currentClassId,
  });

  // 3. Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: 'TODO' | 'DONE' }) => {
      return apiClient.patch(`/homework/${id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-list', currentClassId] });
    },
    onError: (err: ApiError) => {
      alert(`Errore aggiornamento compito: ${err.message}`);
    },
  });

  // Client-side completed state helper
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({});

  const isCompleted = (hw: HomeworkItem) => {
    if (localCompleted[hw.id] !== undefined) return localCompleted[hw.id];
    return hw.studentStatuses?.[0]?.status === 'DONE';
  };

  const filteredHomework = homeworkList.filter((hw) => {
    const done = isCompleted(hw);
    if (filter === 'TODO') return !done;
    if (filter === 'DONE') return done;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <StudentNav />

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-emerald-600" />
              Compiti per Casa & Consegne
            </h1>
            <p className="text-sm text-slate-500">
              Spunta i compiti svolti e tieni traccia delle scadenze per ciascuna materia.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              className={filter === 'ALL' ? 'bg-emerald-600' : ''}
              onClick={() => setFilter('ALL')}
            >
              Tutti ({homeworkList.length})
            </Button>
            <Button
              variant={filter === 'TODO' ? 'default' : 'outline'}
              size="sm"
              className={filter === 'TODO' ? 'bg-emerald-600' : ''}
              onClick={() => setFilter('TODO')}
            >
              Da Fare
            </Button>
            <Button
              variant={filter === 'DONE' ? 'default' : 'outline'}
              size="sm"
              className={filter === 'DONE' ? 'bg-emerald-600' : ''}
              onClick={() => setFilter('DONE')}
            >
              Completati
            </Button>
          </div>
        </div>

        {/* Homework list */}
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg">
              Elenco Compiti {activeClass ? `• Classe ${activeClass.name}` : ''}
            </CardTitle>
            <CardDescription>
              Fai clic sul cerchio accanto a ciascun compito per contrassegnarlo come completato.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Caricamento compiti...
              </div>
            ) : filteredHomework.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Nessun compito corrisponde al filtro selezionato. Ottimo lavoro! 🎉
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHomework.map((hw) => {
                  const done = isCompleted(hw);
                  const dueDateObj = new Date(hw.dueDate);
                  const isPast = dueDateObj < new Date(new Date().toDateString());

                  return (
                    <div
                      key={hw.id}
                      className={`p-4 sm:p-5 flex items-start gap-4 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/60 ${
                        done ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Checkbox button */}
                      <button
                        type="button"
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 focus:outline-none transition-colors"
                        onClick={() => {
                          const next = !done;
                          setLocalCompleted({ ...localCompleted, [hw.id]: next });
                          if (user?.role === 'STUDENT') {
                            toggleStatusMutation.mutate({
                              id: hw.id,
                              newStatus: next ? 'DONE' : 'TODO',
                            });
                          }
                        }}
                      >
                        {done ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <Circle className="h-6 w-6" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`text-sm font-bold ${
                              done
                                ? 'line-through text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {hw.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {hw.teachingAssignment?.subject?.name || 'Materia'}
                          </Badge>
                        </div>

                        {hw.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                            {hw.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                            Scadenza: {dueDateObj.toLocaleDateString('it-IT')}
                          </span>
                          {hw.estimatedMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Tempo stimato: {hw.estimatedMinutes} min
                            </span>
                          )}
                          {isPast && !done && (
                            <span className="text-red-500 font-semibold text-[11px]">
                              Scaduto
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
