"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Mic, MicOff, Paperclip, Send, Square } from "lucide-react";
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

function MediaRecorderControl({
  disabled,
  onRecorded,
}: {
  disabled: boolean;
  onRecorded: (file: File, durationSeconds: number | null) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  async function startRecording() {
    if (disabled || uploading || recording) return;
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
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      recorder.start();
      setRecording(true);
    } catch {
      /* permiso denegado o sin micrófono */
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
    if (blob.size === 0) return;

    const ext = normalizedMime.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `nota-de-voz-${Date.now()}.${ext}`, {
      type: normalizedMime,
    });

    setUploading(true);
    try {
      await onRecorded(file, durationSeconds);
    } finally {
      setUploading(false);
      chunksRef.current = [];
      mediaRecorderRef.current = null;
    }
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-rose-300">{formatDuration(elapsed)}</span>
        <button
          type="button"
          onClick={() => void stopRecording()}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
          aria-label="Detener grabación"
        >
          <Square className="size-4 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || uploading}
      onClick={() => void startRecording()}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200 disabled:opacity-50"
      aria-label="Grabar nota de voz"
    >
      {uploading ? <MicOff className="size-4 animate-pulse" /> : <Mic className="size-4" />}
    </button>
  );
}

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
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!clean || disabled || uploading) return;
    notifyTyping(false);
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    onSend(clean);
    setValue("");
  }

  async function handleImageChange(file: File | undefined) {
    if (!file || disabled || uploading) return;
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
    setUploading(true);
    try {
      await onSendDocument(file);
    } finally {
      setUploading(false);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  useEffect(() => {
    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-[52px] w-full flex-1 items-end gap-2 bg-[#14141c] p-2 md:min-h-[56px] md:p-2.5">
      <div className="flex min-h-[44px] w-full flex-1 items-end gap-2 rounded-2xl border border-white/10 bg-[#0B0B0F] px-2 py-1.5 ring-violet-500/20 focus-within:border-violet-500/40 focus-within:ring-1 md:px-3">
        <div className="mb-0.5 flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 text-zinc-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200 disabled:opacity-50"
            aria-label="Enviar imagen"
          >
            <ImageIcon className="size-4" />
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => documentInputRef.current?.click()}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 text-zinc-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200 disabled:opacity-50"
            aria-label="Enviar documento PDF"
          >
            <FileText className="size-4" />
          </button>
          <MediaRecorderControl
            disabled={disabled || uploading}
            onRecorded={onSendVoice}
          />
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

        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
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
        <button
          type="button"
          disabled={disabled || uploading || !value.trim()}
          onClick={submit}
          className={cn(
            "mb-0.5 inline-flex shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          )}
        >
          {uploading ? <Paperclip className="size-3.5 animate-pulse" /> : <Send className="size-3.5" />}
          Enviar
        </button>
      </div>
    </div>
  );
}

export { MediaRecorderControl };
