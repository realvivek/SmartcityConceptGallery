"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { RF_COLORS, degToRad } from "@/lib/three-utils";
import { PHASE_CENTRE_Y, radiusForDb } from "./pattern";

/** dB levels marked by the rings, outermost → innermost. */
const RING_LEVELS_DB = [-10, -20, -28];
/** Chip azimuths (deg) — spread so labels never stack, even when the
 *  linear scale squeezes the inner rings together. */
const CHIP_AZIMUTHS_DEG = [38, 58, 78];
const MIN_RADIUS = 1.4;

interface GainRingsProps {
  maxRadius: number;
  linearScale: boolean;
}

/**
 * Polar-plot gridlines lifted into 3D: faint horizontal rings at the
 * -10 / -20 / -28 dB radii of the active gain scale, each with a
 * monospace chip label — the scale legend for the pattern surface.
 */
export function GainRings({ maxRadius, linearScale }: GainRingsProps) {
  const rings = useMemo(
    () =>
      RING_LEVELS_DB.map((db, i) => {
        const radius = Math.max(
          radiusForDb(db, maxRadius, linearScale),
          MIN_RADIUS
        );
        const az = degToRad(CHIP_AZIMUTHS_DEG[i]);
        return {
          db,
          radius,
          chip: [
            Math.sin(az) * radius,
            PHASE_CENTRE_Y + 0.55 + i * 0.55,
            Math.cos(az) * radius,
          ] as [number, number, number],
        };
      }),
    [maxRadius, linearScale]
  );

  return (
    <group>
      {rings.map(({ db, radius, chip }) => (
        <group key={db}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, PHASE_CENTRE_Y, 0]}
          >
            <ringGeometry args={[radius - 0.12, radius + 0.12, 96]} />
            <meshBasicMaterial
              color={RF_COLORS.emerald}
              transparent
              opacity={0.5}
              blending={THREE.NormalBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <Html
            position={chip}
            center
            distanceFactor={42}
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                color: "#0f766e",
                background: "rgba(253, 252, 247, 0.94)",
                padding: "2px 6px",
                borderRadius: 2,
                border: "1px solid rgba(15, 157, 143, 0.55)",
                boxShadow: "2px 2px 0 rgba(36, 52, 77, 0.18)",
                whiteSpace: "nowrap",
              }}
            >
              {db} dB
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
