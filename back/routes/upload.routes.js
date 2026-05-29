const express = require("express");
const { requireAuth } = require("../middleware/requireAuth.middleware");
const {
  imageUpload,
  documentUpload,
  audioUpload,
  handleUploadError,
  UPLOAD_PATHS,
} = require("../middleware/media-upload.middleware");

const router = express.Router();

function respondUpload(req, res, basePath) {
  if (!req.file) {
    return res.status(400).json({ message: "No se recibió ningún archivo" });
  }
  return res.json({
    url: `${basePath}/${req.file.filename}`,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
  });
}

function withUpload(multerMiddleware, basePath) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) return handleUploadError(err, req, res, next);
      return respondUpload(req, res, basePath);
    });
  };
}

router.post("/image", requireAuth, withUpload(imageUpload.single("file"), UPLOAD_PATHS.image));
router.post(
  "/document",
  requireAuth,
  withUpload(documentUpload.single("file"), UPLOAD_PATHS.document)
);
router.post("/audio", requireAuth, withUpload(audioUpload.single("file"), UPLOAD_PATHS.audio));

module.exports = router;
