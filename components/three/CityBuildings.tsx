"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
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
  /** Procedural window façades (world-space grid, per-cell variation). */
  windows?: boolean;
}

/**
 * Build the façade material once: a standard material whose fragment
 * stage stamps a world-space window grid onto vertical faces. Windows
 * are sized in metres (floors every 3 m, bays every 2.6 m) so they stay
 * believable on every building regardless of instance scale, with a
 * per-cell hash driving glass tone variation.
 */
function makeFacadeMaterial(withWindows: boolean, transparent: boolean, opacity: number) {
  const material = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.88,
    metalness: 0.05,
    transparent,
    opacity,
  });
  if (!withWindows) return material;

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vFacadePos;
        varying vec3 vFacadeNormal;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec4 fwp = modelMatrix * instanceMatrix * vec4(position, 1.0);
          #else
            vec4 fwp = modelMatrix * vec4(position, 1.0);
          #endif
          vFacadePos = fwp.xyz;
          // buildings are axis-aligned, unrotated boxes → object normal
          // already points along a world axis.
          vFacadeNormal = normal;
        }`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vFacadePos;
        varying vec3 vFacadeNormal;
        float facadeHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec3 fn = normalize(vFacadeNormal);
          float isWall = step(abs(fn.y), 0.5);
          // pick the axis running along this façade
          float u = abs(fn.x) > abs(fn.z) ? vFacadePos.z : vFacadePos.x;
          float v = vFacadePos.y;
          vec2 cell = vec2(u / 2.6, v / 3.0);
          vec2 f = fract(cell);
          float win =
            step(0.16, f.x) * step(f.x, 0.84) *
            step(0.28, f.y) * step(f.y, 0.82);
          // no windows on the ground floor strip or right at parapets
          win *= step(2.2, v);
          float rnd = facadeHash(floor(cell) + floor(vFacadePos.xz * 0.001));
          vec3 glassDeep = vec3(0.30, 0.38, 0.50);
          vec3 glassSky = vec3(0.62, 0.72, 0.84);
          vec3 glass = mix(glassDeep, glassSky, rnd);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * isWall * 0.9);
        }`
      );
  };
  // distinct program per windows-variant so three.js doesn't reuse the
  // non-injected shader from the cache
  material.customProgramCacheKey = () => "facade-windows-v1";
  return material;
}

/**
 * Instanced extruded-box city. One draw call regardless of building
 * count, with subtle height-based tinting and procedural window façades.
 */
export function CityBuildings({
  buildings,
  color = RF_COLORS.building,
  opacity = 1,
  castShadow = true,
  windows = true,
}: CityBuildingsProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const material = useMemo(
    () => makeFacadeMaterial(windows, opacity < 1, opacity),
    [windows, opacity]
  );

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
      material={material}
      castShadow={castShadow}
      receiveShadow
    >
      <boxGeometry />
    </instancedMesh>
  );
}
