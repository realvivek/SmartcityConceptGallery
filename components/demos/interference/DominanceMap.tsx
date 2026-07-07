"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { qualityColor } from "@/lib/three-utils";
import { FIELD_HALF, GRID_N } from "./field";

interface DominanceMapProps {
  /** Best-carrier margin over the noise floor, dB, GRID_N × GRID_N. */
  margins: Float32Array;
  visible: boolean;
}

/**
 * SINR-style ground overlay: a DataTexture painted from the dominance
 * margins — emerald/cyan where a cell clearly rises above the clutter
 * floor, warm fringes at the break-even boundary, transparent elsewhere.
 * Rebuilt only when the margins array changes (placement / slider), never
 * per frame.
 */
export function DominanceMap({ margins, visible }: DominanceMapProps) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const texture = useMemo(() => {
    const data = new Uint8Array(GRID_N * GRID_N * 4);
    const color = new THREE.Color();
    for (let row = 0; row < GRID_N; row++) {
      // plane UV v runs opposite to the grid's +z — flip rows on write
      const src = (GRID_N - 1 - row) * GRID_N;
      for (let ix = 0; ix < GRID_N; ix++) {
        const margin = margins[src + ix];
        if (!(margin > 0)) continue; // transparent where the floor wins
        qualityColor(Math.min(margin / 26, 1), color);
        const o = (row * GRID_N + ix) * 4;
        data[o] = Math.round(color.r * 255);
        data[o + 1] = Math.round(color.g * 255);
        data[o + 2] = Math.round(color.b * 255);
        data[o + 3] = Math.round(60 + 195 * Math.min(margin / 10, 1));
      }
    }
    const tex = new THREE.DataTexture(data, GRID_N, GRID_N, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [margins]);

  useEffect(() => () => texture.dispose(), [texture]);

  // gentle pulse so the dominance regions read as live signal, not paint
  useFrame(({ clock }) => {
    const m = matRef.current;
    if (m) m.opacity = 0.72 + 0.08 * Math.sin(clock.elapsedTime * 0.9);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} visible={visible}>
      <planeGeometry args={[FIELD_HALF * 2, FIELD_HALF * 2]} />
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={0.72}
        blending={THREE.NormalBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
