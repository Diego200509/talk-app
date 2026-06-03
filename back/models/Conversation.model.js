const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      required: true,
    },
    name: { type: String, trim: true, maxlength: 120, default: null },
    description: { type: String, trim: true, maxlength: 500, default: null },
    avatarUrl: { type: String, default: null },
    adminIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, type: 1 });
conversationSchema.index({ type: 1, lastMessageAt: -1 });

module.exports =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
