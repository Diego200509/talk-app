"use client";

import { useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import type { CallStatus } from "@/hooks/useCall";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<CallStatus, string> = {
  idle: "",
  calling: "Llamando…",
  incoming: "Llamada entrante",
  connecting: "Conectando…",
  active: "En llamada",
  ended: "Llamada finalizada",
  busy: "Usuario ocupado",
  unavailable: "Usuario no disponible",
};

export function CallModal({
  open,
  status,
  localVideoRef,
  remoteVideoRef,
  onHangup,
  onToggleMic,
  onToggleCamera,
}: {
  open: boolean;
  status: CallStatus;
  localVideoRef: (el: HTMLVideoElement | null) => void;
  remoteVideoRef: (el: HTMLVideoElement | null) => void;
  onHangup: () => void;
  onToggleMic: (enabled: boolean) => void;
  onToggleCamera: (enabled: boolean) => void;
}) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  if (!open || status === "idle") return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#121217] shadow-2xl">
        <p className="absolute left-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1 text-xs text-zinc-200">
          {STATUS_LABEL[status]}
        </p>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={false}
          className="aspect-video max-h-[60vh] w-full bg-black object-cover"
          onLoadedMetadata={(e) => {
            void e.currentTarget.play().catch(() => undefined);
          }}
        />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-20 right-4 z-10 h-28 w-40 rounded-xl border border-white/20 object-cover shadow-lg"
          onLoadedMetadata={(e) => {
            void e.currentTarget.play().catch(() => undefined);
          }}
        />
        <div className="flex items-center justify-center gap-4 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() => {
              const next = !micOn;
              setMicOn(next);
              onToggleMic(next);
            }}
            className={cn(
              "inline-flex size-12 items-center justify-center rounded-full border",
              micOn ? "border-white/20 bg-white/10" : "border-rose-500/40 bg-rose-500/20"
            )}
          >
            {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button
            type="button"
            onClick={onHangup}
            className="inline-flex size-14 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-500"
          >
            <PhoneOff className="size-6" />
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !camOn;
              setCamOn(next);
              onToggleCamera(next);
            }}
            className={cn(
              "inline-flex size-12 items-center justify-center rounded-full border",
              camOn ? "border-white/20 bg-white/10" : "border-rose-500/40 bg-rose-500/20"
            )}
          >
            {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function IncomingCallModal({
  open,
  onAccept,
  onReject,
}: {
  open: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a24] p-6 text-center shadow-xl">
        <p className="text-lg font-semibold text-zinc-100">Llamada entrante</p>
        <p className="mt-1 text-sm text-zinc-400">Videollamada de TalkApp</p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={onReject}
            className="rounded-full bg-rose-600 px-6 py-2.5 text-sm font-medium text-white"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

export function VideoCallButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-violet-200 disabled:opacity-50"
      aria-label="Videollamada"
    >
      <Video className="size-4" />
    </button>
  );
}
