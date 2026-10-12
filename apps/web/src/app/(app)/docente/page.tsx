'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface TimetableSlot {
  id: string;
  weekday: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  room: string | null;
  class: { id: string; name: string };
  teachingAssignment: {
    subject: { name: string; color: string | null };
  };
}

export default function TeacherOverviewPage() {
  const { user } = useAuthStore();

  const todayWeekday = new Date().getDay() || 7; // 1=Mon ... 7=Sun

  // Fetch teacher's timetable
  const { data: schedule, isLoading: isScheduleLoading } = useQuery<TimetableSlot[]>({
    queryKey: ['teacher-schedule', user?.id],
    queryFn: () => apiClient<TimetableSlot[]>(`/timetable/teachers/${user?.id}`),
    enabled: !!user?.id,
  });

  // Filter slots for today
  const todaySlots = schedule?.filter((s) => s.weekday === todayWeekday) || [];

  // Fetch pending justifications
  const { data: justifications } = useQuery<{ id: string }[]>({
    queryKey: ['pending-justifications'],
    queryFn: () => apiClient<{ id: string }[]>('/attendance/justifications?status=PENDING'),
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Benvenuto, Prof. {user?.lastName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pannello operativo per registro di classe, appello presenze e valutazioni.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ore di Lezione Oggi</CardTitle>
            <Clock className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              {todaySlots.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {todaySlots.length > 0 ? 'Lezioni in orario curriculare' : 'Nessuna ora programmata oggi'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giustificazioni in Sospeso</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              {justifications ? justifications.length : 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Richieste inviate da genitori e studenti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appello Veloce</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-500">
              Completamento appello in meno di 30 secondi con opzioni rapido e tardivo.
            </div>
            <Link href="/docente/registro">
              <Button size="sm" className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700">
                Apri Registro di Oggi
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Orario delle Lezioni di Oggi
          </CardTitle>
          <CardDescription>
            Seleziona una classe per firmare l'ora e avviare l'appello
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isScheduleLoading ? (
            <div className="py-8 text-center text-slate-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600 mb-2" />
              Caricamento orario odierno...
            </div>
          ) : todaySlots.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {todaySlots.map((slot) => (
                <div
                  key={slot.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950 dark:text-emerald-300">
                      <span className="text-xs">{slot.periodNumber}ª ora</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Classe {slot.class.name}
                        </span>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: slot.teachingAssignment.subject.color
                              ? `${slot.teachingAssignment.subject.color}20`
                              : undefined,
                            color: slot.teachingAssignment.subject.color || undefined,
                          }}
                        >
                          {slot.teachingAssignment.subject.name}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {slot.startTime} - {slot.endTime} {slot.room ? `• Aula ${slot.room}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/docente/registro/${slot.class.id}`}>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <ClipboardCheck className="mr-1.5 h-4 w-4" />
                        Firma & Appello
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              Nessuna lezione in orario per la giornata odierna.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
