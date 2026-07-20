import type { Knex } from "knex";
import type { ScriptBundle } from "../types";
import { parsePromptRefs, touchPromptForVendor } from "../../compilers/vendorPromptAdapter";
import { getCompiledPromptForStoryboard, syncFromFlowData } from "../../facade";
import { loadEpisodePackage } from "../../storage/episodePackageStore";
import { RuntimeGapCollector } from "../runtimeGapRegistry";
import type { MatrixExpect } from "./runSemanticMatrix";

export interface HydrationSnapshot {
  scriptId: number;
  roleCount: number;
  sceneCount: number;
  toolCount: number;
  deriveCount: number;
  storyboardCount: number;
  scriptPlanLen: number;
  storyboardTableLen: number;
}

/** Dimension B + E2 after importScriptBundle. */
export async function runHydrationAndDeriveDbChecks(
  db: Knex,
  projectId: number,
  scriptId: number,
  bundle: ScriptBundle,
  expect: MatrixExpect,
  gaps: RuntimeGapCollector,
): Promise<HydrationSnapshot> {
  const flowRow = await db("o_agentWorkData")
    .where({ projectId: String(projectId), episodesId: String(scriptId), key: "productionAgent" })
    .first();
  let flow: {
    scriptPlan?: string;
    storyboardTable?: string;
    storyboard?: { id?: number; prompt?: string; associateAssetsIds?: number[] }[];
  } = {};
  if (flowRow?.data) {
    try {
      flow = JSON.parse(flowRow.data as string);
    } catch {
      gaps.push("B", "HYD-FLOW", "productionAgent flowData JSON 解析失败");
    }
  } else {
    gaps.push("B", "HYD-FLOW", "缺少 productionAgent flowData");
  }

  const scriptPlanLen = (flow.scriptPlan ?? "").length;
  const storyboardTableLen = (flow.storyboardTable ?? "").length;
  if (!scriptPlanLen) gaps.push("B", "HYD-FLOW", "scriptPlan 空");
  if (!storyboardTableLen) gaps.push("B", "HYD-FLOW", "storyboardTable 空");

  const sbRows = await db("o_storyboard").where({ projectId, scriptId });
  if (sbRows.length < expect.shots) {
    gaps.push("B", "HYD-FLOW", `分镜行 ${sbRows.length} < expect ${expect.shots}`);
  }

  const scriptAssetIds = (await db("o_scriptAssets").where({ scriptId }).pluck("assetId")) as number[];
  const assets = scriptAssetIds.length
    ? await db("o_assets").whereIn("id", scriptAssetIds).select("id", "type", "name", "prompt", "remark", "assetsId")
    : [];

  const roleCount = assets.filter((a) => a.type === "role" && !a.assetsId).length;
  const sceneCount = assets.filter((a) => a.type === "scene").length;
  const toolCount = assets.filter((a) => a.type === "tool").length;
  const deriveCount = assets.filter((a) => a.type === "role" && a.assetsId).length;

  if (roleCount < expect.roles) gaps.push("B", "HYD-ROLE", `角色 ${roleCount} < ${expect.roles}`);
  if (sceneCount < expect.scenes) gaps.push("B", "HYD-SCENE", `场景 ${sceneCount} < ${expect.scenes}`);
  if (toolCount < expect.props) gaps.push("B", "HYD-PROP", `道具 ${toolCount} < ${expect.props}`);
  if (deriveCount < expect.minDerivatives) {
    gaps.push("B", "DRV-UI-LIST", `衍生 ${deriveCount} < ${expect.minDerivatives}`);
  }

  for (const d of assets.filter((a) => a.assetsId)) {
    if (!d.prompt?.trim()) gaps.push("E", "DRV-PROMPT", `衍生 ${d.name} prompt 空`);
    if (!String(d.remark ?? "").includes("deriveOf:")) {
      gaps.push("E", "DRV-CODE", `衍生 ${d.name} 缺 deriveOf remark`);
    }
    const parent = assets.find((p) => p.id === d.assetsId) || (await db("o_assets").where({ id: d.assetsId }).first());
    if (!parent) gaps.push("E", "DRV-ORPHAN", `衍生 ${d.name} 无父资产`);
  }

  const links = await db("o_assets2Storyboard").whereIn(
    "storyboardId",
    sbRows.map((r) => r.id!),
  );
  const shots = bundle.preDesignPack?.shots ?? [];
  for (let i = 0; i < Math.min(sbRows.length, shots.length); i++) {
    const shot = shots[i]!;
    const row = sbRows.find((r) => r.index === i) ?? sbRows[i]!;
    const prompt = row.prompt ?? "";
    const refs = parsePromptRefs(prompt);
    const needCodes = [...new Set([...(shot.charCodes ?? []), ...refs.crefs, ...refs.srefs])];
    if (!needCodes.length) continue;
    const linked = links.filter((l) => l.storyboardId === row.id).map((l) => l.assetId);
    if (!linked.length && needCodes.some((c) => c.startsWith("CHAR-"))) {
      gaps.push("B", "HYD-PANEL-LINK", `镜${shot.shotIndex ?? i + 1} 无资产关联`);
    }
  }

  // Prompt compile path via episode package
  let pkg = await loadEpisodePackage(db, projectId, scriptId);
  if (!pkg) {
    pkg = await syncFromFlowData(db, {
      projectId,
      scriptId,
      script: bundle.script,
      scriptPlan: flow.scriptPlan,
      storyboardTable: flow.storyboardTable,
      storyboard: flow.storyboard ?? sbRows.map((r) => ({
        id: r.id!,
        duration: Number(r.duration) || 3,
        prompt: r.prompt ?? "",
        videoDesc: r.videoDesc ?? "",
      })),
    });
  }

  for (const row of sbRows.slice(0, 5)) {
    const img = getCompiledPromptForStoryboard(pkg, row.id!, "image");
    const vid = getCompiledPromptForStoryboard(pkg, row.id!, "video");
    if (!img?.trim()) gaps.push("E", "PROMPT-COMPILE-NULL", `storyboard ${row.id} image compile null`);
    if (!vid?.trim()) gaps.push("E", "PROMPT-COMPILE-NULL", `storyboard ${row.id} video compile null`);
    if (img) {
      const t = touchPromptForVendor(img, "9:16");
      if (/--cref|--sref|--ar/i.test(t.vendorPrompt)) {
        gaps.push("E", "PROMPT-VENDOR-STRIP", `compiled image 仍含 vendor token id=${row.id}`);
      }
    }
  }

  if (!scriptAssetIds.length) {
    gaps.push("B", "HYD-SCRIPT-LINK", "o_scriptAssets 空");
  }

  return {
    scriptId,
    roleCount,
    sceneCount,
    toolCount,
    deriveCount,
    storyboardCount: sbRows.length,
    scriptPlanLen,
    storyboardTableLen,
  };
}
