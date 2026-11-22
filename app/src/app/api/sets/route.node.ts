import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { locations, studySets } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import type { ResolvedLocation } from "@/lib/types";

export const dynamic = "force-dynamic";

function makeShareCode(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10) || "GEOSET";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  if (!ownerId) return NextResponse.json({ sets: [] });
  const sets = await db
    .select()
    .from(studySets)
    .where(eq(studySets.ownerId, ownerId))
    .orderBy(desc(studySets.createdAt));
  const ids = sets.map((s) => s.id);
  const counts = new Map<number, number>();
  if (ids.length) {
    const locs = await db
      .select({ setId: locations.setId })
      .from(locations)
      .where(inArray(locations.setId, ids));
    for (const l of locs) counts.set(l.setId, (counts.get(l.setId) ?? 0) + 1);
  }
  return NextResponse.json({
    sets: sets.map((s) => ({
      id: s.id,
      name: s.name,
      shareCode: s.shareCode,
      createdAt: s.createdAt.toISOString(),
      locationCount: counts.get(s.id) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      ownerId: string;
      name: string;
      locations: (ResolvedLocation & { needsConfirmation?: boolean })[];
    };
    if (!body.ownerId || !body.name || !Array.isArray(body.locations)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const [set] = await db
      .insert(studySets)
      .values({
        ownerId: body.ownerId,
        name: body.name.slice(0, 120),
        shareCode: makeShareCode(body.name),
      })
      .returning();

    if (body.locations.length) {
      await db.insert(locations).values(
        body.locations.map((l, i) => ({
          setId: set.id,
          name: l.name.slice(0, 120),
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
        }))
      );
    }
    return NextResponse.json({ id: set.id, shareCode: set.shareCode });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create set" }, { status: 500 });
  }
}
