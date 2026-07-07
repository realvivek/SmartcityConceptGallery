/**
 * Shared Three.js + RF engineering utilities for all demos.
 *
 * The RF math here uses simplified but physically plausible models
 * (free-space path loss, uniform linear array factors, log-distance
 * shadowing proxies) that are appropriate for visualization purposes.
 */
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Shared palette                                                     */
/* ------------------------------------------------------------------ */

export const RF_COLORS = {
  navy: "#0a1428",
  navyLight: "#12203d",
  panel: "#0e1b33",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#22d3ee",
  emerald: "#34d399",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
  ice: "#e2e8f0",
  building: "#16263f",
  buildingEdge: "#2c4a75",
  ground: "#0b1830",
} as const;

/** Signal-strength colour ramp stops, strongest → weakest. */
export const SIGNAL_RAMP = [
  new THREE.Color(RF_COLORS.cyan),
  new THREE.Color(RF_COLORS.blue),
  new THREE.Color(RF_COLORS.purple),
  new THREE.Color(RF_COLORS.rose),
];

/**
 * Map a normalized value t (1 = strongest, 0 = weakest) onto the shared
 * signal colour ramp (cyan → blue → purple → rose).
 */
export function signalRampColor(t: number, target?: THREE.Color): THREE.Color {
  const out = target ?? new THREE.Color();
  const clamped = THREE.MathUtils.clamp(1 - t, 0, 1) * (SIGNAL_RAMP.length - 1);
  const i = Math.min(Math.floor(clamped), SIGNAL_RAMP.length - 2);
  const f = clamped - i;
  out.copy(SIGNAL_RAMP[i]).lerp(SIGNAL_RAMP[i + 1], f);
  return out;
}

/** Map a normalized quality t (1 = good/green, 0 = bad/red). */
export function qualityColor(t: number, target?: THREE.Color): THREE.Color {
  const out = target ?? new THREE.Color();
  const stops = [
    new THREE.Color(RF_COLORS.rose),
    new THREE.Color(RF_COLORS.amber),
    new THREE.Color(RF_COLORS.emerald),
    new THREE.Color(RF_COLORS.cyan),
  ];
  const clamped = THREE.MathUtils.clamp(t, 0, 1) * (stops.length - 1);
  const i = Math.min(Math.floor(clamped), stops.length - 2);
  const f = clamped - i;
  out.copy(stops[i]).lerp(stops[i + 1], f);
  return out;
}

/* ------------------------------------------------------------------ */
/*  Deterministic procedural generation                                */
/* ------------------------------------------------------------------ */

/** Deterministic PRNG (mulberry32) so scenes are stable across reloads. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Axis-aligned building footprint. Positions are centre-of-footprint. */
export interface Building {
  x: number;
  z: number;
  width: number; // extent along x
  depth: number; // extent along z
  height: number; // extent along y (base sits on y = 0)
}

export interface CityOptions {
  seed?: number;
  /** Number of city blocks along each axis. */
  blocks?: number;
  /** Size of one block (metres). */
  blockSize?: number;
  /** Street width between blocks (metres). */
  street?: number;
  minHeight?: number;
  maxHeight?: number;
  /** 0..1 probability that a lot contains a building. */
  density?: number;
  /** Keep this radius around the origin clear (for poles/antennas). */
  clearRadius?: number;
}

/**
 * Generate a deterministic downtown-style grid of extruded buildings.
 * Heights follow a downtown falloff: taller near the centre.
 * Swap this for real OSM/GeoJSON footprints later — anything that
 * produces `Building[]` will work with every demo.
 */
export function generateCity(options: CityOptions = {}): Building[] {
  const {
    seed = 42,
    blocks = 6,
    blockSize = 26,
    street = 12,
    minHeight = 8,
    maxHeight = 60,
    density = 0.82,
    clearRadius = 14,
  } = options;

  const rand = mulberry32(seed);
  const buildings: Building[] = [];
  const pitch = blockSize + street;
  const half = ((blocks - 1) * pitch) / 2;
  const lotsPerBlock = 2; // 2x2 lots per block

  for (let bx = 0; bx < blocks; bx++) {
    for (let bz = 0; bz < blocks; bz++) {
      const blockX = bx * pitch - half;
      const blockZ = bz * pitch - half;
      const lotSize = blockSize / lotsPerBlock;

      for (let lx = 0; lx < lotsPerBlock; lx++) {
        for (let lz = 0; lz < lotsPerBlock; lz++) {
          if (rand() > density) continue;

          const cx = blockX + (lx - (lotsPerBlock - 1) / 2) * lotSize;
          const cz = blockZ + (lz - (lotsPerBlock - 1) / 2) * lotSize;

          // keep a clear plaza near the origin for antennas/poles
          if (Math.hypot(cx, cz) < clearRadius) continue;

          const inset = 2.5 + rand() * 2;
          const width = lotSize - inset;
          const depth = lotSize - inset;

          // downtown falloff: taller towards the centre + jitter
          const distNorm = Math.hypot(cx, cz) / Math.hypot(half + pitch, half + pitch);
          const falloff = 1 - 0.65 * distNorm;
          const height =
            minHeight + rand() * rand() * (maxHeight - minHeight) * falloff;

          buildings.push({ x: cx, z: cz, width, depth, height });
        }
      }
    }
  }
  return buildings;
}

/* ------------------------------------------------------------------ */
/*  Occlusion / geometry helpers                                       */
/* ------------------------------------------------------------------ */

/**
 * Segment vs axis-aligned box (slab method).
 * Returns true if the segment a→b passes through the building volume.
 */
export function segmentIntersectsBuilding(
  a: THREE.Vector3,
  b: THREE.Vector3,
  building: Building
): boolean {
  const minX = building.x - building.width / 2;
  const maxX = building.x + building.width / 2;
  const minY = 0;
  const maxY = building.height;
  const minZ = building.z - building.depth / 2;
  const maxZ = building.z + building.depth / 2;

  let tmin = 0;
  let tmax = 1;
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const o = { x: a.x, y: a.y, z: a.z };

  for (const axis of ["x", "y", "z"] as const) {
    const min = axis === "x" ? minX : axis === "y" ? minY : minZ;
    const max = axis === "x" ? maxX : axis === "y" ? maxY : maxZ;
    const dir = d[axis];
    const org = o[axis];
    if (Math.abs(dir) < 1e-9) {
      if (org < min || org > max) return false;
    } else {
      let t1 = (min - org) / dir;
      let t2 = (max - org) / dir;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

/** Count how many buildings block the line-of-sight between two points. */
export function countObstructions(
  from: THREE.Vector3,
  to: THREE.Vector3,
  buildings: Building[]
): number {
  let n = 0;
  for (const b of buildings) {
    if (segmentIntersectsBuilding(from, to, b)) n++;
  }
  return n;
}

/** True if any building blocks the line-of-sight between two points. */
export function isOccluded(
  from: THREE.Vector3,
  to: THREE.Vector3,
  buildings: Building[]
): boolean {
  for (const b of buildings) {
    if (segmentIntersectsBuilding(from, to, b)) return true;
  }
  return false;
}

/**
 * Local clutter factor 0..1 for a point: how much built-up mass is nearby.
 * Used as a cheap proxy for urban interference / shadowing.
 */
export function clutterFactor(
  x: number,
  z: number,
  buildings: Building[],
  radius = 40
): number {
  let sum = 0;
  for (const b of buildings) {
    const d = Math.hypot(b.x - x, b.z - z);
    if (d > radius) continue;
    const proximity = 1 - d / radius;
    sum += proximity * proximity * (b.height / 60) * ((b.width * b.depth) / 500);
  }
  return THREE.MathUtils.clamp(sum, 0, 1);
}

/* ------------------------------------------------------------------ */
/*  RF math (simplified, physically plausible)                         */
/* ------------------------------------------------------------------ */

export const SPEED_OF_LIGHT = 299_792_458; // m/s

/**
 * Free-space path loss in dB. d in metres, f in GHz.
 * (The classic 32.44 km/MHz constant also holds for m/GHz.)
 */
export function fsplDb(distanceM: number, freqGHz: number): number {
  const d = Math.max(distanceM, 1);
  return 20 * Math.log10(d) + 20 * Math.log10(freqGHz) + 32.44;
}

/**
 * Received power in dBm with optional obstruction penalty.
 * txPowerDbm: conducted power + antenna gain (EIRP-ish for our purposes).
 */
export function rxPowerDbm(
  txPowerDbm: number,
  distanceM: number,
  freqGHz: number,
  obstructions = 0,
  penetrationLossDb = 18
): number {
  return (
    txPowerDbm - fsplDb(distanceM, freqGHz) - obstructions * penetrationLossDb
  );
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 10);
}

export function linearToDb(linear: number): number {
  return 10 * Math.log10(Math.max(linear, 1e-12));
}

/**
 * Normalized uniform linear array factor magnitude (0..1).
 * @param n number of elements
 * @param spacingLambda element spacing in wavelengths (typ. 0.5)
 * @param steerDeg steering angle in degrees from boresight
 * @param thetaDeg observation angle in degrees from boresight
 */
export function arrayFactor(
  n: number,
  spacingLambda: number,
  steerDeg: number,
  thetaDeg: number
): number {
  const theta = THREE.MathUtils.degToRad(thetaDeg);
  const steer = THREE.MathUtils.degToRad(steerDeg);
  const psi =
    2 * Math.PI * spacingLambda * (Math.sin(theta) - Math.sin(steer));
  if (Math.abs(psi) < 1e-9) return 1;
  const num = Math.sin((n * psi) / 2);
  const den = n * Math.sin(psi / 2);
  if (Math.abs(den) < 1e-9) return 1;
  return Math.abs(num / den);
}

/** Array factor in dB (clamped at floorDb). */
export function arrayFactorDb(
  n: number,
  spacingLambda: number,
  steerDeg: number,
  thetaDeg: number,
  floorDb = -40
): number {
  const af = arrayFactor(n, spacingLambda, steerDeg, thetaDeg);
  return Math.max(20 * Math.log10(Math.max(af, 1e-6)), floorDb);
}

/** Approximate half-power beamwidth (degrees) of a uniform linear array. */
export function halfPowerBeamwidthDeg(
  n: number,
  spacingLambda: number,
  steerDeg = 0
): number {
  const broadside = 50.8 / (n * spacingLambda); // classic approximation
  const cos = Math.cos(THREE.MathUtils.degToRad(steerDeg));
  return broadside / Math.max(cos, 0.2); // beam broadens when steered
}

/**
 * Simple one-way network latency model in ms:
 * propagation + per-hop switching + load-dependent queueing.
 */
export function latencyMs(
  distanceM: number,
  hops: number,
  loadFactor = 0
): number {
  const propagation = (distanceM / (0.67 * SPEED_OF_LIGHT)) * 1000; // fibre-ish
  const perHop = 0.35;
  const queueing = 4 * Math.pow(THREE.MathUtils.clamp(loadFactor, 0, 1), 2.2);
  return propagation + hops * perHop + queueing;
}

/* ------------------------------------------------------------------ */
/*  Instancing + misc helpers                                          */
/* ------------------------------------------------------------------ */

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

/** Write position/scale (and optional Y-rotation) into an InstancedMesh slot. */
export function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  position: THREE.Vector3 | [number, number, number],
  scale: THREE.Vector3 | [number, number, number] | number = 1,
  rotationY = 0
): void {
  if (Array.isArray(position)) _p.set(position[0], position[1], position[2]);
  else _p.copy(position);
  if (typeof scale === "number") _s.set(scale, scale, scale);
  else if (Array.isArray(scale)) _s.set(scale[0], scale[1], scale[2]);
  else _s.copy(scale);
  _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(index, _m);
}

/** Exponential damp toward a target (frame-rate independent). */
export const damp = THREE.MathUtils.damp;
export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const degToRad = THREE.MathUtils.degToRad;
export const radToDeg = THREE.MathUtils.radToDeg;

/** Points along a quadratic-bezier arc between two world points. */
export function arcPoints(
  from: THREE.Vector3,
  to: THREE.Vector3,
  lift = 8,
  segments = 32
): THREE.Vector3[] {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  mid.y = Math.max(from.y, to.y) + lift;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  return curve.getPoints(segments);
}

export function makeArcCurve(
  from: THREE.Vector3,
  to: THREE.Vector3,
  lift = 8
): THREE.QuadraticBezierCurve3 {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  mid.y = Math.max(from.y, to.y) + lift;
  return new THREE.QuadraticBezierCurve3(
    from.clone(),
    mid,
    to.clone()
  );
}
