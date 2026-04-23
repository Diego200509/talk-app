const express = require("express");
const { requireAuth } = require("../middleware/requireAuth.middleware");
const conversationController = require("../controllers/conversation.controller");

const router = express.Router();

router.post("/direct", requireAuth, conversationController.getOrCreateDirect);
router.get("/:id/messages", requireAuth, conversationController.listMessages);

module.exports = router;
