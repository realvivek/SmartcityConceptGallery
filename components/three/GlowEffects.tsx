"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

interface GlowEffectsProps {
  bloomIntensity?: number;
  luminanceThreshold?: number;
  vignetteDarkness?: number;
}

/**
 * Shared post-processing stack: mipmap bloom tuned for emissive signal
 * geometry on a dark navy background, plus a subtle vignette.
 */
export function GlowEffects({
  bloomIntensity = 1.1,
  luminanceThreshold = 0.18,
  vignetteDarkness = 0.72,
}: GlowEffectsProps) {
  return (
    <EffectComposer>
      <Bloom
        mipmapBlur
        intensity={bloomIntensity}
        luminanceThreshold={luminanceThreshold}
        luminanceSmoothing={0.25}
      />
      <Vignette eskil={false} offset={0.18} darkness={vignetteDarkness} />
    </EffectComposer>
  );
}
