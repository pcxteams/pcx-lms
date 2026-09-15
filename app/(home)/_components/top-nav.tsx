'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, House, Map, TrendingUp, Building2, type LucideIcon } from 'lucide-react';
import { SignOutButton } from './sign-out-button';

// Order confirmed against the shipped Cockpit mock's own nav source
// (platform-ui.tsx's SECTIONS array) — not the same order the earlier
// drafts or Confluence's page text separately describe.
const NAV_ITEMS: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: 'Home', href: '/', Icon: House },
  { label: 'Office', href: '/office', Icon: Building2 },
  { label: 'Transact', href: '/transact', Icon: TrendingUp },
  { label: 'Plan', href: '/plan', Icon: Map },
  { label: 'Learn', href: '/learn', Icon: GraduationCap },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function TopNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-4 sm:px-6">
        {/* Brand */}
        <span className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
            PC
          </span>
          PCx LMS
        </span>

        {/* Primary navigation */}
        <nav className="flex flex-1 items-center gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-teal-50 font-semibold text-teal-700'
                    : 'font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800',
                ].join(' ')}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign-out */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-gray-500 md:block">{email}</span>
          <span
            title={name}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white"
          >
            {initials(name)}
          </span>
          <SignOutButton className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>
      </div>
    </header>
  );
}
