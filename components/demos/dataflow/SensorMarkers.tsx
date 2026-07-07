"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { qualityColor } from "@/lib/three-utils";
import { latencyQuality } from "./FlowStreams";

/** A placed sensor plus the latency of its uplink stream. */
export interface SensorEntry {
  id: string;
  x: number;
  z: number;
  latencyMs: number;
}

interface SensorMarkersProps {
  sensors: SensorEntry[];
  onRemove: (id: string) => void;
}

/**
 * Street-level IoT sensors: small glowing spheres on stub pedestals.
 * Emissive intensity breathes via refs (no per-frame setState) and the
 * sphere colour tracks the latency quality of the sensor's uplink.
 * Clicking a sensor removes it.
 */
export function SensorMarkers({ sensors, onRemove }: SensorMarkersProps) {
  const materials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < sensors.length; i++) {
      const mat = materials.current[i];
      if (!mat) continue;
      mat.emissiveIntensity = 1.35 + Math.sin(t * 2.2 + i * 1.7) * 0.55;
    }
  });

  return (
    <group>
      {sensors.map((sensor, i) => {
        const hex = `#${qualityColor(latencyQuality(sensor.latencyMs)).getHexString()}`;
        return (
          <group key={sensor.id} position={[sensor.x, 0, sensor.z]}>
            {/* pedestal */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.14, 0.6, 8]} />
              <meshStandardMaterial
                color="#233a5c"
                roughness={0.5}
                metalness={0.7}
              />
            </mesh>
            {/* glowing sensor head — click to remove */}
            <mesh
              position={[0, 0.95, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(sensor.id);
              }}
              castShadow
            >
              <sphereGeometry args={[0.42, 20, 16]} />
              <meshStandardMaterial
                ref={(m) => {
                  materials.current[i] = m;
                }}
                color={hex}
                emissive={hex}
                emissiveIntensity={1.4}
                toneMapped={false}
              />
            </mesh>
            {/* ground halo */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
              <ringGeometry args={[0.65, 0.95, 28]} />
              <meshBasicMaterial
                color={hex}
                transparent
                opacity={0.45}
                blending={THREE.NormalBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
