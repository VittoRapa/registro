'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  UserCheck,
  Video,
  MapPin,
  Plus,
  Trash2,
  CalendarCheck,
  XCircle,
  CheckCircle,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiClient, getApiBaseUrl } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { StudentNav } from '@/components/navigation/student-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Role } from '@registro/shared';

interface TeacherSlot {
  id: string;
  teacherId: string;
  startAt: string;
  endAt: string;
  capacity: number;
  mode: 'PRESENZA' | 'ONLINE';
  link?: string | null;
  teacher?: { id: string; firstName: string; lastName: string };
  bookings?: Array<{ id: string }>;
}

interface Booking {
  id: string;
  slotId: string;
  parentUserId: string;
  studentProfileId: string;
  status: 'BOOKED' | 'CANCELLED' | 'COMPLETED';
  note?: string | null;
  createdAt: string;
  slot: {
    id: string;
    startAt: string;
    endAt: string;
    mode: 'PRESENZA' | 'ONLINE';
    link?: string | null;
    teacher?: { id: string; firstName: string; lastName: string };
  };
  parent?: { id: string; firstName: string; lastName: string; email: string };
  studentProfile?: {
    id: string;
    user?: { firstName: string; lastName: string };
  };
}

interface UserProfile {
  id: string;
  role: Role;
  parentLinksAsParent?: Array<{
    studentProfile: {
      id: string;
      user: { firstName: string; lastName: string };
    };
  }>;
}

export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isTeacher = user?.role === Role.TEACHER || user?.role === Role.SCHOOL_ADMIN || user?.role === Role.SUPER_ADMIN;
  const isParent = user?.role === Role.PARENT;

  // New slot form state
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [mode, setMode] = useState<'PRESENZA' | 'ONLINE'>('PRESENZA');
  const [link, setLink] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Booking form state
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [bookingNote, setBookingNote] = useState('');

  // Fetch full profile for parent links if parent
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['my-profile-colloqui'],
    queryFn: () => apiClient<UserProfile>('/auth/me'),
  });

  // Fetch slots
  const { data: slots = [], isLoading: loadingSlots } = useQuery<TeacherSlot[]>({
    queryKey: ['meeting-slots'],
    queryFn: () => apiClient<TeacherSlot[]>('/meetings/slots'),
  });

  // Fetch bookings
  const { data: bookings = [], isLoading: loadingBookings } = useQuery<Booking[]>({
    queryKey: ['meeting-bookings'],
    queryFn: () => apiClient<Booking[]>('/meetings/bookings'),
  });

  // Teacher: create slot mutation
  const createSlotMutation = useMutation({
    mutationFn: (newSlot: { startAt: string; endAt: string; capacity: number; mode: string; link?: string }) =>
      apiClient('/meetings/slots', { method: 'POST', body: JSON.stringify(newSlot) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-slots'] });
      setStartAt('');
      setEndAt('');
      setCapacity('1');
      setLink('');
      setErrorMsg(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore durante la creazione dello slot';
      setErrorMsg(msg);
    },
  });

  // Teacher: delete slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: string) => apiClient(`/meetings/slots/${slotId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-slots'] });
    },
  });

  // Parent: book slot mutation
  const bookSlotMutation = useMutation({
    mutationFn: (dto: { slotId: string; studentProfileId: string; note?: string }) =>
      apiClient('/meetings/bookings', { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-slots'] });
      setSelectedSlotId(null);
      setBookingNote('');
      setErrorMsg(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore durante la prenotazione';
      setErrorMsg(msg);
    },
  });

  // Update booking status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'BOOKED' | 'CANCELLED' | 'COMPLETED' }) =>
      apiClient(`/meetings/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-slots'] });
    },
  });

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!startAt || !endAt) {
      setErrorMsg('Specificare data/ora di inizio e fine');
      return;
    }
    createSlotMutation.mutate({
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      capacity: parseInt(capacity, 10) || 1,
      mode,
      link: mode === 'ONLINE' ? link : undefined,
    });
  };

  const handleBookSlot = (slotId: string) => {
    setErrorMsg(null);
    const studentId = selectedStudentId || profile?.parentLinksAsParent?.[0]?.studentProfile.id;
    if (!studentId) {
      setErrorMsg('Seleziona il figlio per cui intendi richiedere il colloquio');
      return;
    }
    bookSlotMutation.mutate({
      slotId,
      studentProfileId: studentId,
      note: bookingNote || undefined,
    });
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'BOOKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle className="h-3 w-3" /> Confermato
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <XCircle className="h-3 w-3" /> Annullato
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            Completato
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <StudentNav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-emerald-600" />
              Colloqui e Ricevimento Famiglie
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestione delle disponibilità e prenotazione dei colloqui individuali docenti-genitori.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`${getApiBaseUrl()}/calendar/feed.ics`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              Sincronizza iCal (RFC 5545)
            </a>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TEACHER VIEW */}
        {isTeacher && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Create Slot */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    Nuovo Slot Disponibilità
                  </CardTitle>
                  <CardDescription>
                    Inserisci gli orari in cui sei disponibile per ricevere i genitori.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateSlot} className="space-y-4 text-sm">
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Inizio Ricevimento
                      </label>
                      <input
                        type="datetime-local"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Fine Ricevimento
                      </label>
                      <input
                        type="datetime-local"
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Capienza
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Modalità
                        </label>
                        <select
                          value={mode}
                          onChange={(e) => setMode(e.target.value as 'PRESENZA' | 'ONLINE')}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="PRESENZA">In Presenza</option>
                          <option value="ONLINE">Online (Videocall)</option>
                        </select>
                      </div>
                    </div>

                    {mode === 'ONLINE' && (
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Link Riunione (Meet / Teams)
                        </label>
                        <input
                          type="url"
                          placeholder="https://meet.google.com/..."
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={createSlotMutation.isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {createSlotMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Pubblica Disponibilità'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* List Slots & Bookings */}
            <div className="lg:col-span-2 space-y-6">
              {/* My Slots */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-600" />
                      I Miei Slot Futuri
                    </span>
                    <span className="text-xs font-normal text-slate-500">
                      {slots.length} attivi
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSlots ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Caricamento disponibilità...
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      Nessun intervallo di disponibilità programmato. Usa il form a sinistra per crearne uno.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {slots.map((slot) => {
                        const bookedCount = slot.bookings?.length || 0;
                        return (
                          <div key={slot.id} className="py-3 flex items-center justify-between gap-4">
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                {formatDateTime(slot.startAt)} - {new Date(slot.endAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                                <span className="inline-flex items-center gap-1">
                                  {slot.mode === 'ONLINE' ? <Video className="h-3 w-3 text-blue-500" /> : <MapPin className="h-3 w-3 text-emerald-500" />}
                                  {slot.mode === 'ONLINE' ? 'Videocall' : 'In Presenza'}
                                </span>
                                <span>Capienza: {bookedCount} / {slot.capacity} prenotati</span>
                                {slot.link && (
                                  <a href={slot.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                    Link
                                  </a>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSlotMutation.mutate(slot.id)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bookings Received */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    Prenotazioni Ricevute
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingBookings ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Caricamento prenotazioni...
                    </div>
                  ) : bookings.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      Nessuna prenotazione ricevuta al momento.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bookings.map((booking) => (
                        <div key={booking.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {booking.parent?.firstName} {booking.parent?.lastName} ({booking.parent?.email})
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Studente: {booking.studentProfile?.user?.firstName} {booking.studentProfile?.user?.lastName}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{formatDateTime(booking.slot.startAt)}</span>
                              <span>•</span>
                              <span>{booking.slot.mode}</span>
                              {booking.note && <span className="italic font-light">«{booking.note}»</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(booking.status)}
                            {booking.status === 'BOOKED' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'COMPLETED' })}
                                >
                                  Completa
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-rose-600 hover:bg-rose-50"
                                  onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'CANCELLED' })}
                                >
                                  Annulla
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* PARENT VIEW */}
        {isParent && (
          <div className="space-y-8">
            {/* Student selector if multiple children */}
            {profile?.parentLinksAsParent && profile.parentLinksAsParent.length > 1 && (
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Prenota per lo studente:
                </span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                >
                  {profile.parentLinksAsParent.map((link) => (
                    <option key={link.studentProfile.id} value={link.studentProfile.id}>
                      {link.studentProfile.user.firstName} {link.studentProfile.user.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* My existing bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  I Miei Colloqui Prenotati
                </CardTitle>
                <CardDescription>
                  Elenco delle richieste di colloquio effettuate e stato dell&apos;appuntamento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="p-8 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Caricamento...
                  </div>
                ) : bookings.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    Non hai ancora prenotato alcun colloquio. Consulta le disponibilità in basso per fissarne uno.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bookings.map((b) => (
                      <div key={b.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            Prof. {b.slot.teacher?.firstName} {b.slot.teacher?.lastName}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Data: {formatDateTime(b.slot.startAt)} • Modalità: {b.slot.mode}
                            {b.slot.link && (
                              <a href={b.slot.link} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 underline">
                                Entra nella riunione
                              </a>
                            )}
                          </div>
                          {b.note && <div className="text-xs text-slate-500 italic mt-0.5">Nota inviata: «{b.note}»</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(b.status)}
                          {b.status === 'BOOKED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-rose-600 hover:bg-rose-50"
                              onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'CANCELLED' })}
                            >
                              Annulla Prenotazione
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available slots for booking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  Disponibilità Aperte Docenti
                </CardTitle>
                <CardDescription>
                  Seleziona uno slot libero per incontrare i docenti di classe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSlots ? (
                  <div className="p-8 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Caricamento slot...
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    Al momento non sono presenti slot di ricevimento aperti dai docenti.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {slots.map((slot) => {
                      const bookedCount = slot.bookings?.length || 0;
                      const isFull = bookedCount >= slot.capacity;
                      const isSelected = selectedSlotId === slot.id;

                      return (
                        <div
                          key={slot.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            Prof. {slot.teacher?.firstName} {slot.teacher?.lastName}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatDateTime(slot.startAt)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span className="font-semibold">{slot.mode === 'ONLINE' ? 'Videocall' : 'In Presenza'}</span>
                            <span>•</span>
                            <span className={isFull ? 'text-rose-500 font-semibold' : 'text-emerald-600 font-semibold'}>
                              {isFull ? 'Completo' : `${slot.capacity - bookedCount} posti liberi`}
                            </span>
                          </div>

                          {!isFull && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                              {isSelected ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    placeholder="Nota per il docente (opzionale)..."
                                    value={bookingNote}
                                    onChange={(e) => setBookingNote(e.target.value)}
                                    className="w-full text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => handleBookSlot(slot.id)}
                                      disabled={bookSlotMutation.isPending}
                                    >
                                      Conferma Prenotazione
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => setSelectedSlotId(null)}
                                    >
                                      Chiudi
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() => {
                                    setSelectedSlotId(slot.id);
                                    setBookingNote('');
                                  }}
                                >
                                  Seleziona per Prenotare
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* If neither (e.g. Student) */}
        {!isTeacher && !isParent && (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              I colloqui scuola-famiglia sono riservati ai docenti e ai genitori/tutori legali.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
