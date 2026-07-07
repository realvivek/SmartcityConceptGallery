/**
 * Central registry for the six micro-demos: metadata, tags, and the
 * explanation copy rendered in each demo's side panel.
 * The actual scene components are mapped in `components/demos/index.ts`.
 */

export type DemoId =
  | "beamforming"
  | "dataflow"
  | "coverage"
  | "interference"
  | "radiation"
  | "workload";

export type AccentVariant =
  | "default"
  | "purple"
  | "cyan"
  | "emerald"
  | "amber"
  | "outline";

export interface DemoMeta {
  id: DemoId;
  number: string;
  title: string;
  /** One-sentence card description. */
  tagline: string;
  tags: string[];
  accent: AccentVariant;
  /** Hex accent used in thumbnails / highlights. */
  accentHex: string;
  explanation: {
    heading: string;
    paragraphs: string[];
    notice: string[];
    realWorld: string;
  };
}

export const DEMOS: DemoMeta[] = [
  {
    id: "beamforming",
    number: "01",
    title: "Urban Beamforming Lobes",
    tagline:
      "Steer a small-cell antenna array through a downtown block and watch main and side lobes reshape in real time.",
    tags: ["Beamforming", "Antenna Arrays", "Path Loss"],
    accent: "default",
    accentHex: "#4f46e5",
    explanation: {
      heading: "Why beamforming matters in dense urban 5G",
      paragraphs: [
        "Modern small cells use antenna arrays to focus radiated energy into steerable beams instead of broadcasting uniformly. The pattern you see is a uniform linear array factor: adding elements narrows the main lobe and raises gain, while steering shifts the lobe electronically — no moving parts.",
        "The glowing surface is the horizontal-plane array pattern (in dB, log-scaled), and the floating chips show simplified received power at each user terminal using free-space path loss plus an obstruction penalty when a building blocks line-of-sight.",
      ],
      notice: [
        "More elements → a narrower, higher-gain main lobe and more side lobes.",
        "Steering off boresight broadens the beam — a real phased-array effect.",
        "UEs behind buildings lose ~18 dB per obstruction, dropping them out of coverage.",
      ],
      realWorld:
        "Operators use exactly this trade-off to serve street-level users from pole-mounted arrays: beams follow demand, and side-lobe control limits interference to neighbouring cells.",
    },
  },
  {
    id: "dataflow",
    number: "02",
    title: "Sensor-to-Edge Data Flow",
    tagline:
      "Watch city sensors stream telemetry to edge compute nodes co-located with small cells, with latency painted onto every packet.",
    tags: ["Edge AI", "IoT Sensors", "Latency"],
    accent: "purple",
    accentHex: "#7c3aed",
    explanation: {
      heading: "Why compute is moving to the network edge",
      paragraphs: [
        "Smart-city sensors — traffic cameras, air-quality monitors, acoustic arrays — produce continuous telemetry that is expensive to backhaul to a distant cloud. Placing compute at the small-cell site cuts the physical distance data must travel, which is the dominant term in achievable latency.",
        "Each particle stream represents a sensor's uplink to its nearest edge node. Particle speed and colour encode one-way latency from a simple model: propagation delay plus per-hop switching plus load-dependent queueing that grows as you raise workload intensity.",
      ],
      notice: [
        "Sensors bind to their nearest edge node — add or remove sensors and watch the topology re-balance.",
        "Raising workload intensity pushes queueing delay up: streams shift from cool blue (fast) toward warm rose (congested).",
        "Distant sensors are visibly slower even at zero load — propagation delay is physics, not congestion.",
      ],
      realWorld:
        "This is the architecture behind real-time traffic inference and V2X: sub-10 ms loops are only possible when the model runs metres, not kilometres, from the radio.",
    },
  },
  {
    id: "coverage",
    number: "03",
    title: "Volumetric Coverage Growth",
    tagline:
      "Densify a sparse small-cell deployment step by step and watch street-level coverage bloom through the urban fabric.",
    tags: ["Densification", "Coverage", "Small Cells"],
    accent: "cyan",
    accentHex: "#0284c7",
    explanation: {
      heading: "Densification: coverage by a thousand small cells",
      paragraphs: [
        "Millimetre-wave and mid-band 5G cells cover hundreds of metres, not kilometres — so urban capacity is built by adding sites, not power. This demo renders coverage as a street-level heat field: each cell contributes free-space path loss shaded by building obstructions between the cell and each sample point.",
        "Trigger densification to let the deployment grow along a plausible rollout sequence, scrub the timeline to compare stages, or click the ground to place a cell exactly where you think the gap is.",
      ],
      notice: [
        "Early cells leave deep shadows behind tall buildings — occlusion, not distance, dominates urban coverage.",
        "Each densification step fills gaps non-linearly: the last 10% of area costs the most sites.",
        "Manual placement in a street canyon often beats an extra rooftop site — position quality beats raw count.",
      ],
      realWorld:
        "RF planners run this exact loop with real propagation engines: place, predict, find the coverage hole, repeat — this demo compresses that workflow into seconds.",
    },
  },
  {
    id: "interference",
    number: "04",
    title: "Interference Noise Field",
    tagline:
      "Visualize urban clutter as a living noise field and hunt for small-cell placements that rise above it.",
    tags: ["Interference", "Urban Clutter", "SINR"],
    accent: "amber",
    accentHex: "#f59e0b",
    explanation: {
      heading: "Urban clutter as a noise floor",
      paragraphs: [
        "Dense built environments scatter, reflect and duct RF energy, raising the effective interference floor exactly where users concentrate. This demo uses local building mass as a clutter proxy: the particle field glows hotter near tall, tightly packed blocks.",
        "Placed small cells carve out dominance regions where carrier power exceeds the local clutter proxy — a simplified signal-to-interference picture. Move cells between the canyon and the plaza and watch how much harder the dense core is to serve.",
      ],
      notice: [
        "The noise field is structural — it follows building density, not your cell placement.",
        "A cell in open space wins a large clean region; the same cell in the dense core wins a small one.",
        "Serving high-clutter zones takes multiple cooperating cells, mirroring real HetNet design.",
      ],
      realWorld:
        "Interference-aware placement is the difference between a small cell that adds capacity and one that just adds noise — operators model clutter with ray tracing; the intuition is identical.",
    },
  },
  {
    id: "radiation",
    number: "05",
    title: "Antenna Pattern on a Pole",
    tagline:
      "Inspect a streetlight-mounted small cell's 3D radiation pattern and aim it down an urban canyon.",
    tags: ["Radiation Patterns", "Antennas", "Urban Canyon"],
    accent: "emerald",
    accentHex: "#0f9d8f",
    explanation: {
      heading: "Reading a 3D radiation pattern",
      paragraphs: [
        "Every antenna datasheet leads with this shape: a 3D surface where distance from the origin encodes gain in that direction (log-scaled dB here, as engineers plot it). A directional panel antenna concentrates energy into a forward main lobe with a controlled vertical beamwidth and deliberate downtilt toward street level.",
        "Rotate the pattern in azimuth, adjust downtilt and beamwidths, and watch the lobe wash across the two canyon walls. The ground stripe shows where the pattern actually delivers energy at street level.",
      ],
      notice: [
        "Downtilt trades footprint size for near-pole signal strength — the classic small-cell tuning knob.",
        "Narrow vertical beamwidth wastes less energy on the sky and building tops.",
        "Aiming along the canyon axis lights the whole street; aiming across it splashes two façades.",
      ],
      realWorld:
        "Streetlight small cells are deployed with precisely this geometry: pattern choice and mechanical/electrical tilt decide whether a pole serves one block or three.",
    },
  },
  {
    id: "workload",
    number: "06",
    title: "Edge Workload Placement",
    tagline:
      "Drop AI workloads onto a mesh of edge nodes and get scored on latency, capacity and locality in real time.",
    tags: ["Edge AI", "Orchestration", "Optimization"],
    accent: "purple",
    accentHex: "#7c3aed",
    explanation: {
      heading: "The edge orchestration problem",
      paragraphs: [
        "A city's edge is a constellation of small compute nodes, each with limited capacity. Deciding where each AI workload runs — traffic inference, video analytics, sensor fusion — is a placement problem: minimize latency to the workload's data sources without overloading any node.",
        "Assign workloads to nodes and the score reacts instantly: connections show data paths from source zones, colour encodes latency, and node rings fill as capacity is consumed. Try packing everything onto the central node and watch the queueing penalty erase the locality win.",
      ],
      notice: [
        "Latency-critical workloads (traffic inference) punish distant placement far more than batch analytics.",
        "Overloading a node hurts every workload on it — the queueing term is shared.",
        "The best total score usually spreads load across mediocre-looking nodes rather than perfecting one.",
      ],
      realWorld:
        "This is what edge orchestrators (K8s + KubeEdge-style schedulers) automate in production — the demo makes the objective function tangible.",
    },
  },
];

export const DEMO_BY_ID: Record<DemoId, DemoMeta> = Object.fromEntries(
  DEMOS.map((d) => [d.id, d])
) as Record<DemoId, DemoMeta>;
