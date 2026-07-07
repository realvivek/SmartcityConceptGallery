"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  arrayFactorDb,
  degToRad,
  signalRampColor,
} from "@/lib/three-utils";

const FLOOR_DB = -30;
const AZ_SPAN = 178; // front half-space, degrees
const AZ_STEPS = 120;
const EL_SPAN = 44;
const EL_STEPS = 26;

interface BeamLobeProps {
  elements: number;
  spacingLambda: number;
  steerDeg: number;
  /** Antenna phase-centre height (m). */
  height: number;
  /** Peak lobe radius in metres. */
  maxRadius?: number;
  /** Vertical half-power beamwidth in degrees. */
  verticalBeamwidthDeg?: number;
  /** Also paint the pattern footprint on the ground. */
  groundFootprint?: boolean;
}

/**
 * Volumetric-looking radiation lobe: a parametric surface over
 * (azimuth × elevation) where radius encodes log-scaled array gain.
 * Vertex-coloured with the shared signal ramp; additive so bloom
 * picks it up as a glowing energy volume.
 */
export function BeamLobe({
  elements,
  spacingLambda,
  steerDeg,
  height,
  maxRadius = 52,
  verticalBeamwidthDeg = 14,
  groundFootprint = true,
}: BeamLobeProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { geometry, footprintGeometry } = useMemo(() => {
    const azCount = AZ_STEPS + 1;
    const elCount = EL_STEPS + 1;
    const positions = new Float32Array(azCount * elCount * 3);
    const colors = new Float32Array(azCount * elCount * 3);
    const color = new THREE.Color();
    const pale = new THREE.Color("#e7edf6"); // scene sky tint

    // Slight electrical downtilt so the lobe reads as street-serving.
    const downtiltDeg = 4;

    for (let ei = 0; ei < elCount; ei++) {
      const el = -EL_SPAN / 2 + (EL_SPAN * ei) / EL_STEPS; // degrees
      // Gaussian-ish vertical pattern in dB
      const vDb = -12 * Math.pow(el / verticalBeamwidthDeg, 2);
      for (let ai = 0; ai < azCount; ai++) {
        const az = -AZ_SPAN / 2 + (AZ_SPAN * ai) / AZ_STEPS; // degrees
        const hDb = arrayFactorDb(elements, spacingLambda, steerDeg, az, FLOOR_DB);
        const totalDb = Math.max(hDb + vDb, FLOOR_DB);
        const norm = (totalDb - FLOOR_DB) / -FLOOR_DB; // 0..1, log-scaled
        const r = maxRadius * norm;

        const azRad = degToRad(az);
        const elRad = degToRad(el - downtiltDeg);
        const idx = (ei * azCount + ai) * 3;
        positions[idx] = Math.sin(azRad) * Math.cos(elRad) * r;
        positions[idx + 1] = Math.sin(elRad) * r;
        positions[idx + 2] = Math.cos(azRad) * Math.cos(elRad) * r;

        signalRampColor(norm, color);
        // weak regions dissolve into the sky; the core stays ink-dense
        color.lerp(pale, 0.85 * Math.pow(1 - norm, 1.6));
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

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    // Ground footprint: horizontal pattern as a flat fan of triangles.
    const fpPositions: number[] = [];
    const fpColors: number[] = [];
    for (let ai = 0; ai < AZ_STEPS; ai++) {
      const az0 = -AZ_SPAN / 2 + (AZ_SPAN * ai) / AZ_STEPS;
      const az1 = -AZ_SPAN / 2 + (AZ_SPAN * (ai + 1)) / AZ_STEPS;
      for (const [azA, azB] of [[az0, az1]] as const) {
        const dbA = arrayFactorDb(elements, spacingLambda, steerDeg, azA, FLOOR_DB);
        const dbB = arrayFactorDb(elements, spacingLambda, steerDeg, azB, FLOOR_DB);
        const rA = (maxRadius * (dbA - FLOOR_DB)) / -FLOOR_DB;
        const rB = (maxRadius * (dbB - FLOOR_DB)) / -FLOOR_DB;
        const nA = (dbA - FLOOR_DB) / -FLOOR_DB;
        const nB = (dbB - FLOOR_DB) / -FLOOR_DB;
        fpPositions.push(0, 0, 0);
        fpPositions.push(Math.sin(degToRad(azA)) * rA, 0, Math.cos(degToRad(azA)) * rA);
        fpPositions.push(Math.sin(degToRad(azB)) * rB, 0, Math.cos(degToRad(azB)) * rB);
        for (const n of [Math.max(nA, nB) * 0.6, nA, nB]) {
          signalRampColor(n, color);
          color.lerp(pale, 0.8 * (1 - n));
          fpColors.push(color.r, color.g, color.b);
        }
      }
    }
    const footprintGeometry = new THREE.BufferGeometry();
    footprintGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(fpPositions), 3)
    );
    footprintGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(fpColors), 3)
    );
    return { geometry, footprintGeometry };
  }, [elements, spacingLambda, steerDeg, maxRadius, verticalBeamwidthDeg]);

  // Gentle breathing so the energy volume feels alive under bloom.
  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const s = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.012;
    g.scale.setScalar(s);
  });

  return (
    <group>
      <group ref={groupRef} position={[0, height, 0]}>
        <mesh geometry={geometry}>
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={0.52}
            side={THREE.DoubleSide}
            blending={THREE.NormalBlending}
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
            opacity={0.12}
            blending={THREE.NormalBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      {groundFootprint && (
        <mesh geometry={footprintGeometry} position={[0, 0.12, 0]}>
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={0.4}
            blending={THREE.NormalBlending}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
