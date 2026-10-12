'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  Plus,
  Loader2,
  Trash2,
  Lock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StudentNav } from '@/components/navigation/student-nav';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ConversationSummary {
  id: string;
  type: string;
  updatedAt: string;
  isUnread: boolean;
  otherParticipants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
  lastMessage: {
    id: string;
    body: string;
    sentAt: string;
    senderName: string;
  } | null;
}

interface MessageItem {
  id: string;
  body: string;
  sentAt: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface SchoolUserItem {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function MessagingPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState('');
  const [initialMsg, setInitialMsg] = useState('');

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<ConversationSummary[]>({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get<ConversationSummary[]>('/conversations'),
  });

  // Fetch active conversation messages
  const { data: messagesData, isLoading: loadingMessages } = useQuery<{ items: MessageItem[] }>({
    queryKey: ['conversation-messages', activeConversationId],
    queryFn: () => apiClient.get<{ items: MessageItem[] }>(`/conversations/${activeConversationId}/messages`),
    enabled: !!activeConversationId,
    refetchInterval: 5000, // Poll every 5s for new messages
  });

  const messages = messagesData?.items || [];

  // Fetch possible recipients
  const { data: usersData } = useQuery<{ items?: SchoolUserItem[] } | SchoolUserItem[]>({
    queryKey: ['school-users'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ items?: SchoolUserItem[] } | SchoolUserItem[]>('/users');
        return Array.isArray(res) ? res : res.items || [];
      } catch {
        return [];
      }
    },
    enabled: newChatOpen,
  });

  const availableUsers = (Array.isArray(usersData) ? usersData : usersData?.items || []).filter(
    (u) => u.id !== user?.id,
  );

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(`/conversations/${activeConversationId}/messages`, { body }),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore invio messaggio';
      toast.error(msg);
    },
  });

  // Create conversation mutation
  const createConvMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ id: string }>('/conversations', {
        recipientUserId,
        initialMessage: initialMsg.trim() || undefined,
      }),
    onSuccess: (data) => {
      setNewChatOpen(false);
      setRecipientUserId('');
      setInitialMsg('');
      setActiveConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversazione avviata');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore avvio conversazione';
      toast.error(msg);
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiClient.delete(`/conversations/${activeConversationId}/messages/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', activeConversationId] });
      toast.success('Messaggio rimosso');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Errore cancellazione';
      toast.error(msg);
    },
  });

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <StudentNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Messaggistica Scolastica
              </h1>
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Lock className="mr-1 h-3 w-3" /> Canale Sicuro
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Comunicazione contestualizzata tra docenti, studenti e famiglie nel rispetto delle linee guida scolastiche.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setNewChatOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Nuovo Messaggio
          </Button>
        </div>

        {/* Messaging Box Split Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[650px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {/* Left panel: Conversation list */}
          <div className="border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-500 uppercase tracking-wider">
              Conversazioni ({conversations.length})
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {loadingConversations ? (
                <div className="p-4 text-center text-xs text-slate-400">Caricamento conversazioni...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nessuna conversazione attiva. Inizia un nuovo messaggio!
                </div>
              ) : (
                conversations.map((conv) => {
                  const recipient = conv.otherParticipants[0];
                  const isSelected = conv.id === activeConversationId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors flex items-start gap-3 ${
                        isSelected
                          ? 'bg-white shadow-xs dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {recipient ? `${recipient.firstName[0]}${recipient.lastName[0]}` : 'U'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {recipient ? `${recipient.firstName} ${recipient.lastName}` : 'Conversazione'}
                          </span>
                          {conv.isUnread && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>

                        {recipient && (
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {recipient.role}
                          </div>
                        )}

                        {conv.lastMessage && (
                          <p className="mt-1 text-xs text-slate-500 truncate">
                            {conv.lastMessage.body}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Active chat thread */}
          <div className="md:col-span-2 flex flex-col h-full bg-white dark:bg-slate-900">
            {activeConversationId ? (
              <>
                {/* Active chat header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      {activeConv?.otherParticipants[0]
                        ? `${activeConv.otherParticipants[0].firstName[0]}${activeConv.otherParticipants[0].lastName[0]}`
                        : 'U'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {activeConv?.otherParticipants[0]
                          ? `${activeConv.otherParticipants[0].firstName} ${activeConv.otherParticipants[0].lastName}`
                          : 'Conversazione'}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {activeConv?.otherParticipants[0]?.role}
                      </span>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[10px] text-slate-400">
                    Audit Attivo
                  </Badge>
                </div>

                {/* Message stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                      Caricamento messaggi...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                      Nessun messaggio. Scrivi il primo messaggio qui sotto!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs group relative ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-br-xs'
                                : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.body}</p>
                            <div
                              className={`mt-1 text-[10px] flex items-center gap-2 justify-end ${
                                isMe ? 'text-emerald-100' : 'text-slate-400'
                              }`}
                            >
                              <span>{new Date(msg.sentAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && (
                                <button
                                  onClick={() => deleteMutation.mutate(msg.id)}
                                  className="opacity-0 group-hover:opacity-100 hover:text-rose-200 transition-opacity"
                                  title="Elimina"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input footer */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                        e.preventDefault();
                        sendMutation.mutate(messageText.trim());
                      }
                    }}
                    placeholder="Scrivi un messaggio formale..."
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={!messageText.trim() || sendMutation.isPending}
                    onClick={() => sendMutation.mutate(messageText.trim())}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
                <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                  Seleziona una conversazione
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Scegli una conversazione dalla colonna di sinistra o avvia un nuovo scambio con un docente o genitore.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* New Conversation Dialog */}
        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                Nuova Conversazione
              </DialogTitle>
              <DialogDescription>
                Seleziona un docente o contatto della scuola autorizzato per inviare una comunicazione formale.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Destinatario *
                </label>
                <select
                  value={recipientUserId}
                  onChange={(e) => setRecipientUserId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Seleziona utente...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Messaggio Iniziale (opzionale)
                </label>
                <textarea
                  value={initialMsg}
                  onChange={(e) => setInitialMsg(e.target.value)}
                  placeholder="Scrivi l'oggetto o il testo del messaggio..."
                  className="mt-1 h-20 w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setNewChatOpen(false)}>
                Annulla
              </Button>
              <Button
                size="sm"
                disabled={!recipientUserId || createConvMutation.isPending}
                onClick={() => createConvMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Avvia Conversazione
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
