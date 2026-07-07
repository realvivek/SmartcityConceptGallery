"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  type Building,
  clamp,
  generateCityScape,
  latencyMs,
  mulberry32,
} from "@/lib/three-utils";
import { DemoCanvas } from "@/components/demo-shell/DemoCanvas";
import {
  ControlHint,
  ControlPanel,
  LabeledSlider,
  StatRow,
  ToggleRow,
} from "@/components/demo-shell/ControlPanel";
import { CityLighting } from "@/components/three/SceneEnvironment";
import { CityScape } from "@/components/three/CityScape";
import { GlowEffects } from "@/components/three/GlowEffects";
import { FlowStreams, type Stream } from "./FlowStreams";
import { EdgeNodes, type EdgeNodeStat } from "./EdgeNodes";
import { SensorMarkers, type SensorEntry } from "./SensorMarkers";

const POLE_HEIGHT = 9;
const RX_HEIGHT = POLE_HEIGHT + 0.75; // antenna shroud centre
const SENSOR_HEIGHT = 1.0;
const MIN_SENSORS = 4;
const MAX_SENSORS = 24;
const DEFAULT_SENSORS = 14;

/**
 * The scene is a schematic compression of a metro-area deployment:
 * one scene metre stands in for ~2.5 km of routed metro fibre, so the
 * propagation term stays visible next to switching + queueing delay
 * ("distant sensors are slower even at zero load").
 */
const FIBRE_M_PER_SCENE_M = 2500;

/** Three edge compute sites, well apart across the district. */
const EDGE_NODES: { id: string; x: number; z: number }[] = [
  { id: "EDGE-A", x: -38, z: -30 },
  { id: "EDGE-B", x: 42, z: -8 },
  { id: "EDGE-C", x: -4, z: 44 },
];

interface Sensor {
  id: string;
  x: number;
  z: number;
}

/** Point-in-footprint test with a safety margin. */
function insideBuilding(
  x: number,
  z: number,
  buildings: Building[],
  margin = 1.6
): boolean {
  for (const b of buildings) {
    if (
      Math.abs(x - b.x) < b.width / 2 + margin &&
      Math.abs(z - b.z) < b.depth / 2 + margin
    ) {
      return true;
    }
  }
  return false;
}

/** Demo 02 — Sensor-to-Edge Data Flow. */
export default function DataflowDemo() {
  const [sensorCount, setSensorCount] = useState(DEFAULT_SENSORS);
  const [workload, setWorkload] = useState(25);
  const [showLinks, setShowLinks] = useState(true);
  const [showHalos, setShowHalos] = useState(true);
  /** Base procedural sensors the user has click-removed. */
  const [removedBase, setRemovedBase] = useState<Set<string>>(new Set());
  /** Extra sensors the user has click-placed. */
  const [extras, setExtras] = useState<Sensor[]>([]);
  const nextExtraId = useRef(1);

  const scape = useMemo(() => {
    const raw = generateCityScape({
      seed: 23,
      blocks: 5,
      blockSize: 26,
      street: 14,
      minHeight: 6,
      maxHeight: 34,
      density: 0.8,
      clearRadius: 12,
    });
    // carve out room for the three edge-node sites
    return {
      ...raw,
      buildings: raw.buildings.filter((b) =>
        EDGE_NODES.every(
          (n) =>
            Math.abs(n.x - b.x) > b.width / 2 + 4 ||
            Math.abs(n.z - b.z) > b.depth / 2 + 4
        )
      ),
    };
  }, []);
  const buildings = scape.buildings;

  /**
   * Deterministic pool of MAX_SENSORS street-level positions: rejection-
   * sampled off building footprints, away from edge nodes and each other.
   * The slider slices this pool, so positions stay stable as it moves.
   */
  const baseCandidates = useMemo(() => {
    const rand = mulberry32(97);
    const pool: Sensor[] = [];
    let guard = 0;
    while (pool.length < MAX_SENSORS && guard++ < 6000) {
      const x = (rand() * 2 - 1) * 58;
      const z = (rand() * 2 - 1) * 58;
      if (insideBuilding(x, z, buildings)) continue;
      if (EDGE_NODES.some((n) => Math.hypot(x - n.x, z - n.z) < 7)) continue;
      if (pool.some((s) => Math.hypot(x - s.x, z - s.z) < 7)) continue;
      pool.push({ id: `b${pool.length}`, x, z });
    }
    return pool;
  }, [buildings]);

  const activeSensors = useMemo(() => {
    const base = baseCandidates
      .slice(0, sensorCount)
      .filter((s) => !removedBase.has(s.id));
    return [...base, ...extras].slice(0, MAX_SENSORS);
  }, [baseCandidates, sensorCount, removedBase, extras]);

  const { streams, sensorEntries, nodeStats, avgLatency, worstLatency, busiest } =
    useMemo(() => {
      const load = workload / 100;

      // pass 1: nearest-node binding + per-node counts
      const nearest = activeSensors.map((s) => {
        let best = 0;
        let bestDist = Infinity;
        EDGE_NODES.forEach((n, i) => {
          const d = Math.hypot(s.x - n.x, s.z - n.z);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        return best;
      });
      const counts = EDGE_NODES.map(() => 0);
      nearest.forEach((n) => counts[n]++);

      // pass 2: per-stream latency (busier nodes queue harder)
      const latSums = EDGE_NODES.map(() => 0);
      const streams: Stream[] = [];
      const sensorEntries: SensorEntry[] = [];
      let total = 0;
      let worst = 0;

      activeSensors.forEach((s, i) => {
        const nodeIdx = nearest[i];
        const node = EDGE_NODES[nodeIdx];
        const from = new THREE.Vector3(s.x, SENSOR_HEIGHT, s.z);
        const to = new THREE.Vector3(node.x, RX_HEIGHT, node.z);
        const effLoad = clamp(
          load * (0.55 + 0.45 * Math.min(counts[nodeIdx] / 10, 1)),
          0,
          1
        );
        const lat = latencyMs(
          from.distanceTo(to) * FIBRE_M_PER_SCENE_M,
          1,
          effLoad
        );
        streams.push({ id: s.id, from, to, latencyMs: lat });
        sensorEntries.push({ id: s.id, x: s.x, z: s.z, latencyMs: lat });
        latSums[nodeIdx] += lat;
        total += lat;
        worst = Math.max(worst, lat);
      });

      const nodeStats: EdgeNodeStat[] = EDGE_NODES.map((n, i) => ({
        id: n.id,
        x: n.x,
        z: n.z,
        count: counts[i],
        avgLatencyMs: counts[i] > 0 ? latSums[i] / counts[i] : 0,
      }));
      const busiestIdx = counts.indexOf(Math.max(...counts));

      return {
        streams,
        sensorEntries,
        nodeStats,
        avgLatency: streams.length > 0 ? total / streams.length : 0,
        worstLatency: worst,
        busiest: { id: EDGE_NODES[busiestIdx].id, count: counts[busiestIdx] },
      };
    }, [activeSensors, workload]);

  const addSensor = (x: number, z: number) => {
    if (activeSensors.length >= MAX_SENSORS) return;
    if (Math.abs(x) > 70 || Math.abs(z) > 70) return;
    if (insideBuilding(x, z, buildings, 1.1)) return;
    if (EDGE_NODES.some((n) => Math.hypot(x - n.x, z - n.z) < 4.5)) return;
    const id = `u${nextExtraId.current++}`;
    setExtras((prev) => [...prev, { id, x, z }]);
  };

  const removeSensor = (id: string) => {
    if (id.startsWith("u")) {
      setExtras((prev) => prev.filter((s) => s.id !== id));
    } else {
      setRemovedBase((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  return (
    <div className="relative h-full w-full">
      <DemoCanvas
        cameraPosition={[64, 52, 86]}
        target={[0, 4, 2]}
        minDistance={20}
        maxDistance={240}
      >
        <CityLighting />
        <CityScape data={scape} />
        <EdgeNodes
          nodes={nodeStats}
          showHalos={showHalos}
          poleHeight={POLE_HEIGHT}
        />
        <FlowStreams streams={streams} showLinks={showLinks} />
        <SensorMarkers sensors={sensorEntries} onRemove={removeSensor} />
        {/* click-catcher for sensor placement */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          onClick={(e) => {
            if (e.delta > 5) return; // ignore orbit drags
            e.stopPropagation();
            addSensor(e.point.x, e.point.z);
          }}
          visible={false}
        >
          <planeGeometry args={[600, 600]} />
          <meshBasicMaterial />
        </mesh>
        <GlowEffects bloomIntensity={1.15} />
      </DemoCanvas>

      <ControlPanel title="Edge controls">
        <LabeledSlider
          label="Sensors"
          value={sensorCount}
          onChange={setSensorCount}
          min={MIN_SENSORS}
          max={MAX_SENSORS}
          format={(v) => `${v}`}
        />
        <LabeledSlider
          label="Workload intensity"
          value={workload}
          onChange={setWorkload}
          min={0}
          max={100}
          format={(v) => `${v}%`}
        />
        <ToggleRow
          label="Show links"
          checked={showLinks}
          onCheckedChange={setShowLinks}
        />
        <ToggleRow
          label="Latency halos"
          checked={showHalos}
          onCheckedChange={setShowHalos}
        />
        <div className="space-y-1.5 rounded-md border border-ink/20 bg-ink/[0.04] p-3">
          <StatRow
            label="Avg latency"
            value={`${avgLatency.toFixed(2)} ms`}
            accent="text-sky-700"
          />
          <StatRow
            label="Worst latency"
            value={`${worstLatency.toFixed(2)} ms`}
            accent="text-rose-700"
          />
          <StatRow
            label="Busiest node"
            value={`${busiest.id} · ${busiest.count}`}
            accent="text-violet-700"
          />
          <StatRow
            label="Active sensors"
            value={`${activeSensors.length}/${MAX_SENSORS}`}
          />
        </div>
        <ControlHint>
          Click a street to add a sensor (up to {MAX_SENSORS}); click a sensor
          to remove it. Packets slow and shift toward rose as queueing builds.
        </ControlHint>
      </ControlPanel>
    </div>
  );
}
