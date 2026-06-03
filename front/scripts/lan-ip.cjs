const os = require("os");

const VIRTUAL_NAME_PATTERNS = [
  /default switch/i,
  /hyper-v/i,
  /\bwsl\b/i,
  /docker/i,
  /vmware/i,
  /virtualbox/i,
  /vethernet/i,
  /npcap/i,
  /loopback/i,
  /bluetooth/i,
];

const PREFERRED_NAME_PATTERNS = [
  /wi-fi/i,
  /wifi/i,
  /wireless/i,
  /wlan/i,
  /ethernet/i,
];

function isIPv4(net) {
  const family = net.family;
  return family === "IPv4" || family === 4;
}

function isVirtualInterface(name) {
  return VIRTUAL_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

function interfaceScore(name, address) {
  if (isVirtualInterface(name)) return -1000;

  let score = 0;
  if (PREFERRED_NAME_PATTERNS.some((pattern) => pattern.test(name))) score += 100;
  if (address.startsWith("192.168.")) score += 80;
  if (address.startsWith("10.")) score += 60;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) score += 5;
  return score;
}

function getLanEntries() {
  const entries = [];

  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (!addrs) continue;
    for (const net of addrs) {
      if (!isIPv4(net) || net.internal) continue;
      entries.push({
        name,
        address: net.address,
        score: interfaceScore(name, net.address),
      });
    }
  }

  return entries.sort((a, b) => b.score - a.score);
}

function getPrimaryLanIp() {
  const entries = getLanEntries();
  const best = entries.find((entry) => entry.score > 0);
  return best?.address ?? entries[0]?.address ?? "localhost";
}

function getAllLanIps() {
  const seen = new Set(["localhost", "127.0.0.1"]);
  const ips = [];

  for (const entry of getLanEntries()) {
    if (entry.score <= 0) continue;
    if (seen.has(entry.address)) continue;
    seen.add(entry.address);
    ips.push(entry.address);
  }

  return ips;
}

function getAllowedDevOrigins() {
  return ["localhost", "127.0.0.1", ...getAllLanIps()];
}

module.exports = {
  getPrimaryLanIp,
  getAllLanIps,
  getAllowedDevOrigins,
  getLanEntries,
};
