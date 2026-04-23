const crypto = require("crypto");

function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function generateRawResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = { hashResetToken, generateRawResetToken };
