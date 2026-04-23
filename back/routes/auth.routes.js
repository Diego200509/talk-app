const express = require("express");
const { requireAuth, bearerToken } = require("../middleware/requireAuth.middleware");
const authService = require("../services/auth.service");
const { verifyAccessToken } = require("../utils/jwt.util");

const router = express.Router();

function isEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const nameTrim = typeof name === "string" ? name.trim() : "";
    if (!nameTrim || nameTrim.length < 2) {
      return res.status(400).json({
        message: "El nombre es obligatorio (mínimo 2 caracteres)",
      });
    }
    if (nameTrim.length > 80) {
      return res.status(400).json({ message: "El nombre es demasiado largo" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ message: "Correo no válido" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }
    const result = await authService.register({ email, password, name: nameTrim });
    return res.status(201).json(result);
  } catch (e) {
    if (e.code === "EMAIL_IN_USE") {
      return res.status(409).json({ message: e.message });
    }
    if (e.code === "INVALID_NAME") {
      return res.status(400).json({ message: e.message });
    }
    return res.status(500).json({ message: "Error al registrar" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!isEmail(email) || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Datos incompletos" });
    }
    const result = await authService.login({ email, password });
    return res.json(result);
  } catch (e) {
    if (e.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: e.message });
    }
    return res.status(500).json({ message: "Error al iniciar sesión" });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    await authService.logout(req.auth);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: "Error al cerrar sesión" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isEmail(email)) {
      return res.status(400).json({ message: "Correo no válido" });
    }
    await authService.requestPasswordReset(email);
    return res.json({
      ok: true,
      message: "Si el correo existe, te enviamos instrucciones.",
    });
  } catch {
    return res.status(500).json({ message: "No se pudo procesar la solicitud" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (typeof token !== "string" || !token) {
      return res.status(400).json({ message: "Token requerido" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }
    await authService.resetPasswordWithToken(token, password);

    const bt = bearerToken(req);
    if (bt) {
      try {
        const decoded = verifyAccessToken(bt);
        await authService.logout(decoded);
      } catch {
        /* token inválido: no importa */
      }
    }

    return res.json({ ok: true, message: "Contraseña actualizada" });
  } catch (e) {
    if (e.code === "INVALID_RESET_TOKEN") {
      return res.status(400).json({ message: e.message });
    }
    if (e.code === "PASSWORD_REUSED") {
      return res.status(400).json({ message: e.message });
    }
    return res.status(500).json({ message: "Error al restablecer" });
  }
});

module.exports = router;
