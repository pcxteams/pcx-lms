import Link from 'next/link';
import {
  Award,
  BookOpen,
  Briefcase,
  Calculator,
  ClipboardList,
  Compass,
  Database,
  FileText,
  GraduationCap,
  Handshake,
  Home,
  Layers,
  Lightbulb,
  MapPin,
  Phone,
  Scale,
  Shield,
  Star,
  Target,
  TrendingUp,
  User,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { MyTopic } from '@/lib/career-builder';

/** Matches pcx-admin's TOPIC_ICONS allowlist (pcx-api-v2's types/content.ts) — keep in sync. */
const TOPIC_ICON_BY_VALUE: Record<string, LucideIcon> = {
  user: User,
  users: Users,
  home: Home,
  'map-pin': MapPin,
  database: Database,
  'file-text': FileText,
  zap: Zap,
  'trending-up': TrendingUp,
  lightbulb: Lightbulb,
  target: Target,
  'clipboard-list': ClipboardList,
  scale: Scale,
  layers: Layers,
  'book-open': BookOpen,
  video: Video,
  briefcase: Briefcase,
  shield: Shield,
  star: Star,
  award: Award,
  compass: Compass,
  'graduation-cap': GraduationCap,
  'phone-call': Phone,
  handshake: Handshake,
  calculator: Calculator,
};

function topicPct(topic: MyTopic): number {
  if (topic.totalSteps === 0) return 0;
  return Math.round((topic.completedSteps / topic.totalSteps) * 100);
}

function progressLabel(pct: number): string {
  if (pct === 0) return 'Start learning';
  if (pct >= 100) return 'Review';
  return 'Continue learning';
}

/**
 * Real Career Builder Topic completion, not a fixed "Buyer/Seller
 * certification" pair — our data model is an arbitrary set of Topics, so one
 * card is rendered per topic the agent actually has content in. Shared by
 * Home and Learn (both link into Learn, scoped to that topic).
 */
export function SkillsDevelopment({
  topics,
  title = 'Skills development',
}: {
  topics: MyTopic[];
  title?: string;
}) {
  if (topics.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-[11px] font-semibold tracking-[0.09em] text-gray-500 uppercase">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => {
          const pct = topicPct(topic);
          const Icon = (topic.icon && TOPIC_ICON_BY_VALUE[topic.icon]) || GraduationCap;
          return (
            <div key={topic.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{topic.title}</h3>
                    {topic.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{topic.description}</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-gray-500">{pct}%</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
              </div>
              <Link
                href={`/learn?topic=${topic.id}`}
                className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                {progressLabel(pct)} &rarr;
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
