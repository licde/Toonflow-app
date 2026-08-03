/**
 * Resync o_storyboard panels to match flowData.storyboardTable (SSOT count).
 * Preserves media by index; prunes orphan panels beyond table rows.
 */
import express from "express";
import u from "@/utils";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { parseStoryboardTable } from "@/ruleEngine/parsers/storyboardTableParser";
import { syncStoryboardToDb } from "@/ruleEngine/bundle/storyboardSync";
import type { StoryboardPanelInput } from "@/ruleEngine/bundle/types";
import { detectVisSyncDrift } from "@/ruleEngine/compilers/storyboardDisplaySsot";

const router = express.Router();

function tableShotsToPanels(
  shots: ReturnType<typeof parseStoryboardTable>,
): StoryboardPanelInput[] {
  return shots.map((s, i) => {
    const idx = s.index ?? i;
    const vd =
      String(
        (s as { visualDescription?: string }).visualDescription ??
          (s.narrative as { visualDescription?: string } | undefined)?.visualDescription ??
          s.narrative?.lines ??
          "",
      ).trim() || `镜${idx + 1}`;
    return {
      clientId: `table-resync-${idx + 1}`,
      duration: s.narrative?.duration ?? 3,
      prompt: vd.slice(0, 2000),
      videoDesc: `${s.narrative?.shotSize ?? "medium shot"} static, ${s.narrative?.duration ?? 3}s`,
      shouldGenerateImage: 1,
      associateAssetsIds: [],
      track: String(idx + 1),
      state: "未生成",
      index: idx,
    };
  });
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    /** Optional override; default = agentWorkData.storyboardTable */
    storyboardTable: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId } = req.body as {
        projectId: number;
        scriptId: number;
        storyboardTable?: string;
      };
      let tableMd = String(req.body.storyboardTable ?? "").trim();
      const row = await u
        .db("o_agentWorkData")
        .where({ projectId: String(projectId), episodesId: String(scriptId), key: "productionAgent" })
        .first();
      let flowData: Record<string, unknown> = {};
      if (row?.data) {
        try {
          flowData = JSON.parse(String(row.data)) as Record<string, unknown>;
        } catch {
          flowData = {};
        }
      }
      if (!tableMd) tableMd = String(flowData.storyboardTable ?? "").trim();
      if (!tableMd) return res.status(400).send(error("分镜表为空，无法按表重同步"));

      const { normalizeStoryboardTableMd } = await import("@/ruleEngine/parsers/normalizeStoryboardTableMd");
      tableMd = normalizeStoryboardTableMd(tableMd);
      flowData.storyboardTable = tableMd;

      const shots = parseStoryboardTable(tableMd);
      if (!shots.length) return res.status(400).send(error("分镜表解析为空"));

      const panels = tableShotsToPanels(shots);
      const beforeRows = await u.db("o_storyboard").where({ scriptId, projectId }).select("id");
      const sync = await syncStoryboardToDb(u.db, projectId, scriptId, panels, {
        preserveMedia: true,
        pruneOrphans: true,
      });

      flowData.storyboard = sync.panels;
      flowData.storyboardTable = tableMd;
      const payload = JSON.stringify(flowData);
      if (!row) {
        await u.db("o_agentWorkData").insert({
          projectId,
          episodesId: scriptId,
          key: "productionAgent",
          data: payload,
          createTime: Date.now(),
        });
      } else {
        await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
      }

      const drift = detectVisSyncDrift({
        tableRowCount: shots.length,
        panels: sync.panels,
      });
      return res.status(200).send(
        success({
          ok: true,
          tableRowCount: shots.length,
          panelCount: sync.panels.length,
          mediaPreservedCount: sync.mediaPreservedCount,
          beforeCount: beforeRows.length,
          visSyncDrift: drift,
          message: `已按分镜表重同步：${shots.length} 行 → ${sync.panels.length} 面板（保留图 ${sync.mediaPreservedCount}）`,
        }),
      );
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
