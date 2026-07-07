"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RF_COLORS, clamp, radToDeg } from "@/lib/three-utils";
import { PoleWithAntenna } from "@/components/three/PoleWithAntenna";
import { type ActiveCell } from "./coverage-model";

const PULSE_SECONDS = 1.8;
const PULSE_RADIUS = 30;
const GROW_SECONDS = 0.5;

interface CellMarkersProps {
  cells: ActiveCell[];
  onRemove: (id: string) => void;
}

/** All active cell sites: pole + glowing base ring + activation pulse. */
export function CellMarkers({ cells, onRemove }: CellMarkersProps) {
  return (
    <group>
      {cells.map((cell) => (
        <CellMarker key={cell.id} cell={cell} onRemove={onRemove} />
      ))}
    </group>
  );
}

function CellMarker({
  cell,
  onRemove,
}: {
  cell: ActiveCell;
  onRemove: (id: string) => void;
}) {
  const growRef = useRef<THREE.Group>(null);
  const baseRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Panels face downtown; deterministic per position.
  const headingDeg = radToDeg(Math.atan2(-cell.x, -cell.z));
  const baseRadius = cell.macro ? 2.1 : 1.7;
  const phase = cell.x * 0.37 + cell.z * 0.71;

  useFrame(({ clock }) => {
    const elapsed = (performance.now() - cell.activatedAt) / 1000;

    // Pole grows out of the ground when the cell switches on.
    const grow = growRef.current;
    if (grow) {
      const t = clamp(elapsed / GROW_SECONDS, 0.001, 1);
      grow.scale.y = 1 - (1 - t) ** 3;
    }

    // Expanding ring pulse right after activation.
    const pulse = pulseRef.current;
    const pulseMat = pulseMatRef.current;
    if (pulse && pulseMat) {
      const t = elapsed / PULSE_SECONDS;
      if (t < 0 || t >= 1) {
        pulse.visible = false;
      } else {
        pulse.visible = true;
        const ease = 1 - (1 - t) ** 3;
        const s = 1 + ease * PULSE_RADIUS;
        pulse.scale.set(s, s, 1);
        pulseMat.opacity = 0.5 * (1 - t);
      }
    }

    // Base ring breathes gently so live sites read as energized.
    const base = baseRef.current;
    if (base) {
      const s = 1 + 0.07 * Math.sin(clock.elapsedTime * 2.1 + phase);
      base.scale.set(s, s, 1);
    }
  });

  return (
    <group
      position={[cell.x, 0, cell.z]}
      onClick={(e) => {
        if (e.delta > 5) return; // ignore orbit drags
        e.stopPropagation();
        if (cell.custom) onRemove(cell.id);
      }}
    >
      <group ref={growRef} scale={[1, 0.001, 1]}>
        <PoleWithAntenna
          height={cell.poleHeight}
          headingDeg={headingDeg}
          accent={RF_COLORS.cyan}
          luminaire={!cell.macro}
          detailed={cell.macro}
        />
      </group>
      {/* glowing base ring */}
      <mesh ref={baseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[baseRadius * 0.72, baseRadius, 40]} />
        <meshBasicMaterial
          color={RF_COLORS.cyan}
          transparent
          opacity={cell.custom ? 0.62 : 0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* expanding activation pulse */}
      <mesh
        ref={pulseRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
        visible={false}
      >
        <ringGeometry args={[0.93, 1, 64]} />
        <meshBasicMaterial
          ref={pulseMatRef}
          color={RF_COLORS.cyan}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
