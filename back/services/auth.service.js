const bcrypt = require("bcryptjs");
const User = require("../models/User.model");
const RevokedJwt = require("../models/RevokedJwt.model");
const PasswordResetToken = require("../models/PasswordResetToken.model");
const { signAccessToken } = require("../utils/jwt.util");
const { hashResetToken, generateRawResetToken } = require("../utils/token-hash.util");
const { sendPasswordResetEmail } = require("./mail.service");
const { normalizeNickname } = require("./user.service");

const BCRYPT_ROUNDS = 12;
const RESET_TTL_MS = 60 * 60 * 1000;
const MAX_PASSWORD_HISTORY = 10;

async function isPasswordReused(user, plainPassword) {
  const sameAsCurrent = await bcrypt.compare(plainPassword, user.passwordHash);
  if (sameAsCurrent) return true;
  const hist = Array.isArray(user.passwordHistory) ? user.passwordHistory : [];
  for (const oldHash of hist) {
    if (await bcrypt.compare(plainPassword, oldHash)) return true;
  }
  return false;
}

async function register({ email, password, name }) {
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName || trimmedName.length < 2) {
    const err = new Error("El nombre es obligatorio");
    err.code = "INVALID_NAME";
    throw err;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("Ese correo ya está registrado");
    err.code = "EMAIL_IN_USE";
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const nickname = await generateUniqueNickname(trimmedName);
  const user = await User.create({
    email,
    passwordHash,
    name: trimmedName,
    nickname,
    nicknameKey: normalizeNickname(nickname),
    status: "Disponible",
  });
  const { token } = signAccessToken({ sub: user._id.toString(), email: user.email });
  return { token, user: toPublicUser(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error("Credenciales incorrectas");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Credenciales incorrectas");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }
  const { token } = signAccessToken({ sub: user._id.toString(), email: user.email });
  return { token, user: toPublicUser(user) };
}

async function logout(decoded) {
  const jti = decoded.jti;
  if (!jti) return;
  const expMs = typeof decoded.exp === "number" ? decoded.exp * 1000 : Date.now() + 60000;
  await RevokedJwt.updateOne(
    { jti },
    { $set: { jti, expiresAt: new Date(expMs) } },
    { upsert: true }
  );
}

async function assertTokenNotRevoked(jti) {
  if (!jti) return;
  const revoked = await RevokedJwt.findOne({ jti }).lean();
  if (revoked) {
    const err = new Error("Sesión cerrada");
    err.code = "TOKEN_REVOKED";
    throw err;
  }
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return { sent: false };

  await PasswordResetToken.deleteMany({ userId: user._id });

  const raw = generateRawResetToken();
  const tokenHash = hashResetToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await PasswordResetToken.create({ userId: user._id, tokenHash, expiresAt });

  const base = process.env.CLIENT_URL || "http://localhost:3000";
  const resetUrl = `${base.replace(/\/$/, "")}/restablecer?token=${raw}`;

  await sendPasswordResetEmail(user.email, resetUrl);
  return { sent: true };
}

async function resetPasswordWithToken(rawToken, newPassword) {
  const tokenHash = hashResetToken(rawToken);
  const record = await PasswordResetToken.findOne({ tokenHash });
  if (!record || record.expiresAt < new Date()) {
    const err = new Error("Enlace inválido o expirado");
    err.code = "INVALID_RESET_TOKEN";
    throw err;
  }
  const user = await User.findById(record.userId);
  if (!user) {
    const err = new Error("Enlace inválido o expirado");
    err.code = "INVALID_RESET_TOKEN";
    throw err;
  }

  if (await isPasswordReused(user, newPassword)) {
    const err = new Error(
      "No puedes reutilizar tu contraseña actual ni una que hayas usado antes."
    );
    err.code = "PASSWORD_REUSED";
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const history = [user.passwordHash, ...(user.passwordHistory || [])].slice(0, MAX_PASSWORD_HISTORY);

  await User.updateOne(
    { _id: user._id },
    { $set: { passwordHash: newHash, passwordHistory: history } }
  );
  await PasswordResetToken.deleteMany({ userId: record.userId });
  return { ok: true };
}

function toPublicUser(userDoc) {
  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name || "",
    nickname: userDoc.nickname || "",
    status: userDoc.status || "Disponible",
    avatarUrl: userDoc.avatarUrl || "",
  };
}

async function generateUniqueNickname(source) {
  const baseRaw = String(source || "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 24) || "Usuario";
  let candidate = baseRaw;
  let counter = 1;
  while (await User.exists({ nicknameKey: normalizeNickname(candidate) })) {
    counter += 1;
    candidate = `${baseRaw}_${counter}`.slice(0, 30);
  }
  return candidate;
}

module.exports = {
  register,
  login,
  logout,
  assertTokenNotRevoked,
  requestPasswordReset,
  resetPasswordWithToken,
};
