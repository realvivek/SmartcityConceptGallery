"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import {
  type Building,
  RF_COLORS,
  mulberry32,
  setInstance,
} from "@/lib/three-utils";

interface CityBuildingsProps {
  buildings: Building[];
  /** Base tint; instances get subtle per-building variation. */
  color?: string;
  opacity?: number;
  castShadow?: boolean;
}

/**
 * Instanced extruded-box city. One draw call regardless of building count.
 * Buildings get a subtle height-based tint so towers read against low blocks.
 */
export function CityBuildings({
  buildings,
  color = RF_COLORS.building,
  opacity = 1,
  castShadow = true,
}: CityBuildingsProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const base = new THREE.Color(color);
    const edge = new THREE.Color(RF_COLORS.buildingEdge);
    const tint = new THREE.Color();
    const rand = mulberry32(7);

    buildings.forEach((b, i) => {
      setInstance(mesh, i, [b.x, b.height / 2, b.z], [b.width, b.height, b.depth]);
      const heightMix = Math.min(b.height / 70, 1) * 0.45;
      tint.copy(base).lerp(edge, heightMix + rand() * 0.12);
      mesh.setColorAt(i, tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [buildings, color]);

  if (buildings.length === 0) return null;

  return (
    <instancedMesh
      key={buildings.length}
      ref={ref}
      args={[undefined, undefined, buildings.length]}
      castShadow={castShadow}
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.88}
        metalness={0.18}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </instancedMesh>
  );
}
