const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { getPrimaryLanIp, getAllLanIps } = require("./lan-ip.cjs");

const certDir = path.join(__dirname, "..", "certificates");
const certPath = path.join(certDir, "dev-cert.pem");
const keyPath = path.join(certDir, "dev-key.pem");
const metaPath = path.join(certDir, ".dev-cert-hosts.json");

function collectHosts() {
  const set = new Set(["localhost", "127.0.0.1", getPrimaryLanIp(), ...getAllLanIps()]);
  return [...set].filter(Boolean);
}

function getCaroot() {
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(local, "mkcert");
  }
  try {
    return execFileSync("mkcert", ["-CAROOT"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function findMkcertBin(caroot) {
  if (!caroot || !fs.existsSync(caroot)) return null;

  if (process.platform === "win32") {
    const exe = fs
      .readdirSync(caroot)
      .find((name) => name.startsWith("mkcert-") && name.endsWith(".exe"));
    if (exe) return path.join(caroot, exe);
  }

  return "mkcert";
}

function ensureDevCert() {
  const hosts = collectHosts();
  const hostsKey = hosts.slice().sort().join("|");

  if (fs.existsSync(certPath) && fs.existsSync(keyPath) && fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      if (meta.hostsKey === hostsKey) {
        return { certPath, keyPath, hosts, trusted: Boolean(meta.trusted), regenerated: false };
      }
    } catch {
      /* regenerar */
    }
  }

  const caroot = getCaroot();
  const mkcertBin = findMkcertBin(caroot);
  if (!mkcertBin) {
    throw new Error(
      "No se encontró mkcert. Ejecuta una vez «npm run dev:https» o instala mkcert (https://github.com/FiloSottile/mkcert)."
    );
  }

  fs.mkdirSync(certDir, { recursive: true });

  execFileSync(
    mkcertBin,
    ["-key-file", keyPath, "-cert-file", certPath, ...hosts],
    {
      env: { ...process.env, CAROOT: caroot },
      stdio: "inherit",
    }
  );

  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        hostsKey,
        hosts,
        trusted: true,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  return { certPath, keyPath, hosts, trusted: true, regenerated: true };
}

module.exports = { ensureDevCert };
