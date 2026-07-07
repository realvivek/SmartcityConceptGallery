"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  Globe2,
  Lightbulb,
  RotateCcw,
  X,
} from "lucide-react";

import type { DemoMeta } from "@/lib/demos";
import { DEMO_COMPONENTS } from "@/components/demos";
import { takeScreenshot } from "@/lib/screenshot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface DemoModalProps {
  demo: DemoMeta | null;
  onClose: () => void;
}

/**
 * Full-screen demo viewer: canvas area with the interactive scene,
 * a professional explanation sidebar, and shared Reset / Screenshot
 * actions. Enter/exit animated with Framer Motion.
 */
export function DemoModal({ demo, onClose }: DemoModalProps) {
  const [resetKey, setResetKey] = useState(0);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  // Escape closes; lock body scroll while open.
  useEffect(() => {
    if (!demo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [demo, onClose]);

  // Reset scene state when switching demos.
  useEffect(() => setResetKey(0), [demo?.id]);

  const DemoComponent = demo ? DEMO_COMPONENTS[demo.id] : null;

  return (
    <AnimatePresence>
      {demo && DemoComponent && (
        <motion.div
          key="demo-modal"
          className="fixed inset-0 z-50 flex flex-col bg-[#060d1c]/85 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label={demo.title}
        >
          <motion.div
            className="m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-background shadow-[0_24px_80px_rgba(0,0,0,0.7)] md:m-4"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* header */}
            <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 md:px-6">
              <span className="font-mono text-xs text-blue-400/80">
                {demo.number}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold tracking-tight md:text-base">
                  {demo.title}
                </h2>
                <div className="mt-1 hidden gap-1.5 md:flex">
                  {demo.tags.map((tag) => (
                    <Badge key={tag} variant={demo.accent}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setResetKey((k) => k + 1)}
                  title="Reset scene to defaults"
                >
                  <RotateCcw className="size-3.5" />
                  <span className="hidden sm:inline">Reset Scene</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    takeScreenshot(canvasAreaRef.current, demo.id)
                  }
                  title="Download a PNG of the current view"
                >
                  <Camera className="size-3.5" />
                  <span className="hidden sm:inline">Screenshot</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close demo"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </header>

            {/* body */}
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              {/* scene */}
              <div
                ref={canvasAreaRef}
                className="relative min-h-[46vh] flex-1 overflow-hidden lg:min-h-0"
              >
                <DemoComponent key={resetKey} />
              </div>

              {/* explanation sidebar */}
              <aside className="max-h-[42vh] shrink-0 overflow-y-auto border-t border-white/10 bg-[#0c1830]/70 lg:max-h-none lg:w-[24rem] lg:border-t-0 lg:border-l">
                <div className="space-y-5 p-5 md:p-6">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-blue-400 uppercase">
                      The concept
                    </p>
                    <h3 className="text-sm leading-snug font-semibold text-slate-100">
                      {demo.explanation.heading}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {demo.explanation.paragraphs.map((p, i) => (
                      <p
                        key={i}
                        className="text-[13px] leading-relaxed text-slate-300/90"
                      >
                        {p}
                      </p>
                    ))}
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-purple-400 uppercase">
                      <Lightbulb className="size-3" /> What to notice
                    </p>
                    <ul className="space-y-2">
                      {demo.explanation.notice.map((n, i) => (
                        <li key={i} className="flex gap-2 text-[13px]">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400/80" />
                          <span className="leading-relaxed text-slate-300/90">
                            {n}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-cyan-400 uppercase">
                      <Globe2 className="size-3" /> In the real world
                    </p>
                    <p className="text-[13px] leading-relaxed text-slate-300/90">
                      {demo.explanation.realWorld}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
