"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  ChevronDown,
  Github,
  Radar,
  RadioTower,
  Waves,
} from "lucide-react";

import { DEMOS, DEMO_BY_ID, type DemoId, type DemoMeta } from "@/lib/demos";
import { HeroBackground } from "@/components/gallery/HeroBackground";
import { DemoCard } from "@/components/gallery/DemoCard";
import { Footer } from "@/components/gallery/Footer";
import { DemoModal } from "@/components/demo-shell/DemoModal";
import { Button } from "@/components/ui/button";

const REPO_URL = "https://github.com/realvivek/smartcityconceptgallery";

export function GalleryApp() {
  const [activeDemo, setActiveDemo] = useState<DemoMeta | null>(null);

  // Deep-link support: #beamforming opens that demo directly.
  useEffect(() => {
    const id = window.location.hash.replace("#", "") as DemoId;
    if (id && DEMO_BY_ID[id]) setActiveDemo(DEMO_BY_ID[id]);
  }, []);

  const openDemo = useCallback((demo: DemoMeta) => {
    setActiveDemo(demo);
    window.history.replaceState(null, "", `#${demo.id}`);
  }, []);

  const closeDemo = useCallback(() => {
    setActiveDemo(null);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return (
    <div className="relative">
      {/* nav */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-ink/8 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <RadioTower className="size-4.5 text-primary" />
            <span className="font-display text-sm font-semibold tracking-tight">
              RF <span className="text-muted-foreground">/</span> Smart Cities
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="#gallery"
              className="hidden text-[13px] text-muted-foreground transition-colors hover:text-ink sm:block"
            >
              Gallery
            </a>
            <a
              href="#about"
              className="mr-2 hidden text-[13px] text-muted-foreground transition-colors hover:text-ink sm:block"
            >
              About
            </a>
            <Button asChild variant="outline" size="sm">
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                <Github className="size-3.5" />
                GitHub
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {/* hero */}
      <section
        id="top"
        className="relative flex min-h-[92vh] items-center justify-center overflow-hidden"
      >
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <Waves className="size-3.5 text-primary" />
              Interactive Three.js visualization gallery
            </p>
            <h1 className="font-display text-5xl leading-[1.04] font-semibold tracking-tight text-balance text-ink sm:text-6xl md:text-7xl">
              RF Concepts in{" "}
              <span className="text-primary">Smart Cities</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
              A collection of interactive visualizations exploring private 5G,
              outdoor small cells, and edge AI in urban environments — from
              beamforming lobes to edge workload placement, rendered in real
              time.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg">
                <a href="#gallery">
                  <Radar className="size-4" />
                  Explore the demos
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="size-4" />
                  View source
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
        <motion.a
          href="#about"
          aria-label="Scroll to about section"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground transition-colors hover:text-ink"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="size-5" />
        </motion.a>
      </section>

      {/* about */}
      <section id="about" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:gap-16"
        >
          <div>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
              About this gallery
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance text-ink md:text-4xl">
              Visual intuition for the invisible infrastructure of connected
              cities
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
              Each micro-demo isolates one RF or edge-computing concept —
              beamforming, densification, interference, workload placement —
              and makes it tangible through real-time 3D. The scenes use
              procedurally generated urban geometry and simplified, physically
              plausible models (free-space path loss, uniform linear array
              factors, occlusion tests, latency budgets) in the spirit of
              public-data-driven engineering: everything runs instantly in the
              browser, and the procedural city can be swapped for real
              OpenStreetMap or municipal open-data footprints without touching
              the demos.
            </p>
          </div>
          <div className="grid content-center gap-4">
            {[
              {
                icon: Radar,
                title: "Physically plausible",
                text: "Real formulas — FSPL, array factors, latency budgets — simplified for clarity, not cartooned.",
              },
              {
                icon: Boxes,
                title: "Procedural & portable",
                text: "Deterministic city generation, zero external dependencies, GeoJSON-ready interfaces.",
              },
              {
                icon: Waves,
                title: "Real-time & interactive",
                text: "Instanced rendering, tuned post-processing, and 60 fps interaction as the design bar.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-ink/8 bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_12px_rgba(16,24,40,0.05)]"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <Icon className="size-4 text-primary" />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold text-ink">
                    {title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* gallery */}
      <section id="gallery" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
            The demos
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Six interactive micro-demos
          </h2>
          <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
            Click any card to launch the full interactive scene with controls
            and an engineering explanation.
          </p>
        </motion.div>

        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {DEMOS.map((demo, i) => (
            <DemoCard key={demo.id} demo={demo} index={i} onOpen={openDemo} />
          ))}
        </div>
      </section>

      <Footer />

      <DemoModal demo={activeDemo} onClose={closeDemo} />
    </div>
  );
}
