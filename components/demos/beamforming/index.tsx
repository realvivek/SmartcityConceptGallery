"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";

import {
  RF_COLORS,
  fsplDb,
  generateCityScape,
  halfPowerBeamwidthDeg,
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
import { PoleWithAntenna } from "@/components/three/PoleWithAntenna";
import { BeamLobe } from "./BeamLobe";
import { UEMarkers, type UE } from "./UEMarkers";

const ANTENNA_HEIGHT = 10.75; // pole height + shroud offset
const FREQ_GHZ = 3.5;
const MAX_UES = 10;

const DEFAULT_UES: UE[] = [
  { id: 1, x: 8, z: 34 },
  { id: 2, x: -20, z: 44 },
  { id: 3, x: 30, z: 52 },
  { id: 4, x: -42, z: 18 },
];

/** Demo 01 — Urban Beamforming Lobes. */
export default function BeamformingDemo() {
  const [elements, setElements] = useState(8);
  const [steerDeg, setSteerDeg] = useState(18);
  const [spacing, setSpacing] = useState(0.5);
  const [txPower, setTxPower] = useState(33);
  const [showRings, setShowRings] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);
  const [ues, setUes] = useState<UE[]>(DEFAULT_UES);

  const scape = useMemo(
    () =>
      generateCityScape({
        seed: 11,
        blocks: 5,
        blockSize: 24,
        street: 15,
        maxHeight: 44,
        minHeight: 7,
        clearRadius: 20,
      }),
    []
  );
  const buildings = scape.buildings;

  const antennaPos = useMemo(
    () => new THREE.Vector3(0, ANTENNA_HEIGHT, 0),
    []
  );

  const hpbw = halfPowerBeamwidthDeg(elements, spacing, steerDeg);
  const arrayGainDb = 10 * Math.log10(elements);

  const addUe = (x: number, z: number) => {
    setUes((prev) => {
      if (prev.length >= MAX_UES) return prev;
      const id = Math.max(0, ...prev.map((u) => u.id)) + 1;
      return [...prev, { id, x, z }];
    });
  };

  return (
    <div className="relative h-full w-full">
      <DemoCanvas
        cameraPosition={[54, 44, 92]}
        target={[0, 6, 14]}
        minDistance={18}
        maxDistance={240}
      >
        <CityLighting />
        <CityScape data={scape} />
        <PoleWithAntenna
          height={9}
          headingDeg={0}
          accent={RF_COLORS.blue}
          luminaire
        />
        <BeamLobe
          elements={elements}
          spacingLambda={spacing}
          steerDeg={steerDeg}
          height={ANTENNA_HEIGHT}
          groundFootprint={showFootprint}
        />
        {showRings && (
          <PathLossRings txPowerDbm={txPower + arrayGainDb} steerDeg={steerDeg} />
        )}
        <UEMarkers
          ues={ues}
          buildings={buildings}
          antennaPos={antennaPos}
          elements={elements}
          spacingLambda={spacing}
          steerDeg={steerDeg}
          txPowerDbm={txPower}
          freqGHz={FREQ_GHZ}
          onRemove={(id) => setUes((prev) => prev.filter((u) => u.id !== id))}
        />
        {/* click-catcher for UE placement */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          onClick={(e) => {
            if (e.delta > 5) return; // ignore orbit drags
            e.stopPropagation();
            addUe(e.point.x, e.point.z);
          }}
          visible={false}
        >
          <planeGeometry args={[600, 600]} />
          <meshBasicMaterial />
        </mesh>
        <GlowEffects bloomIntensity={1.15} />
      </DemoCanvas>

      <ControlPanel title="Array controls">
        <LabeledSlider
          label="Array elements"
          value={elements}
          onChange={setElements}
          min={2}
          max={16}
          format={(v) => `${v} el`}
        />
        <LabeledSlider
          label="Steering angle"
          value={steerDeg}
          onChange={setSteerDeg}
          min={-60}
          max={60}
          format={(v) => `${v > 0 ? "+" : ""}${v}°`}
        />
        <LabeledSlider
          label="Element spacing"
          value={spacing}
          onChange={setSpacing}
          min={0.4}
          max={0.7}
          step={0.05}
          format={(v) => `${v.toFixed(2)} λ`}
        />
        <LabeledSlider
          label="Tx power"
          value={txPower}
          onChange={setTxPower}
          min={24}
          max={40}
          format={(v) => `${v} dBm`}
        />
        <ToggleRow
          label="Path-loss rings"
          checked={showRings}
          onCheckedChange={setShowRings}
        />
        <ToggleRow
          label="Ground footprint"
          checked={showFootprint}
          onCheckedChange={setShowFootprint}
        />
        <div className="space-y-1.5 rounded-md border border-ink/20 bg-ink/[0.04] p-3">
          <StatRow label="Half-power beamwidth" value={`${hpbw.toFixed(1)}°`} />
          <StatRow
            label="Array gain"
            value={`+${arrayGainDb.toFixed(1)} dB`}
            accent="text-violet-700"
          />
          <StatRow
            label="Users in scene"
            value={`${ues.length}/${MAX_UES}`}
            accent="text-sky-700"
          />
        </div>
        <ControlHint>
          Click a street to drop a user terminal; click a terminal to remove
          it. Chips show received power at 3.5 GHz.
        </ControlHint>
      </ControlPanel>
    </div>
  );
}

/** Concentric range rings with received-power labels along boresight. */
function PathLossRings({
  txPowerDbm,
  steerDeg,
}: {
  txPowerDbm: number;
  steerDeg: number;
}) {
  const rings = [30, 60, 90];
  const azRad = (steerDeg * Math.PI) / 180;
  return (
    <group>
      {rings.map((r) => (
        <group key={r}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <ringGeometry args={[r - 0.25, r + 0.25, 128]} />
            <meshBasicMaterial
              color={RF_COLORS.blue}
              transparent
              opacity={0.45}
              blending={THREE.NormalBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <Html
            position={[Math.sin(azRad) * r, 1.3, Math.cos(azRad) * r]}
            center
            distanceFactor={70}
            style={{ pointerEvents: "none" }}
          >
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                color: "#4338ca",
                background: "rgba(253, 252, 247, 0.94)",
                padding: "2px 6px",
                borderRadius: 2,
                border: "1px solid rgba(79, 70, 229, 0.45)",
                boxShadow: "2px 2px 0 rgba(36, 52, 77, 0.18)",
                whiteSpace: "nowrap",
              }}
            >
              {r} m · {(txPowerDbm - fsplDb(r, FREQ_GHZ)).toFixed(0)} dBm
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
