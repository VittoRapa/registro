'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  CheckCircle2,
  Star,
  Download,
  Eye,
  Plus,
  Bookmark,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StudentNav } from '@/components/navigation/student-nav';

interface SharedNoteSummary {
  id: string;
  title: string;
  description: string | null;
  contentType: 'FILE' | 'MARKDOWN';
  visibility: string;
  grade: number | null;
  avgRating: number;
  ratingCount: number;
  downloadCount: number;
  viewCount: number;
  verifiedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  subject: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  class: {
    id: string;
    name: string;
  } | null;
  tags: string[];
}

interface SharedNotesResponse {
  items: SharedNoteSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SubjectItem {
  id: string;
  name: string;
}

export default function SharedNotesCatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'FILE' | 'MARKDOWN'>('ALL');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'downloads' | 'views'>('recent');
  const [page, setPage] = useState(1);

  const { data: subjectsData } = useQuery<SubjectItem[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ items?: SubjectItem[] } | SubjectItem[]>('/subjects');
        return Array.isArray(res) ? res : res.items || [];
      } catch {
        return [];
      }
    },
  });

  const subjects = subjectsData || [];

  // Fetch notes catalog
  const { data: notesData, isLoading } = useQuery<SharedNotesResponse>({
    queryKey: ['shared-notes', searchQuery, selectedSubject, selectedGrade, selectedType, onlyVerified, sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedSubject) params.set('subjectId', selectedSubject);
      if (selectedGrade) params.set('grade', selectedGrade);
      if (selectedType !== 'ALL') params.set('type', selectedType);
      if (onlyVerified) params.set('verified', 'true');
      params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', '12');

      return apiClient.get<SharedNotesResponse>(`/shared-notes?${params.toString()}`);
    },
  });

  const notes = notesData?.items || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <StudentNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header section with CTAs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Appunti Condivisi
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                <Sparkles className="mr-1 h-3 w-3" /> Community
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Esplora, studia e condividi dispense, schemi concettuali e appunti verificati dai docenti.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:self-auto">
            <Link href="/appunti/miei">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Bookmark className="h-4 w-4" />
                I Miei Appunti
              </Button>
            </Link>
            <Link href="/appunti/nuovo">
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                <Plus className="h-4 w-4" />
                Carica Appunto
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca per titolo, argomento o tag..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Subject Filter */}
            <div>
              <select
                aria-label="Filtra per materia"
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Tutte le materie</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <select
                aria-label="Filtra per anno di corso"
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Tutti gli anni</option>
                <option value="1">1° Anno</option>
                <option value="2">2° Anno</option>
                <option value="3">3° Anno</option>
                <option value="4">4° Anno</option>
                <option value="5">5° Anno</option>
              </select>
            </div>

            {/* Sorting */}
            <div>
              <select
                aria-label="Ordina appunti"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'recent' | 'rating' | 'downloads' | 'views');
                  setPage(1);
                }}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="recent">Più recenti</option>
                <option value="rating">Miglior valutazione</option>
                <option value="downloads">Più scaricati</option>
                <option value="views">Più visualizzati</option>
              </select>
            </div>
          </div>

          {/* Quick toggle chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500">Tipo:</span>
            {(['ALL', 'FILE', 'MARKDOWN'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setPage(1);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {type === 'ALL' ? 'Tutti' : type === 'FILE' ? 'Documenti / PDF' : 'Markdown & Formule'}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            <button
              onClick={() => {
                setOnlyVerified(!onlyVerified);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                onlyVerified
                  ? 'bg-emerald-600 text-white'
                  : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Solo verificati dai docenti
            </button>
          </div>
        </div>

        {/* Content catalog grid */}
        {isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm">Caricamento appunti in corso...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
            <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              Nessun appunto trovato
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Non ci sono appunti che corrispondono ai filtri selezionati. Prova a rimuovere qualche filtro o condividi il tuo primo appunto!
            </p>
            <div className="mt-5">
              <Link href="/appunti/nuovo">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Condividi il primo appunto
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <Link key={note.id} href={`/appunti/${note.id}`} className="group block">
                <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div>
                      {/* Top badges bar */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {note.subject ? (
                            <Badge variant="secondary" className="font-semibold text-xs bg-slate-100 dark:bg-slate-800">
                              {note.subject.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Generale</Badge>
                          )}
                          {note.grade && (
                            <Badge variant="outline" className="text-xs">
                              {note.grade}° Anno
                            </Badge>
                          )}
                        </div>

                        {note.verifiedAt && (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 px-1.5 py-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            Verificato
                          </Badge>
                        )}
                      </div>

                      {/* Title & snippet */}
                      <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 line-clamp-2">
                        {note.title}
                      </h3>
                      {note.description && (
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {note.description}
                        </p>
                      )}

                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {note.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-400"
                            >
                              #{tag}
                            </span>
                          ))}
                          {note.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{note.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Rating, Author, Metrics */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        <div className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                          {note.author.firstName} {note.author.lastName}
                        </div>
                        <div className="text-[10px]">
                          {note.contentType === 'FILE' ? 'File allegato' : 'Markdown'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Rating */}
                        <div className="flex items-center gap-1 font-semibold text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          <span>{Number(note.avgRating || 0).toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({note.ratingCount})</span>
                        </div>

                        {/* Downloads / Views */}
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="flex items-center gap-0.5" title="Download">
                            <Download className="h-3 w-3" />
                            {note.downloadCount}
                          </span>
                          <span className="flex items-center gap-0.5" title="Visualizzazioni">
                            <Eye className="h-3 w-3" />
                            {note.viewCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {notesData && notesData.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Precedente
            </Button>
            <span className="text-xs text-slate-500">
              Pagina {page} di {notesData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= notesData.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Successiva
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
