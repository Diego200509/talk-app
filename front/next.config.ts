import type { NextConfig } from "next";

const { getAllowedDevOrigins } = require("./scripts/lan-ip.cjs") as {
  getAllowedDevOrigins: () => string[];
};

const apiProxyHost = process.env.API_PROXY_HOST ?? "127.0.0.1";
const apiProxyPort = process.env.NEXT_PUBLIC_API_PORT ?? "5001";

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/:path*",
        destination: `http://${apiProxyHost}:${apiProxyPort}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `http://${apiProxyHost}:${apiProxyPort}/uploads/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `http://${apiProxyHost}:${apiProxyPort}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
