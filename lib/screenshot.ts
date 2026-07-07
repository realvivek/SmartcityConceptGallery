"use client";

import { toast } from "sonner";

/**
 * Capture the WebGL canvas inside `container` and download it as a PNG.
 * Requires the canvas to be created with `preserveDrawingBuffer: true`
 * (our shared DemoCanvas does this).
 */
export function takeScreenshot(
  container: HTMLElement | null,
  filename = "rf-smart-cities"
): void {
  const canvas = container?.querySelector("canvas");
  if (!canvas) {
    toast.error("No canvas found to capture.");
    return;
  }
  try {
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Screenshot saved", {
      description: "Check your downloads folder.",
    });
  } catch {
    toast.error("Could not capture screenshot.");
  }
}
