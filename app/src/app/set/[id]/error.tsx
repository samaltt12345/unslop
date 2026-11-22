"use client";

import { useEffect } from "react";
import { AtlasMark } from "@/components/AtlasBrand";

export default function StudySetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ATLAS study set error", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6">
      <section className="w-full max-w-md rounded-3xl border border-ink-200 bg-white p-7 text-center shadow-xl shadow-ink-950/10">
        <div className="mx-auto w-fit text-brand-600"><AtlasMark size={52}/></div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-950">
          The map needs a quick refresh
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Your study set and test progress are safe. Reload the map to create a
          fresh map session.
        </p>
        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              window.location.reload();
            }}
            className="rounded-xl bg-brand-600 px-5 py-3 font-bold text-white transition hover:bg-brand-700"
          >
            Reload map
          </button>
          <a
            href="/sets"
            className="rounded-xl border border-ink-200 px-5 py-3 font-bold text-ink-700 transition hover:bg-ink-50"
          >
            My study sets
          </a>
        </div>
      </section>
    </main>
  );
}
