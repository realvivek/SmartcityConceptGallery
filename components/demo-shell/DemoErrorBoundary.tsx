"use client";

import { Component, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Remount the scene without a full page reload. */
  onRetry: () => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches anything that goes wrong inside a demo scene — a failed lazy
 * chunk after a redeploy, a device-specific WebGL hiccup — and offers a
 * friendly recovery instead of Next's "Application error" screen.
 */
export class DemoErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private get isStaleChunk() {
    const msg = this.state.error?.message ?? "";
    return /chunk|import|fetch|Loading/i.test(msg);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <TriangleAlert className="size-5" />
        </span>
        <div className="space-y-1.5">
          <p className="font-display text-base font-semibold text-ink">
            This scene couldn&apos;t load
          </p>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            {this.isStaleChunk
              ? "The site was updated since this page was opened, so a fresh copy is needed."
              : "Something went wrong while starting the 3D scene on this device."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              if (this.isStaleChunk) {
                window.location.reload();
              } else {
                this.setState({ error: null });
                this.props.onRetry();
              }
            }}
          >
            <RefreshCw className="size-3.5" />
            {this.isStaleChunk ? "Refresh page" : "Try again"}
          </Button>
          {!this.isStaleChunk && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
          )}
        </div>
      </div>
    );
  }
}
