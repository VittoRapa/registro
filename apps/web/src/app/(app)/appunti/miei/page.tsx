'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  FileText,
  Star,
  Download,
  Eye,
  Trash2,
  Send,
  Plus,
  Lock,
  Globe,
  Users,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentNav } from '@/components/navigation/student-nav';
import { toast } from 'sonner';

interface MyNoteItem {
  id: string;
  title: string;
  description: string | null;
  contentType: 'FILE' | 'MARKDOWN';
  visibility: 'CLASS' | 'GRADE_LEVEL' | 'SCHOOL' | 'PRIVATE';
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED';
  avgRating: number;
  ratingCount: number;
  downloadCount: number;
  viewCount: number;
  createdAt: string;
  verifiedAt: string | null;
  subject?: { name: string } | null;
  class?: { name: string } | null;
}

interface BookmarkedNoteItem {
  id: string;
  note: {
    id: string;
    title: string;
    description: string | null;
    avgRating: number;
    ratingCount: number;
    downloadCount: number;
    viewCount: number;
    createdAt: string;
    author: {
      firstName: string;
      lastName: string;
    };
    subject?: { name: string } | null;
  };
}

export default function MySharedNotesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'mine' | 'bookmarks'>('mine');

  // Fetch my authored notes
  const { data: myNotes = [], isLoading: loadingMine } = useQuery<MyNoteItem[]>({
    queryKey: ['my-shared-notes'],
    queryFn: () => apiClient.get<MyNoteItem[]>('/shared-notes/me/all'),
  });

  // Fetch my bookmarks
  const { data: bookmarks = [], isLoading: loadingBookmarks } = useQuery<BookmarkedNoteItem[]>({
    queryKey: ['my-bookmarked-notes'],
    queryFn: () => apiClient.get<BookmarkedNoteItem[]>('/shared-notes/me/bookmarks'),
  });

  // Publish draft mutation
  const publishMutation = useMutation({
    mutationFn: (noteId: string) => apiClient.patch(`/shared-notes/${noteId}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shared-notes'] });
      toast.success('Bozza pubblicata con successo!');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore durante la pubblicazione';
      toast.error(msg);
    },
  });

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => apiClient.delete(`/shared-notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shared-notes'] });
      toast.success('Appunto rimosso');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore durante l\'eliminazione';
      toast.error(msg);
    },
  });

  // Remove bookmark mutation
  const removeBookmarkMutation = useMutation({
    mutationFn: (noteId: string) => apiClient.delete(`/shared-notes/${noteId}/bookmark`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookmarked-notes'] });
      toast.success('Rimosso dai salvati');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore rimozione preferito';
      toast.error(msg);
    },
  });

  const getVisibilityIcon = (vis: string) => {
    switch (vis) {
      case 'PRIVATE':
        return <Lock className="h-3 w-3 text-slate-500" />;
      case 'CLASS':
        return <Users className="h-3 w-3 text-emerald-600" />;
      default:
        return <Globe className="h-3 w-3 text-sky-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <StudentNav />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/appunti"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna al catalogo
          </Link>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                I Miei Appunti & Preferiti
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Gestisci le tue dispense, bozze e gli appunti che hai salvato tra i preferiti.
              </p>
            </div>
            <Link href="/appunti/nuovo">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <Plus className="h-4 w-4" />
                Crea Nuovo Appunto
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'mine'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            I Miei Appunti ({myNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'bookmarks'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            Salvati ({bookmarks.length})
          </button>
        </div>

        {/* Tab Content 1: My Notes */}
        {activeTab === 'mine' && (
          <div>
            {loadingMine ? (
              <div className="flex h-48 items-center justify-center text-slate-400">
                Caricamento appunti...
              </div>
            ) : myNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Nessun appunto creato
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Non hai ancora caricato appunti o salvato bozze.
                </p>
                <div className="mt-5">
                  <Link href="/appunti/nuovo">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Condividi il tuo primo appunto
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {myNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {note.status === 'DRAFT' && (
                          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            Bozza
                          </Badge>
                        )}
                        {note.status === 'PUBLISHED' && (
                          <Badge className="bg-emerald-600 text-white text-xs">
                            Pubblicato
                          </Badge>
                        )}
                        {note.status === 'HIDDEN' && (
                          <Badge variant="destructive" className="text-xs">
                            In Revisione Moderazione
                          </Badge>
                        )}

                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          {getVisibilityIcon(note.visibility)}
                          {note.visibility === 'PRIVATE' ? 'Privato' : note.visibility === 'CLASS' ? 'Classe' : 'Scuola'}
                        </span>

                        {note.subject && (
                          <Badge variant="secondary" className="text-xs">
                            {note.subject.name}
                          </Badge>
                        )}
                      </div>

                      <Link href={`/appunti/${note.id}`}>
                        <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 hover:text-emerald-600">
                          {note.title}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                        <span>Creato il {new Date(note.createdAt).toLocaleDateString('it-IT')}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> {note.viewCount}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" /> {note.downloadCount}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {Number(note.avgRating || 0).toFixed(1)} ({note.ratingCount})
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      {note.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          onClick={() => publishMutation.mutate(note.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                        >
                          <Send className="h-3 w-3" />
                          Pubblica
                        </Button>
                      )}

                      <Link href={`/appunti/${note.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Visualizza
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Sei sicuro di voler eliminare questo appunto?')) {
                            deleteMutation.mutate(note.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Bookmarks */}
        {activeTab === 'bookmarks' && (
          <div>
            {loadingBookmarks ? (
              <div className="flex h-48 items-center justify-center text-slate-400">
                Caricamento preferiti...
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
                <Bookmark className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Nessun appunto nei preferiti
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Salva gli appunti migliori usando l&apos;icona del segnalibro per ritrovarli qui.
                </p>
                <div className="mt-5">
                  <Link href="/appunti">
                    <Button variant="outline">Esplora il catalogo</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarks.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 gap-4"
                  >
                    <div className="space-y-1">
                      {b.note.subject && (
                        <Badge variant="secondary" className="text-xs mb-1">
                          {b.note.subject.name}
                        </Badge>
                      )}
                      <Link href={`/appunti/${b.note.id}`}>
                        <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 hover:text-emerald-600">
                          {b.note.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                        <span>Autore: {b.note.author.firstName} {b.note.author.lastName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {Number(b.note.avgRating || 0).toFixed(1)} ({b.note.ratingCount})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/appunti/${b.note.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          Apri Appunto
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBookmarkMutation.mutate(b.note.id)}
                        className="text-slate-400 hover:text-rose-600 text-xs"
                      >
                        Rimuovi dai preferiti
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
