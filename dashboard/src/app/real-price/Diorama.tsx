'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export interface DioramaSale {
  overAskingPct: number;
}

interface Props {
  /** The most recent comparable sales: one house each, left to right. */
  sales: DioramaSale[];
  onUnavailable?: () => void;
}

const BRICKS = [0xc9785a, 0xefe2cf, 0xb9654b, 0xd48f6d, 0xe8d6c1];
const DOORS = [0xc0392b, 0x2f4fb0, 0xe0b23c, 0x1f6f78, 0x2e6b4a];
const HOUSE_COUNT = 5;

const easeOutBack = (p: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function tagTexture(pct: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 150;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.roundRect(6, 6, 308, 118, 59);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(140, 122);
  ctx.lineTo(160, 146);
  ctx.lineTo(180, 122);
  ctx.fill();
  ctx.fillStyle = pct >= 0 ? '#b4232a' : '#4d586b';
  ctx.font = '600 62px system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, 160, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A small isometric model of a Dublin terrace. Each house stands for one of the
 * most recent comparable sales and carries a tag showing how far over (or
 * under) its asking price it sold.
 */
export default function Diorama({ sales, onUnavailable }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{ setSales: (sales: DioramaSale[]) => void } | null>(null);

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
    el.appendChild(renderer.domElement);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    camera.position.set(20, 16.5, 20);
    camera.lookAt(0, 1.5, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc4ea, 1.5));
    const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
    sun.position.set(-7, 16, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 7;
    sun.shadow.bias = -0.0005;
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
    scene.add(sun);

    // Soft shadow on the "table" under the floating block
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.4;
    floor.receiveShadow = true;
    scene.add(floor);

    const world = new THREE.Group();
    scene.add(world);

    const materials = new Map<number, THREE.MeshStandardMaterial>();
    const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => {
      if (Object.keys(extra).length) return new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
      if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
      return materials.get(color)!;
    };
    const add = (
      parent: THREE.Object3D,
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      x: number,
      y: number,
      z: number
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const box = (w: number, h: number, d: number, r = 0.08) =>
      new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2));

    // The block: earth below, lawn on top, a pavement along the front
    add(world, box(14, 2.4, 7, 0.5), mat(0x9b6674), 0, -1.35, 0);
    add(world, box(14, 0.6, 7, 0.3), mat(0x9fd66b), 0, 0.1, 0);
    add(world, box(13.4, 0.14, 1.5, 0.06), mat(0xece6dc), 0, 0.46, 2.3);

    const GROUND = 0.4;
    const houses: THREE.Group[] = [];
    const tags: THREE.Sprite[] = [];

    for (let i = 0; i < HOUSE_COUNT; i++) {
      const house = new THREE.Group();
      const w = 2.3;
      const d = 2.6;
      const h = 3.5 + (i % 2 === 1 ? 0.35 : 0);
      house.position.set((i - (HOUSE_COUNT - 1) / 2) * 2.42, GROUND, -0.7);
      const front = d / 2;

      add(house, box(w, h, d, 0.1), mat(BRICKS[i]), 0, h / 2, 0);
      add(house, box(w + 0.12, 0.22, d + 0.12, 0.06), mat(0xf6efe6), 0, h + 0.02, 0);
      add(house, box(w - 0.3, 0.3, d - 0.3, 0.12), mat(0x57618f), 0, h + 0.2, 0);
      add(house, box(0.5, 0.9, 0.5, 0.06), mat(0xa8584a), -w / 2 + 0.45, h + 0.6, -0.6);
      [-0.11, 0.11].forEach((dx) =>
        add(house, new THREE.CylinderGeometry(0.08, 0.1, 0.26, 12), mat(0xd9855f), -w / 2 + 0.45 + dx, h + 1.15, -0.6)
      );

      // Door with surround, fanlight and step
      const doorX = i % 2 === 0 ? -0.55 : 0.55;
      add(house, box(0.78, 1.5, 0.1, 0.05), mat(0xf6efe6), doorX, 0.75, front + 0.02);
      add(house, box(0.54, 1.02, 0.1, 0.04), mat(DOORS[i], { roughness: 0.35 }), doorX, 0.55, front + 0.06);
      add(house, box(0.5, 0.26, 0.1, 0.1), mat(0x3a4770, { roughness: 0.2 }), doorX, 1.26, front + 0.06);
      add(house, new THREE.SphereGeometry(0.05, 12, 12), mat(0xe8c46a, { metalness: 0.6, roughness: 0.3 }), doorX + 0.17, 0.58, front + 0.13);
      add(house, box(0.95, 0.14, 0.5, 0.05), mat(0xdcd5ca), doorX, 0.07, front + 0.28);

      // Sash windows: lit ones glow
      for (let floor = 0; floor < 3; floor++) {
        for (const side of [-0.55, 0.55]) {
          if (floor === 0 && side === doorX) continue;
          const lit = (i * 3 + floor * 2 + (side > 0 ? 1 : 0)) % 4 === 0;
          const y = 0.85 + floor * 1.08;
          add(house, box(0.62, 0.8, 0.08, 0.04), mat(0xf6efe6), side, y, front + 0.01);
          add(
            house,
            box(0.46, 0.64, 0.08, 0.03),
            lit
              ? mat(0xffd98a, { emissive: 0xffb84a, emissiveIntensity: 0.7 })
              : mat(0x3a4770, { roughness: 0.2 }),
            side,
            y,
            front + 0.04
          );
        }
      }

      const tag = new THREE.Sprite(
        new THREE.SpriteMaterial({ transparent: true, depthTest: false, opacity: 0 })
      );
      tag.scale.set(1.85, 0.87, 1);
      tag.position.set(house.position.x, GROUND + h + 2.1, house.position.z);
      tag.userData.baseY = tag.position.y;
      tag.renderOrder = 10;
      world.add(tag);
      tags.push(tag);

      world.add(house);
      houses.push(house);
    }

    // Street furniture: two trees, a lamp and a sale board
    for (const x of [-6.1, 6.1]) {
      add(world, new THREE.CylinderGeometry(0.1, 0.13, 0.9, 10), mat(0x8a5a44), x, GROUND + 0.45, 1.2);
      add(world, new THREE.SphereGeometry(0.62, 20, 16), mat(0x5fae5a), x, GROUND + 1.25, 1.2);
      add(world, new THREE.SphereGeometry(0.42, 20, 16), mat(0x74c267), x + 0.25, GROUND + 1.75, 1.05);
    }
    add(world, new THREE.CylinderGeometry(0.05, 0.06, 2.3, 10), mat(0x2c3554), 3.65, GROUND + 1.2, 2.75);
    add(world, new THREE.SphereGeometry(0.17, 16, 12), mat(0xfff0c2, { emissive: 0xffd27a, emissiveIntensity: 1 }), 3.65, GROUND + 2.42, 2.75);
    add(world, new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), mat(0xf6efe6), -1.2, GROUND + 0.8, 2.1);
    add(world, box(0.95, 0.6, 0.07, 0.04), mat(0xb4232a, { roughness: 0.4 }), -1.2, GROUND + 1.55, 2.1);
    add(world, box(0.7, 0.1, 0.08, 0.02), mat(0xffffff), -1.2, GROUND + 1.55, 2.12);

    let playStart = performance.now();
    api.current = {
      setSales(next) {
        tags.forEach((tag, i) => {
          const sale = next[i];
          tag.visible = Boolean(sale);
          if (!sale) return;
          tag.material.map?.dispose();
          tag.material.map = tagTexture(sale.overAskingPct);
          tag.material.needsUpdate = true;
        });
        playStart = performance.now();
      },
    };
    api.current.setSales(sales);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointer);

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = el;
      if (!width || !height) return;
      renderer.setSize(width, height);
      // Fit the 14-unit-wide block with breathing room at any aspect ratio
      const aspect = width / height;
      const half = Math.max(7.2, 12.2 / aspect);
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    visibility.observe(el);

    let frame = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;
      const time = now / 1000;
      const sincePlay = reduceMotion ? 10 : (now - playStart) / 1000;

      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      if (!reduceMotion) {
        world.rotation.y = Math.sin(time * 0.28) * 0.1 + pointer.x * 0.28;
        world.rotation.x = pointer.y * 0.05;
        world.position.y = Math.sin(time * 0.7) * 0.1;
      }

      houses.forEach((house, i) => {
        const grow = clamp01((sincePlay - 0.15 - i * 0.13) / 0.75);
        house.scale.y = Math.max(0.001, easeOutBack(grow));
        const tag = tags[i];
        tag.material.opacity = clamp01((sincePlay - 0.9 - i * 0.13) / 0.4);
        tag.position.y = tag.userData.baseY + (reduceMotion ? 0 : Math.sin(time * 1.5 + i * 1.3) * 0.08);
      });

      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      resizeObserver.disconnect();
      visibility.disconnect();
      api.current = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      tags.forEach((tag) => {
        tag.material.map?.dispose();
        tag.material.dispose();
      });
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
