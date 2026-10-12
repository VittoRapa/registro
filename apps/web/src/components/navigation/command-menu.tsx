'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  GraduationCap,
  Clock,
  BookOpen,
  Calendar,
  FileText,
  Bell,
  MessageSquare,
  Users,
  ShieldCheck,
  Calculator,
  X,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const COMMANDS: CommandItem[] = [
  { id: 'dash', title: 'Bacheca Principale', category: 'Navigazione', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'voti', title: 'Registro Voti e Medie', category: 'Didattica', icon: GraduationCap, href: '/voti' },
  { id: 'simulatore', title: 'Simulatore Voti Obiettivo', category: 'Didattica', icon: Calculator, href: '/voti?tab=simulatore' },
  { id: 'assenze', title: 'Libretto Assenze e Giustifiche', category: 'Didattica', icon: Clock, href: '/assenze' },
  { id: 'compiti', title: 'Compiti per Casa e Checklist', category: 'Didattica', icon: BookOpen, href: '/compiti' },
  { id: 'orario', title: 'Orario Scolastico Settimanale', category: 'Didattica', icon: Calendar, href: '/orario' },
  { id: 'appunti', title: 'Appunti Condivisi & Dispense', category: 'Community', icon: FileText, href: '/appunti' },
  { id: 'appunti-nuovo', title: 'Carica o Crea Appunto', category: 'Community', icon: FileText, href: '/appunti/nuovo' },
  { id: 'messaggi', title: 'Messaggistica Scolastica', category: 'Comunicazione', icon: MessageSquare, href: '/messaggi' },
  { id: 'colloqui', title: 'Colloqui e Ricevimento Docenti', category: 'Comunicazione', icon: Users, href: '/colloqui' },
  { id: 'comunicazioni', title: 'Circolari e Comunicazioni', category: 'Comunicazione', icon: Bell, href: '/comunicazioni' },
  { id: 'sicurezza', title: 'Sicurezza e 2FA TOTP', category: 'Profilo', icon: ShieldCheck, href: '/profilo/sicurezza' },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;

  const filtered = COMMANDS.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setOpen(false)}
      />

      <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Search Header */}
        <div className="flex items-center border-b border-slate-100 px-3 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca comandi, pagine, funzioni (o premi Esc per uscire)..."
            className="h-12 w-full bg-transparent px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Nessun comando o pagina trovata per &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.href)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="rounded p-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.title}</span>
                  </div>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer tip */}
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between">
          <span>Premi <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">Invio</kbd> per selezionare</span>
          <span><kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">Ctrl+K</kbd> per aprire ovunque</span>
        </div>
      </div>
    </div>
  );
}
