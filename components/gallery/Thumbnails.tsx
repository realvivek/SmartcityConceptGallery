import type { DemoId } from "@/lib/demos";

/**
 * Hand-drawn SVG thumbnails — one stylized schematic per demo, sharing
 * the gallery's glow language. Cheap to render (no WebGL on the grid).
 */
export function DemoThumbnail({ id }: { id: DemoId }) {
  switch (id) {
    case "beamforming":
      return <BeamformingThumb />;
    case "dataflow":
      return <DataflowThumb />;
    case "coverage":
      return <CoverageThumb />;
    case "interference":
      return <InterferenceThumb />;
    case "radiation":
      return <RadiationThumb />;
    case "workload":
      return <WorkloadThumb />;
  }
}

function Defs({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={color} stopOpacity="0.85" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}

const buildingFill = "#16263f";
const buildingStroke = "#2c4a75";

function Buildings({ xs }: { xs: [number, number, number][] }) {
  return (
    <g>
      {xs.map(([x, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={120 - h}
          width={w}
          height={h}
          rx={1.5}
          fill={buildingFill}
          stroke={buildingStroke}
          strokeWidth="0.75"
        />
      ))}
    </g>
  );
}

function BeamformingThumb() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <Defs id="bf" color="#3b82f6" />
      <Buildings xs={[[8, 22, 58], [36, 18, 40], [162, 24, 66], [140, 16, 34]]} />
      {/* main lobe */}
      <path
        d="M100 96 C 84 62, 84 30, 100 8 C 116 30, 116 62, 100 96 Z"
        fill="url(#bf-glow)"
        opacity="0.9"
        transform="rotate(18 100 96)"
      />
      <path
        d="M100 96 C 90 72, 90 48, 100 32 C 110 48, 110 72, 100 96 Z"
        fill="#3b82f6"
        opacity="0.5"
        filter="url(#bf-blur)"
        transform="rotate(18 100 96)"
      />
      {/* side lobes */}
      <path
        d="M100 96 C 88 88, 78 80, 72 66 C 86 70, 94 80, 100 96 Z"
        fill="#a855f7"
        opacity="0.55"
        filter="url(#bf-blur)"
      />
      <path
        d="M100 96 C 112 90, 124 84, 132 72 C 118 74, 108 84, 100 96 Z"
        fill="#a855f7"
        opacity="0.45"
        filter="url(#bf-blur)"
      />
      {/* pole + array */}
      <rect x="98.6" y="80" width="2.8" height="34" fill="#2c4a75" />
      <rect x="92" y="74" width="16" height="8" rx="2" fill="#0e1b33" stroke="#3b82f6" strokeWidth="1" />
      {[95, 99, 103].map((x) => (
        <circle key={x} cx={x + 1} cy="78" r="1.2" fill="#60a5fa" />
      ))}
      {/* UE dots */}
      <circle cx="64" cy="106" r="3" fill="#22d3ee" opacity="0.9" />
      <circle cx="128" cy="108" r="3" fill="#34d399" opacity="0.9" />
      <circle cx="170" cy="104" r="3" fill="#f43f5e" opacity="0.8" />
    </svg>
  );
}

function DataflowThumb() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <Defs id="df" color="#a855f7" />
      <Buildings xs={[[10, 20, 44], [148, 26, 60], [178, 14, 36]]} />
      {/* edge node hexagon */}
      <circle cx="100" cy="46" r="26" fill="url(#df-glow)" opacity="0.7" />
      <path
        d="M100 32 l12 7 v14 l-12 7 -12-7 v-14 Z"
        fill="#0e1b33"
        stroke="#a855f7"
        strokeWidth="1.5"
      />
      <circle cx="100" cy="46" r="3.5" fill="#c084fc" />
      {/* sensors + flows */}
      {[
        [30, 100, "#22d3ee"],
        [64, 108, "#3b82f6"],
        [136, 106, "#22d3ee"],
        [170, 98, "#3b82f6"],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <path
            d={`M${x} ${y} Q ${(Number(x) + 100) / 2} ${Number(y) - 52}, 100 52`}
            fill="none"
            stroke={String(c)}
            strokeWidth="1.4"
            strokeDasharray="3 5"
            opacity="0.75"
          />
          <circle cx={Number(x)} cy={Number(y)} r="3.4" fill={String(c)} />
          <circle cx={Number(x)} cy={Number(y)} r="6.5" fill="none" stroke={String(c)} strokeWidth="0.8" opacity="0.4" />
        </g>
      ))}
      {/* packets */}
      <circle cx="66" cy="76" r="2" fill="#e879f9" />
      <circle cx="122" cy="72" r="2" fill="#e879f9" />
      <circle cx="88" cy="62" r="2" fill="#e879f9" />
    </svg>
  );
}

function CoverageThumb() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <Defs id="cv" color="#22d3ee" />
      <Buildings xs={[[46, 18, 42], [92, 22, 58], [128, 14, 30]]} />
      {/* coverage blooms */}
      <circle cx="52" cy="98" r="40" fill="url(#cv-glow)" opacity="0.75" />
      <circle cx="118" cy="100" r="30" fill="url(#cv-glow)" opacity="0.6" />
      <circle cx="168" cy="96" r="22" fill="url(#cv-glow)" opacity="0.5" />
      {/* cells */}
      {[
        [52, 84],
        [118, 88],
        [168, 86],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 1.2} y={y} width="2.4" height={98 - y + 14} fill="#2c4a75" />
          <circle cx={x} cy={y - 3} r="3.2" fill="#22d3ee" />
          <circle cx={x} cy={y - 3} r="6" fill="none" stroke="#22d3ee" strokeWidth="0.9" opacity="0.5" />
        </g>
      ))}
      {/* shadow zone behind tall building */}
      <path d="M114 62 L150 120 L92 120 Z" fill="#0a1428" opacity="0.55" />
    </svg>
  );
}

function InterferenceThumb() {
  const dots: [number, number, number, number][] = [
    [30, 30, 2.5, 0.7], [44, 52, 1.8, 0.5], [58, 24, 2.2, 0.8], [70, 44, 3, 0.9],
    [84, 30, 2, 0.75], [96, 52, 2.6, 0.95], [108, 26, 1.6, 0.6], [118, 46, 2.8, 0.9],
    [132, 32, 2.2, 0.8], [146, 54, 1.8, 0.55], [160, 28, 1.5, 0.45], [76, 62, 2.4, 0.85],
    [104, 66, 2, 0.8], [126, 62, 1.7, 0.6], [52, 66, 1.5, 0.5],
  ];
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <Defs id="if" color="#f59e0b" />
      <Buildings xs={[[62, 20, 52], [88, 24, 68], [118, 18, 46], [24, 16, 30], [160, 20, 38]]} />
      <ellipse cx="100" cy="46" rx="58" ry="34" fill="url(#if-glow)" opacity="0.5" />
      {dots.map(([x, y, r, o], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill={i % 3 === 0 ? "#f59e0b" : "#a855f7"}
          opacity={o * 0.8}
          filter="url(#if-blur)"
        />
      ))}
      {/* clean cell in the open */}
      <circle cx="176" cy="98" r="18" fill="#22d3ee" opacity="0.16" />
      <circle cx="176" cy="90" r="3" fill="#22d3ee" />
      <rect x="174.9" y="92" width="2.2" height="22" fill="#2c4a75" />
    </svg>
  );
}

function RadiationThumb() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <Defs id="rp" color="#34d399" />
      {/* canyon walls */}
      <rect x="6" y="20" width="30" height="100" rx="2" fill={buildingFill} stroke={buildingStroke} strokeWidth="0.75" />
      <rect x="164" y="28" width="30" height="92" rx="2" fill={buildingFill} stroke={buildingStroke} strokeWidth="0.75" />
      {/* pole */}
      <rect x="98.5" y="52" width="3" height="62" fill="#2c4a75" />
      <rect x="94" y="44" width="12" height="12" rx="2" fill="#0e1b33" stroke="#34d399" strokeWidth="1.2" />
      {/* radiation pattern: main lobe + back lobe, classic polar shape */}
      <path
        d="M106 50 C 130 34, 158 40, 170 50 C 158 60, 130 66, 106 50 Z"
        fill="url(#rp-glow)"
      />
      <path
        d="M106 50 C 124 40, 146 44, 156 50 C 146 56, 124 60, 106 50 Z"
        fill="#34d399"
        opacity="0.5"
        filter="url(#rp-blur)"
      />
      <path
        d="M94 50 C 84 44, 74 46, 68 50 C 74 54, 84 56, 94 50 Z"
        fill="#34d399"
        opacity="0.3"
        filter="url(#rp-blur)"
      />
      {/* gain rings */}
      {[14, 26, 38].map((r) => (
        <circle key={r} cx="100" cy="50" r={r} fill="none" stroke="#34d399" strokeWidth="0.5" opacity="0.25" strokeDasharray="2 4" />
      ))}
      {/* street illumination stripe */}
      <ellipse cx="136" cy="112" rx="34" ry="5" fill="#34d399" opacity="0.25" filter="url(#rp-blur)" />
    </svg>
  );
}

function WorkloadThumb() {
  const nodes: [number, number][] = [
    [40, 40], [100, 26], [160, 44], [70, 88], [136, 90],
  ];
  const links: [number, number][] = [
    [0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4],
  ];
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full">
      <Defs id="wl" color="#a855f7" />
      {links.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke={i % 2 ? "#3b82f6" : "#a855f7"}
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.55"
        />
      ))}
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="14" fill="url(#wl-glow)" opacity="0.5" />
          <path
            d={`M${x} ${y - 8} l7 4 v8 l-7 4 -7-4 v-8 Z`}
            fill="#0e1b33"
            stroke={i === 4 ? "#f43f5e" : "#a855f7"}
            strokeWidth="1.3"
          />
        </g>
      ))}
      {/* workload orbs */}
      <circle cx="100" cy="26" r="4" fill="#22d3ee" />
      <circle cx="70" cy="88" r="4" fill="#34d399" />
      <circle cx="136" cy="90" r="4" fill="#f59e0b" />
      {/* score chip */}
      <rect x="148" y="8" width="44" height="14" rx="7" fill="#0e1b33" stroke="#34d399" strokeWidth="1" />
      <text x="170" y="18" textAnchor="middle" fontSize="9" fill="#34d399" fontFamily="monospace">
        94/100
      </text>
    </svg>
  );
}
