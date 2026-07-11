/** Port 接口 — 可移植边界 */
export interface AssetPort {
  uploadReferenceAsset(localPath: string): Promise<string>;
  preflightPublicUrl(url: string): Promise<boolean>;
}

export interface MediaProbePort {
  probeDuration(filePath: string): Promise<number>;
  probeHasAudio(filePath: string): Promise<boolean>;
}

export interface GenerationFeedbackInput {
  modality: "image" | "video" | "audio";
  shotId: string;
  error: string;
  vendorCode?: string;
}

export interface GenerationFeedbackPort {
  classifyFailure(input: GenerationFeedbackInput): Promise<{
    ruleId?: string;
    upstreamPatches: { fieldPath: string; rollbackLayer: string; suggestion: string }[];
  }>;
}

export interface GenerationJob {
  id: string;
  shotId: string;
  modality: string;
  priority: number;
  status: "pending" | "running" | "done" | "failed";
}

export interface GenerationJobQueuePort {
  enqueue(job: Omit<GenerationJob, "status">): Promise<string>;
  getStatus(jobId: string): Promise<GenerationJob | null>;
}
