"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import {
  type Building,
  arrayFactorDb,
  countObstructions,
  fsplDb,
  qualityColor,
  radToDeg,
} from "@/lib/three-utils";

export interface UE {
  id: number;
  x: number;
  z: number;
}

interface UEMarkersProps {
  ues: UE[];
  buildings: Building[];
  antennaPos: THREE.Vector3;
  elements: number;
  spacingLambda: number;
  steerDeg: number;
  txPowerDbm: number;
  freqGHz: number;
  onRemove: (id: number) => void;
}

const UE_HEIGHT = 1.5;
const GOOD_DBM = -65;
const BAD_DBM = -110;

/** Compute simplified link budget for one UE. */
function linkBudget(
  ue: UE,
  antennaPos: THREE.Vector3,
  buildings: Building[],
  elements: number,
  spacingLambda: number,
  steerDeg: number,
  txPowerDbm: number,
  freqGHz: number
) {
  const uePos = new THREE.Vector3(ue.x, UE_HEIGHT, ue.z);
  const azimuthDeg = radToDeg(
    Math.atan2(ue.x - antennaPos.x, ue.z - antennaPos.z)
  );
  const gainDb = arrayFactorDb(elements, spacingLambda, steerDeg, azimuthDeg);
  const arrayGainDb = 10 * Math.log10(elements);
  const dist = uePos.distanceTo(antennaPos);
  const obstructions = countObstructions(antennaPos, uePos, buildings);
  const rx =
    txPowerDbm +
    arrayGainDb +
    gainDb -
    fsplDb(dist, freqGHz) -
    obstructions * 18;
  return { uePos, rx, dist, obstructions, azimuthDeg };
}

/**
 * User terminals: colour + floating chip showing simplified received
 * power (array gain toward the UE − FSPL − building penetration).
 */
export function UEMarkers({
  ues,
  buildings,
  antennaPos,
  elements,
  spacingLambda,
  steerDeg,
  txPowerDbm,
  freqGHz,
  onRemove,
}: UEMarkersProps) {
  const budgets = useMemo(
    () =>
      ues.map((ue) => ({
        ue,
        ...linkBudget(
          ue,
          antennaPos,
          buildings,
          elements,
          spacingLambda,
          steerDeg,
          txPowerDbm,
          freqGHz
        ),
      })),
    [
      ues,
      antennaPos,
      buildings,
      elements,
      spacingLambda,
      steerDeg,
      txPowerDbm,
      freqGHz,
    ]
  );

  return (
    <group>
      {budgets.map(({ ue, uePos, rx, obstructions }) => {
        const t = THREE.MathUtils.clamp(
          (rx - BAD_DBM) / (GOOD_DBM - BAD_DBM),
          0,
          1
        );
        const color = `#${qualityColor(t).getHexString()}`;
        return (
          <group key={ue.id} position={[uePos.x, 0, uePos.z]}>
            {/* body */}
            <mesh
              position={[0, UE_HEIGHT, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(ue.id);
              }}
              castShadow
            >
              <capsuleGeometry args={[0.45, 1.1, 4, 12]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1.4}
                toneMapped={false}
              />
            </mesh>
            {/* ground halo */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
              <ringGeometry args={[0.8, 1.15, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.55}
                blending={THREE.NormalBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {/* readout chip */}
            <Html
              position={[0, 3.4, 0]}
              center
              distanceFactor={55}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  background: "rgba(253, 252, 247, 0.94)",
                  border: `1px solid ${color}`,
                  borderRadius: 2,
                  padding: "3px 8px",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  color,
                  whiteSpace: "nowrap",
                  boxShadow: "2px 2px 0 rgba(36, 52, 77, 0.18)",
                }}
              >
                {rx.toFixed(0)} dBm
                {obstructions > 0 ? ` · ${obstructions}✕ blocked` : ""}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
