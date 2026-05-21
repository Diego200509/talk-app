const express = require("express");
const { requireAuth } = require("../middleware/requireAuth.middleware");
const { avatarUpload } = require("../middleware/upload.middleware");
const userController = require("../controllers/user.controller");
const blockController = require("../controllers/block.controller");

const router = express.Router();

router.post("/block", requireAuth, blockController.block);
router.post("/unblock", requireAuth, blockController.unblock);
router.get("/blocked", requireAuth, blockController.listBlocked);
router.get("/me", requireAuth, userController.me);
router.put("/profile", requireAuth, avatarUpload.single("avatar"), userController.updateMyProfile);
router.get("/search", requireAuth, userController.search);
router.get("/contacts", requireAuth, userController.contacts);
router.get("/directory", requireAuth, userController.directory);

module.exports = router;
