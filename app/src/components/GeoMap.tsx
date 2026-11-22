"use client";
import { Icon } from "@/components/Icons";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type * as LType from "leaflet";
import type { FeatureCollection, Feature } from "geojson";
import { normalizeName } from "@/lib/geo";
import type { BBox, LatLng } from "@/lib/geo";
import { MASTERY_COLORS } from "@/lib/types";

export interface MapMarker {
  id: number | string;
  /** 1-based study-set number shown inside the pin. */
  number: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  mastery?: number;
  studied?: boolean;
}

export interface MapHighlight {
  lat: number;
  lng: number;
  radiusKm?: number;
  bboxes?: BBox[] | null;
  path?: LatLng[] | null;
  color?: string;
  label?: string;
  /** Internal shape lookup; never rendered as an answer label. */
  featureName?: string;
  approximate?: boolean;
}

export type LabelMode = "none" | "active" | "all";

export interface GeoMapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  flyToShape: (h: MapHighlight) => void;
  fitAll: () => void;
  resetView: () => void;
  refresh: () => void;
  clearClickMarker: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface GeoMapProps {
  markers: MapMarker[];
  blank?: boolean;
  labelMode?: LabelMode;
  selectedId?: number | string | null;
  hoveredId?: number | string | null;
  highlight?: MapHighlight | null;
  clickMarker?: { lat: number; lng: number; color?: string } | null;
  connector?: { from: [number, number]; to: [number, number] } | null;
  onMarkerClick?: (id: number | string) => void;
  onMarkerHover?: (id: number | string | null) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  fitOnLoad?: boolean;
  focusEuropeOnMobile?: boolean;
  minimalControls?: boolean;
  expeditionRoute?: [number, number][];
}

const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-85, -180],
  [85, 180],
];

// One same-origin, public-domain boundary download shared across map instances.
let boundaryRequest: Promise<FeatureCollection> | null = null;
function loadBoundaries() {
  if (!boundaryRequest) boundaryRequest = fetch("/data/countries.geojson")
    .then((response) => { if (!response.ok) throw new Error("Boundary layer unavailable"); return response.json() as Promise<FeatureCollection>; })
    .catch((error) => { boundaryRequest = null; throw error; });
  return boundaryRequest;
}

const GeoMap = forwardRef<GeoMapHandle, GeoMapProps>(function GeoMap(
  {
    markers,
    blank = false,
    labelMode = "active",
    selectedId = null,
    hoveredId = null,
    highlight = null,
    clickMarker = null,
    connector = null,
    onMarkerClick,
    onMarkerHover,
    onMapClick,
    className = "",
    fitOnLoad = true,
    focusEuropeOnMobile = false,
    minimalControls = false,
    expeditionRoute,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const LRef = useRef<typeof LType | null>(null);
  const pinLayerRef = useRef<LType.LayerGroup | null>(null);
  const leaderLayerRef = useRef<LType.LayerGroup | null>(null);
  const highlightLayerRef = useRef<LType.LayerGroup | null>(null);
  const clickMarkerRef = useRef<LType.Layer | null>(null);
  const connectorRef = useRef<LType.Layer | null>(null);
  const tilesRef = useRef<LType.TileLayer[]>([]);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const didFitRef = useRef(false);
  // Leaflet loads asynchronously. View commands issued before it is ready are
  // stored here and replayed on init, so the first question of a session still
  // zooms to its location instead of sitting at whole-world zoom.
  const pendingViewRef = useRef<(() => void) | null>(null);
  const [mapError, setMapError] = useState("");
  const [terrain, setTerrain] = useState(false);
  const terrainRef = useRef(false);
  terrainRef.current = terrain;
  const routeLayerRef = useRef<LType.LayerGroup | null>(null);
  const [bordersVisible, setBordersVisible] = useState(true);
  const [boundaryError, setBoundaryError] = useState(false);
  const bordersRef = useRef<LType.GeoJSON | null>(null);
  const countryDataRef = useRef<FeatureCollection | null>(null);
  const bordersVisibleRef = useRef(true);
  const themeObserverRef = useRef<MutationObserver | null>(null);
  const wheelCleanupRef = useRef<(() => void) | null>(null);
  const stopWheelRef = useRef<(() => void) | null>(null);
  const highlightPropsRef = useRef({ highlight, selectedId, markers });
  highlightPropsRef.current = { highlight, selectedId, markers };

  // Latest props for handlers that live outside React's render cycle.
  const propsRef = useRef({
    markers,
    labelMode,
    selectedId,
    hoveredId,
    onMarkerClick,
    onMarkerHover,
    onMapClick,
  });
  propsRef.current = {
    markers,
    labelMode,
    selectedId,
    hoveredId,
    onMarkerClick,
    onMarkerHover,
    onMapClick,
  };

  const markersKey = JSON.stringify(
    markers.map((m) => [m.id, m.number, m.lat, m.lng, m.name, m.mastery, m.studied])
  );
  const highlightKey = JSON.stringify(highlight);

  function worldFillZoom(): number {
    const el = containerRef.current;
    if (!el) return 2;
    const w = el.clientWidth || 1024;
    const h = el.clientHeight || 640;
    const zw = Math.log2(Math.max(w, 1) / 256);
    const zh = Math.log2(Math.max(h, 1) / 256);
    return Math.max(1, Math.ceil(Math.max(zw, Math.min(zh, 2.2)) * 100) / 100);
  }

  function applyMinZoom() {
    const map = mapRef.current;
    if (!map) return;
    const z = worldFillZoom();
    const needsBump = map.getZoom() < z;
    // Assign the option directly: Leaflet's setMinZoom() kicks off an
    // *animated* setZoom when the current zoom is below the new minimum, and
    // that animation lands after any later fitBounds/flyTo, snapping the map
    // back to whole-world zoom. Correcting it instantly avoids that race.
    map.options.minZoom = z;
    map.fire("zoomlevelschange");
    if (needsBump) map.setZoom(z, { animate: false });
  }

  /**
   * Place every visible pin so that NO number is ever hidden.
   * Pins that would overlap are nudged outward along a golden-angle spiral and
   * connected back to their true coordinate with a thin leader line.
   */
  function renderPins() {
    const L = LRef.current;
    const map = mapRef.current;
    const pinLayer = pinLayerRef.current;
    const leaderLayer = leaderLayerRef.current;
    if (!L || !map || !pinLayer || !leaderLayer) return;

    const { markers: ms, labelMode: lm, selectedId: sel, hoveredId: hov } =
      propsRef.current;

    pinLayer.clearLayers();
    leaderLayer.clearLayers();
    if (!ms.length) return;

    // Only lay out what's actually on screen (keeps 250+ sets fast).
    const view = map.getBounds().pad(0.25);
    const visible = ms.filter((m) => view.contains([m.lat, m.lng]));

    // Deterministic order so layout doesn't jitter: north-to-south.
    const ordered = [...visible].sort((a, b) => b.lat - a.lat || a.number - b.number);

    type Rect = { x: number; y: number; w: number; h: number };
    const overlaps = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const GOLDEN = 2.399963229728653;
    const placedPts: LType.Point[] = [];
    const occupied: Rect[] = [];

    // ---- Pass 1: every number gets a collision-free slot (never hidden) ----
    const laid = ordered.map((m) => {
      const isActive = m.id === sel || m.id === hov;
      const base = map.latLngToLayerPoint([m.lat, m.lng]);
      const half = isActive ? 16 : 13;

      let p = base;
      let step = 0;
      while (step < 100 && placedPts.some((q) => q.distanceTo(p) < half * 2 + 3)) {
        step++;
        const angle = step * GOLDEN;
        const radius = 20 + step * 2.6;
        p = L.point(
          base.x + radius * Math.cos(angle),
          base.y + radius * Math.sin(angle)
        );
      }
      placedPts.push(p);
      occupied.push({ x: p.x - half, y: p.y - half, w: half * 2, h: half * 2 });
      return { m, base, p, isActive, half };
    });

    // ---- Pass 2: greedily add name labels that fit without overlapping ----
    // Active pins get first claim, then lower numbers.
    const labelOrder = [...laid].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.m.number - b.m.number;
    });
    const withLabel = new Set<number | string>();
    if (lm !== "none") {
      for (const item of labelOrder) {
        if (lm === "active" && !item.isActive) continue;
        const text = item.m.name;
        const w = Math.min(190, text.length * 6.4 + 14);
        const rect: Rect = {
          x: item.p.x + item.half + 4,
          y: item.p.y - 10,
          w,
          h: 20,
        };
        // Active labels always win; others must find clean space.
        if (item.isActive || !occupied.some((r) => overlaps(rect, r))) {
          occupied.push(rect);
          withLabel.add(item.m.id);
        }
      }
    }

    // ---- Pass 3: draw ----
    for (const { m, base, p, isActive } of laid) {
      const displaced = p.distanceTo(base) > 2;
      const pos = map.layerPointToLatLng(p);

      // Leader line back to the true coordinate, so accuracy is never lost.
      if (displaced) {
        L.polyline(
          [
            [m.lat, m.lng],
            [pos.lat, pos.lng],
          ],
          {
            color: isActive ? "#d5ed9c" : "#7e9ac0",
            weight: isActive ? 1.8 : 1.2,
            opacity: isActive ? 0.95 : 0.65,
            interactive: false,
          }
        ).addTo(leaderLayer);
        L.circleMarker([m.lat, m.lng], {
          radius: 2.4,
          color: isActive ? "#d5ed9c" : "#7e9ac0",
          fillColor: "#fff",
          fillOpacity: 1,
          weight: 1.3,
          interactive: false,
        }).addTo(leaderLayer);
      }

      const accent = MASTERY_COLORS[Math.min(3, Math.max(0, m.mastery ?? 0))];
      const cls = [
        "gm-marker",
        isActive ? "is-active" : "",
        m.id === sel ? "is-selected" : "",
        m.studied ? "is-studied" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const html =
        `<div class="${cls}" style="--accent:${accent}">` +
        `<div class="gm-num">${m.number}</div>` +
        (withLabel.has(m.id) ? `<div class="gm-lab">${escapeHtml(m.name)}</div>` : "") +
        `</div>`;

      const marker = L.marker([pos.lat, pos.lng], {
        icon: L.divIcon({
          className: "gm-pin-wrap",
          html,
          iconSize: undefined,
          iconAnchor: [13, 13],
        }),
        keyboard: false,
        riseOnHover: true,
        zIndexOffset: m.id === sel ? 1000 : isActive ? 600 : 0,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e as unknown as Event);
        propsRef.current.onMarkerClick?.(m.id);
      });
      marker.on("mouseover", () => propsRef.current.onMarkerHover?.(m.id));
      marker.on("mouseout", () => propsRef.current.onMarkerHover?.(null));

      marker.addTo(pinLayer);
    }
  }

  function schedulePins() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      renderPins();
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mapRef.current || !containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      // Next.js can recycle this DOM node during a fast route transition. If a
      // previous Leaflet instance left its private id behind, L.map throws
      // "Map container is already initialized" and the page appears blank.
      const container = containerRef.current as HTMLDivElement & {
        _leaflet_id?: number;
      };
      if (container._leaflet_id) delete container._leaflet_id;

      const map = L.map(container, {
        center: [20, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 11,
        worldCopyJump: false,
        maxBounds: L.latLngBounds(WORLD_BOUNDS),
        maxBoundsViscosity: 1,
        zoomControl: false,
        attributionControl: true,
        zoomSnap: 0,
        zoomDelta: 0.5,
        scrollWheelZoom: false,
        inertia: true,
        inertiaDeceleration: 2400,
        inertiaMaxSpeed: 1400,
        easeLinearity: 0.2,
        fadeAnimation: true,
        zoomAnimation: true,
        preferCanvas: true,
        renderer: L.canvas({ padding: 0.35 }),
      });
      map.attributionControl.setPrefix("");

      mapRef.current = map;
      map.createPane("atlas-grid");
      map.getPane("atlas-grid")!.style.zIndex = "250";
      map.getPane("atlas-grid")!.style.pointerEvents = "none";
      const grid = L.layerGroup().addTo(map);
      const gridStyle = { color: "#788ba8", weight: 0.6, opacity: 0.1, interactive: false, pane: "atlas-grid" };
      for (let lat = -80; lat <= 80; lat += 10) L.polyline([[lat,-180],[lat,180]],gridStyle).addTo(grid);
      for (let lng = -180; lng <= 180; lng += 10) L.polyline([[-85,lng],[85,lng]],gridStyle).addTo(grid);
      map.createPane("atlas-route");
      map.getPane("atlas-route")!.style.zIndex = "420";
      map.getPane("atlas-route")!.style.pointerEvents = "none";
      routeLayerRef.current = L.layerGroup().addTo(map);
      if (expeditionRoute?.length) L.polyline(expeditionRoute, { pane: "atlas-route", renderer: L.svg({ pane: "atlas-route", padding: 0.4 }), className: "atlas-expedition-route", color: "#d5ed9c", weight: 1.6, dashArray: "2 9", opacity: .85, lineCap: "round", interactive: false }).addTo(routeLayerRef.current);
      leaderLayerRef.current = L.layerGroup().addTo(map);
      highlightLayerRef.current = L.layerGroup().addTo(map);
      pinLayerRef.current = L.layerGroup().addTo(map);

      map.on("click", (e: LType.LeafletMouseEvent) => {
        propsRef.current.onMapClick?.(e.latlng.lat, e.latlng.lng);
      });
      // Continuous fractional wheel zoom, anchored at the pointer. No page-scroll
      // hijacking outside the map, and no destroying pins during each zoom.
      let wheelFrame = 0;
      let wheelTarget = map.getZoom();
      let wheelAnchor = L.point(0, 0);
      let wheelAnchorLocation = map.getCenter();
      // Use the same continuous move lifecycle as Leaflet's flyTo, rather than
      // setView on every frame (which reprojects all country geometry each time).
      // These internals are exercised against the app's Leaflet 1.9 dependency.
      const smoothMap = map as LType.Map & {
        _moveStart: (zoomChanged: boolean) => LType.Map;
        _move: (center: LType.LatLng, zoom: number, data?: { flyTo: boolean }) => LType.Map;
        _moveEnd: (zoomChanged: boolean) => LType.Map;
        _limitCenter: (center: LType.LatLng, zoom: number, bounds: LType.LatLngBounds) => LType.LatLng;
      };
      const wheelBounds = L.latLngBounds(WORLD_BOUNDS);
      const moveWheel = (zoom: number) => {
        const offset = wheelAnchor.subtract(map.getSize().divideBy(2));
        const center = map.unproject(map.project(wheelAnchorLocation, zoom).subtract(offset), zoom);
        smoothMap._move(smoothMap._limitCenter(center, zoom, wheelBounds), zoom, { flyTo: true });
      };
      let wheelLast = 0;
      let wheelActive = false;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const frame = (now: number) => {
        if (cancelled) return;
        const dt = Math.min(40, now - (wheelLast || now - 16));
        wheelLast = now;
        const current = map.getZoom();
        const next = current + (wheelTarget - current) * (reduceMotion ? 1 : 1 - Math.exp(-dt / 65));
        if (Math.abs(wheelTarget - next) < 0.003) {
          moveWheel(wheelTarget);
          wheelActive = false;
          wheelFrame = 0;
          smoothMap._moveEnd(true);
          schedulePins();
          return;
        }
        moveWheel(next);
        wheelFrame = requestAnimationFrame(frame);
      };
      const wheel = (event: WheelEvent) => {
        if (event.ctrlKey) return; // Leave browser accessibility zoom intact.
        event.preventDefault();
        map.stop();
        if (!wheelActive) { wheelTarget = map.getZoom(); wheelLast = 0; smoothMap._moveStart(true); }
        wheelAnchor = map.mouseEventToContainerPoint(event);
        wheelAnchorLocation = map.containerPointToLatLng(wheelAnchor);
        const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? container.clientHeight : 1);
        wheelTarget = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), wheelTarget - Math.max(-160, Math.min(160, pixels)) / 340));
        wheelActive = true;
        if (!wheelFrame) wheelFrame = requestAnimationFrame(frame);
      };
      const stopWheel = () => {
        cancelAnimationFrame(wheelFrame); wheelFrame = 0;
        if (wheelActive) { wheelActive = false; smoothMap._moveEnd(true); }
      };
      stopWheelRef.current = stopWheel;
      container.addEventListener("wheel", wheel, { passive: false });
      container.addEventListener("pointerdown", stopWheel);
      wheelCleanupRef.current = () => {
        stopWheel(); container.removeEventListener("wheel", wheel); container.removeEventListener("pointerdown", stopWheel);
      };
      // Re-flow pins whenever the view changes.
      map.on("zoomend moveend", () => { if (!wheelActive) schedulePins(); });

      renderTiles();
      // Visible modern boundaries, including in blank-map mode, without names.
      loadBoundaries().then((data) => {
        if (cancelled || !mapRef.current) return;
        countryDataRef.current = data;
        bordersRef.current = L.geoJSON(data, {
          style: { color: "#718cb0", weight: 0.9, opacity: bordersVisibleRef.current ? 0.85 : 0, fillColor: "#dce6f4", fillOpacity: terrainRef.current ? 0.035 : 1 },
          interactive: false,
        }).addTo(map);
        const syncTheme = () => {
          const dark = document.documentElement.classList.contains("dark");
          bordersRef.current?.setStyle({ color: dark ? "#536f96" : "#8da3c3", fillColor: dark ? "#20395c" : "#dce6f4" });
          renderHighlight();
        };
        syncTheme();
        themeObserverRef.current = new MutationObserver(syncTheme);
        themeObserverRef.current.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        renderHighlight();
      }).catch(() => { if (!cancelled) setBoundaryError(true); });
      applyMinZoom();
      renderHighlight();
      renderClickMarker();
      renderConnector();
      if (pendingViewRef.current) {
        const run = pendingViewRef.current;
        pendingViewRef.current = null;
        run();
      } else if (fitOnLoad) {
        if (focusEuropeOnMobile && container.clientWidth < 640) {
          // A phone cannot show the Atlantic and all of Russia legibly at once.
          // Start over Europe; the list and Fit All still reach every location.
          map.setView([51, 16], 4.1, { animate: false });
          didFitRef.current = true;
        } else fitAllInternal();
      }
      renderPins();

      const ro = new ResizeObserver(() => {
        map.invalidateSize();
        applyMinZoom();
        schedulePins();
      });
      ro.observe(containerRef.current);
      resizeObsRef.current = ro;
      setMapError("");
    })().catch((error: unknown) => {
      if (cancelled) return;
      console.error("ATLAS map initialization failed", error);
      setMapError("The map could not initialize after navigation.");
    });
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      wheelCleanupRef.current?.();
      themeObserverRef.current?.disconnect();
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      if (mapRef.current) {
        const oldContainer = mapRef.current.getContainer() as HTMLDivElement & {
          _leaflet_id?: number;
        };
        mapRef.current.off();
        mapRef.current.remove();
        if (oldContainer._leaflet_id) delete oldContainer._leaflet_id;
        mapRef.current = null;
      }
      bordersRef.current = null;
      countryDataRef.current = null;
      LRef.current = null;
      pinLayerRef.current = null;
      leaderLayerRef.current = null;
      highlightLayerRef.current = null;
      clickMarkerRef.current = null;
      connectorRef.current = null;
      tilesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderTiles() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    for (const t of tilesRef.current) map.removeLayer(t);
    tilesRef.current = [];

    map.attributionControl.removeAttribution('Natural Earth · Public-domain boundaries');
    if (!terrainRef.current) {
      map.setMaxZoom(11);
      map.attributionControl.addAttribution('Natural Earth · Public-domain boundaries');
      bordersRef.current?.setStyle({ fillOpacity: 1 });
      return;
    }
    // The original terrain/reference maps remain available as a layer option.
    const maxZoom = 11;
    map.setMaxZoom(maxZoom);
    bordersRef.current?.setStyle({ fillOpacity: 0.035 });
    const url = blank
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}"
      : "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}";
    const base = L.tileLayer(url, {
      noWrap: true,
      bounds: L.latLngBounds(WORLD_BOUNDS),
      maxZoom,
      maxNativeZoom: blank ? 8 : 11,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 3,
      attribution: blank
        ? "Tiles &copy; Esri, US National Park Service · Borders: Natural Earth"
        : "Tiles &copy; Esri, National Geographic, USGS · Borders: Natural Earth",
    }).addTo(map);
    base.on("tileerror", () => bordersRef.current?.setStyle({ fillOpacity: 1 }));
    base.on("tileload", () => bordersRef.current?.setStyle({ fillOpacity: 0.035 }));
    tilesRef.current.push(base);
    base.bringToBack();
  }

  function renderHighlight() {
    const L = LRef.current;
    if (!L || !highlightLayerRef.current) return;
    highlightLayerRef.current.clearLayers();
    const { highlight, selectedId, markers } = highlightPropsRef.current;
    if (!highlight) return;
    const color = highlight.color ?? "#d5ed9c";
    const layer = highlightLayerRef.current;

    const selectedMarker = markers.find((marker) => marker.id === selectedId);
    const label = highlight.featureName || highlight.label || selectedMarker?.name || "";
    const aliases: Record<string, string> = {
      "bosnia & herzegovina": "bosnia and herzegovina",
      "czech republic": "czechia",
      "vatican city": "vatican",
    };
    const key = aliases[normalizeName(label)] ?? normalizeName(label);
    const country: Feature | undefined = countryDataRef.current?.features.find((feature) => {
      const p = feature.properties;
      return [p?.name, p?.name_long].some((name) => name && normalizeName(name) === key);
    });
    if (country) {
      L.geoJSON(country, { style: { color, weight: 2.4, opacity: 1, fillColor: color, fillOpacity: 0.19 }, interactive: false }).addTo(layer);
    } else if (highlight.path && highlight.path.length > 1) {
      L.polyline(highlight.path as [number, number][], {
        color: "#ffffff",
        weight: 10,
        opacity: 0.45,
        interactive: false,
      }).addTo(layer);
      L.polyline(highlight.path as [number, number][], {
        color,
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(layer);
    } else if (highlight.bboxes && highlight.bboxes.length) {
      for (const b of highlight.bboxes) {
        L.rectangle(
          [
            [b[0], b[1]],
            [b[2], b[3]],
          ],
          {
            color,
            weight: 2.5,
            fillColor: color,
            fillOpacity: 0.15,
            dashArray: "7 5",
            interactive: false,
          }
        ).addTo(layer);
      }
    } else if (highlight.approximate && (highlight.radiusKm ?? 0) > 30) {
      L.circle([highlight.lat, highlight.lng], {
        radius: (highlight.radiusKm ?? 100) * 1000,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.12,
        dashArray: "6 6",
        interactive: false,
      }).addTo(layer);
    }

    const pulse = L.divIcon({
      className: "gm-pin-wrap",
      html: `<div class="gm-pulse" style="border-color:${color}"><div class="gm-pulse-dot" style="background:${color}"></div></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const mk = L.marker([highlight.lat, highlight.lng], {
      icon: pulse,
      interactive: false,
      zIndexOffset: 900,
    });
    if (highlight.label && !selectedMarker) {
      mk.bindTooltip(highlight.label, {
        permanent: true,
        direction: "top",
        offset: [0, -16],
        className: "gm-tooltip gm-tooltip-strong",
      });
    }
    mk.addTo(layer);
  }

  function renderClickMarker() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (clickMarkerRef.current) {
      map.removeLayer(clickMarkerRef.current);
      clickMarkerRef.current = null;
    }
    if (!clickMarker) return;
    const color = clickMarker.color ?? "#dc2626";
    clickMarkerRef.current = L.marker([clickMarker.lat, clickMarker.lng], {
      icon: L.divIcon({
        className: "gm-pin-wrap",
        html: `<div class="gm-click-x" style="color:${color}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 6 12 12M6 18 18 6"/></svg></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      interactive: false,
      zIndexOffset: 1200,
    }).addTo(map);
  }

  function renderConnector() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (connectorRef.current) {
      map.removeLayer(connectorRef.current);
      connectorRef.current = null;
    }
    if (!connector) return;
    connectorRef.current = L.polyline([connector.from, connector.to], {
      color: "#334155",
      weight: 2,
      dashArray: "5 6",
      opacity: 0.8,
      interactive: false,
    }).addTo(map);
  }

  function fitAllInternal() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || markers.length === 0) return;
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number])
    );
    stopWheelRef.current?.();
    map.stop().fitBounds(bounds.pad(0.15), { maxZoom: 6, animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
    didFitRef.current = true;
  }

  useEffect(() => {
    renderTiles();
    // Tile layers are rebuilt only when the quiz label mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blank, terrain]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (fitOnLoad && !didFitRef.current && markers.length > 0) fitAllInternal();
    schedulePins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, selectedId, hoveredId, labelMode]);

  useEffect(() => {
    renderHighlight();
  }, [highlightKey, selectedId]);

  useEffect(() => {
    renderClickMarker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickMarker?.lat, clickMarker?.lng, clickMarker?.color]);

  useEffect(() => {
    renderConnector();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(connector)]);

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 5) {
      stopWheelRef.current?.();
      if (!mapRef.current) {
        pendingViewRef.current = () =>
          mapRef.current?.setView([lat, lng], zoom, { animate: false });
        return;
      }
      mapRef.current.stop().flyTo([lat, lng], zoom, { duration: 0.65, animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
    },
    flyToShape(h) {
      stopWheelRef.current?.();
      const L = LRef.current;
      const map = mapRef.current;
      if (!L || !map) {
        // Replay once the map exists.
        pendingViewRef.current = () => {
          const L2 = LRef.current;
          const m2 = mapRef.current;
          if (!L2 || !m2) return;
          const p2: [number, number][] = [];
          if (h.path?.length) p2.push(...(h.path as [number, number][]));
          if (h.bboxes?.length) {
            for (const b of h.bboxes) p2.push([b[0], b[1]], [b[2], b[3]]);
          }
          if (p2.length > 1) {
            m2.fitBounds(L2.latLngBounds(p2).pad(0.4), { maxZoom: 7, animate: false });
          } else {
            const r = h.radiusKm ?? 150;
            const z = r > 1500 ? 3 : r > 600 ? 4 : r > 200 ? 5 : 6;
            m2.setView([h.lat, h.lng], z, { animate: false });
          }
        };
        return;
      }
      const pts: [number, number][] = [];
      if (h.path?.length) pts.push(...(h.path as [number, number][]));
      if (h.bboxes?.length) {
        for (const b of h.bboxes) pts.push([b[0], b[1]], [b[2], b[3]]);
      }
      if (pts.length > 1) {
        map.stop().flyToBounds(L.latLngBounds(pts).pad(0.4), {
          maxZoom: 7,
          duration: 0.65,
          animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        });
      } else {
        const r = h.radiusKm ?? 150;
        const z = r > 1500 ? 3 : r > 600 ? 4 : r > 200 ? 5 : 6;
        map.stop().flyTo([h.lat, h.lng], z, { duration: 0.65, animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
      }
    },
    fitAll: fitAllInternal,
    resetView() {
      stopWheelRef.current?.();
      const map = mapRef.current;
      if (!map) {
        pendingViewRef.current = () => {
          const m = mapRef.current;
          m?.setView([20, 10], m.getMinZoom(), { animate: false });
        };
        return;
      }
      map.flyTo([20, 10], map.getMinZoom(), { duration: 0.7, animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
    },
    refresh() {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
        applyMinZoom();
        schedulePins();
      }, 60);
    },
    clearClickMarker() {
      if (clickMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(clickMarkerRef.current);
        clickMarkerRef.current = null;
      }
    },
    zoomIn() {
      stopWheelRef.current?.();
      mapRef.current?.stop().zoomIn(0.5);
    },
    zoomOut() {
      stopWheelRef.current?.();
      mapRef.current?.stop().zoomOut(0.5);
    },
  }));

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={containerRef} className="gm-map" aria-label="Interactive geography map" />
      {!minimalControls && <div className="atlas-map-layers"><button className="gm-border-control" type="button" aria-pressed={bordersVisible} title="Toggle modern country borders" onClick={() => {
        const visible = !bordersVisible; setBordersVisible(visible); bordersVisibleRef.current = visible;
        const layer = bordersRef.current; const map = mapRef.current;
        if (layer && map) layer.setStyle({ opacity: visible ? 0.85 : 0 });
      }}><span className={bordersVisible ? "border-check on" : "border-check"}>{bordersVisible ? <Icon name="check" size={10}/> : null}</span>Borders<span className="border-control-type">MODERN</span></button><button type="button" className={`atlas-terrain-control ${terrain ? "is-on" : ""}`} aria-pressed={terrain} onClick={()=>setTerrain(value=>!value)} title="Toggle terrain map"><Icon name="terrain" size={16}/>Terrain</button></div>}
      {boundaryError && <span className="gm-boundary-error">Borders unavailable. Reload to retry.</span>}
      {mapError && (
        <div className="absolute inset-0 z-[1000] grid place-items-center bg-canvas/95 p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-ink-200 bg-white p-6 shadow-xl">
            <div className="calm-result-icon"><Icon name="map" size={36}/></div>
            <h3 className="mt-2 font-display text-lg font-bold text-ink-950">
              Let&apos;s reload the map
            </h3>
            <p className="mt-1 text-sm text-ink-600">{mapError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
            >
              Reload map
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

export default GeoMap;
