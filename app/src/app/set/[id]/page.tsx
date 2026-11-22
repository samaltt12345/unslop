"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GeoMap, { GeoMapHandle, LabelMode } from "@/components/GeoMap";
import {
  getProgress,
  getResults,
  getSet,
  postProgress,
  updateLocation,
} from "@/lib/client";
import type { LocationDTO, ProgressDTO, StudySetDTO } from "@/lib/types";
import { MASTERY_LABELS } from "@/lib/types";
import { normalizeName } from "@/lib/geo";
import AtlasHeader from "@/components/AtlasHeader";
import {Icon} from "@/components/Icons";

type SortMode = "number" | "alpha" | "type" | "studied";

export default function SetPage() {
  const params = useParams<{ id: string }>();
  const setId = parseInt(params.id, 10);
  const mapRef = useRef<GeoMapHandle>(null);

  const [set, setSet] = useState<(StudySetDTO & { locations: LocationDTO[] }) | null>(null);
  const [error, setError] = useState("");
  const [prog, setProg] = useState<Map<number, ProgressDTO>>(new Map());
  const [testsCompleted, setTestsCompleted] = useState(0);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("number");
  const [labelMode, setLabelMode] = useState<LabelMode>("active");
  const [listOpen, setListOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [touring, setTouring] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (isNaN(setId)) return;
    getSet(setId).then(setSet).catch(() => setError("Study set not found."));
    // Progress/results are enhancements; the core map must still load if one
    // of these requests is temporarily unavailable after test navigation.
    getProgress(setId)
      .then((rows) => setProg(new Map(rows.map((r) => [r.locationId, r]))))
      .catch(() => setProg(new Map()));
    getResults(setId)
      .then((r: unknown[]) => setTestsCompleted(r.length))
      .catch(() => setTestsCompleted(0));
  }, [setId]);

  const locations = useMemo(() => set?.locations ?? [], [set]);

  const numberOf = useMemo(() => {
    const m = new Map<number, number>();
    locations.forEach((l, i) => m.set(l.id, i + 1));
    return m;
  }, [locations]);

  const selected = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId]
  );

  const filtered = useMemo(() => {
    let list = [...locations];
    if (search.trim()) {
      const q = normalizeName(search);
      const asNum = parseInt(search.trim(), 10);
      list = list.filter(
        (l) =>
          normalizeName(l.name).includes(q) ||
          normalizeName(l.type).includes(q) ||
          (!isNaN(asNum) && numberOf.get(l.id) === asNum)
      );
    }
    if (sort === "number")
      list.sort((a, b) => (numberOf.get(a.id) ?? 0) - (numberOf.get(b.id) ?? 0));
    if (sort === "alpha") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "type")
      list.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    if (sort === "studied")
      list.sort((a, b) => {
        const sa = prog.get(a.id)?.studied ? 1 : 0;
        const sb = prog.get(b.id)?.studied ? 1 : 0;
        return sa - sb || (numberOf.get(a.id) ?? 0) - (numberOf.get(b.id) ?? 0);
      });
    return list;
  }, [locations, search, sort, prog, numberOf]);

  const stats = useMemo(() => {
    let mastered = 0, learning = 0, needsPractice = 0, correct = 0, incorrect = 0, studied = 0;
    for (const l of locations) {
      const p = prog.get(l.id);
      const m = p?.mastery ?? 0;
      if (m >= 3) mastered++;
      else if (m >= 1) learning++;
      else needsPractice++;
      if (p?.studied) studied++;
      correct += p?.correct ?? 0;
      incorrect += p?.incorrect ?? 0;
    }
    const attempts = correct + incorrect;
    return {
      mastered, learning, needsPractice, studied,
      accuracy: attempts ? Math.round((correct / attempts) * 100) : null,
    };
  }, [locations, prog]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1600);
  }, []);

  const goTo = useCallback(
    (l: LocationDTO, fly = true) => {
      setSelectedId(l.id);
      setInfoOpen(true);
      setAdjusting(false);
      setListOpen(false);
      if (fly) {
        mapRef.current?.flyToShape({
          lat: l.lat, lng: l.lng, radiusKm: l.radiusKm,
          bboxes: l.bboxes, path: l.path,
        });
      }
    },
    []
  );

  /** Step through the set in numbered order. */
  const step = useCallback(
    (dir: 1 | -1) => {
      if (!locations.length) return;
      const idx = selected ? locations.findIndex((l) => l.id === selected.id) : -1;
      const next = (idx + dir + locations.length) % locations.length;
      goTo(locations[next]);
    },
    [locations, selected, goTo]
  );

  // Guided tour: auto-advance through every location.
  useEffect(() => {
    if (!touring) return;
    const t = setInterval(() => step(1), 3200);
    return () => clearInterval(t);
  }, [touring, step]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "j") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft" || e.key === "k") { e.preventDefault(); step(-1); }
      else if (e.key === "Escape") { setSelectedId(null); setTouring(false); setAdjusting(false); }
      else if (e.key === "l") {
        setLabelMode((m) => {
          const next: LabelMode = m === "all" ? "active" : m === "active" ? "none" : "all";
          showToast(`Labels: ${next === "all" ? "all names" : next === "active" ? "on hover" : "numbers only"}`);
          return next;
        });
      }
      else if (e.key === "f") mapRef.current?.fitAll();
      else if (e.key === " ") { e.preventDefault(); setTouring((t) => !t); }
      else if (e.key === "s" && selected) toggleStudied(selected);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selected, showToast]);

  async function toggleStudied(l: LocationDTO) {
    const cur = prog.get(l.id);
    const studied = !(cur?.studied ?? false);
    const next = new Map(prog);
    next.set(l.id, {
      locationId: l.id,
      mastery: cur?.mastery ?? 0,
      correct: cur?.correct ?? 0,
      incorrect: cur?.incorrect ?? 0,
      studied,
    });
    setProg(next);
    showToast(studied ? `✓ ${l.name} marked studied` : `${l.name} unmarked`);
    if (studied) window.dispatchEvent(new CustomEvent("atlas:celebrate", { detail: `${l.name}, a little more familiar.` }));
    await postProgress(setId, [{ locationId: l.id, studied }]);
  }

  async function handleMapClick(lat: number, lng: number) {
    if (adjusting && selected) {
      const updated = { ...selected, lat, lng, needsConfirmation: false };
      setSet((s) =>
        s ? { ...s, locations: s.locations.map((l) => (l.id === selected.id ? updated : l)) } : s
      );
      setAdjusting(false);
      showToast(`${selected.name} moved`);
      await updateLocation(setId, { id: selected.id, lat, lng, needsConfirmation: false });
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">{error}</p>
        <Link href="/" className="text-brand-600 hover:underline">← Back home</Link>
      </div>
    );
  }
  if (!set) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-ink-500">
        <Icon name="globe" size={25}/> Loading study set…
      </div>
    );
  }

  const markers = locations.map((l) => ({
    id: l.id,
    number: numberOf.get(l.id) ?? 0,
    name: l.name,
    type: l.type,
    lat: l.lat,
    lng: l.lng,
    radiusKm: l.radiusKm,
    mastery: prog.get(l.id)?.mastery ?? 0,
    studied: prog.get(l.id)?.studied ?? false,
  }));

  const activeNum = selected ? numberOf.get(selected.id) : null;
  const pctStudied = locations.length
    ? Math.round((stats.studied / locations.length) * 100)
    : 0;

  return (
    <div className="atlas-study-shell flex h-dvh flex-col overflow-hidden bg-ink-100">
      <AtlasHeader setId={setId} title="Map" setName={set.name} count={locations.length} onOpenList={()=>setListOpen(true)}/>

      <div className="atlas-study-body relative flex min-h-0 flex-1">
        {/* ---------- Sidebar ---------- */}
        <aside
          className={`atlas-index gm-location-sidebar ${
            listOpen ? "translate-x-0" : "-translate-x-full"
          } absolute inset-y-0 left-0 z-40 flex w-[85vw] max-w-sm flex-col border-r border-ink-200 bg-white shadow-2xl transition-transform duration-200 lg:static lg:w-80 lg:translate-x-0 lg:shadow-none`}
        >
          <div className="shrink-0 space-y-2 border-b border-ink-100 p-3">
            <div className="atlas-index-title"><span>YOUR FIELD INDEX</span><b>{locations.length} places</b></div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
                  <Icon name="search" size={17}/>
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filtered[0]) goTo(filtered[0]);
                  }}
                  placeholder="Search name or number…"
                  aria-label="Search locations"
                  className="w-full rounded-lg border border-ink-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button
                onClick={() => setListOpen(false)}
                aria-label="Close places"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 lg:hidden"
              >
                <Icon name="close" size={17}/>
              </button>
            </div>
            <div className="flex gap-1 text-[11px]">
              {(
                [
                  ["number", "1–N"],
                  ["alpha", "A–Z"],
                  ["type", "Type"],
                  ["studied", "To do"],
                ] as [SortMode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setSort(m)}
                  className={`flex-1 rounded-md py-1.5 font-semibold transition ${
                    sort === m
                      ? "bg-ink-950 text-white"
                      : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Studied progress */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-ink-500">
                <span>{stats.studied} of {locations.length} studied</span>
                <span>{pctStudied}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-200">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${pctStudied}%` }}
                />
              </div>
            </div>
          </div>

          <div className="gm-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filtered.map((l) => {
              const p = prog.get(l.id);
              const studied = p?.studied ?? false;
              const m = p?.mastery ?? 0;
              const isSel = selectedId === l.id;
              return (
                <div
                  key={l.id}
                  onMouseEnter={() => setHoveredId(l.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => goTo(l)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Study ${l.name}`}
                  onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); goTo(l); } }}
                  className={`flex cursor-pointer items-center gap-2.5 border-b border-ink-50 px-3 py-2.5 transition ${
                    isSel
                      ? "bg-ink-950 text-white"
                      : hoveredId === l.id
                        ? "bg-brand-50"
                        : "hover:bg-ink-50"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums ${
                      isSel
                        ? "bg-white text-ink-950"
                        : "bg-ink-100 text-ink-700 ring-2"
                    }`}
                    style={
                      !isSel
                        ? { boxShadow: `0 0 0 2px ${["#cbd5e1", "#7dd3fc", "#fcd34d", "#86efac"][m]}` }
                        : undefined
                    }
                  >
                    {numberOf.get(l.id)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{l.name}</span>
                    <span
                      className={`block truncate text-[11px] ${isSel ? "text-ink-300" : "text-ink-500"}`}
                    >
                      {l.type} · {MASTERY_LABELS[m]}
                    </span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStudied(l);
                    }}
                    title={studied ? "Studied" : "Mark studied"}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition ${
                      studied
                        ? "border-green-500 bg-green-500 text-white"
                        : isSel
                          ? "border-ink-500 text-transparent hover:border-green-400"
                          : "border-ink-300 text-transparent hover:border-green-400 hover:text-green-400"
                    }`}
                  >
                    {studied && <Icon name="check" size={13}/>}
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-ink-500">
                No locations match “{search}”.
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-ink-200 p-3">
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <Stat label="Mastered" value={stats.mastered} tone="bg-green-50 text-green-700" />
              <Stat label="Learning" value={stats.learning} tone="bg-amber-50 text-amber-700" />
              <Stat label="New" value={stats.needsPractice} tone="bg-ink-100 text-ink-600" />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-ink-500">
              <span>Accuracy: {stats.accuracy === null ? "—" : `${stats.accuracy}%`}</span>
              <span>Tests: {testsCompleted}</span>
            </div>
          </div>
        </aside>

        {listOpen && (
          <div
            className="absolute inset-0 z-30 bg-ink-950/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setListOpen(false)}
          />
        )}

        {/* ---------- Map ---------- */}
        <div className="atlas-study-map gm-study-map relative min-w-0 flex-1">
          <GeoMap
            ref={mapRef}
            focusEuropeOnMobile
            markers={markers}
            labelMode={labelMode}
            selectedId={selectedId}
            hoveredId={hoveredId}
            highlight={
              selected
                ? {
                    lat: selected.lat, lng: selected.lng, radiusKm: selected.radiusKm,
                    bboxes: selected.bboxes, path: selected.path,
                    featureName: selected.name,
                    approximate: selected.approximate, color: "#d5ed9c",
                  }
                : null
            }
            onMarkerClick={(id) => {
              const l = locations.find((x) => x.id === id);
              if (l) goTo(l, false);
            }}
            onMarkerHover={(id) => setHoveredId(id as number | null)}
            onMapClick={handleMapClick}
          />

          {/* Floating toolbar */}
          <div className="absolute right-2.5 top-2.5 z-[500] flex flex-col gap-1.5">
            <div className="flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
              <MapBtn title="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Icon name="plus" size={19}/></MapBtn>
              <MapBtn title="Zoom out" onClick={() => mapRef.current?.zoomOut()} border><Icon name="minus" size={19}/></MapBtn>
            </div>
            <div className="flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
              <MapBtn title="Fit all locations (F)" onClick={() => mapRef.current?.fitAll()}><Icon name="expand" size={19}/></MapBtn>
              <MapBtn title="Whole world" onClick={() => mapRef.current?.resetView()} border><Icon name="globe" size={17}/></MapBtn>
            </div>
            <button
              onClick={() =>
                setLabelMode((m) => (m === "all" ? "active" : m === "active" ? "none" : "all"))
              }
              title="Toggle name labels (L)"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold shadow-lg transition ${
                labelMode === "all"
                  ? "border-ink-950 bg-ink-950 text-white"
                  : labelMode === "active"
                    ? "border-ink-200 bg-white text-ink-700"
                    : "border-ink-200 bg-white text-ink-300"
              }`}
            >
              <Icon name="text" size={17}/>
            </button>
          </div>

          {/* Toast */}
          {toast && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[600] -translate-x-1/2 rounded-full bg-ink-950/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
              {toast}
            </div>
          )}

          {adjusting && (
            <div className="absolute inset-x-0 top-3 z-[600] mx-auto w-fit max-w-[92%] rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
              Click the map to move “{selected?.name}” ·{" "}
              <button className="underline" onClick={() => setAdjusting(false)}>cancel</button>
            </div>
          )}

          {/* ---------- Info card ---------- */}
          {selected && infoOpen && !adjusting && (
            <div className="atlas-location-note gm-panel-in absolute inset-x-2 bottom-[68px] z-[550] mx-auto max-w-md rounded-2xl border border-ink-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-3 sm:bottom-[76px] sm:w-[22rem]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-950 text-sm font-extrabold tabular-nums text-white">
                    {activeNum}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-extrabold">
                      {selected.name}
                    </h2>
                    <div className="text-[11px] font-semibold text-ink-500">
                      {selected.type}
                      {selected.type === "Historical Region" ? " · approximate historical extent" : selected.approximate
                        ? " · approximate point"
                        : selected.path
                          ? " · traced course"
                          : selected.bboxes
                            ? " · study extent"
                            : ""}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setInfoOpen(false)}
                  aria-label="Close place details"
                  className="rounded p-1 text-ink-400 hover:bg-ink-100"
                >
                  <Icon name="close" size={17}/>
                </button>
              </div>
              <div className="gm-scroll mt-2.5 max-h-40 overflow-y-auto text-sm">
                {selected.region && (
                  <p>
                    <span className="font-semibold text-ink-700">Location: </span>
                    <span className="text-ink-600">{selected.region}</span>
                  </p>
                )}
                {selected.description && (
                  <p className="mt-1 text-ink-600">{selected.description}</p>
                )}
                {selected.whyItMatters && (
                  <p className="mt-1">
                    <span className="font-semibold text-ink-700">Why it matters: </span>
                    <span className="text-ink-600">{selected.whyItMatters}</span>
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => toggleStudied(selected)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    prog.get(selected.id)?.studied
                      ? "bg-green-100 text-green-700"
                      : "bg-ink-950 text-white hover:bg-ink-700"
                  }`}
                >
                  {prog.get(selected.id)?.studied ? "✓ Studied" : "Mark studied"}
                </button>
                <button
                  onClick={() => setAdjusting(true)}
                  title="Move this pin"
                  className="rounded-lg bg-ink-100 px-3 py-2 text-sm hover:bg-ink-200"
                >
                  <Icon name="target" size={17}/>
                </button>
              </div>
            </div>
          )}

          {/* ---------- Bottom stepper ---------- */}
          <div className="atlas-map-stepper absolute inset-x-0 bottom-0 z-[540] border-t border-ink-200 bg-white/95 px-2 py-2 backdrop-blur">
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <button
                onClick={() => step(-1)}
                className="flex h-10 w-11 items-center justify-center rounded-xl bg-ink-100 text-lg font-bold text-ink-700 hover:bg-ink-200"
                title="Previous (←)"
              >
                <Icon name="arrow" size={18} style={{transform:"rotate(180deg)"}}/>
              </button>
              <button
                onClick={() => {
                  if (selected) {
                    setInfoOpen(true);
                    goTo(selected);
                  } else if (locations[0]) goTo(locations[0]);
                }}
                className="min-w-0 flex-1 rounded-xl bg-ink-50 px-3 py-1.5 text-left hover:bg-ink-100"
              >
                <div className="text-[10px] font-bold text-ink-400">
                  {activeNum ? `${activeNum} of ${locations.length}` : "Start studying"}
                </div>
                <div className="truncate text-sm font-bold text-ink-950">
                  {selected ? selected.name : "Begin with your first place"}
                </div>
              </button>
              <button
                onClick={() => setTouring((t) => !t)}
                title="Auto-tour (Space)"
                className={`flex h-10 w-11 items-center justify-center rounded-xl text-lg transition ${
                  touring
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                }`}
              >
                <Icon name={touring ? "pause" : "play"} size={18}/>
              </button>
              <button
                onClick={() => step(1)}
                className="flex h-10 w-11 items-center justify-center rounded-xl bg-ink-950 text-lg font-bold text-white hover:bg-ink-700"
                title="Next (→)"
              >
                <Icon name="arrow" size={18}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg py-1.5 ${tone}`}>
      <div className="text-base font-extrabold tabular-nums">{value}</div>
      <div className="text-[9px] font-bold opacity-70">{label}</div>
    </div>
  );
}

function MapBtn({
  children,
  onClick,
  title,
  border,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  border?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center text-base text-ink-700 transition hover:bg-ink-100 ${
        border ? "border-t border-ink-200" : ""
      }`}
    >
      {children}
    </button>
  );
}

