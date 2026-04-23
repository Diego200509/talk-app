const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no configurado");
  return secret;
}

function signAccessToken(payload) {
  const jti = crypto.randomUUID();
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const token = jwt.sign(payload, getSecret(), { expiresIn, jwtid: jti });
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signAccessToken, verifyAccessToken };
