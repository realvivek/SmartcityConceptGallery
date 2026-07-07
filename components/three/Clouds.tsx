"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mulberry32 } from "@/lib/three-utils";

/** Lazily-built soft radial sprite shared by every cloud puff. */
let puffTexture: THREE.Texture | null = null;
function getPuffTexture(): THREE.Texture {
  if (puffTexture) return puffTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  puffTexture = new THREE.CanvasTexture(canvas);
  return puffTexture;
}

interface Puff {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
}

interface CloudCluster {
  x: number;
  y: number;
  z: number;
  speed: number;
  puffs: Puff[];
}

/**
 * Soft cumulus made from clustered billboard sprites, drifting slowly
 * across the sky. Fully procedural (no texture fetches) and cheap:
 * ~60 sprites total, no per-frame allocations.
 */
export function Clouds({
  seed = 9,
  count = 16,
  height = 78,
  spread = 300,
}: {
  seed?: number;
  count?: number;
  height?: number;
  spread?: number;
}) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  const clusters = useMemo<CloudCluster[]>(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: count }, () => {
      const puffCount = 4 + Math.floor(rand() * 4);
      const width = 34 + rand() * 38;
      return {
        x: (rand() * 2 - 1) * spread,
        y: height + (rand() - 0.5) * 30,
        z: (rand() * 2 - 1) * spread,
        speed: 1.2 + rand() * 1.6,
        puffs: Array.from({ length: puffCount }, (_, i) => ({
          x: (i / (puffCount - 1) - 0.5) * width + (rand() - 0.5) * 6,
          y: (rand() - 0.5) * 7,
          z: (rand() - 0.5) * 10,
          scale: 22 + rand() * 20,
          opacity: 0.4 + rand() * 0.32,
        })),
      };
    });
  }, [seed, count, height, spread]);

  const texture = useMemo(() => getPuffTexture(), []);
  const wrap = spread + 80;

  useFrame((_, delta) => {
    clusters.forEach((c, i) => {
      const g = groupRefs.current[i];
      if (!g) return;
      g.position.x += c.speed * delta;
      if (g.position.x > wrap) g.position.x = -wrap;
    });
  });

  return (
    <group>
      {clusters.map((c, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          position={[c.x, c.y, c.z]}
        >
          {c.puffs.map((p, j) => (
            <sprite key={j} position={[p.x, p.y, p.z]} scale={p.scale}>
              <spriteMaterial
                map={texture}
                transparent
                opacity={p.opacity}
                depthWrite={false}
                fog={false}
              />
            </sprite>
          ))}
        </group>
      ))}
    </group>
  );
}
