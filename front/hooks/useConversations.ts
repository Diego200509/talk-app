"use client";

import { useCallback } from "react";
import { uploadDocument, uploadImage, uploadVoice } from "@/lib/api/upload";
import {
  readAudioDuration,
  validateAudioFile,
  validateDocumentFile,
  validateImageFile,
} from "@/lib/media-validation";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import type { SendMessagePayload } from "@/types/chat";

type Params = {
  token: string | null;
  conversationId: string | null;
  blockedByMe?: boolean;
  onError?: (message: string) => void;
};

export function useConversations({
  token,
  conversationId,
  blockedByMe = false,
  onError,
}: Params) {
  const emitMessage = useCallback(
    (payload: SendMessagePayload) => {
      if (!token || !conversationId || blockedByMe) return;
      getSocket(token).emit(SOCKET_EVENTS.MESSAGE_SEND, {
        conversationId,
        ...payload,
      });
    },
    [token, conversationId, blockedByMe]
  );

  const sendText = useCallback(
    (content: string) => {
      const clean = content.trim();
      if (!clean) return;
      emitMessage({ type: "text", content: clean });
    },
    [emitMessage]
  );

  const sendImage = useCallback(
    async (file: File, caption?: string) => {
      try {
        validateImageFile(file);
        const uploaded = await uploadImage(file);
        emitMessage({
          type: "image",
          content: caption?.trim() || "",
          imageUrl: uploaded.url,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
        });
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "No se pudo enviar la imagen");
      }
    },
    [emitMessage, onError]
  );

  const sendDocument = useCallback(
    async (file: File) => {
      try {
        validateDocumentFile(file);
        const uploaded = await uploadDocument(file);
        emitMessage({
          type: "document",
          content: uploaded.fileName,
          documentUrl: uploaded.url,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
        });
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "No se pudo enviar el documento");
      }
    },
    [emitMessage, onError]
  );

  const sendVoice = useCallback(
    async (file: File, durationSeconds?: number | null) => {
      try {
        validateAudioFile(file);
        const duration =
          durationSeconds ?? (await readAudioDuration(file));
        const uploaded = await uploadVoice(file);
        emitMessage({
          type: "voice",
          content: "Nota de voz",
          voiceUrl: uploaded.url,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          durationSeconds: duration ?? undefined,
        });
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "No se pudo enviar la nota de voz");
      }
    },
    [emitMessage, onError]
  );

  return {
    sendText,
    sendImage,
    sendDocument,
    sendVoice,
  };
}
