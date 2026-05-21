"use client";

import { useCallback, useEffect, useState } from "react";
import {
  blockUserRequest,
  getBlockedUsersRequest,
  unblockUserRequest,
} from "@/lib/api/users";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { getSocket } from "@/lib/socket";
import type { ChatUser } from "@/types/chat";

export function useBlocked(token: string | null) {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setBlockedIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const users = await getBlockedUsersRequest();
      setBlockedIds(new Set(users.map((u) => u.id)));
    } catch {
      setBlockedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const onBlocked = (payload: { userId?: string }) => {
      if (payload?.userId) {
        setBlockedIds((prev) => new Set([...prev, payload.userId!]));
      } else {
        void refresh();
      }
    };

    const onUnblocked = (payload: { userId?: string }) => {
      if (payload?.userId) {
        setBlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(payload.userId!);
          return next;
        });
      } else {
        void refresh();
      }
    };

    socket.on(SOCKET_EVENTS.USER_BLOCKED, onBlocked);
    socket.on(SOCKET_EVENTS.USER_UNBLOCKED, onUnblocked);
    return () => {
      socket.off(SOCKET_EVENTS.USER_BLOCKED, onBlocked);
      socket.off(SOCKET_EVENTS.USER_UNBLOCKED, onUnblocked);
    };
  }, [token, refresh]);

  const blockUser = useCallback(async (targetUserId: string) => {
    await blockUserRequest(targetUserId);
    setBlockedIds((prev) => new Set([...prev, targetUserId]));
  }, []);

  const unblockUser = useCallback(async (targetUserId: string) => {
    await unblockUserRequest(targetUserId);
    setBlockedIds((prev) => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
  }, []);

  const isBlockedByMe = useCallback(
    (userId: string | undefined | null) => {
      if (!userId) return false;
      return blockedIds.has(userId);
    },
    [blockedIds]
  );

  return {
    blockedIds,
    loading,
    isBlockedByMe,
    blockUser,
    unblockUser,
    refresh,
  };
}
