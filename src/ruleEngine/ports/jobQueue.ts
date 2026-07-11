import type { GenerationJob, GenerationJobQueuePort } from "./index";

const jobs = new Map<string, GenerationJob>();

export const generationJobQueue: GenerationJobQueuePort = {
  async enqueue(job) {
    const full: GenerationJob = { ...job, status: "pending" };
    jobs.set(job.id, full);
    return job.id;
  },
  async getStatus(jobId) {
    return jobs.get(jobId) ?? null;
  },
};
