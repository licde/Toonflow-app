import type { Knex } from "knex";
import fs from "fs";
import path from "path";
import u from "@/utils";
import type { AutoDesignJob, AutoDesignStage, ResolvedContext, StoryboardPanelInput } from "./types";
import { extractScriptMeta } from "../parsers/scriptMetaExtractor";
import { getEmotionNormFromPlan, loadStylePack } from "../emotion/emotionNorm";

export interface AutoDesignInput {
  script: string;
  context: ResolvedContext;
  fromStage?: AutoDesignStage;
}

export interface AutoDesignOutput {
  scriptPlan: string;
  storyboardTable: string;
  storyboard: StoryboardPanelInput[];
}

function parseScenes(script: string): { name: string; lines: string[] }[] {
  const blocks = script.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const scenes: { name: string; lines: string[] }[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const header = lines[0] ?? "";
    const sceneMatch = header.match(/场\s*(\d+)?\s*(.+?)(?:\s+日|\s+夜|\s+内|\s+外)?$/);
    const name = sceneMatch?.[2]?.trim() || header || `场${scenes.length + 1}`;
    const body = sceneMatch ? lines.slice(1) : lines;
    scenes.push({ name, lines: body.length ? body : [header] });
  }
  if (!scenes.length) scenes.push({ name: "场1", lines: [script.trim()] });
  return scenes;
}

function estimateDuration(line: string): number {
  const quoted = line.match(/[""]([^""]+)[""]/);
  const text = quoted?.[1] ?? line;
  const chars = text.replace(/[^\u4e00-\u9fff]/g, "").length;
  return Math.max(2, Math.min(15, Math.ceil(chars / 4) || 2));
}

export function runHeuristicAutoDesign(input: AutoDesignInput): AutoDesignOutput {
  const { script, context } = input;
  const scenes = parseScenes(script);
  const meta = extractScriptMeta(script);
  const characters = meta.characters ?? context.assets.map((a) => a.name).filter(Boolean);
  const brief = context.designBrief;
  const emotionCurve = brief?.emotionCurveOutline;
  let profileId = "generic";
  let styleMotions: string[] = ["static", "gentle push"];
  try {
    const planish = {
      planData: {
        emotionNorm: (context as { emotionNorm?: { activeProfileId?: string } }).emotionNorm,
      },
    };
    profileId = getEmotionNormFromPlan(planish as never).activeProfileId;
    const pack = loadStylePack(profileId);
    styleMotions = pack.allowedMotions ?? styleMotions;
  } catch {
    /* fixtures optional at cold start */
  }

  const scriptPlanLines: string[] = ["# 导演规划（autoDesign）", ""];
  if (brief?.infoLinkageChain?.length) {
    scriptPlanLines.push(`信息联动：${brief.infoLinkageChain.join(" → ")}`, "");
  }
  const emotionBase = emotionCurve?.[0] ?? 4;
  scenes.forEach((scene, i) => {
    const emotion = emotionCurve?.[i] ?? Math.min(10, emotionBase + (i % 3));
    const dialogueCount = scene.lines.filter((l) => /[""]/.test(l)).length;
    scriptPlanLines.push(`## 场${i + 1}：${scene.name}`);
    scriptPlanLines.push(`- 情绪：${emotion}`);
    scriptPlanLines.push(`- 台词数：${dialogueCount}`);
    scriptPlanLines.push(`- 注意事项：承接${context.anchors?.emotionCarry ?? "主线情绪"}`);
    if (i > 0) scriptPlanLines.push(`- 场间过渡：切至${scene.name}`);
    scriptPlanLines.push("");
  });
  if (context.continuity?.recapHint || context.continuity?.prevEpisodeSummary) {
    scriptPlanLines.unshift(`前情承接：${context.continuity.recapHint || context.continuity.prevEpisodeSummary}`, "");
  }
  const scriptPlan = scriptPlanLines.join("\n");

  const tableRows: string[] = [
    "| 镜 | 类型 | 场景 | 台词 | 时长 |",
    "| --- | --- | --- | --- | --- |",
  ];
  const panels: StoryboardPanelInput[] = [];
  let shotIndex = 0;

  scenes.forEach((scene) => {
    scene.lines.forEach((line) => {
      shotIndex++;
      const hasDialogue = /[""]/.test(line);
      const type = hasDialogue ? "CHAR-SCENE" : "PURE-SCENE";
      const duration = estimateDuration(line);
      const char = characters.find((c) => line.includes(c)) ?? characters[0] ?? "角色";
      const motion = hasDialogue ? "static" : (styleMotions.find((m) => m !== "static") ?? styleMotions[0] ?? "static");
      const shotSize = hasDialogue ? "近景" : "中景";
      tableRows.push(`| ${shotIndex} | ${type} | ${scene.name} | ${line.replace(/\|/g, "\\|")} | ${duration}s |`);
      panels.push({
        clientId: `sb-${shotIndex}`,
        duration,
        prompt: `${char}，${scene.name}，${line.slice(0, 40)}`,
        videoDesc: `${shotSize} ${motion}, ${duration}s`,
        shouldGenerateImage: 1,
        associateAssetsIds: [],
        track: String(shotIndex),
        state: "未生成",
        index: shotIndex - 1,
      });
    });
  });

  if (!panels.length) {
    panels.push({
      clientId: "sb-1",
      duration: 3,
      prompt: `${characters[0] ?? "角色"}，默认场景`,
      videoDesc: "medium shot static, 3s",
      shouldGenerateImage: 1,
      associateAssetsIds: [],
      track: "1",
      state: "未生成",
      index: 0,
    });
    tableRows.push(`| 1 | CHAR-SCENE | 默认 | ${script.slice(0, 80)} | 3s |`);
  }

  return { scriptPlan, storyboardTable: tableRows.join("\n"), storyboard: panels };
}

async function runLlmStage(skillFile: string, userContent: string, agentKey: "productionAgent:directorPlanAgent" | "productionAgent:storyboardTableAgent" | "productionAgent:storyboardPanelAgent"): Promise<string> {
  const skillPath = path.join(u.getPath("skills"), skillFile);
  const system = await fs.promises.readFile(skillPath, "utf-8");
  const { text } = await u.Ai.Text(agentKey).invoke({
    system: system.slice(0, 12000),
    messages: [{ role: "user", content: userContent }],
  });
  return text;
}

function extractXmlTag(text: string, tag: string): string {
  const m = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1]?.trim() ?? text.trim();
}

export async function runAutoDesign(input: AutoDesignInput, useLlm = false): Promise<AutoDesignOutput> {
  if (!useLlm) return runHeuristicAutoDesign(input);

  try {
    const gbText = await runLlmStage(
      "production_execution_director_plan.md",
      `剧本：\n${input.script}\n\n上下文：\n${JSON.stringify({ continuity: input.context.continuity, anchors: input.context.anchors }, null, 2)}`,
      "productionAgent:directorPlanAgent",
    );
    const scriptPlan = extractXmlTag(gbText, "scriptPlan") || gbText;

    const sbText = await runLlmStage(
      "production_execution_storyboard_table.md",
      `剧本：\n${input.script}\n\n导演规划：\n${scriptPlan}`,
      "productionAgent:storyboardTableAgent",
    );
    const storyboardTable = extractXmlTag(sbText, "storyboardTable") || sbText;

    const heuristic = runHeuristicAutoDesign({ ...input, script: input.script });
    return { scriptPlan, storyboardTable, storyboard: heuristic.storyboard };
  } catch (e) {
    console.warn("[autoDesign] LLM 失败，降级启发式:", u.error(e).message);
    return runHeuristicAutoDesign(input);
  }
}

const jobs = new Map<string, AutoDesignJob>();

async function persistJob(db: Knex, job: AutoDesignJob): Promise<void> {
  const key = `autoDesignJob:${job.id}`;
  const row = await db("o_agentWorkData").where({ projectId: job.projectId, key }).first();
  const payload = JSON.stringify(job);
  if (row) {
    await db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
  } else {
    await db("o_agentWorkData").insert({
      projectId: job.projectId,
      episodesId: job.scriptId,
      key,
      data: payload,
      createTime: Date.now(),
    });
  }
}

async function loadJobFromDb(db: Knex, jobId: string): Promise<AutoDesignJob | null> {
  const row = await db("o_agentWorkData").where("key", `autoDesignJob:${jobId}`).first();
  if (!row?.data) return null;
  try {
    return JSON.parse(row.data as string) as AutoDesignJob;
  } catch {
    return null;
  }
}

export function createAutoDesignJob(projectId: number, scriptId: number): AutoDesignJob {
  const id = `ad-${projectId}-${scriptId}-${Date.now()}`;
  const job: AutoDesignJob = {
    id,
    projectId,
    scriptId,
    status: "pending",
    stage: "GB",
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export async function createAndPersistAutoDesignJob(db: Knex, projectId: number, scriptId: number): Promise<AutoDesignJob> {
  const job = createAutoDesignJob(projectId, scriptId);
  await persistJob(db, job);
  return job;
}

export function getAutoDesignJob(jobId: string): AutoDesignJob | null {
  return jobs.get(jobId) ?? null;
}

export async function loadAutoDesignJob(db: Knex, jobId: string): Promise<AutoDesignJob | null> {
  const mem = jobs.get(jobId);
  if (mem) return mem;
  return loadJobFromDb(db, jobId);
}

export async function executeAutoDesignJob(
  db: Knex,
  jobId: string,
  input: AutoDesignInput,
  persist: (output: AutoDesignOutput, stage: AutoDesignStage) => Promise<void>,
  useLlm = false,
): Promise<AutoDesignJob> {
  const job = jobs.get(jobId);
  if (!job) throw new Error("autoDesign job 不存在");
  job.status = "running";
  job.updatedAt = Date.now();

  const stages: AutoDesignStage[] = ["GB", "SB", "EN"];
  const startIdx = input.fromStage && input.fromStage !== "done" ? stages.indexOf(input.fromStage) : 0;

  try {
    let output: AutoDesignOutput | null = null;
    for (let i = Math.max(0, startIdx); i < stages.length; i++) {
      const stage = stages[i]!;
      job.stage = stage;
      job.progress = Math.round(((i + 1) / stages.length) * 100);
      job.updatedAt = Date.now();
      await persistJob(db, job);

      if (stage === "GB" || !output) {
        output = await runAutoDesign(input, useLlm);
        await persist(output, "GB");
      } else if (stage === "SB" && output) {
        await persist(output, "SB");
      } else if (stage === "EN" && output) {
        await persist(output, "EN");
      }
    }

    job.stage = "done";
    job.status = "done";
    job.progress = 100;
    job.result = {
      scriptPlan: output?.scriptPlan,
      storyboardTable: output?.storyboardTable,
      storyboardCount: output?.storyboard.length,
    };
    job.updatedAt = Date.now();
    await persistJob(db, job);
    return job;
  } catch (e) {
    job.status = "partial";
    job.stage = "failed";
    job.error = u.error(e).message;
    job.updatedAt = Date.now();
    await persistJob(db, job);
    return job;
  }
}

export async function shouldUseLlm(db: Knex, projectId: number): Promise<boolean> {
  try {
    const row = await db("o_setting").where("key", "autoDesignUseLlm").first();
    if (row?.value === "0") return false;
    const deploy = await db("o_agentDeploy").where("key", "productionAgent").first();
    return Boolean(deploy?.modelName);
  } catch {
    return false;
  }
}
