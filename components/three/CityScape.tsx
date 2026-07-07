"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  type Building,
  type CityScapeData,
  mulberry32,
  setInstance,
} from "@/lib/three-utils";
import { CityBuildings } from "@/components/three/CityBuildings";

const COLORS = {
  ground: "#e6e3da",
  sidewalk: "#dcd9d0",
  asphalt: "#c3c8cf",
  laneDash: "#f6f5ee",
  grass: "#b3cf9b",
  grassDark: "#a3c28c",
  trunk: "#8a6f52",
  canopy: "#7fae67",
} as const;

interface TreeSpec {
  x: number;
  z: number;
  scale: number;
  tint: number;
}

function insideAnyBuilding(x: number, z: number, buildings: Building[], pad = 1.2) {
  for (const b of buildings) {
    if (
      Math.abs(x - b.x) < b.width / 2 + pad &&
      Math.abs(z - b.z) < b.depth / 2 + pad
    )
      return true;
  }
  return false;
}

/** Deterministic tree layout: park clusters + street-side rows. */
function planTrees(data: CityScapeData): TreeSpec[] {
  const rand = mulberry32(data.seed ^ 0x51ab);
  const trees: TreeSpec[] = [];

  // Parks: informal clusters on a jittered grid.
  for (const park of data.parks) {
    const step = 6.5;
    const halfP = park.size / 2 - 2.5;
    for (let gx = -halfP; gx <= halfP; gx += step) {
      for (let gz = -halfP; gz <= halfP; gz += step) {
        if (rand() < 0.35) continue;
        trees.push({
          x: park.x + gx + (rand() - 0.5) * 3.5,
          z: park.z + gz + (rand() - 0.5) * 3.5,
          scale: 0.8 + rand() * 0.9,
          tint: rand(),
        });
      }
    }
  }

  // Street rows: along each road edge, skipping intersections/buildings.
  const offset = data.roadWidth / 2 + 1.6;
  const clearOfCross = (coord: number, crossRoads: number[]) =>
    crossRoads.every((c) => Math.abs(coord - c) > data.roadWidth / 2 + 3);

  for (const z of data.roadsAlongX) {
    for (let x = -data.extent + 6; x <= data.extent - 6; x += 13) {
      if (!clearOfCross(x, data.roadsAlongZ)) continue;
      for (const side of [-1, 1]) {
        const tz = z + side * offset;
        if (rand() < 0.3) continue;
        if (insideAnyBuilding(x, tz, data.buildings)) continue;
        trees.push({ x, z: tz, scale: 0.7 + rand() * 0.5, tint: rand() });
      }
    }
  }
  for (const x of data.roadsAlongZ) {
    for (let z = -data.extent + 6; z <= data.extent - 6; z += 13) {
      if (!clearOfCross(z, data.roadsAlongX)) continue;
      for (const side of [-1, 1]) {
        const tx = x + side * offset;
        if (rand() < 0.3) continue;
        if (insideAnyBuilding(tx, z, data.buildings)) continue;
        trees.push({ x: tx, z, scale: 0.7 + rand() * 0.5, tint: rand() });
      }
    }
  }
  return trees;
}

/** Instanced low-poly trees: trunk cylinders + irregular canopies. */
function Trees({ trees }: { trees: TreeSpec[] }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const trunks = trunkRef.current;
    const canopies = canopyRef.current;
    if (!trunks || !canopies) return;
    const base = new THREE.Color(COLORS.canopy);
    const dark = new THREE.Color("#5f8c4c");
    const tint = new THREE.Color();
    trees.forEach((t, i) => {
      setInstance(trunks, i, [t.x, 0.8 * t.scale, t.z], [1, t.scale, 1]);
      setInstance(
        canopies,
        i,
        [t.x, (1.6 + 1.15) * t.scale, t.z],
        t.scale * (0.9 + t.tint * 0.35),
        t.tint * Math.PI * 2
      );
      tint.copy(base).lerp(dark, t.tint * 0.7);
      canopies.setColorAt(i, tint);
    });
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    canopies.computeBoundingSphere();
  }, [trees]);

  if (trees.length === 0) return null;

  return (
    <group>
      <instancedMesh
        key={`trunks-${trees.length}`}
        ref={trunkRef}
        args={[undefined, undefined, trees.length]}
        castShadow
      >
        <cylinderGeometry args={[0.13, 0.2, 1.6, 6]} />
        <meshStandardMaterial color={COLORS.trunk} roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        key={`canopies-${trees.length}`}
        ref={canopyRef}
        args={[undefined, undefined, trees.length]}
        castShadow
      >
        <icosahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.95}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}

/** Dashed lane markings down every road, as one instanced mesh. */
function LaneDashes({ data }: { data: CityScapeData }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const dashes = useMemo(() => {
    const list: { x: number; z: number; alongX: boolean }[] = [];
    const clear = (coord: number, cross: number[]) =>
      cross.every((c) => Math.abs(coord - c) > data.roadWidth / 2 + 2);
    for (const z of data.roadsAlongX) {
      for (let x = -data.extent + 4; x <= data.extent - 4; x += 5) {
        if (clear(x, data.roadsAlongZ)) list.push({ x, z, alongX: true });
      }
    }
    for (const x of data.roadsAlongZ) {
      for (let z = -data.extent + 4; z <= data.extent - 4; z += 5) {
        if (clear(z, data.roadsAlongX)) list.push({ x, z, alongX: false });
      }
    }
    return list;
  }, [data]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    dashes.forEach((d, i) => {
      setInstance(
        mesh,
        i,
        [d.x, 0.045, d.z],
        [d.alongX ? 2.1 : 0.3, 0.02, d.alongX ? 0.3 : 2.1]
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [dashes]);

  if (dashes.length === 0) return null;

  return (
    <instancedMesh
      key={dashes.length}
      ref={ref}
      args={[undefined, undefined, dashes.length]}
    >
      <boxGeometry />
      <meshStandardMaterial color={COLORS.laneDash} roughness={0.8} />
    </instancedMesh>
  );
}

interface CityScapeProps {
  data: CityScapeData;
  /** Base ground half-size beyond the district (default generous). */
  groundSize?: number;
  trees?: boolean;
  buildingColor?: string;
}

/**
 * The full dressed district: warm ground, asphalt street grid with lane
 * dashes, grass park blocks, instanced trees, and the windowed
 * instanced buildings. Everything deterministic from `data.seed`.
 */
export function CityScape({
  data,
  groundSize = 600,
  trees = true,
  buildingColor,
}: CityScapeProps) {
  const treeList = useMemo(
    () => (trees ? planTrees(data) : []),
    [data, trees]
  );

  return (
    <group>
      {/* base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.96} metalness={0.02} />
      </mesh>
      {/* district sidewalk apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.005, 0]}>
        <planeGeometry args={[data.extent * 2, data.extent * 2]} />
        <meshStandardMaterial color={COLORS.sidewalk} roughness={0.95} metalness={0.02} />
      </mesh>
      {/* roads */}
      {data.roadsAlongX.map((z) => (
        <mesh
          key={`rx-${z}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, z]}
          receiveShadow
        >
          <planeGeometry args={[data.extent * 2, data.roadWidth]} />
          <meshStandardMaterial color={COLORS.asphalt} roughness={0.92} />
        </mesh>
      ))}
      {data.roadsAlongZ.map((x) => (
        <mesh
          key={`rz-${x}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.03, 0]}
          receiveShadow
        >
          <planeGeometry args={[data.roadWidth, data.extent * 2]} />
          <meshStandardMaterial color={COLORS.asphalt} roughness={0.92} />
        </mesh>
      ))}
      <LaneDashes data={data} />
      {/* parks */}
      {data.parks.map((p) => (
        <group key={`park-${p.x}-${p.z}`}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[p.x, 0.04, p.z]}
            receiveShadow
          >
            <planeGeometry args={[p.size, p.size]} />
            <meshStandardMaterial color={COLORS.grass} roughness={1} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[p.x + p.size * 0.18, 0.05, p.z - p.size * 0.12]}
          >
            <circleGeometry args={[p.size * 0.28, 24]} />
            <meshStandardMaterial color={COLORS.grassDark} roughness={1} />
          </mesh>
        </group>
      ))}
      <Trees trees={treeList} />
      <CityBuildings buildings={data.buildings} color={buildingColor} />
    </group>
  );
}
