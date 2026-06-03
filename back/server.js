const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const fs = require("fs");
const http = require("http");
const https = require("https");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { createApp } = require("./app");
const { verifyAccessToken } = require("./utils/jwt.util");
const { assertTokenNotRevoked } = require("./services/auth.service");
const { createCorsOrigin } = require("./utils/cors.util");
const { registerChatHandlers } = require("./socket/chat.handlers");
const { getPrimaryLanIp } = require("./utils/lan-ip.util");
const { registerCallHandlers } = require("./socket/call.handlers");

const corsOrigin = createCorsOrigin();
const app = createApp();

function createNodeServer() {
  if (process.env.DEV_HTTPS !== "1") {
    return { server: http.createServer(app), secure: false };
  }

  const certDir =
    process.env.DEV_HTTPS_CERT_DIR || path.join(__dirname, "..", "front", "certificates");
  const keyPath = path.join(certDir, "dev-key.pem");
  const certPath = path.join(certDir, "dev-cert.pem");

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error("Faltan certificados HTTPS en front/certificates.");
    console.error("Ejecuta primero «npm run dev:https» en la carpeta front.");
    process.exit(1);
  }

  const server = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    app
  );
  return { server, secure: true };
}

const { server, secure: isSecure } = createNodeServer();
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.set("io", io);

registerChatHandlers(io);
registerCallHandlers(io);

app.get("/health", (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.json({ ok: true, db: dbOk });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error("Falta JWT_SECRET en .env");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Falta MONGODB_URI en .env");
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB:", err.message);
  });

  await mongoose.connect(uri);
  console.log("MongoDB conectado:", mongoose.connection.name);

  io.use(async (socket, next) => {
    try {
      const rawAuth = socket.handshake.auth?.token || "";
      const token =
        typeof rawAuth === "string" && rawAuth.startsWith("Bearer ")
          ? rawAuth.slice("Bearer ".length)
          : rawAuth;
      if (!token) {
        next(new Error("No autorizado"));
        return;
      }
      const decoded = verifyAccessToken(token);
      await assertTokenNotRevoked(decoded.jti);
      socket.data.userId = decoded.sub;
      socket.join(`user:${decoded.sub}`);
      next();
    } catch {
      next(new Error("Token inválido o expirado"));
    }
  });

  const port = Number(process.env.PORT) || 5000;
  server.on("error", (err) => {
    console.error(err.code === "EADDRINUSE" ? `Puerto ${port} en uso` : err.message);
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () => {
    const lanIp = getPrimaryLanIp();
    const scheme = isSecure ? "https" : "http";
    console.log(`API en ${scheme}://localhost:${port}`);
    if (lanIp) {
      console.log(`API en red Wi-Fi: ${scheme}://${lanIp}:${port}`);
    }
    if (isSecure) {
      console.log("Modo HTTPS (videollamadas / front con dev:https)");
    }
    const allowed = process.env.CORS_ORIGINS || process.env.CLIENT_URL;
    if (allowed) console.log("CORS permitido:", allowed);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
