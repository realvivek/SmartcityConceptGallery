"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { damp, degToRad, signalRampColor } from "@/lib/three-utils";
import {
  FLOOR_DB,
  PHASE_CENTRE_Y,
  panelGainDb,
  radiusForDb,
} from "./pattern";

const AZ_STEPS = 140; // full 360° sweep
const EL_SPAN = 160; // -80..+80° elevation
const EL_STEPS = 60;

interface PatternSurfaceProps {
  /** Boresight azimuth (degrees, 0 = along the canyon +Z). */
  azimuthDeg: number;
  downtiltDeg: number;
  hBWDeg: number;
  vBWDeg: number;
  /** Peak surface radius in metres. */
  maxRadius: number;
  /** Radius ∝ field amplitude instead of dB above floor. */
  linearScale: boolean;
}

/**
 * The datasheet shape in 3D: a parametric surface over
 * (azimuth × elevation) where distance from the phase centre encodes
 * gain in that direction. Geometry is built with boresight along local
 * +Z and rebuilds only on beamwidth / tilt / scale changes — the
 * azimuth control just rotates the group (damped in useFrame).
 */
export function PatternSurface({
  azimuthDeg,
  downtiltDeg,
  hBWDeg,
  vBWDeg,
  maxRadius,
  linearScale,
}: PatternSurfaceProps) {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const azCount = AZ_STEPS + 1;
    const elCount = EL_STEPS + 1;
    const positions = new Float32Array(azCount * elCount * 3);
    const colors = new Float32Array(azCount * elCount * 3);
    const color = new THREE.Color();

    for (let ei = 0; ei < elCount; ei++) {
      const el = -EL_SPAN / 2 + (EL_SPAN * ei) / EL_STEPS; // degrees
      for (let ai = 0; ai < azCount; ai++) {
        const az = -180 + (360 * ai) / AZ_STEPS; // degrees, local frame
        const g = panelGainDb(az, el, hBWDeg, vBWDeg, downtiltDeg);
        const norm = (g - FLOOR_DB) / -FLOOR_DB; // 0..1, dB above floor
        const r = radiusForDb(g, maxRadius, linearScale);

        const azRad = degToRad(az);
        const elRad = degToRad(el);
        const idx = (ei * azCount + ai) * 3;
        positions[idx] = Math.sin(azRad) * Math.cos(elRad) * r;
        positions[idx + 1] = Math.sin(elRad) * r;
        positions[idx + 2] = Math.cos(azRad) * Math.cos(elRad) * r;

        signalRampColor(norm, color);
        // brighten the hottest core so bloom blooms
        color.multiplyScalar(0.35 + 1.5 * Math.pow(norm, 2.4));
        colors[idx] = color.r;
        colors[idx + 1] = color.g;
        colors[idx + 2] = color.b;
      }
    }

    const indices: number[] = [];
    for (let ei = 0; ei < EL_STEPS; ei++) {
      for (let ai = 0; ai < AZ_STEPS; ai++) {
        const a = ei * azCount + ai;
        const b = a + 1;
        const c = a + azCount;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    return geo;
  }, [downtiltDeg, hBWDeg, vBWDeg, maxRadius, linearScale]);

  // Damped rotation toward the azimuth control + gentle breathing so
  // the energy volume feels alive under bloom. Refs only — no setState.
  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y = damp(g.rotation.y, degToRad(azimuthDeg), 6, delta);
    const s = 1 + Math.sin(clock.elapsedTime * 1.3) * 0.011;
    g.scale.setScalar(s);
  });

  return (
    <group ref={groupRef} position={[0, PHASE_CENTRE_Y, 0]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.34}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* faint structural wireframe for an engineering read */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          wireframe
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
