'use client';

import { FileText } from 'lucide-react';
import { apiClientGet } from '@/lib/api-client';
import type { Attachment, DownloadUrlResponse } from '@/lib/content';

function extLabel(fileName: string): string {
  const ext = fileName.split('.').pop();
  return ext && ext.length <= 5 ? ext.toUpperCase() : 'FILE';
}

export function Attachments({
  workspaceId,
  contentId,
  attachments,
}: {
  workspaceId: string;
  contentId: string;
  attachments: Attachment[];
}) {
  if (attachments.length === 0) return null;

  async function open(attachment: Attachment, index: number) {
    if (attachment.kind === 'link') {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
      return;
    }
    const res = await apiClientGet<DownloadUrlResponse>(
      `/workspaces/${workspaceId}/content/${contentId}/attachments/${index}/download-url`
    );
    if (res) window.open(res.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.09em] text-gray-500 uppercase">
          Attachments
        </h2>
        <span className="text-xs text-gray-400">{attachments.length}</span>
      </div>
      <div>
        {attachments.map((attachment, index) => {
          const label =
            attachment.kind === 'file' ? attachment.fileName : (attachment.label ?? attachment.url);
          const meta = attachment.kind === 'file' ? extLabel(attachment.fileName) : 'Link';
          return (
            <button
              key={index}
              onClick={() => void open(attachment, index)}
              className="flex w-full items-center gap-3 border-t border-gray-100 py-2.5 text-left first:border-t-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <FileText size={16} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                {label}
              </span>
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                {meta}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
