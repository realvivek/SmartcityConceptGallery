"use client";

import { type ReactNode, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { RF_COLORS } from "@/lib/three-utils";
import { Clouds } from "@/components/three/Clouds";

interface DemoCanvasProps {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
  /** Orbit target. */
  target?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  /** Max polar angle in radians — default keeps the camera above the ground. */
  maxPolarAngle?: number;
  enablePan?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  fog?: { near: number; far: number; color?: string } | false;
  /** Drifting sprite clouds under the sky dome. */
  clouds?: boolean;
  className?: string;
}

/**
 * Shared Canvas wrapper for all demos: navy background, tuned fog,
 * damped OrbitControls with sensible limits, and preserveDrawingBuffer
 * so the shell's screenshot button works.
 */
export function DemoCanvas({
  children,
  cameraPosition = [70, 55, 70],
  fov = 45,
  target = [0, 0, 0],
  minDistance = 20,
  maxDistance = 260,
  maxPolarAngle = Math.PI * 0.47,
  enablePan = true,
  autoRotate = false,
  autoRotateSpeed = 0.4,
  fog = { near: 120, far: 420 },
  clouds = true,
  className,
}: DemoCanvasProps) {
  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      }}
      camera={{ position: cameraPosition, fov, near: 0.5, far: 900 }}
    >
      <color attach="background" args={[RF_COLORS.navy]} />
      {fog !== false && (
        <fog
          attach="fog"
          args={[fog.color ?? RF_COLORS.navy, fog.near, fog.far]}
        />
      )}
      {/* procedural morning sky — matches the sun in CityLighting */}
      <Sky
        distance={2000}
        sunPosition={[70, 55, 45]}
        turbidity={6}
        rayleigh={0.35}
        mieCoefficient={0.004}
        mieDirectionalG={0.85}
      />
      {clouds && <Clouds />}
      <Suspense fallback={null}>{children}</Suspense>
      <OrbitControls
        makeDefault
        target={target}
        enableDamping
        dampingFactor={0.08}
        minDistance={minDistance}
        maxDistance={maxDistance}
        maxPolarAngle={maxPolarAngle}
        enablePan={enablePan}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
      />
    </Canvas>
  );
}
