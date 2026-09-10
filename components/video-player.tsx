'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClientGet, apiClientPost } from '@/lib/api-client';
import { isVideoEmbedConfig, type VideoConfig, type DownloadUrlResponse } from '@/lib/content';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          events: { onStateChange: (e: { data: number }) => void };
        }
      ) => unknown;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: {
      Player: new (
        el: HTMLElement,
        opts: { id: string }
      ) => { on: (event: string, cb: () => void) => void };
    };
  }
}

/** Loads a script once per page, resolving when it's already present or once it loads. */
function loadScriptOnce(src: string, isReady: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (isReady()) return resolve();
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

/**
 * Plays a Content item's video (private S3 upload or YouTube/Vimeo embed) and
 * reports completion via the `ended` signal — no watch-percentage tracking,
 * per the 2026-09 product decision. Fires the completion call at most once
 * per mount, guarded by `completedRef`; the API endpoint is idempotent too,
 * so a duplicate call would be harmless, but there's no reason to make one.
 */
export function VideoPlayer({
  workspaceId,
  contentId,
  config,
  onComplete,
}: {
  workspaceId: string;
  contentId: string;
  config: VideoConfig;
  /** Called once the completion call actually succeeds — not fired on failure. */
  onComplete?: () => void;
}) {
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  const handleEnded = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    void apiClientPost<{ completed: boolean }>(
      `/workspaces/${workspaceId}/content/${contentId}/complete`
    ).then((res) => {
      if (res) onComplete?.();
      else completedRef.current = false; // allow a retry on the next `ended` if the call failed
    });
  };

  // Upload case: fetch the presigned URL, then render a native <video>.
  useEffect(() => {
    if (isVideoEmbedConfig(config)) return;
    let cancelled = false;
    apiClientGet<DownloadUrlResponse>(
      `/workspaces/${workspaceId}/content/${contentId}/download-url`
    ).then((res) => {
      if (cancelled) return;
      if (!res) {
        setError('Could not load this video. Please try again.');
        return;
      }
      setUploadUrl(res.url);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, contentId, config]);

  // Embed case: load the provider SDK and wire its ended event.
  useEffect(() => {
    if (!isVideoEmbedConfig(config)) return;
    const el = embedRef.current;
    if (!el) return;

    if (config.provider === 'youtube') {
      loadScriptOnce('https://www.youtube.com/iframe_api', () => !!window.YT).then(() => {
        const create = () => {
          if (!window.YT) return;
          new window.YT.Player(el, {
            videoId: config.embedId,
            events: {
              onStateChange: (e) => {
                if (window.YT && e.data === window.YT.PlayerState.ENDED) handleEnded();
              },
            },
          });
        };
        if (window.YT) create();
        else window.onYouTubeIframeAPIReady = create;
      });
    } else {
      loadScriptOnce('https://player.vimeo.com/api/player.js', () => !!window.Vimeo).then(() => {
        if (!window.Vimeo) {
          setError('Could not load this video. Please try again.');
          return;
        }
        const player = new window.Vimeo.Player(el, { id: config.embedId });
        player.on('ended', handleEnded);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  if (error) {
    return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  }

  if (isVideoEmbedConfig(config)) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <div ref={embedRef} className="h-full w-full" />
      </div>
    );
  }

  if (!uploadUrl) {
    return <div className="aspect-video w-full animate-pulse rounded-xl bg-slate-200" />;
  }

  return (
    <video
      src={uploadUrl}
      controls
      className="aspect-video w-full rounded-xl bg-black"
      onEnded={handleEnded}
    />
  );
}
