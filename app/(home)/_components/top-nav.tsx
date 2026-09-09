'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './sign-out-button';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Learn', href: '/learn' },
  { label: 'Plan', href: '/plan' },
  { label: 'Produce', href: '/produce' },
  { label: 'Office', href: '/office' },
] as const;

export function TopNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
        {/* Brand */}
        <span className="shrink-0 text-base font-bold tracking-tight text-slate-900">PCX LMS</span>

        {/* Primary navigation */}
        <nav className="flex flex-1 items-center gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, href }) => {
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
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign-out */}
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden text-sm text-slate-500 sm:block">{email}</span>
          <SignOutButton className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
      </div>
    </header>
  );
}
