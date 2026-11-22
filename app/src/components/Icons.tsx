import type { CSSProperties, ReactNode } from "react";

/** ATLAS glyphs: soft, architectural outlines with a quiet second layer. */
export function Icon({ name, size = 20, className = "", style }: {
  name: string; size?: number; className?: string; style?: CSSProperties;
}) {
  const shade = (d: string) => <path d={d} fill="currentColor" fillOpacity=".13" stroke="none" />;
  const glyphs: Record<string, ReactNode> = {
    compass: <>{shade("M12 2 21 7v10l-9 5-9-5V7Z")}<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m16.5 7.5-2.8 6.2-6.2 2.8 2.8-6.2 6.2-2.8Z"/><path className="atlas-icon-accent" d="m12 12 1.7 1.7"/></>,
    globe: <>{shade("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z")}<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/><path className="atlas-icon-accent" d="M12 3v18"/></>,
    map: <>{shade("m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z")}<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16m6-14v16"/><path className="atlas-icon-accent" d="m5 12 3-2 4 3 6-5"/></>,
    book: <>{shade("M3 4h5c2 0 4 1 4 3 0-2 2-3 4-3h5v15h-6c-2 0-3 1-3 2 0-1-1-2-3-2H3Z")}<path d="M12 7c-2-3-6-3-9-3v15c4 0 7 0 9 2 2-2 5-2 9-2V4c-3 0-7 0-9 3Zm0 0v14"/><path className="atlas-icon-accent" d="M6 8h2m-2 4h2m8-4h2m-2 4h2"/></>,
    cards: <>{shade("m8 3 12 2-2 15-12-2Z")}<path d="m8 3 12 2-2 15-12-2L8 3Z"/><path d="m4 7-2 12 11 3"/><path className="atlas-icon-accent" d="m11 8 5 1m-6 3 4 .7"/></>,
    target: <>{shade("M12 4a8 8 0 1 0 8 8h-8Z")}<path d="M20 12a8 8 0 1 1-8-8"/><path d="M16 12a4 4 0 1 1-4-4"/><path className="atlas-icon-accent" d="m12 12 8-8m-4 0h4v4"/></>,
    check: <><path d="M20 11v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h6"/>{shade("M4 12v5a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-5Z")}<path className="atlas-icon-accent" d="m8 11 4 4 9-11"/></>,
    grid: <>{shade("M3 3h7v7H3Zm11 11h7v7h-7Z")}<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><path d="M17.5 3v7M14 6.5h7M3 17.5h7M6.5 14v7"/></>,
    layers: <>{shade("m12 3 10 6-10 6L2 9Z")}<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M6 19l6 3 6-3"/></>,
    flag: <>{shade("M5 3c5-3 9 4 14 1v10c-5 3-9-4-14-1Z")}<path d="M5 22V3c5-3 9 4 14 1v10c-5 3-9-4-14-1"/><path className="atlas-icon-accent" d="M9 6v4m4-3v4"/></>,
    trophy: <>{shade("M7 3h10v6a5 5 0 0 1-10 0Z")}<path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v5m-5 2h10"/><path className="atlas-icon-accent" d="m10 7 2 2 2-2"/></>,
    sun: <>{shade("M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z")}<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    moon: <>{shade("M19 16A9 9 0 0 1 8 5 8 8 0 1 0 19 16Z")}<path d="M19 16A9 9 0 0 1 8 5 8 8 0 1 0 19 16Z"/><path className="atlas-icon-accent" d="M17 2v6m-3-3h6"/></>,
    arrow: <><path d="M4 12h15m-6-6 6 6-6 6"/><path opacity=".3" d="M4 8v8"/></>,
    plus: <><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="10" opacity=".18"/></>,
    minus: <><path d="M5 12h14"/><circle cx="12" cy="12" r="10" opacity=".18"/></>,
    search: <><circle cx="10" cy="10" r="6.5"/>{shade("M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z")}<path d="m15 15 5.5 5.5"/><path className="atlas-icon-accent" d="M7 10a3 3 0 0 1 3-3"/></>,
    close: <><path d="m7 7 10 10M7 17 17 7"/><circle cx="12" cy="12" r="10" opacity=".18"/></>,
    menu: <><path d="M8 6h13M8 12h13M8 18h9"/><path className="atlas-icon-accent" d="M3 6h.1M3 12h.1M3 18h.1" strokeWidth="3"/></>,
    expand: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><path className="atlas-icon-accent" d="m8 16 8-8m-5 0h5v5"/></>,
    text: <><path d="M3 7V4h18v3M12 4v16m-4 0h8"/><path opacity=".25" d="M4 12h3m10 0h3"/></>,
    play: <>{shade("m7 3 14 9-14 9Z")}<path d="m7 3 14 9-14 9V3Z"/></>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></>,
    terrain: <>{shade("m2 20 8-16 5 9 3-5 5 12Z")}<path d="m2 20 8-16 5 9 3-5 5 12H2Zm5-10 3 3 3-3"/></>,
    upload: <><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M12 16V3m-5 5 5-5 5 5"/></>,
    pin: <>{shade("M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0Z")}<path d="M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2.5"/></>,
    spark: <>{shade("m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z")}<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></>,
    repeat: <><path d="M4 9a8 8 0 0 1 13-5l3 3m-5 0h5V2M20 15a8 8 0 0 1-13 5l-3-3m5 0H4v5"/></>,
    medal: <>{shade("M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z")}<path d="m6 3 3 7m9-7-3 7M9 3l3 6 3-6"/><circle cx="12" cy="15" r="6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`atlas-icon ${className}`} style={style}>{glyphs[name] ?? glyphs.compass}</svg>;
}
