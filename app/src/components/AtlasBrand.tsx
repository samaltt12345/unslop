import Link from "next/link";
export function AtlasMark({ size = 34 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className="atlas-logomark"><rect x="1" y="1" width="38" height="38" rx="12" fill="currentColor" fillOpacity=".07" stroke="currentColor" strokeOpacity=".22"/><path d="m10 29 8-19h5l8 19h-6l-5-13-4 13h-6Z" fill="currentColor"/><path d="m12 24 15-5" stroke="var(--a-accent, #d5ed9c)" strokeWidth="3"/><circle cx="29" cy="10" r="2.5" fill="var(--a-accent, #d5ed9c)"/></svg>;
}
export default function AtlasBrand({ compact = false }: { compact?: boolean }) {
  return <Link className={`atlas-brand ${compact ? "compact" : ""}`} href="/" aria-label="ATLAS home"><AtlasMark/><span>atlas<span className="atlas-brand-period" aria-hidden="true">.</span></span></Link>;
}
