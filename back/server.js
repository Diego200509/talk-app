const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { createApp } = require("./app");
const { verifyAccessToken } = require("./utils/jwt.util");
const { assertTokenNotRevoked } = require("./services/auth.service");
const { registerChatHandlers } = require("./socket/chat.handlers");

const clientUrl = process.env.CLIENT_URL;

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientUrl || "*",
    methods: ["GET", "POST"],
  },
});
app.set("io", io);

registerChatHandlers(io);

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
  server.listen(port, () => {
    console.log(`API en http://localhost:${port}`);
    if (clientUrl) console.log("Frontend en:", clientUrl);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
