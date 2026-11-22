import type { ReactNode } from "react";

/**
 * Static exports (EdgeOne Pages direct upload, any CDN) must know every
 * /set/<id> path at build time. Study sets created in static mode are numbered
 * sequentially from 1, so pre-rendering this range covers realistic use.
 *
 * In server mode this returns an empty list and pages are rendered on demand.
 */
const STATIC = process.env.NEXT_PUBLIC_GEOMASTER_STATIC === "1";
const MAX_STATIC_SETS = 40;

export function generateStaticParams() {
  if (!STATIC) return [];
  return Array.from({ length: MAX_STATIC_SETS }, (_, i) => ({
    id: String(i + 1),
  }));
}

export default function StudySetLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
