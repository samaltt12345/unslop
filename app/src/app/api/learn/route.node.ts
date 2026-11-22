import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { learnState } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  const setId = parseInt(req.nextUrl.searchParams.get("setId") ?? "", 10);
  if (!ownerId || isNaN(setId)) return NextResponse.json({ state: null });

  const [row] = await db
    .select()
    .from(learnState)
    .where(and(eq(learnState.ownerId, ownerId), eq(learnState.setId, setId)));

  if (!row) return NextResponse.json({ state: null });
  return NextResponse.json({
    state: {
      batchSize: row.batchSize,
      batchIndex: row.batchIndex,
      levels: row.levels,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      ownerId: string;
      setId: number;
      batchSize: number;
      batchIndex: number;
      levels: Record<string, number>;
      reset?: boolean;
    };
    if (!body.ownerId || !body.setId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (body.reset) {
      await db
        .delete(learnState)
        .where(
          and(
            eq(learnState.ownerId, body.ownerId),
            eq(learnState.setId, body.setId)
          )
        );
      return NextResponse.json({ ok: true, reset: true });
    }

    const [existing] = await db
      .select()
      .from(learnState)
      .where(
        and(
          eq(learnState.ownerId, body.ownerId),
          eq(learnState.setId, body.setId)
        )
      );

    const values = {
      batchSize: body.batchSize ?? 10,
      batchIndex: body.batchIndex ?? 0,
      levels: body.levels ?? {},
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(learnState)
        .set(values)
        .where(eq(learnState.id, existing.id));
    } else {
      await db.insert(learnState).values({
        ownerId: body.ownerId,
        setId: body.setId,
        ...values,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
