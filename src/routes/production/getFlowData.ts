import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { mergeAssociateAssetIds } from "@/ruleEngine/compilers/referenceListBuilder";
import { stillApiFieldsFromReason } from "@/ruleEngine/compilers/stillQuality";
const router = express.Router();
import { FlowData } from "@/agents/productionAgent/tools";

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    episodesId: z.number(),
  }),
  async (req, res) => {
    const { projectId, episodesId }: { projectId: number; episodesId: number } = req.body;
    const sqlData = await u
      .db("o_agentWorkData")
      .where("projectId", String(projectId))
      .andWhere("episodesId", String(episodesId))
      .select("data")
      .first();

    const scriptData = await u.db("o_script").where({ projectId, id: episodesId }).first();
    const scriptAssets = await u.db("o_scriptAssets").where("scriptId", episodesId);
    let assetIds = scriptAssets.map((i) => i.assetId);
    const storyboardRows = await u.db("o_storyboard").where("scriptId", episodesId).select("id");
    if (storyboardRows.length) {
      const sbIds = storyboardRows.map((r) => r.id!);
      const linked = await u.db("o_assets2Storyboard").whereIn("storyboardId", sbIds).pluck("assetId");
      assetIds = [...new Set([...assetIds, ...(linked as number[])])];
    }
    const assetsData = await u
      .db("o_assets")
      .leftJoin("o_image", "o_assets.imageId", "o_image.id")
      .select("o_assets.*", "o_image.filePath", "o_image.state", "o_image.errorReason")
      // @ts-ignore
      .where("o_assets.id", "in", assetIds)
      .andWhere("o_assets.assetsId", null)
      .where("o_assets.projectId", projectId);

    let childAssetsData = await u
      .db("o_assets")
      .leftJoin("o_image", "o_assets.imageId", "o_image.id")
      .select("o_assets.*", "o_image.filePath", "o_image.state", "o_image.errorReason")
      .where("o_assets.projectId", projectId)
      // @ts-ignore
      .where("o_assets.assetsId", "in", assetIds)
      .whereNotNull("o_assets.assetsId");

    if (!sqlData) {
      const flowData: FlowData = {
        script: scriptData?.content ?? "",
        scriptPlan: "",
        assets: await Promise.all(
          assetsData.map(async (item) => ({
            id: item.id,
            name: item.name ?? "",
            type: item.type ?? "",
            prompt: item.prompt ?? "",
            desc: item.describe ?? "",
            remark: item.remark ?? "",
            src: item.filePath && (await u.oss.getSmallImageUrl(item.filePath!)),
            derive: await Promise.all(
              childAssetsData
                .filter((child) => child.assetsId === item.id)
                .map(async (child) => ({
                  id: child.id,
                  assetsId: item.id,
                  name: child.name ?? "",
                  type: child.type,
                  prompt: child.prompt,
                  desc: child.describe ?? "",
                  src: child.filePath && (await u.oss.getSmallImageUrl(child.filePath!)),
                  state: child.state ?? "未生成", //todo：矫正状态值
                })),
            ),
          })),
        ),
        storyboardTable: "",
        storyboard: [],
        //todo：矫正workbench数据
        //@ts-ignore
        workbench: {
          videoList: [],
        },
        // //todo：矫正封面数据
        // poster: {
        //   items: [],
        // },
      };
      return res.status(200).send(success(flowData));
    } else {
      try {
        const storyboardData = await u.db("o_storyboard").where("scriptId", episodesId);

        await Promise.all(
          storyboardData.map(async (i) => {
            if (i.filePath) {
              try {
                i.filePath = await u.oss.getSmallImageUrl(i.filePath);
              } catch {
                i.filePath = "";
              }
            } else {
              i.filePath = "";
            }
          }),
        );
        const storyboardIds = storyboardData.map((i) => i.id);
        const assetsIds = await u.db("o_assets2Storyboard").whereIn("storyboardId", storyboardIds).orderBy("rowid");

        const assets2StoryboardMap: Record<number, number[]> = {};
        assetsIds.forEach((i) => {
          if (!assets2StoryboardMap[i.storyboardId!]) {
            assets2StoryboardMap[i.storyboardId!] = [];
          }
          assets2StoryboardMap[i.storyboardId!].push(i.assetId!);
        });
        const savedFlow = JSON.parse(sqlData!.data ?? "{}");
        const flowData = savedFlow;
        const panelExtras = new Map<number, { audioPrompt?: string; fxPrompt?: string }>();
        for (const p of (savedFlow.storyboard ?? []) as { id?: number; audioPrompt?: string; fxPrompt?: string }[]) {
          if (p.id) panelExtras.set(p.id, { audioPrompt: p.audioPrompt, fxPrompt: p.fxPrompt });
        }
        flowData.assets = await Promise.all(
          assetsData.map(async (item) => ({
            id: item.id,
            name: item.name ?? "",
            type: item.type ?? "",
            prompt: item.prompt ?? "",
            desc: item.describe ?? "",
            remark: item.remark ?? "",
            src: item.filePath && (await u.oss.getSmallImageUrl(item.filePath!)),
            flowId: item.flowId,
            /** 本集已关联（o_scriptAssets ∪ 镜绑定） */
            inEpisode: true,
            episodeBadge: "本集",
            derive: await Promise.all(
              childAssetsData
                .filter((child) => child.assetsId === item.id)
                .map(async (child) => ({
                  id: child.id,
                  assetsId: item.id,
                  name: child.name ?? "",
                  prompt: child.prompt,
                  type: child.type,
                  desc: child.describe ?? "",
                  src: child.filePath && (await u.oss.getSmallImageUrl(child.filePath!)),
                  state: child.state ?? "未生成",
                  errorReason: child?.errorReason ?? "",
                  flowId: child.flowId,
                  inEpisode: true,
                })),
            ),
          })),
        );
        // Project pool (shared) with episode membership for picker UX
        const episodeIdSet = new Set(assetIds);
        const projectPool = await u
          .db("o_assets")
          .leftJoin("o_image", "o_assets.imageId", "o_image.id")
          .select("o_assets.id", "o_assets.name", "o_assets.type", "o_image.filePath")
          .where("o_assets.projectId", projectId)
          .whereNull("o_assets.assetsId")
          .limit(500);
        flowData.projectAssets = await Promise.all(
          projectPool.map(async (item) => ({
            id: item.id,
            name: item.name ?? "",
            type: item.type ?? "",
            src: item.filePath && (await u.oss.getSmallImageUrl(item.filePath!)),
            inEpisode: episodeIdSet.has(item.id!),
            episodeBadge: episodeIdSet.has(item.id!) ? "本集" : undefined,
          })),
        );
        flowData.storyboard = (
          await Promise.all(
            storyboardData.map(async (i) => {
              const extra = panelExtras.get(i.id!);
              const refMerge = await mergeAssociateAssetIds(
                u.db,
                projectId,
                assets2StoryboardMap[i.id!] ?? [],
                i.prompt ?? "",
                (extra as { charCodes?: string[] } | undefined)?.charCodes ?? [],
                undefined,
                undefined,
                (() => {
                  try {
                    const { resolvePropSoftCodes } =
                      require("@/ruleEngine/compilers/eventPlateReadiness") as typeof import("@/ruleEngine/compilers/eventPlateReadiness");
                    const propSoftCodes = resolvePropSoftCodes({ visualDescription: i.prompt ?? "" });
                    return propSoftCodes.length ? { propSoftCodes, softEnvRef: true } : { softEnvRef: true };
                  } catch {
                    return { softEnvRef: true };
                  }
                })(),
              );
              let displayNo = (i.index != null ? Number(i.index) + 1 : 1);
              let badge = `S${String(displayNo).padStart(2, "0")}`;
              try {
                const { storyboardDisplayNo, formatStoryboardBadge } =
                  require("@/ruleEngine/compilers/storyboardDisplaySsot") as typeof import("@/ruleEngine/compilers/storyboardDisplaySsot");
                displayNo = storyboardDisplayNo({ index: i.index });
                badge = formatStoryboardBadge(displayNo);
              } catch {
                /* keep */
              }
              const associateAssetSrcs: Record<number, string> = {};
              try {
                const needUrls = refMerge.assetIds.filter((id) => id);
                if (needUrls.length) {
                  const rows = await u
                    .db("o_assets")
                    .leftJoin("o_image", "o_assets.imageId", "o_image.id")
                    .whereIn("o_assets.id", needUrls)
                    .select("o_assets.id", "o_image.filePath");
                  for (const r of rows as { id: number; filePath?: string }[]) {
                    if (r.filePath) {
                      try {
                        associateAssetSrcs[r.id] = await u.oss.getSmallImageUrl(r.filePath);
                      } catch {
                        /* skip */
                      }
                    }
                  }
                }
              } catch {
                /* optional */
              }
              return {
                id: i.id,
                index: i.index,
                displayNo,
                badge,
                duration: i.duration ? +i.duration : 0,
                prompt: i.prompt,
                associateAssetsIds: refMerge.assetIds,
                associateAssetSrcs,
                propSoftAssetId: refMerge.propSoftAssetId,
                referenceWarnings: refMerge.warnings,
                src: i.filePath,
                state: i.state,
                videoDesc: i.videoDesc,
                audioPrompt: (i as { audioPrompt?: string }).audioPrompt || extra?.audioPrompt,
                fxPrompt: (i as { fxPrompt?: string }).fxPrompt || extra?.fxPrompt,
                shouldGenerateImage: i.shouldGenerateImage,
                reason: i?.reason ?? "",
                flowId: i.flowId,
                ...stillApiFieldsFromReason(i?.reason),
              };
            }),
          )
        ).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        // VIS-SYNC-DRIFT: table rows vs live panels
        try {
          const { parseStoryboardTable } =
            require("@/ruleEngine/parsers/storyboardTableParser") as typeof import("@/ruleEngine/parsers/storyboardTableParser");
          const { detectVisSyncDrift } =
            require("@/ruleEngine/compilers/storyboardDisplaySsot") as typeof import("@/ruleEngine/compilers/storyboardDisplaySsot");
          const { normalizeStoryboardTableMd } =
            require("@/ruleEngine/parsers/normalizeStoryboardTableMd") as typeof import("@/ruleEngine/parsers/normalizeStoryboardTableMd");
          let tableMd = String(flowData.storyboardTable ?? "");
          if (tableMd.trim()) {
            const healed = normalizeStoryboardTableMd(tableMd);
            if (healed !== tableMd) {
              tableMd = healed;
              flowData.storyboardTable = healed;
            }
          }
          const tableRows = tableMd.trim() ? parseStoryboardTable(tableMd) : [];
          const drift = detectVisSyncDrift({
            tableRowCount: tableRows.length,
            panels: flowData.storyboard ?? [],
          });
          flowData.visSyncDrift = drift;
          if (drift.drifted) {
            flowData.visSyncDebt = {
              code: "VIS-SYNC-DRIFT",
              message: drift.message,
              ctaLabel: drift.ctaLabel,
            };
          }
        } catch {
          /* optional */
        }
        flowData.script = scriptData?.content ?? "";
        res.status(200).send(success(flowData));
      } catch (err) {
        res.status(400).send(error());
      }
    }
  },
);
