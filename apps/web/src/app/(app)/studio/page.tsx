'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Plus,
  Clock,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  repetition: number;
  interval: number;
  easeFactor: number;
  dueDate: string;
}

interface Deck {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  _count: {
    cards: number;
  };
}

function StudioFlashcardsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);

  // New Deck Form
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [isDeckPublic, setIsDeckPublic] = useState(false);

  useEffect(() => {
    const newDeck = searchParams.get('newDeck');
    const title = searchParams.get('title');
    const desc = searchParams.get('desc');
    if (newDeck === 'true' || title) {
      if (title) setDeckTitle(title);
      if (desc) setDeckDescription(desc);
      setShowNewDeckModal(true);
    }
  }, [searchParams]);

  // New Card Form
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardHint, setCardHint] = useState('');

  // Fetch Decks
  const { data: decks, isLoading: isDecksLoading } = useQuery<Deck[]>({
    queryKey: ['flashcard-decks'],
    queryFn: () => apiClient<Deck[]>('/flashcards/decks'),
  });

  // Fetch Due Cards for selected deck
  const { data: dueCards, isLoading: isCardsLoading } = useQuery<Flashcard[]>({
    queryKey: ['due-flashcards', selectedDeckId],
    queryFn: () => apiClient<Flashcard[]>(`/flashcards/decks/${selectedDeckId}/due`),
    enabled: !!selectedDeckId,
  });

  // Create Deck Mutation
  const createDeckMutation = useMutation({
    mutationFn: () =>
      apiClient('/flashcards/decks', {
        method: 'POST',
        body: JSON.stringify({
          title: deckTitle.trim(),
          description: deckDescription.trim() || undefined,
          isPublic: isDeckPublic,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-decks'] });
      setShowNewDeckModal(false);
      setDeckTitle('');
      setDeckDescription('');
    },
  });

  // Add Card Mutation
  const addCardMutation = useMutation({
    mutationFn: () =>
      apiClient(`/flashcards/decks/${selectedDeckId}/cards`, {
        method: 'POST',
        body: JSON.stringify({
          front: cardFront.trim(),
          back: cardBack.trim(),
          hint: cardHint.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcard-decks'] });
      queryClient.invalidateQueries({ queryKey: ['due-flashcards', selectedDeckId] });
      setShowAddCardModal(false);
      setCardFront('');
      setCardBack('');
      setCardHint('');
    },
  });

  // Review Card Mutation (SM-2 Algorithm)
  const reviewCardMutation = useMutation({
    mutationFn: ({ cardId, grade }: { cardId: string; grade: number }) =>
      apiClient(`/flashcards/cards/${cardId}/review`, {
        method: 'POST',
        body: JSON.stringify({ grade }),
      }),
    onSuccess: () => {
      setIsFlipped(false);
      if (dueCards && activeCardIndex < dueCards.length - 1) {
        setActiveCardIndex((prev) => prev + 1);
      } else {
        queryClient.invalidateQueries({ queryKey: ['due-flashcards', selectedDeckId] });
        setActiveCardIndex(0);
      }
    },
  });

  const currentCard = dueCards?.[activeCardIndex];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            Studio Assistito & Flashcard SM-2
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ottimizza la memoria a lungo termine con l'algoritmo scientifico di ripetizione spaziata SuperMemo SM-2.
          </p>
        </div>

        <Button
          onClick={() => setShowNewDeckModal(true)}
          className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Nuovo Mazzo di Studio
        </Button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Decks List */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            I tuoi Mazzi Didattici
          </h2>

          {isDecksLoading ? (
            <div className="py-8 text-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
              Caricamento mazzi...
            </div>
          ) : decks && decks.length > 0 ? (
            <div className="space-y-2">
              {decks.map((deck) => {
                const isSelected = deck.id === selectedDeckId;
                return (
                  <div
                    key={deck.id}
                    onClick={() => {
                      setSelectedDeckId(deck.id);
                      setActiveCardIndex(0);
                      setIsFlipped(false);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-blue-600" />
                          {deck.title}
                        </span>
                        {deck.description ? (
                          <p className="text-xs text-slate-500 line-clamp-1">{deck.description}</p>
                        ) : null}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {deck._count?.cards || 0} carte
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Nessun mazzo creato finora.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Flashcard Player or Deck Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDeckId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Sessione di Ripasso Spaziato
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCardModal(true)}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Aggiungi Scheda
                </Button>
              </div>

              {isCardsLoading ? (
                <div className="py-16 text-center text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                  Caricamento schede in scadenza...
                </div>
              ) : dueCards && dueCards.length > 0 && currentCard ? (
                <div className="space-y-6">
                  {/* Progress Header */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Scheda <strong>{activeCardIndex + 1}</strong> di <strong>{dueCards.length}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Intervallo attuale: {currentCard.interval} giorni
                    </span>
                  </div>

                  {/* Interactive Flip Card */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="min-h-[280px] p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer flex flex-col justify-between items-center text-center transition-all hover:border-blue-400 select-none"
                  >
                    <Badge variant={isFlipped ? 'success' : 'secondary'} className="text-xs mb-4">
                      {isFlipped ? 'RISPOSTA / SOLUZIONE' : 'DOMANDA / CONCETTO'}
                    </Badge>

                    <div className="my-auto max-w-lg">
                      <p className="text-lg sm:text-xl font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                        {isFlipped ? currentCard.back : currentCard.front}
                      </p>
                      {!isFlipped && currentCard.hint ? (
                        <p className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
                          <HelpCircle className="h-3.5 w-3.5" /> Indizio: {currentCard.hint}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-xs text-blue-600 flex items-center gap-1 mt-4">
                      <RotateCcw className="h-3.5 w-3.5" />
                      {isFlipped ? 'Clicca per rivedere la domanda' : 'Clicca per mostrare la risposta'}
                    </div>
                  </div>

                  {/* SM-2 Recall Feedback Buttons */}
                  {isFlipped ? (
                    <div className="space-y-2">
                      <p className="text-xs text-center text-slate-500">
                        Quanto bene ricordavi questa risposta? (Algoritmo SM-2):
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => reviewCardMutation.mutate({ cardId: currentCard.id, grade: 0 })}
                          className="border-red-200 hover:bg-red-50 text-red-700 text-xs py-5"
                        >
                          0: Buio Totale
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => reviewCardMutation.mutate({ cardId: currentCard.id, grade: 3 })}
                          className="border-amber-200 hover:bg-amber-50 text-amber-700 text-xs py-5"
                        >
                          3: Ricordato a stento
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => reviewCardMutation.mutate({ cardId: currentCard.id, grade: 4 })}
                          className="border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs py-5"
                        >
                          4: Buono
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => reviewCardMutation.mutate({ cardId: currentCard.id, grade: 5 })}
                          className="border-blue-200 hover:bg-blue-50 text-blue-700 text-xs py-5"
                        >
                          5: Immediato / Perfetto
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center space-y-3">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">
                      Tutto ripassato per oggi!
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Non ci sono schede in scadenza in questo mazzo. L'algoritmo SM-2 riproporrà i concetti al momento ottimale prima dell'oblio.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddCardModal(true)}
                      className="gap-2 text-xs mt-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi nuove schede al mazzo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <Layers className="h-12 w-12 text-blue-600/40 mx-auto" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Seleziona un mazzo di studio
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Scegli un mazzo dalla colonna a sinistra o creane uno nuovo per iniziare la tua sessione di studio con ripetizione spaziata.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal / Dialog: Nuovo Mazzo */}
      {showNewDeckModal ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Crea Nuovo Mazzo di Studio
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Titolo del Mazzo
                </label>
                <Input
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  placeholder="es. Formule Derivate o Letteratura Barocca"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrizione (opzionale)
                </label>
                <Input
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  placeholder="es. Schede per la verifica del 20 aprile"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isDeckPublic}
                  onChange={(e) => setIsDeckPublic(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Condividi questo mazzo con la scuola (pubblico)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNewDeckModal(false)}>
                Annulla
              </Button>
              <Button
                onClick={() => createDeckMutation.mutate()}
                disabled={!deckTitle.trim() || createDeckMutation.isPending}
                className="bg-blue-600 text-white"
              >
                Crea Mazzo
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal / Dialog: Aggiungi Scheda */}
      {showAddCardModal ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Aggiungi Scheda Flashcard
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fronte (Domanda o Concetto)
                </label>
                <Input
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="es. Qual è la derivata di sin(x)?"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Retro (Risposta o Spiegazione)
                </label>
                <Input
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="es. cos(x)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Suggerimento (opzionale)
                </label>
                <Input
                  value={cardHint}
                  onChange={(e) => setCardHint(e.target.value)}
                  placeholder="es. Ricorda il segno"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddCardModal(false)}>
                Annulla
              </Button>
              <Button
                onClick={() => addCardMutation.mutate()}
                disabled={!cardFront.trim() || !cardBack.trim() || addCardMutation.isPending}
                className="bg-blue-600 text-white"
              >
                Salva Scheda
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function StudioFlashcardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <StudioFlashcardsContent />
    </Suspense>
  );
}
