import type { ComponentType } from 'react';
import {
  BadgeDollarSign,
  BookOpenText,
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  Cloud,
  FileSignature,
  FileText,
  FolderOpen,
  GraduationCap,
  Megaphone,
  MessagesSquare,
  Repeat2,
  Search,
  ShieldCheck,
  Signature,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

/**
 * Named icons an admin can attach to a tool / announcement / resource via a
 * section item's `icon` field. Mirrors pcx-admin's office-icons.tsx so the
 * agent-facing render resolves the exact same names.
 */

export type IconComponent = ComponentType<{ size?: number; className?: string }>;

export const ICON_MAP: Record<string, IconComponent> = {
  // quick-access tools
  building: Building2,
  search: Search,
  'file-signature': FileSignature,
  signature: Signature,
  cloud: Cloud,
  megaphone: Megaphone,
  calendar: CalendarDays,
  sparkles: Sparkles,
  bot: Bot,
  // announcements
  clipboard: ClipboardList,
  dollar: BadgeDollarSign,
  message: MessagesSquare,
  graduation: GraduationCap,
  trophy: Trophy,
  folder: FolderOpen,
  // resources
  business: FileText,
  policies: BookOpenText,
  marketing: Megaphone,
  training: Repeat2,
  success: Users,
  hr: ShieldCheck,
  document: FileText,
  book: BookOpenText,
  users: Users,
  shield: ShieldCheck,
};

/** Resolve a named icon, or `undefined` if the name is empty/unknown (or a glyph). */
export function iconFor(name?: string): IconComponent | undefined {
  return name ? ICON_MAP[name] : undefined;
}
