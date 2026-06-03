import { io, type Socket } from "socket.io-client";
import { getApiOrigin } from "@/lib/api-origin";

let socketInstance: Socket | null = null;
let socketOrigin: string | null = null;

export function getSocket(token: string) {
  const origin = getApiOrigin();

  if (socketInstance && socketOrigin !== origin) {
    socketInstance.disconnect();
    socketInstance.removeAllListeners();
    socketInstance = null;
  }

  if (!socketInstance) {
    socketOrigin = origin;
    socketInstance = io(origin, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }

  socketInstance.auth = { token: `Bearer ${token}` };
  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance.removeAllListeners();
    socketInstance = null;
    socketOrigin = null;
  }
}
