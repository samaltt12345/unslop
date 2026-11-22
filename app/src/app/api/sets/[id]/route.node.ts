import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { learnState, locations, progress, studySets, testResults } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function loadSet(id: number) {
  const [set] = await db.select().from(studySets).where(eq(studySets.id, id));
  if (!set) return null;
  const locs = await db
    .select()
    .from(locations)
    .where(eq(locations.setId, id))
    .orderBy(asc(locations.sortOrder), asc(locations.id));
  return { set, locs };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const setId = parseInt(id, 10);
  if (isNaN(setId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const data = await loadSet(setId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: data.set.id,
    name: data.set.name,
    shareCode: data.set.shareCode,
    createdAt: data.set.createdAt.toISOString(),
    locations: data.locs,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const setId = parseInt(id, 10);
  const body = (await req.json()) as {
    name?: string;
    updateLocation?: {
      id: number;
      lat?: number;
      lng?: number;
      name?: string;
      type?: string;
      needsConfirmation?: boolean;
    };
  };
  if (body.name) {
    await db
      .update(studySets)
      .set({ name: body.name.slice(0, 120) })
      .where(eq(studySets.id, setId));
  }
  if (body.updateLocation) {
    const u = body.updateLocation;
    const patch: Record<string, unknown> = {};
    if (typeof u.lat === "number") patch.lat = u.lat;
    if (typeof u.lng === "number") patch.lng = u.lng;
    if (typeof u.name === "string") patch.name = u.name.slice(0, 120);
    if (typeof u.type === "string") patch.type = u.type;
    if (typeof u.needsConfirmation === "boolean")
      patch.needsConfirmation = u.needsConfirmation;
    if (Object.keys(patch).length) {
      await db.update(locations).set(patch).where(eq(locations.id, u.id));
    }
  }
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Duplicate a set: POST { action: "duplicate", ownerId }
  const { id } = await params;
  const setId = parseInt(id, 10);
  const body = (await req.json()) as { action?: string; ownerId?: string };
  if (body.action !== "duplicate" || !body.ownerId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const data = await loadSet(setId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const [copy] = await db
    .insert(studySets)
    .values({
      ownerId: body.ownerId,
      name: `${data.set.name} (Copy)`.slice(0, 120),
      shareCode: `${data.set.shareCode.split("-")[0]}-${rand}`,
    })
    .returning();
  if (data.locs.length) {
    await db.insert(locations).values(
      data.locs.map((l) => ({
        setId: copy.id,
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
        needsConfirmation: l.needsConfirmation,
        sortOrder: l.sortOrder,
        bboxes: l.bboxes,
        path: l.path,
      }))
    );
  }
  return NextResponse.json({ id: copy.id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const setId = parseInt(id, 10);
  await db.delete(locations).where(eq(locations.setId, setId));
  await db.delete(progress).where(eq(progress.setId, setId));
  await db.delete(testResults).where(eq(testResults.setId, setId));
  await db.delete(learnState).where(eq(learnState.setId, setId));
  await db.delete(studySets).where(eq(studySets.id, setId));
  return NextResponse.json({ ok: true });
}
