import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-require-imports
const defaultRuntimeCaching = require("next-pwa/cache");

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    // App Router navigations / prefetches (RSC payloads) must always go
    // straight to the network. The default next-pwa rule routes them through
    // a NetworkFirst cache (10s timeout, cache writes on every request), which
    // makes back-and-forth navigation stall and can serve stale RSC payloads.
    {
      urlPattern: ({ request, url }: { request: Request; url: URL }) =>
        request.headers.get("RSC") === "1" ||
        url.searchParams.has("_rsc") ||
        request.mode === "navigate",
      handler: "NetworkOnly",
    },
    ...defaultRuntimeCaching,
  ],
});

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bcryptjs", "xlsx", "@react-pdf/renderer"],
  // Prevent shell scripts from being copied into .next/standalone by the file tracer.
  // If update.sh ends up there, findProjectRoot() mistakes standalone for the project root.
  outputFileTracingExcludes: {
    "**": ["*.sh"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(withPWA(nextConfig));
