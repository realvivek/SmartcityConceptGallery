"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

/**
 * Drafting-gauge slider: a hairline rail with tick marks, an indigo→coral
 * fill, and a rotated-square (diamond) thumb — deliberately not the stock
 * rounded-pill look.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min],
    [value, defaultValue, min]
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none py-1 data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-[3px] w-full grow bg-ink/20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(36,52,77,0.4) 0, rgba(36,52,77,0.4) 1px, transparent 1px, transparent 12.5%)",
        }}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-gradient-to-r from-indigo-600 to-[#ff5d4d]"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="block size-3.5 shrink-0 rotate-45 border-[1.5px] border-ink bg-card shadow-[2px_2px_0_rgba(36,52,77,0.35)] transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
