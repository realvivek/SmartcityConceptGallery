"use client";

/**
 * Field math for Demo 04 — Interference Noise Field.
 *
 * Everything here is pure + deterministic so results are cache-friendly:
 * - a bilinearly-sampled clutter grid (building-mass proxy),
 * - per-cell received-power grids (FSPL + obstruction penalty),
 * - a dominance pass comparing best carrier vs the local clutter noise floor.
 */
import * as THREE from "three";
import {
  type Building,
  clamp,
  clutterFactor,
  countObstructions,
  lerp,
  rxPowerDbm,
} from "@/lib/three-utils";

/* ------------------------------------------------------------------ */
/*  Tuning constants                                                   */
/* ------------------------------------------------------------------ */

/** Half-extent of the analysed ground field (m). */
export const FIELD_HALF = 110;
/** Ceiling of the volumetric noise haze (m). */
export const FIELD_CEILING = 26;
/** Dominance-map sample resolution (GRID_N × GRID_N). */
export const GRID_N = 80;
/** Clutter proxy grid resolution. */
export const CLUTTER_N = 96;

export const TX_POWER_DBM = 36; // EIRP-ish small-cell power
export const FREQ_GHZ = 3.5;
export const POLE_HEIGHT = 9;
export const ANTENNA_HEIGHT = 10.75; // pole + shroud phase centre
export const SAMPLE_HEIGHT = 1.5; // street-level receiver height
export const MAX_CELLS = 6;

/** Noise-floor proxy endpoints: open street → dense urban core. */
const NOISE_FLOOR_CLEAR_DBM = -100;
const NOISE_FLOOR_DENSE_DBM = -78;

export interface Cell {
  id: number;
  x: number;
  z: number;
}

/* ------------------------------------------------------------------ */
/*  Clutter grid                                                       */
/* ------------------------------------------------------------------ */

export interface ClutterGrid {
  data: Float32Array;
  n: number;
  half: number;
}

/** World coordinate of grid index i on an n-point axis spanning ±half. */
function gridCoord(i: number, n: number, half: number): number {
  return -half + (2 * half * i) / (n - 1);
}

/** Precompute clutterFactor over the field once per city. */
export function buildClutterGrid(
  buildings: Building[],
  n = CLUTTER_N,
  half = FIELD_HALF
): ClutterGrid {
  const data = new Float32Array(n * n);
  for (let iz = 0; iz < n; iz++) {
    const z = gridCoord(iz, n, half);
    for (let ix = 0; ix < n; ix++) {
      data[iz * n + ix] = clutterFactor(gridCoord(ix, n, half), z, buildings);
    }
  }
  return { data, n, half };
}

/** Bilinear clutter sample at a world (x, z). */
export function sampleClutter(grid: ClutterGrid, x: number, z: number): number {
  const { data, n, half } = grid;
  const fx = clamp(((x + half) / (2 * half)) * (n - 1), 0, n - 1);
  const fz = clamp(((z + half) / (2 * half)) * (n - 1), 0, n - 1);
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const x1 = Math.min(x0 + 1, n - 1);
  const z1 = Math.min(z0 + 1, n - 1);
  const tx = fx - x0;
  const tz = fz - z0;
  const a = data[z0 * n + x0];
  const b = data[z0 * n + x1];
  const c = data[z1 * n + x0];
  const d = data[z1 * n + x1];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

/** Local noise-floor proxy (dBm) from clutter + user gain multiplier. */
export function noiseFloorDbm(clutter: number, clutterGain: number): number {
  return lerp(
    NOISE_FLOOR_CLEAR_DBM,
    NOISE_FLOOR_DENSE_DBM,
    clamp(clutter * clutterGain, 0, 1)
  );
}

/* ------------------------------------------------------------------ */
/*  Per-cell received power + dominance                                */
/* ------------------------------------------------------------------ */

/**
 * Received power (dBm) from one cell over the GRID_N × GRID_N field.
 * Expensive part is the obstruction count — callers cache per cell id.
 */
export function computeRxGrid(
  cell: Cell,
  buildings: Building[],
  n = GRID_N,
  half = FIELD_HALF
): Float32Array {
  const out = new Float32Array(n * n);
  const from = new THREE.Vector3(cell.x, ANTENNA_HEIGHT, cell.z);
  const to = new THREE.Vector3();
  for (let iz = 0; iz < n; iz++) {
    const z = gridCoord(iz, n, half);
    for (let ix = 0; ix < n; ix++) {
      to.set(gridCoord(ix, n, half), SAMPLE_HEIGHT, z);
      const obstructions = countObstructions(from, to, buildings);
      out[iz * n + ix] = rxPowerDbm(
        TX_POWER_DBM,
        from.distanceTo(to),
        FREQ_GHZ,
        obstructions
      );
    }
  }
  return out;
}

export interface DominanceResult {
  /** Best-carrier margin over the local noise floor, dB (−∞ with no cells). */
  margins: Float32Array;
  /** Samples won (margin > 0) per cell, in input order. */
  winCounts: number[];
  /** Fraction of the field with margin > 0. */
  coveredPct: number;
  /** Mean margin (dB) over covered samples; 0 when nothing is covered. */
  avgMarginDb: number;
}

/** Compare the strongest carrier against the clutter noise floor. */
export function computeDominance(
  rxGrids: Float32Array[],
  clutterGrid: ClutterGrid,
  clutterGain: number,
  n = GRID_N,
  half = FIELD_HALF
): DominanceResult {
  const margins = new Float32Array(n * n);
  const winCounts = new Array<number>(rxGrids.length).fill(0);
  let covered = 0;
  let marginSum = 0;

  for (let iz = 0; iz < n; iz++) {
    const z = gridCoord(iz, n, half);
    for (let ix = 0; ix < n; ix++) {
      const idx = iz * n + ix;
      let bestRx = Number.NEGATIVE_INFINITY;
      let winner = -1;
      for (let c = 0; c < rxGrids.length; c++) {
        const rx = rxGrids[c][idx];
        if (rx > bestRx) {
          bestRx = rx;
          winner = c;
        }
      }
      const clutter = sampleClutter(clutterGrid, gridCoord(ix, n, half), z);
      const margin = bestRx - noiseFloorDbm(clutter, clutterGain);
      margins[idx] = margin;
      if (winner >= 0 && margin > 0) {
        winCounts[winner]++;
        covered++;
        marginSum += margin;
      }
    }
  }

  return {
    margins,
    winCounts,
    coveredPct: covered / (n * n),
    avgMarginDb: covered > 0 ? marginSum / covered : 0,
  };
}
