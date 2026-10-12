'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  Bookmark,
  Download,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  FileText,
  ShieldCheck,
  Send,
  Trash2,
  Edit2,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { StudentNav } from '@/components/navigation/student-nav';
import { MarkdownViewer } from '@/components/markdown/markdown-viewer';
import { toast } from 'sonner';

interface NoteDetail {
  id: string;
  title: string;
  description: string | null;
  contentType: 'FILE' | 'MARKDOWN';
  markdownBody: string | null;
  fileIds: string[];
  visibility: string;
  license: string;
  status: string;
  grade: number | null;
  avgRating: number;
  ratingCount: number;
  downloadCount: number;
  viewCount: number;
  verifiedAt: string | null;
  verifiedByTeacherId: string | null;
  createdAt: string;
  currentUserRating: number | null;
  isBookmarked: boolean;
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
  _count: {
    comments: number;
    ratings: number;
  };
}

interface FileDetail {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

interface NoteComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  replies?: NoteComment[];
}

export default function SharedNoteDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const noteId = params.id as string;

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<'COPYRIGHT' | 'INAPPROPRIATO' | 'ERRATO' | 'SPAM'>('INAPPROPRIATO');
  const [reportDetails, setReportDetails] = useState('');

  // Comment state
  const [newCommentText, setNewCommentText] = useState('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Fetch Note details
  const { data: note, isLoading, error } = useQuery<NoteDetail>({
    queryKey: ['shared-note', noteId],
    queryFn: () => apiClient.get<NoteDetail>(`/shared-notes/${noteId}`),
  });

  // Fetch comments
  const { data: comments = [] } = useQuery<NoteComment[]>({
    queryKey: ['shared-note-comments', noteId],
    queryFn: () => apiClient.get<NoteComment[]>(`/shared-notes/${noteId}/comments`),
    enabled: !!note,
  });

  // Rating mutation
  const rateMutation = useMutation({
    mutationFn: (stars: number) => apiClient.post(`/shared-notes/${noteId}/rating`, { stars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-note', noteId] });
      toast.success('Valutazione salvata!');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore salvataggio voto';
      toast.error(msg);
    },
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: (currentlyBookmarked: boolean) =>
      currentlyBookmarked
        ? apiClient.delete(`/shared-notes/${noteId}/bookmark`)
        : apiClient.post(`/shared-notes/${noteId}/bookmark`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-note', noteId] });
      toast.success(note?.isBookmarked ? 'Rimosso dai salvati' : 'Aggiunto ai salvati');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore modifica segnalibro';
      toast.error(msg);
    },
  });

  // Teacher verification mutation
  const verifyMutation = useMutation({
    mutationFn: () => apiClient.patch<{ verified: boolean }>(`/shared-notes/${noteId}/verify`, {}),
    onSuccess: (data: { verified: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['shared-note', noteId] });
      toast.success(data.verified ? 'Appunto contrassegnato come Verificato!' : 'Verifica rimossa');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore aggiornamento verifica';
      toast.error(msg);
    },
  });

  // Download recorder & trigger
  const handleDownload = async () => {
    try {
      const res = await apiClient.post<{ noteId: string; files: FileDetail[] }>(
        `/shared-notes/${noteId}/download`,
        {},
      );
      queryClient.invalidateQueries({ queryKey: ['shared-note', noteId] });

      if (res.files && res.files.length > 0) {
        for (const f of res.files) {
          const downloadUrl = await apiClient.get<{ downloadUrl: string }>(`/files/${f.id}/download`);
          window.open(downloadUrl.downloadUrl, '_blank');
        }
      }
      toast.success('Download avviato!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante il download';
      toast.error(msg);
    }
  };

  // Report mutation
  const reportMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/shared-notes/${noteId}/report`, {
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      }),
    onSuccess: () => {
      setReportOpen(false);
      setReportDetails('');
      toast.success('Segnalazione inviata ai moderatori della scuola.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore durante l\'invio della segnalazione';
      toast.error(msg);
    },
  });

  // Comment mutations
  const addCommentMutation = useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string }) =>
      apiClient.post(`/shared-notes/${noteId}/comments`, { body, parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-note-comments', noteId] });
      setNewCommentText('');
      setReplyParentId(null);
      setReplyText('');
      toast.success('Commento pubblicato');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore pubblicazione commento';
      toast.error(msg);
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      apiClient.patch(`/shared-notes/comments/${commentId}`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-note-comments', noteId] });
      setEditingCommentId(null);
      setEditText('');
      toast.success('Commento modificato');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Modifica non consentita (finestra 10 min scaduta)';
      toast.error(msg);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => apiClient.delete(`/shared-notes/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-note-comments', noteId] });
      toast.success('Commento eliminato');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore eliminazione commento';
      toast.error(msg);
    },
  });

  const isTeacherOrAdmin =
    user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  // Check 10-min window for comment editing
  const canEditComment = (commentCreatedAt: string, authorId: string) => {
    if (authorId !== user?.id) return false;
    const diffMins = (Date.now() - new Date(commentCreatedAt).getTime()) / 1000 / 60;
    return diffMins <= 10;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <StudentNav />
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <StudentNav />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <Lock className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Contenuto non disponibile o accesso riservato
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Questo appunto potrebbe essere privato, nascosto o riservato ad un&apos;altra classe.
          </p>
          <div className="mt-6">
            <Link href="/appunti">
              <Button variant="outline">Torna al catalogo</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <StudentNav />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/appunti"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna al catalogo
          </Link>
        </div>

        {/* Note Header & Action Hero */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {note.subject ? (
                  <Badge variant="secondary" className="font-semibold text-xs bg-slate-100 dark:bg-slate-800">
                    {note.subject.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Materia generale</Badge>
                )}
                {note.grade && (
                  <Badge variant="outline" className="text-xs">{note.grade}° Anno</Badge>
                )}
                <Badge variant="outline" className="text-xs uppercase tracking-wider">
                  {note.license.replace('_', ' ')}
                </Badge>
                {note.verifiedAt && (
                  <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Verificato dal docente
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                {note.title}
              </h1>

              {note.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                  {note.description}
                </p>
              )}

              {/* Author & Publication info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-2">
                <span>
                  Autore: <strong className="text-slate-800 dark:text-slate-200">{note.author.firstName} {note.author.lastName}</strong> ({note.author.role})
                </span>
                <span>•</span>
                <span>Pubblicato il {new Date(note.createdAt).toLocaleDateString('it-IT')}</span>
                <span>•</span>
                <span>{note.viewCount} visualizzazioni</span>
                <span>•</span>
                <span>{note.downloadCount} download</span>
              </div>
            </div>

            {/* Quick Actions (Bookmark, Report, Teacher Verification) */}
            <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bookmarkMutation.mutate(note.isBookmarked)}
                  className={`gap-1.5 ${note.isBookmarked ? 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40' : ''}`}
                >
                  <Bookmark className={`h-4 w-4 ${note.isBookmarked ? 'fill-amber-500' : ''}`} />
                  {note.isBookmarked ? 'Salvato' : 'Salva'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReportOpen(true)}
                  className="text-slate-400 hover:text-rose-600 text-xs gap-1"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Segnala
                </Button>
              </div>

              {/* Teacher verify CTA */}
              {isTeacherOrAdmin && (
                <Button
                  variant={note.verifiedAt ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => verifyMutation.mutate()}
                  className={`gap-1.5 mt-2 ${note.verifiedAt ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {note.verifiedAt ? 'Rimuovi verifica docente' : 'Approva / Verifica appunto'}
                </Button>
              )}
            </div>
          </div>

          {/* Interactive Rating Strip */}
          <div className="mt-6 flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-5 w-5 fill-amber-400" />
                <span className="text-lg font-bold">{Number(note.avgRating || 0).toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-normal">({note.ratingCount} recensioni)</span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">|</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">Valuta:</span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => rateMutation.mutate(s)}
                    className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        note.currentUserRating && s <= note.currentUserRating
                          ? 'fill-amber-400 text-amber-500'
                          : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {note.contentType === 'FILE' && (
              <Button
                onClick={handleDownload}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
              >
                <Download className="h-4 w-4" />
                Scarica File ({note.downloadCount})
              </Button>
            )}
          </div>
        </div>

        {/* Note Body (Markdown or Files) */}
        <div className="mt-8">
          {note.contentType === 'MARKDOWN' ? (
            <Card className="dark:border-slate-800 shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Contenuto dell&apos;Appunto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <MarkdownViewer content={note.markdownBody || ''} />
              </CardContent>
            </Card>
          ) : (
            <Card className="dark:border-slate-800 shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  File e Documenti Allegati ({note.fileIds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {note.fileIds.map((fileId, idx) => (
                  <div
                    key={fileId}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 p-2 text-emerald-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          Documento allegato #{idx + 1}
                        </div>
                        <div className="text-xs text-slate-400">ID: {fileId.slice(0, 8)}...</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await apiClient.get<{ previewUrl: string }>(`/files/${fileId}/preview`);
                            window.open(res.previewUrl, '_blank');
                          } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Errore apertura anteprima';
                            toast.error(msg);
                          }
                        }}
                        className="gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Anteprima
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await apiClient.get<{ downloadUrl: string }>(`/files/${fileId}/download`);
                            window.open(res.downloadUrl, '_blank');
                          } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Errore download';
                            toast.error(msg);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Scarica
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Comments & Discussion section */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Discussione & Commenti ({comments.length})
            </h2>
          </div>

          {/* New comment input */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Scrivi una domanda o un feedback costruttivo sull'appunto..."
              className="h-20 w-full rounded-md border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                disabled={!newCommentText.trim() || addCommentMutation.isPending}
                onClick={() => addCommentMutation.mutate({ body: newCommentText.trim() })}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Invia Commento
              </Button>
            </div>
          </div>

          {/* Comments list */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {comment.author.firstName} {comment.author.lastName}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {comment.author.role}
                    </Badge>
                    <span className="text-[11px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEditComment(comment.createdAt, comment.author.id) && (
                      <button
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditText(comment.body);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1 text-xs"
                        title="Modifica (finestra di 10 min)"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(comment.author.id === user?.id || isTeacherOrAdmin) && (
                      <button
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                        title="Elimina commento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment body or Inline Edit Form */}
                {editingCommentId === comment.id ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingCommentId(null)}>
                        Annulla
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => editCommentMutation.mutate({ commentId: comment.id, body: editText })}
                        className="bg-emerald-600 text-white"
                      >
                        Salva
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {comment.body}
                  </p>
                )}

                {/* Reply button */}
                <div className="pt-1">
                  <button
                    onClick={() => setReplyParentId(replyParentId === comment.id ? null : comment.id)}
                    className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {replyParentId === comment.id ? 'Chiudi risposta' : 'Rispondi'}
                  </button>
                </div>

                {/* Reply form */}
                {replyParentId === comment.id && (
                  <div className="mt-2 flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Scrivi una risposta..."
                      className="flex-1 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <Button
                      size="sm"
                      disabled={!replyText.trim() || addCommentMutation.isPending}
                      onClick={() => addCommentMutation.mutate({ body: replyText.trim(), parentId: comment.id })}
                      className="bg-emerald-600 text-white"
                    >
                      Invia
                    </Button>
                  </div>
                )}

                {/* Threaded Replies (1-level nested) */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-4 mt-3 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] text-slate-900 dark:text-slate-100">
                            {reply.author.firstName} {reply.author.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(reply.createdAt).toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Report Dialog Modal */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base text-rose-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Segnala Appunto
              </DialogTitle>
              <DialogDescription>
                Se questo appunto viola le linee guida o i diritti d&apos;autore, invia una segnalazione al collegio dei docenti. Se riceve 3 segnalazioni, verrà oscurato automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Motivo della segnalazione *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as 'COPYRIGHT' | 'INAPPROPRIATO' | 'ERRATO' | 'SPAM')}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="COPYRIGHT">Violazione di Copyright / Proprietà Intellettuale</option>
                  <option value="INAPPROPRIATO">Contenuto Inappropriato o Offensivo</option>
                  <option value="ERRATO">Informazioni Gravamente Errate</option>
                  <option value="SPAM">Spam o Pubblicità</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dettagli aggiuntivi (opzionale)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Descrivi brevemente il problema riscontrato..."
                  className="mt-1 h-20 w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>
                Annulla
              </Button>
              <Button
                size="sm"
                disabled={reportMutation.isPending}
                onClick={() => reportMutation.mutate()}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Invia Segnalazione
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
