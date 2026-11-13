"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface DioramaSale {
  address: string;
  soldDate: string;
  askingPrice: number;
  soldPrice: number;
  overAskingPct: number;
  /** Held back for the report: shown as a teaser tag. */
  locked?: boolean;
}

interface Props {
  /** The most recent comparable sales: one house each, left to right. */
  sales: DioramaSale[];
  /** What kind of home the street is built from. */
  type: "apartment" | "terraced" | "semi" | "detached";
  /** Bedrooms: bigger homes get an extra storey, a dormer or an extension. */
  beds: number;
  /** Index of the house under the pointer, or null. */
  onHover?: (index: number | null) => void;
  onUnavailable?: () => void;
}

const BRICKS = [0xc9785a, 0xefe2cf, 0xb9654b, 0xd9967a, 0xe6d3bd];
const DOORS = [0xc0392b, 0x2f4fb0, 0xe0b23c, 0x1f6f78, 0x2e6b4a];
const HOUSE_COUNT = 5;

const easeOutBack = (p: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function tagTexture(
  pct: number,
  active: boolean,
  locked = false,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 150;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = active ? "#16223f" : "rgba(255,255,255,0.97)";
  ctx.beginPath();
  ctx.roundRect(6, 6, 308, 118, 59);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(140, 122);
  ctx.lineTo(160, 146);
  ctx.lineTo(180, 122);
  ctx.fill();
  ctx.fillStyle = active
    ? "#ffffff"
    : locked
      ? "#a37a1f"
      : pct > 0
        ? "#b4232a"
        : "#4d586b";
  ctx.font =
    '600 62px system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    locked ? "Report" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    160,
    68,
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * A clay-style isometric model of a Dublin street, built from the kind of
 * home being checked: a brick terrace, pairs of semis, detached houses or a
 * block of flats. Changing the type knocks the street down and raises the
 * new one. Each house stands for one
 * of the most recent comparable sales and carries a tag showing how far over
 * (or under) its asking price it sold. Hovering a house lifts it.
 */
export default function Diorama({
  sales,
  type,
  beds,
  onHover,
  onUnavailable,
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{
    setSales: (sales: DioramaSale[]) => void;
    setHome: (type: Props["type"], beds: number) => void;
  } | null>(null);
  const hoverCallback = useRef(onHover);

  useEffect(() => {
    hoverCallback.current = onHover;
  }, [onHover]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onUnavailable?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    camera.position.set(20, 16.5, 20);
    camera.lookAt(0, 1.2, 0);

    scene.add(new THREE.HemisphereLight(0xfff6ee, 0xb7a6dc, 1.1));
    const sun = new THREE.DirectionalLight(0xffe7cf, 2.4);
    sun.position.set(-8, 17, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 8;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, {
      left: -15,
      right: 15,
      top: 15,
      bottom: -15,
      near: 1,
      far: 60,
    });
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xc9b8ff, 0.8);
    rim.position.set(10, 6, -12);
    scene.add(rim);

    // Soft shadow on the "table" under the floating block
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.ShadowMaterial({ opacity: 0.14 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.6;
    floor.receiveShadow = true;
    scene.add(floor);

    const world = new THREE.Group();
    scene.add(world);

    const materials = new Map<string, THREE.MeshStandardMaterial>();
    const mat = (
      color: number,
      roughness = 0.62,
      extra: THREE.MeshStandardMaterialParameters = {},
    ) => {
      const key = `${color}-${roughness}-${JSON.stringify(extra)}`;
      if (!materials.has(key)) {
        materials.set(
          key,
          new THREE.MeshStandardMaterial({ color, roughness, ...extra }),
        );
      }
      return materials.get(key)!;
    };
    const add = (
      parent: THREE.Object3D,
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const box = (w: number, h: number, d: number, r = 0.08) =>
      new RoundedBoxGeometry(
        w,
        h,
        d,
        4,
        Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001),
      );

    // The block: layered earth, lawn, a pavement and a road along the front
    const strata = [0x8e5a6a, 0xa66f7c, 0x9b6674, 0xb58290];
    strata.forEach((color, i) => {
      add(
        world,
        box(14.6 - i * 0.1, 0.72, 8.6 - i * 0.1, 0.12),
        mat(color, 0.8),
        0,
        -3.3 + i * 0.74,
        0,
      );
    });
    add(world, box(14.6, 0.5, 8.6, 0.16), mat(0x9fd66b, 0.7), 0, -0.05, 0);
    add(world, box(14.2, 0.12, 1.25, 0.05), mat(0xece6dc, 0.8), 0, 0.26, 1.85);
    add(world, box(14.2, 0.1, 2.0, 0.05), mat(0x4a5274, 0.7), 0, 0.22, 3.5);
    for (let i = 0; i < 9; i++) {
      add(
        world,
        box(0.7, 0.03, 0.12, 0.015),
        mat(0xf6efe6, 0.6),
        -6.2 + i * 1.55,
        0.29,
        3.5,
      );
    }
    add(world, box(14.2, 0.14, 0.55, 0.05), mat(0xece6dc, 0.8), 0, 0.27, 4.68);

    const GROUND = 0.3;
    const SLATE = 0x57618f;
    const TRIM = 0xf6efe6;
    let houses: THREE.Group[] = [];
    let hitBoxes: THREE.Mesh[] = [];
    let extras: THREE.Object3D[] = [];
    const tags: THREE.Sprite[] = [];

    /** A pitched roof: a triangle `span` wide and `rise` tall, `run` long. */
    const pitched = (span: number, rise: number, run: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-span / 2, 0);
      shape.lineTo(span / 2, 0);
      shape.lineTo(0, rise);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: run,
        bevelEnabled: true,
        bevelSize: 0.05,
        bevelThickness: 0.05,
        bevelSegments: 3,
      });
      geometry.translate(0, 0, -run / 2);
      return geometry;
    };
    // Windows that come on, house by house, once the answer has landed
    const DARK = new THREE.Color(0x34406a);
    const WARM = new THREE.Color(0xffd98a);
    const waveMats = Array.from(
      { length: HOUSE_COUNT + 1 },
      () =>
        new THREE.MeshStandardMaterial({
          color: DARK.clone(),
          roughness: 0.2,
          emissive: 0xffb84a,
          emissiveIntensity: 0,
        }),
    );
    let building = 0; // index of the house being built
    let panes = 0;
    const glass = (lit: boolean) => {
      if (lit)
        return mat(0xffd98a, 0.4, {
          emissive: 0xffb84a,
          emissiveIntensity: 0.9,
        });
      return panes++ % 2 === 0
        ? waveMats[building]
        : mat(0x34406a, 0.12, { metalness: 0.1 });
    };
    const isLit = (i: number, floor: number, side: number) =>
      (i * 3 + floor * 2 + (side > 0 ? 1 : 0)) % 4 === 0;
    const sash = (
      house: THREE.Group,
      x: number,
      y: number,
      z: number,
      lit: boolean,
      w = 0.64,
      h = 0.84,
    ) => {
      add(house, box(w, h, 0.1, 0.04), mat(TRIM, 0.5), x, y, z + 0.01);
      add(
        house,
        box(w - 0.16, h - 0.16, 0.1, 0.03),
        glass(lit),
        x,
        y,
        z + 0.04,
      );
      add(
        house,
        box(w - 0.14, 0.025, 0.11, 0.01),
        mat(TRIM, 0.5),
        x,
        y,
        z + 0.07,
      );
    };
    const frontDoor = (
      house: THREE.Group,
      x: number,
      z: number,
      color: number,
    ) => {
      add(house, box(0.8, 1.55, 0.12, 0.05), mat(TRIM, 0.5), x, 0.78, z + 0.02);
      add(
        house,
        box(0.54, 1.02, 0.12, 0.04),
        mat(color, 0.28),
        x,
        0.55,
        z + 0.07,
      );
      add(
        house,
        box(0.5, 0.26, 0.1, 0.1),
        mat(0x3a4770, 0.15),
        x,
        1.27,
        z + 0.07,
      );
      add(
        house,
        new THREE.SphereGeometry(0.055, 16, 16),
        mat(0xe8c46a, 0.25, { metalness: 0.8 }),
        x + 0.17,
        0.58,
        z + 0.15,
      );
      add(
        house,
        box(0.98, 0.16, 0.55, 0.05),
        mat(0xdcd5ca, 0.85),
        x,
        0.08,
        z + 0.3,
      );
    };
    const chimney = (house: THREE.Group, x: number, y: number, z: number) => {
      add(
        house,
        box(0.52, 0.95, 0.52, 0.07),
        mat(0xa8584a, 0.7),
        x,
        y + 0.4,
        z,
      );
      [-0.12, 0.12].forEach((dx) =>
        add(
          house,
          new THREE.CylinderGeometry(0.08, 0.1, 0.28, 16),
          mat(0xd9855f, 0.55),
          x + dx,
          y + 1.0,
          z,
        ),
      );
    };
    const hedge = (x: number, z: number, length: number) => {
      const mesh = add(
        world,
        box(0.34, 0.5, length, 0.14),
        mat(0x5fae5a, 0.75),
        x,
        GROUND + 0.25,
        z,
      );
      extras.push(mesh);
    };

    interface Built {
      house: THREE.Group;
      /** Height the price tag floats above. */
      top: number;
      w: number;
      d: number;
    }

    /** Brick terrace with a parapet: the Dublin city street. Two to four storeys. */
    const terraced = (i: number, size: number): Built => {
      const house = new THREE.Group();
      const w = 2.3;
      const d = 2.6;
      const floors = 2 + size;
      const h = 0.3 + floors * 1.1 + (i % 2 === 1 ? 0.35 : 0);
      const front = d / 2;
      house.position.set((i - 2) * 2.42, GROUND, -0.9);
      add(house, box(w, h, d, 0.12), mat(BRICKS[i], 0.72), 0, h / 2, 0);
      add(
        house,
        box(w + 0.14, 0.24, d + 0.14, 0.07),
        mat(TRIM, 0.5),
        0,
        h + 0.02,
        0,
      );
      add(
        house,
        box(w - 0.3, 0.34, d - 0.3, 0.14),
        mat(SLATE, 0.45),
        0,
        h + 0.22,
        0,
      );
      chimney(house, -w / 2 + 0.46, h + 0.2, -0.65);
      // A string course between floors, as on Georgian brick
      add(
        house,
        box(w + 0.02, 0.07, d + 0.02, 0.02),
        mat(TRIM, 0.6),
        0,
        1.65,
        0,
      );
      const doorX = i % 2 === 0 ? -0.55 : 0.55;
      frontDoor(house, doorX, front, DOORS[i]);
      for (let floor = 0; floor < floors; floor++) {
        for (const side of [-0.55, 0.55]) {
          if (floor === 0 && side === doorX) continue;
          sash(house, side, 0.9 + floor * 1.1, front, isLit(i, floor, side));
        }
      }
      return { house, top: h + 0.4, w, d };
    };

    /** Two-storey pairs under a shared roof, with bay windows: the suburbs. */
    const semi = (i: number, size: number): Built => {
      const house = new THREE.Group();
      const w = 1.8;
      const d = 2.6;
      const h = size === 0 ? 1.4 : 2.45;
      const rise = 1.15;
      const front = d / 2;
      const pair = Math.floor(i / 2);
      const outer = i % 2 === 0 ? -1 : 1; // which side faces away from the neighbour
      house.position.set((pair - 1) * 4.75 + (outer * w) / 2, GROUND, -0.9);
      // Brick below, painted render above; both halves of a pair match
      const brick = size === 0 ? h : 1.25;
      add(
        house,
        box(w, brick, d, 0.1),
        mat(BRICKS[pair * 2], 0.72),
        0,
        brick / 2,
        0,
      );
      if (size > 0)
        add(
          house,
          box(w, h - 1.2, d, 0.1),
          mat(pair === 1 ? 0xf3ead9 : 0xefe2cf, 0.8),
          0,
          1.2 + (h - 1.2) / 2,
          0,
        );
      const roof = add(
        house,
        pitched(d + 0.36, rise, w + 0.1),
        mat(SLATE, 0.5),
        outer * 0.05,
        h,
        0,
      );
      roof.rotation.y = Math.PI / 2;
      chimney(house, -outer * (w / 2 - 0.3), h + rise - 0.55, 0);
      // Bay window by the party wall, door on the outer side
      const bayX = -outer * 0.4;
      add(
        house,
        box(0.84, 1.05, 0.36, 0.06),
        mat(TRIM, 0.55),
        bayX,
        0.78,
        front + 0.14,
      );
      add(
        house,
        box(0.62, 0.72, 0.1, 0.03),
        glass(isLit(i, 0, 1)),
        bayX,
        0.82,
        front + 0.29,
      );
      add(
        house,
        box(0.92, 0.12, 0.44, 0.05),
        mat(SLATE, 0.5),
        bayX,
        1.36,
        front + 0.14,
      );
      frontDoor(house, outer * 0.48, front, DOORS[i % DOORS.length]);
      if (size > 0) {
        sash(house, bayX, 1.9, front, isLit(i, 1, 0), 0.7, 0.7);
        sash(house, outer * 0.48, 1.95, front, isLit(i, 2, 1), 0.48, 0.6);
      }
      if (size > 1) {
        // Attic conversion: a dormer on the front of the roof
        add(
          house,
          box(0.7, 0.55, 0.7, 0.05),
          mat(TRIM, 0.55),
          0,
          h + 0.5,
          0.62,
        );
        add(house, box(0.5, 0.36, 0.1, 0.03), glass(false), 0, h + 0.5, 0.95);
        add(
          house,
          box(0.82, 0.08, 0.8, 0.03),
          mat(SLATE, 0.5),
          0,
          h + 0.8,
          0.64,
        );
      }
      // A hedge down the gap between pairs
      if (outer === 1 && pair < 2)
        hedge(house.position.x + w / 2 + 0.57, -0.3, 2.4);
      return { house, top: h + rise - 0.25, w, d };
    };

    /** Stand-alone gable-fronted houses, each on its own plot. */
    const detached = (i: number, size: number): Built => {
      const house = new THREE.Group();
      const w = 1.8;
      const d = 2.5;
      const h = size === 0 ? 1.4 : 2.4;
      const rise = 1.2;
      const front = d / 2;
      const flip = i % 2 === 0 ? 1 : -1;
      house.position.set((i - 2) * 2.78, GROUND, -0.9);
      add(house, box(w, h, d, 0.12), mat(BRICKS[i], 0.75), 0, h / 2, 0);
      // The roof runs front to back, so every house shows its own gable
      add(
        house,
        pitched(w + 0.3, rise, d + 0.3),
        mat(0xa8584a, 0.6),
        0,
        h,
        -0.15,
      );
      add(
        house,
        new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20),
        glass(isLit(i, 3, 1)),
        0,
        h + 0.42,
        front + 0.16,
      ).rotation.x = Math.PI / 2;
      // Box bay window on one side, door under a porch on the other
      const bayX = flip * 0.4;
      add(
        house,
        box(0.84, 1.05, 0.34, 0.06),
        mat(TRIM, 0.55),
        bayX,
        0.78,
        front + 0.13,
      );
      add(
        house,
        box(0.62, 0.72, 0.1, 0.03),
        glass(isLit(i, 0, 1)),
        bayX,
        0.82,
        front + 0.27,
      );
      add(
        house,
        box(0.92, 0.1, 0.42, 0.04),
        mat(0xa8584a, 0.6),
        bayX,
        1.35,
        front + 0.13,
      );
      frontDoor(house, -flip * 0.46, front, DOORS[i]);
      add(
        house,
        box(0.9, 0.1, 0.5, 0.04),
        mat(0xa8584a, 0.6),
        -flip * 0.46,
        1.6,
        front + 0.22,
      );
      if (size > 0) {
        sash(house, -0.42, 1.95, front, isLit(i, 1, 0), 0.52, 0.6);
        sash(house, 0.42, 1.95, front, isLit(i, 2, 1), 0.52, 0.6);
      }
      if (size > 1) {
        // A side extension with a garage door
        const sideX = -(w / 2 + 0.34);
        add(
          house,
          box(0.74, 1.3, 1.7, 0.08),
          mat(BRICKS[i], 0.75),
          sideX,
          0.65,
          0.3,
        );
        add(house, box(0.84, 0.1, 1.8, 0.04), mat(TRIM, 0.5), sideX, 1.33, 0.3);
        add(
          house,
          box(0.54, 0.86, 0.08, 0.03),
          mat(TRIM, 0.45),
          sideX,
          0.46,
          1.16,
        );
      }
      chimney(house, -flip * (w / 2 - 0.3), h + 0.35, -0.7);
      if (i < 4 && size < 2) hedge(house.position.x + 1.39, -0.3, 2.4);
      return { house, top: h + rise - 0.2, w, d };
    };

    /** One block of flats, five stacks wide, with glass balconies. */
    const apartment = (i: number, size: number): Built => {
      const house = new THREE.Group();
      const w = 2.42;
      const d = 2.8;
      const floors = 3 + size;
      const h = 0.35 + floors * 1.02;
      const front = d / 2;
      house.position.set((i - 2) * 2.42, GROUND, -0.9);
      const tone = i % 2 === 0 ? 0xefe2cf : 0xc9785a;
      add(house, box(w, h, d, 0.08), mat(tone, 0.75), 0, h / 2, 0);
      add(
        house,
        box(w + 0.06, 0.2, d + 0.12, 0.05),
        mat(TRIM, 0.5),
        0,
        h + 0.02,
        0,
      );
      if (i % 2 === 1)
        add(
          house,
          box(0.8, 0.4, 0.8, 0.08),
          mat(0xdcd5ca, 0.6),
          0.3,
          h + 0.3,
          -0.4,
        );
      const railing = mat(0xbfe0ee, 0.08, {
        transparent: true,
        opacity: 0.5,
        metalness: 0.1,
      });
      for (let floor = 0; floor < floors; floor++) {
        const y = 0.78 + floor * 1.02;
        if (floor === 0 && i === 2) {
          // The shared entrance, under a canopy
          add(
            house,
            box(1.1, 1.2, 0.1, 0.04),
            glass(true),
            0,
            0.68,
            front + 0.04,
          );
          add(
            house,
            box(0.04, 1.2, 0.12, 0.01),
            mat(TRIM, 0.5),
            0,
            0.68,
            front + 0.06,
          );
          add(
            house,
            box(1.5, 0.1, 0.7, 0.04),
            mat(SLATE, 0.45),
            0,
            1.36,
            front + 0.3,
          );
          continue;
        }
        sash(house, -0.62, y, front, isLit(i, floor, 0), 0.6, 0.7);
        // Balcony door, slab and glass front
        add(
          house,
          box(0.78, 0.86, 0.1, 0.03),
          glass(isLit(i, floor, 1)),
          0.5,
          y - 0.04,
          front + 0.03,
        );
        if (floor > 0) {
          add(
            house,
            box(1.04, 0.07, 0.5, 0.03),
            mat(TRIM, 0.5),
            0.5,
            y - 0.5,
            front + 0.25,
          );
          add(
            house,
            box(1.0, 0.42, 0.04, 0.015),
            railing,
            0.5,
            y - 0.26,
            front + 0.48,
          );
        }
      }
      return { house, top: h + 0.1, w, d };
    };

    const BUILDERS = { terraced, semi, detached, apartment } as const;
    type StreetType = keyof typeof BUILDERS;
    let street: { type: StreetType; size: number } | null = null;
    // Up to 2 beds, 3 beds, 4 or more
    const sizeOf = (bedrooms: number) =>
      bedrooms <= 2 ? 0 : bedrooms === 3 ? 1 : 2;

    const clearStreet = () => {
      for (const object of [...houses, ...hitBoxes, ...extras]) {
        world.remove(object);
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) child.geometry.dispose();
        });
      }
      houses = [];
      hitBoxes = [];
      extras = [];
    };

    /** Replace the buildings on the block with a street of the given type. */
    const buildStreet = (type: StreetType, size: number) => {
      clearStreet();
      street = { type, size };
      const count = type === "semi" ? 6 : HOUSE_COUNT;
      for (let i = 0; i < count; i++) {
        building = i;
        panes = i;
        const { house, top, w, d } = BUILDERS[type](i, size);
        house.userData.baseY = GROUND;
        house.scale.y = 0.001;
        world.add(house);
        houses.push(house);
        if (i >= HOUSE_COUNT) continue; // the sixth semi completes a pair, no sale
        // Invisible box for pointer picking. Fixed to the block, not the
        // house, so lifting a house does not move it from under the pointer
        const hit = new THREE.Mesh(
          new THREE.BoxGeometry(w, top + 1.4, d),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hit.position.set(
          house.position.x,
          GROUND + (top + 1.4) / 2,
          house.position.z,
        );
        hit.userData.index = i;
        world.add(hit);
        hitBoxes.push(hit);
        // Halves of a pair sit close together: stagger their tags
        tags[i].userData.offsetY =
          top + 2.05 + (type === "semi" && i % 2 === 1 ? 1.3 : 0);
      }
    };

    for (let i = 0; i < HOUSE_COUNT; i++) {
      const tag = new THREE.Sprite(
        new THREE.SpriteMaterial({
          transparent: true,
          depthTest: false,
          opacity: 0,
        }),
      );
      tag.scale.set(2.5, 1.17, 1);
      tag.renderOrder = 10;
      world.add(tag);
      tags.push(tag);
    }
    buildStreet(type, sizeOf(beds));

    // Street furniture: trees, lamps, railings, a sale board and parked cars
    const tree = (x: number, z: number, s: number) => {
      add(
        world,
        new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 0.9 * s, 12),
        mat(0x8a5a44, 0.8),
        x,
        GROUND + 0.45 * s,
        z,
      );
      add(
        world,
        new THREE.SphereGeometry(0.64 * s, 24, 18),
        mat(0x5fae5a, 0.7),
        x,
        GROUND + 1.3 * s,
        z,
      );
      add(
        world,
        new THREE.SphereGeometry(0.44 * s, 24, 18),
        mat(0x78c46b, 0.7),
        x + 0.26 * s,
        GROUND + 1.8 * s,
        z - 0.1,
      );
    };
    tree(-6.5, 1.0, 1.1);
    tree(6.5, 1.0, 1.0);
    tree(-6.4, -2.9, 0.8);
    tree(6.5, -2.8, 0.9);

    const lamp = (x: number) => {
      add(
        world,
        new THREE.CylinderGeometry(0.05, 0.07, 2.4, 12),
        mat(0x2c3554, 0.4),
        x,
        GROUND + 1.2,
        2.35,
      );
      add(
        world,
        box(0.34, 0.3, 0.34, 0.08),
        mat(0x2c3554, 0.4),
        x,
        GROUND + 2.45,
        2.35,
      );
      add(
        world,
        new THREE.SphereGeometry(0.13, 16, 12),
        mat(0xfff0c2, 0.3, { emissive: 0xffd27a, emissiveIntensity: 1.6 }),
        x,
        GROUND + 2.42,
        2.35,
      );
    };
    lamp(-3.6);
    lamp(3.6);

    // Railings along each front garden
    const railMat = mat(0x1c2340, 0.4, { metalness: 0.4 });
    for (let i = 0; i < 70; i++) {
      add(
        world,
        new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6),
        railMat,
        -6 + i * 0.175,
        GROUND + 0.25,
        1.05,
      );
    }
    add(world, box(12.2, 0.04, 0.04, 0.01), railMat, 0.05, GROUND + 0.48, 1.05);

    // Sale board on its post
    add(
      world,
      new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8),
      mat(0xf6efe6, 0.6),
      -1.25,
      GROUND + 0.8,
      1.45,
    );
    // The board itself: "For sale" on the front, "Sold" on the back. It
    // swings round once the houses are up.
    const boardFace = (text: string, background: string, ink: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 200;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 320, 200);
      ctx.fillStyle = ink;
      ctx.font =
        '700 84px system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 160, 106, 290);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };
    const boardTextures = [
      boardFace("For sale", "#b4232a", "#ffffff"),
      boardFace("Sold", "#16223f", "#e8c46a"),
    ];
    const boardEdge = new THREE.MeshStandardMaterial({
      color: 0xf6efe6,
      roughness: 0.5,
    });
    const boardFaces = boardTextures.map(
      (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.45 }),
    );
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.68, 0.07), [
      boardEdge,
      boardEdge,
      boardEdge,
      boardEdge,
      boardFaces[0],
      boardFaces[1],
    ]);
    board.position.set(-1.25, GROUND + 1.6, 1.45);
    board.castShadow = true;
    world.add(board);

    const car = (x: number, color: number) => {
      const g = new THREE.Group();
      add(
        g,
        box(1.5, 0.42, 0.78, 0.18),
        mat(color, 0.3, { metalness: 0.2 }),
        0,
        0.42,
        0,
      );
      add(
        g,
        box(0.86, 0.36, 0.7, 0.16),
        mat(color, 0.3, { metalness: 0.2 }),
        -0.08,
        0.78,
        0,
      );
      add(g, box(0.74, 0.26, 0.72, 0.1), mat(0x2b3556, 0.1), -0.08, 0.8, 0);
      [-0.48, 0.48].forEach((dx) =>
        [-0.4, 0.4].forEach((dz) => {
          const wheel = add(
            g,
            new THREE.CylinderGeometry(0.17, 0.17, 0.12, 18),
            mat(0x1c2340, 0.6),
            dx,
            0.2,
            dz,
          );
          wheel.rotation.x = Math.PI / 2;
        }),
      );
      g.position.set(x, GROUND - 0.05, 2.9);
      world.add(g);
      return g;
    };
    car(-4.3, 0xe0b23c);
    car(5.2, 0xefe6da);
    // One car drives the far lane, end to end
    const driver = car(0, 0x2f4fb0);
    driver.position.z = 4.05;

    let playStart = performance.now();
    // Set while the old street is coming down, before the new one goes up
    let swap: {
      at: number;
      to: { type: StreetType; size: number };
    } | null = null;
    let hovered: number | null = null;
    let currentSales: DioramaSale[] = [];

    const paintTag = (i: number) => {
      const sale = currentSales[i];
      const tag = tags[i];
      tag.visible = Boolean(sale);
      if (!sale) return;
      tag.material.map?.dispose();
      tag.material.map = tagTexture(
        sale.overAskingPct,
        hovered === i,
        sale.locked,
      );
      tag.material.needsUpdate = true;
    };

    api.current = {
      setSales(next) {
        currentSales = next;
        tags.forEach((_, i) => paintTag(i));
        if (!swap) playStart = performance.now();
      },
      setHome(nextType, bedrooms) {
        const size = sizeOf(bedrooms);
        const target = swap?.to ?? street;
        if (target?.type === nextType && target.size === size) return;
        if (reduceMotion) {
          buildStreet(nextType, size);
          return;
        }
        swap = { at: performance.now(), to: { type: nextType, size } };
      },
    };
    api.current.setSales(sales);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const ndc = new THREE.Vector2(9, 9);
    const raycaster = new THREE.Raycaster();
    const onPointer = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      ndc.set(inside ? pointer.tx : 9, inside ? -pointer.ty : 9);
    };
    window.addEventListener("pointermove", onPointer);

    let scroll = 0;
    const onScroll = () => {
      scroll = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let baseHalf = 8;
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = el;
      if (!width || !height) return;
      renderer.setSize(width, height);
      const aspect = width / height;
      baseHalf = Math.max(6.1, 10.4 / aspect);
      camera.left = -baseHalf * aspect;
      camera.right = baseHalf * aspect;
      camera.top = baseHalf;
      camera.bottom = -baseHalf;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    let visible = true;
    const visibility = new IntersectionObserver(
      ([entry]) => (visible = entry.isIntersecting),
    );
    visibility.observe(el);

    const mountTime = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;
      const time = now / 1000;
      const sincePlay = reduceMotion ? 10 : (now - playStart) / 1000;
      const intro = reduceMotion
        ? 1
        : easeOutCubic(clamp01((now - mountTime) / 1600));

      // Intro: the camera settles in from further out
      camera.zoom = 0.78 + 0.22 * intro + scroll * 0.12;
      camera.updateProjectionMatrix();

      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      if (!reduceMotion) {
        world.rotation.y =
          (1 - intro) * -0.5 +
          Math.sin(time * 0.25) * 0.06 +
          pointer.x * 0.16 +
          scroll * 0.55;
        world.rotation.x = pointer.y * 0.035;
        world.position.y = Math.sin(time * 0.7) * 0.08 - scroll * 1.2;
      }

      // Hover picking
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hitBoxes, false)[0];
      const next =
        hit && currentSales[hit.object.userData.index as number]
          ? (hit.object.userData.index as number)
          : null;
      if (next !== hovered) {
        const previous = hovered;
        hovered = next;
        if (previous !== null) paintTag(previous);
        if (next !== null) paintTag(next);
        el.style.cursor = next === null ? "" : "pointer";
        hoverCallback.current?.(next);
      }

      // Changing type: the street drops into the ground, then the new one rises
      let drop = 1;
      if (swap) {
        drop = 1 - easeOutCubic(clamp01((now - swap.at) / 320));
        if (drop <= 0.001) {
          buildStreet(swap.to.type, swap.to.size);
          swap = null;
          playStart = now;
          return;
        }
      }
      if (!reduceMotion) {
        driver.position.x = ((time * 1.6) % 17) - 8.5;
        driver.visible = Math.abs(driver.position.x) < 6.3;
      } else {
        driver.position.x = 1.6;
      }

      // The answer has landed: the board swings to "Sold" and lights come on
      board.rotation.y =
        Math.PI * easeOutBack(clamp01((sincePlay - 1.5) / 0.7)) * drop;
      waveMats.forEach((material, i) => {
        const on = clamp01((sincePlay - 1.7 - i * 0.16) / 0.5) * drop;
        material.color.lerpColors(DARK, WARM, on);
        material.emissiveIntensity = 0.9 * on;
      });

      houses.forEach((house, i) => {
        const grow = clamp01((sincePlay - 0.15 - i * 0.13) / 0.75);
        house.scale.y = Math.max(0.001, easeOutBack(grow) * drop);
        if (i >= HOUSE_COUNT) return;
        const lift = hovered === i ? 0.45 : 0;
        house.userData.lift =
          (house.userData.lift ?? 0) +
          (lift - (house.userData.lift ?? 0)) * 0.15;
        house.position.y = house.userData.baseY + house.userData.lift;

        const tag = tags[i];
        tag.material.opacity =
          clamp01((sincePlay - 0.9 - i * 0.13) / 0.4) * drop;
        tag.position.set(
          house.position.x,
          house.position.y +
            tag.userData.offsetY * house.scale.y +
            (reduceMotion ? 0 : Math.sin(time * 1.5 + i * 1.3) * 0.08),
          house.position.z,
        );
        const s = hovered === i ? 1.15 : 1;
        tag.scale.x += (2.5 * s - tag.scale.x) * 0.2;
        tag.scale.y += (1.17 * s - tag.scale.y) * 0.2;
      });

      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      visibility.disconnect();
      api.current = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
      waveMats.forEach((m) => m.dispose());
      boardTextures.forEach((t) => t.dispose());
      boardFaces.forEach((m) => m.dispose());
      boardEdge.dispose();
      tags.forEach((tag) => {
        tag.material.map?.dispose();
        tag.material.dispose();
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
    // The scene is built once; new sales are pushed in through the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.setHome(type, beds);
  }, [type, beds]);

  useEffect(() => {
    api.current?.setSales(sales);
  }, [sales]);

  return <div ref={mount} className="rp-diorama" aria-hidden="true" />;
}
