import { NextRequest, NextResponse } from "next/server";
import { lookupGazetteer } from "@/lib/gazetteer";
import { haversineKm } from "@/lib/geo";
import type { GeocodeResult, GeoType, ResolvedLocation } from "@/lib/types";

export const dynamic = "force-dynamic";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type: string;
  class: string;
  addresstype?: string;
  importance?: number;
  boundingbox?: [string, string, string, string];
}

function osmToGeoType(cls: string, type: string, addresstype?: string): GeoType {
  if (cls === "boundary" && (type === "administrative" || addresstype === "country"))
    return addresstype === "country" ? "Country" : "Region";
  if (addresstype === "country") return "Country";
  if (addresstype === "state" || addresstype === "province") return "Region";
  if (cls === "place") {
    if (["city", "town", "village", "hamlet", "municipality"].includes(type)) return "City";
    if (type === "island") return "Island";
    if (type === "archipelago") return "Island Group";
    if (type === "sea") return "Sea";
    if (type === "ocean") return "Ocean";
    if (type === "peninsula") return "Peninsula";
    if (["continent"].includes(type)) return "Continent";
    if (["state", "province", "region", "county"].includes(type)) return "Region";
    return "Other";
  }
  if (cls === "waterway") return "River";
  if (cls === "water" || cls === "natural") {
    if (type === "water" || type === "lake") return "Lake";
    if (type === "bay" || type === "strait") return type === "strait" ? "Strait" : "Sea";
    if (type === "peak" || type === "volcano") return "Mountain";
    if (type === "mountain_range" || type === "ridge") return "Mountain Range";
    if (type === "desert" || type === "sand" || type === "dune") return "Desert";
    if (type === "peninsula") return "Peninsula";
    if (type === "island") return "Island";
    if (type === "sea") return "Sea";
    if (type === "river" || type === "stream") return "River";
    return "Other";
  }
  if (cls === "mountain_pass") return "Mountain";
  return "Other";
}

function bboxRadiusKm(bb?: [string, string, string, string]): number {
  if (!bb) return 120;
  const [s, n, w, e] = bb.map(Number);
  const d = haversineKm(s, w, n, e) / 2;
  return Math.min(Math.max(Math.round(d), 60), 2500);
}

function shortRegion(displayName: string): string {
  const parts = displayName.split(",").map((p) => p.trim());
  if (parts.length <= 2) return parts.join(", ");
  return [parts[Math.max(1, parts.length - 2)], parts[parts.length - 1]]
    .filter(Boolean)
    .join(", ");
}

async function geocodeNominatim(query: string): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ATLAS-Study-App/1.0 (educational geography study tool)",
      Accept: "application/json",
    },
    // Nominatim results are stable; cache to be a good citizen.
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  if (!data.length) return { query, status: "not_found" };

  const toResolved = (r: NominatimResult): ResolvedLocation => {
    const type = osmToGeoType(r.class, r.type, r.addresstype);
    // Nominatim gives [south, north, west, east] — reorder to [s, w, n, e].
    let bboxes: [number, number, number, number][] | null = null;
    if (r.boundingbox) {
      const [s, n, w, e] = r.boundingbox.map(Number);
      if ([s, n, w, e].every(Number.isFinite) && n > s && e > w) {
        bboxes = [[s, w, n, e]];
      }
    }
    return {
      name: r.name || query,
      type,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      radiusKm: bboxRadiusKm(r.boundingbox),
      region: shortRegion(r.display_name),
      description: r.display_name,
      whyItMatters: "",
      aliases: [],
      approximate: !bboxes && !["City", "Mountain"].includes(type),
      needsConfirmation: false,
      source: "geocoder",
      bboxes,
    };
  };

  // Consider meaningful candidates: importance-ranked, keep those reasonably
  // important and geographically distinct from the top hit.
  const sorted = [...data].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
  const top = sorted[0];
  const topImp = top.importance ?? 0.5;
  const contenders = sorted.filter((r, i) => {
    if (i === 0) return true;
    const imp = r.importance ?? 0;
    if (imp < 0.45 || imp < topImp - 0.15) return false;
    const far =
      haversineKm(parseFloat(top.lat), parseFloat(top.lon), parseFloat(r.lat), parseFloat(r.lon)) > 500;
    return far;
  });

  if (contenders.length > 1 && topImp < 0.75) {
    return {
      query,
      status: "ambiguous",
      options: contenders.slice(0, 3).map(toResolved),
    };
  }
  return { query, status: "resolved", resolved: toResolved(top) };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string };
    const query = (body.query ?? "").trim();
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // 1) Curated gazetteer (fast, accurate for study-relevant places)
    const gz = lookupGazetteer(query);
    if (gz.status === "resolved" && gz.resolved) {
      return NextResponse.json({
        query,
        status: "resolved",
        resolved: gz.resolved,
      } satisfies GeocodeResult);
    }
    if (gz.status === "ambiguous") {
      return NextResponse.json({
        query,
        status: "ambiguous",
        options: gz.options,
      } satisfies GeocodeResult);
    }

    // 2) Fall back to Nominatim geocoder
    try {
      const result = await geocodeNominatim(query);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({
        query,
        status: "not_found",
      } satisfies GeocodeResult);
    }
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

