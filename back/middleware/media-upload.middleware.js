const fs = require("fs");
const path = require("path");
const multer = require("multer");

const messagesRoot = path.join(__dirname, "..", "uploads", "messages");
const imageDir = path.join(messagesRoot, "images");
const documentDir = path.join(messagesRoot, "documents");
const audioDir = path.join(messagesRoot, "audio");

for (const dir of [imageDir, documentDir, audioDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

function createStorage(destination) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
}

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const DOCUMENT_MIMES = new Set(["application/pdf"]);
const AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
]);

function normalizeMimeType(mime) {
  return (mime || "").split(";")[0].trim().toLowerCase();
}

function isAllowedAudioUpload(file) {
  const base = normalizeMimeType(file.mimetype);
  if (AUDIO_MIMES.has(base)) return true;
  const ext = path.extname(file.originalname || "").toLowerCase();
  const allowedExt = [".webm", ".ogg", ".mp3", ".mp4", ".m4a", ".wav"];
  if (base.startsWith("audio/") && allowedExt.includes(ext)) return true;
  if (!base && allowedExt.includes(ext)) return true;
  return false;
}

function fileFilter(allowed, label) {
  return (_req, file, cb) => {
    const base = normalizeMimeType(file.mimetype);
    if (!allowed.has(base) && !allowed.has(file.mimetype)) {
      cb(new Error(`Tipo no permitido. Solo ${label}.`));
      return;
    }
    cb(null, true);
  };
}

function audioFileFilter(_req, file, cb) {
  if (isAllowedAudioUpload(file)) {
    cb(null, true);
    return;
  }
  cb(new Error("Tipo no permitido. Solo audio (WEBM, OGG, MP3, MP4, WAV)."));
}

const imageUpload = multer({
  storage: createStorage(imageDir),
  fileFilter: fileFilter(IMAGE_MIMES, "imágenes (JPEG, PNG, GIF, WEBP)"),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const documentUpload = multer({
  storage: createStorage(documentDir),
  fileFilter: fileFilter(DOCUMENT_MIMES, "PDF"),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const audioUpload = multer({
  storage: createStorage(audioDir),
  fileFilter: audioFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

function handleUploadError(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "El archivo supera el tamaño máximo permitido" });
    }
    return res.status(400).json({ message: err.message });
  }
  return res.status(400).json({ message: err.message || "Error al subir archivo" });
}

module.exports = {
  imageUpload,
  documentUpload,
  audioUpload,
  handleUploadError,
  UPLOAD_PATHS: {
    image: "/uploads/messages/images",
    document: "/uploads/messages/documents",
    audio: "/uploads/messages/audio",
  },
};
