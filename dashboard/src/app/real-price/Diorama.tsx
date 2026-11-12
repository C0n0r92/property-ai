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
 * A clay-style isometric model of a Dublin terrace. Each house stands for one
 * of the most recent comparable sales and carries a tag showing how far over
 * (or under) its asking price it sold. Hovering a house lifts it.
 */
export default function Diorama({ sales, onHover, onUnavailable }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{ setSales: (sales: DioramaSale[]) => void } | null>(null);
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
    const houses: THREE.Group[] = [];
    const tags: THREE.Sprite[] = [];
    const hitBoxes: THREE.Mesh[] = [];

    for (let i = 0; i < HOUSE_COUNT; i++) {
      const house = new THREE.Group();
      const w = 2.3;
      const d = 2.6;
      const h = 3.6 + (i % 2 === 1 ? 0.35 : 0);
      house.position.set((i - (HOUSE_COUNT - 1) / 2) * 2.42, GROUND, -0.9);
      house.userData.baseY = GROUND;
      const front = d / 2;

      add(house, box(w, h, d, 0.12), mat(BRICKS[i], 0.72), 0, h / 2, 0);
      add(
        house,
        box(w + 0.14, 0.24, d + 0.14, 0.07),
        mat(0xf6efe6, 0.5),
        0,
        h + 0.02,
        0,
      );
      add(
        house,
        box(w - 0.3, 0.34, d - 0.3, 0.14),
        mat(0x57618f, 0.45),
        0,
        h + 0.22,
        0,
      );
      add(
        house,
        box(0.52, 0.95, 0.52, 0.07),
        mat(0xa8584a, 0.7),
        -w / 2 + 0.46,
        h + 0.6,
        -0.65,
      );
      [-0.12, 0.12].forEach((dx) =>
        add(
          house,
          new THREE.CylinderGeometry(0.08, 0.1, 0.28, 16),
          mat(0xd9855f, 0.55),
          -w / 2 + 0.46 + dx,
          h + 1.2,
          -0.65,
        ),
      );
      // A string course between floors, as on Georgian brick
      add(
        house,
        box(w + 0.02, 0.07, d + 0.02, 0.02),
        mat(0xf6efe6, 0.6),
        0,
        1.65,
        0,
      );

      // Door with surround, fanlight, knocker and step
      const doorX = i % 2 === 0 ? -0.55 : 0.55;
      add(
        house,
        box(0.8, 1.55, 0.12, 0.05),
        mat(0xf6efe6, 0.5),
        doorX,
        0.78,
        front + 0.02,
      );
      add(
        house,
        box(0.54, 1.02, 0.12, 0.04),
        mat(DOORS[i], 0.28),
        doorX,
        0.55,
        front + 0.07,
      );
      add(
        house,
        box(0.5, 0.26, 0.1, 0.1),
        mat(0x3a4770, 0.15),
        doorX,
        1.27,
        front + 0.07,
      );
      add(
        house,
        new THREE.SphereGeometry(0.055, 16, 16),
        mat(0xe8c46a, 0.25, { metalness: 0.8 }),
        doorX + 0.17,
        0.58,
        front + 0.15,
      );
      add(
        house,
        box(0.98, 0.16, 0.55, 0.05),
        mat(0xdcd5ca, 0.85),
        doorX,
        0.08,
        front + 0.3,
      );

      // Sash windows: lit ones glow
      for (let floor = 0; floor < 3; floor++) {
        for (const side of [-0.55, 0.55]) {
          if (floor === 0 && side === doorX) continue;
          const lit = (i * 3 + floor * 2 + (side > 0 ? 1 : 0)) % 4 === 0;
          const y = 0.9 + floor * 1.1;
          add(
            house,
            box(0.64, 0.84, 0.1, 0.04),
            mat(0xf6efe6, 0.5),
            side,
            y,
            front + 0.01,
          );
          add(
            house,
            box(0.48, 0.68, 0.1, 0.03),
            lit
              ? mat(0xffd98a, 0.4, {
                  emissive: 0xffb84a,
                  emissiveIntensity: 0.9,
                })
              : mat(0x34406a, 0.12, { metalness: 0.1 }),
            side,
            y,
            front + 0.04,
          );
          add(
            house,
            box(0.5, 0.025, 0.11, 0.01),
            mat(0xf6efe6, 0.5),
            side,
            y,
            front + 0.07,
          );
        }
      }

      // Invisible box used for pointer picking
      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(w, h + 1.4, d),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      // Fixed to the block, not the house, so lifting a house on hover
      // does not move its target out from under the pointer
      hit.position.set(
        house.position.x,
        GROUND + (h + 1.4) / 2,
        house.position.z,
      );
      hit.userData.index = i;
      world.add(hit);
      hitBoxes.push(hit);

      const tag = new THREE.Sprite(
        new THREE.SpriteMaterial({
          transparent: true,
          depthTest: false,
          opacity: 0,
        }),
      );
      tag.scale.set(2.5, 1.17, 1);
      tag.userData.offsetY = h + 2.45;
      tag.renderOrder = 10;
      world.add(tag);
      tags.push(tag);

      world.add(house);
      houses.push(house);
    }

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
    add(
      world,
      box(1.0, 0.62, 0.07, 0.04),
      mat(0xb4232a, 0.4),
      -1.25,
      GROUND + 1.55,
      1.45,
    );
    add(
      world,
      box(0.72, 0.1, 0.08, 0.02),
      mat(0xffffff, 0.5),
      -1.25,
      GROUND + 1.55,
      1.47,
    );

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
    };
    car(-4.3, 0xe0b23c);
    car(1.6, 0x2f4fb0);
    car(5.2, 0xefe6da);

    let playStart = performance.now();
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
        playStart = performance.now();
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

      houses.forEach((house, i) => {
        const grow = clamp01((sincePlay - 0.15 - i * 0.13) / 0.75);
        house.scale.y = Math.max(0.001, easeOutBack(grow));
        const lift = hovered === i ? 0.45 : 0;
        house.userData.lift =
          (house.userData.lift ?? 0) +
          (lift - (house.userData.lift ?? 0)) * 0.15;
        house.position.y = house.userData.baseY + house.userData.lift;

        const tag = tags[i];
        tag.material.opacity = clamp01((sincePlay - 0.9 - i * 0.13) / 0.4);
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
    api.current?.setSales(sales);
  }, [sales]);

  return <div ref={mount} className="rp-diorama" aria-hidden="true" />;
}
