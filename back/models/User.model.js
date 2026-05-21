const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    passwordHistory: { type: [String], default: [] },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    nickname: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    nicknameKey: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Disponible",
    },
    avatarUrl: { type: String, default: "" },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
