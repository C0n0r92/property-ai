"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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
  /** row: a line of bars (a trend); grid: blocks like a skyline */
  layout?: "row" | "grid";
  columns?: number;
  /** Describes the chart for screen readers; the table carries the numbers */
  ariaLabel: string;
  valueHeading?: string;
  className?: string;
}

const INK = 0x16223f;
const GOLD = 0xc9992f;
const ACCENT = 0x2f4fb0;
const RED = 0xb4232a;
const SPACING = 1.45;
const WIDTH = 1.0;

const easeOutBack = (p: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const defaultFormat = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

/** Bars made of light: a 3D chart with the hero's look, and a table behind it. */
export default function Bars3D({
  bars,
  format = defaultFormat,
  layout = "row",
  columns,
  ariaLabel,
  valueHeading = "Value",
  className,
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const labels = useRef<Array<HTMLSpanElement | null>>([]);
  const names = useRef<Array<HTMLSpanElement | null>>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [no3d, setNo3d] = useState(false);
  const hoveredRef = useRef<number | null>(null);
  const key = bars.map((b) => `${b.label}:${b.value}:${b.highlight ? 1 : 0}`).join("|");

  useEffect(() => {
    const el = mount.current;
    if (!el || bars.length === 0) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setNo3d(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.display = "block";
    el.prepend(renderer.domElement);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    // A row reads left to right, so it is seen nearly from the front; a grid
    // is seen from the corner, like the hero's street
    if (layout === "row") camera.position.set(9, 11, 30);
    else camera.position.set(24, 19, 24);

    scene.add(new THREE.HemisphereLight(0xfff6ee, 0xb7a6dc, 1.1));
    const sun = new THREE.DirectionalLight(0xffe7cf, 2.3);
    sun.position.set(-10, 22, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 6;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    const rim = new THREE.DirectionalLight(0xc9b8ff, 0.8);
    rim.position.set(12, 6, -14);
    scene.add(sun, rim);

    // Layout
    const n = bars.length;
    const cols = layout === "grid" ? (columns ?? Math.ceil(Math.sqrt(n * 1.7))) : n;
    const rows = Math.ceil(n / cols);
    const max = Math.max(0.01, ...bars.map((b) => b.value));
    const tallest = layout === "grid" ? 5.2 : 6.2;
    const heightOf = (v: number) => 0.18 + (Math.max(0, v) / max) * tallest;
    const spots = bars.map((_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return new THREE.Vector3((c - (cols - 1) / 2) * SPACING, 0, (r - (rows - 1) / 2) * SPACING);
    });

    const world = new THREE.Group();
    scene.add(world);

    // The plinth the bars stand on, in the hero's layered pink
    const padX = cols * SPACING + 0.9;
    const padZ = rows * SPACING + 0.9;
    const slabs = [
      { y: -0.22, h: 0.44, color: 0xf3d3dd },
      { y: -0.68, h: 0.48, color: 0xd99aaf },
      { y: -1.18, h: 0.52, color: 0xc7849b },
    ];
    const disposables: Array<{ dispose: () => void }> = [];
    for (const [i, s] of slabs.entries()) {
      const geo = new RoundedBoxGeometry(padX + i * 0.08, s.h, padZ + i * 0.08, 4, 0.16);
      const mat = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.75 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = s.y;
      mesh.receiveShadow = true;
      mesh.castShadow = i === slabs.length - 1;
      world.add(mesh);
      disposables.push(geo, mat);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.12 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.4;
    floor.receiveShadow = true;
    scene.add(floor);
    disposables.push(floor.geometry, floor.material as THREE.Material);

    const colorOf = (b: Bar3D) => (b.value < 0 ? RED : b.highlight ? GOLD : INK);
    const meshes = bars.map((b, i) => {
      const h = heightOf(b.value);
      const geo = new RoundedBoxGeometry(WIDTH, h, WIDTH, 4, 0.14);
      geo.translate(0, h / 2, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: colorOf(b),
        roughness: b.highlight ? 0.32 : 0.5,
        metalness: b.highlight ? 0.25 : 0.05,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(spots[i]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.scale.y = reduceMotion ? 1 : 0.001;
      mesh.userData.index = i;
      world.add(mesh);
      disposables.push(geo, mat);
      return { mesh, mat, h };
    });

    // Fit the camera to everything, whatever the box's shape
    const aim = new THREE.Vector3(0, tallest * 0.32, 0);
    camera.lookAt(aim);
    sun.shadow.camera.left = -padX;
    sun.shadow.camera.right = padX;
    sun.shadow.camera.top = padZ + tallest;
    sun.shadow.camera.bottom = -padZ - tallest;
    sun.shadow.camera.far = 80;
    const corners: THREE.Vector3[] = [];
    for (const x of [-padX / 2, padX / 2])
      for (const z of [-padZ / 2, padZ / 2])
        for (const y of [-1.5, tallest + 0.9]) corners.push(new THREE.Vector3(x, y, z));

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = el;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.left = -1;
      camera.right = 1;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateMatrixWorld();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const c of corners) {
        const p = c.clone().applyMatrix4(camera.matrixWorldInverse);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      const aspect = width / height;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      let halfW = ((maxX - minX) / 2) * 1.06;
      let halfH = ((maxY - minY) / 2) * 1.1;
      if (halfW / halfH > aspect) halfH = halfW / aspect;
      else halfW = halfH * aspect;
      camera.left = cx - halfW;
      camera.right = cx + halfW;
      camera.top = cy + halfH;
      camera.bottom = cy - halfH;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    // Rise when first seen; draw only while on screen
    let visible = false;
    let riseStart = reduceMotion ? 0 : Infinity;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && riseStart === Infinity) riseStart = performance.now() + 120;
      },
      { threshold: 0.25 },
    );
    visibility.observe(el);

    // Pointing at a bar
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(9, 9);
    const sway = { x: 0, tx: 0 };
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      sway.tx = pointer.x * 0.06;
    };
    const onLeave = () => {
      pointer.set(9, 9);
      sway.tx = 0;
    };
    const onClick = () => {
      const i = hoveredRef.current;
      if (i !== null && bars[i]?.href) window.location.href = bars[i].href!;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);

    const project = new THREE.Vector3();
    const place = (span: HTMLSpanElement | null, point: THREE.Vector3) => {
      if (!span) return;
      project.copy(point);
      world.localToWorld(project);
      project.project(camera);
      const x = (project.x * 0.5 + 0.5) * el.clientWidth;
      const y = (-project.y * 0.5 + 0.5) * el.clientHeight;
      span.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    };

    let frame = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible && !reduceMotion) return;
      sway.x += (sway.tx - sway.x) * 0.06;
      world.rotation.y = reduceMotion ? 0 : sway.x + Math.sin(now / 4200) * 0.025;

      let hit: number | null = null;
      if (pointer.x < 2) {
        raycaster.setFromCamera(pointer, camera);
        const found = raycaster.intersectObjects(meshes.map((m) => m.mesh), false)[0];
        if (found) hit = found.object.userData.index as number;
      }
      if (hit !== hoveredRef.current) {
        hoveredRef.current = hit;
        setHovered(hit);
        el.style.cursor = hit !== null && bars[hit]?.href ? "pointer" : "";
      }

      meshes.forEach(({ mesh, mat, h }, i) => {
        const p = reduceMotion ? 1 : clamp01((now - riseStart - i * 55) / 900);
        const target = Math.max(0.001, easeOutBack(p));
        mesh.scale.y += (target - mesh.scale.y) * 0.35;
        const base = colorOf(bars[i]);
        mat.color.lerp(new THREE.Color(i === hit ? ACCENT : base), 0.2);
        place(labels.current[i], new THREE.Vector3(spots[i].x, h * mesh.scale.y + 0.25, spots[i].z));
        if (layout === "row") {
          place(names.current[i], new THREE.Vector3(spots[i].x, -0.05, spots[i].z + WIDTH / 2 + 0.55));
        }
      });
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
      disposables.forEach((d) => d.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Rebuilt only when the bars themselves change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, layout, columns]);

  const max = Math.max(0.01, ...bars.map((b) => b.value));
  const active = hovered !== null ? bars[hovered] : null;

  return (
    <figure className={`rp-bars3d rp-bars3d--${layout}${className ? ` ${className}` : ""}`}>
      {no3d ? (
        <div className="rp-bars-flat" aria-hidden="true">
          {bars.map((b, i) => (
            <div key={i} className={`rp-bars-flat-col${b.highlight ? " is-hi" : ""}`}>
              <span className="rp-bars-flat-value">{format(b.value)}</span>
              <span className="rp-bars-flat-bar" style={{ height: `${8 + (Math.max(0, b.value) / max) * 92}%` }} />
              <span className="rp-bars-flat-label">{b.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rp-bars3d-stage" ref={mount} role="img" aria-label={ariaLabel}>
          <div className="rp-bars3d-labels" aria-hidden="true">
            {bars.map((b, i) => (
              <span
                key={`v${i}`}
                ref={(node) => {
                  labels.current[i] = node;
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
      )}
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
