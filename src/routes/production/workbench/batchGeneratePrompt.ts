import express from "express";
import u from "@/utils";
import pLimit from "p-limit";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { isRuleEngineEnabled } from "@/ruleEngine/featureFlag";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { syncFromFlowData } from "@/ruleEngine/facade";
import { compileOrGenerateVideoPrompt } from "@/ruleEngine/compilers/compileOrGenerateVideoPrompt";
import { resolveGenerationModeRules } from "@/ruleEngine/compilers/resolveGenerationModeRules";
import { generationJobQueue } from "@/ruleEngine/ports/jobQueue";
import { patchVideoTrackReason } from "@/ruleEngine/qc/persistVideoTrackPromptHash";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number().optional(),
    trackData: z.array(
      z.object({
        trackId: z.number(),
        info: z.array(
          z.object({
            id: z.number(),
            sources: z.string(),
            role: z.enum(["start", "end", "ref", "asset", "storyboard"]).optional(),
          }),
        ),
      }),
    ),
    mode: z.string(),
    model: z.string(),
    concurrentCount: z.number().optional(),
  }),
  async (req, res) => {
    const { trackData, projectId, scriptId: bodyScriptId, mode, model, concurrentCount = 5 } = req.body;
    try {
      // Once hydrate (batch outer) — no per-worker project/template reload
      const [vendorId, modelData] = model.split(/:(.+)/);
      const projectData = await u.db("o_project").select("*").where({ id: projectId }).first();
      const modelPromptData = await u.db("o_modelPrompt").where("vendorId", vendorId).where("model", modelData).first();
      const modelPromptRoot = u.getPath(["modelPrompt"]);
      const artStyle = projectData?.artStyle || "无";
      const visualManual = u.getArtPrompt(artStyle, "art_skills", "art_storyboard_video");
      const modeRules = resolveGenerationModeRules({ modality: "video", mode, modelName: modelData });

      let pkg = null as Awaited<ReturnType<typeof loadEpisodePackage>> | null;
      let scriptId = bodyScriptId as number | undefined;
      const ruleEngineOn = await isRuleEngineEnabled(u.db, projectId);
      if (ruleEngineOn) {
        const firstTrack = await u.db("o_videoTrack").where("id", trackData[0]?.trackId).select("scriptId").first();
        scriptId = scriptId ?? (firstTrack as { scriptId?: number })?.scriptId;
        if (scriptId) {
          pkg = await loadEpisodePackage(u.db, projectId, scriptId);
          if (!pkg) {
            const flowRow = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "productionAgent" }).first();
            if (flowRow?.data) {
              const flow = JSON.parse(flowRow.data as string);
              pkg = await syncFromFlowData(u.db, {
                projectId,
                scriptId,
                script: flow.script,
                scriptPlan: flow.scriptPlan,
                storyboardTable: flow.storyboardTable,
                storyboard: flow.storyboard,
              });
            }
          }
        }
      }

      // heal_then_burn：仓债不硬拒批量提示词
      {
        const { readWarehouseDebtFromPackage, warehouseDebtBlocksVideo } =
          require("@/ruleEngine/bundle/warehouseDebtMeta") as typeof import("@/ruleEngine/bundle/warehouseDebtMeta");
        const debt = readWarehouseDebtFromPackage(pkg);
        if (warehouseDebtBlocksVideo(debt) && pkg) {
          const meta = ((pkg as { meta?: Record<string, unknown> }).meta ??= {});
          meta.lipConfirmRequired = false;
          meta.importOkNotExitPass = false;
          meta.irdConfirmRequired = false;
          meta.implementationDegraded = true;
          try {
            const { saveEpisodePackage } = await import("@/ruleEngine/storage/episodePackageStore");
            await saveEpisodePackage(u.db, pkg);
          } catch {
            /* best-effort */
          }
        }
      }

      await u
        .db("o_videoTrack")
        .whereIn(
          "id",
          trackData.map((t: { trackId: number }) => t.trackId),
        )
        .update({ state: "生成中" });

      const batchJobId = uuidv4();
      await generationJobQueue.enqueue({
        id: batchJobId,
        shotId: `batch-prompt-${projectId}`,
        modality: "video_prompt",
        priority: 1,
      });

      const limit = pLimit(concurrentCount ?? 5);

      const tasks = trackData.map((track: { trackId: number; info: { id: number; sources: string; role?: string }[] }) =>
        limit(async () => {
          if (modeRules.mediaContract.minRefs > 0 && track.info.length < modeRules.mediaContract.minRefs) {
            // M7: never wipe designContentHash with a plain-string reason
            await patchVideoTrackReason(u.db, track.trackId, {
              state: "生成失败",
              message: `模式 ${modeRules.modeId} 缺少参考媒体`,
            });
            return;
          }

          const sbItem = track.info.find((i) => i.sources === "storyboard");
          const assetItems = track.info.filter((i) => i.sources === "assets");
          const assets: { id?: number; type?: string; name?: string; filePath?: string | null }[] = [];
          for (const a of assetItems) {
            const row = await u
              .db("o_assets")
              .leftJoin("o_image", "o_image.id", "o_assets.imageId")
              .where("o_assets.id", a.id)
              .select("o_assets.id", "o_assets.type", "o_assets.name", "o_image.filePath")
              .first();
            if (row) assets.push(row);
          }

          let storyboard: {
            id?: number;
            videoDesc?: string | null;
            prompt?: string | null;
            track?: string | number | null;
            duration?: string | number | null;
            associateAssetsIds?: unknown;
          }[] = [];
          if (sbItem) {
            const row = await u.db("o_storyboard").where("id", sbItem.id).first();
            if (row) {
              const assetRows = await u.db("o_assets2Storyboard").where("storyboardId", sbItem.id).orderBy("rowid").select("assetId");
              storyboard = [
                {
                  id: sbItem.id,
                  videoDesc: row.videoDesc,
                  prompt: row.prompt,
                  track: row.track,
                  duration: row.duration,
                  associateAssetsIds: assetRows.map((r) => r.assetId!).filter((id): id is number => id != null),
                },
              ];
            }
          }

          const result = await compileOrGenerateVideoPrompt({
            modality: "video",
            mode,
            modelName: modelData,
            projectVideoRatio: projectData?.videoRatio,
            storyboard,
            assets,
            pkg,
            storyboardId: sbItem?.id,
            modelPromptRoot,
            boundModelPromptPath: modelPromptData?.path ?? null,
            artStyleManual: visualManual,
            preferCompile: Boolean(ruleEngineOn && pkg && sbItem),
            slots: track.info.map((i) => ({
              role: (i.role as "start" | "end" | "ref" | "asset" | "storyboard") || (i.sources === "storyboard" ? "storyboard" : "asset"),
              id: i.id,
              sources: i.sources as "storyboard" | "assets",
            })),
            invokeLlm: ruleEngineOn
              ? undefined
              : async ({ system, user, assistant }) => {
                  const { text } = await u.Ai.Text("universalAi").invoke({
                    system,
                    messages: [
                      ...(assistant ? [{ role: "assistant" as const, content: assistant }] : []),
                      { role: "user" as const, content: user },
                    ],
                  });
                  return text;
                },
          });

          if (result.prompt) {
            const pkgShot =
              (sbItem?.id != null
                ? (pkg?.shots?.find((s) => s.storyboardId === sbItem.id) as Record<string, unknown> | undefined)
                : undefined) ?? undefined;
            // Homology with generateVideoPrompt: nonempty prompt ≠ burn-ready
            let burnAllowed = true;
            let qdExtra: Record<string, unknown> = {};
            try {
              const { decideVideoQuality } = await import("@/ruleEngine/compilers/qualityDecision");
              const fxGradeStr = String(
                (pkgShot as { fxFeasibility?: string } | undefined)?.fxFeasibility ??
                  (pkgShot as { generation?: { fxFeasibility?: string } } | undefined)?.generation?.fxFeasibility ??
                  "",
              );
              const qd = decideVideoQuality({
                videoPrompt: result.prompt,
                shot: pkgShot as never,
                vendorId: "agnesai",
                fxGrade: fxGradeStr,
              });
              burnAllowed = Boolean(qd.burnAllowed);
              qdExtra = {
                burnAllowed,
                decision: qd.decision,
                nextStep: qd.nextStep,
                reasons: qd.reasons,
                ctaLabel: qd.envelope?.ctaLabel ?? (burnAllowed ? undefined : "智能修复"),
                userMessage: qd.envelope?.userMessage ?? (burnAllowed ? undefined : "提示词已落库但不可烧片"),
              };
            } catch {
              /* decide best-effort — default allow persist as 已完成 */
            }
            const persistState = burnAllowed ? "已完成" : "需完善";
            try {
              const { persistVideoTrackPromptWithDesignHash } = await import(
                "@/ruleEngine/qc/persistVideoTrackPromptHash"
              );
              await persistVideoTrackPromptWithDesignHash(u.db, {
                trackId: track.trackId,
                prompt: result.prompt,
                state: persistState,
                shot: pkgShot,
                extraReason: burnAllowed ? undefined : qdExtra,
              });
            } catch {
              // Prompt ok but hash stamp failed — keep prior designContentHash
              await patchVideoTrackReason(u.db, track.trackId, {
                prompt: result.prompt,
                state: persistState,
                message: "prompt_ok_hash_stamp_failed",
                ...(burnAllowed ? {} : qdExtra),
              });
            }
          } else {
            await patchVideoTrackReason(u.db, track.trackId, {
              state: "生成失败",
              message: result.warnings.join(",") || "提示词为空",
            });
          }
        }),
      );

      Promise.all(tasks).then(async () => {
        await generationJobQueue.complete(batchJobId);
      });
      return res.status(200).send(success({ message: "开始生成提示词", batchJobId, modeId: modeRules.modeId }));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);
