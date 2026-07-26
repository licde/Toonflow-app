import { tool, jsonSchema, Tool } from "ai";
import u from "@/utils";
import { z } from "zod";
import ResTool from "@/socket/resTool";
import { loadViralInjectForProject, loadScriptAgentPlan } from "@/ruleEngine/genre/viralAgentInject";
import {
  extractPeakLedgerFromText,
  setPeakHookOnPlan,
} from "@/ruleEngine/design/extractPeakLedger";
import { getGenreTemplateFromPlan, syncPackIdAliases } from "@/ruleEngine/genre/loadGenreTemplatePack";
import { compileViralWritingContext } from "@/ruleEngine/genre/compileWritingBrief";
import { healViralDesignRouter } from "@/ruleEngine/design/healViralDesignRouter";
import {
  confirmPendingStoryRecon,
  reconstructStoryFromSignals,
} from "@/ruleEngine/design/reconstructStoryFromSignals";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { isLiteraryLocked, setLiteraryLocked } from "@/ruleEngine/design/viralDoctrine";
import { normalizeVisualBeatTags, defaultTagsFromPurpose, migrateShotVisualBeatTags } from "@/ruleEngine/design/visualBeatPolicy";
import { suggestVisualBeatTags } from "@/ruleEngine/design/visualBeatSuggestor";
import { runShotExpanders } from "@/ruleEngine/design/expanderRegistry";
import { setVisBeatOverrideOnShot, planForwardReentry } from "@/ruleEngine/design/visBeatLifecycle";
import { buildVisBeatDryRunPanel, exemplarSuggestTags } from "@/ruleEngine/design/visBeatEnhance";
import { dryRunSplitOrchestrator } from "@/ruleEngine/design/splitOrchestrator";
import { decideSplitForLine } from "@/ruleEngine/design/designSplitDecision";
import { runForwardReentryAfterRepair } from "@/ruleEngine/design/designSplitLifecycle";
import { runContractStructureHeal } from "@/ruleEngine/heal/contractStructureHeal";
import { gateChatShotWriteback } from "@/ruleEngine/design/chatWriteGate";
import { persistSplitTripleAtomic } from "@/ruleEngine/design/splitWritebackAtomic";

export const ScriptSchema = z.object({
  name: z.string().describe("剧本名称"),
  content: z.string().describe("剧本内容"),
});
export const planData = z.object({
  preCheck: z.string().describe("源材料预检 P0"),
  adaptationMatrix: z.string().describe("改编矩阵 P0.3"),
  storyCore: z.string().describe("故事核心 P0.6"),
  postCheck: z.string().describe("后检 P0.8"),
  reinforcement: z.string().describe("加固 P0.9"),
  globalAnchors: z.string().describe("G层全局锚点"),
  storySkeleton: z.string().describe("故事骨架"),
  adaptationStrategy: z.string().describe("改编策略"),
  script: z.string().describe("剧本内容"),
});

export type planData = z.infer<typeof planData>;

const keySchema = z.enum(Object.keys(planData.shape) as [keyof planData, ...Array<keyof planData>]);
const planDataKeyLabels = Object.fromEntries(
  Object.entries(planData.shape).map(([key, schema]) => [key, (schema as z.ZodTypeAny).description ?? key]),
) as Record<keyof planData, string>;

interface ToolConfig {
  resTool: ResTool;
  toolsNames?: string[];
  msg: ReturnType<ResTool["newMessage"]>;
}

export default (toolCpnfig: ToolConfig) => {
  const { resTool, toolsNames, msg } = toolCpnfig;
  const { socket } = resTool;
  const tools: Record<string, Tool> = {
    get_novel_events: tool({
      description: "获取章节事件",
      inputSchema: jsonSchema<{ chapterIndexs: number[] }>(
        z
          .object({
            chapterIndexs: z.array(z.number()).describe("章节的编号"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ chapterIndexs }) => {
        console.log("[tools] get_novel_events", chapterIndexs);
        const thinking = msg.thinking("正在查询章节事件...");
        const data = await u
          .db("o_novel")
          .where("projectId", resTool.data.projectId)
          .select("id", "chapterIndex as index", "reel", "chapter", "chapterData", "event", "eventState")
          .whereIn("chapterIndex", chapterIndexs);
        thinking.appendText("正在查询章节编号: " + chapterIndexs.join(","));
        const eventString = data.map((i: any) => [`第${i.index}章，标题:${i.chapter}，事件:${i.event}`].join("\n")).join("\n");
        thinking.appendText("查询结果:\n" + eventString);
        thinking.updateTitle("查询章节事件完成");
        thinking.complete();
        return eventString ?? "无数据";
      },
    }),
    get_planData: tool({
      description: "获取工作区数据",
      inputSchema: jsonSchema<{ key: keyof planData }>(
        z
          .object({
            key: keySchema.describe("数据key"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ key }) => {
        console.log("[tools] get_planData", key);
        const thinking = msg.thinking(`正在获取${planDataKeyLabels[key]}工作区数据...`);
        const planDataRes: planData = await new Promise((resolve) => socket.emit("getPlanData", { key }, (res: any) => resolve(res)));
        thinking.appendText(`获取到${planDataKeyLabels[key]}:\n` + planDataRes[key]);
        thinking.updateTitle(`获取${planDataKeyLabels[key]}完成`);
        thinking.complete();
        return planDataRes[key] ?? "无数据";
      },
    }),
    get_viral_writing_context: tool({
      description:
        "获取当前爆款写作 brief（原→改示范、peak/hook、付费卡、时长规范）。改编各阶段步骤0须先调用。",
      inputSchema: jsonSchema<{ stageId?: string }>(
        z
          .object({
            stageId: z.string().optional().describe("阶段如 P0/P06/W1/W3/designBrief/SB，默认 W3"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ stageId }) => {
        const stage = stageId || "W3";
        const thinking = msg.thinking(`正在加载爆款写作 brief（${stage}）...`);
        try {
          const { injectBlock, ctx } = await loadViralInjectForProject(resTool.data.projectId, stage);
          thinking.appendText(injectBlock.slice(0, 4000));
          thinking.updateTitle("爆款 brief 已加载");
          thinking.complete();
          return JSON.stringify({
            packId: ctx.packId,
            stageId: ctx.stageId,
            stageBrief: ctx.stageBrief,
            reconstructionExamples: ctx.reconstructionExamples,
            peakLedger: ctx.peakLedger,
            hookPlan: ctx.hookPlan,
            ctaHint: ctx.ctaHint,
            agentInjectBlock: ctx.agentInjectBlock,
          });
        } catch (e) {
          thinking.appendText(String(e));
          thinking.updateTitle("加载 brief 失败");
          thinking.complete();
          return "无 viralWritingContext";
        }
      },
    }),
    extract_peak_hook: tool({
      description:
        "从源材料/章节文本智能抓取视听爆点 peakLedger 与钩子 hookPlan（含付费卡意图），可写入工作区。",
      inputSchema: jsonSchema<{ sourceText: string; persist?: boolean; packId?: string }>(
        z
          .object({
            sourceText: z.string().describe("源材料或章节原文"),
            persist: z.boolean().optional().describe("是否写入 planData，默认 true"),
            packId: z.string().optional().describe("题材公式，默认当前 pack"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ sourceText, persist, packId }) => {
        const thinking = msg.thinking("正在抓取视听爆点与钩子...");
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        syncPackIdAliases(plan);
        const resolvedPack = packId || getGenreTemplateFromPlan(plan).packId || "generic";
        const extracted = extractPeakLedgerFromText(sourceText, { packId: resolvedPack });
        const shouldPersist = persist !== false;
        if (shouldPersist) {
          setPeakHookOnPlan(plan, extracted);
          const payload = JSON.stringify(plan);
          const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
          if (row) {
            await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
          } else {
            await u.db("o_agentWorkData").insert({
              projectId: resTool.data.projectId,
              key: "scriptAgent",
              data: payload,
              createTime: Date.now(),
            });
          }
        }
        const ctx = compileViralWritingContext(
          shouldPersist
            ? plan
            : {
                planData: {
                  genreTemplate: { packId: resolvedPack },
                  peakLedger: extracted.peakLedger,
                  hookPlan: extracted.hookPlan,
                },
              },
          "P0",
        );
        const summary = [
          `pack=${resolvedPack}`,
          `peaks=${extracted.peakLedger.length}`,
          `opening=${extracted.hookPlan.opening?.visualBeat || "无"}`,
          `paypoint=${extracted.hookPlan.paypointIntent?.cutBeforeBeat || "无"}`,
          `rejectedFalse=${extracted.rejectedFalsePeaks.length}`,
        ].join(" | ");
        thinking.appendText(summary + "\n" + ctx.stageBrief.slice(0, 2500));
        thinking.updateTitle("爆点钩子抓取完成");
        thinking.complete();
        return JSON.stringify({
          peakLedger: extracted.peakLedger,
          hookPlan: extracted.hookPlan,
          rejectedFalsePeaks: extracted.rejectedFalsePeaks,
          persisted: shouldPersist,
          stageBriefHint: ctx.stageBrief.slice(0, 1500),
        });
      },
    }),
    repair_viral_design: tool({
      description:
        "爆款设计智能修复：按失败域修对白/视听/模板/推动；可反推故事（需确认）。锁稿后不可改正文。",
      inputSchema: jsonSchema<{ stageId?: string; confirmStoryRecon?: boolean; maxRounds?: number }>(
        z
          .object({
            stageId: z.string().optional().describe("默认 W3"),
            confirmStoryRecon: z.boolean().optional().describe("确认提交故事反推重构"),
            maxRounds: z.number().optional(),
          })
          .toJSONSchema(),
      ),
      execute: async ({ stageId, confirmStoryRecon, maxRounds }) => {
        const thinking = msg.thinking("正在执行爆款设计修复...");
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        syncPackIdAliases(plan);
        const heal = healViralDesignRouter(plan, stageId || "W3", {
          maxRounds: maxRounds ?? 3,
          confirmStoryRecon,
          autoConfirmReverse: confirmStoryRecon,
        });
        const payload = JSON.stringify(heal.plan);
        const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
        if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
        else
          await u.db("o_agentWorkData").insert({
            projectId: resTool.data.projectId,
            key: "scriptAgent",
            data: payload,
            createTime: Date.now(),
          });
        const out = {
          ok: heal.ok,
          rounds: heal.rounds,
          changeDiff: heal.changeDiff,
          failedIds: heal.exitGate?.failedIds,
          needsUserConfirm: heal.needsUserConfirm,
          rollbackTo: heal.rollbackTo,
          blocked: heal.blocked,
        };
        thinking.appendText(JSON.stringify(out).slice(0, 4000));
        thinking.updateTitle(heal.ok ? "修复达标" : "修复未完全达标");
        thinking.complete();
        return JSON.stringify(out);
      },
    }),
    reconstruct_story_from_signals: tool({
      description:
        "由台词/视听/镜头/情绪爆点信号反推 storyCore；默认产出待确认草稿，confirm=true 提交并级联作废下游。",
      inputSchema: jsonSchema<{ confirm?: boolean }>(
        z.object({ confirm: z.boolean().optional().describe("用户确认后提交") }).toJSONSchema(),
      ),
      execute: async ({ confirm }) => {
        const thinking = msg.thinking("正在反推故事重构...");
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        syncPackIdAliases(plan);
        const result = confirm
          ? (() => {
              const pending = confirmPendingStoryRecon(plan);
              if (pending.ok || pending.blocked !== "无 pendingStoryRecon") return pending;
              return reconstructStoryFromSignals(plan, { confirm: true, forceKernel: true });
            })()
          : reconstructStoryFromSignals(plan, { confirm: false, forceKernel: true });
        const payload = JSON.stringify(plan);
        const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
        if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
        else
          await u.db("o_agentWorkData").insert({
            projectId: resTool.data.projectId,
            key: "scriptAgent",
            data: payload,
            createTime: Date.now(),
          });
        thinking.appendText(JSON.stringify(result.changeDiff).slice(0, 3000));
        thinking.updateTitle(result.needsUserConfirm ? "待用户确认故事重构" : "反推完成");
        thinking.complete();
        return JSON.stringify(result);
      },
    }),
    run_design_exit_gate: tool({
      description:
        "运行与出站相同的 designExitGate。默认 diagnose-only；传 forceExpand:true 才 apply IRD/cam/oneBeat。",
      inputSchema: jsonSchema<{ stageId?: string; forceExpand?: boolean }>(
        z.object({ stageId: z.string().optional(), forceExpand: z.boolean().optional() }).toJSONSchema(),
      ),
      execute: async ({ stageId, forceExpand }) => {
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        syncPackIdAliases(plan);
        const gate = runDesignExitGate(stageId || "W3", plan, { forceExpand: Boolean(forceExpand) });
        return JSON.stringify(gate);
      },
    }),
    unlock_literary_lock: tool({
      description: "人工解锁 literaryLocked，允许重新进入设计期改台词。",
      inputSchema: jsonSchema<Record<string, never>>(z.object({}).toJSONSchema()),
      execute: async () => {
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        setLiteraryLocked(plan, false);
        const payload = JSON.stringify(plan);
        const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
        if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
        return JSON.stringify({ literaryLocked: isLiteraryLocked(plan) });
      },
    }),
    set_visual_beat_tags: tool({
      description:
        "设置镜级 visualBeatTags（L0）。Suggestor 结果须经本工具确认后才立法。purpose 可映射默认 tags。",
      inputSchema: jsonSchema<{
        shotIndex: number;
        visualBeatTags?: string[];
        purpose?: string;
        confirmSuggested?: boolean;
      }>(
        z
          .object({
            shotIndex: z.number(),
            visualBeatTags: z.array(z.string()).optional(),
            purpose: z.string().optional(),
            confirmSuggested: z.boolean().optional(),
          })
          .toJSONSchema(),
      ),
      execute: async ({ shotIndex, visualBeatTags, purpose, confirmSuggested }) => {
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        const pd = (plan.planData ??= {}) as Record<string, unknown>;
        const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
        const idx = pack.shots.findIndex((s) => Number(s.shotIndex) === shotIndex);
        if (idx < 0) return JSON.stringify({ ok: false, error: "shot not found" });
        let shot = pack.shots[idx]!;
        if (confirmSuggested) shot = migrateShotVisualBeatTags(shot, { confirmSuggested: true });
        else {
          const tags =
            visualBeatTags?.length ? normalizeVisualBeatTags(visualBeatTags) : defaultTagsFromPurpose(purpose);
          shot = { ...shot, visualBeatTags: tags, suggestedVisualBeatTags: undefined };
        }
        pack.shots[idx] = shot;
        const payload = JSON.stringify(plan);
        const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
        if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
        return JSON.stringify({ ok: true, shotIndex, visualBeatTags: shot.visualBeatTags });
      },
    }),
    suggest_visual_beat_tags: tool({
      description: "仅提案 visualBeatTags（不 BLOCK、不扩镜）。须再用 set_visual_beat_tags 确认。",
      inputSchema: jsonSchema<{ shotIndex?: number; text?: string }>(
        z.object({ shotIndex: z.number().optional(), text: z.string().optional() }).toJSONSchema(),
      ),
      execute: async ({ shotIndex, text }) => {
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        const pack = (plan.planData as { preDesignPack?: { shots?: Record<string, unknown>[] } })?.preDesignPack;
        const shot = pack?.shots?.find((s) => Number(s.shotIndex) === shotIndex) ?? pack?.shots?.[0];
        const body = text || String(shot?.visualDescription ?? "");
        const sug = exemplarSuggestTags(body);
        const pattern = suggestVisualBeatTags({ text: body });
        return JSON.stringify({
          suggestedTags: [...new Set([...sug.suggestedTags, ...pattern.suggestedTags])],
          confidence: Math.max(sug.confidence, pattern.confidence),
          legislates: false,
        });
      },
    }),
    confirm_visual_split: tool({
      description: "确认并执行 VisBeat 扩镜（weapon→visual→dialogue_cluster）；写回须过 Chat 闸；可选 sync。",
      inputSchema: jsonSchema<{ scriptId?: number; syncStoryboard?: boolean; forceExpand?: boolean }>(
        z
          .object({
            scriptId: z.number().optional(),
            syncStoryboard: z.boolean().optional(),
            forceExpand: z.boolean().optional(),
          })
          .toJSONSchema(),
      ),
      execute: async ({ scriptId, syncStoryboard, forceExpand }) => {
        const thinking = msg.thinking("正在确认视觉拍点拆镜...");
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        const pd = (plan.planData ??= {}) as Record<string, unknown>;
        const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
        const meta = (pd.meta as Record<string, unknown>) ?? { pillarsVisBeatV2: "enforce" };
        const healed = runContractStructureHeal({ plan, shots: pack.shots, applyClusters: true });
        const forced = runShotExpanders(healed.shots as Record<string, unknown>[], {
          meta: { ...meta, pillarsVisBeatV2: meta.pillarsVisBeatV2 ?? "enforce" },
        });
        pack.shots = forced.shots;
        pd.preDesignPack = pack;
        const gate = gateChatShotWriteback(plan, { forceExpand: forceExpand !== false, stageId: "SB" });
        const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
        let syncResult: unknown;
        if (syncStoryboard && scriptId) {
          const wb = await persistSplitTripleAtomic({
            db: u.db,
            projectId: resTool.data.projectId,
            scriptId,
            plan: gate.plan,
            shots: ((gate.plan.planData as { preDesignPack?: { shots?: Record<string, unknown>[] } })?.preDesignPack
              ?.shots ?? pack.shots) as Record<string, unknown>[],
            saveAgentWork: async (p) => {
              const payload = JSON.stringify(p);
              if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
              else
                await u.db("o_agentWorkData").insert({
                  projectId: resTool.data.projectId,
                  key: "scriptAgent",
                  data: payload,
                  createTime: Date.now(),
                });
            },
          });
          if (!wb.ok) {
            thinking.updateTitle("写回失败");
            thinking.complete();
            return JSON.stringify({ ok: false, passed: false, code: wb.code, healFailed: wb.healFailed, gate });
          }
          syncResult = wb.syncResult;
        } else {
          const payload = JSON.stringify(gate.plan);
          if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
          else
            await u.db("o_agentWorkData").insert({
              projectId: resTool.data.projectId,
              key: "scriptAgent",
              data: payload,
              createTime: Date.now(),
            });
        }
        const out = {
          ok: gate.ok,
          passed: gate.passed,
          confirmRequired: gate.confirmRequired,
          shotCount: ((gate.plan.planData as { preDesignPack?: { shots?: unknown[] } })?.preDesignPack?.shots ?? [])
            .length,
          log: [...forced.log, ...gate.log],
          syncResult,
        };
        thinking.appendText(JSON.stringify(out).slice(0, 3000));
        thinking.updateTitle(gate.passed ? "视觉拆镜完成" : gate.confirmRequired ? "须 Confirm" : "拆镜未闭合");
        thinking.complete();
        return JSON.stringify(out);
      },
    }),
    set_vis_beat_override: tool({
      description: "艺术长镜头旁路：显式 visBeatOverride，禁止静默假绿。",
      inputSchema: jsonSchema<{ shotIndex: number; reason?: string; note?: string }>(
        z
          .object({
            shotIndex: z.number(),
            reason: z.string().optional(),
            note: z.string().optional(),
          })
          .toJSONSchema(),
      ),
      execute: async ({ shotIndex, reason, note }) => {
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        const pd = (plan.planData ??= {}) as Record<string, unknown>;
        const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
        const idx = pack.shots.findIndex((s) => Number(s.shotIndex) === shotIndex);
        if (idx < 0) return JSON.stringify({ ok: false, error: "shot not found" });
        pack.shots[idx] = setVisBeatOverrideOnShot(pack.shots[idx]!, {
          reason: reason || "oner_artistic",
          at: new Date().toISOString(),
          note,
        });
        const payload = JSON.stringify(plan);
        const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
        if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
        return JSON.stringify({ ok: true, override: pack.shots[idx]!.visBeatOverride });
      },
    }),
    vis_beat_dry_run: tool({
      description: "dryRun 面板：每镜 tags/矩阵命中/解释（只读）。",
      inputSchema: jsonSchema<Record<string, never>>(z.object({}).toJSONSchema()),
      execute: async () => {
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        const pd = (plan.planData ?? {}) as Record<string, unknown>;
        const shots = ((pd.preDesignPack as { shots?: Record<string, unknown>[] })?.shots ?? []) as Record<
          string,
          unknown
        >[];
        return JSON.stringify({
          panel: buildVisBeatDryRunPanel(shots, pd.meta as Record<string, unknown>),
          forwardReentry: planForwardReentry(shots),
        });
      },
    }),
    design_split_dry_run: tool({
      description: "设计拆分 dryRun：预估 lineId/镜数/NAR（不落盘）。对标 designSplitOps.dryRun。",
      inputSchema: jsonSchema<Record<string, never>>(z.object({}).toJSONSchema()),
      execute: async () => {
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        const pd = (plan.planData ?? {}) as Record<string, unknown>;
        const shots = ((pd.preDesignPack as { shots?: Record<string, unknown>[] })?.shots ?? []) as Record<
          string,
          unknown
        >[];
        return JSON.stringify(dryRunSplitOrchestrator({ planData: pd, shots, meta: pd.meta as Record<string, unknown> }));
      },
    }),
    confirm_design_split: tool({
      description:
        "确认设计拆分（同核 Orchestrator + Chat 写回闸）。有压力则拆或 Confirm；禁假绿 passed。",
      inputSchema: jsonSchema<{ scriptId?: number; syncStoryboard?: boolean; forceExpand?: boolean }>(
        z
          .object({
            scriptId: z.number().optional(),
            syncStoryboard: z.boolean().optional(),
            forceExpand: z.boolean().optional(),
          })
          .toJSONSchema(),
      ),
      execute: async ({ scriptId, syncStoryboard, forceExpand }) => {
        const thinking = msg.thinking("正在确认设计拆分编排...");
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        const gate = gateChatShotWriteback(plan, { forceExpand: forceExpand !== false, stageId: "SB" });
        const pd = (gate.plan.planData ??= {}) as Record<string, unknown>;
        const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
        const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
        let syncResult: unknown;
        if (syncStoryboard && scriptId) {
          const wb = await persistSplitTripleAtomic({
            db: u.db,
            projectId: resTool.data.projectId,
            scriptId,
            plan: gate.plan,
            shots: pack.shots,
            saveAgentWork: async (p) => {
              const payload = JSON.stringify(p);
              if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
              else
                await u.db("o_agentWorkData").insert({
                  projectId: resTool.data.projectId,
                  key: "scriptAgent",
                  data: payload,
                  createTime: Date.now(),
                });
            },
          });
          if (!wb.ok) {
            thinking.updateTitle("写回失败");
            thinking.complete();
            return JSON.stringify({ ok: false, passed: false, code: wb.code, healFailed: wb.healFailed, gate });
          }
          syncResult = wb.syncResult;
        } else {
          const payload = JSON.stringify(gate.plan);
          if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
          else
            await u.db("o_agentWorkData").insert({
              projectId: resTool.data.projectId,
              key: "scriptAgent",
              data: payload,
              createTime: Date.now(),
            });
        }
        const out = {
          ok: gate.ok,
          passed: gate.passed,
          confirmRequired: gate.confirmRequired,
          shotCount: pack.shots.length,
          log: gate.log,
          pressureShots: gate.pressureShots,
          syncResult,
        };
        thinking.appendText(JSON.stringify(out).slice(0, 3000));
        thinking.updateTitle(gate.passed ? "设计拆分完成" : gate.confirmRequired ? "须 Confirm" : "拆镜未闭合");
        thinking.complete();
        return JSON.stringify(out);
      },
    }),
    design_split_forward_reentry: tool({
      description:
        "反推修好后正推再入：默认仅 mirror+stale（禁语义扩镜）；forceExpand:true 才 residual B/lip/VisBeat。",
      inputSchema: jsonSchema<{ forceExpand?: boolean }>(
        z.object({ forceExpand: z.boolean().optional() }).toJSONSchema(),
      ),
      execute: async ({ forceExpand }) => {
        const plan = await loadScriptAgentPlan(resTool.data.projectId);
        const pd = (plan.planData ??= {}) as Record<string, unknown>;
        const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
        const allowSemantic = Boolean(forceExpand);
        const re = runForwardReentryAfterRepair({
          planData: pd,
          shots: pack.shots,
          meta: pd.meta as Record<string, unknown>,
          applyVisBeatExpanders: allowSemantic,
          applySemanticSplit: allowSemantic,
        });
        Object.assign(pd, re.planData);
        pack.shots = re.shots;
        pd.preDesignPack = pack;
        const payload = JSON.stringify(plan);
        const row = await u.db("o_agentWorkData").where({ projectId: resTool.data.projectId, key: "scriptAgent" }).first();
        if (row) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
        return JSON.stringify({ ...re.reentry, log: re.log, semanticExpand: allowSemantic });
      },
    }),
    decide_design_split_line: tool({
      description: "决策树：标点→A clause；无标点→hint±B；VisBeat→C；emotion_hit→须 reactionAction。",
      inputSchema: jsonSchema<{ text: string; functions?: string[]; reactionAction?: string; splitHint?: string }>(
        z
          .object({
            text: z.string(),
            functions: z.array(z.string()).optional(),
            reactionAction: z.string().optional(),
            splitHint: z.string().optional(),
          })
          .toJSONSchema(),
      ),
      execute: async (input) => JSON.stringify(decideSplitForLine(input)),
    }),
    get_novel_text: tool({
      description: "获取小说章节原始文本内容",
      inputSchema: jsonSchema<{ chapterIndex: string }>(
        z
          .object({
            chapterIndex: z.string().describe("章节编号"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ chapterIndex }) => {
        console.log("[tools] get_novel_text", chapterIndex);
        const thinking = msg.thinking(`正在获取小说章节原文...`);
        const data = await u.db("o_novel").where("projectId", resTool.data.projectId).where({ chapterIndex }).select("chapterData").first();
        const text = data && data?.chapterData ? data.chapterData : "";
        thinking.appendText(`获取到原文:\n` + text);
        thinking.updateTitle(`获取小说章节原文完成`);
        thinking.complete();
        return text ?? "无数据";
      },
    }),
    get_script_content: tool({
      description: "获取剧本本内容",
      inputSchema: jsonSchema<{ ids: string[] }>(
        z
          .object({
            ids: z.array(z.string()).describe("脚本id"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ ids }) => {
        console.log("[tools] get_script_content", ids);
        const thinking = msg.thinking(`正在获取脚本内容...`);
        const data = await u.db("o_script").whereIn("id", ids).select("content", "name");
        const text = data && data.length ? data.map((d) => `<scriptItem name="${d.name}">${d.content}</scriptItem>`).join("\n") : "";
        thinking.appendText(`获取到脚本内容:\n` + JSON.stringify(data, null, 2));
        thinking.updateTitle(`获取脚本内容完成`);
        thinking.complete();
        return text ?? "无数据";
      },
    }),
  };
  return toolsNames ? Object.fromEntries(Object.entries(tools).filter(([n]) => toolsNames.includes(n))) : tools;
};
