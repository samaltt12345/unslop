import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testResults } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  const setId = parseInt(req.nextUrl.searchParams.get("setId") ?? "", 10);
  if (!ownerId || isNaN(setId)) return NextResponse.json({ results: [] });
  const rows = await db
    .select()
    .from(testResults)
    .where(and(eq(testResults.ownerId, ownerId), eq(testResults.setId, setId)))
    .orderBy(desc(testResults.createdAt))
    .limit(20);
  return NextResponse.json({
    results: rows.map((r) => ({
      id: r.id,
      score: r.score,
      total: r.total,
      durationSec: r.durationSec,
      mode: r.mode,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    ownerId: string;
    setId: number;
    playerName?: string;
    score: number;
    total: number;
    durationSec: number;
    mode: string;
    details: {
      locationId: number;
      locationName: string;
      correct: boolean;
      userAnswer: string;
      distanceKm?: number;
      kind: string;
    }[];
  };
  if (!body.ownerId || !body.setId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const [row] = await db
    .insert(testResults)
    .values({
      ownerId: body.ownerId,
      setId: body.setId,
      playerName: (body.playerName || "Anonymous").slice(0, 40),
      score: body.score,
      total: body.total,
      durationSec: body.durationSec,
      mode: body.mode ?? "mixed",
      details: body.details ?? [],
    })
    .returning();
  return NextResponse.json({ id: row.id });
}
