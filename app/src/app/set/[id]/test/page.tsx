"use client";
import { Icon } from "@/components/Icons";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import GeoMap, { GeoMapHandle } from "@/components/GeoMap";
import {
  getPlayerName,
  getProgress,
  getSet,
  postProgress,
  postResult,
  setPlayerName,
} from "@/lib/client";
import Link from "next/link";
import type { LocationDTO, ProgressDTO, StudySetDTO } from "@/lib/types";
import {
  answerMatches,
  formatDistance,
  formatTime,
  gradeClick,
  shuffle,
  toleranceKm,
} from "@/lib/geo";
import AtlasHeader from "@/components/AtlasHeader";

type Kind = "identify" | "locate" | "dropdown";
type Difficulty = "easy" | "medium" | "hard";
type QMode = "identify" | "locate" | "dropdown" | "mixed";
type Phase = "config" | "question" | "feedback" | "results" | "review";

interface Question {
  loc: LocationDTO;
  kind: Kind;
  options?: string[]; // dropdown
}

interface Answer {
  q: Question;
  correct: boolean;
  userAnswer: string;
  clickLat?: number;
  clickLng?: number;
  distanceKm?: number;
}

const DIFF_TOLERANCE: Record<Difficulty, number> = {
  easy: 2.0,
  medium: 1.3,
  hard: 0.85,
};

const shapeOf = (l: LocationDTO) => ({
  lat: l.lat,
  lng: l.lng,
  radiusKm: l.radiusKm,
  bboxes: l.bboxes,
    featureName: l.name,
  path: l.path,
});

export default function TestPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-ink-500">Loading…</div>}>
      <TestInner />
    </Suspense>
  );
}

function TestInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const blankPreset = search.get("blank") === "1";
  const setId = parseInt(params.id, 10);
  const mapRef = useRef<GeoMapHandle>(null);

  const [set, setSet] = useState<(StudySetDTO & { locations: LocationDTO[] }) | null>(null);
  const [prog, setProg] = useState<Map<number, ProgressDTO>>(new Map());

  const [phase, setPhase] = useState<Phase>("config");
  const [count, setCount] = useState<number | "all">(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [qMode, setQMode] = useState<QMode>(blankPreset ? "locate" : "mixed");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [typed, setTyped] = useState("");
  const [dropdownChoice, setDropdownChoice] = useState("");
  const [pendingClick, setPendingClick] = useState<{ lat: number; lng: number } | null>(null);
  const [lastAnswer, setLastAnswer] = useState<Answer | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [reviewIdx, setReviewIdx] = useState(0);
  // Leaderboard submission. If no display name is stored yet, the score is
  // held until the student names themselves on the results screen.
  const [resultSaved, setResultSaved] = useState(false);
  const [pendingResult, setPendingResult] = useState<Parameters<typeof postResult>[0] | null>(null);
  const [nameInput, setNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSet(setId).then(setSet).catch(() => {});
    getProgress(setId).then((rows) =>
      setProg(new Map(rows.map((r) => [r.locationId, r])))
    );
  }, [setId]);

  // timer
  useEffect(() => {
    if (phase !== "question" && phase !== "feedback") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, startTime]);

  const locations = useMemo(() => set?.locations ?? [], [set]);

  function weightOf(l: LocationDTO) {
    const p = prog.get(l.id);
    return 1 + (3 - (p?.mastery ?? 0)) * 1.5 + Math.min(p?.incorrect ?? 0, 5);
  }

  function buildQuestions(fromLocs?: LocationDTO[]) {
    const pool = fromLocs ?? locations;
    if (!pool.length) return;
    const n = count === "all" || fromLocs ? pool.length : Math.min(count, pool.length);

    // Weighted sample without replacement
    const chosen: LocationDTO[] = [];
    const remaining = [...pool];
    while (chosen.length < n && remaining.length) {
      const total = remaining.reduce((s, l) => s + weightOf(l), 0);
      let r = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < remaining.length; i++) {
        r -= weightOf(remaining[i]);
        if (r <= 0) { idx = i; break; }
      }
      chosen.push(remaining.splice(idx, 1)[0]);
    }

    const kinds: Kind[] = qMode === "mixed" ? ["identify", "locate", "dropdown"] : [qMode];
    const optionCount = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;

    const qs: Question[] = chosen.map((loc, i) => {
      const kind = kinds[i % kinds.length];
      if (kind === "dropdown") {
        const distractors = shuffle(
          locations.filter((l) => l.id !== loc.id).map((l) => l.name)
        ).slice(0, Math.min(optionCount - 1, locations.length - 1));
        return { loc, kind, options: shuffle([loc.name, ...distractors]) };
      }
      return { loc, kind };
    });

    setQuestions(shuffle(qs));
    setQi(0);
    setAnswers([]);
    setTyped("");
    setDropdownChoice("");
    setPendingClick(null);
    setLastAnswer(null);
    setStreak(0);
    setStartTime(Date.now());
    setElapsed(0);
    setResultSaved(false);
    setPendingResult(null);
    setPhase("question");
  }

  const q = questions[qi] ?? null;

  // Map positioning per question
  useEffect(() => {
    if (phase !== "question" || !q) return;
    const m = mapRef.current;
    if (!m) return;
    m.clearClickMarker();
    if (q.kind === "locate") {
      m.resetView();
    } else {
      m.flyToShape(shapeOf(q.loc));
    }
    if (q.kind === "identify") setTimeout(() => inputRef.current?.focus(), 300);
  }, [phase, qi, q]);

  function submitAnswer(a: Answer) {
    setAnswers((prev) => [...prev, a]);
    setLastAnswer(a);
    setStreak(a.correct ? streak + 1 : 0);
    setPhase("feedback");
    postProgress(setId, [
      { locationId: a.q.loc.id, result: a.correct ? "correct" : "incorrect" },
    ]);
    if (a.q.kind === "locate" && a.clickLat !== undefined) {
      const z = a.q.loc.radiusKm > 1500 ? 3 : a.q.loc.radiusKm > 400 ? 4 : 5;
      mapRef.current?.flyTo(
        (a.q.loc.lat + a.clickLat) / 2,
        (a.q.loc.lng + (a.clickLng ?? a.q.loc.lng)) / 2,
        Math.min(z, 4)
      );
    }
  }

  function handleIdentifySubmit() {
    if (!q || !typed.trim()) return;
    const correct = answerMatches(typed, q.loc.name, q.loc.aliases);
    submitAnswer({ q, correct, userAnswer: typed.trim() });
  }

  function handleDropdownSubmit() {
    if (!q || !dropdownChoice) return;
    submitAnswer({ q, correct: dropdownChoice === q.loc.name, userAnswer: dropdownChoice });
  }

  function handleMapClick(lat: number, lng: number) {
    if (phase !== "question" || q?.kind !== "locate") return;
    setPendingClick({ lat, lng });
  }

  function confirmLocate() {
    if (!q || !pendingClick) return;
    const g = gradeClick(
      pendingClick.lat,
      pendingClick.lng,
      shapeOf(q.loc),
      DIFF_TOLERANCE[difficulty]
    );
    submitAnswer({
      q,
      correct: g.correct,
      userAnswer: `clicked ${pendingClick.lat.toFixed(1)}, ${pendingClick.lng.toFixed(1)}`,
      clickLat: pendingClick.lat,
      clickLng: pendingClick.lng,
      distanceKm: g.distanceKm,
    });
    setPendingClick(null);
  }

  function saveToLeaderboard() {
    const clean = nameInput.trim();
    if (!clean || !pendingResult) return;
    setPlayerName(clean);
    postResult({ ...pendingResult, playerName: clean }).catch(() => {});
    setResultSaved(true);
    setPendingResult(null);
  }

  async function nextQuestion() {
    if (qi + 1 >= questions.length) {
      // finish
      const score = answers.filter((a) => a.correct).length;
      const durationSec = Math.floor((Date.now() - startTime) / 1000);
      setPhase("results");
      if (score / Math.max(questions.length, 1) >= 0.8) {
        window.dispatchEvent(new CustomEvent("atlas:celebrate", { detail: `${score} of ${questions.length}. You know your way around.` }));
      }
      const payload = {
        setId,
        score,
        total: questions.length,
        durationSec,
        mode: blankPreset ? "blank-map" : qMode,
        details: answers.map((a) => ({
          locationId: a.q.loc.id,
          locationName: a.q.loc.name,
          correct: a.correct,
          userAnswer: a.userAnswer,
          distanceKm: a.distanceKm,
          kind: a.q.kind,
        })),
      };
      const existingName = getPlayerName();
      if (existingName) {
        postResult({ ...payload, playerName: existingName }).catch(() => {});
        setResultSaved(true);
      } else {
        setPendingResult(payload);
        setResultSaved(false);
      }
    } else {
      setQi(qi + 1);
      setTyped("");
      setDropdownChoice("");
      setPendingClick(null);
      setLastAnswer(null);
      setPhase("question");
    }
  }

  if (!set) {
    return <div className="flex min-h-screen items-center justify-center text-ink-500">Loading test…</div>;
  }

  const title = blankPreset ? "Blank Map Test" : "Test Mode";
  const mistakes = answers.filter((a) => !a.correct);

  // ============ CONFIG ============
  if (phase === "config") {
    return (
      <Shell setId={setId} title={title} setName={set.name}>
        <div className="atlas-session-config mx-auto w-full max-w-xl px-6 py-10">
          {blankPreset && (
            <div className="mb-4 rounded-xl bg-ink-800 p-4 text-sm text-ink-100">
              <Icon name="globe" size={18} className="calm-inline-icon"/><b>Blank map:</b> the map has no labels. You&apos;ll be asked to
              click the location of each place — just like the real exam.
            </div>
          )}
          <h2 className="text-xl font-bold">Chart your challenge.</h2>

          <div className="mt-5">
            <div className="text-sm font-semibold text-ink-700">Question Count</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {([10, 20, 30, 50, "all"] as const).map((c) => (
                <Chip
                  key={c}
                  active={count === c}
                  onClick={() => setCount(c)}
                  label={c === "all" ? `All (${locations.length})` : String(c)}
                />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-ink-700">Difficulty</div>
            <div className="mt-2 flex gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <Chip
                  key={d}
                  active={difficulty === d}
                  onClick={() => setDifficulty(d)}
                  label={d[0].toUpperCase() + d.slice(1)}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              Difficulty controls how precise your map clicks must be and how many
              choices appear in dropdowns.
            </p>
          </div>

          {!blankPreset && (
            <div className="mt-5">
              <div className="text-sm font-semibold text-ink-700">Question Type</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Chip active={qMode === "identify"} onClick={() => setQMode("identify")} label="Type the name" wide />
                <Chip active={qMode === "locate"} onClick={() => setQMode("locate")} label="Find on map" wide />
                <Chip active={qMode === "dropdown"} onClick={() => setQMode("dropdown")} label="Dropdown" wide />
                <Chip active={qMode === "mixed"} onClick={() => setQMode("mixed")} label="Mixed" wide />
              </div>
            </div>
          )}

          <button
            onClick={() => buildQuestions()}
            disabled={!locations.length}
            className="mt-8 w-full rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            Start Test <Icon name="arrow" size={17} className="calm-inline-icon"/>
          </button>
        </div>
      </Shell>
    );
  }

  // ============ RESULTS ============
  if (phase === "results") {
    const score = answers.filter((a) => a.correct).length;
    const pct = answers.length ? Math.round((score / answers.length) * 100) : 0;
    const strongest = answers.filter((a) => a.correct).map((a) => a.q.loc.name);
    const weakest = mistakes.map((a) => a.q.loc.name);
    return (
      <Shell setId={setId} title={title} setName={set.name}>
        <div className="gm-scroll mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 py-8">
          <div className="text-center">
            <div className="calm-result-icon"><Icon name={pct >= 90 ? "trophy" : pct >= 70 ? "spark" : "book"}/></div>
            <h2 className="mt-2 text-2xl font-bold">Test Complete!</h2>
            <div className="mt-4 text-5xl font-extrabold text-brand-600">{pct}%</div>
            <div className="mt-1 text-ink-600">
              {score} / {answers.length} correct
            </div>
            <div className="text-sm text-ink-500">Time: {formatTime(elapsed)}</div>
          </div>

          {!resultSaved && pendingResult && (
            <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <div className="text-sm font-bold text-brand-700">
                <Icon name="trophy" size={17} className="calm-inline-icon"/>Save your time to the leaderboard
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nameInput.trim()) saveToLeaderboard();
                  }}
                  placeholder="Your name"
                  maxLength={40}
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
                <button
                  onClick={saveToLeaderboard}
                  disabled={!nameInput.trim()}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {resultSaved && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-center text-sm font-semibold text-green-700">
              ✓ Time saved to the leaderboard
            </div>
          )}

          {strongest.length > 0 && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="text-sm font-bold text-green-700"><Icon name="flag" size={17} className="calm-inline-icon"/>Strongest locations</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[...new Set(strongest)].slice(0, 8).map((n) => (
                  <span key={n} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}
          {weakest.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-bold text-amber-700"><Icon name="target" size={17} className="calm-inline-icon"/>Needs practice</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[...new Set(weakest)].map((n) => (
                  <span key={n} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-2">
            {mistakes.length > 0 && (
              <button
                onClick={() => { setReviewIdx(0); setPhase("review"); }}
                className="rounded-xl bg-ink-950 px-6 py-3 font-semibold text-white hover:bg-ink-700"
              >
                <Icon name="search" size={18} className="calm-inline-icon"/>Review Mistakes ({mistakes.length})
              </button>
            )}
            <button
              onClick={() => buildQuestions()}
              className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
            >
              <Icon name="repeat" size={17} className="calm-inline-icon"/>Retry Test
            </button>
            {mistakes.length > 0 && (
              <button
                onClick={() => buildQuestions([...new Set(mistakes.map((m) => m.q.loc))])}
                className="rounded-xl border border-ink-300 bg-white px-6 py-3 font-semibold text-ink-700 hover:bg-ink-50"
              >
                <Icon name="target" size={18} className="calm-inline-icon"/>Study Weak Locations
              </button>
            )}
            <Link
              href={`/set/${setId}/leaderboard`}
              className="rounded-xl border border-ink-300 bg-white px-6 py-3 text-center font-bold text-ink-700 transition hover:border-brand-300 hover:text-brand-600"
            >
              <Icon name="trophy" size={18} className="calm-inline-icon"/>View Leaderboard
            </Link>
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

  // ============ REVIEW MISTAKES ============
  if (phase === "review") {
    const m = mistakes[reviewIdx];
    if (!m) {
      setPhase("results");
      return null;
    }
    return (
      <Shell setId={setId} title="Review Mistakes" setName={set.name}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-ink-200 bg-white px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-ink-400">
                  Mistake {reviewIdx + 1} of {mistakes.length}
                </div>
                <div className="text-lg font-bold">{m.q.loc.name}</div>
                <div className="text-sm text-ink-600">
                  Your answer:{" "}
                  <span className="font-medium text-red-600">
                    {m.q.kind === "locate" ? "see ✕ on map" : m.userAnswer}
                  </span>
                  {m.distanceKm !== undefined && (
                    <span className="text-ink-500"> — {formatDistance(m.distanceKm)} away</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  disabled={reviewIdx === 0}
                  onClick={() => setReviewIdx(reviewIdx - 1)}
                  className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                >
                  <Icon name="arrow" size={18} style={{transform:"rotate(180deg)"}}/>
                </button>
                <button
                  disabled={reviewIdx >= mistakes.length - 1}
                  onClick={() => setReviewIdx(reviewIdx + 1)}
                  className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                >
                  <Icon name="arrow" size={18}/>
                </button>
              </div>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <ReviewMap m={m} />
          </div>
          <div className="border-t border-ink-200 bg-white px-4 py-3">
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
              <button
                onClick={() => buildQuestions([...new Set(mistakes.map((x) => x.q.loc))])}
                className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
              >
                Practice these again
              </button>
              <button
                onClick={() => setPhase("results")}
                className="rounded-xl border border-ink-300 px-4 py-2.5 font-semibold text-ink-700 hover:bg-ink-50"
              >
                Back to results
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ============ QUESTION / FEEDBACK ============
  if (!q) return null;
  const isFeedback = phase === "feedback";
  const fb = lastAnswer;

  return (
    <Shell setId={setId} title={title} setName={set.name}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Progress bar */}
        <div className="h-1.5 bg-ink-200">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${((qi + (isFeedback ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>

        <div className="border-b border-ink-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink-400">
                Question {qi + 1} of {questions.length} · {formatTime(elapsed)}
              </div>
              <h2 className="truncate text-lg font-bold sm:text-xl">
                {q.kind === "locate" ? (
                  <>Locate <span className="text-brand-700">{q.loc.name}</span> on the map</>
                ) : q.kind === "identify" ? (
                  "What is this location?"
                ) : (
                  "What is this?"
                )}
              </h2>
            </div>
            {streak >= 3 && !isFeedback && (
              <div className="shrink-0 text-sm font-semibold text-orange-500"><Icon name="spark" size={16} className="calm-inline-icon"/>{streak}</div>
            )}
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
              q.kind !== "locate" || isFeedback
                ? {
                    ...shapeOf(q.loc),
                    approximate: q.loc.approximate,
                    color: isFeedback ? (fb?.correct ? "#16a34a" : "#dc2626") : "#f59e0b",
                    label: isFeedback ? q.loc.name : undefined,
                  }
                : null
            }
            clickMarker={
              pendingClick
                ? { ...pendingClick, color: "#2563eb" }
                : isFeedback && fb?.clickLat !== undefined
                  ? { lat: fb.clickLat, lng: fb.clickLng!, color: fb.correct ? "#16a34a" : "#dc2626" }
                  : null
            }
            connector={
              isFeedback && fb?.clickLat !== undefined && !fb.correct
                ? { from: [fb.clickLat, fb.clickLng!], to: [fb.q.loc.lat, fb.q.loc.lng] }
                : null
            }
            onMapClick={handleMapClick}
          />

          {isFeedback && fb && (
            <div
              className={`absolute inset-x-0 top-3 z-[500] mx-auto w-fit max-w-[92%] rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg ${
                fb.correct ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {fb.correct
                ? fb.distanceKm === undefined || fb.distanceKm < 1
                  ? "✓ Correct!"
                  : `✓ Correct! You were ${formatDistance(fb.distanceKm)} off.`
                : fb.distanceKm !== undefined
                  ? fb.distanceKm <= toleranceKm(shapeOf(fb.q.loc), DIFF_TOLERANCE[difficulty]) * 2.5
                    ? `✗ Close! You were ${formatDistance(fb.distanceKm)} away — it's ${fb.q.loc.name}.`
                    : `✗ You were ${formatDistance(fb.distanceKm)} away. The correct area is shown.`
                  : `✗ Incorrect — it's ${fb.q.loc.name}.`}
            </div>
          )}

          {q.kind === "locate" && !isFeedback && (
            <div className="absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-ink-950/85 px-4 py-1.5 text-sm font-medium text-white shadow">
              {pendingClick ? "Tap Confirm, or click again to adjust" : "Click the map where you think it is"}
            </div>
          )}
        </div>

        {/* Answer controls */}
        <div className="border-t border-ink-200 bg-white px-4 py-3">
          <div className="mx-auto max-w-3xl">
            {isFeedback ? (
              <div className="flex items-center gap-3">
                {fb && !fb.correct && (
                  <div className="min-w-0 flex-1 text-sm text-ink-600">
                    <span className="font-semibold">{fb.q.loc.name}</span>
                    {fb.q.loc.region ? ` — ${fb.q.loc.region}` : ""}
                  </div>
                )}
                <button
                  onClick={nextQuestion}
                  className="ml-auto rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700"
                >
                  {qi + 1 >= questions.length ? "See Results →" : "Next →"}
                </button>
              </div>
            ) : q.kind === "identify" ? (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleIdentifySubmit()}
                  placeholder="Type the location name…"
                  className="min-w-0 flex-1 rounded-xl border border-ink-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  onClick={handleIdentifySubmit}
                  disabled={!typed.trim()}
                  className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            ) : q.kind === "dropdown" ? (
              <div className="flex gap-2">
                <select
                  value={dropdownChoice}
                  onChange={(e) => setDropdownChoice(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-ink-300 bg-white px-4 py-3 text-base focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select an answer…</option>
                  {q.options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <button
                  onClick={handleDropdownSubmit}
                  disabled={!dropdownChoice}
                  className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            ) : (
              <button
                onClick={confirmLocate}
                disabled={!pendingClick}
                className="w-full rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {pendingClick ? "Confirm Location" : "Click the map first"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ReviewMap({ m }: { m: Answer }) {
  const ref = useRef<GeoMapHandle>(null);
  useEffect(() => {
    setTimeout(() => {
      if (m.clickLat !== undefined && m.clickLng !== undefined) {
        // Frame both the student's ✕ and the true location.
        ref.current?.flyTo(
          (m.q.loc.lat + m.clickLat) / 2,
          (m.q.loc.lng + m.clickLng) / 2,
          3
        );
      } else {
        ref.current?.flyToShape(shapeOf(m.q.loc));
      }
    }, 120);
  }, [m]);
  return (
    <GeoMap
      ref={ref}
      markers={[]}
      blank
      fitOnLoad={false}
      highlight={{
        ...shapeOf(m.q.loc),
        approximate: m.q.loc.approximate,
        color: "#16a34a",
        label: m.q.loc.name,
      }}
      clickMarker={
        m.clickLat !== undefined
          ? { lat: m.clickLat, lng: m.clickLng!, color: "#dc2626" }
          : null
      }
      connector={
        m.clickLat !== undefined
          ? { from: [m.clickLat, m.clickLng!], to: [m.q.loc.lat, m.q.loc.lng] }
          : null
      }
    />
  );
}

function Chip({
  active,
  onClick,
  label,
  wide,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  wide?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${wide ? "w-full" : ""} ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "bg-white text-ink-700 ring-1 ring-ink-300 hover:bg-ink-50"
      }`}
    >
      {label}
    </button>
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
