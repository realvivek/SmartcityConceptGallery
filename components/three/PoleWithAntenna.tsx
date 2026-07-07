"use client";

import * as THREE from "three";
import { RF_COLORS } from "@/lib/three-utils";

interface PoleWithAntennaProps {
  position?: [number, number, number];
  height?: number;
  /** Azimuth the antenna panel faces, degrees (0 = +Z). */
  headingDeg?: number;
  accent?: string;
  /** Show the luminaire arm (streetlight variant). */
  luminaire?: boolean;
  detailed?: boolean;
}

/**
 * Streetlight pole with a shrouded small-cell antenna at the top.
 * The emissive strip marks the panel's radiating face.
 */
export function PoleWithAntenna({
  position = [0, 0, 0],
  height = 8,
  headingDeg = 0,
  accent = RF_COLORS.blue,
  luminaire = true,
  detailed = false,
}: PoleWithAntennaProps) {
  const heading = THREE.MathUtils.degToRad(headingDeg);

  return (
    <group position={position} rotation={[0, heading, 0]}>
      {/* base */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.5, 16]} />
        <meshStandardMaterial color="#1c2c47" roughness={0.6} metalness={0.6} />
      </mesh>
      {/* pole */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, height, 12]} />
        <meshStandardMaterial color="#233a5c" roughness={0.45} metalness={0.75} />
      </mesh>
      {/* luminaire arm + head */}
      {luminaire && (
        <group position={[0, height * 0.92, 0]}>
          <mesh position={[0, 0, 1.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 2.2, 8]} />
            <meshStandardMaterial color="#233a5c" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.08, 2.2]} castShadow>
            <boxGeometry args={[0.5, 0.14, 1]} />
            <meshStandardMaterial color="#2b4568" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.17, 2.2]}>
            <boxGeometry args={[0.4, 0.04, 0.85]} />
            <meshStandardMaterial
              color="#ffe6b3"
              emissive="#ffcf80"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      )}
      {/* small-cell shroud */}
      <group position={[0, height + 0.75, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.38, 0.42, 1.5, detailed ? 24 : 14]} />
          <meshStandardMaterial color="#2b4568" roughness={0.35} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.3, 0.38, 0.12, detailed ? 24 : 14]} />
          <meshStandardMaterial color="#1c2c47" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* radiating face strip */}
        <mesh position={[0, 0, 0.41]}>
          <boxGeometry args={[0.34, 1.15, 0.05]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
        {/* status LED ring */}
        <mesh position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.03, 8, 32]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
        {detailed && (
          <>
            {/* mounting brackets + cable run for close-up scenes */}
            <mesh position={[0, -0.55, -0.3]} castShadow>
              <boxGeometry args={[0.5, 0.1, 0.25]} />
              <meshStandardMaterial color="#1c2c47" roughness={0.5} metalness={0.7} />
            </mesh>
            <mesh position={[0, -1.4, -0.22]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 1.6, 8]} />
              <meshStandardMaterial color="#101c31" roughness={0.8} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}
