"use client";

import { useEffect, useRef } from "react";

/**
 * GlobeDots — the night-atlas object.
 *
 * A dot-matrix Earth rendered on a 2D canvas with an orthographic
 * projection. It drifts slowly on its own, spins with a drag (with
 * inertia), and the dots nearest the cursor light up in citron.
 * Dot positions come from src/lib/world-dots.json, sampled from the
 * bundled Natural Earth countries file (public domain).
 */

import dotsJson from "@/lib/world-dots.json";

interface GlobeDotsProps {
  className?: string;
  /** Reports the geographic point currently at the center of the view. */
  onCenterChange?: (label: string) => void;
}

const TILT = -0.38; // radians — keeps the study-relevant north in view

function formatCoord(latDeg: number, lngDeg: number) {
  const lat = Math.abs(latDeg).toFixed(1).padStart(4, "0");
  const lng = Math.abs(lngDeg).toFixed(1).padStart(5, "0");
  return `${latDeg >= 0 ? "N" : "S"} ${lat}° · ${lngDeg >= 0 ? "E" : "W"} ${lng}°`;
}

export default function GlobeDots({ className = "", onCenterChange }: GlobeDotsProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef(onCenterChange);
  useEffect(() => {
    cbRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lngs = (dotsJson as { lng: number[]; lat: number[] }).lng;
    const lats = (dotsJson as { lng: number[]; lat: number[] }).lat;
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

    // Rotation state.
    let rot = -0.6;
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let moved = 0;
    const cursor = { x: -1e4, y: -1e4, active: false };

    const spin = (e: PointerEvent) => {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      rot += dx * 0.005;
      vel = dx * 0.0022;
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      wrap.classList.add("is-grabbing");
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      cursor.x = (e.clientX - r.left) * dpr;
      cursor.y = (e.clientY - r.top) * dpr;
      cursor.active = true;
      if (dragging) spin(e);
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
    let idleFrames = 0;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
      lastT = t;

      // Motion: inertia after a drag, a slow drift when idle.
      if (!dragging) {
        if (Math.abs(vel) > 0.00002) {
          rot += vel * 60 * dt;
          vel *= Math.pow(0.94, 60 * dt);
        } else if (!reduced) {
          rot += 0.05 * dt;
        }
      }

      // Skip frames when nothing moved (saves battery, keeps it crisp).
      if (!dragging && Math.abs(vel) <= 0.00002 && !cursor.active && !reduced) {
        idleFrames++;
        if (idleFrames > 30) return;
      }
      idleFrames = 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const R = Math.min(W, H) * 0.42;
      const cx = W / 2;
      const cy = H / 2;
      const sinR = Math.sin(rot), cosR = Math.cos(rot);
      const sinT = Math.sin(TILT), cosT = Math.cos(TILT);

      const reach = Math.max(52, R * 0.34) * dpr;
      const reach2 = reach * reach;

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
          ctx.globalAlpha = Math.min(1, depth + 0.25);
          const s = 5 + 2.4 * z + 2 * (1 - d2 / reach2);
          ctx.drawImage(accentSprite, sx - s / 2, sy - s / 2, s, s);
        } else {
          ctx.globalAlpha = depth;
          const s = 4.4 + 2 * z;
          ctx.drawImage(baseSprite, sx - s / 2, sy - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;

      // Report the coordinates at the center of the view.
      if (cbRef.current) {
        const centerLat = (TILT * 180) / Math.PI;
        // center longitude undoes the spin
        let centerLng = ((-rot * 180) / Math.PI) % 360;
        if (centerLng > 180) centerLng -= 360;
        if (centerLng < -180) centerLng += 360;
        const label = formatCoord(centerLat, centerLng);
        if (label !== lastLabel) {
          lastLabel = label;
          cbRef.current(label);
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
      <canvas ref={canvasRef} aria-label="A dot-matrix globe of Earth. Drag to spin." role="img" />
    </div>
  );
}
