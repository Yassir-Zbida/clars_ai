'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { User } from 'next-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/dashboard/clients', label: 'Clients' },
  { href: '/dashboard/projects', label: 'Projets' },
  { href: '/dashboard/invoices', label: 'Factures' },
  { href: '/dashboard/payments', label: 'Paiements' },
  { href: '/dashboard/ai', label: 'Assistant IA' },
  { href: '/dashboard/analytics', label: 'Analytics' },
];

export function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="font-semibold">
          clars.ai
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-2">
        <p className="truncate px-3 py-2 text-sm text-muted-foreground">
          {user.email ?? user.name ?? 'Compte'}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
