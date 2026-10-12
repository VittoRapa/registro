'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  Loader2,
  Printer,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { StudentNav } from '@/components/navigation/student-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

interface TimetableSlot {
  id: string;
  dayOfWeek: number; // 1 = Mon, ..., 5 = Fri
  periodNumber: number; // 1 .. 6
  room?: string;
  subject: { id: string; name: string; code: string; color?: string };
  teacher: { user: { firstName: string; lastName: string } };
}

export default function StudentOrarioPage() {
  const { user } = useAuthStore();

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

  // 2. Fetch all slots for class
  const { data: slots = [], isLoading } = useQuery<TimetableSlot[]>({
    queryKey: ['full-timetable', currentClassId],
    queryFn: async () => {
      if (!currentClassId) return [];
      return apiClient.get<TimetableSlot[]>(`/timetable/classes/${currentClassId}`);
    },
    enabled: !!currentClassId,
  });

  const days = [
    { num: 1, label: 'Lunedì' },
    { num: 2, label: 'Martedì' },
    { num: 3, label: 'Mercoledì' },
    { num: 4, label: 'Giovedì' },
    { num: 5, label: 'Venerdì' },
  ];

  const periods = [1, 2, 3, 4, 5, 6];

  const getSlot = (day: number, period: number) => {
    return slots.find((s) => s.dayOfWeek === day && s.periodNumber === period);
  };

  const currentDay = new Date().getDay();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <StudentNav />

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Calendar className="h-7 w-7 text-emerald-600" />
              Orario Settimanale delle Lezioni
            </h1>
            <p className="text-sm text-slate-500">
              {activeClass ? `Classe ${activeClass.name}` : ''} • Anno Scolastico 2026/2027
            </p>
          </div>

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Stampa Orario
          </Button>
        </div>

        {/* Timetable Grid */}
        <Card className="overflow-x-auto">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg">Quadro Orario Didattico</CardTitle>
            <CardDescription>Scansione oraria delle materie e dei docenti da lunedì a venerdì</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Caricamento orario delle lezioni...
              </div>
            ) : slots.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                L&apos;orario ufficiale per questa classe non è ancora stato pubblicato dalla segreteria.
              </div>
            ) : (
              <div className="min-w-[700px]">
                <div className="grid grid-cols-6 gap-2">
                  {/* Top-left empty header */}
                  <div className="p-2 text-center font-bold text-xs text-slate-400 uppercase">
                    Ora
                  </div>
                  {/* Days header */}
                  {days.map((d) => (
                    <div
                      key={d.num}
                      className={`p-2.5 text-center font-bold text-xs uppercase tracking-wider rounded-lg ${
                        currentDay === d.num
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {d.label}
                    </div>
                  ))}

                  {/* Rows for each period */}
                  {periods.map((period) => (
                    <div key={period} className="contents">
                      {/* Period indicator */}
                      <div className="flex flex-col items-center justify-center p-3 font-mono font-bold text-sm bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span>{period}°</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {period === 1 ? '08:00' : period === 2 ? '09:00' : period === 3 ? '10:00' : period === 4 ? '11:00' : period === 5 ? '12:00' : '13:00'}
                        </span>
                      </div>

                      {/* Day slots */}
                      {days.map((d) => {
                        const slot = getSlot(d.num, period);
                        return (
                          <div
                            key={`${d.num}-${period}`}
                            className={`min-h-[85px] p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                              slot
                                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500'
                                : 'bg-slate-50/50 dark:bg-slate-950/50 border-dashed border-slate-200 dark:border-slate-800/60'
                            }`}
                          >
                            {slot ? (
                              <>
                                <div>
                                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                                    {slot.subject.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    Prof. {slot.teacher.user.lastName}
                                  </div>
                                </div>
                                {slot.room && (
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5 mt-1">
                                    <MapPin className="h-2.5 w-2.5" /> Aula {slot.room}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-300 dark:text-slate-700 m-auto">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
