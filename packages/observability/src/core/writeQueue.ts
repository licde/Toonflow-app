import type { LogEvent, LogSink } from "../types";

export interface WriteQueueOptions {
  maxBatch?: number;
  flushMs?: number;
  maxQueue?: number;
}

export class WriteQueue {
  private queue: LogEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private sinks: LogSink[] = [];
  private readonly maxBatch: number;
  private readonly flushMs: number;
  private readonly maxQueue: number;
  dropped = 0;

  constructor(opts: WriteQueueOptions = {}) {
    this.maxBatch = opts.maxBatch ?? 50;
    this.flushMs = opts.flushMs ?? 200;
    this.maxQueue = opts.maxQueue ?? 5000;
  }

  setSinks(sinks: LogSink[]) {
    this.sinks = sinks;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.flush(), this.flushMs);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  enqueue(event: LogEvent) {
    if (this.queue.length >= this.maxQueue) {
      this.dropped += 1;
      return;
    }
    this.queue.push(event);
    if (this.queue.length >= this.maxBatch) void this.flush();
  }

  async flush() {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0, this.maxBatch);
    for (const event of batch) {
      for (const sink of this.sinks) {
        try {
          await sink(event);
        } catch (e) {
          console.error("[observability writeQueue sink error]", e);
        }
      }
    }
  }
}
