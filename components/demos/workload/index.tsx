"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";

import { RF_COLORS, clamp, generateCity, latencyMs } from "@/lib/three-utils";
import { DemoCanvas } from "@/components/demo-shell/DemoCanvas";
import {
  ControlHint,
  ControlPanel,
  StatRow,
  ToggleRow,
} from "@/components/demo-shell/ControlPanel";
import { Button } from "@/components/ui/button";
import { CityBuildings } from "@/components/three/CityBuildings";
import { CityLighting, GroundPlane } from "@/components/three/SceneEnvironment";
import { GlowEffects } from "@/components/three/GlowEffects";
import { NodeMarkers, type EdgeNodeState } from "./NodeMarkers";
import {
  SourceMarkers,
  WorkloadOrbs,
  type OrbState,
  type WorkloadDef,
} from "./WorkloadOrbs";
import { FlowArcs, type FlowStream } from "./FlowArcs";

const POLE_HEIGHT = 8;
const NODE_CAPACITY = 5;
const ANTENNA_Y = POLE_HEIGHT + 0.75; // shroud centre — arcs land here
const DOCK_BASE_Y = POLE_HEIGHT + 4.2; // first dock slot, clear of the pole hit target
const DOCK_SPACING = 1.8;
const ORB_FLOAT_Y = 2.6; // unassigned orbs hover here above their source
const SOURCE_Y = 1.1; // arc departure height
/**
 * Schematic compression: one scene metre stands in for ~2.5 km of routed
 * metro fibre (same convention as Demo 02), so the propagation term stays
 * visible next to switching + queueing delay.
 */
const FIBRE_M_PER_SCENE_M = 2500;
const OVERLOAD_PENALTY = 25;
const LATENCY_SCORE_GAIN = 6;

interface NodeSite {
  id: string;
  name: string;
  x: number;
  z: number;
}

/**
 * Five edge sites pin-wheeled across the district on street
 * intersections (street centre lines sit at ±20 / ±60 for this city
 * recipe), so they are guaranteed clear of building lots.
 */
const EDGE_NODES: NodeSite[] = [
  { id: "a", name: "EDGE-A", x: 0, z: 0 },
  { id: "b", name: "EDGE-B", x: -60, z: -20 },
  { id: "c", name: "EDGE-C", x: 20, z: -60 },
  { id: "d", name: "EDGE-D", x: -20, z: 60 },
  { id: "e", name: "EDGE-E", x: 60, z: 20 },
];

const NODE_BY_ID: Record<string, NodeSite> = Object.fromEntries(
  EDGE_NODES.map((n) => [n.id, n])
);

function centroid(points: [number, number][]): [number, number] {
  let sx = 0;
  let sz = 0;
  for (const [x, z] of points) {
    sx += x;
    sz += z;
  }
  return [sx / points.length, sz / points.length];
}

/** Scattered sensor dots aggregated by the two fusion workloads. */
const FUS1_DOTS: [number, number][] = [
  [-60, -48],
  [-55, -58],
  [-66, -60],
];
const FUS2_DOTS: [number, number][] = [
  [44, 60],
  [54, 56],
  [50, 66],
];

/** The fixed set of six placeable workloads. Sources sit on streets. */
const WORKLOADS: WorkloadDef[] = [
  {
    id: "traf-1",
    label: "Traffic-1",
    kind: "traffic",
    color: RF_COLORS.cyan,
    demand: 2,
    weight: 3,
    source: [-20, -20],
    dots: [],
  },
  {
    id: "traf-2",
    label: "Traffic-2",
    kind: "traffic",
    color: RF_COLORS.cyan,
    demand: 2,
    weight: 3,
    source: [20, 60],
    dots: [],
  },
  {
    id: "vid-1",
    label: "Video-1",
    kind: "video",
    color: RF_COLORS.amber,
    demand: 3,
    weight: 1.5,
    source: [60, -40],
    dots: [],
  },
  {
    id: "vid-2",
    label: "Video-2",
    kind: "video",
    color: RF_COLORS.amber,
    demand: 3,
    weight: 1.5,
    source: [-40, 20],
    dots: [],
  },
  {
    id: "fus-1",
    label: "Fusion-1",
    kind: "fusion",
    color: RF_COLORS.emerald,
    demand: 1.5,
    weight: 2,
    source: centroid(FUS1_DOTS),
    dots: FUS1_DOTS,
  },
  {
    id: "fus-2",
    label: "Fusion-2",
    kind: "fusion",
    color: RF_COLORS.emerald,
    demand: 1.5,
    weight: 2,
    source: centroid(FUS2_DOTS),
    dots: FUS2_DOTS,
  },
];

type Assignments = Record<string, string | null>;

const emptyAssignments = (): Assignments =>
  Object.fromEntries(WORKLOADS.map((w) => [w.id, null]));

/**
 * Two sensible starter placements so the scene opens alive (flows,
 * ring fills, a beatable score) while leaving the high-weight traffic
 * workloads for the player.
 */
const initialAssignments = (): Assignments => ({
  ...emptyAssignments(),
  "vid-1": "c",
  "fus-1": "b",
});

/** One-way latency for a workload hosted on a node at a given load. */
function linkLatencyMs(w: WorkloadDef, node: NodeSite, loadFrac: number): number {
  const dist = Math.hypot(w.source[0] - node.x, w.source[1] - node.z);
  return latencyMs(dist * FIBRE_M_PER_SCENE_M, 1, loadFrac);
}

/** Demo 06 — Edge Workload Placement. */
export default function WorkloadDemo() {
  const [assignments, setAssignments] = useState<Assignments>(initialAssignments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(true);
  const [showFlows, setShowFlows] = useState(true);

  const buildings = useMemo(
    () =>
      generateCity({
        seed: 47,
        blocks: 5,
        blockSize: 26,
        street: 14,
        minHeight: 6,
        maxHeight: 40,
        density: 0.8,
        clearRadius: 10,
      }).filter((b) =>
        // carve out breathing room around the five edge sites
        EDGE_NODES.every(
          (n) =>
            Math.abs(n.x - b.x) > b.width / 2 + 3.5 ||
            Math.abs(n.z - b.z) > b.depth / 2 + 3.5
        )
      ),
    []
  );

  /** Everything derived from the assignment map — never touched per frame. */
  const placement = useMemo(() => {
    const loads: Record<string, number> = {};
    const dockCounts: Record<string, number> = {};
    for (const n of EDGE_NODES) {
      loads[n.id] = 0;
      dockCounts[n.id] = 0;
    }
    for (const w of WORKLOADS) {
      const nid = assignments[w.id];
      if (nid) loads[nid] += w.demand;
    }
    const overloadedIds = new Set<string>();
    for (const n of EDGE_NODES) {
      if (loads[n.id] > NODE_CAPACITY + 1e-6) overloadedIds.add(n.id);
    }

    const orbs: OrbState[] = [];
    const streams: FlowStream[] = [];
    let scoreSum = 0;
    let latSum = 0;
    let assignedCount = 0;

    for (const w of WORKLOADS) {
      const nid = assignments[w.id];
      if (!nid) {
        orbs.push({
          def: w,
          assigned: false,
          latencyMs: null,
          target: new THREE.Vector3(w.source[0], ORB_FLOAT_Y, w.source[1]),
        });
        continue; // unassigned workloads contribute 0 to the total
      }
      const node = NODE_BY_ID[nid];
      const slot = dockCounts[nid]++;
      const lat = linkLatencyMs(w, node, loads[nid] / NODE_CAPACITY);
      let score = 100 - w.weight * lat * LATENCY_SCORE_GAIN;
      if (overloadedIds.has(nid)) score -= OVERLOAD_PENALTY;
      scoreSum += clamp(score, 0, 100);
      latSum += lat;
      assignedCount++;

      orbs.push({
        def: w,
        assigned: true,
        latencyMs: lat,
        target: new THREE.Vector3(
          node.x,
          DOCK_BASE_Y + slot * DOCK_SPACING,
          node.z
        ),
      });
      streams.push({
        id: w.id,
        from: new THREE.Vector3(w.source[0], SOURCE_Y, w.source[1]),
        to: new THREE.Vector3(node.x, ANTENNA_Y, node.z),
        latencyMs: lat,
      });
    }

    const nodes: EdgeNodeState[] = EDGE_NODES.map((n) => ({
      ...n,
      load: loads[n.id],
      dockCount: dockCounts[n.id],
    }));

    return {
      orbs,
      streams,
      nodes,
      totalScore: scoreSum / WORKLOADS.length,
      avgLatency: assignedCount > 0 ? latSum / assignedCount : 0,
      assignedCount,
      overloadedCount: overloadedIds.size,
    };
  }, [assignments]);

  const handleOrbClick = (id: string) => {
    if (assignments[id]) {
      // docked orb → send it home
      setAssignments((prev) => ({ ...prev, [id]: null }));
    } else {
      setSelectedId((prev) => (prev === id ? null : id));
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (!selectedId) return;
    setAssignments((prev) => ({ ...prev, [selectedId]: nodeId }));
    setSelectedId(null);
  };

  /** Greedy scheduler: heaviest latency-weight first, each workload to
   *  the node minimizing its latency among nodes with headroom left. */
  const autoPlace = () => {
    const order = [...WORKLOADS].sort((a, b) => b.weight - a.weight);
    const loads: Record<string, number> = {};
    for (const n of EDGE_NODES) loads[n.id] = 0;
    const next = emptyAssignments();
    for (const w of order) {
      let bestId: string | null = null;
      let bestLat = Infinity;
      for (const n of EDGE_NODES) {
        if (loads[n.id] + w.demand > NODE_CAPACITY + 1e-6) continue;
        const lat = linkLatencyMs(w, n, (loads[n.id] + w.demand) / NODE_CAPACITY);
        if (lat < bestLat) {
          bestLat = lat;
          bestId = n.id;
        }
      }
      if (bestId) {
        next[w.id] = bestId;
        loads[bestId] += w.demand;
      }
    }
    setAssignments(next);
    setSelectedId(null);
  };

  const clearAll = () => {
    setAssignments(emptyAssignments());
    setSelectedId(null);
  };

  const scoreAccent =
    placement.totalScore >= 70
      ? "text-teal-700"
      : placement.totalScore >= 40
        ? "text-amber-700"
        : "text-rose-700";

  return (
    <div className="relative h-full w-full">
      <DemoCanvas
        cameraPosition={[70, 52, 96]}
        target={[0, 5, 0]}
        minDistance={22}
        maxDistance={250}
      >
        <CityLighting />
        <GroundPlane />
        <CityBuildings buildings={buildings} />
        <NodeMarkers
          nodes={placement.nodes}
          capacity={NODE_CAPACITY}
          poleHeight={POLE_HEIGHT}
          dockBaseY={DOCK_BASE_Y}
          dockSpacing={DOCK_SPACING}
          selecting={selectedId !== null}
          onNodeClick={handleNodeClick}
        />
        {showSources && <SourceMarkers workloads={WORKLOADS} />}
        {showFlows && <FlowArcs streams={placement.streams} />}
        <WorkloadOrbs
          orbs={placement.orbs}
          selectedId={selectedId}
          onOrbClick={handleOrbClick}
        />
        {/* click-catcher: clicking empty ground clears the selection */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          onClick={(e) => {
            if (e.delta > 5) return; // ignore orbit drags
            e.stopPropagation();
            setSelectedId(null);
          }}
          visible={false}
        >
          <planeGeometry args={[600, 600]} />
          <meshBasicMaterial />
        </mesh>
        <GlowEffects bloomIntensity={1.15} />
      </DemoCanvas>

      <ControlPanel title="Orchestrator">
        <div className="space-y-1.5 rounded-md border border-ink/20 bg-ink/[0.04] p-3">
          <StatRow
            label="Placement score"
            value={`${placement.totalScore.toFixed(0)} / 100`}
            accent={scoreAccent}
          />
          <StatRow
            label="Avg latency"
            value={
              placement.assignedCount > 0
                ? `${placement.avgLatency.toFixed(2)} ms`
                : "—"
            }
            accent="text-sky-700"
          />
          <StatRow
            label="Assigned"
            value={`${placement.assignedCount}/${WORKLOADS.length}`}
          />
          <StatRow
            label="Overloaded nodes"
            value={`${placement.overloadedCount}`}
            accent={
              placement.overloadedCount > 0 ? "text-rose-700" : "text-ink/70"
            }
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={autoPlace}
          >
            Auto-place
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={clearAll}
          >
            Clear all
          </Button>
        </div>
        <ToggleRow
          label="Show sources"
          checked={showSources}
          onCheckedChange={setShowSources}
        />
        <ToggleRow
          label="Show flows"
          checked={showFlows}
          onCheckedChange={setShowFlows}
        />
        <ControlHint>
          Click a glowing workload orb, then an edge node to place it; click
          a docked orb to send it home. Packing one node backfires — queueing
          delay is shared and overload penalises every tenant. Try to beat
          Auto-place.
        </ControlHint>
      </ControlPanel>
    </div>
  );
}
