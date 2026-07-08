import u from "@/utils";
import {
  generateStoryboardImage,
  generateStoryboardVideo,
} from "../structuredScript/generation";
import { loadStructuredSource } from "../structuredScript/importPipeline";
import { ensureDeriveVariants } from "../structuredScript/deriveVariant";
import { assembleTimeline } from "./TimelineAssembler";

export type GenerationPhase = "assets" | "variants" | "images" | "videos" | "assemble" | "done";

export interface ExecuteOptions {
  projectId: number;
  scriptId: number;
  storyboardIds?: number[];
  phases?: GenerationPhase[];
  tier?: "1K" | "2K" | "4K";
  audio?: boolean;
  concurrency?: number;
  onProgress?: (p: {
    phase: GenerationPhase;
    completed: number;
    total: number;
    currentShot?: number;
    errors: { storyboardId: number; error: string }[];
  }) => void;
}

/** 五阶段编排：变体元数据 → 分镜图 → 视频 → 组装 */
export async function executeStructuredGeneration(opts: ExecuteOptions) {
  const {
    projectId,
    scriptId,
    phases = ["variants", "images", "videos"],
    tier = "2K",
    audio,
    concurrency = 3,
    onProgress,
  } = opts;

  const json = await loadStructuredSource(projectId);
  if (!json) throw new Error("未找到结构化 JSON，请先 importStructured");

  let storyboardIds = opts.storyboardIds;
  if (!storyboardIds?.length) {
    const rows = await u
      .db("o_storyboard")
      .where({ projectId, scriptId })
      .whereNot("state", "archived")
      .orderBy("index", "asc");
    storyboardIds = rows.map((r) => r.id!);
  }

  const errors: { storyboardId: number; error: string }[] = [];
  const report: Record<string, unknown> = {};

  if (phases.includes("variants")) {
    onProgress?.({ phase: "variants", completed: 0, total: storyboardIds.length, errors });
    await ensureDeriveVariants(projectId, json, storyboardIds);
    onProgress?.({ phase: "variants", completed: storyboardIds.length, total: storyboardIds.length, errors });
  }

  if (phases.includes("images")) {
    let done = 0;
    for (let i = 0; i < storyboardIds.length; i += concurrency) {
      const batch = storyboardIds.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (id) => {
          try {
            await generateStoryboardImage(id, projectId, tier);
          } catch (e) {
            errors.push({ storyboardId: id, error: u.error(e).message });
          } finally {
            done++;
            onProgress?.({ phase: "images", completed: done, total: storyboardIds!.length, errors });
          }
        }),
      );
    }
  }

  if (phases.includes("videos")) {
    let done = 0;
    for (let i = 0; i < storyboardIds.length; i += concurrency) {
      const batch = storyboardIds.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (id) => {
          try {
            const r = await generateStoryboardVideo(id, projectId, { audio });
            report[`sb_${id}`] = r;
          } catch (e) {
            errors.push({ storyboardId: id, error: u.error(e).message });
          } finally {
            done++;
            onProgress?.({ phase: "videos", completed: done, total: storyboardIds!.length, errors });
          }
        }),
      );
    }
  }

  let assembleResult;
  if (phases.includes("assemble")) {
    assembleResult = await assembleTimeline({ projectId, scriptId, skipConcat: false });
    onProgress?.({ phase: "assemble", completed: 1, total: 1, errors });
  }

  onProgress?.({ phase: "done", completed: storyboardIds.length, total: storyboardIds.length, errors });

  return { storyboardIds, errors, report, assembleResult };
}
