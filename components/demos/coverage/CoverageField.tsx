"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { qualityColor } from "@/lib/three-utils";
import {
  type ActiveCell,
  BLOOM_MS,
  FIELD_SIZE,
  GRID_N,
  SAMPLE_XS,
  SAMPLE_ZS,
} from "./coverage-model";

/** How far the radial reveal front travels over one bloom-in (covers the map). */
const REVEAL_MAX_RADIUS = 320;
/** Soft edge width of the reveal front, metres. */
const REVEAL_EDGE = 24;
/** Scratch capacity — comfortably above 12 rollout + 6 custom cells. */
const MAX_CELLS = 32;
const BASE_OPACITY = 0.5;

/**
 * 256-entry RGBA LUT over the normalized coverage value: qualityColor
 * ramp (rose → amber → emerald → cyan) with brightness boosted toward
 * the strong end so bloom lifts hot streets, and alpha fading to zero
 * so uncovered streets and building shadows stay dark under additive
 * blending.
 */
const LUT = (() => {
  const lut = new Uint8Array(256 * 4);
  const c = new THREE.Color();
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    qualityColor(v, c);
    const boost = 0.55 + 0.8 * v;
    lut[i * 4] = Math.min(255, Math.round(c.r * boost * 255));
    lut[i * 4 + 1] = Math.min(255, Math.round(c.g * boost * 255));
    lut[i * 4 + 2] = Math.min(255, Math.round(c.b * boost * 255));
    lut[i * 4 + 3] = Math.round(255 * Math.pow(v, 0.55));
  }
  return lut;
})();

interface CoverageFieldProps {
  cells: ActiveCell[];
  /** Per-cell normalized contribution grids, parallel to `cells`. */
  grids: Float32Array[];
  /** Sample indices on streets (samples inside buildings stay dark). */
  streetIdx: Uint32Array;
  visible: boolean;
}

/**
 * Ground-hugging street-level heat field: an 88×88 RGBA DataTexture
 * updated in place. Per sample the displayed value is the max over
 * active cells of (cached contribution × radial bloom-in reveal).
 * The texture is only rewritten while a cell is still animating or the
 * active set changed — otherwise the frame loop exits immediately.
 */
export function CoverageField({
  cells,
  grids,
  streetIdx,
  visible,
}: CoverageFieldProps) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const dirtyRef = useRef(true);
  const scratchRef = useRef({
    revealR: new Float32Array(MAX_CELLS),
    cx: new Float32Array(MAX_CELLS),
    cz: new Float32Array(MAX_CELLS),
  });

  const { texture, data } = useMemo(() => {
    const data = new Uint8Array(GRID_N * GRID_N * 4); // zeros = dark
    const texture = new THREE.DataTexture(data, GRID_N, GRID_N);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return { texture, data };
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  // Any change to the active set forces one texture rewrite.
  useEffect(() => {
    dirtyRef.current = true;
  }, [cells, grids]);

  useFrame(() => {
    // Subtle breathing so the field feels alive (independent of updates).
    const mat = matRef.current;
    if (mat) {
      mat.opacity =
        BASE_OPACITY + 0.035 * Math.sin(performance.now() * 0.0012);
    }

    const n = Math.min(cells.length, MAX_CELLS);
    const now = performance.now();
    let anyAnimating = false;
    for (let c = 0; c < n; c++) {
      if (now - cells[c].activatedAt < BLOOM_MS) {
        anyAnimating = true;
        break;
      }
    }
    if (!anyAnimating && !dirtyRef.current) return;
    // Keep updating while animating; guarantees one final full pass after.
    dirtyRef.current = anyAnimating;

    const { revealR, cx, cz } = scratchRef.current;
    for (let c = 0; c < n; c++) {
      const t = (now - cells[c].activatedAt) / BLOOM_MS;
      if (t >= 1) {
        revealR[c] = -1; // sentinel: fully revealed, skip distance math
      } else {
        const tc = t < 0 ? 0 : t; // staggered cells may start in the future
        const ease = 1 - (1 - tc) ** 3;
        revealR[c] = REVEAL_MAX_RADIUS * ease;
      }
      cx[c] = cells[c].x;
      cz[c] = cells[c].z;
    }

    for (let k = 0; k < streetIdx.length; k++) {
      const i = streetIdx[k];
      const sx = SAMPLE_XS[i % GRID_N];
      const sz = SAMPLE_ZS[(i / GRID_N) | 0];
      let best = 0;
      for (let c = 0; c < n; c++) {
        let v = grids[c][i];
        if (v <= best) continue;
        const r = revealR[c];
        if (r >= 0) {
          const dx = sx - cx[c];
          const dz = sz - cz[c];
          const f = (r - Math.sqrt(dx * dx + dz * dz)) / REVEAL_EDGE;
          if (f <= 0) continue;
          if (f < 1) v *= f;
          if (v <= best) continue;
        }
        best = v;
      }
      const lo = ((best * 255) | 0) * 4;
      const o = i * 4;
      data[o] = LUT[lo];
      data[o + 1] = LUT[lo + 1];
      data[o + 2] = LUT[lo + 2];
      data[o + 3] = LUT[lo + 3];
    }
    texture.needsUpdate = true;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.15, 0]}
      visible={visible}
    >
      <planeGeometry args={[FIELD_SIZE, FIELD_SIZE]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={BASE_OPACITY}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
