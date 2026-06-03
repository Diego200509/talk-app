"use client";

import { useCallback, useRef, useState } from "react";
import { getCallMediaStream, MediaAccessError } from "@/lib/media-access";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/socket-events";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export type CallStatus =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "active"
  | "ended"
  | "busy"
  | "unavailable";

type Params = {
  token: string | null;
  currentUserId: string | undefined;
  onError?: (msg: string) => void;
};

function attachStreamToVideo(el: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!el || !stream) return;
  if (el.srcObject !== stream) {
    el.srcObject = stream;
  }
  void el.play().catch(() => undefined);
}

export function useCall({ token, currentUserId, onError }: Params) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);

  const localVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoElRef.current = el;
    attachStreamToVideo(el, localStreamRef.current);
  }, []);

  const remoteVideoRef = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoElRef.current = el;
    attachStreamToVideo(el, remoteStreamRef.current);
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    if (localVideoElRef.current) localVideoElRef.current.srcObject = null;
    if (remoteVideoElRef.current) remoteVideoElRef.current.srcObject = null;
    setRemoteUserId(null);
    setConversationId(null);
    setStatus("idle");
  }, []);

  const bindRemoteStream = useCallback((stream: MediaStream) => {
    remoteStreamRef.current = stream;
    attachStreamToVideo(remoteVideoElRef.current, stream);
  }, []);

  const createPeer = useCallback(
    (targetUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.ontrack = (event) => {
        const stream =
          event.streams[0] ?? new MediaStream([event.track]);
        bindRemoteStream(stream);
      };
      pc.onicecandidate = (event) => {
        if (!event.candidate || !token) return;
        getSocket(token).emit(SOCKET_EVENTS.CALL_ICE_CANDIDATE, {
          targetUserId,
          candidate: event.candidate.toJSON(),
        });
      };
      pcRef.current = pc;
      return pc;
    },
    [token, bindRemoteStream]
  );

  const flushCandidates = useCallback(async (pc: RTCPeerConnection) => {
    for (const c of pendingCandidatesRef.current) {
      await pc.addIceCandidate(c);
    }
    pendingCandidatesRef.current = [];
  }, []);

  const startCall = useCallback(
    async (convId: string, targetUserId: string) => {
      if (!token || status !== "idle") return;
      try {
        setStatus("calling");
        setRemoteUserId(targetUserId);
        setConversationId(convId);

        const stream = await getCallMediaStream();
        localStreamRef.current = stream;
        attachStreamToVideo(localVideoElRef.current, stream);

        const pc = createPeer(targetUserId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        getSocket(token).emit(SOCKET_EVENTS.CALL_OFFER, {
          conversationId: convId,
          targetUserId,
          offer: pc.localDescription,
        });
      } catch (err) {
        cleanup();
        onError?.(err instanceof MediaAccessError ? err.message : "No se pudo iniciar la llamada");
      }
    },
    [token, status, createPeer, cleanup, onError]
  );

  const acceptCall = useCallback(
    async (fromUserId: string, convId: string, offer: RTCSessionDescriptionInit) => {
      if (!token) return;
      try {
        setStatus("connecting");
        setRemoteUserId(fromUserId);
        setConversationId(convId);

        const stream = await getCallMediaStream();
        localStreamRef.current = stream;
        attachStreamToVideo(localVideoElRef.current, stream);

        const pc = createPeer(fromUserId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        await pc.setRemoteDescription(offer);
        await flushCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        getSocket(token).emit(SOCKET_EVENTS.CALL_ANSWER, {
          conversationId: convId,
          targetUserId: fromUserId,
          answer: pc.localDescription,
        });
        setStatus("active");
      } catch (err) {
        cleanup();
        onError?.(err instanceof MediaAccessError ? err.message : "No se pudo aceptar la llamada");
      }
    },
    [token, createPeer, flushCandidates, cleanup, onError]
  );

  const handleAccepted = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(answer);
      await flushCandidates(pc);
      setStatus("active");
    },
    [flushCandidates]
  );

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    await pc.addIceCandidate(candidate);
  }, []);

  const rejectCall = useCallback(() => {
    if (!token || !remoteUserId) {
      cleanup();
      return;
    }
    getSocket(token).emit(SOCKET_EVENTS.CALL_REJECTED, {
      targetUserId: remoteUserId,
      conversationId,
    });
    setStatus("ended");
    cleanup();
  }, [token, remoteUserId, conversationId, cleanup]);

  const endCall = useCallback(() => {
    if (token && remoteUserId) {
      getSocket(token).emit(SOCKET_EVENTS.CALL_ENDED, { targetUserId: remoteUserId });
    }
    setStatus("ended");
    cleanup();
  }, [token, remoteUserId, cleanup]);

  const toggleMic = useCallback((enabled: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  const toggleCamera = useCallback((enabled: boolean) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  const registerIncoming = useCallback((fromUserId: string, convId: string) => {
    setRemoteUserId(fromUserId);
    setConversationId(convId);
    setStatus("incoming");
  }, []);

  return {
    status,
    setStatus,
    remoteUserId,
    conversationId,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    handleAccepted,
    addIceCandidate,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
    registerIncoming,
    cleanup,
    currentUserId,
  };
}
