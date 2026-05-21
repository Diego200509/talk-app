"use client";

import { useCallback, useEffect, useState } from "react";
import { SOCKET_EVENTS } from "@/lib/socket-events";
import { getSocket } from "@/lib/socket";

export function useOnlineUsers(token: string | null) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const isOnline = useCallback(
    (userId: string | undefined | null) => {
      if (!userId) return false;
      return onlineUserIds.has(userId);
    },
    [onlineUserIds]
  );

  useEffect(() => {
    if (!token) {
      setOnlineUserIds(new Set());
      return;
    }
    const socket = getSocket(token);

    const onUsersOnline = (payload: { userIds?: string[] }) => {
      setOnlineUserIds(new Set(payload?.userIds || []));
    };

    socket.on(SOCKET_EVENTS.USERS_ONLINE, onUsersOnline);
    return () => {
      socket.off(SOCKET_EVENTS.USERS_ONLINE, onUsersOnline);
    };
  }, [token]);

  return { onlineUserIds, isOnline };
}
