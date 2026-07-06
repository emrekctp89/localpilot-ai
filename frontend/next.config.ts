import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = dirname(frontendRoot);

const nextConfig: NextConfig = {
  // Vercel monorepo tracing expects the repo root, not frontend/.
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
