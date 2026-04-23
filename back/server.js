const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { createApp } = require("./app");

const clientUrl = process.env.CLIENT_URL;

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientUrl || "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
});

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
