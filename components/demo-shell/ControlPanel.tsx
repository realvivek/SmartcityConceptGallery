"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

/**
 * Floating drafting-sheet control panel used by every demo — paper,
 * hairline ink border, corner ticks, hard offset shadow. Collapsible so
 * it never permanently obstructs the scene.
 */
export function ControlPanel({
  title = "Controls",
  children,
  className,
  defaultOpen = true,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-3 left-3 w-[17rem] max-w-[calc(100%-1.5rem)] select-none",
        className
      )}
      // above drei <Html> overlays, which use z-indices up to ~16777271
      style={{ zIndex: 16777272 }}
    >
      <div className="paper-panel corner-ticks relative overflow-hidden rounded-md">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left"
          aria-expanded={open}
        >
          <SlidersHorizontal className="size-3.5 text-primary" />
          <span className="flex-1 font-mono text-[11px] font-semibold tracking-[0.18em] text-ink uppercase">
            {title}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="max-h-[52vh] space-y-4 overflow-y-auto px-4 pt-1 pb-4">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Slider with label + live formatted value, consistent across demos. */
export function LabeledSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v: number) => `${v}`,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-[11px] text-primary tabular-nums">
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </div>
  );
}

/** Labelled switch row. */
export function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

/** Muted helper text inside a control panel. */
export function ControlHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

/** Small stat readout row (label + monospace value). */
export function StatRow({
  label,
  value,
  accent = "text-primary",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xs tabular-nums", accent)}>
        {value}
      </span>
    </div>
  );
}
