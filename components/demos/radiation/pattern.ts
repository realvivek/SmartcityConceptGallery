"use client";

/**
 * RF math + shared constants for Demo 05 — Antenna Pattern on a Pole.
 *
 * The panel antenna is modelled as the classic 3GPP-style parabolic
 * (gaussian-in-dB) pattern: a forward main lobe shaped by horizontal /
 * vertical beamwidth with electrical downtilt, plus a small back lobe,
 * clamped at a -28 dB floor.
 */
import * as THREE from "three";
import {
  type Building,
  clamp,
  fsplDb,
  qualityColor,
  radToDeg,
} from "@/lib/three-utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const FLOOR_DB = -28; // pattern floor (dB relative to peak)
export const BACK_LOBE_DB = -18; // back-lobe peak (dB relative to peak)
export const TX_POWER_DBM = 33; // fixed conducted power
export const FREQ_GHZ = 3.5;
export const POLE_HEIGHT = 10;
export const PHASE_CENTRE_Y = 11.5; // antenna phase centre (m)

/** Street canyon extents (street runs along the Z axis). */
export const STREET_HALF_WIDTH = 16;
export const STREET_HALF_LENGTH = 46;

/**
 * Hand-built urban canyon: two long walls flanking the street, each
 * split into two segments with a small mid-block gap.
 */
export const CANYON_BUILDINGS: Building[] = [
  { x: -24, z: -23.5, width: 14, depth: 44, height: 30 },
  { x: -24, z: 23.5, width: 14, depth: 44, height: 27 },
  { x: 24, z: -23.5, width: 14, depth: 44, height: 34 },
  { x: 24, z: 23.5, width: 14, depth: 44, height: 26 },
];

/* ------------------------------------------------------------------ */
/*  Pattern gain                                                       */
/* ------------------------------------------------------------------ */

/** Wrap an angle in degrees to [-180, 180]. */
export function wrapDeg(a: number): number {
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

/**
 * Panel-antenna relative gain in dB (0 dB at the beam peak).
 * @param azOffDeg azimuth measured from boresight (degrees)
 * @param elDeg elevation of the observation direction (degrees, +up)
 * @param hBWDeg horizontal 3 dB beamwidth
 * @param vBWDeg vertical 3 dB beamwidth
 * @param downtiltDeg electrical downtilt (beam peak sits at el = -downtilt)
 */
export function panelGainDb(
  azOffDeg: number,
  elDeg: number,
  hBWDeg: number,
  vBWDeg: number,
  downtiltDeg: number
): number {
  const dAz = wrapDeg(azOffDeg);
  const vTerm = -12 * Math.pow((elDeg + downtiltDeg) / vBWDeg, 2);
  const front = -12 * Math.pow(dAz / hBWDeg, 2) + vTerm;
  const backAz = wrapDeg(dAz - 180);
  const back = BACK_LOBE_DB - 12 * Math.pow(backAz / hBWDeg, 2) + vTerm;
  return Math.max(Math.max(front, back), FLOOR_DB);
}

/** Kraus approximation: directivity in dBi from the two beamwidths. */
export function directivityDbi(hBWDeg: number, vBWDeg: number): number {
  return 10 * Math.log10(41253 / (hBWDeg * vBWDeg));
}

/**
 * Map a relative gain (dB) to a surface radius.
 * Log scale (datasheet-style): radius linear in dB above the floor.
 * Linear scale: radius proportional to field amplitude 10^(dB/20).
 */
export function radiusForDb(
  db: number,
  maxRadius: number,
  linearScale: boolean
): number {
  if (linearScale) return maxRadius * Math.pow(10, db / 20);
  return (maxRadius * (db - FLOOR_DB)) / -FLOOR_DB;
}

/* ------------------------------------------------------------------ */
/*  Street energy footprint                                            */
/* ------------------------------------------------------------------ */

const X_STEPS = 24;
const Z_STEPS = 64;
const RX_SAMPLE_HEIGHT = 1.5; // street-level receiver height (m)
const GOOD_DBM = -42; // full colour / brightness
const BAD_DBM = -72; // rose end of the quality ramp
const FADE_DBM = -78; // fades to invisible below this

export interface StreetField {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  /** Metres of street where delivered power is within 3 dB of the max. */
  threeDbLengthM: number;
  maxRxDbm: number;
}

/**
 * Sample delivered power over the canyon floor:
 * rx = peak EIRP + G(direction to sample) - FSPL(dist, 3.5 GHz).
 * Returns vertex-coloured grid data (quality ramp, additive-friendly:
 * weak samples fade to black) plus the 3 dB street-length stat.
 */
export function computeStreetField(
  azimuthDeg: number,
  downtiltDeg: number,
  hBWDeg: number,
  vBWDeg: number
): StreetField {
  const cols = X_STEPS + 1;
  const rows = Z_STEPS + 1;
  const positions = new Float32Array(cols * rows * 3);
  const colors = new Float32Array(cols * rows * 3);
  const rx = new Float32Array(cols * rows);
  const rowMax = new Float32Array(rows).fill(-Infinity);

  const eirpDbm = TX_POWER_DBM + directivityDbi(hBWDeg, vBWDeg);
  const dy = RX_SAMPLE_HEIGHT - PHASE_CENTRE_Y;
  let maxRxDbm = -Infinity;

  for (let zi = 0; zi < rows; zi++) {
    const z = -STREET_HALF_LENGTH + (2 * STREET_HALF_LENGTH * zi) / Z_STEPS;
    for (let xi = 0; xi < cols; xi++) {
      const x = -STREET_HALF_WIDTH + (2 * STREET_HALF_WIDTH * xi) / X_STEPS;
      const horiz = Math.hypot(x, z);
      const dist = Math.hypot(horiz, dy);
      const azDeg = radToDeg(Math.atan2(x, z));
      const elDeg = radToDeg(Math.atan2(dy, horiz));
      const g = panelGainDb(
        azDeg - azimuthDeg,
        elDeg,
        hBWDeg,
        vBWDeg,
        downtiltDeg
      );
      const rxDbm = eirpDbm + g - fsplDb(dist, FREQ_GHZ);

      const i = zi * cols + xi;
      rx[i] = rxDbm;
      if (rxDbm > maxRxDbm) maxRxDbm = rxDbm;
      if (rxDbm > rowMax[zi]) rowMax[zi] = rxDbm;

      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = z;
    }
  }

  const color = new THREE.Color();
  for (let i = 0; i < rx.length; i++) {
    const t = clamp((rx[i] - BAD_DBM) / (GOOD_DBM - BAD_DBM), 0, 1);
    qualityColor(t, color);
    // additive blending: fading toward black makes weak samples vanish
    const glow = clamp((rx[i] - FADE_DBM) / (GOOD_DBM - FADE_DBM), 0, 1);
    color.multiplyScalar(0.95 * Math.pow(glow, 1.6));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const indices = new Uint32Array(X_STEPS * Z_STEPS * 6);
  let k = 0;
  for (let zi = 0; zi < Z_STEPS; zi++) {
    for (let xi = 0; xi < X_STEPS; xi++) {
      const a = zi * cols + xi;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }

  const dz = (2 * STREET_HALF_LENGTH) / Z_STEPS;
  let litRows = 0;
  for (let zi = 0; zi < rows; zi++) {
    if (rowMax[zi] >= maxRxDbm - 3) litRows++;
  }

  return {
    positions,
    colors,
    indices,
    threeDbLengthM: litRows * dz,
    maxRxDbm,
  };
}
