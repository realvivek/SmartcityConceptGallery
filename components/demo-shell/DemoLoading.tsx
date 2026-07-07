"use client";

import { RadioTower } from "lucide-react";

/** Fullscreen loading state while a demo bundle streams in. */
export function DemoLoading() {
  return (
    <div className="blueprint-grid flex h-full w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="relative">
        <RadioTower className="size-10 text-primary" />
        <span className="absolute -inset-3 animate-ping rounded-full border border-indigo-500/40" />
        <span className="absolute -inset-6 animate-ping rounded-full border border-[#ff5d4d]/30 [animation-delay:300ms]" />
      </div>
      <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
        Initializing scene…
      </p>
    </div>
  );
}
