/**
 * Content Manager (KAN-90) client types. Mirrors pcx-api-v2's
 * src/content/types/content.ts and content.service.ts's toSummary() shape —
 * keep in sync.
 */

export const VIDEO_EMBED_PROVIDERS = ['youtube', 'vimeo'] as const;
export type VideoEmbedProvider = (typeof VIDEO_EMBED_PROVIDERS)[number];

/** An uploaded file, stored privately in S3 and served via presigned GET. */
export interface VideoUploadConfig {
  source?: 'upload';
  fileKey: string;
  fileName: string;
  mimeType?: string;
  fileSizeBytes?: number;
}

/** A YouTube or Vimeo link, played in-app through a restricted embed player. */
export interface VideoEmbedConfig {
  source: 'embed';
  url: string;
  provider: VideoEmbedProvider;
  embedId: string;
}

/** Video is either a private S3 upload (default, back-compat) or a YouTube/Vimeo embed. */
export type VideoConfig = VideoUploadConfig | VideoEmbedConfig;

export function isVideoEmbedConfig(config: unknown): config is VideoEmbedConfig {
  return !!config && typeof config === 'object' && (config as VideoEmbedConfig).source === 'embed';
}

export interface ContentSummary {
  id: string;
  workspaceId: string | null;
  isMasterContent: boolean;
  isGlobal: boolean;
  type: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  estTime: string | null;
  config: VideoConfig | Record<string, unknown>;
  /** Whether the calling agent has completed this item — two states only, no in-progress. */
  completed: boolean;
}

export interface ContentListResponse {
  items: ContentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DownloadUrlResponse {
  url: string;
  fileName: string;
}
