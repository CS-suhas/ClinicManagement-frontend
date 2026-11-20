import type { NextConfig } from "next";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [
      {
        source: "/api/config/allergy-severities",
        destination: `${apiBaseUrl}/allergy-severities`,
      },
      {
        source: "/api/config/appointment-settings",
        destination: `${apiBaseUrl}/appointment-settings`,
      },
    ];
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

export default nextConfig;
