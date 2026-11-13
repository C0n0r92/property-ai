/**
 * The finishing pass for the site's 3D scenes: soft ambient occlusion where
 * surfaces meet (N8AO), a gentle glow on the brightest highlights, filmic
 * tone mapping and anti-aliasing (pmndrs postprocessing).
 *
 * If anything here is unsupported the scene keeps rendering the plain way,
 * so the effects are an upgrade, never a dependency.
 */
import * as THREE from "three";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
} from "postprocessing";
import { N8AOPostPass } from "n8ao";

export interface PostFx {
  render: () => void;
  setSize: (width: number, height: number) => void;
  dispose: () => void;
}

interface Options {
  /** World-space reach of the occlusion: about a tenth of the main objects' size */
  aoRadius: number;
  aoIntensity?: number;
  /** Glow strength on bright highlights; 0 for none */
  bloom?: number;
  /** Brightness a surface needs before it glows (1 = only true highlights) */
  bloomThreshold?: number;
}

/** Phones and low-power devices get half-resolution, lower-sample occlusion. */
function lowPower(): boolean {
  if (typeof window === "undefined") return true;
  const small = window.matchMedia("(max-width: 700px)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  return small || cores <= 4;
}

/** Off with ?fx=0 in the address, for comparing or for slow machines. */
function disabled(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fx") === "0";
}

export function createPostFx(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  { aoRadius, aoIntensity = 2.2, bloom = 0.35, bloomThreshold = 1 }: Options,
): PostFx | null {
  if (disabled() || !renderer.capabilities.isWebGL2) return null;
  const previousToneMapping = renderer.toneMapping;
  try {
    // Tone mapping moves to the end of the chain; done here too it would clamp colours early
    renderer.toneMapping = THREE.NoToneMapping;
    const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));

    const size = renderer.getSize(new THREE.Vector2());
    const ao = new N8AOPostPass(scene, camera, size.x, size.y);
    const cheap = lowPower();
    Object.assign(ao.configuration, {
      aoRadius,
      distanceFalloff: 1,
      intensity: aoIntensity,
      // A warm violet shadow rather than grey, to sit with the pink and cream
      color: new THREE.Color(0x3b2a4a),
      halfRes: cheap,
      // Later passes handle the colour space
      gammaCorrection: false,
    });
    ao.setQualityMode(cheap ? "Low" : "Medium");
    composer.addPass(ao);

    const effects = [];
    if (bloom > 0) {
      effects.push(
        new BloomEffect({ luminanceThreshold: bloomThreshold, luminanceSmoothing: 0.15, intensity: bloom, mipmapBlur: true, radius: 0.5 }),
      );
    }
    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }));
    effects.push(new SMAAEffect({ preset: cheap ? SMAAPreset.MEDIUM : SMAAPreset.HIGH }));
    composer.addPass(new EffectPass(camera, ...effects));

    return {
      render: () => composer.render(),
      setSize: (width, height) => composer.setSize(width, height),
      dispose: () => composer.dispose(),
    };
  } catch (error) {
    console.warn("3D effects unavailable, rendering without them:", error);
    renderer.toneMapping = previousToneMapping;
    return null;
  }
}
