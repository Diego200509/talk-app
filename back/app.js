const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const conversationRoutes = require("./routes/conversation.routes");

function createApp() {
  const app = express();
  const clientUrl = process.env.CLIENT_URL;
  const corsOrigin = clientUrl || true;

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/auth", authRoutes);
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.use("/api/users", userRoutes);
  app.use("/api/conversations", conversationRoutes);
  return app;
}

module.exports = { createApp };
