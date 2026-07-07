"use client";

/**
 * Coverage-field model for Demo 03 — Volumetric Coverage Growth.
 *
 * A fixed NxN sample grid at receiver height covers the city footprint.
 * Each small cell contributes one Float32Array of normalized received
 * power (0..1 over the display ramp), computed ONCE when the cell first
 * activates and cached by the caller — never per frame.
 */
import { type Building, clamp, rxPowerDbm } from "@/lib/three-utils";

/* ------------------------------------------------------------------ */
/*  Grid + RF constants                                                 */
/* ------------------------------------------------------------------ */

/** Samples per axis of the street-level heat field. */
export const GRID_N = 88;
/** Side length of the sampled area, metres (city spans ~±108 m). */
export const FIELD_SIZE = 220;
/** Receiver (pedestrian handset) height, metres. */
export const RX_HEIGHT = 1.5;
export const FREQ_GHZ = 3.5;
/** Small-cell EIRP-ish transmit power, dBm. */
export const TX_EIRP_DBM = 30;
/** Loss per obstructing building, dB (dense mid-band urban blockage). */
export const PENETRATION_DB = 26;
/** Display ramp: dBm mapped to 0..1 for the qualityColor LUT. */
export const RAMP_MIN_DBM = -100;
export const RAMP_MAX_DBM = -58;
/** A street sample counts as covered above this received power. */
export const COVERAGE_THRESHOLD_DBM = -95;
export const COVERAGE_T =
  (COVERAGE_THRESHOLD_DBM - RAMP_MIN_DBM) / (RAMP_MAX_DBM - RAMP_MIN_DBM);
/** Duration of one cell's bloom-in reveal, ms. */
export const BLOOM_MS = 1200;

const HALF = FIELD_SIZE / 2;
const STEP = FIELD_SIZE / GRID_N;

/** World x of sample column ix. */
export function sampleX(ix: number): number {
  return -HALF + (ix + 0.5) * STEP;
}

/**
 * World z of sample row iz. Rows are flipped so row 0 (texture v = 0,
 * plane local -y) lands at world +z after the plane's -90° X rotation.
 */
export function sampleZ(iz: number): number {
  return HALF - (iz + 0.5) * STEP;
}

/** Precomputed per-axis sample coordinates (hot-loop lookups). */
export const SAMPLE_XS = (() => {
  const a = new Float32Array(GRID_N);
  for (let i = 0; i < GRID_N; i++) a[i] = sampleX(i);
  return a;
})();
export const SAMPLE_ZS = (() => {
  const a = new Float32Array(GRID_N);
  for (let i = 0; i < GRID_N; i++) a[i] = sampleZ(i);
  return a;
})();

/* ------------------------------------------------------------------ */
/*  Cell sites + deterministic rollout                                  */
/* ------------------------------------------------------------------ */

export interface CellSite {
  x: number;
  z: number;
  poleHeight: number;
  /** Taller monopole (early sparse sites). */
  macro?: boolean;
}

export interface ActiveCell extends CellSite {
  id: string;
  /** performance.now() timestamp when the cell switched on. */
  activatedAt: number;
  custom: boolean;
}

/**
 * Hardcoded plausible rollout: two sparse macro-ish corner monopoles,
 * then the central plaza, then high-yield canyon intersections, the
 * remaining corners, mid-edge street sites, and a final deep-canyon
 * infill. All positions sit on street centrelines of the seed-21 grid
 * (streets at ±76, ±38, 0). Ordered so per-step coverage gains shrink
 * — the classic densification diminishing-returns curve.
 */
export const ROLLOUT: CellSite[] = [
  { x: -76, z: -76, poleHeight: 13, macro: true },
  { x: 76, z: 76, poleHeight: 13, macro: true },
  { x: 0, z: 0, poleHeight: 9 },
  { x: -38, z: 38, poleHeight: 9 },
  { x: 38, z: -38, poleHeight: 9 },
  { x: 76, z: -76, poleHeight: 9 },
  { x: -76, z: 76, poleHeight: 9 },
  { x: 76, z: 0, poleHeight: 9 },
  { x: 0, z: -76, poleHeight: 9 },
  { x: -76, z: 0, poleHeight: 9 },
  { x: 0, z: 76, poleHeight: 9 },
  { x: 38, z: 57, poleHeight: 9 },
];

/* ------------------------------------------------------------------ */
/*  Building mask                                                       */
/* ------------------------------------------------------------------ */

/**
 * Mark samples inside building footprints (excluded from coverage stats
 * and painted dark in the texture) and list the remaining street samples.
 */
export function buildMask(buildings: Building[]): {
  mask: Uint8Array;
  streetIdx: Uint32Array;
} {
  const mask = new Uint8Array(GRID_N * GRID_N);
  for (let iz = 0; iz < GRID_N; iz++) {
    const z = SAMPLE_ZS[iz];
    for (let ix = 0; ix < GRID_N; ix++) {
      const x = SAMPLE_XS[ix];
      for (const b of buildings) {
        if (
          Math.abs(x - b.x) < b.width / 2 &&
          Math.abs(z - b.z) < b.depth / 2
        ) {
          mask[iz * GRID_N + ix] = 1;
          break;
        }
      }
    }
  }
  const street: number[] = [];
  for (let i = 0; i < mask.length; i++) if (!mask[i]) street.push(i);
  return { mask, streetIdx: new Uint32Array(street) };
}

/* ------------------------------------------------------------------ */
/*  Per-cell contribution grid                                          */
/* ------------------------------------------------------------------ */

/**
 * Compute one cell's contribution over the whole grid: rxPowerDbm at
 * 3.5 GHz with an 18 dB penalty per obstructing building, normalized to
 * the display ramp. The obstruction count is an inlined, flat-array
 * batch version of `segmentIntersectsBuilding` (same slab method) so a
 * full 88×88 grid stays in the low-millisecond range.
 */
export function computeContribution(
  cell: CellSite,
  buildings: Building[],
  mask: Uint8Array
): Float32Array {
  const grid = new Float32Array(GRID_N * GRID_N);
  const nB = buildings.length;
  // pack AABBs flat: minX, maxX, minZ, maxZ, height
  const bb = new Float32Array(nB * 5);
  for (let b = 0; b < nB; b++) {
    const o = b * 5;
    bb[o] = buildings[b].x - buildings[b].width / 2;
    bb[o + 1] = buildings[b].x + buildings[b].width / 2;
    bb[o + 2] = buildings[b].z - buildings[b].depth / 2;
    bb[o + 3] = buildings[b].z + buildings[b].depth / 2;
    bb[o + 4] = buildings[b].height;
  }

  const x0 = cell.x;
  const z0 = cell.z;
  const y0 = cell.poleHeight + 0.75; // antenna phase centre (shroud)
  const dy = RX_HEIGHT - y0; // always negative

  for (let iz = 0; iz < GRID_N; iz++) {
    const z1 = SAMPLE_ZS[iz];
    const dz = z1 - z0;
    const invDz = Math.abs(dz) < 1e-9 ? Infinity : 1 / dz;
    for (let ix = 0; ix < GRID_N; ix++) {
      const i = iz * GRID_N + ix;
      if (mask[i]) continue; // inside a building — stays dark
      const x1 = SAMPLE_XS[ix];
      const dx = x1 - x0;
      const invDx = Math.abs(dx) < 1e-9 ? Infinity : 1 / dx;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      let obs = 0;
      for (let b = 0; b < nB; b++) {
        const o = b * 5;
        let tmin = 0;
        let tmax = 1;
        // X slab
        if (invDx === Infinity) {
          if (x0 < bb[o] || x0 > bb[o + 1]) continue;
        } else {
          let t1 = (bb[o] - x0) * invDx;
          let t2 = (bb[o + 1] - x0) * invDx;
          if (t1 > t2) {
            const tt = t1;
            t1 = t2;
            t2 = tt;
          }
          if (t1 > tmin) tmin = t1;
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax) continue;
        }
        // Z slab
        if (invDz === Infinity) {
          if (z0 < bb[o + 2] || z0 > bb[o + 3]) continue;
        } else {
          let t1 = (bb[o + 2] - z0) * invDz;
          let t2 = (bb[o + 3] - z0) * invDz;
          if (t1 > t2) {
            const tt = t1;
            t1 = t2;
            t2 = tt;
          }
          if (t1 > tmin) tmin = t1;
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax) continue;
        }
        // Y slab: box spans [0, h]; ray descends from y0 to RX_HEIGHT > 0,
        // so only the "y <= h" bound can constrain (flips sign as dy < 0).
        const h = bb[o + 4];
        if (h < y0) {
          const tY = (h - y0) / dy;
          if (tY > tmin) tmin = tY;
          if (tmin > tmax) continue;
        }
        obs++;
      }

      const dbm = rxPowerDbm(TX_EIRP_DBM, dist, FREQ_GHZ, obs, PENETRATION_DB);
      grid[i] = clamp(
        (dbm - RAMP_MIN_DBM) / (RAMP_MAX_DBM - RAMP_MIN_DBM),
        0,
        1
      );
    }
  }
  return grid;
}

/* ------------------------------------------------------------------ */
/*  Coverage statistics                                                 */
/* ------------------------------------------------------------------ */

/**
 * Fraction of street samples above the coverage threshold, plus the
 * percentage-point gain contributed by the most recently activated cell
 * (coverage with all cells minus coverage without the newest one).
 */
export function computeCoverageStats(
  grids: Float32Array[],
  newestIndex: number,
  streetIdx: Uint32Array
): { coveredPct: number; newestGainPts: number } {
  const total = streetIdx.length;
  if (total === 0 || grids.length === 0) {
    return { coveredPct: 0, newestGainPts: 0 };
  }
  let covered = 0;
  let coveredExcl = 0;
  for (let k = 0; k < total; k++) {
    const i = streetIdx[k];
    let best = 0;
    let bestExcl = 0;
    for (let c = 0; c < grids.length; c++) {
      const v = grids[c][i];
      if (v > best) best = v;
      if (c !== newestIndex && v > bestExcl) bestExcl = v;
    }
    if (best >= COVERAGE_T) covered++;
    if (bestExcl >= COVERAGE_T) coveredExcl++;
  }
  return {
    coveredPct: (covered / total) * 100,
    newestGainPts: ((covered - coveredExcl) / total) * 100,
  };
}
