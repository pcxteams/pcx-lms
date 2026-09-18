/**
 * Office Page content shapes — MIRROR of
 * `pcx-api-v2/src/office-page/types/office-page-content.ts` and
 * `pcx-admin/src/lib/office-page-content.ts`. Keep all three in sync.
 */

export const OFFICE_PAGE_SECTION_TYPES = [
  'hero-cards',
  'vendor-carousel',
  'quick-links',
  'announcements',
  'resources',
  'events',
  'leadership',
  'support-cards',
] as const;
export type OfficePageSectionType = (typeof OFFICE_PAGE_SECTION_TYPES)[number];

export const OFFICE_PAGE_LOCK_STATES = ['editable', 'locked_by_pcx', 'view_only'] as const;
export type SectionLockState = (typeof OFFICE_PAGE_LOCK_STATES)[number];

export type LinkOpenBehavior = 'same_tab' | 'new_tab' | 'popup';

export type OfficePageActionType =
  | 'url'
  | 'internal_page'
  | 'document'
  | 'folder'
  | 'form'
  | 'video'
  | 'google_drive'
  | 'dropbox'
  | 'pdf'
  | 'spreadsheet'
  | 'popup'
  | 'email'
  | 'phone'
  | 'message'
  | 'schedule';

export interface OfficePageAction {
  type: OfficePageActionType;
  label?: string;
  destination?: string;
  openBehavior?: LinkOpenBehavior;
  popupCardId?: string;
}

export type FileRefType =
  | 'url'
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'slides'
  | 'image'
  | 'video'
  | 'form'
  | 'internal_page'
  | 'internal_file'
  | 'google_drive'
  | 'dropbox'
  | 'scheduling'
  | 'folder';

export interface FileRef {
  id: string;
  type: FileRefType;
  title?: string;
  destination?: string;
  openBehavior?: LinkOpenBehavior;
  visible?: boolean;
}

export interface OfficePageItemBase {
  id: string;
  order: number;
  active: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroCardItem extends OfficePageItemBase {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  buttonText?: string;
  primaryAction?: OfficePageAction;
  secondaryAction?: OfficePageAction;
}

export interface VendorItem extends OfficePageItemBase {
  name: string;
  category?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  accentColor?: string;
  tags?: string[];
  featured?: boolean;
  rating?: number;
  action?: OfficePageAction;
}

export interface QuickLinkItem extends OfficePageItemBase {
  title: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  action: OfficePageAction;
}

export interface AnnouncementItem extends OfficePageItemBase {
  title: string;
  description?: string;
  date?: string;
  category?: string;
  imageUrl?: string;
  icon?: string;
  action?: OfficePageAction;
  expiresAt?: string;
  pinned?: boolean;
}

export interface ResourceItem extends OfficePageItemBase {
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  accentColor?: string;
  action: OfficePageAction;
}

export interface EventItem extends OfficePageItemBase {
  title: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  description?: string;
  registrationLink?: string;
  category?: string;
  accentColor?: string;
  pinned?: boolean;
}

export interface LeadershipItem extends OfficePageItemBase {
  workspaceMembershipId: string;
  accentColor?: string;
  showMessageButton?: boolean;
  showScheduleButton?: boolean;
  showProfileButton?: boolean;
  showContactInfo?: boolean;
  scheduleLink?: string;
}

export interface SupportCardItem extends OfficePageItemBase {
  title: string;
  description?: string;
  icon?: string;
  assignedMembershipId?: string;
  accentColor?: string;
  buttonText?: string;
  action?: OfficePageAction;
}

export type OfficePageItem =
  | HeroCardItem
  | VendorItem
  | QuickLinkItem
  | AnnouncementItem
  | ResourceItem
  | EventItem
  | LeadershipItem
  | SupportCardItem;

export interface PopupCardItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  links?: OfficePageAction[];
  files?: FileRef[];
  email?: string;
  phone?: string;
  ctaText?: string;
  ctaAction?: OfficePageAction;
  notes?: string;
}

export interface SectionLayout {
  rowId: string;
  span: number;
  minWidth?: number;
}

export interface OfficePageSection {
  key: string;
  type: OfficePageSectionType;
  title: string;
  subtitle?: string;
  order: number;
  visible: boolean;
  lockState: SectionLockState;
  displayLimit?: number;
  layout?: SectionLayout;
  items: OfficePageItem[];
}

/**
 * Arrangement of a multi-section row.
 *  - `columns`     — sections side by side, widths from each section's `span` (default)
 *  - `right-span`  — all but the last section stack in the left column; the last
 *                    section is one column spanning their full height (a right rail)
 *  - `left-span`   — mirror of right-span (first section spans the left column)
 *  - `top-span`    — first section spans full width on top; the rest share a row below
 *  - `bottom-span` — the rest share a row on top; the last spans full width below
 * Span templates need ≥ 3 sections; with 2 they behave like `columns`.
 */
export type RowTemplate = 'columns' | 'left-span' | 'right-span' | 'top-span' | 'bottom-span';

export interface RowLayout {
  align?: 'start' | 'center' | 'stretch' | 'end';
  gap?: 'sm' | 'md' | 'lg';
  stackBelow?: 'sm' | 'md' | 'lg';
  /** Row arrangement; absent/`columns` = the classic side-by-side split. */
  template?: RowTemplate;
}

/** Page-level footer bar shown at the bottom of the rendered office page. */
export interface OfficePageFooter {
  officeHours?: string;
  /** Display text for the company website (e.g. `www.example.com`). */
  website?: string;
  /** Absolute href the website label links to. */
  websiteUrl?: string;
  helpLabel?: string;
  helpHref?: string;
  phone?: string;
}

/** Hero/brand labelling for the top of the rendered office page. */
export interface OfficePageBranding {
  name?: string;
  tagline?: string;
}

export interface OfficePageContent {
  sections: OfficePageSection[];
  popupCards?: PopupCardItem[];
  rowLayouts?: Record<string, RowLayout>;
  /** Optional page-level chrome consumed by the render view (not the builder). */
  footer?: OfficePageFooter;
  branding?: OfficePageBranding;
}

export interface WorkspaceAccess {
  workspaceId: string;
  platformRole: string | null;
  membershipRole: 'manager' | 'leader' | 'agent' | null;
  visibilityScope: 'workspace' | 'assigned_agents' | null;
  canView: boolean;
  canEdit: boolean;
  canPublish: boolean;
}

/**
 * API response for the agent/read view (`GET /workspaces/:id/office-page/published`).
 * `content` is null until the page has been published (never exposes drafts).
 */
export interface OfficePagePublishedResponse {
  workspaceId: string;
  /** The workspace that owns the published content. For a Free Team this is its
   * Parent Office and differs from `workspaceId` (content is inherited). */
  owningWorkspaceId: string;
  /** Display name of the owning Parent Office; null unless inherited. */
  owningWorkspaceName: string | null;
  pageStatus: 'draft' | 'published' | 'archived' | null;
  content: OfficePageContent | null;
  access: WorkspaceAccess;
}
