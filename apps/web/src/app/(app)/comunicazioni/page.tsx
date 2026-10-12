'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { StudentNav } from '@/components/navigation/student-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  requiresAck: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string };
  class?: { id: string; name: string };
}

export default function StudentAnnouncementsPage() {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [filterAck, setFilterAck] = useState<'ALL' | 'URGENT'>('ALL');

  // 1. Fetch announcements
  const { data: announcements = [], isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ['announcements-list'],
    queryFn: async () => apiClient.get<AnnouncementItem[]>('/announcements'),
  });

  // Track signed announcements locally or via API
  const [signedIds, setSignedIds] = useState<Record<string, string>>({});

  // 2. Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => apiClient.post(`/announcements/${id}/read`, {}),
  });

  // 3. Acknowledge / sign mutation
  const ackMutation = useMutation({
    mutationFn: async (id: string) => apiClient.post(`/announcements/${id}/ack`, {}),
    onSuccess: (_, id) => {
      setSignedIds({ ...signedIds, [id]: new Date().toISOString() });
      alert('Presa visione confermata con successo! La firma digitale è stata registrata.');
    },
    onError: (err: ApiError) => {
      alert(`Errore firma comunicazione: ${err.message}`);
    },
  });

  const filteredList = announcements.filter((a) => {
    if (filterAck === 'URGENT') return a.requiresAck && !signedIds[a.id];
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
              <Bell className="h-7 w-7 text-emerald-600" />
              Circolari & Comunicazioni Scolastiche
            </h1>
            <p className="text-sm text-slate-500">
              Consulta le circolari della dirigenza e firma le notifiche ufficiali per presa visione.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={filterAck === 'ALL' ? 'default' : 'outline'}
              size="sm"
              className={filterAck === 'ALL' ? 'bg-emerald-600' : ''}
              onClick={() => setFilterAck('ALL')}
            >
              Tutte ({announcements.length})
            </Button>
            <Button
              variant={filterAck === 'URGENT' ? 'default' : 'outline'}
              size="sm"
              className={filterAck === 'URGENT' ? 'bg-amber-600' : ''}
              onClick={() => setFilterAck('URGENT')}
            >
              Da Firmare
            </Button>
          </div>
        </div>

        {/* Announcements List */}
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg">Bacheca Circolari Ufficiali</CardTitle>
            <CardDescription>Documenti e comunicati inviati agli studenti e alle famiglie</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Caricamento comunicazioni...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Nessuna circolare da visualizzare con i filtri attuali.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.map((a) => {
                  const isSigned = !!signedIds[a.id];

                  return (
                    <div
                      key={a.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                            {a.title}
                          </span>
                          {a.requiresAck && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200">
                              Presa visione richiesta
                            </Badge>
                          )}
                          {isSigned && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Firmata
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {a.body}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                          <span>
                            Pubblicato da: {a.author.lastName} {a.author.firstName}
                          </span>
                          <span>•</span>
                          <span className="font-mono">
                            {new Date(a.createdAt).toLocaleDateString('it-IT')}
                          </span>
                          {a.class && (
                            <>
                              <span>•</span>
                              <span>Classe {a.class.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAnnouncement(a);
                            markReadMutation.mutate(a.id);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1.5" />
                          Leggi Tutto
                        </Button>

                        {a.requiresAck && !isSigned && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={ackMutation.isPending}
                            onClick={() => ackMutation.mutate(a.id)}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1.5" />
                            Firma Ora
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Visualizza Dettaglio Circolare */}
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-1 text-xs">
                    Circolare Istituzionale
                  </Badge>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {selectedAnnouncement.title}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(selectedAnnouncement.createdAt).toLocaleDateString('it-IT')} • Autore: {selectedAnnouncement.author.lastName} {selectedAnnouncement.author.firstName}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                {selectedAnnouncement.body}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" onClick={() => setSelectedAnnouncement(null)}>
                  Chiudi
                </Button>

                {selectedAnnouncement.requiresAck && !signedIds[selectedAnnouncement.id] && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      ackMutation.mutate(selectedAnnouncement.id);
                      setSelectedAnnouncement(null);
                    }}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    Conferma Presa Visione
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
