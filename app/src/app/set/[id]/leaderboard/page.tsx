"use client";
import { Icon } from "@/components/Icons";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AtlasHeader from "@/components/AtlasHeader";
import {
  getLeaderboard,
  getOwnerId,
  getPlayerName,
  getSet,
  setPlayerName,
  STATIC_MODE,
  type LeaderboardEntry,
} from "@/lib/client";
import { formatTime } from "@/lib/geo";

const MODE_LABELS: Record<string, string> = {
  mixed: "Mixed",
  identify: "Typed",
  locate: "Click map",
  dropdown: "Dropdown",
  "blank-map": "Blank map",
};

export default function LeaderboardPage() {
  const params = useParams<{ id: string }>();
  const setId = parseInt(params.id, 10);

  const [title, setTitle] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState("");
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLeaderboard(setId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [setId]);

  useEffect(() => {
    if (isNaN(setId)) return;
    const frame = requestAnimationFrame(() => {
    setOwnerId(getOwnerId());
    setName(getPlayerName());
    getSet(setId)
      .then((s) => setTitle(s.name))
      .catch(() => setTitle("Study set"));
    load();
    });
    return () => cancelAnimationFrame(frame);
  }, [setId, load]);

  const myEntries = entries.filter((e) => e.ownerId === ownerId);
  const myBest = myEntries[0] ?? null;
  const myRank = myBest ? entries.findIndex((e) => e.id === myBest.id) + 1 : 0;

  function saveName() {
    setPlayerName(name.trim() || "Anonymous");
    setSavedName(true);
    setTimeout(() => setSavedName(false), 1600);
  }

  return (
    <div className="atlas-leaderboard-page flex min-h-dvh flex-col bg-canvas">
      <AtlasHeader setId={setId} title="Leaderboard" setName={title} actions={<button className="atlas-refresh" title="Refresh leaderboard" onClick={load}>↻</button>}/>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {/* Your standing */}
        {myBest && (
          <div className="mb-5 rounded-2xl bg-ink-950 p-5 text-white">
            <div className="text-[11px] font-boldst text-brand-300">
              Your best
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="font-display text-3xl font-extrabold">
                  #{myRank}
                </div>
                <div className="text-[11px] text-ink-300">rank</div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold">
                  {myBest.accuracy}%
                </div>
                <div className="text-[11px] text-ink-300">
                  {myBest.score}/{myBest.total} correct
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold tabular-nums">
                  {formatTime(myBest.durationSec)}
                </div>
                <div className="text-[11px] text-ink-300">time</div>
              </div>
              <div className="ml-auto text-right text-[11px] text-ink-300">
                {myEntries.length} attempt{myEntries.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        )}

        {/* Display name */}
        <div className="mb-5 rounded-2xl border border-ink-200 bg-white p-4">
          <label className="text-sm font-bold text-ink-700">
            Your leaderboard name
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              placeholder="e.g. Sam A."
              maxLength={40}
              className="min-w-0 flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
            <button
              onClick={saveName}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              {savedName ? "✓ Saved" : "Save"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-500">
            Used for future test results. Existing entries keep their old name.
          </p>
        </div>

        {/* Rankings */}
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h2 className="font-display font-bold text-ink-950">Rankings</h2>
            <span className="text-xs font-medium text-ink-500">
              accuracy, then fastest time
            </span>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-ink-500">
              Loading scores…
            </div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="calm-result-icon"><Icon name="flag"/></div>
              <p className="mt-2 font-semibold text-ink-700">No scores yet</p>
              <p className="mt-1 text-sm text-ink-500">
                Finish a test and your time lands here.
              </p>
              <Link
                href={`/set/${setId}/test`}
                className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white transition hover:bg-brand-700"
              >
                Take a test <Icon name="arrow" size={17} className="calm-inline-icon"/>
              </Link>
            </div>
          ) : (
            <ol className="divide-y divide-ink-100">
              {entries.map((e, i) => {
                const mine = e.ownerId === ownerId;
                return (
                  <li
                    key={e.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      mine ? "bg-brand-50" : ""
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold tabular-nums ${
                        i < 3
                          ? "text-lg"
                          : mine
                            ? "bg-brand-600 text-white"
                            : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {i < 3 ? <span className="calm-rank"><Icon name="medal" size={29}/><span>{i + 1}</span></span> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-bold text-ink-950">
                          {e.playerName}
                        </span>
                        {mine && (
                          <span className="shrink-0 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-500">
                        {e.score}/{e.total} · {MODE_LABELS[e.mode] ?? e.mode} ·{" "}
                        {new Date(e.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-display text-base font-extrabold text-ink-950">
                        {e.accuracy}%
                      </div>
                      <div className="text-[11px] font-semibold tabular-nums text-ink-500">
                        ⏱ {formatTime(e.durationSec)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {STATIC_MODE && (
          <p className="mt-4 text-center text-xs text-ink-500">
            This build stores scores on this device. Deploy with a database to
            share one class leaderboard.
          </p>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link
            href={`/set/${setId}/test`}
            className="rounded-xl bg-ink-950 px-5 py-3 text-center font-bold text-white transition hover:bg-ink-800"
          >
            <Icon name="target" size={17} className="calm-inline-icon"/>Beat your time
          </Link>
          <a
            href={`/set/${setId}`}
            className="rounded-xl border border-ink-300 bg-white px-5 py-3 text-center font-bold text-ink-700 transition hover:bg-ink-50"
          >
            <Icon name="arrow" size={17} className="calm-inline-icon" style={{transform:"rotate(180deg)"}}/>Back to map
          </a>
        </div>
      </main>
    </div>
  );
}
