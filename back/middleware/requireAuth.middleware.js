const User = require("../models/User.model");
const { verifyAccessToken } = require("../utils/jwt.util");
const { assertTokenNotRevoked } = require("../services/auth.service");

function bearerToken(req) {
  const h = req.headers.authorization || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token.trim();
}

async function requireAuth(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "No autorizado" });
    }
    const decoded = verifyAccessToken(token);
    await assertTokenNotRevoked(decoded.jti);
    const user = await User.findById(decoded.sub).lean();
    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }
    req.auth = decoded;
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name || "",
      nickname: user.nickname || "",
      status: user.status || "Disponible",
      avatarUrl: user.avatarUrl || "",
    };
    next();
  } catch (e) {
    if (e.code === "TOKEN_REVOKED") {
      return res.status(401).json({ message: e.message });
    }
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

module.exports = { requireAuth, bearerToken };
