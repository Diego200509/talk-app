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
      enum: ["direct"],
      default: "direct",
      required: true,
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

module.exports =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
