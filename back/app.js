const express = require("express");
const cors = require("cors");
const path = require("path");
const { createCorsOrigin } = require("./utils/cors.util");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const conversationRoutes = require("./routes/conversation.routes");
const messageRoutes = require("./routes/message.routes");
const uploadRoutes = require("./routes/upload.routes");

function createApp() {
  const app = express();
  const corsOrigin = createCorsOrigin();

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/auth", authRoutes);
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.use("/api/users", userRoutes);
  app.use("/api/conversations", conversationRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/upload", uploadRoutes);
  return app;
}

module.exports = { createApp };
