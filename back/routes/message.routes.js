const express = require("express");
const { requireAuth } = require("../middleware/requireAuth.middleware");
const messageController = require("../controllers/message.controller");

const router = express.Router();

router.delete("/:id", requireAuth, messageController.deleteMessage);

module.exports = router;
