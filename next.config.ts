import type { NextConfig } from "next";

/**
 * Hosts allowed to reach dev resources (/_next/hmr etc.) cross-origin.
 * Defaults to the ngrok tunnel; override with DEV_ORIGINS="a.com,b.com".
 */
const allowedDevOrigins = (process.env.DEV_ORIGINS ?? "alienable-wow-splice.ngrok-free.dev")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const config: NextConfig = {
  reactStrictMode: true,
  // Without this the browser's HMR websocket is refused, so it reconnects in a
  // loop against an already-stalled compiler.
  allowedDevOrigins,
  experimental: {
    // Turbopack's dev cache is a SQLite DB under .next/dev/cache. On this volume
    // a single compaction stalled 25.2s and one route compile took 62s. Off.
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "microphone=(self), camera=()" },
      ],
    }];
  },
};
export default config;
