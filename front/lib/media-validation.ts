const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const PDF_MIMES = new Set(["application/pdf"]);
const AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/aac",
]);

export const MEDIA_LIMITS = {
  image: 5 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  audio: 8 * 1024 * 1024,
} as const;

export function normalizeMimeType(mime?: string | null): string {
  return (mime || "").split(";")[0].trim().toLowerCase();
}

const AUDIO_EXTENSIONS =
  /\.(webm|ogg|oga|opus|mp3|mp2|mp1|mp4|m4a|m4b|aac|wav|wave|flac|aiff|aif|wma|mid|midi|amr|3gp)$/i;

/** Acepta cualquier MIME `audio/*` o extensión de audio conocida. */
export function isAllowedAudioFile(file: File): boolean {
  const base = normalizeMimeType(file.type);
  if (base.startsWith("audio/")) return true;
  if (base && AUDIO_MIMES.has(base)) return true;
  if (AUDIO_EXTENSIONS.test(file.name)) return true;
  return false;
}

function assertSize(file: File, max: number, label: string) {
  if (file.size > max) {
    throw new Error(`El ${label} supera el tamaño máximo permitido (${Math.round(max / (1024 * 1024))} MB)`);
  }
}

export function validateImageFile(file: File) {
  if (!IMAGE_MIMES.has(file.type)) {
    throw new Error("Solo se permiten imágenes JPEG, PNG, GIF o WEBP");
  }
  assertSize(file, MEDIA_LIMITS.image, "archivo");
}

export function validateDocumentFile(file: File) {
  if (!PDF_MIMES.has(file.type)) {
    throw new Error("Solo se permiten documentos PDF");
  }
  assertSize(file, MEDIA_LIMITS.document, "documento");
}

export function validateAudioFile(file: File) {
  if (!isAllowedAudioFile(file)) {
    throw new Error("Formato de audio no permitido");
  }
  assertSize(file, MEDIA_LIMITS.audio, "audio");
}

export async function readAudioDuration(file: File): Promise<number | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 3000);

    function cleanup() {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
    }

    audio.addEventListener("loadedmetadata", () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : null;
      cleanup();
      resolve(duration);
    });
    audio.addEventListener("error", () => {
      cleanup();
      resolve(null);
    });
  });
}
