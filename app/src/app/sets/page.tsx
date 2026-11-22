"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createSet,
  deleteSet,
  duplicateSet,
  getSet,
  listSets,
  loadExampleSet,
  renameSet,
} from "@/lib/client";
import { EXAMPLE_SET } from "@/lib/exampleSet";
import type { ResolvedLocation, StudySetDTO } from "@/lib/types";
import AtlasHeader from "@/components/AtlasHeader";
import { Icon } from "@/components/Icons";

export default function SetsPage() {
  const router = useRouter();
  const [sets, setSets] = useState<StudySetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exampleBusy, setExampleBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function openExample() {
    setExampleBusy(true);
    try {
      router.push(`/set/${await loadExampleSet()}`);
    } catch {
      setExampleBusy(false);
      alert("Could not open the example set. Please try again.");
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      setSets(await listSets());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listSets().then(setSets).catch(() => setSets([])).finally(() => setLoading(false));
  }, []);

  async function handleRename(s: StudySetDTO) {
    const name = prompt("Rename study set:", s.name);
    if (!name || name === s.name) return;
    await renameSet(s.id, name);
    refresh();
  }

  async function handleDuplicate(s: StudySetDTO) {
    setBusy(true);
    await duplicateSet(s.id);
    setBusy(false);
    refresh();
  }

  async function handleDelete(s: StudySetDTO) {
    if (!confirm(`Delete "${s.name}"? This also removes its progress and results.`)) return;
    await deleteSet(s.id);
    refresh();
  }

  async function handleExport(s: StudySetDTO) {
    const full = await getSet(s.id);
    const payload = {
      atlas: 1,
      geomaster: 1, // Retain backwards compatibility with the original exports.
      name: full.name,
      locations: full.locations.map((l) => ({
        name: l.name,
        type: l.type,
        lat: l.lat,
        lng: l.lng,
        radiusKm: l.radiusKm,
        region: l.region,
        description: l.description,
        whyItMatters: l.whyItMatters,
        aliases: l.aliases,
        approximate: l.approximate,
        bboxes: l.bboxes ?? null,
        path: l.path ?? null,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${full.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.atlas.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as {
        geomaster?: number;
        name?: string;
        locations?: Partial<ResolvedLocation>[];
      };
      if (!data.locations?.length) throw new Error("bad");
      const locs: ResolvedLocation[] = data.locations
        .filter((l) => typeof l.lat === "number" && typeof l.lng === "number" && l.name)
        .map((l) => ({
          name: l.name!,
          type: (l.type as ResolvedLocation["type"]) ?? "Other",
          lat: l.lat!,
          lng: l.lng!,
          radiusKm: l.radiusKm ?? 150,
          region: l.region ?? "",
          description: l.description ?? "",
          whyItMatters: l.whyItMatters ?? "",
          aliases: l.aliases ?? [],
          approximate: !!l.approximate,
          needsConfirmation: false,
          source: "manual",
          bboxes: l.bboxes ?? null,
          path: l.path ?? null,
        }));
      const { id } = await createSet(data.name ?? "Imported Study Set", locs);
      router.push(`/set/${id}`);
    } catch {
      alert("That file doesn't look like an ATLAS or compatible GeoMaster export.");
    }
  }

  return (
    <div className="atlas-library-page min-h-screen bg-ink-50">
      <AtlasHeader title="My atlas" actions={<Link className="atlas-small-primary" href="/create"><Icon name="plus" size={15} className="calm-inline-icon"/>New set</Link>}/>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-700">
              <Icon name="book" size={18} className="inline-block mr-2"/>{EXAMPLE_SET.name}
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              {EXAMPLE_SET.locations.length} European places, already mapped —
              great for trying every study mode.
            </p>
          </div>
          <button
            type="button"
            onClick={openExample}
            disabled={exampleBusy}
            className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {exampleBusy ? "Opening…" : "Open example"}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-500">
            Your sets
          </h2>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            <Icon name="upload" size={16} className="inline-block mr-2"/>Import from file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-ink-500">Loading…</div>
        ) : sets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <div className="mx-auto w-fit text-brand-600"><Icon name="globe" size={38}/></div>
            <p className="mt-2 font-medium text-ink-700">No study sets yet</p>
            <p className="text-sm text-ink-500">
              Create one from your test list in under a minute.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Link
                href="/create"
                className="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
              >
                + Create Study Set
              </Link>
              <button
                type="button"
                onClick={openExample}
                disabled={exampleBusy}
                className="rounded-xl border border-ink-300 bg-white px-5 py-2.5 font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
              >
                {exampleBusy ? "Opening…" : "Try the example set"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sets.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/set/${s.id}`} className="min-w-0 flex-1 group">
                    <div className="truncate font-semibold text-ink-950 group-hover:text-brand-700">
                      {s.name}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-500">
                      {s.locationCount} places
                    </div>
                  </Link>
                  <Link
                    href={`/set/${s.id}`}
                    className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Study <Icon name="arrow" size={17} className="calm-inline-icon"/>
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
                  <button onClick={() => handleRename(s)} className="hover:text-ink-950">
                    Rename
                  </button>
                  <button onClick={() => handleDuplicate(s)} className="hover:text-ink-950">
                    Duplicate
                  </button>
                  <button onClick={() => handleExport(s)} className="hover:text-ink-950">
                    Export
                  </button>
                  <button onClick={() => handleDelete(s)} className="text-red-500 hover:text-red-700">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
