/**
 * Career Builder client types + the onboarding survey's option lists. Mirrors
 * pcx-api-v2-new's src/career-builder/* — keep in sync.
 */

export interface MyAgentContext {
  workspaceId: string;
  workspaceName: string;
  membershipId: string;
  onboardingType: string | null;
  focusCategories: string[];
}

export interface RankedContentFactor {
  category: string;
  tag: string;
  categoryWeightPct: number;
  tagScore: number;
  contribution: number;
}

export interface RankedContentItem {
  id: string;
  title: string;
  type: string;
  category: string | null;
  priority: string;
  assignmentStatus: string;
  score: number;
  factors: RankedContentFactor[];
  /** LLM-generated "why" text. Undefined when generation failed — fall back to explainRanking(). */
  explanation?: string;
}

/** Suggested-answer sets exactly as confirmed by product 2026-08-28/29. */
export const EXPERIENCE_LENGTH_OPTIONS = [
  'Brand New',
  '<1 Year',
  '1-2 years',
  '3-9 years',
  '10+ years',
] as const;

export const TRANSACTIONS_CLOSED_OPTIONS = ['0', '1-5', '6-12', '13-24', '25-50', '50+'] as const;

export const TOP_PRIORITY_OPTIONS = [
  'Get my first client',
  'Generate more leads',
  'Convert more leads',
  'Improve buyer skills',
  'Improve listing skills',
  'Build a team or leverage',
] as const;

export const HELP_AREA_OPTIONS = [
  'Lead generation',
  'Follow-up & conversion',
  'Buyers',
  'Listings',
  'Contracts',
  'MLS',
  'CRM & technology',
  'Business planning',
  'Time management & productivity',
  'Mindset & confidence',
] as const;

export const MAX_HELP_AREAS = 3;

/**
 * The real "why" text now comes from the API (CareerBuilderExplanationService,
 * Claude Haiku 4.5) via `item.explanation`. Use this helper rather than
 * reading `item.explanation` directly — it falls back to the deterministic
 * template below whenever generation failed for that item, so an LLM outage
 * degrades the copy, not the page.
 */
export function getExplanation(item: RankedContentItem): string {
  return item.explanation ?? explainRanking(item);
}

/**
 * The original template-based "why" text (from the artifact POC) — now the
 * fallback path only, used by getExplanation() when the API didn't supply a
 * real explanation for an item.
 */
export function explainRanking(item: RankedContentItem): string {
  const phrases: Record<string, (f: RankedContentFactor) => string | null> = {
    priority: (f) =>
      f.tag === 'critical'
        ? "it's marked Critical"
        : f.tag === 'very_important'
          ? "it's marked Very Important"
          : "it's marked Important",
    assignmentStatus: (f) =>
      f.tag === 'required' ? "it's Required" : f.tag === 'recommended' ? "it's Recommended" : null,
    topicMatch: (f) =>
      f.tagScore > 0 ? `it matches what you said you need help with (${f.tag})` : null,
    leaderAssigned: (f) => (f.tagScore > 0 ? 'your leader assigned it directly' : null),
    progressStickiness: (f) => (f.tagScore > 0 ? "you're already partway through it" : null),
    recency: (f) =>
      f.tag === 'overdue' ? "it's overdue" : f.tag === 'due_soon' ? "it's due soon" : null,
  };

  const ranked = item.factors
    .map((f) => ({ text: phrases[f.category]?.(f) ?? null, contribution: f.contribution }))
    .filter(
      (f): f is { text: string; contribution: number } => f.text !== null && f.contribution > 0
    )
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((f) => f.text);

  if (ranked.length === 0) return 'Recommended as your next step.';
  return `Recommended because ${ranked.join(' and ')}.`;
}
