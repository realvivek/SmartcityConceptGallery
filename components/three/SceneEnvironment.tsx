"use client";

import { Grid } from "@react-three/drei";
import { RF_COLORS } from "@/lib/three-utils";

/**
 * Shared day-lit rig: warm sun with soft shadows, cool sky bounce,
 * and a violet kicker so signal geometry separates from architecture.
 */
export function CityLighting({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <ambientLight intensity={0.5 * intensity} color="#e8eeff" />
      <hemisphereLight
        intensity={0.55 * intensity}
        color="#dbe7ff"
        groundColor="#efe9da"
      />
      <directionalLight
        position={[70, 90, 45]}
        intensity={1.9 * intensity}
        color="#fff2df"
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
        color="#c7bfff"
      />
    </>
  );
}

/** Shared ground: warm paper plane + blueprint drafting grid. */
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
          metalness={0.02}
        />
      </mesh>
      {grid && (
        <Grid
          position={[0, 0.02, 0]}
          args={[size, size]}
          cellSize={10}
          cellThickness={0.5}
          cellColor="#c0cbde"
          sectionSize={50}
          sectionThickness={1}
          sectionColor="#93a5c4"
          fadeDistance={280}
          fadeStrength={1.2}
          followCamera={false}
          infiniteGrid={false}
        />
      )}
    </group>
  );
}
