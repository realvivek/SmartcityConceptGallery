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

export function DemoCard({ demo, index, onOpen }: DemoCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <button
        type="button"
        onClick={() => onOpen(demo)}
        className="relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-card text-left shadow-[0_8px_32px_rgba(2,8,23,0.5)] transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_16px_48px_rgba(2,8,23,0.7)] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        aria-label={`Open demo: ${demo.title}`}
      >
        {/* accent glow on hover */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(360px 160px at 50% 0%, ${demo.accentHex}22, transparent 70%)`,
          }}
        />

        {/* thumbnail */}
        <div className="relative h-44 overflow-hidden border-b border-white/8 bg-gradient-to-b from-[#0d1c36] to-[#0a1428]">
          <div className="absolute inset-0 p-3 transition-transform duration-500 ease-out group-hover:scale-[1.05]">
            <DemoThumbnail id={demo.id} />
          </div>
          <span className="absolute top-3 left-3 font-mono text-[11px] tracking-widest text-slate-500">
            {demo.number}
          </span>
        </div>

        {/* body */}
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-100">
              {demo.title}
            </h3>
            <span
              className="mt-0.5 shrink-0 rounded-full border border-white/10 p-1.5 text-slate-400 transition-all duration-300 group-hover:border-white/25 group-hover:text-white"
              style={{ backgroundColor: `${demo.accentHex}14` }}
            >
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-400">
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
