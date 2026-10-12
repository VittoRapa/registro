'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Bell,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudentNav } from '@/components/navigation/student-nav';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  studentProfile?: {
    id: string;
    matricola: string;
    enrollments: Array<{
      id: string;
      classId: string;
      class: { id: string; name: string; grade: number; section: string };
    }>;
  };
  parentLinksAsParent?: Array<{
    id: string;
    studentProfile: {
      id: string;
      matricola: string;
      user: { firstName: string; lastName: string };
      enrollments: Array<{
        class: { id: string; name: string };
      }>;
    };
  }>;
}

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  periodNumber: number;
  room?: string;
  subject: { name: string; code: string };
  teacher: { user: { firstName: string; lastName: string } };
}

interface HomeworkItem {
  id: string;
  title: string;
  dueDate: string;
  estimatedMinutes?: number;
  teachingAssignment?: { subject: { name: string } };
}

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  requiresAck: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth().then((auth) => {
      if (!auth) router.push('/login');
    });
  }, [checkAuth, router]);

  // 1. Fetch user complete profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery<UserProfile>({
    queryKey: ['my-profile'],
    queryFn: async () => apiClient.get<UserProfile>('/users/me/profile'),
  });

  // Determine current active student context (either self for student, or first child for parent)
  const isParent = user?.role === 'PARENT';

  const activeClass = isParent
    ? profile?.parentLinksAsParent?.[0]?.studentProfile?.enrollments?.[0]?.class
    : profile?.studentProfile?.enrollments?.[0]?.class;

  const currentClassId = activeClass?.id;

  // 2. Fetch today's schedule
  const todayDayOfWeek = new Date().getDay(); // 1=Mon .. 5=Fri
  const adjustedDay = todayDayOfWeek >= 1 && todayDayOfWeek <= 5 ? todayDayOfWeek : 1;

  const { data: scheduleSlots = [], isLoading: isLoadingSchedule } = useQuery<TimetableSlot[]>({
    queryKey: ['class-timetable', currentClassId, adjustedDay],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<TimetableSlot[]>(`/timetable/classes/${currentClassId}?dayOfWeek=${adjustedDay}`);
    },
    enabled: !!currentClassId,
  });

  // 3. Fetch upcoming homework
  const { data: homeworkList = [] } = useQuery<HomeworkItem[]>({
    queryKey: ['class-homework', currentClassId],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<HomeworkItem[]>(`/homework?classId=${currentClassId}`);
    },
    enabled: !!currentClassId,
  });

  // 4. Fetch announcements
  const { data: announcements = [] } = useQuery<AnnouncementItem[]>({
    queryKey: ['recent-announcements'],
    queryFn: async () => apiClient.get<AnnouncementItem[]>('/announcements'),
  });

  if (isAuthLoading || isLoadingProfile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Caricamento bacheca studente...
        </div>
      </div>
    );
  }

  const upcomingHomework = homeworkList.slice(0, 4);
  const urgentAnnouncements = announcements.filter((a) => a.requiresAck).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <StudentNav />

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Welcome Banner */}
        <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-100 font-semibold">
              Anno Scolastico 2026/2027 • {activeClass ? `Classe ${activeClass.name}` : 'Iscrizione in corso'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Bentornato, {user?.firstName}!
            </h1>
            <p className="text-sm text-emerald-100 mt-1">
              Consulta le lezioni di oggi, i voti registrati e le prossime scadenze.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/voti">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                <GraduationCap className="h-4 w-4 mr-1.5" />
                Vedi Voti
              </Button>
            </Link>
            <Link href="/assenze">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                <Clock className="h-4 w-4 mr-1.5" />
                Libretto Assenze
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Summary Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/voti">
            <Card className="hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950 p-3 text-emerald-600 dark:text-emerald-400">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Andamento Voti
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    Registro Voti
                  </div>
                  <div className="text-xs text-emerald-600 font-medium">Consulta medie</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/assenze">
            <Card className="hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-blue-100 dark:bg-blue-950 p-3 text-blue-600 dark:text-blue-400">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Presenze & Ritardi
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    Libretto Digitale
                  </div>
                  <div className="text-xs text-blue-600 font-medium">Giustifica online</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/compiti">
            <Card className="hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-purple-100 dark:bg-purple-950 p-3 text-purple-600 dark:text-purple-400">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Compiti Assegnati
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {homeworkList.length} In Elenco
                  </div>
                  <div className="text-xs text-purple-600 font-medium">Gestisci scadenze</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/comunicazioni">
            <Card className="hover:border-emerald-500/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-xl bg-amber-100 dark:bg-amber-950 p-3 text-amber-600 dark:text-amber-400">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Circolari
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {urgentAnnouncements.length > 0 ? `${urgentAnnouncements.length} da firmare` : 'Nessuna urgente'}
                  </div>
                  <div className="text-xs text-amber-600 font-medium">Leggi avvisi</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Two Column Layout: Today's Schedule & Upcoming Homework */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Schedule */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                    Orario delle Lezioni (Oggi)
                  </CardTitle>
                  <CardDescription>
                    {activeClass ? `Classe ${activeClass.name}` : ''} • Giorno {adjustedDay === 1 ? 'Lunedì' : adjustedDay === 2 ? 'Martedì' : adjustedDay === 3 ? 'Mercoledì' : adjustedDay === 4 ? 'Giovedì' : 'Venerdì'}
                  </CardDescription>
                </div>
                <Link href="/orario">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Vedi Settimana <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {isLoadingSchedule ? (
                <div className="p-6 text-center text-xs text-slate-400">Caricamento orario...</div>
              ) : scheduleSlots.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Nessuna lezione programmata per oggi.
                </div>
              ) : (
                scheduleSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-950 font-bold text-xs text-emerald-700 dark:text-emerald-300">
                        {slot.periodNumber}°
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {slot.subject.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          Prof. {slot.teacher.user.lastName} {slot.room ? `• Aula ${slot.room}` : ''}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      Ora {slot.periodNumber}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Homework */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    Prossimi Compiti da Svolgere
                  </CardTitle>
                  <CardDescription>Scadenze dei prossimi giorni</CardDescription>
                </div>
                <Link href="/compiti">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Tutti i Compiti <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {upcomingHomework.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Nessun compito imminente da completare! 🎉
                </div>
              ) : (
                upcomingHomework.map((hw) => (
                  <div
                    key={hw.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {hw.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {hw.teachingAssignment?.subject?.name || 'Materia'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-emerald-600">
                        {new Date(hw.dueDate).toLocaleDateString('it-IT')}
                      </div>
                      {hw.estimatedMinutes && (
                        <div className="text-[10px] text-slate-400">~{hw.estimatedMinutes} min</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Circulars / Urgent Notices */}
        {urgentAnnouncements.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Comunicazioni con Presa Visione Obbligatoria
              </CardTitle>
              <CardDescription>
                È richiesta la firma digitale dei genitori o dello studente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {urgentAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1">{item.body}</div>
                  </div>
                  <Link href="/comunicazioni">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                      Firma Ora
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
