"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { DemoId } from "@/lib/demos";
import { DemoLoading } from "@/components/demo-shell/DemoLoading";

/**
 * Lazy map of demo scenes. Each demo is code-split and only loads
 * (client-side, since WebGL) when its modal opens.
 */
export const DEMO_COMPONENTS: Record<DemoId, ComponentType> = {
  beamforming: dynamic(() => import("./beamforming"), {
    ssr: false,
    loading: DemoLoading,
  }),
  dataflow: dynamic(() => import("./dataflow"), {
    ssr: false,
    loading: DemoLoading,
  }),
  coverage: dynamic(() => import("./coverage"), {
    ssr: false,
    loading: DemoLoading,
  }),
  interference: dynamic(() => import("./interference"), {
    ssr: false,
    loading: DemoLoading,
  }),
  radiation: dynamic(() => import("./radiation"), {
    ssr: false,
    loading: DemoLoading,
  }),
  workload: dynamic(() => import("./workload"), {
    ssr: false,
    loading: DemoLoading,
  }),
};
