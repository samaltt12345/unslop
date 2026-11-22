import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { progress } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  const setId = parseInt(req.nextUrl.searchParams.get("setId") ?? "", 10);
  if (!ownerId || isNaN(setId)) return NextResponse.json({ progress: [] });
  const rows = await db
    .select()
    .from(progress)
    .where(and(eq(progress.ownerId, ownerId), eq(progress.setId, setId)));
  return NextResponse.json({
    progress: rows.map((r) => ({
      locationId: r.locationId,
      mastery: r.mastery,
      correct: r.correct,
      incorrect: r.incorrect,
      studied: r.studied,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    ownerId: string;
    setId: number;
    updates: {
      locationId: number;
      result?: "correct" | "incorrect";
      studied?: boolean;
    }[];
  };
  if (!body.ownerId || !body.setId || !Array.isArray(body.updates)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  for (const u of body.updates) {
    const [existing] = await db
      .select()
      .from(progress)
      .where(
        and(
          eq(progress.ownerId, body.ownerId),
          eq(progress.locationId, u.locationId)
        )
      );
    if (!existing) {
      const mastery = u.result === "correct" ? 1 : 0;
      await db.insert(progress).values({
        ownerId: body.ownerId,
        setId: body.setId,
        locationId: u.locationId,
        mastery,
        correct: u.result === "correct" ? 1 : 0,
        incorrect: u.result === "incorrect" ? 1 : 0,
        studied: u.studied ?? u.result !== undefined,
        lastReviewed: new Date(),
      });
    } else {
      let mastery = existing.mastery;
      if (u.result === "correct") mastery = Math.min(3, mastery + 1);
      if (u.result === "incorrect") mastery = Math.max(0, mastery - 1);
      await db
        .update(progress)
        .set({
          mastery,
          correct: existing.correct + (u.result === "correct" ? 1 : 0),
          incorrect: existing.incorrect + (u.result === "incorrect" ? 1 : 0),
          studied: u.studied ?? (existing.studied || u.result !== undefined),
          lastReviewed: new Date(),
        })
        .where(eq(progress.id, existing.id));
    }
  }
  return NextResponse.json({ ok: true });
}
