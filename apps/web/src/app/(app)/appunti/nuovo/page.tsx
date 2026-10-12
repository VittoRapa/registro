'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  X,
  File,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StudentNav } from '@/components/navigation/student-nav';
import { MarkdownViewer } from '@/components/markdown/markdown-viewer';
import { toast } from 'sonner';

interface SubjectItem {
  id: string;
  name: string;
}

interface UploadedFileRecord {
  fileId: string;
  name: string;
  size: number;
}

export default function NewSharedNotePage() {
  const router = useRouter();

  const [contentType, setContentType] = useState<'FILE' | 'MARKDOWN'>('FILE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [grade, setGrade] = useState('');
  const [visibility, setVisibility] = useState<'CLASS' | 'GRADE_LEVEL' | 'SCHOOL' | 'PRIVATE'>('CLASS');
  const [license, setLicense] = useState<'ORIGINALE' | 'CC_BY' | 'CC_BY_SA' | 'CC_BY_NC'>('ORIGINALE');
  
  // Tag state
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Markdown state
  const [markdownBody, setMarkdownBody] = useState('');
  const [activeEditorTab, setActiveEditorTab] = useState<'edit' | 'preview' | 'split'>('split');

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Tag management
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '').toLowerCase();
      if (!tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // S3 / MinIO Presigned File Upload Pipeline
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress('Inizializzazione caricamento...');

    try {
      const newUploaded: UploadedFileRecord[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        setUploadProgress(`Caricamento di ${file.name} in corso...`);

        // 1. Request presigned upload URL from API
        const presignedData = await apiClient.post<{ fileId: string; uploadUrl: string }>(
          '/files/upload-url',
          {
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            purpose: 'SHARED_NOTE',
          },
        );

        // 2. Direct upload to S3 / MinIO bucket
        const uploadRes = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload fallito per ${file.name}`);
        }

        // 3. Confirm completion with API
        await apiClient.post(`/files/${presignedData.fileId}/complete`, {});

        newUploaded.push({
          fileId: presignedData.fileId,
          name: file.name,
          size: file.size,
        });
      }

      setUploadedFiles((prev) => [...prev, ...newUploaded]);
      toast.success(`${newUploaded.length} file caricati con successo`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante il caricamento del file';
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.fileId !== fileId));
  };

  // Submit Handler
  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) {
      toast.error('Inserisci un titolo per l\'appunto');
      return;
    }

    if (contentType === 'FILE' && uploadedFiles.length === 0) {
      toast.error('Carica almeno un file o passa alla modalità Markdown');
      return;
    }

    if (contentType === 'MARKDOWN' && !markdownBody.trim()) {
      toast.error('Scrivi il contenuto dell\'appunto in formato Markdown');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        subjectId: subjectId || undefined,
        grade: grade ? Number(grade) : undefined,
        contentType,
        markdownBody: contentType === 'MARKDOWN' ? markdownBody : undefined,
        fileIds: contentType === 'FILE' ? uploadedFiles.map((f) => f.fileId) : undefined,
        visibility,
        license,
        status,
        tags,
      };

      const res = await apiClient.post<{ id: string }>('/shared-notes', payload);
      toast.success(status === 'PUBLISHED' ? 'Appunto pubblicato con successo!' : 'Bozza salvata');
      router.push(`/appunti/${res.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la creazione dell\'appunto';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <StudentNav />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/appunti"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna al catalogo appunti
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Condividi un nuovo appunto
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Carica un documento (PDF, immagini, presentazioni) oppure crea una nota strutturata in Markdown con formule matematiche.
          </p>
        </div>

        {/* Content Type Selector */}
        <div className="mb-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setContentType('FILE')}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              contentType === 'FILE'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-600/20 dark:bg-emerald-950/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className={`rounded-lg p-2.5 ${contentType === 'FILE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">Carica Documento / PDF</div>
              <div className="text-xs text-slate-500">Dispense, schemi PDF, slide o immagini (max 25MB)</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setContentType('MARKDOWN')}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              contentType === 'MARKDOWN'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-600/20 dark:bg-emerald-950/20'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className={`rounded-lg p-2.5 ${contentType === 'MARKDOWN' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">Editor Markdown & KaTeX</div>
              <div className="text-xs text-slate-500">Testo formattato, elenchi, codice e formule matematiche</div>
            </div>
          </button>
        </div>

        <div className="space-y-6">
          {/* Section 1: File Upload or Markdown Editor */}
          {contentType === 'FILE' ? (
            <Card className="dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base">Documenti Allegati</CardTitle>
                <CardDescription>
                  I file vengono archiviati su storage sicuro e verificati prima della disponibilità.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload drag-drop area */}
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-emerald-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer">
                  <UploadCloud className="h-10 w-10 text-emerald-600 mb-2" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Trascina qui i tuoi file oppure clicca per selezionarli
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    Formati ammessi: PDF, PNG, JPG, DOCX, PPTX (fino a 25MB per file)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.pptx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>

                {isUploading && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span>{uploadProgress}</span>
                  </div>
                )}

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">File pronti:</span>
                    {uploadedFiles.map((f) => (
                      <div
                        key={f.fileId}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <File className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">{f.name}</span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            ({(f.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(f.fileId)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="dark:border-slate-800">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Contenuto Markdown & Formule</CardTitle>
                  <CardDescription>
                    Usa <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">$formula$</code> per formule matematiche in linea e <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">$$formula$$</code> per formule in blocco.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('edit')}
                    className={`px-2 py-1 rounded font-medium ${activeEditorTab === 'edit' ? 'bg-white shadow-xs dark:bg-slate-900 text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('preview')}
                    className={`px-2 py-1 rounded font-medium ${activeEditorTab === 'preview' ? 'bg-white shadow-xs dark:bg-slate-900 text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}
                  >
                    Anteprima
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('split')}
                    className={`hidden sm:inline-block px-2 py-1 rounded font-medium ${activeEditorTab === 'split' ? 'bg-white shadow-xs dark:bg-slate-900 text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}
                  >
                    Affiancato
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Editor & Preview Container */}
                <div className={`grid gap-4 ${activeEditorTab === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {(activeEditorTab === 'edit' || activeEditorTab === 'split') && (
                    <div>
                      {/* Formatting toolbar helper */}
                      <div className="mb-2 flex flex-wrap gap-1 border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setMarkdownBody((b) => b + '\n## Titolo Sezione\n')}
                          className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 font-bold"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkdownBody((b) => b + '**testo in grassetto**')}
                          className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 font-semibold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkdownBody((b) => b + '*testo in corsivo*')}
                          className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 italic"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkdownBody((b) => b + '\n- Elemento elenco\n')}
                          className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                        >
                          • Elenco
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkdownBody((b) => b + '\n$$ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$\n')}
                          className="rounded px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono"
                        >
                          $$ Formula $$
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkdownBody((b) => b + '\n```javascript\nconsole.log("hello");\n```\n')}
                          className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 font-mono"
                        >
                          &lt;/&gt; Codice
                        </button>
                      </div>

                      <textarea
                        value={markdownBody}
                        onChange={(e) => setMarkdownBody(e.target.value)}
                        placeholder="# Titolo degli appunti&#10;&#10;Scrivi qui il testo, definizioni, formule come $E = mc^2$..."
                        className="h-80 w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {(activeEditorTab === 'preview' || activeEditorTab === 'split') && (
                    <div className="h-80 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-3">
                        Anteprima dal vivo
                      </div>
                      <MarkdownViewer content={markdownBody} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 2: Metadata Form */}
          <Card className="dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Informazioni e Metadati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Titolo dell&apos;appunto *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Teorema di Pitagora e applicazioni geometriche"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Descrizione sintetica
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve riassunto dei temi trattati in questo appunto..."
                  className="mt-1 h-20 w-full rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Materia
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleziona materia (opzionale)</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Anno di corso
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Tutti gli anni (Generale)</option>
                    <option value="1">1° Anno</option>
                    <option value="2">2° Anno</option>
                    <option value="3">3° Anno</option>
                    <option value="4">4° Anno</option>
                    <option value="5">5° Anno</option>
                  </select>
                </div>
              </div>

              {/* Visibility and License */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Visibilità dell&apos;appunto
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'CLASS' | 'GRADE_LEVEL' | 'SCHOOL' | 'PRIVATE')}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CLASS">Solo la mia classe</option>
                    <option value="GRADE_LEVEL">Tutto l&apos;anno di corso</option>
                    <option value="SCHOOL">Tutta la scuola</option>
                    <option value="PRIVATE">Privato (visibile solo a me)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {visibility === 'PRIVATE'
                      ? 'Gli appunti privati sono inaccessibili anche a docenti e compagni.'
                      : 'Gli studenti della tua scuola potranno consultare e valutare questo appunto.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Licenza di distribuzione
                  </label>
                  <select
                    value={license}
                    onChange={(e) => setLicense(e.target.value as 'ORIGINALE' | 'CC_BY' | 'CC_BY_SA' | 'CC_BY_NC')}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ORIGINALE">Opera originale (Tutti i diritti riservati all&apos;autore)</option>
                    <option value="CC_BY">Creative Commons Attribuzione (CC BY 4.0)</option>
                    <option value="CC_BY_SA">Creative Commons Condividi allo stesso modo (CC BY-SA 4.0)</option>
                    <option value="CC_BY_NC">Creative Commons Non Commerciale (CC BY-NC 4.0)</option>
                  </select>
                </div>
              </div>

              {/* Tags input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tag tematici (premi Invio o virgola per inserire)
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? "Es. equazioni, riassunto, latino..." : ""}
                    className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 focus:outline-none min-w-[120px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
            >
              Salva come Bozza
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || isUploading}
              onClick={() => handleSubmit('PUBLISHED')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pubblica Appunto
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
