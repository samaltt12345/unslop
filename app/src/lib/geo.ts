// Geographic + answer-matching utilities (isomorphic).

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Drop disambiguating parentheticals: "Alexandria (Egypt)" -> "alexandria"
    .replace(/\([^)]*\)/g, " ")
    .replace(/['’`´]/g, "")
    .replace(/[.,;:!?()"]/g, "")
    .replace(/[-_/]/g, " ")
    // Common abbreviations students type: "Mt. Olympus" -> "mount olympus"
    .replace(/\bmt\b/g, "mount")
    .replace(/\bmts\b/g, "mountains")
    .replace(/\bst\b/g, "saint")
    .replace(/\b(the|of)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i, ...new Array(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * Fuzzy answer check: exact normalized match, alias match, or small
 * edit-distance tolerance depending on length.
 */
export function answerMatches(
  userAnswer: string,
  correctName: string,
  aliases: string[] = []
): boolean {
  const ans = normalizeName(userAnswer);
  if (!ans) return false;
  const candidates = [correctName, ...aliases].map(normalizeName);
  for (const c of candidates) {
    if (!c) continue;
    if (ans === c) return true;
    // allow dropping common suffix words: "nile" for "nile river"
    const stripped = c
      .replace(/\b(river|sea|desert|ocean|mountains?|mountain range|lake|peninsula|islands?|valley|empire|dynasty|civilization|strait|canal|city)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length >= 3 && ans === stripped) return true;
    const maxLen = Math.max(ans.length, c.length);
    const tolerance = maxLen >= 9 ? 2 : maxLen >= 5 ? 1 : 0;
    if (tolerance > 0 && levenshtein(ans, c) <= tolerance) return true;
    if (stripped.length >= 5) {
      const tol2 = stripped.length >= 9 ? 2 : 1;
      if (levenshtein(ans, stripped) <= tol2) return true;
    }
  }
  return false;
}

export function formatDistance(km: number): string {
  if (km < 1) return "less than 1 km";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/* ---------------- Shape-aware geometry ---------------- */

export type BBox = [number, number, number, number]; // south, west, north, east
export type LatLng = [number, number];

export interface GeoTarget {
  lat: number;
  lng: number;
  radiusKm: number;
  bboxes?: BBox[] | null;
  path?: LatLng[] | null;
}

/** Distance from a point to a great-circle-ish segment, in km. */
function pointToSegmentKm(
  plat: number, plng: number,
  alat: number, alng: number,
  blat: number, blng: number
): number {
  // Work in a local equirectangular projection (accurate at these scales).
  const latRef = ((plat + alat + blat) / 3) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(latRef);
  const ky = 110.57;
  const px = plng * kx, py = plat * ky;
  const ax = alng * kx, ay = alat * ky;
  const bx = blng * kx, by = blat * ky;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineKm(plat, plng, alat, alng);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  // Convert the closest point back to lat/lng for an exact haversine.
  return haversineKm(plat, plng, cy / ky, cx / kx);
}

function pointInBBox(lat: number, lng: number, b: BBox): boolean {
  return lat >= b[0] && lat <= b[2] && lng >= b[1] && lng <= b[3];
}

function distanceToBBoxKm(lat: number, lng: number, b: BBox): number {
  if (pointInBBox(lat, lng, b)) return 0;
  const clampedLat = Math.max(b[0], Math.min(b[2], lat));
  const clampedLng = Math.max(b[1], Math.min(b[3], lng));
  return haversineKm(lat, lng, clampedLat, clampedLng);
}

/**
 * Distance in km from a click to the actual geographic feature.
 * Returns 0 when the click lands inside the feature's real area.
 */
export function distanceToTargetKm(lat: number, lng: number, t: GeoTarget): number {
  if (t.path && t.path.length > 1) {
    let min = Infinity;
    for (let i = 0; i < t.path.length - 1; i++) {
      const d = pointToSegmentKm(
        lat, lng,
        t.path[i][0], t.path[i][1],
        t.path[i + 1][0], t.path[i + 1][1]
      );
      if (d < min) min = d;
    }
    return min;
  }
  if (t.bboxes && t.bboxes.length) {
    return Math.min(...t.bboxes.map((b) => distanceToBBoxKm(lat, lng, b)));
  }
  return haversineKm(lat, lng, t.lat, t.lng);
}

/** How far off a click may be and still count as correct. */
export function toleranceKm(t: GeoTarget, difficultyFactor = 1): number {
  // With a real shape, the shape itself defines the area, so we only need a
  // small buffer. Without one, fall back to the feature's representative radius.
  const base =
    t.path && t.path.length > 1
      ? 120
      : t.bboxes && t.bboxes.length
        ? 90
        : Math.max(Math.min(t.radiusKm, 600), 90);
  return base * difficultyFactor;
}

/** Grade a map click against a location using its true geographic extent. */
export function gradeClick(
  clickLat: number,
  clickLng: number,
  loc: GeoTarget,
  difficultyFactor = 1
): { correct: boolean; close: boolean; distanceKm: number } {
  const d = distanceToTargetKm(clickLat, clickLng, loc);
  const tol = toleranceKm(loc, difficultyFactor);
  return { correct: d <= tol, close: d <= tol * 2.5, distanceKm: d };
}

/** Map bounds that tightly frame a feature, for zooming. */
export function targetBounds(t: GeoTarget): BBox {
  if (t.path && t.path.length) {
    const lats = t.path.map((p) => p[0]);
    const lngs = t.path.map((p) => p[1]);
    return [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)];
  }
  if (t.bboxes && t.bboxes.length) {
    return [
      Math.min(...t.bboxes.map((b) => b[0])),
      Math.min(...t.bboxes.map((b) => b[1])),
      Math.max(...t.bboxes.map((b) => b[2])),
      Math.max(...t.bboxes.map((b) => b[3])),
    ];
  }
  const dLat = t.radiusKm / 110.57;
  const dLng = t.radiusKm / (111.32 * Math.max(0.2, Math.cos((t.lat * Math.PI) / 180)));
  return [t.lat - dLat, t.lng - dLng, t.lat + dLat, t.lng + dLng];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
