import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bcryptjs", "xlsx", "@react-pdf/renderer"],
  // Prevent shell scripts from being copied into .next/standalone by the file tracer.
  // If update.sh ends up there, findProjectRoot() mistakes standalone for the project root.
  outputFileTracingExcludes: {
    "**": ["*.sh"],
  },
};

export default withNextIntl(withPWA(nextConfig));
