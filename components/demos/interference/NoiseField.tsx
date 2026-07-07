"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RF_COLORS, mulberry32 } from "@/lib/three-utils";
import {
  type ClutterGrid,
  FIELD_CEILING,
  FIELD_HALF,
  sampleClutter,
} from "./field";

/**
 * Volumetric interference haze: layered THREE.Points clouds whose particle
 * density follows the clutter proxy (rejection sampling), so tightly-packed
 * blocks glow hot while plazas stay nearly clear. Three interleaved layers
 * bob, drift and flicker at different rates for a cheap "alive" read — all
 * animation is material/group-level, no per-frame attribute rewrites.
 */

const LAYERS = [
  { seed: 4101, bobSpeed: 0.13, bobAmp: 0.85, driftSpeed: 0.05, flicker: 0.85, phase: 0.0 },
  { seed: 4207, bobSpeed: 0.19, bobAmp: 0.6, driftSpeed: 0.034, flicker: 1.3, phase: 2.1 },
  { seed: 4313, bobSpeed: 0.08, bobAmp: 1.15, driftSpeed: 0.061, flicker: 0.55, phase: 4.4 },
] as const;

type LayerConfig = (typeof LAYERS)[number];

const BASE_OPACITY = 0.3;
const BASE_SIZE = 0.5;

/** Colour ramp: dim navy-blue (cold) → purple → amber (hot clutter). */
const COLD = new THREE.Color(RF_COLORS.blue).lerp(
  new THREE.Color(RF_COLORS.navyLight),
  0.5
);
const MID = new THREE.Color(RF_COLORS.purple);
const HOT = new THREE.Color(RF_COLORS.amber);

interface NoiseFieldProps {
  /** Total particle budget across all layers. */
  count: number;
  clutterGrid: ClutterGrid;
  /** Brightness multiplier tied to the clutter-intensity slider. */
  clutterGain: number;
  visible: boolean;
}

export function NoiseField({
  count,
  clutterGrid,
  clutterGain,
  visible,
}: NoiseFieldProps) {
  const perLayer = Math.floor(count / LAYERS.length);
  return (
    <group visible={visible}>
      {LAYERS.map((layer) => (
        <NoiseLayer
          key={layer.seed}
          config={layer}
          count={perLayer}
          clutterGrid={clutterGrid}
          clutterGain={clutterGain}
        />
      ))}
    </group>
  );
}

function NoiseLayer({
  config,
  count,
  clutterGrid,
  clutterGain,
}: {
  config: LayerConfig;
  count: number;
  clutterGrid: ClutterGrid;
  clutterGain: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const geometry = useMemo(() => {
    const rand = mulberry32(config.seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    let placed = 0;
    let guard = count * 60; // rejection sampling upper bound
    while (placed < count && guard-- > 0) {
      const x = (rand() * 2 - 1) * FIELD_HALF;
      const z = (rand() * 2 - 1) * FIELD_HALF;
      const clutter = sampleClutter(clutterGrid, x, z);
      // accept-probability weighted by clutter → haze pools in dense blocks
      if (rand() > 0.1 + 0.9 * Math.pow(clutter, 1.1)) continue;

      const y = FIELD_CEILING * Math.pow(rand(), 1.45); // denser near street
      const i3 = placed * 3;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      if (clutter < 0.5) color.copy(COLD).lerp(MID, clutter * 2);
      else color.copy(MID).lerp(HOT, (clutter - 0.5) * 2);
      const heightFade = 1 - 0.35 * (y / FIELD_CEILING);
      color.multiplyScalar(
        (0.3 + 1.1 * Math.pow(clutter, 1.6)) * heightFade * (0.75 + 0.5 * rand())
      );
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      placed++;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions.slice(0, placed * 3), 3)
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(colors.slice(0, placed * 3), 3)
    );
    return geo;
  }, [config.seed, count, clutterGrid]);

  /** Slider brightens the whole layer via material tint (vertex × material). */
  const tint = useMemo(
    () => new THREE.Color().setScalar(0.5 + 0.4 * clutterGain),
    [clutterGain]
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = groupRef.current;
    const m = matRef.current;
    if (g) {
      g.position.y = Math.sin(t * config.bobSpeed + config.phase) * config.bobAmp;
      g.position.x = Math.sin(t * config.driftSpeed + config.phase * 1.3) * 0.9;
    }
    if (m) {
      m.opacity = BASE_OPACITY * (0.85 + 0.15 * Math.sin(t * config.flicker + config.phase));
      m.size = BASE_SIZE * (1 + 0.07 * Math.sin(t * config.flicker * 0.7 + config.phase * 1.7));
    }
  });

  return (
    <group ref={groupRef}>
      <points key={count} geometry={geometry}>
        <pointsMaterial
          ref={matRef}
          vertexColors
          color={tint}
          size={BASE_SIZE}
          sizeAttenuation
          transparent
          opacity={BASE_OPACITY}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
