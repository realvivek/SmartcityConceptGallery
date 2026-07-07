"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { RF_COLORS, clamp, qualityColor, radToDeg } from "@/lib/three-utils";
import { PoleWithAntenna } from "@/components/three/PoleWithAntenna";

/** Per-node runtime state computed by the parent from assignments. */
export interface EdgeNodeState {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Committed capacity units (sum of assigned workload demands). */
  load: number;
  /** Number of docked orbs — used to keep the chip above the stack. */
  dockCount: number;
}

interface NodeMarkersProps {
  nodes: EdgeNodeState[];
  capacity: number;
  poleHeight: number;
  dockBaseY: number;
  dockSpacing: number;
  /** A workload is selected — nodes pulse an invite ring. */
  selecting: boolean;
  onNodeClick: (id: string) => void;
}

/**
 * Five edge compute sites: small-cell pole + compute cabinet + a base
 * capacity ring (faint full track + a fill arc whose sweep ∝ load and
 * whose colour tracks remaining headroom). Overloaded nodes pulse rose.
 */
export function NodeMarkers({
  nodes,
  capacity,
  poleHeight,
  dockBaseY,
  dockSpacing,
  selecting,
  onNodeClick,
}: NodeMarkersProps) {
  return (
    <group>
      {nodes.map((node, i) => (
        <NodeSiteMarker
          key={node.id}
          node={node}
          capacity={capacity}
          poleHeight={poleHeight}
          dockBaseY={dockBaseY}
          dockSpacing={dockSpacing}
          selecting={selecting}
          phase={i * 1.9}
          onNodeClick={onNodeClick}
        />
      ))}
    </group>
  );
}

function NodeSiteMarker({
  node,
  capacity,
  poleHeight,
  dockBaseY,
  dockSpacing,
  selecting,
  phase,
  onNodeClick,
}: {
  node: EdgeNodeState;
  capacity: number;
  poleHeight: number;
  dockBaseY: number;
  dockSpacing: number;
  selecting: boolean;
  phase: number;
  onNodeClick: (id: string) => void;
}) {
  const arcMat = useRef<THREE.MeshBasicMaterial>(null);
  const inviteMat = useRef<THREE.MeshBasicMaterial>(null);
  const faceMat = useRef<THREE.MeshStandardMaterial>(null);

  const overloaded = node.load > capacity + 1e-6;
  const fillFrac = clamp(node.load / capacity, 0, 1);
  const arcColor = `#${qualityColor(clamp(1 - node.load / capacity, 0, 1)).getHexString()}`;
  const headingRad = Math.atan2(-node.x, -node.z); // face the plaza

  // overload pulse + invite pulse + cabinet breathing, all via refs
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (arcMat.current) {
      arcMat.current.opacity = overloaded
        ? 0.5 + (0.5 + 0.5 * Math.sin(t * 6 + phase)) * 0.5
        : 0.85;
    }
    if (inviteMat.current) {
      inviteMat.current.opacity =
        0.14 + (0.5 + 0.5 * Math.sin(t * 3.2 + phase)) * 0.24;
    }
    if (faceMat.current) {
      faceMat.current.emissiveIntensity = 1.6 + Math.sin(t * 2.3 + phase) * 0.5;
    }
  });

  const chipColor = overloaded
    ? RF_COLORS.rose
    : node.load > 0
      ? arcColor
      : RF_COLORS.purple;
  const chipY =
    node.dockCount > 0
      ? dockBaseY + (node.dockCount - 1) * dockSpacing + 2.1
      : poleHeight + 3.6;

  return (
    <group position={[node.x, 0, node.z]}>
      <PoleWithAntenna
        height={poleHeight}
        headingDeg={radToDeg(headingRad)}
        accent={RF_COLORS.purple}
        luminaire
      />

      {/* co-located edge compute cabinet */}
      <group rotation={[0, headingRad, 0]}>
        <group position={[1.7, 0, 0.5]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[1.3, 1.1, 0.95]} />
            <meshStandardMaterial
              color="#1c2c47"
              roughness={0.45}
              metalness={0.65}
            />
          </mesh>
          <mesh position={[0, 0.55, 0.5]}>
            <boxGeometry args={[1.05, 0.8, 0.05]} />
            <meshStandardMaterial
              ref={faceMat}
              color={RF_COLORS.purple}
              emissive={RF_COLORS.purple}
              emissiveIntensity={1.6}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 1.14, 0]} castShadow>
            <boxGeometry args={[1.4, 0.08, 1.05]} />
            <meshStandardMaterial
              color="#233a5c"
              roughness={0.5}
              metalness={0.7}
            />
          </mesh>
        </group>
      </group>

      {/* capacity ring: faint full track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.9, 2.55, 64]} />
        <meshBasicMaterial
          color={RF_COLORS.slate}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* capacity fill arc — sweep ∝ load/capacity, colour = headroom */}
      {node.load > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry
            args={[1.9, 2.55, 64, 1, Math.PI / 2, Math.max(fillFrac, 0.02) * Math.PI * 2]}
          />
          <meshBasicMaterial
            ref={arcMat}
            color={arcColor}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* invite ring while a workload is selected */}
      {selecting && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[3.1, 3.5, 48]} />
          <meshBasicMaterial
            ref={inviteMat}
            color={RF_COLORS.purple}
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* generous invisible hit target for click-to-assign */}
      <mesh
        position={[0, 5, 0]}
        visible={false}
        onClick={(e) => {
          if (e.delta > 5) return; // ignore orbit drags
          e.stopPropagation();
          onNodeClick(node.id);
        }}
      >
        <cylinderGeometry args={[2.9, 2.9, 10, 12]} />
        <meshBasicMaterial />
      </mesh>

      {/* readout chip: name + load/capacity */}
      <Html
        position={[0, chipY, 0]}
        center
        distanceFactor={70}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            color: chipColor,
            background: "rgba(10, 20, 40, 0.82)",
            padding: "3px 8px",
            borderRadius: 8,
            border: `1px solid ${chipColor}55`,
            whiteSpace: "nowrap",
          }}
        >
          {node.name} · {node.load.toFixed(1)}/{capacity.toFixed(0)}
          {overloaded ? " · OVERLOAD" : ""}
        </div>
      </Html>
    </group>
  );
}
