import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import bundleAnalyzer from "@next/bundle-analyzer";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

import { SECURITY_HEADER_ENTRIES } from "./src/lib/security-headers";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  /** GitHub Actions 等でヘッドレス環境が固まらないようにする */
  openAnalyzer: process.env.CI !== "true",
});

const projectDir = process.cwd();

loadEnvConfig(projectDir);

/**
 * `next dev` では `.env.production.local` が読み込まれない。
 * 本番用にそこだけへキーを置いていると、クライアントで Supabase が未設定扱いになる。
 * 開発時かつ該当キーが空のときだけ `.env.production.local` をフォールバックで読む。
 */
const DEV_ENV_FALLBACK_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function applyDotenvKeysFromFile(filePath: string, keys: readonly string[]) {
  if (!existsSync(filePath)) {
    return;
  }

  const allow = new Set(keys);
  const raw = readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    if (!allow.has(key) || process.env[key]?.trim()) {
      continue;
    }

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

if (process.env.NODE_ENV === "development") {
  const anyMissing = DEV_ENV_FALLBACK_KEYS.some((key) => !process.env[key]?.trim());
  if (anyMissing) {
    applyDotenvKeysFromFile(join(projectDir, ".env.production.local"), DEV_ENV_FALLBACK_KEYS);
  }
}

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
const basePath =
  rawBasePath && rawBasePath !== "/" ? rawBasePath.replace(/\/$/, "") : undefined;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "@supabase/ssr", "zod", "clsx"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADER_ENTRIES.map(([key, value]) => ({ key, value })),
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
