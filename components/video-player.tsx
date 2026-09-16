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
      ) => { destroy: () => void };
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: {
      Player: new (
        el: HTMLElement,
        opts: { id: string }
      ) => { on: (event: string, cb: () => void) => void; destroy: () => Promise<void> };
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

  // Embed case: load the provider SDK and wire its ended event. Guards
  // against the effect outliving its own embed — without `cancelled` and a
  // teardown, switching from one embedded video to another while this
  // component stays mounted (e.g. no `key` on the parent) would construct a
  // second player on top of the first's iframe, which is exactly what made
  // the canvas slow to show and sometimes need a second click to render.
  // Callers should still key this component by contentId so a genuine item
  // change gets a fresh <div> too — this teardown is the belt to that
  // suspenders, not a replacement for it.
  useEffect(() => {
    if (!isVideoEmbedConfig(config)) return;
    const el = embedRef.current;
    if (!el) return;

    let cancelled = false;
    let player: { destroy: () => void | Promise<void> } | null = null;
    let readyCallback: (() => void) | null = null;

    if (config.provider === 'youtube') {
      // `window.YT` itself exists as a stub the moment the script starts
      // executing, before `YT.Player` is actually a constructor — treating
      // the object's mere presence as "ready" raced the API's own async init
      // and threw ("YT.Player is not a constructor"), which is what made the
      // canvas need a second click: the first attempt silently crashed, and
      // by the second attempt the API had actually finished loading.
      const youTubeReady = () => typeof window.YT?.Player === 'function';
      loadScriptOnce('https://www.youtube.com/iframe_api', youTubeReady).then(() => {
        if (cancelled) return;
        const create = () => {
          if (!youTubeReady() || cancelled) return;
          player = new window.YT!.Player(el, {
            videoId: config.embedId,
            events: {
              onStateChange: (e) => {
                if (window.YT && e.data === window.YT.PlayerState.ENDED) handleEnded();
              },
            },
          });
        };
        if (youTubeReady()) {
          create();
        } else {
          readyCallback = create;
          window.onYouTubeIframeAPIReady = create;
        }
      });
    } else {
      loadScriptOnce('https://player.vimeo.com/api/player.js', () => !!window.Vimeo).then(() => {
        if (cancelled) return;
        if (!window.Vimeo) {
          setError('Could not load this video. Please try again.');
          return;
        }
        const p = new window.Vimeo.Player(el, { id: config.embedId });
        p.on('ended', handleEnded);
        player = p;
      });
    }

    return () => {
      cancelled = true;
      // Only clear the global callback if it's still ours to clear — a
      // later mount may have already claimed it for its own video.
      if (readyCallback && window.onYouTubeIframeAPIReady === readyCallback) {
        window.onYouTubeIframeAPIReady = undefined;
      }
      player?.destroy();
    };
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
