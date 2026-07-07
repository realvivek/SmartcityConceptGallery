"use client";

import { RadioTower } from "lucide-react";

/** Fullscreen loading state while a demo bundle streams in. */
export function DemoLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="relative">
        <RadioTower className="size-10 text-blue-400" />
        <span className="absolute -inset-3 animate-ping rounded-full border border-blue-500/40" />
        <span className="absolute -inset-6 animate-ping rounded-full border border-purple-500/20 [animation-delay:300ms]" />
      </div>
      <p className="text-xs tracking-widest text-slate-400 uppercase">
        Initializing scene…
      </p>
    </div>
  );
}
