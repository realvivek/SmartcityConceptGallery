"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

const GRID = 96;
const SPACING = 1.35;
const PAPER = "#f7f8fa";

/**
 * Animated ink-dot field: RF wavefronts rippling across a drafting
 * sheet. Dots read as ink on paper — crests flush sky-cyan, troughs
 * settle into blue, edges dissolve into the page.
 */
function WaveField() {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const count = GRID * GRID;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    let i = 0;
    for (let x = 0; x < GRID; x++) {
      for (let z = 0; z < GRID; z++) {
        positions[i * 3] = (x - GRID / 2) * SPACING;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (z - GRID / 2) * SPACING;
        i++;
      }
    }
    return { positions, colors };
  }, []);

  const indigo = useMemo(() => new THREE.Color("#2563eb"), []);
  const violet = useMemo(() => new THREE.Color("#3b82f6"), []);
  const coral = useMemo(() => new THREE.Color("#0ea5e9"), []);
  const paper = useMemo(() => new THREE.Color(PAPER), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    if (!points) return;
    const t = clock.elapsedTime;
    const pos = points.geometry.attributes.position;
    const col = points.geometry.attributes.color;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d1 = Math.hypot(x - 22, z + 12);
      const d2 = Math.hypot(x + 30, z - 20);
      const y =
        Math.sin(d1 * 0.32 - t * 1.6) * 1.15 * Math.exp(-d1 * 0.02) +
        Math.sin(d2 * 0.27 - t * 1.15) * 0.95 * Math.exp(-d2 * 0.022) +
        Math.sin((x + z) * 0.06 + t * 0.35) * 0.35;
      pos.setY(i, y);

      const h = THREE.MathUtils.clamp((y + 1.4) / 2.8, 0, 1);
      tmp.copy(indigo).lerp(violet, h);
      if (h > 0.78) tmp.lerp(coral, (h - 0.78) / 0.22);
      // dissolve into the page toward the edges
      const fade =
        1 - THREE.MathUtils.clamp(Math.hypot(x, z) / (GRID * SPACING * 0.52), 0, 1);
      tmp.lerp(paper, 1 - (0.2 + 0.8 * fade));
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    points.rotation.y = t * 0.015;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.17}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/** Subtle full-bleed hero canvas whose edges dissolve into the page. */
export function HeroBackground() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 26, 52], fov: 42, near: 1, far: 300 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[PAPER]} />
        <fog attach="fog" args={[PAPER, 60, 160]} />
        <WaveField />
      </Canvas>
      {/* fade edges into the page background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />
    </div>
  );
}
