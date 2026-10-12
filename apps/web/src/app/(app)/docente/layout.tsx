'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  Calendar,
  AlertTriangle,
  Bell,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Role } from '@registro/shared';
import { Button } from '@/components/ui/button';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth().then((authenticated) => {
      if (!authenticated) {
        router.push('/login');
      }
    });
  }, [checkAuth, router]);

  const navItems = [
    { label: 'Panoramica', href: '/docente', icon: LayoutDashboard },
    { label: 'Registro & Appello', href: '/docente/registro', icon: ClipboardCheck },
    { label: 'Valutazioni & Voti', href: '/docente/voti', icon: GraduationCap },
    { label: 'Compiti', href: '/docente/compiti', icon: BookOpen },
    { label: 'Agenda & Verifiche', href: '/docente/agenda', icon: Calendar },
    { label: 'Note Disciplinari', href: '/docente/note', icon: AlertTriangle },
    { label: 'Comunicazioni', href: '/docente/comunicazioni', icon: Bell },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center text-slate-500">Caricamento registro docente...</div>
      </div>
    );
  }

  if (user && user.role !== Role.TEACHER && user.role !== Role.SCHOOL_ADMIN && user.role !== Role.SUPER_ADMIN) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-4 text-center dark:bg-slate-950">
        <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900 dark:bg-slate-900">
          <Lock className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Accesso Riservato ai Docenti</h2>
          <Button onClick={() => router.push('/dashboard')} className="mt-6">
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              RD
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight leading-tight">Registro Docente</div>
              <div className="text-xs text-slate-500 truncate">{user?.school?.name || 'Scuola'}</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
          <Link
            href="/profilo/sicurezza"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Sicurezza Account</span>
          </Link>

          <div className="flex items-center justify-between px-3 py-2">
            <div className="truncate">
              <div className="text-xs font-semibold truncate">
                Prof. {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{user?.username}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Disconnetti"
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
