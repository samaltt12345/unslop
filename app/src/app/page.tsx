"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AtlasBrand from "@/components/AtlasBrand";
import ThemeToggle from "@/components/ThemeToggle";
import { Icon } from "@/components/Icons";
import GlobeDots, { type GlobeHandle } from "@/components/GlobeDots";
import { listSets, loadExampleSet } from "@/lib/client";
import type { StudySetDTO } from "@/lib/types";

const modes = [
  { icon: "book", title: "Learn", path: "learn" },
  { icon: "cards", title: "Flashcards", path: "flashcards" },
  { icon: "target", title: "Test", path: "test" },
  { icon: "globe", title: "Blank map", path: "test?blank=1" },
];

const regions = [
  { name: "Europe", lng: 14 },
  { name: "Africa", lng: 22 },
  { name: "Asia", lng: 92 },
  { name: "N. America", lng: -98 },
  { name: "S. America", lng: -62 },
  { name: "Oceania", lng: 138 },
];

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function Home() {
  const router = useRouter();
  const globe = useRef<GlobeHandle>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sets, setSets] = useState<StudySetDTO[]>([]);
  const [coords, setCoords] = useState("N 22.0° · W 034.0°");
  const [country, setCountry] = useState("");
  const [chip, setChip] = useState({ x: 0, y: 0 });
  useReveal();
  useEffect(() => {
    listSets().then(setSets).catch(() => {});
  }, []);

  async function open(path = "") {
    setBusy(true);
    setError("");
    try {
      // The 57 built-in places, loaded and plotted.
      const id = await loadExampleSet();
      router.push(`/set/${id}${path ? `/${path}` : ""}`);
    } catch {
      setError("Couldn’t open your atlas. Give it another try.");
      setBusy(false);
    }
  }

  function trackCursor(e: React.PointerEvent) {
    const r = stage.current?.getBoundingClientRect();
    if (!r) return;
    setChip({ x: e.clientX - r.left, y: e.clientY - r.top });
  }

  return (
    <div className="calm-home">
      <header className="calm-site-header">
        <div className="calm-container calm-nav">
          <AtlasBrand/>
          <nav aria-label="Main navigation">
            <a href="#study-modes" className="calm-nav-study">Ways to study</a>
            <Link href="/sets">My atlas</Link>
            <ThemeToggle/>
            <Link href="/create" className="calm-create" aria-label="Create a set">
              <Icon name="plus" size={16}/><span>Create a set</span>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Night stage: star field, the globe, one promise */}
        <section className="calm-hero">
          <div className="hero-backdrop" aria-hidden="true"/>
          <div className="calm-container hero-grid">
            <div className="calm-hero-copy">
              <div className="calm-eyebrow"><span className="calm-live-dot"/>The night atlas</div>
              <h1>Less memorizing.<br/>More <em>knowing.</em></h1>
              <p>57 places are already plotted and waiting.</p>
              <div className="calm-hero-actions">
                <button className="calm-primary" onClick={() => open()} disabled={busy}>
                  {busy ? "Plotting…" : "Start exploring"}<Icon name="arrow" size={20}/>
                </button>
                <Link href="/create" className="calm-secondary" aria-label="Create your own set">
                  <Icon name="plus" size={16}/>
                </Link>
              </div>
              {error && <p role="alert">{error}</p>}
            </div>

            <div
              className="hero-stage"
              ref={stage}
              onPointerMove={trackCursor}
              onPointerLeave={() => setCountry("")}
            >
              <GlobeDots ref={globe} onCenterChange={setCoords} onHoverCountry={setCountry}/>
              <div className="hero-meta tr">{country || "ATLAS · NIGHT SURVEY"}</div>
              <div className="hero-meta bl">{coords}</div>
              {country && (
                <div
                  className="hero-country-chip"
                  style={{ left: chip.x + 14, top: chip.y - 34 }}
                  aria-hidden="true"
                >
                  {country}
                </div>
              )}
              <div className="hero-jump" role="group" aria-label="Spin the globe to a region">
                {regions.map((r) => (
                  <button key={r.name} onClick={() => globe.current?.spinTo(r.lng)}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* One bright moment: the survey desk */}
        <section className="calm-desk calm-container" data-reveal>
          <figure className="desk-figure">
            <img
              src="/img/survey-desk.jpg"
              alt="A survey desk at midnight: numbered pins joined by citron thread on a dark chart"
            />
            <figcaption>
              <span className="calm-eyebrow">Your list becomes this</span>
              <h2>Plotted. Pinned. Threaded together.</h2>
            </figcaption>
          </figure>
        </section>

        {/* Four routes, one tap each */}
        <section id="study-modes" className="calm-modes calm-container" data-reveal>
          <div className="mode-rows">
            {modes.map((m, i) => (
              <button key={m.path} className="mode-row" onClick={() => open(m.path)} disabled={busy}>
                <span className="mode-row-num"><em>0{i + 1}</em></span>
                <span className="mode-row-title"><Icon name={m.icon} size={20}/>{m.title}</span>
                <span className="mode-row-go" aria-hidden="true"><Icon name="arrow" size={17}/></span>
              </button>
            ))}
          </div>
        </section>

        {sets.length > 0 && (
          <section className="calm-recent calm-container" data-reveal>
            <div className="calm-section-heading">
              <span className="calm-eyebrow">Your atlas</span>
              <Link className="calm-text-link" href="/sets">View all<Icon name="arrow" size={15}/></Link>
            </div>
            <div className="calm-recent-grid">
              {sets.slice(0, 3).map((s) => (
                <Link href={`/set/${s.id}`} key={s.id}>
                  <span className="calm-icon-tile"><Icon name="map" size={20}/></span>
                  <div>
                    <h3>{s.name.replace(" (Example)", "")}</h3>
                    <p>{s.locationCount ?? 0} places</p>
                  </div>
                  <Icon name="arrow" size={16}/>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="calm-footer calm-container">
        <AtlasBrand/>
        <span className="footer-coords">{coords}</span>
        <div className="footer-links">
          <Link href="/sets">My atlas</Link>
          <Link href="/create">Create a set</Link>
          <a href="#" aria-label="Back to top"><Icon name="arrow" style={{ transform: "rotate(-90deg)" }}/></a>
        </div>
      </footer>
    </div>
  );
}
