"use client";

import { useMemo, useState } from "react";

import { RF_COLORS } from "@/lib/three-utils";
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
  BACK_LOBE_DB,
  CANYON_BUILDINGS,
  POLE_HEIGHT,
  TX_POWER_DBM,
  computeStreetField,
  directivityDbi,
} from "./pattern";
import { PatternSurface } from "./PatternSurface";
import { GainRings } from "./GainRings";
import { StreetFootprint } from "./StreetFootprint";

/** Demo 05 — Antenna Pattern on a Pole. */
export default function RadiationDemo() {
  const [azimuthDeg, setAzimuthDeg] = useState(0); // 0 = along the canyon
  const [downtiltDeg, setDowntiltDeg] = useState(6);
  const [hBWDeg, setHBWDeg] = useState(65);
  const [vBWDeg, setVBWDeg] = useState(10);
  const [patternScale, setPatternScale] = useState(16);
  const [linearScale, setLinearScale] = useState(false);
  const [showRings, setShowRings] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);

  // Delivered power over the canyon floor — also feeds the 3 dB
  // street-length stat, so it is computed even when the stripe is off.
  const streetField = useMemo(
    () => computeStreetField(azimuthDeg, downtiltDeg, hBWDeg, vBWDeg),
    [azimuthDeg, downtiltDeg, hBWDeg, vBWDeg]
  );

  const peakEirpDbm = TX_POWER_DBM + directivityDbi(hBWDeg, vBWDeg);
  const frontToBackDb = -BACK_LOBE_DB;

  return (
    <div className="relative h-full w-full">
      <DemoCanvas
        cameraPosition={[26, 18, 34]}
        target={[0, 8, 0]}
        minDistance={8}
        maxDistance={120}
        fog={{ near: 90, far: 320 }}
      >
        <CityLighting />
        <GroundPlane />
        <CityBuildings buildings={CANYON_BUILDINGS} />
        <PoleWithAntenna
          height={POLE_HEIGHT}
          headingDeg={azimuthDeg}
          accent={RF_COLORS.emerald}
          luminaire
          detailed
        />
        <PatternSurface
          azimuthDeg={azimuthDeg}
          downtiltDeg={downtiltDeg}
          hBWDeg={hBWDeg}
          vBWDeg={vBWDeg}
          maxRadius={patternScale}
          linearScale={linearScale}
        />
        {showRings && (
          <GainRings maxRadius={patternScale} linearScale={linearScale} />
        )}
        {showFootprint && <StreetFootprint field={streetField} />}
        <GlowEffects bloomIntensity={1.15} />
      </DemoCanvas>

      <ControlPanel title="Pattern controls">
        <LabeledSlider
          label="Pattern azimuth"
          value={azimuthDeg}
          onChange={setAzimuthDeg}
          min={-180}
          max={180}
          format={(v) => `${v > 0 ? "+" : ""}${v}°`}
        />
        <LabeledSlider
          label="Downtilt"
          value={downtiltDeg}
          onChange={setDowntiltDeg}
          min={0}
          max={16}
          format={(v) => `${v}°`}
        />
        <LabeledSlider
          label="Horizontal beamwidth"
          value={hBWDeg}
          onChange={setHBWDeg}
          min={35}
          max={110}
          format={(v) => `${v}°`}
        />
        <LabeledSlider
          label="Vertical beamwidth"
          value={vBWDeg}
          onChange={setVBWDeg}
          min={6}
          max={30}
          format={(v) => `${v}°`}
        />
        <LabeledSlider
          label="Pattern scale"
          value={patternScale}
          onChange={setPatternScale}
          min={8}
          max={30}
          format={(v) => `${v} m`}
        />
        <ToggleRow
          label="Linear gain scale"
          checked={linearScale}
          onCheckedChange={setLinearScale}
        />
        <ToggleRow
          label="Gain rings"
          checked={showRings}
          onCheckedChange={setShowRings}
        />
        <ToggleRow
          label="Street footprint"
          checked={showFootprint}
          onCheckedChange={setShowFootprint}
        />
        <div className="space-y-1.5 rounded-lg border border-white/8 bg-white/[0.03] p-3">
          <StatRow
            label="Peak EIRP"
            value={`${peakEirpDbm.toFixed(1)} dBm`}
            accent="text-emerald-300"
          />
          <StatRow
            label="Front-to-back"
            value={`${frontToBackDb.toFixed(0)} dB`}
            accent="text-purple-300"
          />
          <StatRow
            label="3 dB street length"
            value={`${streetField.threeDbLengthM.toFixed(0)} m`}
            accent="text-cyan-300"
          />
        </div>
        <ControlHint>
          Aim the lobe down the canyon (0°), then across it (±90°) — the
          street footprint stretches along the block or splashes onto the
          façades. More downtilt pulls the hotspot toward the pole.
        </ControlHint>
      </ControlPanel>
    </div>
  );
}
