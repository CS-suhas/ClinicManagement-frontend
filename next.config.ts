import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  return {
    output: "standalone",
    cacheComponents: true,
    partialPrefetching: true,
    // The browser always calls the API same-origin at /api. In production a
    // reverse proxy routes /api/* to the API, so the build bakes in no API URL.
    // `next dev` has no proxy, so it forwards /api/* to API_INTERNAL_URL itself.
    async rewrites() {
      if (phase !== PHASE_DEVELOPMENT_SERVER) return [];
      const target = (
        process.env.API_INTERNAL_URL || "http://localhost:8080/api"
      ).replace(/\/$/, "");
      return [{ source: "/api/:path*", destination: `${target}/:path*` }];
    },
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
