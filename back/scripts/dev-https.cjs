const { spawn } = require("child_process");
const path = require("path");

process.env.DEV_HTTPS = "1";

const child = spawn("npx", ["nodemon", "server.js"], {
  stdio: "inherit",
  shell: true,
  cwd: path.join(__dirname, ".."),
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
