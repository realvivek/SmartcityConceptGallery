"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

interface GlowEffectsProps {
  bloomIntensity?: number;
  luminanceThreshold?: number;
  vignetteDarkness?: number;
}

/**
 * Shared post-processing for the day-lit look: a restrained bloom that
 * only catches genuinely emissive signal geometry (high threshold so the
 * bright paper scene stays crisp), plus a whisper of vignette.
 */
export function GlowEffects({
  bloomIntensity = 0.55,
  luminanceThreshold = 0.88,
  vignetteDarkness = 0.16,
}: GlowEffectsProps) {
  return (
    <EffectComposer>
      <Bloom
        mipmapBlur
        intensity={bloomIntensity}
        luminanceThreshold={luminanceThreshold}
        luminanceSmoothing={0.18}
      />
      <Vignette eskil={false} offset={0.12} darkness={vignetteDarkness} />
    </EffectComposer>
  );
}
