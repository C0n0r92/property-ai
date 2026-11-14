"use client";

/**
 * A 3D bar chart in the hero's look, built with React Three Fiber:
 * rounded bars on the layered pink plinth that rise one after another when
 * scrolled into view, soft contact shadows, ambient occlusion and a glow on
 * the gold bars. Labels are HTML that follows each bar, so text stays sharp;
 * a data table behind it carries the numbers for screen readers and search
 * engines, and a flat chart stands in where WebGL is unavailable.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, ContactShadows, RoundedBox } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface Bar3D {
  /** Short name under (or on) the bar, e.g. "Q3 '25" or "D8" */
  label: string;
  value: number;
  /** Drawn in gold: the area being read, the latest quarter */
  highlight?: boolean;
  /** Shown when the bar is pointed at */
  detail?: string;
  href?: string;
}

interface Props {
  bars: Bar3D[];
  format?: (value: number) => string;
  /** Instead of format, from server components: "pct" (+8.2%) or "euro" (€474k) */
  unit?: keyof typeof UNITS;
  /** row: a line of bars (a trend); grid: blocks like a skyline */
  layout?: "row" | "grid";
  columns?: number;
  /** Describes the chart for screen readers; the table carries the numbers */
  ariaLabel: string;
  valueHeading?: string;
  className?: string;
}

const INK = new THREE.Color(0x16223f);
const GOLD = new THREE.Color(0xc9992f);
const ACCENT = new THREE.Color(0x2f4fb0);
const RED = new THREE.Color(0xb4232a);
const SPACING = 1.45;
const WIDTH = 1.0;

const easeOutBack = (p: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const defaultFormat = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const euroFormat = (v: number) => (v >= 1_000_000 ? `€${(v / 1_000_000).toFixed(2)}m` : `€${Math.round(v / 1000)}k`);
/** Formats a server page can choose by name (a function can't be passed from the server) */
const UNITS = { pct: defaultFormat, euro: euroFormat } as const;

/** The hero's soft studio light, attached as the scene's environment. */
function Studio() {
  const gl = useThree((state) => state.gl);
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return <primitive object={env} attach="environment" />;
}

interface BarProps {
  bar: Bar3D;
  index: number;
  position: [number, number, number];
  height: number;
  riseAt: number | null;
  reduceMotion: boolean;
  hovered: boolean;
  onHover: (i: number | null) => void;
  register: (i: number, group: THREE.Group | null) => void;
}

function Bar({ bar, index, position, height, riseAt, reduceMotion, hovered, onHover, register }: BarProps) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const base = bar.value < 0 ? RED : bar.highlight ? GOLD : INK;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const now = clock.elapsedTime * 1000;
    const p = reduceMotion ? 1 : riseAt === null ? 0 : clamp01((now - riseAt - index * 55) / 900);
    const target = Math.max(0.001, easeOutBack(p));
    group.current.scale.y += (target - group.current.scale.y) * 0.35;
    material.current?.color.lerp(hovered ? ACCENT : base, 0.2);
  });

  return (
    <group position={position}>
      <group
        ref={(g) => {
          group.current = g;
          register(index, g);
        }}
        scale={[1, reduceMotion ? 1 : 0.001, 1]}
      >
        <RoundedBox
          args={[WIDTH, height, WIDTH]}
          radius={0.14}
          smoothness={4}
          position={[0, height / 2, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(index);
            if (bar.href) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover(null);
            document.body.style.cursor = "";
          }}
          onClick={() => {
            if (bar.href) window.location.href = bar.href;
          }}
        >
          <meshStandardMaterial
            ref={material}
            color={base}
            roughness={bar.highlight ? 0.32 : 0.5}
            metalness={bar.highlight ? 0.25 : 0.05}
            // A touch of light in the gold so the glow picks it up
            emissive={bar.highlight ? GOLD : INK}
            emissiveIntensity={bar.highlight ? 0.18 : 0}
          />
        </RoundedBox>
      </group>
    </group>
  );
}

/**
 * Places the HTML labels (outside the canvas, in the page's own React tree)
 * over each bar every frame: value labels ride on the bar tops as they rise.
 */
function LabelProjector({
  items,
  groups,
  values,
  names,
}: {
  items: Array<{ position: [number, number, number]; height: number }>;
  groups: React.RefObject<Array<THREE.Group | null>>;
  values: React.RefObject<Array<HTMLSpanElement | null>>;
  names: React.RefObject<Array<HTMLSpanElement | null>>;
}) {
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const place = (span: HTMLSpanElement | null | undefined, x: number, y: number, z: number) => {
      if (!span) return;
      point.set(x, y, z).project(camera);
      span.style.transform = `translate(${(point.x * 0.5 + 0.5) * size.width}px, ${(-point.y * 0.5 + 0.5) * size.height}px) translate(-50%, -100%)`;
    };
    items.forEach((item, i) => {
      const scaleY = groups.current?.[i]?.scale.y ?? 1;
      const [x, , z] = item.position;
      const value = values.current?.[i];
      place(value, x, item.height * scaleY + 0.25, z);
      if (value) value.style.opacity = scaleY > 0.15 ? "1" : "0";
      place(names.current?.[i], x, -0.05, z + WIDTH / 2 + 0.55);
    });
  });
  return null;
}

function Plinth({ width, depth }: { width: number; depth: number }) {
  const slabs = [
    { y: -0.22, h: 0.44, color: "#f3d3dd" },
    { y: -0.68, h: 0.48, color: "#d99aaf" },
    { y: -1.18, h: 0.52, color: "#c7849b" },
  ];
  return (
    <group>
      {slabs.map((s, i) => (
        <RoundedBox key={i} args={[width + i * 0.08, s.h, depth + i * 0.08]} radius={0.16} smoothness={4} position={[0, s.y, 0]}>
          <meshStandardMaterial color={s.color} roughness={0.75} />
        </RoundedBox>
      ))}
    </group>
  );
}

function FlatBars({ bars, format }: { bars: Bar3D[]; format: (v: number) => string }) {
  const max = Math.max(0.01, ...bars.map((b) => b.value));
  return (
    <div className="rp-bars-flat" aria-hidden="true">
      {bars.map((b, i) => (
        <div key={i} className={`rp-bars-flat-col${b.highlight ? " is-hi" : ""}`}>
          <span className="rp-bars-flat-value">{format(b.value)}</span>
          <span className="rp-bars-flat-bar" style={{ height: `${8 + (Math.max(0, b.value) / max) * 92}%` }} />
          <span className="rp-bars-flat-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Starts the rise on first view, using the scene's own clock. */
function RiseClock({ visible, onStart }: { visible: boolean; onStart: (t: number) => void }) {
  const started = useRef(false);
  useFrame(({ clock }) => {
    if (visible && !started.current) {
      started.current = true;
      onStart(clock.elapsedTime * 1000 + 120);
    }
  });
  return null;
}

/** Reads the visitor's motion and device settings once mounted. */
function useEnvironment() {
  const [env, setEnv] = useState({ reduceMotion: false, cheap: true });
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setEnv({
        reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        cheap: window.matchMedia("(max-width: 700px)").matches || (navigator.hardwareConcurrency ?? 4) <= 4,
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  return env;
}

export default function Bars3D({
  bars,
  unit = "pct",
  format = UNITS[unit],
  layout = "row",
  columns,
  ariaLabel,
  valueHeading = "Value",
  className,
}: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [riseAt, setRiseAt] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const { reduceMotion, cheap } = useEnvironment();
  const groups = useRef<Array<THREE.Group | null>>([]);
  const values = useRef<Array<HTMLSpanElement | null>>([]);
  const names = useRef<Array<HTMLSpanElement | null>>([]);

  // Draw only while on screen
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scene = useMemo(() => {
    const n = bars.length;
    const cols = layout === "grid" ? (columns ?? Math.ceil(Math.sqrt(n * 1.7))) : n;
    const rows = Math.ceil(n / cols);
    const max = Math.max(0.01, ...bars.map((b) => b.value));
    const tallest = layout === "grid" ? 5.2 : 6.2;
    return {
      tallest,
      width: cols * SPACING + 0.9,
      depth: rows * SPACING + 0.9,
      items: bars.map((b, i) => ({
        position: [((i % cols) - (cols - 1) / 2) * SPACING, 0, (Math.floor(i / cols) - (rows - 1) / 2) * SPACING] as [number, number, number],
        height: 0.18 + (Math.max(0, b.value) / max) * tallest,
      })),
    };
  }, [bars, layout, columns]);

  const active = hovered !== null ? bars[hovered] : null;
  // A row reads left to right, so it is seen nearly from the front; a grid
  // is seen from the corner, like the hero's street
  const cameraPosition: [number, number, number] = layout === "row" ? [9, 11, 30] : [24, 19, 24];

  return (
    <figure className={`rp-bars3d rp-bars3d--${layout}${className ? ` ${className}` : ""}`}>
      <div className="rp-bars3d-stage" ref={stage} role="img" aria-label={ariaLabel}>
        <Canvas
          orthographic
          flat
          dpr={[1, 2]}
          frameloop={visible ? "always" : "never"}
          camera={{ position: cameraPosition, zoom: 40, near: 0.1, far: 400 }}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          fallback={<FlatBars bars={bars} format={format} />}
          onPointerMissed={() => setHovered(null)}
        >
          <Studio />
          <hemisphereLight args={[0xfff6ee, 0xb7a6dc, 1.1]} />
          <directionalLight position={[-10, 22, 14]} intensity={2.3} color={0xffe7cf} />
          <directionalLight position={[12, 6, -14]} intensity={0.8} color={0xc9b8ff} />
          <RiseClock visible={visible} onStart={setRiseAt} />
          <Bounds fit clip observe margin={layout === "row" ? 1.12 : 1.06}>
            <group>
              {/* Fixes the framing at the finished size, before the bars rise */}
              <mesh visible={false} position={[0, (scene.tallest - 0.6) / 2, 0]}>
                <boxGeometry args={[scene.width, scene.tallest + 2.4, scene.depth]} />
              </mesh>
              <Plinth width={scene.width} depth={scene.depth} />
              {bars.map((bar, i) => (
                <Bar
                  key={`${bar.label}-${i}`}
                  bar={bar}
                  index={i}
                  position={scene.items[i].position}
                  height={scene.items[i].height}
                  riseAt={riseAt}
                  reduceMotion={reduceMotion}
                  hovered={hovered === i}
                  onHover={setHovered}
                  register={(index, g) => {
                    groups.current[index] = g;
                  }}
                />
              ))}
            </group>
          </Bounds>
          <LabelProjector items={scene.items} groups={groups} values={values} names={names} />
          <ContactShadows position={[0, -1.46, 0]} scale={Math.max(scene.width, scene.depth) * 2.2} blur={2.6} opacity={0.32} far={8} />
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <N8AO aoRadius={1.4} intensity={3.2} distanceFalloff={1} color="#3b2a4a" halfRes={cheap} quality={cheap ? "low" : "medium"} />
            <Bloom luminanceThreshold={0.95} luminanceSmoothing={0.15} intensity={0.35} mipmapBlur radius={0.5} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <SMAA />
          </EffectComposer>
        </Canvas>
        <div className="rp-bars3d-labels" aria-hidden="true">
          {bars.map((b, i) => (
            <span
              key={`v${i}`}
              ref={(node) => {
                values.current[i] = node;
              }}
              className={`rp-bars3d-value${b.highlight ? " is-hi" : ""}${hovered === i ? " is-on" : ""}`}
            >
              {layout === "grid" && <em>{b.label}</em>}
              {format(b.value)}
            </span>
          ))}
          {layout === "row" &&
            bars.map((b, i) => (
              <span
                key={`n${i}`}
                ref={(node) => {
                  names.current[i] = node;
                }}
                className="rp-bars3d-name"
              >
                {b.label}
              </span>
            ))}
        </div>
        {active?.detail && (
          <p className="rp-bars3d-tip" role="status">
            <b>{active.label}</b> {active.detail}
          </p>
        )}
      </div>
      {/* A table ignores the visually-hidden size, so a wrapper hides it */}
      <div className="rp-visually-hidden">
        <table>
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">{valueHeading}</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((b, i) => (
              <tr key={i}>
                <th scope="row">{b.href ? <a href={b.href}>{b.label}</a> : b.label}</th>
                <td>{format(b.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
