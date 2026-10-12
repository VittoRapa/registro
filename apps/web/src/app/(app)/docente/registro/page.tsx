'use client';

import { useQuery } from '@tanstack/react-query';
import { GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';

interface ClassItem {
  id: string;
  name: string;
  year: number;
  section: string;
  academicYear: { name: string };
}

export default function TeacherSelectClassPage() {
  const { data: classes, isLoading } = useQuery<ClassItem[]>({
    queryKey: ['teacher-classes'],
    queryFn: () => apiClient<ClassItem[]>('/classes'),
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-emerald-600" />
          Seleziona Classe per Registro e Appello
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Scegli la classe per effettuare l'appello rapido, firmare la lezione o consultare lo storico presenze.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600 mb-2" />
          Caricamento classi...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {classes?.map((c) => (
            <Card key={c.id} className="hover:border-emerald-500 transition-all">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Classe {c.name}</CardTitle>
                <CardDescription>
                  Sezione {c.section} • Anno {c.year}°
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/docente/registro/${c.id}`}>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                    <span>Apri Registro</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
