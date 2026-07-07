"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import type { DemoMeta } from "@/lib/demos";
import { DemoThumbnail } from "@/components/gallery/Thumbnails";
import { Badge } from "@/components/ui/badge";

interface DemoCardProps {
  demo: DemoMeta;
  index: number;
  onOpen: (demo: DemoMeta) => void;
}

/**
 * Drafting-sheet gallery card: paper, hairline ink border, corner
 * ticks, and a hard offset shadow that deepens and tints toward the
 * demo's accent on hover — no soft glows.
 */
export function DemoCard({ demo, index, onOpen }: DemoCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group h-full"
    >
      <button
        type="button"
        onClick={() => onOpen(demo)}
        className="corner-ticks relative block h-full w-full cursor-pointer overflow-hidden rounded-md border border-ink/30 bg-card text-left shadow-[5px_5px_0_rgba(36,52,77,0.12)] transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink/60 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        style={
          {
            "--card-accent": demo.accentHex,
          } as React.CSSProperties
        }
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `7px 7px 0 ${demo.accentHex}55`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "5px 5px 0 rgba(36,52,77,0.12)";
        }}
        aria-label={`Open demo: ${demo.title}`}
      >
        {/* thumbnail on blueprint grid */}
        <div className="blueprint-grid relative h-44 overflow-hidden border-b border-ink/15 bg-gradient-to-b from-[#eef1f7] to-[#e7ebf3]">
          <div className="absolute inset-0 p-3 transition-transform duration-500 ease-out group-hover:scale-[1.05]">
            <DemoThumbnail id={demo.id} />
          </div>
          <span className="absolute top-3 left-3 font-mono text-[11px] font-semibold tracking-widest text-ink/45">
            {demo.number}
          </span>
          {/* index stamp */}
          <span
            className="absolute right-3 bottom-3 hidden rotate-[-4deg] border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.15em] uppercase opacity-70 md:block"
            style={{ color: demo.accentHex, borderColor: `${demo.accentHex}88` }}
          >
            Fig. {demo.number}
          </span>
        </div>

        {/* body */}
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-[17px] leading-snug font-semibold tracking-tight text-ink">
              {demo.title}
            </h3>
            <span
              className="mt-0.5 shrink-0 border border-ink/25 p-1.5 text-muted-foreground transition-all duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-card"
            >
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {demo.tagline}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {demo.tags.map((tag) => (
              <Badge key={tag} variant={demo.accent}>
                {tag}
              </Badge>
            ))}
            <Badge variant="outline">Three.js</Badge>
          </div>
        </div>
      </button>
    </motion.article>
  );
}
