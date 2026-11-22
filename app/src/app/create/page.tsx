"use client";
import { Icon } from "@/components/Icons";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GeoMap, { GeoMapHandle } from "@/components/GeoMap";
import { createSet, geocodeOne } from "@/lib/client";
import type { GeoType, ResolvedLocation } from "@/lib/types";
import AtlasHeader from "@/components/AtlasHeader";

const GEO_TYPES: GeoType[] = [
  "Country", "Continent", "Region", "City", "River", "Mountain",
  "Mountain Range", "Desert", "Sea", "Ocean", "Lake", "Peninsula", "Island",
  "Island Group", "Historical Region", "Civilization", "Empire", "Strait",
  "Canal", "Other",
];

interface Item {
  query: string;
  status: "pending" | "processing" | "resolved" | "ambiguous" | "not_found" | "error";
  resolved?: ResolvedLocation;
  options?: ResolvedLocation[];
}

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [phase, setPhase] = useState<"input" | "processing" | "review">("input");
  const [items, setItems] = useState<Item[]>([]);
  const [progressCount, setProgressCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [manualIdx, setManualIdx] = useState<number | null>(null);
  const cancelRef = useRef(false);

  const lines = useMemo(
    () =>
      [...new Set(
        raw
          .split(/\r?\n/)
          .map((l) => l.replace(/^[\s\-•*\d.)]+/, "").trim())
          .filter(Boolean)
      )],
    [raw]
  );

  async function process() {
    if (!lines.length) return;
    cancelRef.current = false;
    setPhase("processing");
    const initial: Item[] = lines.map((q) => ({ query: q, status: "pending" }));
    setItems(initial);
    setProgressCount(0);

    const results = [...initial];
    // small concurrency: gazetteer hits return instantly, geocoder is the slow path
    let idx = 0;
    const worker = async () => {
      while (idx < results.length && !cancelRef.current) {
        const my = idx++;
        results[my] = { ...results[my], status: "processing" };
        setItems([...results]);
        try {
          const r = await geocodeOne(results[my].query);
          if (r.status === "resolved" && r.resolved) {
            results[my] = { query: results[my].query, status: "resolved", resolved: r.resolved };
          } else if (r.status === "ambiguous" && r.options?.length) {
            results[my] = { query: results[my].query, status: "ambiguous", options: r.options };
          } else {
            results[my] = { query: results[my].query, status: "not_found" };
          }
        } catch {
          results[my] = { query: results[my].query, status: "error" };
        }
        setProgressCount((c) => c + 1);
        setItems([...results]);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setPhase("review");
  }

  async function retryOne(i: number) {
    const updated = [...items];
    updated[i] = { ...updated[i], status: "processing" };
    setItems(updated);
    try {
      const r = await geocodeOne(items[i].query);
      const next = [...updated];
      if (r.status === "resolved" && r.resolved) {
        next[i] = { query: items[i].query, status: "resolved", resolved: r.resolved };
      } else if (r.status === "ambiguous" && r.options?.length) {
        next[i] = { query: items[i].query, status: "ambiguous", options: r.options };
      } else {
        next[i] = { query: items[i].query, status: "not_found" };
      }
      setItems(next);
    } catch {
      const next = [...updated];
      next[i] = { ...next[i], status: "error" };
      setItems(next);
    }
  }

  function chooseOption(i: number, opt: ResolvedLocation) {
    const next = [...items];
    next[i] = {
      query: items[i].query,
      status: "resolved",
      resolved: { ...opt, needsConfirmation: false },
    };
    setItems(next);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, j) => j !== i));
  }

  function setManual(i: number, lat: number, lng: number, type: GeoType) {
    const next = [...items];
    next[i] = {
      query: items[i].query,
      status: "resolved",
      resolved: {
        name: items[i].query,
        type,
        lat,
        lng,
        radiusKm: 200,
        region: "Manually placed",
        description: "",
        whyItMatters: "",
        aliases: [],
        approximate: true,
        needsConfirmation: false,
        source: "manual",
      },
    };
    setItems(next);
    setManualIdx(null);
  }

  const resolvedCount = items.filter((i) => i.status === "resolved").length;
  const unresolved = items.filter(
    (i) => i.status === "ambiguous" || i.status === "not_found" || i.status === "error"
  ).length;

  async function save() {
    const locs = items
      .filter((i) => i.status === "resolved" && i.resolved)
      .map((i) => i.resolved!);
    if (!locs.length) return;
    setSaving(true);
    try {
      const { id } = await createSet(name.trim() || "Untitled Study Set", locs);
      router.push(`/set/${id}`);
    } catch {
      setSaving(false);
      alert("Failed to save the study set. Please try again.");
    }
  }

  return (
    <div className="atlas-create-page min-h-screen bg-canvas">
      <AtlasHeader title="Create a set"/>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {phase === "input" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-950">
                Where are we headed?
              </h2>
              <p className="mt-1.5 text-ink-600">
                Paste the list your teacher gave you — we&apos;ll map every place.
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-700">
                Study Set Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. "AP World Unit 1 Geography"'
                className="mt-1.5 w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-ink-950 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-ink-700">
                  Locations
                </label>
                <span className="text-xs font-medium text-ink-400">
                  {lines.length > 0 && `${lines.length} detected`}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-500">
                Paste your locations below — one per line.
              </p>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                rows={14}
                placeholder={"North America\nSouth America\nEurope\nEgypt\nMesopotamia\nNile River\nTigris River\nEuphrates River\nMediterranean Sea\nSahara Desert"}
                className="mt-2 w-full rounded-xl border border-ink-300 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-ink-950 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>
            <button
              onClick={process}
              disabled={!lines.length}
              className="w-full rounded-xl bg-ink-950 px-6 py-4 text-base font-bold text-white shadow-lg shadow-ink-950/10 transition hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-xl disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
            >
              Map my locations
              {lines.length > 0 && ` (${lines.length})`}
            </button>
          </div>
        )}

        {phase === "processing" && (
          <div className="py-20 text-center">
            <div className="calm-result-icon"><Icon name="globe" size={38}/></div>
            <h2 className="mt-5 font-display text-xl font-bold">
              Identifying locations…
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {progressCount} / {items.length}
            </p>
            <div className="mx-auto mt-4 h-2 w-64 overflow-hidden rounded-full bg-ink-200">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${(progressCount / Math.max(items.length, 1)) * 100}%` }}
              />
            </div>
            <div className="mx-auto mt-6 max-w-md text-left text-sm text-ink-500 space-y-1">
              {items
                .filter((i) => i.status === "processing")
                .map((i) => (
                  <div key={i.query}>Looking up “{i.query}”…</div>
                ))}
            </div>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {resolvedCount} of {items.length} locations identified
                  </div>
                  {unresolved > 0 && (
                    <div className="text-sm text-amber-600">
                      {unresolved} need{unresolved === 1 ? "s" : ""} your confirmation below
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPhase("input")}
                    className="rounded-lg border border-ink-300 px-3 py-2 text-sm font-medium hover:bg-ink-50"
                  >
                    Edit list
                  </button>
                  <button
                    onClick={save}
                    disabled={!resolvedCount || saving}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving…"
                      : `Save Study Set (${resolvedCount})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Unresolved first */}
            {items.map((item, i) => {
              if (item.status === "ambiguous") {
                return (
                  <div key={`${item.query}-${i}`} className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                    <div className="text-xs font-bold text-amber-700">
                      Ambiguous location
                    </div>
                    <div className="mt-1 font-semibold text-ink-950">“{item.query}”</div>
                    <p className="text-sm text-ink-600">Which one did you mean?</p>
                    <div className="mt-3 space-y-2">
                      {item.options?.map((opt, j) => (
                        <button
                          key={j}
                          onClick={() => chooseOption(i, opt)}
                          className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-left hover:border-brand-400 hover:bg-brand-50 transition"
                        >
                          <span className="flex-1">
                            <span className="font-medium">{opt.name}</span>
                            <span className="text-ink-500"> — {opt.type}</span>
                            {opt.region && (
                              <span className="block text-xs text-ink-500">{opt.region}</span>
                            )}
                          </span>
                          <Icon name="pin" size={17} className="text-ink-300"/>
                        </button>
                      ))}
                      <button
                        onClick={() => removeItem(i)}
                        className="text-xs text-ink-500 hover:text-red-600"
                      >
                        Remove this location
                      </button>
                    </div>
                  </div>
                );
              }
              if (item.status === "not_found" || item.status === "error") {
                return (
                  <div key={`${item.query}-${i}`} className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
                    <div className="text-xs font-bold text-red-600">
                      Location needs confirmation
                    </div>
                    <div className="mt-1 font-semibold">“{item.query}”</div>
                    <p className="text-sm text-ink-600">
                      {item.status === "error"
                        ? "The geocoding service failed for this location."
                        : "We couldn't confidently identify this place."}{" "}
                      Place it manually on the map, retry, or remove it.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setManualIdx(manualIdx === i ? null : i)}
                        className="rounded-lg bg-ink-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-ink-700"
                      >
                        <Icon name="pin" size={16} className="calm-inline-icon"/>Place on map
                      </button>
                      <button
                        onClick={() => retryOne(i)}
                        className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-ink-50"
                      >
                        <Icon name="repeat" size={17} className="calm-inline-icon"/>Retry
                      </button>
                      <button
                        onClick={() => removeItem(i)}
                        className="rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                    {manualIdx === i && (
                      <ManualPlacer
                        onPlace={(lat, lng, type) => setManual(i, lat, lng, type)}
                      />
                    )}
                  </div>
                );
              }
              return null;
            })}

            {/* Resolved list */}
            <div className="rounded-xl border border-ink-200 bg-white shadow-sm divide-y divide-ink-100">
              {items.map((item, i) =>
                item.status === "resolved" && item.resolved ? (
                  <div key={`${item.query}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-950 text-[11px] font-bold tabular-nums text-white">
                      {items.slice(0, i).filter((x) => x.status === "resolved").length + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.resolved.name}</div>
                      <div className="truncate text-xs text-ink-500">
                        {item.resolved.type}
                        {item.resolved.region ? ` · ${item.resolved.region}` : ""}
                        {item.resolved.source === "manual" ? " · manually placed" : ""}
                        {item.resolved.approximate ? " · approximate point" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-ink-300 hover:text-red-500"
                      title="Remove"
                    >
                      <Icon name="close" size={17}/>
                    </button>
                  </div>
                ) : null
              )}
            </div>

            <button
              onClick={save}
              disabled={!resolvedCount || saving}
              className="w-full rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save Study Set (${resolvedCount} locations)`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function ManualPlacer({
  onPlace,
}: {
  onPlace: (lat: number, lng: number, type: GeoType) => void;
}) {
  const mapRef = useRef<GeoMapHandle>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [type, setType] = useState<GeoType>("Other");
  return (
    <div className="mt-3 rounded-lg border border-ink-200 bg-white p-3">
      <p className="text-sm text-ink-600">
        Click the map where this location belongs.
      </p>
      <div className="mt-2 h-64 overflow-hidden rounded-lg">
        <GeoMap
          ref={mapRef}
          markers={[]}
          fitOnLoad={false}
          clickMarker={pos ? { ...pos, color: "#2563eb" } : null}
          onMapClick={(lat, lng) => setPos({ lat, lng })}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as GeoType)}
          className="rounded-lg border border-ink-300 px-2 py-1.5 text-sm"
        >
          {GEO_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button
          disabled={!pos}
          onClick={() => pos && onPlace(pos.lat, pos.lng, type)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Use this position
        </button>
        {pos && (
          <span className="text-xs text-ink-500">
            {pos.lat.toFixed(2)}, {pos.lng.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
