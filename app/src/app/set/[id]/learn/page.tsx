"use client";
import { Icon } from "@/components/Icons";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GeoMap, { GeoMapHandle } from "@/components/GeoMap";
import {
  getLearnState,
  getProgress,
  getSet,
  postProgress,
  resetLearnState,
  saveLearnState,
} from "@/lib/client";
import type { LocationDTO, ProgressDTO, StudySetDTO } from "@/lib/types";
import { answerMatches, formatDistance, gradeClick, shuffle } from "@/lib/geo";
import AtlasHeader from "@/components/AtlasHeader";

/** Levels: 0 new → 1 recognized → 2 located → 3 recalled (learned). */
const TARGET = 3;
const REVIEW_PER_BATCH = 4;
const BATCH_SIZES = [5, 10, 15, 20] as const;

type Phase =
  | "loading"
  | "setup"
  | "teach"
  | "question"
  | "feedback"
  | "batchdone"
  | "alldone";

type QKind = "choose" | "locate" | "recall";

interface Item {
  loc: LocationDTO;
  level: number;
  misses: number;
  seen: boolean;
  review: boolean;
}

const shapeOf = (l: LocationDTO) => ({
  lat: l.lat,
  lng: l.lng,
  radiusKm: l.radiusKm,
  bboxes: l.bboxes,
    featureName: l.name,
  path: l.path,
});

function kindForLevel(level: number): QKind {
  if (level <= 0) return "choose";
  if (level === 1) return "locate";
  return "recall";
}

export default function LearnPage() {
  const params = useParams<{ id: string }>();
  const setId = parseInt(params.id, 10);
  const mapRef = useRef<GeoMapHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [set, setSet] = useState<(StudySetDTO & { locations: LocationDTO[] }) | null>(null);
  const [prog, setProg] = useState<Map<number, ProgressDTO>>(new Map());
  const [saved, setSaved] = useState<{
    batchSize: number;
    batchIndex: number;
    levels: Record<string, number>;
  } | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [batchSize, setBatchSize] = useState(10);
  const [batchIndex, setBatchIndex] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [typed, setTyped] = useState("");
  const [pendingClick, setPendingClick] = useState<{ lat: number; lng: number } | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    distanceKm?: number;
    clickLat?: number;
    clickLng?: number;
    given: string;
  } | null>(null);

  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [gotRight, setGotRight] = useState(0);
  const [justLearned, setJustLearned] = useState<string[]>([]);

  // ---------- load ----------
  useEffect(() => {
    if (isNaN(setId)) return;
    Promise.all([
      getSet(setId),
      getProgress(setId).catch(() => []),
      getLearnState(setId).catch(() => null),
    ])
      .then(([s, p, st]) => {
        setSet(s);
        setProg(new Map(p.map((r) => [r.locationId, r])));
        if (st) {
          setSaved(st);
          setBatchSize(st.batchSize || 10);
        }
        setPhase("setup");
      })
      .catch(() => setPhase("setup"));
  }, [setId]);

  const locations = useMemo(() => set?.locations ?? [], [set]);

  const numberOf = useMemo(() => {
    const m = new Map<number, number>();
    locations.forEach((l, i) => m.set(l.id, i + 1));
    return m;
  }, [locations]);

  const batches = useMemo(() => {
    const out: LocationDTO[][] = [];
    for (let i = 0; i < locations.length; i += batchSize) {
      out.push(locations.slice(i, i + batchSize));
    }
    return out;
  }, [locations, batchSize]);

  const current = useMemo(
    () => items.find((i) => i.loc.id === currentId) ?? null,
    [items, currentId]
  );

  const batchItems = useMemo(() => items.filter((i) => !i.review), [items]);
  const learnedInBatch = batchItems.filter((i) => i.level >= TARGET).length;

  // ---------- persistence ----------
  const persist = useCallback(
    (nextItems: Item[], nextBatch: number) => {
      const levels: Record<string, number> = { ...(saved?.levels ?? {}) };
      for (const it of nextItems) levels[String(it.loc.id)] = it.level;
      const state = { batchSize, batchIndex: nextBatch, levels };
      setSaved(state);
      saveLearnState(setId, state);
    },
    [batchSize, saved, setId]
  );

  // ---------- queue ----------
  const pickNext = useCallback((list: Item[], avoidId: number | null): Item | null => {
    const pending = list.filter((i) => i.level < TARGET);
    if (!pending.length) return null;
    const scored = [...pending].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      if (a.misses !== b.misses) return b.misses - a.misses;
      return Math.random() - 0.5;
    });
    if (scored.length > 1 && scored[0].loc.id === avoidId) return scored[1];
    return scored[0];
  }, []);

  const buildChoices = useCallback(
    (target: LocationDTO, pool: Item[]) => {
      const others = shuffle(
        pool.map((i) => i.loc).filter((l) => l.id !== target.id)
      );
      const extra = shuffle(locations.filter((l) => l.id !== target.id));
      const names: string[] = [];
      for (const l of [...others, ...extra]) {
        if (names.length >= 3) break;
        if (!names.includes(l.name)) names.push(l.name);
      }
      setChoices(shuffle([target.name, ...names]));
    },
    [locations]
  );

  const advance = useCallback(
    (list: Item[], avoidId: number | null) => {
      const next = pickNext(list, avoidId);
      setTyped("");
      setPendingClick(null);
      setFeedback(null);
      mapRef.current?.clearClickMarker();
      if (!next) {
        setCurrentId(null);
        setPhase("batchdone");
        return;
      }
      setCurrentId(next.loc.id);
      if (!next.seen) {
        setPhase("teach");
      } else {
        if (kindForLevel(next.level) === "choose") buildChoices(next.loc, list);
        setPhase("question");
      }
    },
    [pickNext, buildChoices]
  );

  // ---------- batch control ----------
  const startBatch = useCallback(
    (idx: number, levels: Record<string, number> = {}) => {
      const batch = batches[idx] ?? [];
      const list: Item[] = batch.map((loc) => {
        const lv = levels[String(loc.id)] ?? 0;
        return { loc, level: lv, misses: 0, seen: lv > 0, review: false };
      });

      // Mix in the weakest already-learned places so earlier batches stay fresh.
      if (idx > 0) {
        const prior = batches.slice(0, idx).flat();
        const weakest = [...prior]
          .sort(
            (a, b) =>
              (prog.get(a.id)?.mastery ?? 0) - (prog.get(b.id)?.mastery ?? 0)
          )
          .slice(0, REVIEW_PER_BATCH);
        for (const loc of weakest) {
          list.push({ loc, level: 2, misses: 0, seen: true, review: true });
        }
      }

      setBatchIndex(idx);
      setItems(list);
      setJustLearned([]);
      setStreak(0);
      if (list.every((i) => i.level >= TARGET)) {
        setCurrentId(null);
        setPhase("batchdone");
      } else {
        advance(list, null);
      }
    },
    [batches, prog, advance]
  );

  // ---------- map framing ----------
  useEffect(() => {
    if (!current) return;
    const m = mapRef.current;
    if (!m) return;
    const kind = kindForLevel(current.level);
    if (phase === "teach" || phase === "feedback") {
      m.flyToShape(shapeOf(current.loc));
    } else if (phase === "question") {
      if (kind === "locate") m.resetView();
      else m.flyToShape(shapeOf(current.loc));
      if (kind === "recall") setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [current, phase]);

  // ---------- answering ----------
  function applyResult(correct: boolean, extra: Partial<NonNullable<typeof feedback>>, given: string) {
    if (!current) return;
    const wasLevel = current.level;
    const newLevel = correct
      ? Math.min(TARGET, wasLevel + 1)
      : Math.max(0, wasLevel - 1);

    const next = items.map((i) =>
      i.loc.id === current.loc.id
        ? { ...i, level: newLevel, misses: i.misses + (correct ? 0 : 1), seen: true }
        : i
    );
    setItems(next);
    setAnswered((n) => n + 1);
    setGotRight((n) => n + (correct ? 1 : 0));
    setStreak(correct ? streak + 1 : 0);
    if (correct && newLevel >= TARGET && wasLevel < TARGET && !current.review) {
      setJustLearned((j) => [...j, current.loc.name]);
      window.dispatchEvent(new CustomEvent("atlas:celebrate", { detail: `${current.loc.name}, learned three ways.` }));
    }

    setFeedback({ correct, given, ...extra });
    setPhase("feedback");

    postProgress(setId, [
      { locationId: current.loc.id, result: correct ? "correct" : "incorrect", studied: true },
    ]).catch(() => {});
    persist(next, batchIndex);
  }

  function submitChoice(choice: string) {
    if (!current) return;
    applyResult(choice === current.loc.name, {}, choice);
  }

  function submitRecall() {
    if (!current || !typed.trim()) return;
    applyResult(
      answerMatches(typed, current.loc.name, current.loc.aliases),
      {},
      typed.trim()
    );
  }

  function submitLocate() {
    if (!current || !pendingClick) return;
    const g = gradeClick(pendingClick.lat, pendingClick.lng, shapeOf(current.loc), 1.4);
    applyResult(
      g.correct,
      {
        distanceKm: g.distanceKm,
        clickLat: pendingClick.lat,
        clickLng: pendingClick.lng,
      },
      "map click"
    );
  }

  function continueFromTeach() {
    if (!current) return;
    const next = items.map((i) =>
      i.loc.id === current.loc.id ? { ...i, seen: true } : i
    );
    setItems(next);
    buildChoices(current.loc, next);
    setPhase("question");
  }

  function nextQuestion() {
    advance(items, currentId);
  }

  function nextBatch() {
    const n = batchIndex + 1;
    if (n >= batches.length) {
      persist(items, batches.length - 1);
      setPhase("alldone");
      return;
    }
    persist(items, n);
    startBatch(n, saved?.levels ?? {});
  }

  // ---------- render ----------
  if (phase === "loading" || !set) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 text-ink-500">
        <Icon name="book" size={25}/> Loading Learn mode…
      </div>
    );
  }

  const batchLabel = (idx: number) => {
    const b = batches[idx];
    if (!b?.length) return "";
    const first = numberOf.get(b[0].id) ?? 0;
    const last = numberOf.get(b[b.length - 1].id) ?? 0;
    return `${first}–${last}`;
  };

  // ============ SETUP ============
  if (phase === "setup") {
    const savedLevels = saved?.levels ?? {};
    const learnedCount = locations.filter(
      (l) => (savedLevels[String(l.id)] ?? 0) >= TARGET
    ).length;
    const resumeIdx = Math.min(saved?.batchIndex ?? 0, Math.max(batches.length - 1, 0));
    // Any partial level counts as progress, so half-finished drilling is never
    // silently thrown away when returning to this screen.
    const startedCount = locations.filter(
      (l) => (savedLevels[String(l.id)] ?? 0) > 0
    ).length;
    const hasProgress = startedCount > 0 || (saved?.batchIndex ?? 0) > 0;

    return (
      <Shell setId={setId} setName={set.name}>
        <div className="mx-auto w-full max-w-md px-4 py-8">
          <div className="text-center">
            <div className="calm-result-icon"><Icon name="book"/></div>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-950">
              Learn Mode
            </h2>
            <p className="mt-2 text-ink-600">
              Drills your set in small groups until every place sticks. You&apos;ll
              master locations {batchLabel(0)}, then the next group, and so on.
            </p>
          </div>

          {hasProgress && (
            <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <div className="text-sm font-bold text-brand-700">
                Welcome back — {learnedCount} of {locations.length} learned
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{
                    width: `${(learnedCount / Math.max(locations.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <button
                onClick={() => startBatch(resumeIdx, savedLevels)}
                className="mt-3 w-full rounded-xl bg-brand-600 px-5 py-3 font-bold text-white transition hover:bg-brand-700"
              >
                Resume group {batchLabel(resumeIdx)} →
              </button>
            </div>
          )}

          <div className="mt-6">
            <div className="text-sm font-bold text-ink-700">Locations per group</div>
            <div className="mt-2 flex gap-2">
              {BATCH_SIZES.map((n) => (
                <button
                  key={n}
                  onClick={() => setBatchSize(n)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    batchSize === n
                      ? "bg-ink-950 text-white"
                      : "bg-white text-ink-700 ring-1 ring-ink-300 hover:bg-ink-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {batches.length} group{batches.length === 1 ? "" : "s"} ·{" "}
              {locations.length} locations. Each place is drilled three ways —
              recognize it, find it on a blank map, then name it from memory.
            </p>
          </div>

          <button
            onClick={() => startBatch(0, hasProgress ? savedLevels : {})}
            disabled={!locations.length}
            className="mt-6 w-full rounded-xl bg-ink-950 px-6 py-4 text-base font-bold text-white shadow-lg shadow-ink-950/10 transition hover:-translate-y-0.5 hover:bg-ink-800 disabled:opacity-40"
          >
            {hasProgress ? `Start over from ${batchLabel(0)}` : `Start with ${batchLabel(0)} →`}
          </button>

          {hasProgress && (
            <button
              onClick={async () => {
                await resetLearnState(setId);
                setSaved(null);
              }}
              className="mt-2 w-full rounded-xl px-6 py-2.5 text-sm font-semibold text-ink-500 hover:text-red-600"
            >
              Reset Learn progress
            </button>
          )}
        </div>
      </Shell>
    );
  }

  // ============ BATCH COMPLETE ============
  if (phase === "batchdone") {
    const isLast = batchIndex + 1 >= batches.length;
    return (
      <Shell setId={setId} setName={set.name}>
        <div className="mx-auto w-full max-w-md px-4 py-10 text-center">
          <div className="calm-result-icon"><Icon name="check"/></div>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-950">
            Group {batchLabel(batchIndex)} locked in!
          </h2>
          <p className="mt-2 text-ink-600">
            You recognized, located, and named every one from memory.
          </p>

          {justLearned.length > 0 && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-left">
              <div className="text-sm font-bold text-green-700">
                Learned this round
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {justLearned.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-2">
            {!isLast ? (
              <button
                onClick={nextBatch}
                className="rounded-xl bg-brand-600 px-6 py-3.5 font-bold text-white transition hover:bg-brand-700"
              >
                Next group: {batchLabel(batchIndex + 1)} →
              </button>
            ) : (
              <button
                onClick={() => setPhase("alldone")}
                className="rounded-xl bg-brand-600 px-6 py-3.5 font-bold text-white transition hover:bg-brand-700"
              >
                Finish <Icon name="arrow" size={17} className="calm-inline-icon"/>
              </button>
            )}
            <button
              onClick={() => startBatch(batchIndex, {})}
              className="rounded-xl border border-ink-300 bg-white px-6 py-3 font-semibold text-ink-700 hover:bg-ink-50"
            >
              <Icon name="repeat" size={17} className="calm-inline-icon"/>Drill this group again
            </button>
            <a
              href={`/set/${setId}`}
              className="rounded-xl px-6 py-3 text-center font-medium text-ink-500 hover:text-ink-800"
            >
              <Icon name="arrow" size={17} className="calm-inline-icon" style={{transform:"rotate(180deg)"}}/>Back to Map
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  // ============ ALL DONE ============
  if (phase === "alldone") {
    return (
      <Shell setId={setId} setName={set.name}>
        <div className="mx-auto w-full max-w-md px-4 py-12 text-center">
          <div className="calm-result-icon"><Icon name="trophy"/></div>
          <h2 className="mt-3 font-display text-3xl font-extrabold text-ink-950">
            Whole set learned!
          </h2>
          <p className="mt-2 text-ink-600">
            You worked through all {locations.length} locations in{" "}
            {batches.length} groups. Prove it on a full test.
          </p>
          <div className="mt-7 grid gap-2">
            <Link
              href={`/set/${setId}/test?blank=1`}
              className="rounded-xl bg-ink-950 px-6 py-3.5 font-bold text-white transition hover:bg-ink-800"
            >
              <Icon name="globe" size={18} className="calm-inline-icon"/>Take the blank map test
            </Link>
            <button
              onClick={() => startBatch(0, {})}
              className="rounded-xl border border-ink-300 bg-white px-6 py-3 font-semibold text-ink-700 hover:bg-ink-50"
            >
              <Icon name="repeat" size={17} className="calm-inline-icon"/>Run the whole set again
            </button>
            <a
              href={`/set/${setId}`}
              className="rounded-xl px-6 py-3 text-center font-medium text-ink-500 hover:text-ink-800"
            >
              <Icon name="arrow" size={17} className="calm-inline-icon" style={{transform:"rotate(180deg)"}}/>Back to Map
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  // ============ TEACH / QUESTION / FEEDBACK ============
  if (!current) return null;
  const kind = kindForLevel(current.level);
  const num = numberOf.get(current.loc.id);
  const batchPct = batchItems.length
    ? (learnedInBatch / batchItems.length) * 100
    : 0;

  const promptText =
    phase === "teach"
      ? "Study this location"
      : kind === "choose"
        ? "Which location is highlighted?"
        : kind === "locate"
          ? `Click ${current.loc.name} on the map`
          : "Name this location from memory";

  return (
    <Shell setId={setId} setName={set.name}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* progress */}
        <div className="h-1.5 bg-ink-200">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${batchPct}%` }}
          />
        </div>

        <div className="border-b border-ink-200 bg-white px-4 py-2.5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-ink-400">
                Group {batchLabel(batchIndex)} · {learnedInBatch}/{batchItems.length} learned
                {current.review && " · review"}
              </div>
              <h2 className="truncate font-display text-lg font-bold text-ink-950">
                {promptText}
              </h2>
            </div>
            <div className="shrink-0 text-right text-xs text-ink-500">
              <div>{gotRight}/{answered} correct</div>
              {streak >= 3 && (
                <div className="font-bold text-orange-500"><Icon name="spark" size={16} className="calm-inline-icon"/>{streak}</div>
              )}
            </div>
          </div>
        </div>

        {/* map */}
        <div className="relative min-h-0 flex-1">
          <GeoMap
            ref={mapRef}
            markers={[]}
            blank
            labelMode="none"
            fitOnLoad={false}
            highlight={
              phase === "teach" || phase === "feedback" || kind !== "locate"
                ? {
                    ...shapeOf(current.loc),
                    approximate: current.loc.approximate,
                    color:
                      phase === "feedback"
                        ? feedback?.correct
                          ? "#16a34a"
                          : "#dc2626"
                        : "#f59e0b",
                    label:
                      phase === "teach" || phase === "feedback"
                        ? current.loc.name
                        : undefined,
                  }
                : null
            }
            clickMarker={
              pendingClick
                ? { ...pendingClick, color: "#4f46e5" }
                : phase === "feedback" && feedback?.clickLat !== undefined
                  ? {
                      lat: feedback.clickLat,
                      lng: feedback.clickLng!,
                      color: feedback.correct ? "#16a34a" : "#dc2626",
                    }
                  : null
            }
            connector={
              phase === "feedback" &&
              feedback?.clickLat !== undefined &&
              !feedback.correct
                ? {
                    from: [feedback.clickLat, feedback.clickLng!],
                    to: [current.loc.lat, current.loc.lng],
                  }
                : null
            }
            onMapClick={(lat, lng) => {
              if (phase === "question" && kind === "locate")
                setPendingClick({ lat, lng });
            }}
          />

          {phase === "question" && kind === "locate" && (
            <div className="absolute inset-x-0 top-3 z-[500] mx-auto w-fit max-w-[92%] rounded-full bg-ink-950/85 px-4 py-1.5 text-center text-sm font-medium text-white shadow">
              {pendingClick ? "Tap Check to submit" : "Click where you think it is"}
            </div>
          )}

          {phase === "feedback" && feedback && (
            <div
              className={`absolute inset-x-0 top-3 z-[600] mx-auto w-fit max-w-[92%] rounded-full px-5 py-2 text-center text-sm font-bold text-white shadow-lg ${
                feedback.correct ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {feedback.correct
                ? feedback.distanceKm !== undefined && feedback.distanceKm >= 1
                  ? `✓ Correct — ${formatDistance(feedback.distanceKm)} off`
                  : "✓ Correct!"
                : feedback.distanceKm !== undefined
                  ? `✗ ${formatDistance(feedback.distanceKm)} away — this is ${current.loc.name}`
                  : `✗ It's ${current.loc.name}`}
            </div>
          )}

          {/* teaching / reveal card */}
          {(phase === "teach" || phase === "feedback") && (
            <div className="gm-panel-in absolute inset-x-2 bottom-2 z-[550] mx-auto max-w-md rounded-2xl border border-ink-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-3 sm:w-[22rem]">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-950 text-sm font-extrabold tabular-nums text-white">
                  {num}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-base font-extrabold text-ink-950">
                    {current.loc.name}
                  </div>
                  <div className="text-[11px] font-bold text-ink-500">
                    {current.loc.type}
                    {current.loc.region ? ` · ${current.loc.region}` : ""}
                  </div>
                </div>
              </div>
              {(current.loc.whyItMatters || current.loc.description) && (
                <p className="gm-scroll mt-2 max-h-24 overflow-y-auto text-sm leading-relaxed text-ink-600">
                  {current.loc.whyItMatters || current.loc.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* controls */}
        <div className="border-t border-ink-200 bg-white px-4 py-3">
          <div className="mx-auto max-w-3xl">
            {phase === "teach" ? (
              <button
                onClick={continueFromTeach}
                className="w-full rounded-xl bg-ink-950 px-6 py-3.5 text-base font-bold text-white transition hover:bg-ink-800"
              >
                Got it — quiz me <Icon name="arrow" size={17} className="calm-inline-icon"/>
              </button>
            ) : phase === "feedback" ? (
              <button
                onClick={nextQuestion}
                className="w-full rounded-xl bg-brand-600 px-6 py-3.5 text-base font-bold text-white transition hover:bg-brand-700"
              >
                Continue <Icon name="arrow" size={17} className="calm-inline-icon"/>
              </button>
            ) : kind === "choose" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {choices.map((c) => (
                  <button
                    key={c}
                    onClick={() => submitChoice(c)}
                    className="rounded-xl border border-ink-300 bg-white px-4 py-3 text-left text-sm font-semibold text-ink-800 transition hover:border-brand-400 hover:bg-brand-50"
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : kind === "recall" ? (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitRecall()}
                  placeholder="Type the name…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-xl border border-ink-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
                <button
                  onClick={submitRecall}
                  disabled={!typed.trim()}
                  className="rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-40"
                >
                  Check
                </button>
              </div>
            ) : (
              <button
                onClick={submitLocate}
                disabled={!pendingClick}
                className="w-full rounded-xl bg-brand-600 px-6 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {pendingClick ? "Check my answer" : "Click the map first"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  setId,
  setName,
  children,
}: {
  setId: number;
  setName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="atlas-session-shell flex h-dvh flex-col bg-canvas">
      <AtlasHeader setId={setId} title="Learn" setName={setName}/>
      {children}
    </div>
  );
}
