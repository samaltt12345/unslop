/**
 * Generates src/lib/world-dots.json — a dot-matrix of Earth's land masses
 * with the owning country's name attached, sampled from the bundled
 * Natural Earth countries file (public domain).
 *
 *   node scripts/make-world-dots.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const geo = JSON.parse(
  readFileSync(resolve(here, "../public/data/countries.geojson"), "utf8")
);

// Collect every closed ring, with a bbox and country for cheap rejection.
const rings = [];
for (const f of geo.features) {
  const g = f.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  const name = f.properties?.name || "";
  for (const poly of polys) {
    const outer = poly[0];
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    for (const [lng, lat] of outer) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    rings.push({ pts: outer, minLng, maxLng, minLat, maxLat, name });
  }
}

function inside(lng, lat, r) {
  if (lng < r.minLng || lng > r.maxLng || lat < r.minLat || lat > r.maxLat) return false;
  let hit = false;
  const pts = r.pts;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const ROWS = 96;          // latitude rows from -56S to 78N
const BASE_STEP = 360 / 220; // longitude step at the equator, degrees
const dots = [];
const latTop = 78, latBottom = -56;
const latStep = (latTop - latBottom) / (ROWS - 1);

for (let r = 0; r < ROWS; r++) {
  const lat = latBottom + r * latStep;
  const step = Math.min(60, BASE_STEP / Math.max(0.18, Math.cos((lat * Math.PI) / 180)));
  const n = Math.floor(360 / step);
  const offset = (r % 2) * (step / 2); // stagger alternate rows for even coverage
  for (let i = 0; i < n; i++) {
    const lng = -180 + i * step + offset;
    if (lng > 180) continue;
    for (const ring of rings) {
      if (inside(lng, lat, ring)) {
        dots.push([Math.round(lng * 100) / 100, Math.round(lat * 100) / 100, ring.name]);
        break;
      }
    }
  }
}

const out = resolve(here, "../src/lib/world-dots.json");
const payload = {
  lng: dots.map((d) => d[0]),
  lat: dots.map((d) => d[1]),
  name: dots.map((d) => d[2]),
};
writeFileSync(out, JSON.stringify(payload));
console.log(`world-dots.json: ${dots.length} dots, ${(JSON.stringify(payload).length / 1024).toFixed(0)} KB`);
