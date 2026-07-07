"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { StreetField } from "./pattern";

/**
 * Street energy stripe: a vertex-coloured grid over the canyon floor
 * showing delivered power (EIRP + pattern gain − FSPL). Weak samples
 * are pre-faded to black in the field data, so additive blending makes
 * them vanish. A slow opacity breathe keeps the street feeling live.
 */
export function StreetFootprint({ field }: { field: StreetField }) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(field.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(field.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(field.indices, 1));
    return geo;
  }, [field]);

  useFrame(({ clock }) => {
    const m = materialRef.current;
    if (!m) return;
    m.opacity = 0.5 + Math.sin(clock.elapsedTime * 1.6) * 0.07;
  });

  return (
    <mesh geometry={geometry} position={[0, 0.1, 0]}>
      <meshBasicMaterial
        ref={materialRef}
        vertexColors
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
