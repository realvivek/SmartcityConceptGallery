"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";

import {
  RF_COLORS,
  generateCity,
  qualityColor,
  radToDeg,
} from "@/lib/three-utils";
import { DemoCanvas } from "@/components/demo-shell/DemoCanvas";
import {
  ControlHint,
  ControlPanel,
  LabeledSlider,
  StatRow,
  ToggleRow,
} from "@/components/demo-shell/ControlPanel";
import { CityBuildings } from "@/components/three/CityBuildings";
import { CityLighting, GroundPlane } from "@/components/three/SceneEnvironment";
import { GlowEffects } from "@/components/three/GlowEffects";
import { PoleWithAntenna } from "@/components/three/PoleWithAntenna";

import {
  type Cell,
  type ClutterGrid,
  FIELD_HALF,
  MAX_CELLS,
  POLE_HEIGHT,
  buildClutterGrid,
  computeDominance,
  computeRxGrid,
  sampleClutter,
} from "./field";
import { NoiseField } from "./NoiseField";
import { DominanceMap } from "./DominanceMap";

/**
 * Pre-placed for maximum contrast: one cell in the open plaza around the
 * origin (big clean dominance region), one buried in a dense-core street
 * canyon (small, fragmented region despite identical power).
 */
const DEFAULT_CELLS: Cell[] = [
  { id: 1, x: 2, z: -4 }, // open plaza
  { id: 2, x: -38, z: 19 }, // dense-core canyon
];

/** Demo 04 — Interference Noise Field. */
export default function InterferenceDemo() {
  const [clutterGain, setClutterGain] = useState(1);
  const [particleCount, setParticleCount] = useState(24000);
  const [showField, setShowField] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [cells, setCells] = useState<Cell[]>(DEFAULT_CELLS);

  // Clutter is the star: extra-dense, extra-tall downtown grid.
  const buildings = useMemo(
    () =>
      generateCity({
        seed: 23,
        blocks: 6,
        blockSize: 26,
        street: 12,
        minHeight: 8,
        maxHeight: 64,
        density: 0.92,
        clearRadius: 20,
      }),
    []
  );

  const clutterGrid = useMemo(() => buildClutterGrid(buildings), [buildings]);

  // Per-cell rx grids are the expensive part — cache by cell id so a new
  // placement or a slider change never recomputes existing cells.
  const rxCache = useRef<Map<number, Float32Array>>(new Map());
  const rxGrids = useMemo(() => {
    const cache = rxCache.current;
    const live = new Set(cells.map((c) => c.id));
    for (const id of Array.from(cache.keys())) {
      if (!live.has(id)) cache.delete(id);
    }
    return cells.map((cell) => {
      let grid = cache.get(cell.id);
      if (!grid) {
        grid = computeRxGrid(cell, buildings);
        cache.set(cell.id, grid);
      }
      return grid;
    });
  }, [cells, buildings]);

  const dominance = useMemo(
    () => computeDominance(rxGrids, clutterGrid, clutterGain),
    [rxGrids, clutterGrid, clutterGain]
  );

  const totalSamples = dominance.margins.length;
  const winPct = dominance.winCounts.map((w) => w / totalSamples);

  const addCell = (x: number, z: number) => {
    setCells((prev) => {
      if (prev.length >= MAX_CELLS) return prev;
      if (Math.abs(x) > FIELD_HALF - 4 || Math.abs(z) > FIELD_HALF - 4)
        return prev;
      // streets only — no poles through building cores
      for (const b of buildings) {
        if (
          Math.abs(x - b.x) < b.width / 2 + 1 &&
          Math.abs(z - b.z) < b.depth / 2 + 1
        )
          return prev;
      }
      if (prev.some((c) => Math.hypot(c.x - x, c.z - z) < 4)) return prev;
      const id = Math.max(0, ...prev.map((c) => c.id)) + 1;
      return [...prev, { id, x, z }];
    });
  };

  return (
    <div className="relative h-full w-full">
      <DemoCanvas
        cameraPosition={[84, 62, 108]}
        target={[0, 6, 0]}
        minDistance={26}
        maxDistance={330}
        fog={{ near: 150, far: 520 }}
      >
        <CityLighting />
        <GroundPlane />
        <CityBuildings buildings={buildings} />
        <NoiseField
          count={particleCount}
          clutterGrid={clutterGrid}
          clutterGain={clutterGain}
          visible={showField}
        />
        <DominanceMap margins={dominance.margins} visible={showMap} />
        <CellMarkers
          cells={cells}
          clutterGrid={clutterGrid}
          winPct={winPct}
          onRemove={(id) =>
            setCells((prev) => prev.filter((c) => c.id !== id))
          }
        />
        {/* click-catcher for cell placement */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          onClick={(e) => {
            if (e.delta > 5) return; // ignore orbit drags
            e.stopPropagation();
            addCell(e.point.x, e.point.z);
          }}
          visible={false}
        >
          <planeGeometry args={[600, 600]} />
          <meshBasicMaterial />
        </mesh>
        <GlowEffects bloomIntensity={1.05} />
      </DemoCanvas>

      <ControlPanel title="Field controls">
        <LabeledSlider
          label="Clutter intensity"
          value={clutterGain}
          onChange={setClutterGain}
          min={0.5}
          max={2}
          step={0.05}
          format={(v) => `${v.toFixed(2)}×`}
        />
        <LabeledSlider
          label="Field density"
          value={particleCount}
          onChange={setParticleCount}
          min={8000}
          max={40000}
          step={2000}
          format={(v) => `${Math.round(v / 1000)}k pts`}
        />
        <ToggleRow
          label="Noise field"
          checked={showField}
          onCheckedChange={setShowField}
        />
        <ToggleRow
          label="Dominance map"
          checked={showMap}
          onCheckedChange={setShowMap}
        />
        <div className="space-y-1.5 rounded-lg border border-white/8 bg-white/[0.03] p-3">
          <StatRow label="Cells placed" value={`${cells.length}/${MAX_CELLS}`} />
          <StatRow
            label="Area with SINR > 0"
            value={`${(dominance.coveredPct * 100).toFixed(1)}%`}
            accent="text-emerald-300"
          />
          <StatRow
            label="Avg margin"
            value={
              dominance.coveredPct > 0
                ? `+${dominance.avgMarginDb.toFixed(1)} dB`
                : "—"
            }
            accent="text-cyan-300"
          />
        </div>
        <ControlHint>
          Click a street to place a small cell (max {MAX_CELLS}); click a cell
          to remove it. Compare how much area the plaza cell wins against the
          canyon cell buried in clutter.
        </ControlHint>
      </ControlPanel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cell markers                                                       */
/* ------------------------------------------------------------------ */

function CellMarkers({
  cells,
  clutterGrid,
  winPct,
  onRemove,
}: {
  cells: Cell[];
  clutterGrid: ClutterGrid;
  winPct: number[];
  onRemove: (id: number) => void;
}) {
  return (
    <group>
      {cells.map((cell, i) => {
        const clutter = sampleClutter(clutterGrid, cell.x, cell.z);
        // chip colour tracks the local environment: cyan clean → rose buried
        const chipColor = `#${qualityColor(1 - clutter).getHexString()}`;
        const headingDeg = radToDeg(Math.atan2(-cell.x, -cell.z));
        return (
          <group
            key={cell.id}
            position={[cell.x, 0, cell.z]}
            onClick={(e) => {
              if (e.delta > 5) return;
              e.stopPropagation();
              onRemove(cell.id);
            }}
          >
            <PoleWithAntenna
              height={POLE_HEIGHT}
              headingDeg={headingDeg}
              accent={RF_COLORS.blue}
              luminaire
            />
            {/* glowing base pad — the click target for removal */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
              <circleGeometry args={[1.6, 32]} />
              <meshBasicMaterial
                color={RF_COLORS.blue}
                transparent
                opacity={0.18}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
              <ringGeometry args={[1.35, 1.6, 48]} />
              <meshBasicMaterial
                color={RF_COLORS.cyan}
                transparent
                opacity={0.5}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {/* readout chip */}
            <Html
              position={[0, POLE_HEIGHT + 4.2, 0]}
              center
              distanceFactor={70}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  background: "rgba(10, 20, 40, 0.88)",
                  border: `1px solid ${chipColor}66`,
                  borderRadius: 8,
                  padding: "3px 8px",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  color: chipColor,
                  whiteSpace: "nowrap",
                  backdropFilter: "blur(4px)",
                }}
              >
                clutter {Math.round(clutter * 100)}% · wins{" "}
                {Math.round((winPct[i] ?? 0) * 100)}%
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
