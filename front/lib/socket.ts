import { io, type Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

function socketUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:5001";
}

export function getSocket(token: string) {
  if (!socketInstance) {
    socketInstance = io(socketUrl(), {
      transports: ["websocket"],
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
  }
}
