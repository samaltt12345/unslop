import type { NextConfig } from "next";

/**
 * ATLAS builds in two modes.
 *
 * 1. Server mode (default) — `npm run build`
 *    Full Next.js app with API routes and PostgreSQL. Used on Render, or on
 *    EdgeOne Pages when the project is imported from Git and DATABASE_URL is
 *    configured. Enables the shared class leaderboard.
 *
 * 2. Static mode — `GEOMASTER_STATIC=1 npm run build`
 *    Emits a fully static site to `out/` with no server and no database.
 *    All study sets, progress, and leaderboard scores are stored in the
 *    browser. Upload the `out/` folder directly to EdgeOne Pages.
 *
 * In static mode the API route files (named `route.node.ts`) are excluded by
 * omitting the `node.ts` page extension, so nothing server-only is bundled.
 */
const isStatic = process.env.GEOMASTER_STATIC === "1";

const nextConfig: NextConfig = {
  pageExtensions: isStatic
    ? ["tsx", "ts", "jsx", "js"]
    : ["tsx", "ts", "jsx", "js", "node.ts"],
  ...(isStatic
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
        env: { NEXT_PUBLIC_GEOMASTER_STATIC: "1" },
      }
    : {}),
};

export default nextConfig;
