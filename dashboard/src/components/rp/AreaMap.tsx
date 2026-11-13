"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

export interface MapArea {
  key: string;
  slug: string;
  label: string;
  kind: "district" | "locality";
  lat: number;
  lng: number;
  /** Typical sale against asking, in percent */
  value: number;
  shareAbove: number;
  price: number;
}

interface Props {
  areas: MapArea[];
  /** An area to centre on and mark (area pages) */
  focusKey?: string;
  className?: string;
}

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const DUBLIN: [number, number] = [-6.27, 53.345];

// Pale to gold to red as bidding gets hotter (0% to +15% and over)
const STOPS: Array<[number, [number, number, number]]> = [
  [0, [236, 226, 214]],
  [6, [226, 186, 104]],
  [10, [201, 153, 47]],
  [15, [180, 35, 42]],
];
function colourFor(v: number): [number, number, number] {
  if (v <= STOPS[0][0]) return STOPS[0][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [b, cb] = STOPS[i];
    const [a, ca] = STOPS[i - 1];
    if (v <= b) {
      const t = (v - a) / (b - a);
      return [0, 1, 2].map((j) => Math.round(ca[j] + (cb[j] - ca[j]) * t)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;
const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;

/**
 * Dublin in 3D: each area a column on the map, as tall and as warm as its
 * homes bid over asking. MapLibre draws the map (OpenFreeMap tiles), deck.gl
 * the columns. Two fingers or Ctrl-scroll to zoom, so the page still scrolls.
 */
export default function AreaMap({ areas, focusKey, className }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const [showLocalities, setShowLocalities] = useState(Boolean(focusKey));
  const [failed, setFailed] = useState(false);
  const overlayRef = useRef<{ setProps: (p: object) => void } | null>(null);
  const growth = useRef(0);
  const buildRef = useRef<(grow: number) => object[]>(() => []);
  // The layer builder reads these, so the toggle does not rebuild the map
  const areasRef = useRef(areas);
  const showRef = useRef(showLocalities);

  const visible = areas.filter((a) => a.kind === "district" || showLocalities);

  // Rebuild the layer when the visible set changes
  useEffect(() => {
    areasRef.current = areas;
    showRef.current = showLocalities;
    overlayRef.current?.setProps({ layers: buildRef.current(growth.current) });
  }, [areas, showLocalities]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let map: import("maplibre-gl").Map | null = null;
    let frame = 0;
    let cancelled = false;

    (async () => {
      try {
        const [{ Map: MapLibre, NavigationControl }, { MapboxOverlay }, { ColumnLayer }] = await Promise.all([
          import("maplibre-gl"),
          import("@deck.gl/mapbox"),
          import("@deck.gl/layers"),
        ]);
        if (cancelled) return;
        const focus = areas.find((a) => a.key === focusKey);
        map = new MapLibre({
          container: el,
          style: STYLE,
          center: focus ? [focus.lng, focus.lat] : DUBLIN,
          zoom: focus ? 11.2 : 9.9,
          pitch: 52,
          bearing: -18,
          maxPitch: 70,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        });
        map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");

        const build = (grow: number) => {
          const data = areasRef.current.filter((a) => a.kind === "district" || showRef.current);
          return [
            new ColumnLayer<MapArea>({
              id: "areas",
              data,
              diskResolution: 24,
              // Slimmer, shorter columns the closer the view and the more areas are shown
              radius: focusKey ? 220 : showRef.current ? 380 : 620,
              extruded: true,
              pickable: true,
              autoHighlight: true,
              highlightColor: [47, 79, 176, 230],
              getPosition: (a) => [a.lng, a.lat],
              radiusUnits: "meters",
              getFillColor: (a) =>
                a.key === focusKey ? [22, 34, 63, 255] : [...colourFor(a.value), focusKey ? 200 : 235] as [number, number, number, number],
              getElevation: (a) => Math.max(0.3, a.value) * (focusKey ? 120 : showRef.current ? 200 : 260) * grow,
              elevationScale: 1,
              material: { ambient: 0.55, diffuse: 0.6, shininess: 24, specularColor: [255, 240, 220] },
              updateTriggers: { getElevation: grow, getFillColor: focusKey },
              onClick: ({ object }) => {
                if (object) window.location.href = `/areas/${(object as MapArea).slug}`;
              },
            }),
          ];
        };
        buildRef.current = build;

        const overlay = new MapboxOverlay({
          interleaved: true,
          layers: build(0),
          getTooltip: ({ object }) => {
            const a = object as MapArea | null;
            if (!a) return null;
            return {
              html: `<b>${a.label}</b><br/>${signed(a.value)} on asking · ${Math.round(a.shareAbove * 100)}% above<br/>typical sale ${euro(a.price)}`,
              style: {
                background: "rgba(255,255,255,0.95)",
                color: "#16223f",
                borderRadius: "12px",
                padding: "8px 12px",
                fontFamily: "inherit",
                fontSize: "13px",
                lineHeight: "1.4",
                boxShadow: "0 10px 30px -12px rgba(22,34,63,0.45)",
              },
            };
          },
        });
        overlayRef.current = overlay;
        map.addControl(overlay);

        // The columns rise once the map has drawn
        map.once("load", () => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            growth.current = 1;
            overlay.setProps({ layers: build(1) });
            return;
          }
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / 1400);
            growth.current = 1 - Math.pow(1 - p, 3);
            overlay.setProps({ layers: build(growth.current) });
            if (p < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        });
      } catch (error) {
        console.warn("Map unavailable:", error);
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      map?.remove();
      overlayRef.current = null;
    };
    // The map is built once; the toggle updates the layer above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return null;

  return (
    <figure className={`rp-map${className ? ` ${className}` : ""}`}>
      <div className="rp-map-stage" ref={mount} role="img" aria-label="Map of Dublin areas by how far over asking homes sell" />
      <figcaption className="rp-map-bar">
        <span className="rp-map-legend" aria-hidden="true">
          <span>0%</span>
          <i />
          <span>+15% on asking</span>
        </span>
        <span className="rp-map-toggle" role="group" aria-label="Areas shown">
          <button type="button" aria-pressed={!showLocalities} onClick={() => setShowLocalities(false)}>
            Districts
          </button>
          <button type="button" aria-pressed={showLocalities} onClick={() => setShowLocalities(true)}>
            All areas
          </button>
        </span>
        <span className="rp-map-hint">
          {visible.length} areas · <span className="rp-pointer-only">point at a column, click to open it</span>
          <span className="rp-touch-only">tap a column to open it</span>
        </span>
      </figcaption>
    </figure>
  );
}
