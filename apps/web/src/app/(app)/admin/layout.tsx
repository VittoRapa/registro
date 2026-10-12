'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  FileSpreadsheet,
  GraduationCap,
  BookOpen,
  Settings,
  ShieldCheck,
  History,
  LogOut,
  LayoutDashboard,
  Building2,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Role } from '@registro/shared';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
    { label: 'Panoramica', href: '/admin', icon: LayoutDashboard },
    { label: 'Gestione Utenti', href: '/admin/utenti', icon: Users },
    { label: 'Importa CSV', href: '/admin/utenti/importa', icon: FileSpreadsheet },
    { label: 'Classi', href: '/admin/classi', icon: GraduationCap },
    { label: 'Materie', href: '/admin/materie', icon: BookOpen },
    { label: 'Impostazioni Scuola', href: '/admin/impostazioni', icon: Settings },
    { label: 'Registro Audit', href: '/admin/audit', icon: History },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center text-slate-500">Caricamento pannello amministrativo...</div>
      </div>
    );
  }

  if (user && user.role !== Role.SUPER_ADMIN && user.role !== Role.SCHOOL_ADMIN) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-4 text-center dark:bg-slate-950">
        <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900 dark:bg-slate-900">
          <Lock className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Accesso Negato</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Questa sezione è riservata esclusivamente ai dirigenti scolastici e amministratori di sistema.
          </p>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white font-bold">
              RE
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight leading-tight">Registro Elettronico</div>
              <div className="text-xs text-slate-500">Pannello Amministrazione</div>
            </div>
          </div>

          {/* School badge */}
          <div className="my-4 rounded-lg bg-blue-50/70 p-3 border border-blue-100 dark:border-blue-950 dark:bg-blue-950/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate">{user?.school?.name || 'Istituto Scolastico'}</span>
            </div>
            {user?.school?.code && (
              <div className="text-[11px] text-blue-600/80 font-mono mt-0.5">Cod. {user.school.code}</div>
            )}
          </div>

          {/* Nav links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
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

        {/* User profile & actions */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
          <Link
            href="/profilo/sicurezza"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Sicurezza & 2FA</span>
            </div>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {user?.twoFactorEnabled ? '2FA Attivo' : '2FA Non attivo'}
            </span>
          </Link>

          <div className="flex items-center justify-between px-3 py-2">
            <div className="truncate">
              <div className="text-xs font-semibold truncate">
                {user?.firstName} {user?.lastName}
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
