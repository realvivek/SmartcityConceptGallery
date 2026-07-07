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
 * Clean gallery card: white surface, hairline border, soft shadow that
 * deepens on hover with a gentle lift. No ornament — the schematic
 * thumbnail carries the personality.
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
        className="relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-ink/8 bg-card text-left shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_12px_rgba(16,24,40,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-ink/15 hover:shadow-[0_2px_4px_rgba(16,24,40,0.06),0_16px_40px_rgba(16,24,40,0.12)] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Open demo: ${demo.title}`}
      >
        {/* thumbnail */}
        <div className="relative h-44 overflow-hidden border-b border-ink/6 bg-gradient-to-b from-[#eef3f9] to-[#e4ebf4]">
          <div className="absolute inset-0 p-3 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <DemoThumbnail id={demo.id} />
          </div>
          <span className="absolute top-3 left-3 font-mono text-[11px] font-medium text-ink/35">
            {demo.number}
          </span>
        </div>

        {/* body */}
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-[16px] leading-snug font-semibold tracking-tight text-ink">
              {demo.title}
            </h3>
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ink/4 text-muted-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-white">
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
          </div>
        </div>
      </button>
    </motion.article>
  );
}
