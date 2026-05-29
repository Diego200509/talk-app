"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Mic, Plus, Send, Square } from "lucide-react";
import { formatDuration } from "@/lib/media-url";
import { normalizeMimeType } from "@/lib/media-validation";
import { cn } from "@/lib/utils";

type Props = {
  disabled: boolean;
  onSend: (value: string) => void;
  onSendImage: (file: File) => Promise<void>;
  onSendDocument: (file: File) => Promise<void>;
  onSendVoice: (file: File, durationSeconds: number | null) => Promise<void>;
  onTypingChange?: (typing: boolean) => void;
};

export function MessageInput({
  disabled,
  onSend,
  onSendImage,
  onSendDocument,
  onSendVoice,
  onTypingChange,
}: Props) {
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const hasText = value.trim().length > 0;
  const showSend = hasText && !recording;

  function notifyTyping(typing: boolean) {
    onTypingChange?.(typing);
  }

  function handleChange(next: string) {
    setValue(next);
    if (disabled) return;
    if (next.trim()) {
      notifyTyping(true);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => notifyTyping(false), 1500);
    } else {
      notifyTyping(false);
    }
  }

  function submit() {
    const clean = value.trim();
    if (!clean || disabled || uploading || recording) return;
    notifyTyping(false);
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    onSend(clean);
    setValue("");
  }

  async function handleImageChange(file: File | undefined) {
    if (!file || disabled || uploading) return;
    setAttachOpen(false);
    setUploading(true);
    try {
      await onSendImage(file);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleDocumentChange(file: File | undefined) {
    if (!file || disabled || uploading) return;
    setAttachOpen(false);
    setUploading(true);
    try {
      await onSendDocument(file);
    } finally {
      setUploading(false);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  async function startRecording() {
    if (disabled || uploading || recording || hasText) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      const mimeType =
        preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      recorder.start();
      setRecording(true);
      setAttachOpen(false);
    } catch {
      /* permiso denegado */
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));

    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        resolve();
      };
      recorder.stop();
    });

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setElapsed(0);

    const normalizedMime = normalizeMimeType(recorder.mimeType) || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: normalizedMime });
    chunksRef.current = [];
    mediaRecorderRef.current = null;

    if (blob.size === 0) return;

    const ext = normalizedMime.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `nota-de-voz-${Date.now()}.${ext}`, { type: normalizedMime });

    setUploading(true);
    try {
      await onSendVoice(file, durationSeconds);
    } finally {
      setUploading(false);
    }
  }

  function handlePrimaryAction() {
    if (showSend) {
      submit();
      return;
    }
    if (recording) {
      void stopRecording();
      return;
    }
    void startRecording();
  }

  useEffect(() => {
    if (!attachOpen) return;
    function closeOnOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-attach-menu-root]")) {
        setAttachOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [attachOpen]);

  useEffect(() => {
    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current?.stop();
    };
  }, []);

  return (
    <div className="flex min-h-[52px] w-full flex-1 items-end gap-2 bg-[#14141c] p-2 md:min-h-[56px] md:p-2.5">
      <div className="flex min-h-[44px] w-full flex-1 items-end gap-2 rounded-2xl border border-white/10 bg-[#0B0B0F] px-2 py-1.5 ring-violet-500/20 focus-within:border-violet-500/40 focus-within:ring-1 md:px-3">
        {/* Menú adjuntos (+) */}
        <div className="relative mb-0.5 shrink-0" data-attach-menu-root>
          <button
            type="button"
            disabled={disabled || uploading || recording}
            onClick={() => setAttachOpen((v) => !v)}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition",
              "hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200",
              attachOpen && "border-violet-500/40 bg-violet-500/15 text-violet-200",
              "disabled:opacity-50"
            )}
            aria-label="Adjuntar archivo"
            aria-expanded={attachOpen}
          >
            <Plus className={cn("size-5 transition-transform", attachOpen && "rotate-45")} />
          </button>

          {attachOpen ? (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-44 rounded-xl border border-white/10 bg-[#1a1a24] p-1 shadow-xl">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-100 transition hover:bg-white/[0.06]"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                  <ImageIcon className="size-4" />
                </span>
                Foto
              </button>
              <button
                type="button"
                onClick={() => documentInputRef.current?.click()}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-100 transition hover:bg-white/[0.06]"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                  <FileText className="size-4" />
                </span>
                Documento
              </button>
            </div>
          ) : null}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => void handleImageChange(e.target.files?.[0])}
          />
          <input
            ref={documentInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void handleDocumentChange(e.target.files?.[0])}
          />
        </div>

        {/* Campo de texto o indicador de grabación */}
        {recording ? (
          <div className="flex min-h-[36px] flex-1 items-center gap-3 py-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
            </span>
            <span className="text-sm font-medium text-rose-200">{formatDuration(elapsed)}</span>
            <span className="text-xs text-zinc-500">Grabando nota de voz…</span>
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (hasText) submit();
              }
            }}
            rows={1}
            placeholder={
              disabled
                ? "No puedes enviar mensajes"
                : uploading
                  ? "Subiendo archivo…"
                  : "Escribe un mensaje…"
            }
            disabled={disabled || uploading}
            className="max-h-32 min-h-[36px] w-full resize-none bg-transparent py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-50"
            aria-label="Mensaje"
          />
        )}

        {/* Enviar texto / micrófono / detener grabación */}
        <button
          type="button"
          disabled={disabled || uploading || (!showSend && !recording && hasText)}
          onClick={handlePrimaryAction}
          className={cn(
            "mb-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full transition",
            recording
              ? "bg-rose-500/90 text-white hover:bg-rose-500"
              : "bg-violet-600 text-white hover:bg-violet-500",
            "disabled:opacity-50"
          )}
          aria-label={
            recording ? "Detener y enviar nota de voz" : showSend ? "Enviar mensaje" : "Grabar nota de voz"
          }
        >
          {uploading ? (
            <span className="size-4 animate-pulse rounded-full bg-white/80" />
          ) : recording ? (
            <Square className="size-4 fill-current" />
          ) : showSend ? (
            <Send className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
