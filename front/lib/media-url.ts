import { getApiOrigin } from "@/lib/api-origin";

function rewriteBackendMediaUrl(url: URL): string | null {
  if (!url.pathname.startsWith("/uploads/")) return null;
  const isLocalBackend =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(url.hostname);
  if (!isLocalBackend) return null;
  return `${getApiOrigin()}${url.pathname}`;
}

export function resolveMediaUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("blob:") || path.startsWith("data:")) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const rewritten = rewriteBackendMediaUrl(new URL(path));
      if (rewritten) return rewritten;
    } catch {
      /* usar URL original */
    }
    return path;
  }
  const origin = getApiOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
