const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads", "avatars");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const imageOnly = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Solo se permiten imágenes"));
    return;
  }
  cb(null, true);
};

const avatarUpload = multer({
  storage,
  fileFilter: imageOnly,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = { avatarUpload };
