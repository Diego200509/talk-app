export type MediaAccessErrorCode =
  | "insecure_context"
  | "not_supported"
  | "permission_denied"
  | "device_not_found"
  | "device_busy"
  | "unknown";

export class MediaAccessError extends Error {
  code: MediaAccessErrorCode;

  constructor(code: MediaAccessErrorCode, message: string) {
    super(message);
    this.name = "MediaAccessError";
    this.code = code;
  }
}

function mapMediaError(err: unknown): MediaAccessError {
  if (err instanceof MediaAccessError) return err;

  const domErr = err as DOMException | undefined;
  const name = domErr?.name ?? "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return new MediaAccessError(
      "permission_denied",
      "Permite el acceso a cámara y micrófono en el navegador."
    );
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return new MediaAccessError(
      "device_not_found",
      "No se encontró cámara o micrófono en este dispositivo."
    );
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return new MediaAccessError(
      "device_busy",
      "La cámara o el micrófono están en uso por otra aplicación."
    );
  }

  return new MediaAccessError("unknown", "No se pudo acceder a cámara o micrófono.");
}

/** WebRTC exige contexto seguro (HTTPS o localhost). */
export function assertSecureMediaContext() {
  if (typeof window === "undefined") return;

  if (window.isSecureContext) return;

  const { hostname, protocol } = window.location;
  const isLanHttp =
    protocol === "http:" &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname !== "[::1]";

  if (isLanHttp) {
    throw new MediaAccessError(
      "insecure_context",
      "Las videollamadas desde otro dispositivo requieren HTTPS. En front ejecuta npm run dev:https y abre la URL https:// que muestra la consola."
    );
  }

  throw new MediaAccessError(
    "insecure_context",
    "Las videollamadas requieren una conexión segura (HTTPS)."
  );
}

export async function getCallMediaStream(): Promise<MediaStream> {
  assertSecureMediaContext();

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MediaAccessError(
      "not_supported",
      "Este navegador no soporta videollamadas."
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    throw mapMediaError(err);
  }
}
