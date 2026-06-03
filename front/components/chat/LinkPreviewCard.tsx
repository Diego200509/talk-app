"use client";

import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { LinkPreview } from "@/types/chat";

export function LinkPreviewCard({
  preview,
  mine,
}: {
  preview: LinkPreview;
  mine?: boolean;
}) {
  const href = preview.url;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 block overflow-hidden rounded-xl border transition",
        mine
          ? "border-violet-200/25 bg-violet-600/25 hover:bg-violet-600/40"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      )}
    >
      {preview.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(preview.image) || preview.image}
          alt=""
          className="max-h-40 w-full object-cover"
        />
      ) : null}
      <div className="space-y-0.5 p-3">
        <p className="line-clamp-2 text-sm font-medium">{preview.title || preview.domain}</p>
        {preview.description ? (
          <p className="line-clamp-2 text-xs opacity-80">{preview.description}</p>
        ) : null}
        {preview.domain ? (
          <p className="text-[10px] uppercase tracking-wide opacity-60">{preview.domain}</p>
        ) : null}
      </div>
    </a>
  );
}
