/**
 * HQ generate: face-CU dual-contact → smart expand + storyboard writeback (split > XOR soft).
 * Cheek keeps parent clientId (same storyboard row); oral inserted as sibling — no lost description.
 */
import type { Knex } from "knex";
import type { ComposeStillContext } from "../compilers/composeStillPrompt";
import type { PreDesignShot } from "../bundle/types";
import { preDesignShotsToPanels } from "../bundle/preDesignPackAdapter";
import { syncStoryboardToDb } from "../bundle/storyboardSync";
import { hydratePackageFromPreDesign } from "../bundle/hydratePackageFromPreDesign";
import { loadEpisodePackage, saveEpisodePackage } from "../storage/episodePackageStore";

export type SmartLitXorExpandResult = {
  expanded: boolean;
  visualDescription?: string;
  oralVisualDescription?: string;
  shotCount?: number;
  warning?: string;
  sources: string[];
};

export async function trySmartExpandLitXorForGenerate(
  db: Knex,
  input: {
    projectId: number;
    storyboardId: number;
    composeCtx: ComposeStillContext;
  },
): Promise<SmartLitXorExpandResult> {
  const sources: string[] = [];
  const vd = String(input.composeCtx.visualDescription ?? "").trim();
  if (vd.length < 8) return { expanded: false, sources };

  const { needsLitContactXorSplit, expandLitContactXor } =
    require("./expandLitContactXor") as typeof import("./expandLitContactXor");
  const { sliceFieldsAfterIrdSplit } =
    require("./sliceFieldsAfterIrdSplit") as typeof import("./sliceFieldsAfterIrdSplit");

  const sb = await db("o_storyboard").where({ id: input.storyboardId }).first();
  if (!sb?.scriptId) return { expanded: false, sources };

  const scriptId = Number(sb.scriptId);
  const pkg = await loadEpisodePackage(db, input.projectId, scriptId);

  let shots: Record<string, unknown>[] = [];
  let idx = -1;

  if (pkg?.shots?.length) {
    shots = (pkg.shots as unknown as Record<string, unknown>[]).map((s) => ({ ...s }));
    idx = shots.findIndex((s) => Number((s as { storyboardId?: number }).storyboardId) === input.storyboardId);
    if (idx < 0) {
      const rows = await db("o_storyboard")
        .where({ projectId: input.projectId, scriptId })
        .orderBy("index", "asc")
        .select("id");
      const rowIdx = rows.findIndex((r: { id: number }) => Number(r.id) === input.storyboardId);
      if (rowIdx >= 0 && rowIdx < shots.length) idx = rowIdx;
    }
  }

  if (idx < 0 || !shots.length) {
    // Fallback: single-shot expand from compose VD only (still write storyboard sibling)
    const probe: Record<string, unknown> = {
      visualDescription: vd,
      shotSize: input.composeCtx.shotSize,
      clientId: String(sb.flowId ? `flow-${sb.flowId}` : `sb-${input.storyboardId}`),
      shotIndex: Number(sb.index ?? 0) + 1,
      storyboardId: input.storyboardId,
    };
    if (!needsLitContactXorSplit(probe)) return { expanded: false, sources };
    shots = [probe];
    idx = 0;
  } else {
    const cur = { ...shots[idx]! };
    cur.visualDescription = vd || String(cur.visualDescription ?? "");
    if (input.composeCtx.shotSize) cur.shotSize = input.composeCtx.shotSize;
    if (!cur.clientId) cur.clientId = String(sb.flowId ? `flow-${sb.flowId}` : `sb-${input.storyboardId}`);
    cur.storyboardId = input.storyboardId;
    shots[idx] = cur;
    if (!needsLitContactXorSplit(cur)) return { expanded: false, sources };
  }

  const lx = expandLitContactXor(shots, { forceExpand: true, chatStrict: false });
  if (lx.expandedCount < 1) {
    sources.push("lit.gen.splitRefuse");
    return { expanded: false, sources, warning: "文学双接触须拆镜，自动拆未生效" };
  }

  let next = sliceFieldsAfterIrdSplit(lx.shots).shots;
  // Bind cheek (same index) to current storyboardId for hydrate rematch
  const cheek = next[idx];
  const oral = next[idx + 1];
  if (cheek) {
    cheek.storyboardId = input.storyboardId;
    cheek.promptState = "stale";
  }
  if (oral) {
    delete oral.storyboardId;
    oral.promptState = "stale";
  }

  const panels = preDesignShotsToPanels(next as PreDesignShot[], { enrichFromDesign: true });
  // Preserve flowId/id on cheek panel so sync updates this storyboard row (not orphan dual-VD)
  if (panels[idx]) {
    panels[idx] = {
      ...panels[idx]!,
      id: input.storyboardId,
      ...(sb.flowId ? { flowId: Number(sb.flowId) } : {}),
      // Cheek keeps parent clientId — do not ban index rematch when flowId absent
      burnParentForbidden: false,
    };
  }

  try {
    await syncStoryboardToDb(db, input.projectId, scriptId, panels, { preserveMedia: true });
  } catch (e) {
    sources.push("lit.gen.splitSyncFail");
    return {
      expanded: false,
      sources,
      warning: `智拆写库失败: ${e instanceof Error ? e.message : e}`,
    };
  }

  // Update current row prompt/videoDesc for FE/canvas (cheek VD)
  const cheekVd = String(cheek?.visualDescription ?? "");
  const oralVd = String(oral?.visualDescription ?? "");
  if (cheekVd) {
    await db("o_storyboard")
      .where({ id: input.storyboardId })
      .update({
        prompt: cheekVd.slice(0, 2000),
        videoDesc: cheekVd.slice(0, 2000),
        state: "未生成",
        updateTime: Date.now(),
      });
  }

  if (pkg) {
    try {
      const hydrated = hydratePackageFromPreDesign(pkg, next as PreDesignShot[]);
      hydrated.version = Number(hydrated.version ?? 0) + 1;
      (hydrated as { meta?: Record<string, unknown> }).meta = {
        ...(((hydrated as { meta?: Record<string, unknown> }).meta as object) ?? {}),
        litGenSmartSplit: lx.expandedCount,
        importOkNotExitPass: true,
      };
      await saveEpisodePackage(db, hydrated);
    } catch {
      /* optional */
    }
  }

  // Best-effort scriptAgent plan shots
  try {
    const row = await db("o_agentWorkData").where({ projectId: input.projectId, key: "scriptAgent" }).first();
    if (row?.data) {
      const plan = JSON.parse(row.data as string) as Record<string, unknown>;
      const pd = ((plan.planData as Record<string, unknown>) ??= {});
      const pack = ((pd.preDesignPack as Record<string, unknown>) ??= {});
      pack.shots = next;
      pd.preDesignPack = pack;
      const meta = ((pd.meta as Record<string, unknown>) ??= {});
      meta.litGenSmartSplit = lx.expandedCount;
      meta.importOkNotExitPass = true;
      await db("o_agentWorkData")
        .where({ id: row.id })
        .update({ data: JSON.stringify(plan), updateTime: Date.now() });
    }
  } catch {
    /* optional */
  }

  input.composeCtx.visualDescription = cheekVd;
  input.composeCtx.previousVisualBody = undefined;
  sources.push("lit.gen.smartSplit");

  return {
    expanded: true,
    visualDescription: cheekVd,
    oralVisualDescription: oralVd,
    shotCount: next.length,
    warning: `已智能拆文学双接触：本镜颊触；口创已另镜保留（${oralVd.slice(0, 36)}…）`,
    sources,
  };
}
