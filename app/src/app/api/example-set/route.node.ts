import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { locations, studySets } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { EXAMPLE_SET, resolveExampleLocations } from "@/lib/exampleSet";

export const dynamic = "force-dynamic";

/**
 * Creates (or reopens) the built-in example study set for a visitor.
 * Resolution happens server-side against the curated gazetteer, so no
 * network geocoding is involved and every place is exactly placed.
 */
export async function POST(req: NextRequest) {
  try {
    const { ownerId } = (await req.json()) as { ownerId?: string };
    if (!ownerId) {
      return NextResponse.json({ error: "Missing ownerId" }, { status: 400 });
    }

    // Reuse the visitor's existing copy instead of creating duplicates.
    const [existing] = await db
      .select()
      .from(studySets)
      .where(
        and(eq(studySets.ownerId, ownerId), eq(studySets.name, EXAMPLE_SET.name))
      )
      .orderBy(desc(studySets.createdAt))
      .limit(1);

    if (existing) {
      // Correct the old modern-Macedonia row in place, preserving its progress ID.
      const ancient = resolveExampleLocations().find((location) => location.name === "Macedonia")!;
      const { source, ...fields } = ancient;
      void source;
      await db.update(locations).set(fields).where(and(
        eq(locations.setId, existing.id), eq(locations.name, "Macedonia"), eq(locations.type, "Country")
      ));
      return NextResponse.json({ id: existing.id, reused: true });
    }

    const resolved = resolveExampleLocations();

    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const [set] = await db
      .insert(studySets)
      .values({
        ownerId,
        name: EXAMPLE_SET.name,
        shareCode: `EUROPE-${rand}`,
      })
      .returning();

    await db.insert(locations).values(
      resolved.map((l, i) => ({
        setId: set.id,
        name: l.name,
        type: l.type,
        lat: l.lat,
        lng: l.lng,
        radiusKm: l.radiusKm,
        region: l.region,
        description: l.description,
        whyItMatters: l.whyItMatters,
        aliases: l.aliases,
        approximate: l.approximate,
        needsConfirmation: false,
        sortOrder: i,
        bboxes: l.bboxes ?? null,
        path: l.path ?? null,
      }))
    );

    return NextResponse.json({ id: set.id, count: resolved.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create the example set" },
      { status: 500 }
    );
  }
}
