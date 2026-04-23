const mongoose = require("mongoose");

const revokedSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

revokedSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.RevokedJwt || mongoose.model("RevokedJwt", revokedSchema);
