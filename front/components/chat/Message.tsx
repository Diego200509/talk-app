"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, MoreVertical, Pause, Play, Trash2, X } from "lucide-react";
import { LinkPreviewCard } from "@/components/chat/LinkPreviewCard";
import { MessageStatusChecks } from "@/components/chat/chat-shell.parts";
import { formatDuration, formatFileSize, resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { TALK_MENU_ITEM_DANGER, TALK_MENU_PANEL } from "@/components/chat/chat-shell.helpers";
import type { ChatMessage } from "@/types/chat";

function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de imagen"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-zinc-100 hover:bg-black/70"
        aria-label="Cerrar"
      >
        <X className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[min(96vw,900px)] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function VoicePlayer({
  src,
  durationSeconds,
  mine,
}: {
  src: string;
  durationSeconds?: number | null;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="flex min-w-[220px] max-w-full items-center gap-3">
      <button
        type="button"
        onClick={() => void togglePlay()}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition",
          mine
            ? "border-violet-200/30 bg-violet-500/30 hover:bg-violet-500/45"
            : "border-white/10 bg-white/[0.06] hover:bg-white/[0.1]"
        )}
        aria-label={playing ? "Pausar nota de voz" : "Reproducir nota de voz"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "h-1.5 overflow-hidden rounded-full",
            mine ? "bg-violet-900/50" : "bg-white/10"
          )}
        >
          <div
            className={cn("h-full rounded-full transition-all", mine ? "bg-violet-100" : "bg-violet-400")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] opacity-80">
          {formatDuration(current)} / {formatDuration(duration)}
        </p>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}

function MessageBody({
  message,
  deleted,
  mine,
}: {
  message: ChatMessage;
  deleted: boolean;
  mine: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const type = message.type || "text";

  if (deleted) {
    return (
      <p className="whitespace-pre-wrap break-words italic [overflow-wrap:anywhere]">
        Este mensaje fue eliminado
      </p>
    );
  }

  if (type === "linkPreview" || (type === "text" && message.linkPreview)) {
    const preview = message.linkPreview!;
    return (
      <>
        {message.content ? (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.content}
          </p>
        ) : null}
        <LinkPreviewCard preview={preview} mine={mine} />
      </>
    );
  }

  if (type === "image" && message.imageUrl) {
    const src = resolveMediaUrl(message.imageUrl);
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block max-w-full overflow-hidden rounded-xl border border-white/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={message.content || "Imagen enviada"}
            className="max-h-72 w-full max-w-sm object-cover transition hover:opacity-95"
          />
        </button>
        {message.content?.trim() ? (
          <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {message.content}
          </p>
        ) : null}
        <ImageLightbox
          src={src}
          alt={message.content || "Imagen enviada"}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </>
    );
  }

  if (type === "document" && message.documentUrl) {
    const href = resolveMediaUrl(message.documentUrl);
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        download={message.fileName || undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
          mine
            ? "border-violet-200/25 bg-violet-600/30 hover:bg-violet-600/45"
            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
        )}
      >
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
            mine ? "bg-violet-500/35" : "bg-white/[0.06]"
          )}
        >
          <FileText className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {message.fileName || "Documento.pdf"}
          </span>
          <span className="text-[11px] opacity-75">
            PDF{message.fileSize ? ` · ${formatFileSize(message.fileSize)}` : ""}
          </span>
        </span>
        <Download className="size-4 shrink-0 opacity-80" />
      </a>
    );
  }

  if (type === "voice" && message.voiceUrl) {
    return (
      <VoicePlayer
        src={resolveMediaUrl(message.voiceUrl)}
        durationSeconds={message.durationSeconds}
        mine={mine}
      />
    );
  }

  return (
    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
  );
}

export function Message({
  message,
  mine,
  currentUserId,
  otherUserId,
  senderName,
  isGroup,
  onDeleteForEveryone,
}: {
  message: ChatMessage;
  mine: boolean;
  currentUserId: string | undefined;
  otherUserId?: string;
  senderName?: string;
  isGroup?: boolean;
  onDeleteForEveryone?: (messageId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const deleted = Boolean(message.deletedForEveryone);
  const type = message.type || "text";

  if (type === "system" && message.systemText) {
    return (
      <div className="flex w-full justify-center px-2 py-1">
        <p className="max-w-md rounded-full bg-[var(--talk-hover)] px-3 py-1.5 text-center text-[11px] leading-snug text-[var(--talk-muted)]">
          {message.systemText}
        </p>
      </div>
    );
  }

  const isMedia = type !== "text" && type !== "linkPreview";

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-message-menu-root]")) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [menuOpen]);

  return (
    <div
      className={cn(
        "group relative max-w-[88%]",
        mine ? "self-end" : "self-start",
        menuOpen && "z-50",
        (isMedia || type === "linkPreview") && "max-w-[min(88%,420px)]"
      )}
    >
      {!mine && isGroup && senderName ? (
        <p className="mb-0.5 px-1 text-[11px] font-medium text-violet-600 dark:text-violet-300/90">{senderName}</p>
      ) : null}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl text-sm leading-relaxed shadow-sm",
          isMedia ? "px-2.5 py-2" : "px-3.5 py-2",
          mine
            ? "rounded-tr-md border border-violet-400/40 bg-[var(--talk-bubble-mine)] text-[var(--talk-bubble-mine-text)]"
            : "rounded-tl-md border border-[var(--talk-bubble-other-border)] bg-[var(--talk-bubble-other)] text-[var(--talk-bubble-other-text)]",
          deleted && "italic opacity-80"
        )}
      >
        <MessageBody message={message} deleted={deleted} mine={mine} />
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1",
            isMedia && "px-1",
            mine ? "text-violet-100/90" : "opacity-70"
          )}
        >
          <span className="text-[10px]">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {mine ? (
            <MessageStatusChecks
              message={message}
              currentUserId={currentUserId}
              otherUserId={otherUserId}
            />
          ) : null}
        </div>
      </div>
      {mine && !deleted && onDeleteForEveryone ? (
        <div
          data-message-menu-root
          className={cn(
            "absolute -left-9 top-2 z-20",
            "opacity-0 transition-opacity group-hover:opacity-100",
            menuOpen && "opacity-100"
          )}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
            aria-label="Opciones del mensaje"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="size-4" />
          </button>
          {menuOpen ? (
            <div role="menu" className={cn("absolute left-0 top-full z-[100] mt-2 w-48", TALK_MENU_PANEL)}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteForEveryone(message.id);
                }}
                className={TALK_MENU_ITEM_DANGER}
              >
                <Trash2 className="size-4 shrink-0" />
                Eliminar para todos
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { ImageLightbox, VoicePlayer };
