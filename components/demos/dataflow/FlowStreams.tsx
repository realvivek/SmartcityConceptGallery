"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { clamp, makeArcCurve, qualityColor } from "@/lib/three-utils";

/** One sensor→edge uplink. */
export interface Stream {
  id: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
  latencyMs: number;
}

/** Latency (ms) → normalized quality (1 = fast/cyan, 0 = congested/rose). */
export const LATENCY_GOOD_MS = 0.4;
export const LATENCY_BAD_MS = 5;

export function latencyQuality(latMs: number): number {
  return clamp(
    1 - (latMs - LATENCY_GOOD_MS) / (LATENCY_BAD_MS - LATENCY_GOOD_MS),
    0,
    1
  );
}

const ARC_LIFT = 7;
/** Interpolation table resolution per arc (segments). */
const CURVE_SAMPLES = 40;
const PARTICLES_PER_STREAM = 6;
const LINE_SEGMENTS = 36;

interface FlowStreamsProps {
  streams: Stream[];
  showLinks: boolean;
}

/**
 * All sensor→edge uplinks: faint additive arc lines plus ONE shared
 * THREE.Points cloud of flowing "packets". Per-particle progress is
 * advanced in useFrame against a precomputed arc sample table, so the
 * hot loop is pure Float32Array math — no allocations, no setState.
 * Packet speed falls with latency; colour encodes latency quality.
 */
export function FlowStreams({ streams, showLinks }: FlowStreamsProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const n = streams.length;
    const table = new Float32Array(n * (CURVE_SAMPLES + 1) * 3);
    const speeds = new Float32Array(n);
    const particleCount = n * PARTICLES_PER_STREAM;
    const pPos = new Float32Array(particleCount * 3);
    const pCol = new Float32Array(particleCount * 3);
    const pOff = new Float32Array(particleCount);
    const lPos = new Float32Array(n * LINE_SEGMENTS * 2 * 3);
    const lCol = new Float32Array(n * LINE_SEGMENTS * 2 * 3);
    const color = new THREE.Color();

    streams.forEach((s, i) => {
      const curve = makeArcCurve(s.from, s.to, ARC_LIFT);
      const pts = curve.getPoints(CURVE_SAMPLES);
      for (let k = 0; k <= CURVE_SAMPLES; k++) {
        const idx = (i * (CURVE_SAMPLES + 1) + k) * 3;
        table[idx] = pts[k].x;
        table[idx + 1] = pts[k].y;
        table[idx + 2] = pts[k].z;
      }

      // low latency → fast packets; congested links visibly crawl
      speeds[i] = clamp(2.4 / (s.latencyMs + 0.6), 0.18, 2.2);
      qualityColor(latencyQuality(s.latencyMs), color);

      for (let p = 0; p < PARTICLES_PER_STREAM; p++) {
        const pi = i * PARTICLES_PER_STREAM + p;
        // golden-ratio stagger so streams never pulse in lockstep
        pOff[pi] = (p / PARTICLES_PER_STREAM + i * 0.61803) % 1;
        // over-bright so bloom reads packets as energy
        pCol[pi * 3] = color.r * 1.8;
        pCol[pi * 3 + 1] = color.g * 1.8;
        pCol[pi * 3 + 2] = color.b * 1.8;
        // seed on the arc so frame 0 has no origin flash
        const k0 = Math.min(
          Math.floor(pOff[pi] * CURVE_SAMPLES),
          CURVE_SAMPLES - 1
        );
        const ti = (i * (CURVE_SAMPLES + 1) + k0) * 3;
        pPos[pi * 3] = table[ti];
        pPos[pi * 3 + 1] = table[ti + 1];
        pPos[pi * 3 + 2] = table[ti + 2];
      }

      // faint arc line, brightening sensor→node to hint at data direction
      const linePts = curve.getPoints(LINE_SEGMENTS);
      for (let k = 0; k < LINE_SEGMENTS; k++) {
        const a = linePts[k];
        const b = linePts[k + 1];
        const base = (i * LINE_SEGMENTS + k) * 6;
        lPos[base] = a.x;
        lPos[base + 1] = a.y;
        lPos[base + 2] = a.z;
        lPos[base + 3] = b.x;
        lPos[base + 4] = b.y;
        lPos[base + 5] = b.z;
        const fadeA = 0.3 + 0.5 * (k / LINE_SEGMENTS);
        const fadeB = 0.3 + 0.5 * ((k + 1) / LINE_SEGMENTS);
        lCol[base] = color.r * fadeA;
        lCol[base + 1] = color.g * fadeA;
        lCol[base + 2] = color.b * fadeA;
        lCol[base + 3] = color.r * fadeB;
        lCol[base + 4] = color.g * fadeB;
        lCol[base + 5] = color.b * fadeB;
      }
    });

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(lCol, 3));

    return { table, speeds, pOff, pointsGeometry, lineGeometry, count: n };
  }, [streams]);

  // dispose superseded geometry (slider drags rebuild it frequently)
  useEffect(() => {
    const { pointsGeometry, lineGeometry } = data;
    return () => {
      pointsGeometry.dispose();
      lineGeometry.dispose();
    };
  }, [data]);

  useFrame(({ clock }) => {
    if (data.count === 0 || !pointsRef.current) return;
    const { table, speeds, pOff, pointsGeometry, count } = data;
    const attr = pointsGeometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const speed = speeds[i];
      const rowBase = i * (CURVE_SAMPLES + 1);
      for (let p = 0; p < PARTICLES_PER_STREAM; p++) {
        const pi = i * PARTICLES_PER_STREAM + p;
        const progress = (pOff[pi] + t * speed) % 1;
        const f = progress * CURVE_SAMPLES;
        const k = Math.min(Math.floor(f), CURVE_SAMPLES - 1);
        const frac = f - k;
        const a = (rowBase + k) * 3;
        const o = pi * 3;
        arr[o] = table[a] + (table[a + 3] - table[a]) * frac;
        arr[o + 1] = table[a + 1] + (table[a + 4] - table[a + 1]) * frac;
        arr[o + 2] = table[a + 2] + (table[a + 5] - table[a + 2]) * frac;
      }
    }
    attr.needsUpdate = true;
  });

  if (data.count === 0) return null;

  return (
    <group>
      {showLinks && (
        <lineSegments key={`links-${data.count}`} geometry={data.lineGeometry}>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.45}
            blending={THREE.NormalBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      )}
      <points
        key={`packets-${data.count}`}
        ref={pointsRef}
        geometry={data.pointsGeometry}
        frustumCulled={false}
      >
        <pointsMaterial
          size={1.15}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.95}
          blending={THREE.NormalBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
