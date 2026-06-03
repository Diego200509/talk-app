const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "5001";

function envApiOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    `http://localhost:${DEFAULT_API_PORT}`
  );
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** Origen del backend (sin /api). En HTTPS dev apunta al backend en :5001 con el mismo protocolo. */
export function getApiOrigin(): string {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const scheme = protocol === "https:" ? "https" : "http";

    if (protocol === "https:") {
      if (isLocalHostname(hostname)) {
        return `${scheme}://localhost:${DEFAULT_API_PORT}`;
      }
      return `${scheme}://${hostname}:${DEFAULT_API_PORT}`;
    }

    if (!isLocalHostname(hostname)) {
      return `${scheme}://${hostname}:${DEFAULT_API_PORT}`;
    }
  }
  return envApiOrigin();
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api`;
}
