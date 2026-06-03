const mongoose = require("mongoose");

const MESSAGE_TYPES = ["text", "image", "document", "voice", "system", "linkPreview"];

const linkPreviewSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, default: null },
    description: { type: String, default: null },
    image: { type: String, default: null },
    domain: { type: String, default: null },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: MESSAGE_TYPES,
      default: "text",
    },
    content: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    systemText: { type: String, trim: true, maxlength: 500, default: null },
    linkPreview: { type: linkPreviewSchema, default: null },
    imageUrl: { type: String, default: null },
    documentUrl: { type: String, default: null },
    voiceUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    mimeType: { type: String, default: null },
    fileSize: { type: Number, default: null },
    durationSeconds: { type: Number, default: null },
    deletedForEveryone: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deliveredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    blockedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);
