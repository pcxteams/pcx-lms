import type { ComponentType, ReactNode } from 'react';
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Globe,
  LifeBuoy,
  Link2,
  Mail,
  Phone,
  Users,
} from 'lucide-react';
import { iconFor, type IconComponent } from './office-icons';
import type {
  AnnouncementItem,
  EventItem,
  HeroCardItem,
  LeadershipItem,
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
 * Agent-facing render of a published Office Page. Ported verbatim from
 * pcx-admin's OfficePageView.tsx (the same component that backs the admin's
 * read view and the builder's live Preview toggle there) — presentational
 * only, no hooks, and deliberately has no editing affordances built in, so
 * there is nothing to strip out for the agent side.
 *
 * Layout is driven by the same responsive row/column system as the builder:
 * sections are folded into rows by `layout.rowId` and sized by `layout.span`
 * (via `groupSectionsIntoRows` / `SectionRow`), so a layout built in the
 * admin renders identically here. Each section then gets a designed,
 * type-specific card style:
 *
 *   hero-cards      → hero banner
 *   announcements   → "Office Announcements" tag cards
 *   quick-links     → icon tiles  (a section keyed/titled as shortcuts renders as
 *                     a "Useful Shortcuts" text-link list instead)
 *   resources       → "Important Resources" grid
 *   vendor-carousel → "Preferred Vendors" list
 *   events          → "Upcoming Events" list with date badges
 *   support-cards   → "Office Contacts" list
 *   leadership      → membership-referenced roster (generic labels until a live
 *                     membership join is added)
 *
 * Page-level chrome (hero brand label, footer) reads the optional
 * `content.branding` / `content.footer` fields and always spans full width.
 */

/* ------------------------------------------------------------------ helpers */

const AVATAR_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#0d9488', // teal
  '#db2777', // pink
  '#ea580c', // orange
  '#4f46e5', // indigo
  '#0891b2', // cyan
];

const DOT_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0d9488'];

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

function actionHref(action: OfficePageAction): string | null {
  const dest = action.destination?.trim();
  if (!dest) return null;
  if (action.type === 'email') return dest.startsWith('mailto:') ? dest : `mailto:${dest}`;
  if (action.type === 'phone')
    return dest.startsWith('tel:') ? dest : `tel:${dest.replace(/\s+/g, '')}`;
  return dest;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function resourceIcon(name?: string): IconComponent {
  return iconFor(name) ?? FileText;
}

/** Accent colour for an announcement category (matches the category tag hue). */
const CATEGORY_COLOR: Record<string, string> = {
  'new update': '#2563eb',
  resource: '#7c3aed',
  training: '#d97706',
  'office news': '#059669',
  'new resource': '#0d9488',
  policy: '#2563eb',
  recognition: '#059669',
};

function categoryColor(category?: string): string {
  return CATEGORY_COLOR[category?.toLowerCase().trim() ?? ''] ?? '#6b7280';
}

/** Sorted, active items for a section. */
function activeItems<T extends { active: boolean; order: number }>(
  section: OfficePageSection
): T[] {
  return [...(section.items as unknown as T[])]
    .filter((it) => it.active)
    .sort((a, b) => a.order - b.order);
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
  const cap = mon[0] + mon.slice(1).toLowerCase();
  return `${cap} ${d.getDate()}`;
}

/** Human "when" line from ISO start/end, falling back to the raw startsAt string. */
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

function SectionHeader({
  label,
  action,
}: {
  label: string;
  action?: { label: string; href?: string };
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</h2>
      {action && (
        <a
          href={action.href || '#'}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {action.label}
          <ChevronRight size={13} />
        </a>
      )}
    </div>
  );
}

function Avatar({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {text}
    </span>
  );
}

/* --------------------------------------------------------------- sections */

function HeroBanner({
  section,
  branding,
}: {
  section?: OfficePageSection;
  branding?: OfficePageContent['branding'];
}) {
  const hero = section ? activeItems<HeroCardItem>(section)[0] : undefined;
  const title = hero?.title ?? branding?.name ?? 'Office Access';
  const tagline = hero?.description ?? hero?.subtitle ?? branding?.tagline ?? '';
  const brandLabel = branding?.name ?? '';
  const words = title.split(/\s+/);

  return (
    <section className="flex items-stretch justify-between gap-6 rounded-2xl border border-gray-200 bg-white px-7 py-6">
      <div className="flex flex-col justify-center">
        <h1 className="text-2xl leading-tight tracking-tight text-gray-900">
          {words.map((w, i) => (
            <span
              key={i}
              className={i === words.length - 1 ? 'font-extrabold italic' : 'font-light'}
            >
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h1>
        {tagline && <p className="mt-1 text-sm text-gray-500">{tagline}</p>}
      </div>
      <div
        className="relative hidden w-64 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-gray-700 to-gray-950 sm:block"
        style={
          hero?.backgroundImageUrl
            ? {
                backgroundImage: `url(${hero.backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-black/30" />
        {brandLabel && (
          <div className="absolute inset-0 flex flex-col items-end justify-center pr-4 text-right">
            <span className="text-sm font-bold uppercase tracking-widest text-white">
              {brandLabel}
            </span>
          </div>
        )}
      </div>
    </section>
  );
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
  const key = category?.toLowerCase().trim() ?? '';
  return CATEGORY_TAG[key] ?? 'bg-gray-100 text-gray-500';
}

function Announcements({ section }: { section: OfficePageSection }) {
  const items = activeItems<AnnouncementItem>(section);
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader
        label={section.title || 'Office Announcements'}
        action={{ label: 'View All' }}
      />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(148px,1fr))]">
        {items.map((a) => {
          const Icon = iconFor(a.icon) ?? ClipboardList;
          return (
            <div
              key={a.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white p-3.5"
            >
              {a.category && (
                <span
                  className={`mb-2 inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tagClasses(
                    a.category
                  )}`}
                >
                  {a.category}
                </span>
              )}
              <Icon size={18} className="mb-1.5" style={{ color: categoryColor(a.category) }} />
              <p className="text-sm font-semibold leading-snug text-gray-900">{a.title}</p>
              {(a.date || a.description) && (
                <p className="mt-0.5 text-xs text-gray-400">{a.date || a.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuickTools({ section }: { section: OfficePageSection }) {
  const items = activeItems<QuickLinkItem>(section);
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader label={section.title || 'Quick Access Tools'} />
      <div className="flex flex-wrap gap-2">
        {items.map((t) => {
          const href = actionHref(t.action);
          const tint = t.accentColor ?? pick(AVATAR_COLORS, t.id);
          const Icon = iconFor(t.icon);
          const tile = (
            <>
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${tint}1a`, color: tint }}
              >
                {Icon ? (
                  <Icon size={24} />
                ) : (
                  <span className="text-2xl">{t.icon || t.title.slice(0, 1)}</span>
                )}
              </span>
              <span className="w-16 truncate text-center text-[11px] leading-tight text-gray-600">
                {t.title}
              </span>
            </>
          );
          return href ? (
            <a
              key={t.id}
              href={href}
              target={isExternal(href) ? '_blank' : undefined}
              rel={isExternal(href) ? 'noopener noreferrer' : undefined}
              className="flex w-16 flex-col items-center gap-1.5"
            >
              {tile}
            </a>
          ) : (
            <div key={t.id} className="flex w-16 flex-col items-center gap-1.5">
              {tile}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ImportantResources({ section }: { section: OfficePageSection }) {
  const items = activeItems<ResourceItem>(section);
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader label={section.title || 'Important Resources'} />
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {items.map((r) => {
          const Icon = resourceIcon(r.icon);
          const href = actionHref(r.action);
          const body = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{r.title}</span>
                {r.description && (
                  <span className="block truncate text-xs text-gray-400">{r.description}</span>
                )}
              </span>
            </>
          );
          const cls =
            'flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 transition-colors hover:border-gray-300';
          return href ? (
            <a
              key={r.id}
              href={href}
              target={isExternal(href) ? '_blank' : undefined}
              rel={isExternal(href) ? 'noopener noreferrer' : undefined}
              className={cls}
            >
              {body}
            </a>
          ) : (
            <div key={r.id} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
      <a
        href="#"
        className="mt-2.5 inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        View All Resources
        <ChevronRight size={13} />
      </a>
    </section>
  );
}

function Vendors({ section }: { section: OfficePageSection }) {
  const items = activeItems<VendorItem>(section);
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader label={section.title || 'Preferred Vendors'} action={{ label: 'View All' }} />
      <div className="rounded-xl border border-gray-200 bg-white">
        {items.map((v, i) => {
          const meta = [v.category, v.contactPhone].filter(Boolean).join(' · ');
          const href = v.action ? actionHref(v.action) : v.website || null;
          return (
            <div
              key={v.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <Avatar text={initials(v.name)} color={v.accentColor ?? pick(AVATAR_COLORS, v.id)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{v.name}</p>
                {meta && <p className="truncate text-xs text-gray-400">{meta}</p>}
              </div>
              {href && (
                <a
                  href={href}
                  target={isExternal(href) ? '_blank' : undefined}
                  rel={isExternal(href) ? 'noopener noreferrer' : undefined}
                  className="shrink-0 text-gray-300 hover:text-blue-600"
                  aria-label={`Open ${v.name}`}
                >
                  <Link2 size={15} />
                </a>
              )}
            </div>
          );
        })}
      </div>
      <a
        href="#"
        className="mt-2.5 inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        View All Vendors
        <ChevronRight size={13} />
      </a>
    </section>
  );
}

function Events({ section }: { section: OfficePageSection }) {
  const items = activeItems<EventItem>(section);
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader
        label={section.title || 'Upcoming Events'}
        action={{ label: 'View Calendar' }}
      />
      <div className="rounded-xl border border-gray-200 bg-white">
        {items.map((e, i) => {
          const badge = eventBadge(e.startsAt);
          return (
            <div
              key={e.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-900 leading-none text-white">
                {badge ? (
                  <>
                    <span className="text-[8px] font-semibold tracking-wide">{badge.mon}</span>
                    <span className="text-sm font-bold">{badge.day}</span>
                  </>
                ) : (
                  <Calendar size={16} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{e.title}</p>
                <p className="truncate text-xs text-gray-400">{eventWhen(e.startsAt, e.endsAt)}</p>
              </div>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: e.accentColor ?? pick(DOT_COLORS, e.id) }}
              />
            </div>
          );
        })}
      </div>
      <a
        href="#"
        className="mt-2.5 inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        View All Events
        <ChevronRight size={13} />
      </a>
    </section>
  );
}

function Contacts({ section }: { section: OfficePageSection }) {
  const items = activeItems<SupportCardItem>(section);
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader label={section.title || 'Office Contacts'} action={{ label: 'View All' }} />
      <div className="rounded-xl border border-gray-200 bg-white">
        {items.map((c, i) => {
          const isPhone = c.action?.type === 'phone';
          const phone = isPhone ? c.action?.destination : undefined;
          const href = c.action ? actionHref(c.action) : null;
          const RightIcon = isPhone ? Phone : Mail;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <Avatar text={initials(c.title)} color={c.accentColor ?? pick(AVATAR_COLORS, c.id)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{c.title}</p>
                {c.description && (
                  <p className="truncate text-[11px] text-gray-400">{c.description}</p>
                )}
                {phone && <p className="truncate text-[11px] text-gray-400">{phone}</p>}
              </div>
              {href && (
                <a
                  href={href}
                  className="shrink-0 text-gray-300 hover:text-blue-600"
                  aria-label={`Contact ${c.title}`}
                >
                  <RightIcon size={14} />
                </a>
              )}
            </div>
          );
        })}
      </div>
      <a
        href="#"
        className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        View All Contacts
      </a>
    </section>
  );
}

function Shortcuts({ section }: { section: OfficePageSection }) {
  const items = activeItems<QuickLinkItem>(section);
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader label={section.title || 'Useful Shortcuts'} />
      <div>
        {items.map((s, i) => {
          const href = actionHref(s.action) || '#';
          return (
            <a
              key={s.id}
              href={href}
              target={isExternal(href) ? '_blank' : undefined}
              rel={isExternal(href) ? 'noopener noreferrer' : undefined}
              className={`flex items-center justify-between py-2 text-sm text-gray-700 hover:text-blue-600 ${
                i > 0 ? 'border-t border-gray-100' : ''
              }`}
            >
              {s.title}
              <ChevronRight size={14} className="text-gray-300" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

function Footer({ footer }: { footer?: OfficePageContent['footer'] }) {
  if (!footer) return null;
  const cells: {
    icon: ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: ReactNode;
  }[] = [];
  if (footer.officeHours)
    cells.push({ icon: Clock, label: 'Office Hours', value: footer.officeHours });
  if (footer.website)
    cells.push({
      icon: Globe,
      label: 'Company Website',
      value: footer.websiteUrl ? (
        <a
          href={footer.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600"
        >
          {footer.website}
        </a>
      ) : (
        footer.website
      ),
    });
  if (footer.helpLabel)
    cells.push({
      icon: LifeBuoy,
      label: 'Need Help?',
      value: footer.helpHref ? (
        <a href={footer.helpHref} className="hover:text-blue-600">
          {footer.helpLabel}
        </a>
      ) : (
        footer.helpLabel
      ),
    });
  if (footer.phone) cells.push({ icon: Phone, label: 'Office Phone', value: footer.phone });
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

function Leadership({ section }: { section: OfficePageSection }) {
  const items = activeItems<LeadershipItem>(section);
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader label={section.title || 'Leadership'} />
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {items.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: l.accentColor ?? pick(AVATAR_COLORS, l.id) }}
            >
              <Users size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">Team member</p>
              <p className="truncate text-[11px] text-gray-400">Office leadership</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** A live, DB-backed Vendor — distinct from the admin's hand-curated `vendor-carousel` items. */
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

/**
 * Office → Vendors. Always renders when there are active vendors, independent
 * of the admin's `sections` array — this is separate from the hand-curated
 * `vendor-carousel` section type rendered by `Vendors()` above, which stays
 * untouched. A Free Team's `activeVendors` already resolves to its Parent
 * Office's vendors server-side.
 */
function LiveVendors({ vendors }: { vendors: AgentOfficeVendor[] }) {
  if (vendors.length === 0) return null;
  return (
    <section>
      <SectionHeader label="Preferred Vendors" />
      <div className="rounded-xl border border-gray-200 bg-white">
        {vendors.map((v, i) => {
          const contactName = [v.contactFirstName, v.contactLastName].filter(Boolean).join(' ');
          const meta = [contactName, v.contactPhone].filter(Boolean).join(' · ');
          return (
            <div
              key={v.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              {v.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.logoUrl}
                  alt={v.companyName}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <Avatar text={initials(v.companyName)} color={pick(AVATAR_COLORS, v.id)} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{v.companyName}</p>
                {meta && <p className="truncate text-xs text-gray-400">{meta}</p>}
              </div>
              {v.companyWebsite && (
                <a
                  href={v.companyWebsite}
                  target={isExternal(v.companyWebsite) ? '_blank' : undefined}
                  rel={isExternal(v.companyWebsite) ? 'noopener noreferrer' : undefined}
                  className="shrink-0 text-gray-300 hover:text-blue-600"
                  aria-label={`Open ${v.companyName}`}
                >
                  <Link2 size={15} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Is this quick-links section meant for the "Useful Shortcuts" text-link list? */
function isShortcuts(section: OfficePageSection): boolean {
  const k = section.key.toLowerCase();
  const t = section.title.toLowerCase();
  return k.includes('shortcut') || t.includes('shortcut');
}

/** Render one section with its designed, type-specific card style. */
export function SectionBlock({
  section,
  branding,
}: {
  section: OfficePageSection;
  branding?: OfficePageContent['branding'];
}) {
  switch (section.type) {
    case 'hero-cards':
      return <HeroBanner section={section} branding={branding} />;
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
      return <Vendors section={section} />;
    case 'events':
      return <Events section={section} />;
    case 'support-cards':
      return <Contacts section={section} />;
    case 'leadership':
      return <Leadership section={section} />;
    default:
      return null;
  }
}

export default function OfficePageView({
  content,
  activeVendors = [],
}: {
  content: OfficePageContent;
  activeVendors?: AgentOfficeVendor[];
}) {
  const visible = [...content.sections].filter((s) => s.visible).sort((a, b) => a.order - b.order);

  if (visible.length === 0 && activeVendors.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white px-6 py-12 text-center text-sm text-gray-400">
        This office page has no visible sections yet.
      </div>
    );
  }

  // Fold sections into rows exactly like the admin builder, so its row/column
  // layout drives this output. Footer/branding stay full-width page chrome.
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
            {(section) => <SectionBlock section={section} branding={content.branding} />}
          </SectionRow>
        ))}
        <LiveVendors vendors={activeVendors} />
        <Footer footer={content.footer} />
      </div>
    </>
  );
}
