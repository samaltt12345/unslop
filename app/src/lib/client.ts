"use client";

import type {
  GeocodeResult,
  LocationDTO,
  ProgressDTO,
  ResolvedLocation,
  StudySetDTO,
} from "./types";
import { lookupGazetteer } from "./gazetteer";
import { EXAMPLE_SET, resolveExampleLocations } from "./exampleSet";

const OWNER_KEY = "geomaster_owner_id";
const NAME_KEY = "geomaster_player_name";

/**
 * Static mode is enabled for builds destined for a static host (EdgeOne Pages
 * direct upload, GitHub Pages, any CDN). There is no server or database, so
 * every study set, progress record, and leaderboard entry lives in the
 * browser's localStorage instead of being fetched from /api.
 */
export const STATIC_MODE = process.env.NEXT_PUBLIC_GEOMASTER_STATIC === "1";

export function getOwnerId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(OWNER_KEY);
  if (!id) {
    id = `u_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(OWNER_KEY, id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setPlayerName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name.slice(0, 40));
}

/* ============================================================
   Local storage store (static mode)
   ============================================================ */

interface LocalSet {
  id: number;
  name: string;
  shareCode: string;
  createdAt: string;
  locations: LocationDTO[];
}

export interface LeaderboardEntry {
  id: number | string;
  ownerId: string;
  playerName: string;
  score: number;
  total: number;
  accuracy: number;
  durationSec: number;
  mode: string;
  createdAt: string;
}

const LS = {
  sets: "gm_sets",
  progress: "gm_progress",
  results: "gm_results",
  learn: "gm_learn",
  seqSet: "gm_seq_set",
  seqLoc: "gm_seq_loc",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded — fail quietly rather than breaking the study session.
  }
}

/**
 * Study-set ids and location ids use separate counters so set ids stay small
 * and sequential (1, 2, 3 …). Static exports pre-render a fixed range of
 * /set/<id> pages, so set ids must not jump.
 */
function nextSetId(): number {
  const n = read<number>(LS.seqSet, 0) + 1;
  write(LS.seqSet, n);
  return n;
}

function nextLocId(): number {
  const n = read<number>(LS.seqLoc, 0) + 1;
  write(LS.seqLoc, n);
  return n;
}

function localSets(): LocalSet[] {
  const sets = read<LocalSet[]>(LS.sets, []);
  let changed = false;
  for (const set of sets) {
    if (set.name !== EXAMPLE_SET.name) continue;
    const old = set.locations.find((location) => location.name === "Macedonia" && location.type === "Country");
    if (!old) continue;
    const canonical = resolveExampleLocations().find((location) => location.name === "Macedonia")!;
    const { source, ...fields } = canonical;
    void source;
    Object.assign(old, fields);
    changed = true;
  }
  if (changed) write(LS.sets, sets);
  return sets;
}

function saveLocalSets(sets: LocalSet[]) {
  write(LS.sets, sets);
}

function makeShareCode(name: string): string {
  const prefix =
    name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "GEOSET";
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function toLocationRows(
  setId: number,
  locs: (ResolvedLocation & { needsConfirmation?: boolean })[]
): LocationDTO[] {
  return locs.map((l, i) => ({
    id: nextLocId(),
    setId,
    name: l.name,
    type: l.type,
    lat: l.lat,
    lng: l.lng,
    radiusKm: l.radiusKm || 120,
    region: l.region ?? "",
    description: l.description ?? "",
    whyItMatters: l.whyItMatters ?? "",
    aliases: l.aliases ?? [],
    approximate: !!l.approximate,
    needsConfirmation: !!l.needsConfirmation,
    sortOrder: i,
    bboxes: l.bboxes ?? null,
    path: l.path ?? null,
  }));
}

/* ============================================================
   Geocoding
   ============================================================ */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  boundingbox?: [string, string, string, string];
}

/** Browser-side geocoding used when there is no server to proxy through. */
async function geocodeStatic(query: string): Promise<GeocodeResult> {
  const gz = lookupGazetteer(query);
  if (gz.status === "resolved" && gz.resolved) {
    return { query, status: "resolved", resolved: gz.resolved };
  }
  if (gz.status === "ambiguous" && gz.options?.length) {
    return { query, status: "ambiguous", options: gz.options };
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error("geocoder");
    const data = (await res.json()) as NominatimResult[];
    if (!data.length) return { query, status: "not_found" };
    const r = data[0];
    let bboxes: [number, number, number, number][] | null = null;
    if (r.boundingbox) {
      const [s, n, w, e] = r.boundingbox.map(Number);
      if ([s, n, w, e].every(Number.isFinite) && n > s && e > w) {
        bboxes = [[s, w, n, e]];
      }
    }
    const parts = r.display_name.split(",").map((p) => p.trim());
    return {
      query,
      status: "resolved",
      resolved: {
        name: r.name || query,
        type: "Other",
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        radiusKm: 120,
        region: parts.slice(-2).join(", "),
        description: r.display_name,
        whyItMatters: "",
        aliases: [],
        approximate: !bboxes,
        needsConfirmation: false,
        source: "geocoder",
        bboxes,
      },
    };
  } catch {
    return { query, status: "not_found" };
  }
}

export async function geocodeOne(query: string): Promise<GeocodeResult> {
  if (STATIC_MODE) return geocodeStatic(query);
  const res = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Geocoding failed");
  return res.json();
}

/* ============================================================
   Study sets
   ============================================================ */

export async function listSets(): Promise<StudySetDTO[]> {
  if (STATIC_MODE) {
    return localSets()
      .map((s) => ({
        id: s.id,
        name: s.name,
        shareCode: s.shareCode,
        createdAt: s.createdAt,
        locationCount: s.locations.length,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const res = await fetch(`/api/sets?ownerId=${encodeURIComponent(getOwnerId())}`);
  const data = await res.json();
  return data.sets ?? [];
}

export async function createSet(
  name: string,
  locs: (ResolvedLocation & { needsConfirmation?: boolean })[]
): Promise<{ id: number; shareCode: string }> {
  if (STATIC_MODE) {
    const id = nextSetId();
    const shareCode = makeShareCode(name);
    const sets = localSets();
    sets.push({
      id,
      name: name.slice(0, 120),
      shareCode,
      createdAt: new Date().toISOString(),
      locations: toLocationRows(id, locs),
    });
    saveLocalSets(sets);
    return { id, shareCode };
  }
  const res = await fetch("/api/sets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: getOwnerId(), name, locations: locs }),
  });
  if (!res.ok) throw new Error("Failed to save study set");
  return res.json();
}

export async function getSet(
  id: number
): Promise<StudySetDTO & { locations: LocationDTO[] }> {
  if (STATIC_MODE) {
    const s = localSets().find((x) => x.id === id);
    if (!s) throw new Error("Study set not found");
    return s;
  }
  const res = await fetch(`/api/sets/${id}`);
  if (!res.ok) throw new Error("Study set not found");
  return res.json();
}

export async function renameSet(id: number, name: string) {
  if (STATIC_MODE) {
    const sets = localSets();
    const s = sets.find((x) => x.id === id);
    if (s) s.name = name.slice(0, 120);
    saveLocalSets(sets);
    return;
  }
  await fetch(`/api/sets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function updateLocation(
  setId: number,
  update: {
    id: number;
    lat?: number;
    lng?: number;
    name?: string;
    type?: string;
    needsConfirmation?: boolean;
  }
) {
  if (STATIC_MODE) {
    const sets = localSets();
    const loc = sets.find((s) => s.id === setId)?.locations.find((l) => l.id === update.id);
    if (loc) {
      if (typeof update.lat === "number") loc.lat = update.lat;
      if (typeof update.lng === "number") loc.lng = update.lng;
      if (typeof update.name === "string") loc.name = update.name;
      if (typeof update.needsConfirmation === "boolean")
        loc.needsConfirmation = update.needsConfirmation;
    }
    saveLocalSets(sets);
    return;
  }
  await fetch(`/api/sets/${setId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updateLocation: update }),
  });
}

export async function duplicateSet(id: number): Promise<number> {
  if (STATIC_MODE) {
    const sets = localSets();
    const src = sets.find((s) => s.id === id);
    if (!src) throw new Error("Study set not found");
    const newId = nextSetId();
    sets.push({
      id: newId,
      name: `${src.name} (Copy)`.slice(0, 120),
      shareCode: makeShareCode(src.name),
      createdAt: new Date().toISOString(),
      locations: src.locations.map((l) => ({ ...l, id: nextLocId(), setId: newId })),
    });
    saveLocalSets(sets);
    return newId;
  }
  const res = await fetch(`/api/sets/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "duplicate", ownerId: getOwnerId() }),
  });
  const data = await res.json();
  return data.id;
}

export async function deleteSet(id: number) {
  if (STATIC_MODE) {
    saveLocalSets(localSets().filter((s) => s.id !== id));
    const prog = read<Record<string, unknown>>(LS.progress, {});
    delete prog[String(id)];
    write(LS.progress, prog);
    const results = read<Record<string, unknown>>(LS.results, {});
    delete results[String(id)];
    write(LS.results, results);
    const learn = read<Record<string, unknown>>(LS.learn, {});
    delete learn[String(id)];
    write(LS.learn, learn);
    return;
  }
  await fetch(`/api/sets/${id}`, { method: "DELETE" });
}

/** Creates (or reopens) the built-in example study set. */
export async function loadExampleSet(): Promise<number> {
  if (STATIC_MODE) {
    const existing = localSets().find((s) => s.name === EXAMPLE_SET.name);
    if (existing) return existing.id;
    const resolved = resolveExampleLocations();
    const { id } = await createSet(EXAMPLE_SET.name, resolved);
    return id;
  }
  const res = await fetch("/api/example-set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: getOwnerId() }),
  });
  if (!res.ok) throw new Error("Could not load the example set");
  const data = await res.json();
  return data.id as number;
}

/* ============================================================
   Progress
   ============================================================ */

type ProgressStore = Record<string, Record<string, ProgressDTO>>;

export async function getProgress(setId: number): Promise<ProgressDTO[]> {
  if (STATIC_MODE) {
    const all = read<ProgressStore>(LS.progress, {});
    return Object.values(all[String(setId)] ?? {});
  }
  const res = await fetch(
    `/api/progress?ownerId=${encodeURIComponent(getOwnerId())}&setId=${setId}`
  );
  const data = await res.json();
  return data.progress ?? [];
}

export async function postProgress(
  setId: number,
  updates: {
    locationId: number;
    result?: "correct" | "incorrect";
    studied?: boolean;
  }[]
) {
  if (STATIC_MODE) {
    const all = read<ProgressStore>(LS.progress, {});
    const bucket = all[String(setId)] ?? {};
    for (const u of updates) {
      const key = String(u.locationId);
      const cur: ProgressDTO = bucket[key] ?? {
        locationId: u.locationId,
        mastery: 0,
        correct: 0,
        incorrect: 0,
        studied: false,
      };
      if (u.result === "correct") {
        cur.mastery = Math.min(3, cur.mastery + 1);
        cur.correct += 1;
      } else if (u.result === "incorrect") {
        cur.mastery = Math.max(0, cur.mastery - 1);
        cur.incorrect += 1;
      }
      cur.studied = u.studied ?? (cur.studied || u.result !== undefined);
      bucket[key] = cur;
    }
    all[String(setId)] = bucket;
    write(LS.progress, all);
    return;
  }
  await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: getOwnerId(), setId, updates }),
  });
}

/* ============================================================
   Results + leaderboard
   ============================================================ */

type ResultsStore = Record<string, LeaderboardEntry[]>;

export async function postResult(payload: {
  setId: number;
  score: number;
  total: number;
  durationSec: number;
  mode: string;
  playerName?: string;
  details: {
    locationId: number;
    locationName: string;
    correct: boolean;
    userAnswer: string;
    distanceKm?: number;
    kind: string;
  }[];
}) {
  const playerName = (payload.playerName || getPlayerName() || "Anonymous").slice(0, 40);
  if (STATIC_MODE) {
    const all = read<ResultsStore>(LS.results, {});
    const list = all[String(payload.setId)] ?? [];
    list.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId: getOwnerId(),
      playerName,
      score: payload.score,
      total: payload.total,
      accuracy: payload.total
        ? Math.round((payload.score / payload.total) * 100)
        : 0,
      durationSec: payload.durationSec,
      mode: payload.mode,
      createdAt: new Date().toISOString(),
    });
    all[String(payload.setId)] = list;
    write(LS.results, all);
    return;
  }
  await fetch("/api/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: getOwnerId(), playerName, ...payload }),
  });
}

export async function getResults(setId: number) {
  if (STATIC_MODE) {
    const all = read<ResultsStore>(LS.results, {});
    return all[String(setId)] ?? [];
  }
  const res = await fetch(
    `/api/results?ownerId=${encodeURIComponent(getOwnerId())}&setId=${setId}`
  );
  const data = await res.json();
  return data.results ?? [];
}

/** Ranked leaderboard: best accuracy first, then fastest time. */
export async function getLeaderboard(setId: number): Promise<LeaderboardEntry[]> {
  if (STATIC_MODE) {
    const all = read<ResultsStore>(LS.results, {});
    return [...(all[String(setId)] ?? [])].sort(
      (a, b) =>
        b.accuracy - a.accuracy ||
        a.durationSec - b.durationSec ||
        a.createdAt.localeCompare(b.createdAt)
    );
  }
  const res = await fetch(`/api/leaderboard?setId=${setId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.entries ?? [];
}

/* ============================================================
   Learn mode state
   ============================================================ */

export interface LearnStateDTO {
  batchSize: number;
  batchIndex: number;
  levels: Record<string, number>;
}

export async function getLearnState(
  setId: number
): Promise<LearnStateDTO | null> {
  if (STATIC_MODE) {
    const all = read<Record<string, LearnStateDTO>>(LS.learn, {});
    return all[String(setId)] ?? null;
  }
  const res = await fetch(
    `/api/learn?ownerId=${encodeURIComponent(getOwnerId())}&setId=${setId}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.state ?? null;
}

export async function saveLearnState(
  setId: number,
  state: LearnStateDTO
): Promise<void> {
  if (STATIC_MODE) {
    const all = read<Record<string, LearnStateDTO>>(LS.learn, {});
    all[String(setId)] = state;
    write(LS.learn, all);
    return;
  }
  await fetch("/api/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: getOwnerId(), setId, ...state }),
  }).catch(() => {});
}

export async function resetLearnState(setId: number): Promise<void> {
  if (STATIC_MODE) {
    const all = read<Record<string, LearnStateDTO>>(LS.learn, {});
    delete all[String(setId)];
    write(LS.learn, all);
    return;
  }
  await fetch("/api/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: getOwnerId(), setId, reset: true }),
  }).catch(() => {});
}
