import { Github, RadioTower } from "lucide-react";

const TECH = [
  "Next.js 15",
  "TypeScript",
  "React Three Fiber",
  "Three.js",
  "Tailwind CSS",
  "shadcn/ui",
  "Framer Motion",
];

export function Footer() {
  return (
    <footer className="border-t border-ink/8 bg-card/70">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm space-y-3">
            <div className="flex items-center gap-2">
              <RadioTower className="size-4 text-primary" />
              <span className="font-display text-sm font-semibold tracking-tight">
                RF Concepts in Smart Cities
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              An open-source gallery of interactive visualizations exploring
              private 5G, outdoor small cells, and edge AI in urban
              environments. All scenes use procedural geometry and simplified,
              physically plausible RF models — no external data required.
            </p>
            <p className="text-[13px] text-muted-foreground">
              Built with{" "}
              <span className="font-medium text-ink">Claude Fable 5</span>.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Tech stack
            </p>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[13px] text-muted-foreground">
              {TECH.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Source
            </p>
            <a
              href="https://github.com/realvivek/smartcityconceptgallery"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-ink transition-colors hover:text-primary"
            >
              <Github className="size-4" />
              realvivek/smartcityconceptgallery
            </a>
            <p className="max-w-[220px] text-[12px] leading-relaxed text-muted-foreground">
              Open source — fork it, swap in real OpenStreetMap or city
              open-data footprints, and make it yours.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-ink/8 pt-6 text-center text-xs text-muted-foreground/80">
          Simplified models for visualization — free-space path loss, uniform
          linear arrays, and clutter proxies. Not a substitute for real RF
          planning tools.
        </div>
      </div>
    </footer>
  );
}
