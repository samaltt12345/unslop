"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GeoMap, { GeoMapHandle } from "@/components/GeoMap";
import { getProgress, getSet, postProgress } from "@/lib/client";
import type { LocationDTO, ProgressDTO, StudySetDTO } from "@/lib/types";
import { MASTERY_LABELS } from "@/lib/types";
import { formatDistance, gradeClick, shuffle } from "@/lib/geo";
import AtlasHeader from "@/components/AtlasHeader";
import {Icon} from "@/components/Icons";

type Direction = "where" | "what" | "mixed";

interface Card {
  loc: LocationDTO;
  kind: "where" | "what";
}

export default function FlashcardsPage() {
  const params = useParams<{ id: string }>();
  const setId = parseInt(params.id, 10);
  const mapRef = useRef<GeoMapHandle>(null);

  const [set, setSet] = useState<(StudySetDTO & { locations: LocationDTO[] }) | null>(null);
  const [prog, setProg] = useState<Map<number, ProgressDTO>>(new Map());
  const [direction, setDirection] = useState<Direction | null>(null);
  const [queue, setQueue] = useState<Card[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [gotIt, setGotIt] = useState(0);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);
  /** Where the student thinks the place is (the ✕ they drop on the map). */
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getSet(setId).then(setSet).catch(() => {});
    getProgress(setId).then((rows) =>
      setProg(new Map(rows.map((r) => [r.locationId, r])))
    );
  }, [setId]);

  const buildQueue = useCallback(
    (dir: Direction) => {
      if (!set) return;
      // Priority: low mastery + more misses first (spaced-repetition inspired)
      const weighted = [...set.locations].sort((a, b) => {
        const pa = prog.get(a.id);
        const pb = prog.get(b.id);
        const wa = (3 - (pa?.mastery ?? 0)) * 2 + (pa?.incorrect ?? 0) + Math.random();
        const wb = (3 - (pb?.mastery ?? 0)) * 2 + (pb?.incorrect ?? 0) + Math.random();
        return wb - wa;
      });
      const cards: Card[] = weighted.map((loc, i) => ({
        loc,
        kind:
          dir === "mixed" ? (i % 2 === 0 ? "where" : "what") : dir,
      }));
      setQueue(dir === "mixed" ? shuffle(cards) : cards);
      setPos(0);
      setRevealed(false);
      setGuess(null);
      setDone(0);
      setGotIt(0);
      setStreak(0);
      setFinished(false);
      setDirection(dir);
    },
    [set, prog]
  );

  const card = queue[pos] ?? null;

  const shapeOf = (l: LocationDTO) => ({
    lat: l.lat,
    lng: l.lng,
    radiusKm: l.radiusKm,
    bboxes: l.bboxes,
    featureName: l.name,
    path: l.path,
  });

  /** How far the student's ✕ was from the real feature. */
  const guessResult = useMemo(() => {
    if (!card || !guess) return null;
    return gradeClick(guess.lat, guess.lng, shapeOf(card.loc), 1.4);
  }, [card, guess]);

  // Map behavior per card state
  useEffect(() => {
    if (!card) return;
    const m = mapRef.current;
    if (!m) return;
    if (card.kind === "where" && !revealed) {
      // Student must find it themselves — show the whole world, unlabeled.
      m.resetView();
      m.clearClickMarker();
    } else {
      m.flyToShape(shapeOf(card.loc));
    }
  }, [card, revealed]);

  async function answer(correct: boolean) {
    if (!card) return;
    const cur = prog.get(card.loc.id);
    const newMastery = correct
      ? Math.min(3, (cur?.mastery ?? 0) + 1)
      : Math.max(0, (cur?.mastery ?? 0) - 1);
    const next = new Map(prog);
    next.set(card.loc.id, {
      locationId: card.loc.id,
      mastery: newMastery,
      correct: (cur?.correct ?? 0) + (correct ? 1 : 0),
      incorrect: (cur?.incorrect ?? 0) + (correct ? 0 : 1),
      studied: true,
    });
    setProg(next);
    postProgress(setId, [
      { locationId: card.loc.id, result: correct ? "correct" : "incorrect" },
    ]);

    setDone((d) => d + 1);
    if (correct) {
      setGotIt((g) => g + 1);
      const s = streak + 1;
      setStreak(s);
      if (s > 0 && s % 5 === 0) setMessage(`${s} correct in a row!`);
      else if (newMastery === 3) setMessage(`${card.loc.name} mastered!`);
      else setMessage("");
    } else {
      setStreak(0);
      setMessage(`You'll see ${card.loc.name} again soon.`);
    }

    setRevealed(false);
    setGuess(null);
    if (correct) {
      if (pos + 1 >= queue.length) {
        setFinished(true);
        window.dispatchEvent(new CustomEvent("atlas:celebrate", { detail: "Deck complete. Familiar ground, one place at a time." }));
      }
      else setPos(pos + 1);
    } else {
      // "Again": reinsert the card a few positions later
      const newQueue = [...queue];
      const [c] = newQueue.splice(pos, 1);
      const insertAt = Math.min(pos + 3, newQueue.length);
      newQueue.splice(insertAt, 0, c);
      setQueue(newQueue);
      if (pos >= newQueue.length) setFinished(true);
    }
  }

  if (!set) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-500">
        Loading flashcards…
      </div>
    );
  }

  if (!direction) {
    return (
      <Shell setId={setId} title="Flashcards" setName={set.name}>
        <div className="atlas-session-config mx-auto w-full max-w-xl px-6 py-10">
          <h2 className="text-center text-xl font-bold">Find your rhythm.</h2>
          <div className="mt-6 space-y-3">
            <ModeCard
              icon="globe"
              title="Where is it?"
              body="Find the place, then reveal the answer on the map."
              onClick={() => buildQueue("where")}
            />
            <ModeCard
              icon="target"
              title="What is this location?"
              body="A location is highlighted on the map — name it, then reveal the answer."
              onClick={() => buildQueue("what")}
            />
            <ModeCard
              icon="layers"
              title="Mixed"
              body="Both directions, shuffled — the closest thing to a real test."
              onClick={() => buildQueue("mixed")}
            />
          </div>
          <p className="mt-6 text-center text-xs text-ink-500">
            The places you miss return sooner. Familiar ground is just a few flips away.
          </p>
        </div>
      </Shell>
    );
  }

  if (finished || !card) {
    const pct = done ? Math.round((gotIt / done) * 100) : 0;
    return (
      <Shell setId={setId} title="Flashcards" setName={set.name}>
        <div className="mx-auto max-w-md px-4 py-14 text-center">
          <div className="calm-result-icon"><Icon name={pct >= 80 ? "spark" : "flag"}/></div>
          <h2 className="mt-3 text-2xl font-bold">Deck complete!</h2>
          <p className="mt-2 text-ink-600">
            {gotIt} of {done} correct ({pct}%)
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => buildQueue(direction)}
              className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Study again
            </button>
            <Link
              href={`/set/${setId}/test`}
              className="rounded-xl border border-ink-300 px-6 py-3 font-semibold text-ink-700 hover:bg-ink-50"
            >
              Take a test <Icon name="arrow" size={17} className="calm-inline-icon"/>
            </Link>
            <a
              href={`/set/${setId}`}
              className="rounded-xl px-6 py-3 font-medium text-ink-500 hover:text-ink-800"
            >
              Back to map
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  const mastery = prog.get(card.loc.id)?.mastery ?? 0;

  return (
    <Shell setId={setId} title="Flashcards" setName={set.name}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Question bar */}
        <div className="border-b border-ink-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-ink-400">
                Card {done + 1} · {MASTERY_LABELS[mastery]}
              </div>
              <h2 className="text-lg font-bold sm:text-xl">
                {card.kind === "where" ? (
                  <>Where is <span className="text-brand-700">{card.loc.name}</span>?</>
                ) : (
                  <>What is this location?</>
                )}
              </h2>
            </div>
            <div className="text-right text-xs text-ink-500">
              <div>{gotIt}/{done} correct</div>
              {streak >= 2 && <div className="font-semibold text-orange-500"><Icon name="spark" size={16} className="calm-inline-icon"/>{streak} streak</div>}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative min-h-0 flex-1">
          <GeoMap
            ref={mapRef}
            markers={[]}
            blank
            fitOnLoad={false}
            highlight={
              card.kind === "what" || revealed
                ? {
                    ...shapeOf(card.loc),
                    approximate: card.loc.approximate,
                    color: revealed ? "#16a34a" : "#f59e0b",
                    label: revealed ? card.loc.name : undefined,
                  }
                : null
            }
            clickMarker={
              card.kind === "where" && guess
                ? {
                    ...guess,
                    color: revealed
                      ? guessResult?.correct
                        ? "#16a34a"
                        : "#dc2626"
                      : "#2563eb",
                  }
                : null
            }
            connector={
              revealed && guess && card.kind === "where" && !guessResult?.correct
                ? { from: [guess.lat, guess.lng], to: [card.loc.lat, card.loc.lng] }
                : null
            }
            onMapClick={(lat, lng) => {
              if (card.kind === "where" && !revealed) setGuess({ lat, lng });
            }}
          />

          {/* Prompt / feedback banner */}
          {card.kind === "where" && !revealed && (
            <div className="absolute inset-x-0 top-3 z-[500] mx-auto w-fit max-w-[92%] rounded-full bg-ink-950/85 px-4 py-1.5 text-center text-sm font-medium text-white shadow">
              {guess
                ? "✕ placed — tap the map to move it, then Show Answer"
                : "Click the map to mark where you think it is"}
            </div>
          )}
          {revealed && guessResult && card.kind === "where" && (
            <div
              className={`absolute inset-x-0 top-3 z-[500] mx-auto w-fit max-w-[92%] rounded-full px-5 py-2 text-center text-sm font-semibold text-white shadow-lg ${
                guessResult.correct ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {guessResult.correct
                ? guessResult.distanceKm < 1
                  ? "✓ Spot on — your ✕ landed inside it!"
                  : `✓ Nice! You were only ${formatDistance(guessResult.distanceKm)} off.`
                : `✗ You were ${formatDistance(guessResult.distanceKm)} away.`}
            </div>
          )}
          {message && !(revealed && guessResult) && (
            <div className="absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-ink-950/90 px-4 py-1.5 text-sm font-medium text-white shadow">
              {message}
            </div>
          )}

          {revealed && (
            <div className="absolute inset-x-2 bottom-2 z-[500] mx-auto max-w-md rounded-2xl border border-ink-200 bg-white p-4 shadow-xl">
              <div className="font-bold">{card.loc.name}</div>
              <div className="text-xs font-semibold text-ink-500">
                {card.loc.type}
                {card.loc.region ? ` · ${card.loc.region}` : ""}
              </div>
              {(card.loc.whyItMatters || card.loc.description) && (
                <p className="mt-1.5 text-sm text-ink-600">
                  {card.loc.whyItMatters || card.loc.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="border-t border-ink-200 bg-white px-4 py-3">
          <div className="mx-auto max-w-3xl">
            {!revealed ? (
              <div className="flex gap-2">
                {card.kind === "where" && guess && (
                  <button
                    onClick={() => setGuess(null)}
                    className="rounded-xl border border-ink-300 px-4 py-3.5 text-sm font-medium text-ink-600 hover:bg-ink-50"
                  >
                    Clear ✕
                  </button>
                )}
                <button
                  onClick={() => setRevealed(true)}
                  className="flex-1 rounded-xl bg-ink-950 px-6 py-3.5 text-base font-semibold text-white hover:bg-ink-700"
                >
                  Show Answer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => answer(false)}
                  className={`rounded-xl bg-red-50 px-6 py-3.5 text-base font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 ${
                    guessResult && !guessResult.correct ? "ring-2 ring-red-400" : ""
                  }`}
                >
                  <Icon name="arrow" size={17} className="calm-inline-icon" style={{transform:"rotate(180deg)"}}/>Again
                </button>
                <button
                  onClick={() => answer(true)}
                  className={`rounded-xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-green-700 ${
                    guessResult?.correct ? "ring-2 ring-green-300 ring-offset-2" : ""
                  }`}
                >
                  Got It <Icon name="arrow" size={17} className="calm-inline-icon"/>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  setId,
  title,
  setName,
  children,
}: {
  setId: number;
  title: string;
  setName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="atlas-session-shell flex h-dvh flex-col bg-ink-50">
      <AtlasHeader setId={setId} title={title} setName={setName}/>
      {children}
    </div>
  );
}

function ModeCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: string;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="atlas-session-choice w-full rounded-2xl border border-ink-200 bg-white p-4 text-left shadow-sm hover:border-brand-400 hover:shadow transition"
    >
      <div className="flex items-center gap-3">
        <span className="atlas-session-mode-icon"><Icon name={icon} size={26}/></span>
        <div>
          <div className="font-bold">{title}</div>
          <div className="mt-0.5 text-sm text-ink-600">{body}</div>
        </div>
      </div>
    </button>
  );
}
