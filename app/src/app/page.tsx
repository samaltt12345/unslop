"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AtlasBrand from "@/components/AtlasBrand";
import ThemeToggle from "@/components/ThemeToggle";
import { Icon } from "@/components/Icons";
import GlobeDots from "@/components/GlobeDots";
import { GAZETTEER } from "@/lib/gazetteer";
import { listSets, loadExampleSet } from "@/lib/client";
import type { StudySetDTO } from "@/lib/types";

const modes = [
  { icon: "book", title: "Learn", text: "Drills in small groups, until every place sticks.", path: "learn" },
  { icon: "cards", title: "Flashcards", text: "Both directions — name the place, find the place.", path: "flashcards" },
  { icon: "target", title: "Test yourself", text: "Typed, multiple choice, or click the map. Graded as you go.", path: "test" },
  { icon: "globe", title: "Blank map", text: "No labels. Just you and your bearings.", path: "test?blank=1" },
];

/** A slow strip of real places the atlas already knows. */
const tickerPlaces = GAZETTEER.filter((e) => e.type === "Country")
  .filter((_, i) => i % 4 === 0)
  .slice(0, 26)
  .map((e) => e.name);

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
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sets, setSets] = useState<StudySetDTO[]>([]);
  const [coords, setCoords] = useState("N 22.0° · W 034.0°");
  useReveal();
  useEffect(() => {
    listSets().then(setSets).catch(() => {});
  }, []);
  async function open(path = "") {
    setBusy(true); setError("");
    try {
      const id = await loadExampleSet();
      router.push(`/set/${id}${path ? `/${path}` : ""}`);
    } catch {
      setError("Couldn’t open your atlas. Give it another try.");
      setBusy(false);
    }
  }
  const ticker = useMemo(() => [...tickerPlaces, ...tickerPlaces], []);
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
        {/* The night stage: one bright object, one promise */}
        <section className="calm-hero calm-container">
          <div className="calm-hero-copy">
            <div className="calm-eyebrow"><span className="calm-live-dot"/>An atlas that studies back</div>
            <h1>Less memorizing.<br/>More <em>knowing.</em></h1>
            <p>Paste the list you have to learn. Every place is plotted on a working map, then drilled with flashcards, tests and a blank map until it sticks.</p>
            <div className="calm-hero-actions">
              <button className="calm-primary" onClick={() => open()} disabled={busy}>
                {busy ? "Opening your atlas…" : "Start exploring"}<Icon name="arrow" size={20}/>
              </button>
              <Link href="/create" className="calm-secondary">Make your own<Icon name="plus" size={16}/></Link>
            </div>
            {error && <p role="alert">{error}</p>}
            <div className="calm-hero-proof">
              <span><Icon name="check" size={14}/>57 built-in places</span>
              <span>No account needed</span>
              <span>Progress stays on this device</span>
            </div>
          </div>
          <div className="hero-stage">
            <div className="hero-meta tr"><span className="hero-meta-dot"/>ATLAS · NIGHT SURVEY · SHEET 01</div>
            <GlobeDots onCenterChange={setCoords}/>
            <div className="hero-meta br">{coords}</div>
            <div className="hero-drag-hint"><Icon name="compass" size={13}/>DRAG TO SPIN</div>
          </div>
        </section>

        {/* The contents of the atlas, set in type */}
        <div className="atlas-ticker" aria-hidden="true">
          <div className="atlas-ticker-track">
            {ticker.map((name, i) => (
              <span key={i}>{name}<i>·</i></span>
            ))}
          </div>
        </div>

        {/* Four routes into the same atlas */}
        <section id="study-modes" className="calm-modes calm-container">
          <div className="calm-section-heading" data-reveal>
            <div>
              <span className="calm-eyebrow">One atlas, four routes</span>
              <h2>Find your way.</h2>
            </div>
            <p>Same map, same places — pick the pace that makes them stick.</p>
          </div>
          <div className="mode-rows" data-reveal>
            {modes.map((m, i) => (
              <button key={m.path} className="mode-row" onClick={() => open(m.path)} disabled={busy}>
                <span className="mode-row-num"><em>0{i + 1}</em>/ 04</span>
                <span>
                  <h3><Icon name={m.icon} size={22}/>{m.title}</h3>
                  <p>{m.text}</p>
                </span>
                <span className="mode-row-go" aria-hidden="true"><Icon name="arrow" size={18}/></span>
              </button>
            ))}
          </div>
        </section>

        {sets.length > 0 && (
          <section className="calm-recent calm-container">
            <div className="calm-section-heading" data-reveal>
              <div>
                <span className="calm-eyebrow">Right where you left off</span>
                <h2>Your atlas.</h2>
              </div>
              <Link className="calm-text-link" href="/sets">View my atlas<Icon name="arrow" size={16}/></Link>
            </div>
            <div className="calm-recent-grid" data-reveal>
              {sets.slice(0, 3).map((s) => (
                <Link href={`/set/${s.id}`} key={s.id}>
                  <span className="calm-icon-tile"><Icon name="map" size={21}/></span>
                  <div>
                    <h3>{s.name.replace(" (Example)", "")}</h3>
                    <p>{s.locationCount ?? 0} PLACES</p>
                  </div>
                  <Icon name="arrow" size={17}/>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="calm-footer calm-container">
        <div className="footer-wordmark" aria-hidden="true">atlas<i>.</i></div>
        <div className="footer-side">
          <span>A world worth knowing · N 40.8° · W 073.6°</span>
          <div className="footer-links">
            <Link href="/sets">My atlas</Link>
            <Link href="/create">Create a set</Link>
            <a href="#" aria-label="Back to top"><Icon name="arrow" style={{ transform: "rotate(-90deg)" }}/></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
