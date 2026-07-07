"use client";

import { Grid } from "@react-three/drei";
import { RF_COLORS } from "@/lib/three-utils";

/** Shared lighting rig: cool key light with shadows + purple fill + hemisphere. */
export function CityLighting({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <ambientLight intensity={0.22 * intensity} color="#8fb3e8" />
      <hemisphereLight
        intensity={0.35 * intensity}
        color="#3d5a8f"
        groundColor="#0a1428"
      />
      <directionalLight
        position={[70, 90, 45]}
        intensity={1.25 * intensity}
        color="#cfe0ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={320}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-bias={-0.0004}
      />
      <directionalLight
        position={[-60, 40, -70]}
        intensity={0.35 * intensity}
        color={RF_COLORS.purple}
      />
    </>
  );
}

/** Shared ground: dark plane + fading engineering grid. */
export function GroundPlane({
  size = 600,
  grid = true,
}: {
  size?: number;
  grid?: boolean;
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color={RF_COLORS.ground}
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
      {grid && (
        <Grid
          position={[0, 0.02, 0]}
          args={[size, size]}
          cellSize={10}
          cellThickness={0.5}
          cellColor="#1a2c4d"
          sectionSize={50}
          sectionThickness={1}
          sectionColor="#27406b"
          fadeDistance={280}
          fadeStrength={1.2}
          followCamera={false}
          infiniteGrid={false}
        />
      )}
    </group>
  );
}
