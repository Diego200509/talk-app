const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");

function createApp() {
  const app = express();
  const clientUrl = process.env.CLIENT_URL;
  const corsOrigin = clientUrl || true;

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/auth", authRoutes);
  return app;
}

module.exports = { createApp };
