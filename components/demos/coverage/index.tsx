"use client";

import { useMemo, useRef, useState } from "react";

import { generateCity } from "@/lib/three-utils";
import { Button } from "@/components/ui/button";
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
import { CoverageField } from "./CoverageField";
import { CellMarkers } from "./CellMarkers";
import {
  type ActiveCell,
  FIELD_SIZE,
  ROLLOUT,
  buildMask,
  computeContribution,
  computeCoverageStats,
} from "./coverage-model";

const MAX_CUSTOM = 6;
const CUSTOM_POLE_HEIGHT = 9;
const DEFAULT_STEP = 5;
/** Stagger between two cells activated by one densify click, ms. */
const ACTIVATION_STAGGER_MS = 380;

/** Demo 03 — Volumetric Coverage Growth. */
export default function CoverageDemo() {
  const [step, setStep] = useState(DEFAULT_STEP);
  const [customCells, setCustomCells] = useState<
    { id: string; x: number; z: number }[]
  >([]);
  const [showField, setShowField] = useState(true);
  const [showCells, setShowCells] = useState(true);

  const customIdRef = useRef(0);
  /** Activation timestamps by cell id — cleared when a cell deactivates
   *  so scrubbing back and forth replays the bloom-in. */
  const activationRef = useRef(new Map<string, number>());
  /** Per-cell contribution grids, computed once per cell id and cached. */
  const gridCacheRef = useRef(new Map<string, Float32Array>());

  const buildings = useMemo(
    () =>
      generateCity({
        seed: 21,
        blocks: 6,
        blockSize: 26,
        street: 12,
        minHeight: 8,
        maxHeight: 52,
        density: 0.85,
        clearRadius: 12,
      }),
    []
  );

  const { mask, streetIdx } = useMemo(() => buildMask(buildings), [buildings]);

  const activeCells: ActiveCell[] = useMemo(() => {
    const sites: ActiveCell[] = [
      ...ROLLOUT.slice(0, step).map((s, i) => ({
        ...s,
        id: `seq-${i}`,
        custom: false,
        activatedAt: 0,
      })),
      ...customCells.map((c) => ({
        id: c.id,
        x: c.x,
        z: c.z,
        poleHeight: CUSTOM_POLE_HEIGHT,
        custom: true,
        activatedAt: 0,
      })),
    ];
    const times = activationRef.current;
    const ids = new Set(sites.map((s) => s.id));
    for (const key of Array.from(times.keys())) {
      if (!ids.has(key)) times.delete(key);
    }
    const now = performance.now();
    let fresh = 0;
    for (const site of sites) {
      let t = times.get(site.id);
      if (t === undefined) {
        t = now + fresh * ACTIVATION_STAGGER_MS;
        fresh++;
        times.set(site.id, t);
      }
      site.activatedAt = t;
    }
    return sites;
  }, [step, customCells]);

  const grids = useMemo(
    () =>
      activeCells.map((cell) => {
        let grid = gridCacheRef.current.get(cell.id);
        if (!grid) {
          grid = computeContribution(cell, buildings, mask);
          gridCacheRef.current.set(cell.id, grid);
        }
        return grid;
      }),
    [activeCells, buildings, mask]
  );

  const stats = useMemo(() => {
    let newest = -1;
    for (let i = 0; i < activeCells.length; i++) {
      if (
        newest < 0 ||
        activeCells[i].activatedAt >= activeCells[newest].activatedAt
      ) {
        newest = i;
      }
    }
    return computeCoverageStats(grids, newest, streetIdx);
  }, [grids, activeCells, streetIdx]);

  const densify = () =>
    setStep((s) => Math.min(ROLLOUT.length, s + (s < 6 ? 2 : 1)));

  const addCustomCell = (x: number, z: number) => {
    if (customCells.length >= MAX_CUSTOM) return;
    const half = FIELD_SIZE / 2;
    if (Math.abs(x) > half - 3 || Math.abs(z) > half - 3) return;
    // no poles inside buildings or on top of an existing site
    for (const b of buildings) {
      if (
        Math.abs(x - b.x) < b.width / 2 + 1.2 &&
        Math.abs(z - b.z) < b.depth / 2 + 1.2
      ) {
        return;
      }
    }
    for (const c of activeCells) {
      if (Math.hypot(x - c.x, z - c.z) < 5) return;
    }
    const id = `custom-${customIdRef.current++}`;
    setCustomCells((prev) =>
      prev.length >= MAX_CUSTOM ? prev : [...prev, { id, x, z }]
    );
  };

  const removeCustomCell = (id: string) =>
    setCustomCells((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="relative h-full w-full">
      <DemoCanvas
        cameraPosition={[100, 88, 118]}
        target={[0, 2, 0]}
        minDistance={30}
        maxDistance={340}
        fog={{ near: 160, far: 520 }}
      >
        <CityLighting />
        <GroundPlane />
        <CityBuildings buildings={buildings} />
        <CoverageField
          cells={activeCells}
          grids={grids}
          streetIdx={streetIdx}
          visible={showField}
        />
        {showCells && (
          <CellMarkers cells={activeCells} onRemove={removeCustomCell} />
        )}
        {/* click-catcher for custom cell placement */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          onClick={(e) => {
            if (e.delta > 5) return; // ignore orbit drags
            e.stopPropagation();
            addCustomCell(e.point.x, e.point.z);
          }}
          visible={false}
        >
          <planeGeometry args={[600, 600]} />
          <meshBasicMaterial />
        </mesh>
        <GlowEffects bloomIntensity={1.1} />
      </DemoCanvas>

      <ControlPanel title="Deployment controls">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={densify}
            disabled={step >= ROLLOUT.length}
          >
            Densify +
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => setCustomCells([])}
            disabled={customCells.length === 0}
          >
            Clear custom
          </Button>
        </div>
        <LabeledSlider
          label="Deployment step"
          value={step}
          onChange={setStep}
          min={0}
          max={ROLLOUT.length}
          format={(v) => `${v} / ${ROLLOUT.length}`}
        />
        <ToggleRow
          label="Coverage field"
          checked={showField}
          onCheckedChange={setShowField}
        />
        <ToggleRow
          label="Cell markers"
          checked={showCells}
          onCheckedChange={setShowCells}
        />
        <div className="space-y-1.5 rounded-md border border-ink/20 bg-ink/[0.04] p-3">
          <StatRow
            label="Cells active"
            value={`${activeCells.length}`}
            accent="text-sky-700"
          />
          <StatRow
            label="Street area covered"
            value={`${stats.coveredPct.toFixed(1)} %`}
            accent="text-teal-700"
          />
          <StatRow
            label="Newest cell fills"
            value={
              activeCells.length > 0
                ? `+${stats.newestGainPts.toFixed(1)} pts`
                : "—"
            }
            accent="text-violet-700"
          />
        </div>
        <ControlHint>
          Click a street to drop a custom cell (max {MAX_CUSTOM}); click a
          custom cell to remove it. Scrub the timeline to replay the rollout —
          streets count as covered above −95 dBm at 3.5 GHz.
        </ControlHint>
      </ControlPanel>
    </div>
  );
}
