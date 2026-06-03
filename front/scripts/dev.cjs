const { spawn } = require("child_process");
const path = require("path");
const { getPrimaryLanIp, getAllLanIps } = require("./lan-ip.cjs");

const port = process.env.PORT || 3000;
const ip = getPrimaryLanIp();
const allIps = getAllLanIps();
const useHttps = process.env.TALK_DEV_HTTPS === "1";

console.log("");
console.log("  TalkApp — abre desde el celular (misma Wi-Fi):");
const scheme = useHttps ? "https" : "http";
console.log(`  → ${scheme}://${ip}:${port}`);
console.log(`  → ${scheme}://${ip}:${port}/login`);
console.log("");
if (!useHttps) {
  console.log("  Para videollamadas desde el celular usa: npm run dev:https");
}
if (allIps.length > 1) {
  const others = allIps.filter((address) => address !== ip);
  if (others.length) {
    console.log(`  (otras IPs en esta PC: ${others.join(", ")})`);
  }
}
console.log("");
console.log("  Ignora la IP de Hyper-V/WSL que muestra Next (172.x virtual).");
console.log("");

const nextArgs = ["next", "dev", "-H", "0.0.0.0", "-p", String(port)];
if (useHttps) {
  try {
    const { ensureDevCert } = require("./ensure-dev-cert.cjs");
    const { certPath, keyPath, hosts, trusted } = ensureDevCert();
    console.log(`  Certificado para: ${hosts.join(", ")}`);
    console.log(`  PC: ${scheme}://localhost:${port}`);
    if (trusted) {
      console.log("  Certificado local de confianza (mkcert) — no debería avisar en esta PC.");
    }
    console.log("");
    console.log("  IMPORTANTE: abre https:// (no http://).");
    console.log("  También inicia el backend: cd ../back && npm run dev:https");
    console.log("  En el celular puede pedir aceptar el certificado la primera vez.");
    console.log("");
    nextArgs.splice(2, 0, "--experimental-https");
    nextArgs.push("--experimental-https-key", keyPath, "--experimental-https-cert", certPath);
  } catch (err) {
    console.error("");
    console.error("  Error al preparar HTTPS:", err.message || err);
    console.error("  Usa «npm run dev» (HTTP) para chat normal.");
    console.error("");
    process.exit(1);
  }
}

const child = spawn("npx", nextArgs, {
  stdio: "inherit",
  shell: true,
  cwd: path.join(__dirname, ".."),
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
