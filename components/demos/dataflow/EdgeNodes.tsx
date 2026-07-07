"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { RF_COLORS, qualityColor, radToDeg } from "@/lib/three-utils";
import { PoleWithAntenna } from "@/components/three/PoleWithAntenna";
import { latencyQuality } from "./FlowStreams";

/** Per-node aggregate stats computed by the parent. */
export interface EdgeNodeStat {
  id: string;
  x: number;
  z: number;
  count: number;
  avgLatencyMs: number;
}

interface EdgeNodesProps {
  nodes: EdgeNodeStat[];
  showHalos: boolean;
  poleHeight: number;
}

/**
 * Three small-cell poles with co-located edge compute: a glowing
 * server cabinet at the base plus an optional latency halo — a ground
 * ring sized by how many sensors the node serves and coloured by the
 * node's aggregate latency.
 */
export function EdgeNodes({ nodes, showHalos, poleHeight }: EdgeNodesProps) {
  return (
    <group>
      {nodes.map((node, i) => (
        <EdgeNode
          key={node.id}
          node={node}
          showHalos={showHalos}
          poleHeight={poleHeight}
          phase={i * 2.1}
        />
      ))}
    </group>
  );
}

function EdgeNode({
  node,
  showHalos,
  poleHeight,
  phase,
}: {
  node: EdgeNodeStat;
  showHalos: boolean;
  poleHeight: number;
  phase: number;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  const stripRef = useRef<THREE.MeshStandardMaterial>(null);

  // gentle breathing: compute cabinet glow + latency halo scale
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (stripRef.current) {
      stripRef.current.emissiveIntensity = 1.8 + Math.sin(t * 2.4 + phase) * 0.6;
    }
    if (haloRef.current) {
      haloRef.current.scale.setScalar(1 + Math.sin(t * 1.6 + phase) * 0.05);
    }
  });

  const headingRad = Math.atan2(-node.x, -node.z); // face the plaza
  const active = node.count > 0;
  const haloColor = active
    ? `#${qualityColor(latencyQuality(node.avgLatencyMs)).getHexString()}`
    : RF_COLORS.slate;
  const haloRadius = 2.4 + node.count * 0.3;

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
        <group position={[1.8, 0, 0.3]}>
          <mesh position={[0, 0.62, 0]} castShadow>
            <boxGeometry args={[1.5, 1.24, 1.05]} />
            <meshStandardMaterial
              color="#1c2c47"
              roughness={0.45}
              metalness={0.65}
            />
          </mesh>
          {/* glowing compute face */}
          <mesh position={[0, 0.62, 0.55]}>
            <boxGeometry args={[1.2, 0.9, 0.05]} />
            <meshStandardMaterial
              ref={stripRef}
              color={RF_COLORS.purple}
              emissive={RF_COLORS.purple}
              emissiveIntensity={1.8}
              toneMapped={false}
            />
          </mesh>
          {/* cabinet cap detail */}
          <mesh position={[0, 1.29, 0]} castShadow>
            <boxGeometry args={[1.6, 0.1, 1.15]} />
            <meshStandardMaterial
              color="#233a5c"
              roughness={0.5}
              metalness={0.7}
            />
          </mesh>
          {/* compute halo under the cabinet */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <ringGeometry args={[1.0, 1.35, 40]} />
            <meshBasicMaterial
              color={RF_COLORS.purple}
              transparent
              opacity={0.4}
              blending={THREE.NormalBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      {/* latency halo: sized by bound sensors, coloured by aggregate latency */}
      {showHalos && (
        <mesh
          ref={haloRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.09, 0]}
        >
          <ringGeometry
            args={[Math.max(haloRadius - 0.6, 0.5), haloRadius, 64]}
          />
          <meshBasicMaterial
            color={haloColor}
            transparent
            opacity={active ? 0.4 : 0.18}
            blending={THREE.NormalBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* node readout chip */}
      <Html
        position={[0, poleHeight + 3.4, 0]}
        center
        distanceFactor={70}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            color: active ? haloColor : "#6d28d9",
            background: "rgba(253, 252, 247, 0.94)",
            padding: "3px 8px",
            borderRadius: 2,
            border: `1px solid ${active ? haloColor : "rgba(124, 58, 237, 0.5)"}`,
            boxShadow: "2px 2px 0 rgba(36, 52, 77, 0.18)",
            whiteSpace: "nowrap",
          }}
        >
          {node.id} · {node.count} sensor{node.count === 1 ? "" : "s"}
          {active ? ` · ${node.avgLatencyMs.toFixed(2)} ms` : " · idle"}
        </div>
      </Html>
    </group>
  );
}
