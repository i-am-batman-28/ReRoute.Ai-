import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// FastAPI origin that `/api/*` is proxied to. Proxying keeps the auth cookies first-party
// on the frontend domain; browsers that block third-party cookies drop them otherwise.
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || "https://reroute-ai-n67i.onrender.com").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_ORIGIN}/api/:path*` },
    ];
  },
};

export default nextConfig;
