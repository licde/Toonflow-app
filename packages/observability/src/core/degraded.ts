export type DegradedMode = "normal" | "file_only" | "stdout_only" | "noop";

export interface DegradedState {
  mode: DegradedMode;
  reason?: string;
  since?: number;
}

export class DegradedChain {
  private state: DegradedState = { mode: "normal" };

  getState(): DegradedState {
    return { ...this.state };
  }

  degrade(mode: DegradedMode, reason: string) {
    if (this.state.mode === mode) return;
    this.state = { mode, reason, since: Date.now() };
    console.warn(`[observability] degraded → ${mode}: ${reason}`);
  }

  recover() {
    if (this.state.mode === "normal") return;
    this.state = { mode: "normal" };
  }

  allows(transport: "stdout" | "file" | "sqlite" | "external"): boolean {
    if (this.state.mode === "noop") return false;
    if (this.state.mode === "stdout_only") return transport === "stdout";
    if (this.state.mode === "file_only") return transport === "file";
    return true;
  }
}
