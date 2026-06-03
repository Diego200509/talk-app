const express = require("express");
const { requireAuth } = require("../middleware/requireAuth.middleware");
const conversationController = require("../controllers/conversation.controller");

const router = express.Router();

router.post("/direct", requireAuth, conversationController.getOrCreateDirect);
router.post("/group", requireAuth, conversationController.createGroup);
router.get("/:id/messages", requireAuth, conversationController.listMessages);
router.get("/:id", requireAuth, conversationController.getConversation);
router.patch("/:id/group", requireAuth, conversationController.updateGroup);
router.post("/:id/members", requireAuth, conversationController.addMembers);
router.delete("/:id/members/:userId", requireAuth, conversationController.removeMember);
router.post("/:id/leave", requireAuth, conversationController.leaveGroup);
router.post("/:id/admins/:userId", requireAuth, conversationController.makeAdmin);
router.delete("/:id/admins/:userId", requireAuth, conversationController.removeAdmin);
router.post("/:id/mute", requireAuth, conversationController.mute);
router.post("/:id/unmute", requireAuth, conversationController.unmute);

module.exports = router;
