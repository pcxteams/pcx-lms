'use client';

import { createElement, useState, type ComponentType, type ReactNode } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Handshake,
  LifeBuoy,
  Link2,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Star,
  Users,
} from 'lucide-react';
import { iconFor, type IconComponent } from './office-icons';
import type {
  AnnouncementItem,
  EventItem,
  HeroCardItem,
  LeadershipItem,
  OfficeBrokerage,
  OfficeDirectory,
  OfficePageAction,
  OfficePageContent,
  OfficePageSection,
  QuickLinkItem,
  ResourceItem,
  SupportCardItem,
  VendorItem,
} from '@/lib/office-page-content';
import { groupSectionsIntoRows, SectionRow, TemplateStyles } from './section-rows';

/**
 * The agent's Office page, built to the Agent Office print.
 *
 * Ported from pcx-admin's `OfficePageView.tsx`, which backs both the admin's
 * read view and its builder canvas. Re-copy and re-format it when that changes,
 * rather than editing this copy, so the two surfaces cannot drift.
 *
 * The card styles are fixed; the arrangement is not. Sections fold into rows by
 * `layout.rowId` and size by `layout.span`, so the admin's layout drives this
 * output.
 *
 * `brokerage-info`, `leadership` and `vendor-carousel` render live data the
 * content blob only references; the API resolves it into `OfficeRenderData`.
 * A reference that resolves to nothing is skipped, never shown as a placeholder.
 */

/* ------------------------------------------------------------------ helpers */

const TEAL = '#0d9488';

const AVATAR_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#0d9488', // teal
  '#db2777', // pink
  '#ea580c', // orange
  '#4f46e5', // indigo
  '#0891b2', // cyan
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic palette pick (no randomness — server/client stable). */
function pick<T>(palette: T[], seed: string, offset = 0): T {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[(h + offset) % palette.length];
}

function actionHref(action?: OfficePageAction): string | null {
  const dest = action?.destination?.trim();
  if (!action || !dest) return null;
  if (action.type === 'email') return dest.startsWith('mailto:') ? dest : `mailto:${dest}`;
  if (action.type === 'phone')
    return dest.startsWith('tel:') ? dest : `tel:${dest.replace(/\s+/g, '')}`;
  return dest;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function resourceIcon(name?: string): IconComponent {
  return iconFor(name) ?? FileText;
}

/** Sorted, active items for a section. */
function activeItems<T extends { active: boolean; order: number }>(
  section: OfficePageSection
): T[] {
  return [...(section.items as unknown as T[])]
    .filter((it) => it.active)
    .sort((a, b) => a.order - b.order);
}

const CATEGORY_TAG: Record<string, string> = {
  'new update': 'bg-blue-50 text-blue-600',
  resource: 'bg-violet-50 text-violet-600',
  training: 'bg-amber-50 text-amber-600',
  'office news': 'bg-emerald-50 text-emerald-600',
  'new resource': 'bg-teal-50 text-teal-600',
  policy: 'bg-blue-50 text-blue-600',
  recognition: 'bg-emerald-50 text-emerald-600',
};

function tagClasses(category?: string): string {
  return CATEGORY_TAG[category?.toLowerCase().trim() ?? ''] ?? 'bg-gray-100 text-gray-500';
}

/* --------------------------------------------------------- date formatting */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function eventBadge(startsAt?: string): { mon: string; day: string } | null {
  const d = parseDate(startsAt);
  if (!d) return null;
  return { mon: MONTHS[d.getMonth()], day: String(d.getDate()) };
}

function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return m === 0 ? `${h}:00 ${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d: Date): string {
  const mon = MONTHS[d.getMonth()];
  return `${mon[0]}${mon.slice(1).toLowerCase()} ${d.getDate()}`;
}

/** Human "when" line. `startsAt` accepts free text as well as ISO, so an
 *  unparseable value is echoed back rather than dropped. */
function eventWhen(startsAt?: string, endsAt?: string): string {
  const start = parseDate(startsAt);
  if (!start) return startsAt ?? '';
  const end = parseDate(endsAt);
  const base = `${fmtDate(start)}, ${fmtTime(start)}`;
  if (!end) return base;
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay ? `${base} – ${fmtTime(end)}` : `${base} – ${fmtDate(end)}, ${fmtTime(end)}`;
}

/* ---------------------------------------------------------- shared chrome */

/** A live, DB-backed Vendor (KAN-99) — distinct from the builder's `vendor-carousel` items. */
export interface AgentOfficeVendor {
  id: string;
  companyName: string;
  companyWebsite: string | null;
  description: string | null;
  logoUrl: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

/** Page-level chrome from the content blob, plus the API-resolved live data. */
export interface OfficeRenderData {
  branding?: OfficePageContent['branding'];
  footer?: OfficePageContent['footer'];
  brokerage?: OfficeBrokerage | null;
  directory?: OfficeDirectory;
  activeVendors?: AgentOfficeVendor[];
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-gray-100 bg-white ${className}`}>
      {children}
    </section>
  );
}

/** The print's card heading: icon chip, title, optional link. */
function Head({
  icon: Icon,
  title,
  action,
  href,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        <Icon size={16} strokeWidth={1.9} />
      </span>
      <h2 className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-gray-900">
        {title}
      </h2>
      {action && (
        <a
          href={href || '#'}
          className="flex flex-none items-center gap-0.5 text-xs font-semibold text-teal-600 hover:text-teal-700"
        >
          {action}
          <ArrowRight size={12} strokeWidth={2.2} />
        </a>
      )}
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 mb-4 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center sm:mx-5 sm:mb-5">
      <p className="text-xs text-gray-400">{children}</p>
    </div>
  );
}

/** A missing href degrades to plain text. */
function Action({
  href,
  children,
  className = '',
}: {
  href: string | null;
  children: ReactNode;
  className?: string;
}) {
  if (!href) return <span className={className}>{children}</span>;
  const external = isExternal(href);
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={className}
    >
      {children}
    </a>
  );
}

/* ----------------------------------------------------------- calendar */

function stamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `T${p(date.getHours())}${p(date.getMinutes())}00`
  );
}

/** Commas, semicolons and backslashes are iCalendar separators. */
function ics(value: string): string {
  return value.replace(/([\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');
}

function downloadIcs(event: EventItem, officeName: string): void {
  const start = parseDate(event.startsAt);
  if (!start) return;
  const end = parseDate(event.endsAt) ?? new Date(start.getTime() + 60 * 60 * 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PCx//Office//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@pcx`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${ics(event.title)}`,
    event.location ? `LOCATION:${ics(event.location)}` : '',
    `DESCRIPTION:${ics(event.description ?? officeName)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.id}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

/* --------------------------------------------------------------- sections */

function HeroBanner({ section, data }: { section?: OfficePageSection; data: OfficeRenderData }) {
  const card = section ? activeItems<HeroCardItem>(section)[0] : undefined;
  const officeName = data.brokerage?.name || data.branding?.name || '';
  const title = card?.title || officeName || 'Office Access';
  const image = card?.backgroundImageUrl;

  return (
    <section className="relative overflow-hidden rounded-xl border border-gray-200">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={
          image
            ? { backgroundImage: `url("${image}")` }
            : { backgroundColor: card?.backgroundColor ?? '#0f172a' }
        }
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-gray-950/92 via-gray-950/70 to-gray-900/40"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 px-4 py-7 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            {data.branding?.tagline || 'Welcome to your office'}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-[27px]">
            {title}
          </h1>
          {card?.subtitle && <p className="mt-2 text-sm text-white/75">{card.subtitle}</p>}
        </div>
        {card?.description && (
          <div className="max-w-sm flex-none rounded-xl border border-white/15 bg-gray-950/50 p-4 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-white/85">{card.description}</p>
            {officeName && (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                {officeName}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Live `branding_config`, so there is nothing to edit in the builder. */
function Brokerage({ section, data }: { section: OfficePageSection; data: OfficeRenderData }) {
  const b = data.brokerage;
  const hours = data.footer?.officeHours;
  const hasBody = !!(
    b &&
    (b.logoUrl || b.address || b.cityStateZip || b.phone || b.email || b.website)
  );

  return (
    <Panel>
      <Head icon={Building2} title={section.title || 'Brokerage Info'} />
      {!hasBody && (
        <EmptyLine>Add your address and contact details in the Workspace Profile.</EmptyLine>
      )}
      {hasBody && b && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="mb-4 flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 px-4 py-5 text-center">
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt={b.name} className="max-h-12 w-auto object-contain" />
            ) : (
              <>
                <Building2 size={22} className="text-gray-400" strokeWidth={1.6} />
                <p className="mt-2 text-sm font-bold uppercase leading-tight tracking-[0.06em] text-gray-800">
                  {b.name}
                </p>
              </>
            )}
          </div>

          {(b.address || b.cityStateZip) && (
            <p className="text-sm leading-relaxed text-gray-600">
              {b.address}
              {b.address && b.cityStateZip && <br />}
              {b.cityStateZip}
            </p>
          )}

          <ul className="mt-4 grid grid-cols-1 gap-2.5">
            {b.phone && (
              <li className="flex items-center gap-2.5">
                <Phone size={14} className="flex-none text-teal-600" strokeWidth={1.9} />
                <a href={telHref(b.phone)} className="text-sm text-gray-700 hover:text-teal-700">
                  {b.phone}
                </a>
              </li>
            )}
            {b.email && (
              <li className="flex items-center gap-2.5">
                <Mail size={14} className="flex-none text-teal-600" strokeWidth={1.9} />
                <a
                  href={`mailto:${b.email}`}
                  className="min-w-0 truncate text-sm text-gray-700 hover:text-teal-700"
                >
                  {b.email}
                </a>
              </li>
            )}
            {b.website && (
              <li className="flex items-center gap-2.5">
                <Globe size={14} className="flex-none text-teal-600" strokeWidth={1.9} />
                <Action
                  href={b.website}
                  className="min-w-0 truncate text-sm text-gray-700 hover:text-teal-700"
                >
                  {b.website.replace(/^https?:\/\//, '')}
                </Action>
              </li>
            )}
            {b.mapUrl && (
              <li className="flex items-center gap-2.5">
                <MapPin size={14} className="flex-none text-teal-600" strokeWidth={1.9} />
                <a
                  href={b.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  Get directions
                </a>
              </li>
            )}
          </ul>

          {hours && (
            <div className="mt-4 flex items-start gap-2.5 border-t border-gray-100 pt-3.5">
              <Clock size={14} className="mt-0.5 flex-none text-gray-400" strokeWidth={1.9} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800">Office hours</p>
                <p className="mt-0.5 text-xs text-gray-500">{hours}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function QuickTools({ section }: { section: OfficePageSection }) {
  const items = activeItems<QuickLinkItem>(section);
  return (
    <Panel>
      <Head icon={Link2} title={section.title || 'Quick Access Tools'} />
      {items.length === 0 && <EmptyLine>No links yet.</EmptyLine>}
      <ul className="grid grid-cols-1 px-2 pb-2 sm:px-3 sm:pb-3">
        {items.map((item) => {
          const Icon = iconFor(item.icon);
          const tint = item.accentColor ?? TEAL;
          return (
            <li key={item.id}>
              <Action
                href={actionHref(item.action)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50"
              >
                <span
                  className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-lg"
                  style={{ backgroundColor: `${tint}14`, color: tint }}
                >
                  {item.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logoUrl} alt="" className="h-full w-full object-contain" />
                  ) : Icon ? (
                    <Icon size={15} />
                  ) : (
                    <Globe size={15} strokeWidth={1.9} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="block truncate text-xs text-gray-400">{item.subtitle}</span>
                  )}
                </span>
                <ChevronRight size={15} className="flex-none text-gray-300" strokeWidth={2} />
              </Action>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Shortcuts({ section }: { section: OfficePageSection }) {
  const items = activeItems<QuickLinkItem>(section);
  return (
    <Panel>
      <Head icon={LifeBuoy} title={section.title || 'Useful Shortcuts'} />
      {items.length === 0 && <EmptyLine>No shortcuts yet.</EmptyLine>}
      <ul className="grid grid-cols-1 px-2 pb-3 sm:px-3">
        {items.map((item) => (
          <li key={item.id}>
            <Action
              href={actionHref(item.action)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-teal-700"
            >
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <ChevronRight size={14} className="flex-none text-gray-300" strokeWidth={2} />
            </Action>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** One featured announcement plus a carousel; `pinned` picks the opening one. */
function Announcements({ section }: { section: OfficePageSection }) {
  const items = activeItems<AnnouncementItem>(section);
  const pinnedFirst = Math.max(
    0,
    items.findIndex((item) => item.pinned)
  );
  const [at, setAt] = useState(pinnedFirst);

  if (items.length === 0) {
    return (
      <Panel>
        <Head icon={Megaphone} title={section.title || 'Office Announcements'} />
        <EmptyLine>No announcements.</EmptyLine>
      </Panel>
    );
  }

  // Items can be removed while the carousel sits on a later index.
  const index = at % items.length;
  const featured = items[index];
  const rest = items.filter((item) => item.id !== featured.id).slice(0, 3);
  // Lowercase + createElement: a capitalized binding here trips
  // react-hooks/static-components.
  const featuredIcon = iconFor(featured.icon) ?? Megaphone;

  return (
    <Panel>
      <Head icon={Megaphone} title={section.title || 'Office Announcements'} action="View all" />
      <div className="grid grid-cols-1 gap-3 px-4 pb-3 sm:px-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative min-h-[260px] overflow-hidden rounded-xl bg-gray-900">
          {featured.imageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${featured.imageUrl}")` }}
              aria-hidden
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-white/10"
              aria-hidden
            >
              {createElement(featuredIcon, { size: 120 })}
            </div>
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-gray-950/95 via-gray-950/55 to-gray-950/15"
            aria-hidden
          />
          <div className="relative flex h-full flex-col justify-end p-4 sm:p-5">
            {featured.category && (
              <span className="mb-2 w-fit rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-800">
                {featured.category}
              </span>
            )}
            <h3 className="text-lg font-bold leading-tight tracking-tight text-white">
              {featured.title}
            </h3>
            {featured.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">{featured.description}</p>
            )}
            {featured.date && <p className="mt-1.5 text-xs text-white/60">{featured.date}</p>}
            {actionHref(featured.action) && (
              <Action
                href={actionHref(featured.action)}
                className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 transition-colors hover:bg-gray-100"
              >
                {featured.action?.label || 'Learn more'}
                <ArrowRight size={13} strokeWidth={2.2} />
              </Action>
            )}
          </div>
        </div>

        <ul className="grid grid-cols-1 content-start gap-2">
          {rest.map((item) => {
            const Icon = iconFor(item.icon) ?? Megaphone;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setAt(items.findIndex((i) => i.id === item.id))}
                  className="flex w-full items-start gap-3 rounded-xl border border-gray-100 p-2.5 text-left transition-colors hover:border-teal-200 hover:bg-gray-50"
                >
                  <span
                    className="relative flex h-12 w-14 flex-none items-center justify-center overflow-hidden rounded-lg bg-gray-100 bg-cover bg-center text-gray-400"
                    style={
                      item.imageUrl ? { backgroundImage: `url("${item.imageUrl}")` } : undefined
                    }
                  >
                    {!item.imageUrl && <Icon size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-gray-900">
                      {item.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      {item.category && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tagClasses(item.category)}`}
                        >
                          {item.category}
                        </span>
                      )}
                      {item.date && <span className="text-[11px] text-gray-400">{item.date}</span>}
                    </span>
                  </span>
                  <ChevronRight
                    size={15}
                    className="mt-3 flex-none text-gray-300"
                    strokeWidth={2}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-3 pb-4">
          <button
            type="button"
            onClick={() => setAt((n) => (n - 1 + items.length) % items.length)}
            aria-label="Previous announcement"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-teal-300 hover:text-teal-600"
          >
            <ChevronLeft size={14} strokeWidth={2.2} />
          </button>
          <span className="flex items-center gap-1.5">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAt(i)}
                aria-label={`Announcement ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-teal-600' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </span>
          <button
            type="button"
            onClick={() => setAt((n) => (n + 1) % items.length)}
            aria-label="Next announcement"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-teal-300 hover:text-teal-600"
          >
            <ChevronRight size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </Panel>
  );
}

/** Picture tiles, falling back to the accent color and the item's icon. */
function ImportantResources({ section }: { section: OfficePageSection }) {
  const items = activeItems<ResourceItem>(section);
  return (
    <Panel>
      <Head icon={Star} title={section.title || 'Important Resources'} action="View all" />
      {items.length === 0 && <EmptyLine>No resources yet.</EmptyLine>}
      <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5">
        {items.map((item) => {
          const Icon = resourceIcon(item.icon);
          const tint = item.accentColor ?? pick(AVATAR_COLORS, item.id);
          return (
            <Action
              key={item.id}
              href={actionHref(item.action)}
              className="group relative flex min-h-[150px] flex-col justify-end overflow-hidden rounded-xl p-3"
            >
              {item.imageUrl ? (
                <span
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url("${item.imageUrl}")` }}
                  aria-hidden
                />
              ) : (
                <span className="absolute inset-0" style={{ backgroundColor: tint }} aria-hidden />
              )}
              {!item.imageUrl && (
                <span
                  className="absolute right-3 top-3 text-white/25 transition-transform duration-500 group-hover:scale-110"
                  aria-hidden
                >
                  <Icon size={56} />
                </span>
              )}
              <span
                className="absolute inset-0 bg-gradient-to-t from-gray-950/92 via-gray-950/45 to-transparent"
                aria-hidden
              />
              <span className="relative">
                {item.category && (
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/70">
                    {item.category}
                  </span>
                )}
                <span className="block text-sm font-bold leading-tight text-white">
                  {item.title}
                </span>
                {item.description && (
                  <span className="mt-1 block truncate text-xs text-white/70">
                    {item.description}
                  </span>
                )}
                <span className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-white/85">
                  {item.action?.label ?? 'Open'}
                  <ArrowRight size={12} strokeWidth={2.4} />
                </span>
              </span>
            </Action>
          );
        })}
      </div>
    </Panel>
  );
}

function Events({ section, data }: { section: OfficePageSection; data: OfficeRenderData }) {
  const items = activeItems<EventItem>(section);
  const officeName = data.brokerage?.name || data.branding?.name || 'Your office';
  return (
    <Panel>
      <Head icon={CalendarDays} title={section.title || 'Upcoming Events'} action="View all" />
      {items.length === 0 && <EmptyLine>No upcoming events.</EmptyLine>}
      <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5">
        {items.map((item) => {
          const badge = eventBadge(item.startsAt);
          const when = eventWhen(item.startsAt, item.endsAt);
          // Only a parseable date can become a calendar entry.
          const datable = !!parseDate(item.startsAt);
          return (
            <div
              key={item.id}
              className="flex flex-col rounded-xl border border-gray-100 p-3 transition-colors hover:border-teal-200"
            >
              <div className="flex gap-3">
                <span className="flex h-12 w-12 flex-none flex-col items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  {badge ? (
                    <>
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        {badge.mon}
                      </span>
                      <span className="text-base font-bold leading-none">{badge.day}</span>
                    </>
                  ) : (
                    <CalendarDays size={18} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-gray-900">{item.title}</p>
                  {when && <p className="mt-0.5 text-xs text-gray-500">{when}</p>}
                  {item.location && (
                    <p className="truncate text-xs text-gray-400">{item.location}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-2.5">
                {datable && (
                  <button
                    type="button"
                    onClick={() => downloadIcs(item, officeName)}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Add to calendar
                    <ArrowRight size={12} strokeWidth={2.2} />
                  </button>
                )}
                {item.registrationLink && (
                  <Action
                    href={item.registrationLink}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Register
                    <ArrowRight size={12} strokeWidth={2.2} />
                  </Action>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** Membership references, resolved against the directory. An unset picker or a
 *  departed member resolves to nobody, and that row is skipped. */
function Leadership({ section, data }: { section: OfficePageSection; data: OfficeRenderData }) {
  const items = activeItems<LeadershipItem>(section);
  const directory = data.directory ?? {};
  const resolved = items
    .map((item) => ({ item, member: directory[item.workspaceMembershipId] }))
    .filter((row) => !!row.member);

  return (
    <Panel>
      <Head icon={Users} title={section.title || 'Office Leadership'} />
      {resolved.length === 0 && <EmptyLine>No leadership listed yet.</EmptyLine>}
      <ul className="grid grid-cols-1 px-2 pb-2 sm:px-3 sm:pb-3">
        {resolved.map(({ item, member }) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
          >
            <span
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: item.accentColor ?? pick(AVATAR_COLORS, item.id) }}
            >
              {initials(member!.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-gray-900">
                {member!.name}
              </span>
              <span className="block truncate text-xs text-gray-500">
                {member!.jobTitle ?? (member!.role === 'manager' ? 'Manager' : 'Leader')}
              </span>
            </span>
            {item.showContactInfo !== false && member!.phone && (
              <a
                href={telHref(member!.phone)}
                aria-label={`Call ${member!.name}`}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
              >
                <Phone size={14} strokeWidth={1.9} />
              </a>
            )}
            {item.showMessageButton !== false && member!.email && (
              <a
                href={`mailto:${member!.email}`}
                aria-label={`Email ${member!.name}`}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
              >
                <Mail size={14} strokeWidth={1.9} />
              </a>
            )}
            {item.showScheduleButton && item.scheduleLink && (
              <Action
                href={item.scheduleLink}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
              >
                <CalendarDays size={14} strokeWidth={1.9} />
              </Action>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Shared by the live and the curated vendor lists. */
function VendorRow({
  name,
  meta,
  logoUrl,
  accentColor,
  seed,
  href,
}: {
  name: string;
  meta?: string | null;
  logoUrl?: string | null;
  accentColor?: string;
  seed: string;
  href: string | null;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-9 w-9 flex-none rounded-full object-cover" />
      ) : (
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: accentColor ?? pick(AVATAR_COLORS, seed) }}
        >
          {initials(name)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold leading-snug text-gray-900">{name}</span>
        {meta && <span className="block truncate text-xs text-gray-500">{meta}</span>}
      </span>
      {href && (
        <Action
          href={href}
          className="flex flex-none items-center gap-0.5 text-[11px] font-semibold text-teal-600 hover:text-teal-700"
        >
          Contact
          <ArrowRight size={12} strokeWidth={2.2} />
        </Action>
      )}
    </li>
  );
}

/**
 * Vendors publish on form approval (KAN-99), not through this page's publish
 * step, so Active vendors win whenever there are any. The hand-curated
 * `vendor-carousel` items are the fallback for a workspace with none.
 */
function Vendors({ section, data }: { section: OfficePageSection; data: OfficeRenderData }) {
  const live = data.activeVendors ?? [];
  const curated = activeItems<VendorItem>(section);
  const title = section.title || 'Preferred Vendors';

  if (live.length === 0 && curated.length === 0) {
    return (
      <Panel>
        <Head icon={Handshake} title={title} />
        <EmptyLine>No vendors yet.</EmptyLine>
      </Panel>
    );
  }

  return (
    <Panel>
      <Head icon={Handshake} title={title} action="View all" />
      <ul className="grid grid-cols-1 px-2 pb-2 sm:px-3 sm:pb-3">
        {live.length > 0
          ? live.map((v) => (
              <VendorRow
                key={v.id}
                seed={v.id}
                name={v.companyName}
                meta={[v.contactFirstName, v.contactLastName].filter(Boolean).join(' ') || null}
                logoUrl={v.logoUrl}
                href={v.contactEmail ? `mailto:${v.contactEmail}` : v.companyWebsite}
              />
            ))
          : curated.map((v) => (
              <VendorRow
                key={v.id}
                seed={v.id}
                name={v.name}
                meta={v.category}
                logoUrl={v.logoUrl}
                accentColor={v.accentColor}
                href={
                  actionHref(v.action) ??
                  (v.contactEmail ? `mailto:${v.contactEmail}` : (v.website ?? null))
                }
              />
            ))}
      </ul>
    </Panel>
  );
}

function Contacts({ section, data }: { section: OfficePageSection; data: OfficeRenderData }) {
  const items = activeItems<SupportCardItem>(section);
  const directory = data.directory ?? {};

  return (
    <Panel className="overflow-hidden">
      <div className="relative h-24 bg-gradient-to-br from-teal-600 to-teal-800">
        <div
          className="absolute inset-0 flex items-center justify-end pr-3 text-white/15"
          aria-hidden
        >
          <LifeBuoy size={88} />
        </div>
        <div className="relative flex h-full flex-col justify-end p-4">
          <p className="text-sm font-bold text-white">Need help?</p>
          <p className="text-xs text-white/80">{section.title || 'Office Contacts'}</p>
        </div>
      </div>
      {items.length === 0 && <EmptyLine>No contacts yet.</EmptyLine>}
      <ul className="grid grid-cols-1 px-2 py-2 sm:px-3 sm:py-3">
        {items.map((item) => {
          const member = item.assignedMembershipId
            ? directory[item.assignedMembershipId]
            : undefined;
          const href =
            actionHref(item.action) ??
            (member?.email
              ? `mailto:${member.email}`
              : member?.phone
                ? telHref(member.phone)
                : null);
          const sub = item.description || member?.name || null;
          return (
            <li key={item.id}>
              <Action
                href={href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50"
              >
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ backgroundColor: item.accentColor ?? TEAL }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">
                    {item.title}
                  </span>
                  {sub && <span className="block truncate text-xs text-gray-400">{sub}</span>}
                </span>
                {href && (
                  <ArrowRight size={13} className="flex-none text-gray-300" strokeWidth={2.2} />
                )}
              </Action>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Footer({ data }: { data: OfficeRenderData }) {
  const footer = data.footer;
  const b = data.brokerage;
  const cells: {
    icon: ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: ReactNode;
  }[] = [];

  if (footer?.officeHours)
    cells.push({ icon: Clock, label: 'Office Hours', value: footer.officeHours });

  // The footer's own copies override the workspace record.
  const website = footer?.website || b?.website?.replace(/^https?:\/\//, '') || null;
  const websiteUrl = footer?.websiteUrl || b?.website || null;
  if (website)
    cells.push({
      icon: Globe,
      label: 'Company Website',
      value: websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-teal-700"
        >
          {website}
        </a>
      ) : (
        website
      ),
    });

  if (footer?.helpLabel)
    cells.push({
      icon: LifeBuoy,
      label: 'Need Help?',
      value: footer.helpHref ? (
        <a href={footer.helpHref} className="hover:text-teal-700">
          {footer.helpLabel}
        </a>
      ) : (
        footer.helpLabel
      ),
    });

  const phone = footer?.phone || b?.phone || null;
  if (phone)
    cells.push({
      icon: Phone,
      label: 'Office Phone',
      value: (
        <a href={telHref(phone)} className="hover:text-teal-700">
          {phone}
        </a>
      ),
    });

  if (cells.length === 0) return null;

  return (
    <footer className="grid grid-cols-2 gap-6 border-t border-gray-200 pt-6 sm:grid-cols-4">
      {cells.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400">
              <Icon size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {c.label}
              </p>
              <p className="truncate text-xs text-gray-700">{c.value}</p>
            </div>
          </div>
        );
      })}
    </footer>
  );
}

/* ------------------------------------------------------------------ layout */

/** Is this quick-links section meant for the "Useful Shortcuts" text-link list? */
function isShortcuts(section: OfficePageSection): boolean {
  const k = section.key.toLowerCase();
  const t = section.title.toLowerCase();
  return k.includes('shortcut') || t.includes('shortcut');
}

/** Render one section with its designed, type-specific card style. */
export function SectionBlock({
  section,
  data,
}: {
  section: OfficePageSection;
  data: OfficeRenderData;
}) {
  switch (section.type) {
    case 'hero-cards':
      return <HeroBanner section={section} data={data} />;
    case 'brokerage-info':
      return <Brokerage section={section} data={data} />;
    case 'announcements':
      return <Announcements section={section} />;
    case 'quick-links':
      return isShortcuts(section) ? (
        <Shortcuts section={section} />
      ) : (
        <QuickTools section={section} />
      );
    case 'resources':
      return <ImportantResources section={section} />;
    case 'vendor-carousel':
      return <Vendors section={section} data={data} />;
    case 'events':
      return <Events section={section} data={data} />;
    case 'support-cards':
      return <Contacts section={section} data={data} />;
    case 'leadership':
      return <Leadership section={section} data={data} />;
    default:
      return null;
  }
}

/**
 * The parts of the page that are not sections, rendered by the read view and the
 * builder canvas alike. A workspace can delete its `vendor-carousel` section
 * while approved vendors keep publishing, so those vendors fall back to here.
 */
export function OfficePageChrome({
  content,
  data,
}: {
  content: OfficePageContent;
  data: OfficeRenderData;
}) {
  const hasVendorSection = content.sections.some((s) => s.type === 'vendor-carousel' && s.visible);
  const orphanVendors = hasVendorSection ? [] : (data.activeVendors ?? []);

  return (
    <>
      {orphanVendors.length > 0 && (
        <Panel>
          <Head icon={Handshake} title="Preferred Vendors" />
          <ul className="grid grid-cols-1 px-2 pb-2 sm:px-3 sm:pb-3">
            {orphanVendors.map((v) => (
              <VendorRow
                key={v.id}
                seed={v.id}
                name={v.companyName}
                meta={[v.contactFirstName, v.contactLastName].filter(Boolean).join(' ') || null}
                logoUrl={v.logoUrl}
                href={v.contactEmail ? `mailto:${v.contactEmail}` : v.companyWebsite}
              />
            ))}
          </ul>
        </Panel>
      )}
      <Footer data={data} />
    </>
  );
}

export default function OfficePageView({
  content,
  brokerage = null,
  directory = {},
  activeVendors = [],
}: {
  content: OfficePageContent;
  brokerage?: OfficeBrokerage | null;
  directory?: OfficeDirectory;
  activeVendors?: AgentOfficeVendor[];
}) {
  const data: OfficeRenderData = {
    branding: content.branding,
    footer: content.footer,
    brokerage,
    directory,
    activeVendors,
  };

  const visible = [...content.sections].filter((s) => s.visible).sort((a, b) => a.order - b.order);

  if (visible.length === 0 && activeVendors.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white px-6 py-12 text-center text-sm text-gray-400">
        This office page has no visible sections yet.
      </div>
    );
  }

  const rows = groupSectionsIntoRows(visible);

  return (
    <>
      <TemplateStyles />
      <div className="space-y-6">
        {rows.map((row) => (
          <SectionRow
            key={row.rowId}
            sections={row.sections}
            rowLayout={content.rowLayouts?.[row.rowId]}
          >
            {(section) => <SectionBlock section={section} data={data} />}
          </SectionRow>
        ))}
        <OfficePageChrome content={content} data={data} />
      </div>
    </>
  );
}
