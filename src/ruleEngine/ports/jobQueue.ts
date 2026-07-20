import type { GenerationJob, GenerationJobQueuePort } from "./index";
import { EventEmitter } from "events";

type JobRow = GenerationJob & { cancelRequested?: boolean; updatedAt: number };

const jobs = new Map<string, JobRow>();
const bus = new EventEmitter();
let persistPath: string | null = null;

/** Optional file persistence for production; memory Map alone is test-only. */
export function configureJobQueuePersist(filePath: string | null): void {
  persistPath = filePath;
}

async function flushPersist(): Promise<void> {
  if (!persistPath) return;
  try {
    const fs = await import("fs/promises");
    const payload = JSON.stringify([...jobs.entries()]);
    await fs.writeFile(persistPath, payload, "utf8");
  } catch {
    /* best-effort */
  }
}

export type ExtendedJobQueue = GenerationJobQueuePort & {
  cancel(jobId: string): Promise<boolean>;
  complete(jobId: string): Promise<boolean>;
  list(): GenerationJob[];
  onUpdate(cb: (job: GenerationJob) => void): () => void;
};

export const generationJobQueue: ExtendedJobQueue = {
  async enqueue(job) {
    const full: JobRow = { ...job, status: "pending", updatedAt: Date.now() };
    jobs.set(job.id, full);
    bus.emit("update", full);
    await flushPersist();
    return job.id;
  },
  async getStatus(jobId) {
    return jobs.get(jobId) ?? null;
  },
  async cancel(jobId: string) {
    const j = jobs.get(jobId);
    if (!j) return false;
    j.cancelRequested = true;
    if (j.status === "pending" || j.status === "running") j.status = "failed";
    j.updatedAt = Date.now();
    bus.emit("update", j);
    await flushPersist();
    return true;
  },
  async complete(jobId: string) {
    const j = jobs.get(jobId);
    if (!j) return false;
    j.status = "done";
    j.updatedAt = Date.now();
    bus.emit("update", j);
    await flushPersist();
    return true;
  },
  list() {
    return [...jobs.values()];
  },
  onUpdate(cb) {
    bus.on("update", cb);
    return () => bus.off("update", cb);
  },
};

export function __resetJobQueue(): void {
  jobs.clear();
}
