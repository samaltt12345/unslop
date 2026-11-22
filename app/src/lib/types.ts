import type { BBox, LatLng } from "./geo";

export type GeoType =
  | "Country"
  | "Continent"
  | "Region"
  | "City"
  | "River"
  | "Mountain"
  | "Mountain Range"
  | "Desert"
  | "Sea"
  | "Ocean"
  | "Lake"
  | "Peninsula"
  | "Island"
  | "Island Group"
  | "Historical Region"
  | "Civilization"
  | "Empire"
  | "Strait"
  | "Canal"
  | "Other";

export interface ResolvedLocation {
  name: string;
  type: GeoType;
  lat: number;
  lng: number;
  radiusKm: number;
  region: string;
  description: string;
  whyItMatters: string;
  aliases: string[];
  approximate: boolean;
  needsConfirmation: boolean;
  source: "gazetteer" | "geocoder" | "manual";
  bboxes?: BBox[] | null;
  path?: LatLng[] | null;
}

export interface GeocodeResult {
  query: string;
  status: "resolved" | "ambiguous" | "not_found";
  resolved?: ResolvedLocation;
  options?: ResolvedLocation[];
}

export interface StudySetDTO {
  id: number;
  name: string;
  shareCode: string;
  createdAt: string;
  locationCount?: number;
  locations?: LocationDTO[];
}

export interface LocationDTO {
  id: number;
  setId: number;
  name: string;
  type: GeoType;
  lat: number;
  lng: number;
  radiusKm: number;
  region: string;
  description: string;
  whyItMatters: string;
  aliases: string[];
  approximate: boolean;
  needsConfirmation: boolean;
  sortOrder: number;
  bboxes?: BBox[] | null;
  path?: LatLng[] | null;
}

export interface ProgressDTO {
  locationId: number;
  mastery: number;
  correct: number;
  incorrect: number;
  studied: boolean;
}

export const MASTERY_LABELS = ["New", "Learning", "Familiar", "Mastered"] as const;

/** Mastery-based marker accents (locations themselves are numbered, not color-coded). */
export const MASTERY_COLORS = ["#475569", "#0284c7", "#d97706", "#16a34a"] as const;
