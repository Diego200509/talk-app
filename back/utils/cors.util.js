function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.CLIENT_URL || "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isPrivateLanHostname(hostname) {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

function isDevLanOrigin(origin) {
  if (!origin) return true;
  try {
    const { hostname } = new URL(origin);
    return isPrivateLanHostname(hostname);
  } catch {
    return false;
  }
}

function createCorsOrigin() {
  const allowed = parseAllowedOrigins();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (allowed.length === 0) return true;
    return allowed.length === 1 ? allowed[0] : allowed;
  }

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowed.includes(origin) || isDevLanOrigin(origin)) {
      callback(null, origin);
      return;
    }
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  };
}

module.exports = { createCorsOrigin, isDevLanOrigin, parseAllowedOrigins };
