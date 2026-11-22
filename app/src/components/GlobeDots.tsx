"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * GlobeDots — the night-atlas object.
 *
 * A dot-matrix Earth rendered on a 2D canvas with an orthographic
 * projection. It drifts slowly on its own, spins with a drag (with
 * inertia), lights the dots nearest the cursor in citron, and reports
 * which country is under the cursor. Dot positions come from
 * src/lib/world-dots.json, sampled from the bundled Natural Earth
 * countries file (public domain).
 */

import dotsJson from "@/lib/world-dots.json";

export interface GlobeHandle {
  /** Animates the globe so the given longitude sits at the center. */
  spinTo: (lngDeg: number) => void;
}

interface GlobeDotsProps {
  className?: string;
  /** Reports the coordinates at the center of the view. */
  onCenterChange?: (label: string) => void;
  /** Reports the country currently under the cursor, or "". */
  onHoverCountry?: (name: string) => void;
}

const TILT = -0.38; // radians — keeps the study-relevant north in view

function formatCoord(latDeg: number, lngDeg: number) {
  const lat = Math.abs(latDeg).toFixed(1).padStart(4, "0");
  const lng = Math.abs(lngDeg).toFixed(1).padStart(5, "0");
  return `${latDeg >= 0 ? "N" : "S"} ${lat}° · ${lngDeg >= 0 ? "E" : "W"} ${lng}°`;
}

function GlobeDots(
  { className = "", onCenterChange, onHoverCountry }: GlobeDotsProps,
  ref: React.Ref<GlobeHandle>
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ onCenterChange, onHoverCountry });
  useEffect(() => {
    cbRef.current = { onCenterChange, onHoverCountry };
  }, [onCenterChange, onHoverCountry]);

  // spinTo state lives outside the effect so the handle can set it.
  const spinTarget = useRef<{ rot: number } | null>(null);
  const rotRef = useRef(-0.6);

  useImperativeHandle(ref, () => ({
    spinTo(lngDeg: number) {
      const current = rotRef.current;
      // Center longitude = -rot; pick the shortest path around the sphere.
      let desired = -lngDeg * (Math.PI / 180);
      const twoPi = Math.PI * 2;
      desired += Math.round((current - desired) / twoPi) * twoPi;
      spinTarget.current = { rot: desired };
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const data = dotsJson as { lng: number[]; lat: number[]; name: string[] };
    const lngs = data.lng;
    const lats = data.lat;
    const names = data.name;
    const N = lngs.length;

    // Precompute unit-sphere positions.
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const pz = new Float32Array(N);
    const D2R = Math.PI / 180;
    for (let i = 0; i < N; i++) {
      const lat = lats[i] * D2R;
      const lng = lngs[i] * D2R;
      px[i] = Math.cos(lat) * Math.cos(lng);
      py[i] = Math.sin(lat);
      pz[i] = Math.cos(lat) * Math.sin(lng);
    }

    // Colors follow the theme via CSS variables.
    const html = document.documentElement;
    let colors = { dot: "rgba(150,164,190,.52)", accent: "#d7f26d" };
    const readColors = () => {
      const s = getComputedStyle(html);
      colors = {
        dot: s.getPropertyValue("--globe-dot").trim() || colors.dot,
        accent: s.getPropertyValue("--globe-dot-accent").trim() || colors.accent,
      };
    };
    readColors();

    // Sprites: one soft base dot, one citron dot.
    const makeSprite = (color: string, size: number) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d")!;
      g.fillStyle = color;
      g.beginPath();
      g.arc(size / 2, size / 2, size / 2 - 0.5, 0, Math.PI * 2);
      g.fill();
      return c;
    };
    let baseSprite = makeSprite(colors.dot, 20);
    let accentSprite = makeSprite(colors.accent, 20);

    const themeObserver = new MutationObserver(() => {
      readColors();
      baseSprite = makeSprite(colors.dot, 20);
      accentSprite = makeSprite(colors.accent, 20);
    });
    themeObserver.observe(html, { attributes: true, attributeFilter: ["class"] });

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(10, Math.round(r.width));
      H = Math.max(10, Math.round(r.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // Rotation state — velocity is integrated per frame for a smooth spin.
    let rot = -0.6;
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    const cursor = { x: -1e4, y: -1e4, active: false };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      vel = 0;
      spinTarget.current = null;
      wrap.classList.add("is-grabbing");
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      cursor.x = (e.clientX - r.left) * dpr;
      cursor.y = (e.clientY - r.top) * dpr;
      cursor.active = true;
      if (dragging) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        rot += dx * 0.0042;
        vel = dx * 0.0042;
      }
    };
    const onUp = () => {
      dragging = false;
      wrap.classList.remove("is-grabbing");
    };
    const onLeave = () => {
      cursor.active = false;
      cursor.x = -1e4;
      cursor.y = -1e4;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let lastT = 0;
    let lastLabel = "";
    let lastCountry = "";
    let pausedFrames = 0;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
      lastT = t;

      // Motion: a requested spin first, then inertia, then a slow drift.
      const target = spinTarget.current;
      if (target) {
        const diff = target.rot - rot;
        rot += diff * Math.min(1, 7 * dt);
        vel = 0;
        if (Math.abs(diff) < 0.002) {
          rot = target.rot;
          spinTarget.current = null;
        }
      } else if (!dragging) {
        if (Math.abs(vel) > 1e-5) {
          rot += vel;
          vel *= Math.pow(0.93, 60 * dt);
        } else if (!reduced) {
          rot += 0.045 * dt;
        }
      }
      rotRef.current = rot;

      // The frame only redraws when something can have changed.
      const moving = dragging || Math.abs(vel) > 1e-5 || (!reduced && 0.045 * dt > 0);
      if (!moving && !cursor.active) {
        pausedFrames++;
        if (pausedFrames > 20) return;
      }
      pausedFrames = 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const R = Math.min(W, H) * 0.42;
      const cx = W / 2;
      const cy = H / 2;
      const sinR = Math.sin(rot), cosR = Math.cos(rot);
      const sinT = Math.sin(TILT), cosT = Math.cos(TILT);

      const reach = Math.max(56, R * 0.3) * dpr;
      const reach2 = reach * reach;
      let hoverName = "";
      let hoverBest = Infinity;

      for (let i = 0; i < N; i++) {
        const x = px[i] * cosR - pz[i] * sinR;
        const z1 = px[i] * sinR + pz[i] * cosR;
        const y = py[i] * cosT - z1 * sinT;
        const z = py[i] * sinT + z1 * cosT;
        if (z <= 0.02) continue;
        const sx = cx + R * x;
        const sy = cy - R * y;
        const dxs = sx * dpr - cursor.x;
        const dys = sy * dpr - cursor.y;
        const d2 = dxs * dxs + dys * dys;
        const near = cursor.active && d2 < reach2;
        const depth = 0.22 + 0.68 * z;
        if (near) {
          ctx.globalAlpha = Math.min(1, depth + 0.3);
          const s = 5 + 2.4 * z + 2.2 * (1 - d2 / reach2);
          ctx.drawImage(accentSprite, sx - s / 2, sy - s / 2, s, s);
          if (names[i] && d2 < hoverBest) {
            hoverBest = d2;
            hoverName = names[i];
          }
        } else {
          ctx.globalAlpha = depth;
          const s = 4.4 + 2 * z;
          ctx.drawImage(baseSprite, sx - s / 2, sy - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;

      if (cbRef.current.onHoverCountry && hoverName !== lastCountry) {
        lastCountry = hoverName;
        cbRef.current.onHoverCountry(hoverName);
      }

      // Report the coordinates at the center of the view.
      if (cbRef.current.onCenterChange) {
        const centerLat = (TILT * 180) / Math.PI;
        let centerLng = ((-rot * 180) / Math.PI) % 360;
        if (centerLng > 180) centerLng -= 360;
        if (centerLng < -180) centerLng += 360;
        const label = formatCoord(centerLat, centerLng);
        if (label !== lastLabel) {
          lastLabel = label;
          cbRef.current.onCenterChange(label);
        }
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`hero-globe ${className}`}>
      <canvas
        ref={canvasRef}
        aria-label="A dot-matrix globe of Earth. Drag to spin."
        role="img"
      />
    </div>
  );
}

export default forwardRef(GlobeDots);
