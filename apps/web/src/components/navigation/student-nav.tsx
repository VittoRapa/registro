'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  BookOpen,
  Clock,
  Bell,
  FileText,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';

export function StudentNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const navItems = [
    { label: 'Bacheca', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Voti', href: '/voti', icon: GraduationCap },
    { label: 'Assenze', href: '/assenze', icon: Clock },
    { label: 'Compiti', href: '/compiti', icon: BookOpen },
    { label: 'Orario', href: '/orario', icon: Calendar },
    { label: 'Appunti', href: '/appunti', icon: FileText },
    { label: 'Circolari', href: '/comunicazioni', icon: Bell },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand & School */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white shadow-xs">
              RE
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Registro Elettronico
              </div>
              <div className="text-[11px] text-slate-500 truncate max-w-[150px] sm:max-w-[200px]">
                {user?.school?.name || 'Scuola'}
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-[10px] text-slate-400 capitalize">
              {user?.role === 'STUDENT' ? 'Studente' : user?.role === 'PARENT' ? 'Genitore' : user?.role}
            </span>
          </div>

          <Link href="/profilo/sicurezza">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-slate-900" title="Sicurezza Account & 2FA">
              <ShieldCheck className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Disconnetti"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Nav strip */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-100 dark:border-slate-800 px-2 py-1 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
