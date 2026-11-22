import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testResults } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Leaderboard for one study set, across everyone who used its share code.
 * Ranked by accuracy first, then by fastest time.
 */
export async function GET(req: NextRequest) {
  const setId = parseInt(req.nextUrl.searchParams.get("setId") ?? "", 10);
  if (isNaN(setId)) return NextResponse.json({ entries: [] });

  const rows = await db
    .select()
    .from(testResults)
    .where(eq(testResults.setId, setId));

  const entries = rows
    .map((r) => ({
      id: r.id,
      ownerId: r.ownerId,
      playerName: r.playerName || "Anonymous",
      score: r.score,
      total: r.total,
      accuracy: r.total ? Math.round((r.score / r.total) * 100) : 0,
      durationSec: r.durationSec,
      mode: r.mode,
      createdAt: r.createdAt.toISOString(),
    }))
    .sort(
      (a, b) =>
        b.accuracy - a.accuracy ||
        a.durationSec - b.durationSec ||
        a.createdAt.localeCompare(b.createdAt)
    )
    .slice(0, 100);

  return NextResponse.json({ entries });
}
