"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { RF_COLORS, damp } from "@/lib/three-utils";

export type WorkloadKind = "traffic" | "video" | "fusion";

/** Static definition of one placeable workload. */
export interface WorkloadDef {
  id: string;
  /** Chip label, e.g. "Traffic-1". */
  label: string;
  kind: WorkloadKind;
  color: string;
  /** Capacity units consumed on the host node. */
  demand: number;
  /** Latency sensitivity multiplier in the score. */
  weight: number;
  /** Street-level data-source location [x, z]. */
  source: [number, number];
  /** Scattered sensor dots (fusion workloads) — source is their centroid. */
  dots: [number, number][];
}

/** Per-orb runtime state computed by the parent from assignments. */
export interface OrbState {
  def: WorkloadDef;
  assigned: boolean;
  latencyMs: number | null;
  /** World position the orb glides toward (source float or dock slot). */
  target: THREE.Vector3;
}

interface WorkloadOrbsProps {
  orbs: OrbState[];
  selectedId: string | null;
  onOrbClick: (id: string) => void;
}

/**
 * The six placeable workload orbs. Unassigned orbs bob above their data
 * source; assigned orbs glide up to dock slots stacked above their node.
 * All motion (glide, bob, selection scale, ring spin, emissive pulse)
 * runs through refs in a single useFrame — no per-frame setState.
 */
export function WorkloadOrbs({ orbs, selectedId, onOrbClick }: WorkloadOrbsProps) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < orbs.length; i++) {
      const g = groupRefs.current[i];
      if (!g) continue;
      const orb = orbs[i];
      const selected = orb.def.id === selectedId;
      const bob = orb.assigned ? 0 : Math.sin(t * 1.7 + i * 1.31) * 0.35;

      g.position.x = damp(g.position.x, orb.target.x, 4, delta);
      g.position.y = damp(g.position.y, orb.target.y + bob, 4, delta);
      g.position.z = damp(g.position.z, orb.target.z, 4, delta);

      const s = damp(g.scale.x, selected ? 1.35 : 1, 10, delta);
      g.scale.setScalar(s);

      const mat = matRefs.current[i];
      if (mat) {
        mat.emissiveIntensity =
          (selected ? 2.1 : 1.5) + Math.sin(t * 2.2 + i * 0.9) * 0.35;
      }
      const ring = ringRefs.current[i];
      if (ring) ring.rotation.z = t * 1.4;
    }
  });

  return (
    <group>
      {orbs.map((orb, i) => {
        const { def } = orb;
        const selected = def.id === selectedId;
        const chipText = selected
          ? `${def.label} — select a node`
          : orb.assigned && orb.latencyMs !== null
            ? `${def.label} · ${orb.latencyMs.toFixed(2)} ms`
            : `${def.label} · ${def.demand.toFixed(1)}u`;
        return (
          <group
            key={def.id}
            ref={(el) => {
              groupRefs.current[i] = el;
              // snap to the current target on first mount only; after
              // that, useFrame owns the position (damped glide)
              if (el && !el.userData.placed) {
                el.userData.placed = true;
                el.position.copy(orb.target);
              }
            }}
          >
            {/* orb body — click to select / unassign */}
            <mesh
              onClick={(e) => {
                if (e.delta > 5) return; // ignore orbit drags
                e.stopPropagation();
                onOrbClick(def.id);
              }}
              castShadow
            >
              <sphereGeometry args={[0.8, 24, 18]} />
              <meshStandardMaterial
                ref={(m) => {
                  matRefs.current[i] = m;
                }}
                color={def.color}
                emissive={def.color}
                emissiveIntensity={1.5}
                toneMapped={false}
              />
            </mesh>
            {/* selection ring — broken arc so its spin reads */}
            {selected && (
              <mesh
                ref={(m) => {
                  ringRefs.current[i] = m;
                }}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry args={[1.15, 1.35, 40, 1, 0, Math.PI * 1.5]} />
                <meshBasicMaterial
                  color={def.color}
                  transparent
                  opacity={0.9}
                  side={THREE.DoubleSide}
                  blending={THREE.NormalBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            )}
            {/* readout chip */}
            <Html
              position={[0, 1.7, 0]}
              center
              distanceFactor={55}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 10,
                  color: def.color,
                  background: "rgba(253, 252, 247, 0.94)",
                  padding: "3px 8px",
                  borderRadius: 2,
                  border: `1px solid ${def.color}`,
                  boxShadow: selected
                    ? "3px 3px 0 rgba(36, 52, 77, 0.35)"
                    : "2px 2px 0 rgba(36, 52, 77, 0.18)",
                  whiteSpace: "nowrap",
                }}
              >
                {chipText}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Static data-source furniture: a marker per workload (octahedron =
 * intersection detector, box = camera cluster, sphere = fusion centroid)
 * plus the scattered tiny sensor dots that fusion workloads aggregate,
 * tethered to their centroid with faint additive lines.
 */
export function SourceMarkers({ workloads }: { workloads: WorkloadDef[] }) {
  const fusionTethers = useMemo(() => {
    const verts: number[] = [];
    for (const w of workloads) {
      for (const [dx, dz] of w.dots) {
        verts.push(dx, 0.5, dz, w.source[0], 0.95, w.source[1]);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(verts), 3)
    );
    return geometry;
  }, [workloads]);

  useEffect(() => () => fusionTethers.dispose(), [fusionTethers]);

  return (
    <group>
      {workloads.map((w) => (
        <group key={w.id} position={[w.source[0], 0, w.source[1]]}>
          {/* pedestal */}
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.16, 0.56, 8]} />
            <meshStandardMaterial
              color="#233a5c"
              roughness={0.5}
              metalness={0.7}
            />
          </mesh>
          {/* source head, shaped by workload kind */}
          <mesh position={[0, 0.74, 0]} rotation={[0, w.kind === "video" ? 0.6 : 0, 0]}>
            {w.kind === "traffic" ? (
              <octahedronGeometry args={[0.34]} />
            ) : w.kind === "video" ? (
              <boxGeometry args={[0.52, 0.34, 0.4]} />
            ) : (
              <sphereGeometry args={[0.3, 16, 12]} />
            )}
            <meshStandardMaterial
              color={w.color}
              emissive={w.color}
              emissiveIntensity={1.5}
              toneMapped={false}
            />
          </mesh>
          {/* ground halo */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <ringGeometry args={[0.75, 1.05, 32]} />
            <meshBasicMaterial
              color={w.color}
              transparent
              opacity={0.4}
              blending={THREE.NormalBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* fusion sensor dots */}
      {workloads.map((w) =>
        w.dots.map(([dx, dz], j) => (
          <group key={`${w.id}-dot-${j}`} position={[dx, 0, dz]}>
            <mesh position={[0, 0.45, 0]}>
              <sphereGeometry args={[0.24, 12, 10]} />
              <meshStandardMaterial
                color={w.color}
                emissive={w.color}
                emissiveIntensity={1.8}
                toneMapped={false}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <ringGeometry args={[0.34, 0.5, 24]} />
              <meshBasicMaterial
                color={w.color}
                transparent
                opacity={0.3}
                blending={THREE.NormalBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))
      )}
      <lineSegments geometry={fusionTethers}>
        <lineBasicMaterial
          color={RF_COLORS.emerald}
          transparent
          opacity={0.22}
          blending={THREE.NormalBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
