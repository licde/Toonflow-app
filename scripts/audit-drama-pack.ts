#!/usr/bin/env tsx
/**
 * pack compose 预期 vs DB 实际 — 自测审计报告
 */
import fs from "fs";
import path from "path";
import u from "../src/utils";
import { validateDramaPack } from "../src/lib/dramaPack/validate";
import { composePackAssets, buildCodeIndexFromPack, parsePackExtensions } from "../src/lib/dramaPack/promptComposer";
import { parseLockCode } from "../src/lib/dramaPack/schema";
import { shouldSkipT1ForChar } from "../src/lib/dramaPack/personaPolicy";
import { isT1WardrobeAsset } from "../src/lib/dramaPack/assetTierUtils";
import { getImagePromptRuleForType } from "../src/lib/dramaPack/imagePromptRuleParser";
import { resolveProjectId } from "../src/lib/dramaPack/resolveProjectId";
import { buildFinalAssetImagePrompt } from "../src/lib/dramaPack/assetImagePromptBuilder";
import { detectAssetTier } from "../src/lib/dramaPack/assetTierUtils";
import { lookupGender } from "../src/lib/dramaPack/characterAssetUtils";
import { detectVideoPromptReasoningLeak, detectChineseDialogueInEnglishPrompt, resolveVideoPromptRoute } from "../src/lib/dramaPack/videoPromptUtils";
import { collectUsedT1LockCodesFromPack, lockCodeBase } from "../src/lib/dramaPack/assetLockCodeUtils";
import { buildRefSlots, enrichMediasWithResolved, findOrphanRefIndices } from "../src/lib/dramaPack/refSlotBuilder";

type AuditIssue = { level: "error" | "warning" | "info"; code: string; message: string };

function promptContains(text: string, fragment: string): boolean {
  return text.toLowerCase().includes(fragment.toLowerCase());
}

async function main() {
  const rawId = Number(process.argv[2]);
  const packFile = process.argv[3];
  if (!rawId || !packFile) {
    console.error("用法: yarn drama-pack audit <projectId|scriptId> <pack.json>");
    process.exit(1);
  }

  const resolved = await resolveProjectId(rawId);
  const projectId = resolved?.projectId ?? rawId;
  const packRaw = JSON.parse(fs.readFileSync(path.resolve(packFile), "utf8"));
  const validation = validateDramaPack(packRaw, { includePack: true });
  if (!validation.pack) {
    console.error(JSON.stringify({ valid: false, issues: validation.issues }, null, 2));
    process.exit(1);
  }
  const pack = validation.pack;
  const extensions = parsePackExtensions(packRaw);
  const project = await u.db("o_project").where("id", projectId).select("artStyle", "videoModel", "mode").first();
  const artStyle = project?.artStyle || pack.meta.artStyleHint || "";
  const composedAssets = await composePackAssets(pack, artStyle, extensions);
  const codeIndex = buildCodeIndexFromPack(pack);

  const issues: AuditIssue[] = [];
  const stats = {
    sceneAssets: 0,
    propAssets: 0,
    t1Wardrobe: 0,
    staleT1: 0,
    videoTracks: 0,
    videoExpanded: 0,
    promptSource: {} as Record<string, number>,
  };

  const dbAssets = await u
    .db("o_assets")
    .leftJoin("o_image", "o_assets.imageId", "o_image.id")
    .where({ projectId })
    .select(
      "o_assets.id",
      "o_assets.name",
      "o_assets.type",
      "o_assets.remark",
      "o_assets.prompt",
      "o_assets.promptSource",
      "o_assets.describe",
      "o_image.filePath",
    );
  const composedByCode = new Map(composedAssets.map((a) => [a.code, a]));
  const usedT1 = collectUsedT1LockCodesFromPack(pack);
  const assetGraph: Array<{
    lockCode: string;
    tier: string;
    dbId?: number;
    hasImage: boolean;
    usedInStoryboard: boolean;
    children?: string[];
  }> = [];
  const t0ByBase = new Map<string, { id: number; hasImage: boolean; name: string }>();
  for (const row of dbAssets) {
    const code = parseLockCode(row.remark);
    if (!code || code.includes(":") || row.type !== "role") continue;
    t0ByBase.set(code, { id: row.id, hasImage: !!row.filePath, name: row.name });
  }

  for (const row of dbAssets) {
    const code = parseLockCode(row.remark);
    if (!code) continue;
    const composed = composedByCode.get(code);

    if (!composed) {
      if (code.includes(":")) {
        const base = code.split(":")[0];
        const entry = extensions.characterAssets?.[base] as Record<string, unknown> | undefined;
        if (shouldSkipT1ForChar(base, entry)) {
          issues.push({ level: "error", code: "STALE_T1_ASSET", message: `应删除的 T1 资产仍存在: ${code}` });
          stats.staleT1++;
        } else {
          issues.push({ level: "warning", code: "ORPHAN_ASSET", message: `DB 资产不在 pack compose 中: ${code}` });
        }
      } else {
        issues.push({ level: "warning", code: "ORPHAN_ASSET", message: `DB 资产不在 pack compose 中: ${code}` });
      }
      continue;
    }

    if (isT1WardrobeAsset(row.remark, null)) stats.t1Wardrobe++;

    if (row.type === "scene") {
      stats.sceneAssets++;
      const p = row.prompt || "";
      if (!promptContains(p, "no people") && !promptContains(p, "no characters")) {
        issues.push({ level: "error", code: "SCENE_NO_PEOPLE", message: `场景资产 ${code} prompt 缺少 no people: ${p.slice(0, 80)}` });
      }
    }
    if (row.type === "tool") {
      stats.propAssets++;
      const p = row.prompt || "";
      if (!promptContains(p, "isolated")) {
        issues.push({ level: "error", code: "PROP_ISOLATED", message: `道具资产 ${code} prompt 缺少 isolated` });
      }
      if (!promptContains(p, "1:1")) {
        issues.push({ level: "warning", code: "PROP_ASPECT", message: `道具资产 ${code} prompt 未标注 1:1` });
      }
    }

    if (composed && row.type === "role") {
      const tier = detectAssetTier(row.remark, null);
      const simulated = buildFinalAssetImagePrompt({
        type: "role",
        dbPrompt: row.prompt || composed.prompt,
        remark: row.remark,
        productionSpec: pack.productionSpec,
        tier,
        extensions,
      });
      if (tier === "t0_base" && !promptContains(simulated, "back view") && !promptContains(simulated, "rear view")) {
        issues.push({ level: "warning", code: "IMAGE_PROMPT_SIMULATION", message: `T0 角色 ${code} 模拟 prompt 缺 back view` });
      }
      if (tier === "t1_wardrobe") {
        if (!promptContains(simulated, "single wardrobe") && !promptContains(simulated, "服化")) {
          issues.push({ level: "warning", code: "T1_ASPECT_MISMATCH", message: `T1 角色 ${code} 模拟 prompt 非单图服化规格` });
        }
        const base = lockCodeBase(code);
        const t0 = t0ByBase.get(base);
        if (!t0?.hasImage) {
          issues.push({ level: "warning", code: "T1_MISSING_T0_REF", message: `T1 ${code} 缺少 T0 ${base} 参考图` });
        }
        if (!usedT1.has(code)) {
          issues.push({ level: "info", code: "UNUSED_T1_STAGE", message: `T1 ${code} 未在本 pack 分镜中出镜` });
        }
        const p = row.prompt || composed.prompt || "";
        if (!promptContains(simulated, "lock face")) {
          issues.push({ level: "warning", code: "T1_LOCK_FACE_MISSING", message: `T1 ${code} prompt 缺少 lock face` });
        }
        if (
          /\bjawline\b|\btear mole\b|\bface shape\b|\basymmetr/i.test(p) &&
          !promptContains(p, "服化")
        ) {
          issues.push({ level: "warning", code: "T1_STAGE_FACE_LEAK", message: `T1 ${code} stage prompt 仍含脸描述词` });
        }
        if (
          promptContains(p, "four-view") ||
          promptContains(p, "四视图") ||
          promptContains(p, "back view") ||
          promptContains(p, "rear view")
        ) {
          issues.push({ level: "warning", code: "T1_PROMPT_HAS_FOUR_VIEW", message: `T1 ${code} prompt 仍含四视图词` });
        }
      }
    }

    if (composed && row.type === "role" && composed.name && row.name && composed.name !== row.name) {
      issues.push({
        level: "warning",
        code: "NAME_LOCKCODE_DRIFT",
        message: `资产 ${code} 名称漂移: DB「${row.name}」vs pack「${composed.name}」`,
      });
    }

    if (composed && row.type === "role" && code.startsWith("CHAR-WRJ")) {
      const entry = extensions.characterAssets?.[code.split(":")[0]] as Record<string, unknown> | undefined;
      const gender = lookupGender(entry);
      if (
        gender === "male" &&
        !row.describe?.includes("男") &&
        !row.describe?.toLowerCase().includes("male")
      ) {
        issues.push({ level: "warning", code: "GENDER_DESCRIBE_MISMATCH", message: `CHAR-WRJ describe 缺 male/男` });
      }
    }
  }

  const pureSceneRule = getImagePromptRuleForType(pack.productionSpec as Record<string, unknown>, "PURE-SCENE");
  const boards = await u
    .db("o_storyboard")
    .where({ projectId })
    .orderBy("index", "asc")
    .select("id", "index", "prompt", "videoDesc", "videoPrompt", "promptSource", "shotMeta", "imageId", "filePath");

  for (const row of boards) {
    if (row.imageId && !row.filePath) {
      issues.push({ level: "warning", code: "BROKEN_STORYBOARD_IMAGE", message: `镜 ${row.index} 有 imageId 但无 filePath` });
    }
  }

  for (const row of boards) {
    const p = row.prompt || "";
    let shotType = "";
    try {
      const meta = row.shotMeta ? JSON.parse(row.shotMeta) : {};
      shotType = meta.type || meta.shotType || "";
    } catch {
      /* ignore */
    }
    if (shotType === "PURE-SCENE" && pureSceneRule) {
      for (const frag of pureSceneRule.mustInclude) {
        if (!promptContains(p, frag)) {
          issues.push({ level: "warning", code: "SB_PURE_SCENE", message: `镜 ${row.index} PURE-SCENE 缺少 ${frag}` });
        }
      }
    }
  }

  for (const composed of composedAssets) {
    if (!composed.code.startsWith("CHAR-")) continue;
    const base = lockCodeBase(composed.code);
    if (!composed.code.includes(":")) {
      const dbRow = dbAssets.find((r) => parseLockCode(r.remark) === composed.code);
      assetGraph.push({
        lockCode: composed.code,
        tier: "t0_base",
        dbId: dbRow?.id,
        hasImage: !!dbRow?.filePath,
        usedInStoryboard: true,
        children: composedAssets.filter((a) => lockCodeBase(a.code) === base && a.code.includes(":")).map((a) => a.code),
      });
    }
  }

  const [vendorId, modelData] = (project?.videoModel || "").split(/:(.+)/);
  const videoRoute = resolveVideoPromptRoute(modelData || "", project?.mode ?? "");
  const isEnglishMode = !/seedance.*2[.\-]0/i.test((modelData || "").toLowerCase());

  const tracks = await u.db("o_videoTrack").where({ projectId }).select("id", "prompt", "promptSource", "medias");
  stats.videoTracks = tracks.length;
  for (const t of tracks) {
    stats.promptSource[t.promptSource || "unknown"] = (stats.promptSource[t.promptSource || "unknown"] || 0) + 1;

    if (t.medias) {
      try {
        const medias = enrichMediasWithResolved(JSON.parse(t.medias as string));
        const slots = buildRefSlots(medias);
        for (const m of medias) {
          if (m.fileType === "image" && !m.resolvedSrc) {
            issues.push({
              level: "warning",
              code: "REF_SLOT_EMPTY",
              message: `track ${t.id} 参考条带项 ${m.label ?? m.id} 无 resolvedSrc`,
            });
          }
        }
        if (t.prompt) {
          const orphans = findOrphanRefIndices(t.prompt, slots.length);
          for (const n of orphans) {
            issues.push({
              level: "warning",
              code: "PROMPT_REF_ORPHAN",
              message: `track ${t.id} prompt 含 @图${n} 但 refSlots 仅 ${slots.length} 槽`,
            });
          }
        }
      } catch {
        /* ignore invalid medias json */
      }
    }

    const boardsOnTrack = await u.db("o_storyboard").where("trackId", t.id).select("videoDesc", "videoPrompt");
    const maxDescLen = Math.max(0, ...boardsOnTrack.map((b) => (b.videoDesc || "").length));
    const trackLen = (t.prompt || "").length;
    if (maxDescLen > 80 && trackLen < 60 && t.promptSource !== "ai") {
      issues.push({
        level: "warning",
        code: "VIDEO_NOT_EXPANDED",
        message: `track ${t.id} prompt 过短 (${trackLen}) vs videoDesc max (${maxDescLen})`,
      });
    } else if (trackLen > 120) {
      stats.videoExpanded++;
    }
    if (t.promptSource === "ai" && t.prompt && detectVideoPromptReasoningLeak(t.prompt)) {
      issues.push({
        level: "warning",
        code: "VIDEO_PROMPT_REASONING_LEAK",
        message: `track ${t.id} 视频提示词含模型路由推理文本，应重新生成`,
      });
    }
    if (t.prompt && detectChineseDialogueInEnglishPrompt(t.prompt, isEnglishMode)) {
      issues.push({
        level: "warning",
        code: "DIALOGUE_IN_VIDEO_PROMPT",
        message: `track ${t.id} 英文模式视频提示词仍含中文台词（mode=${videoRoute.modeLabel}）`,
      });
    }
  }

  const assetRows = await u.db("o_assets").where({ projectId }).select("promptSource");
  for (const a of assetRows) {
    const k = a.promptSource || "unknown";
    stats.promptSource[`asset:${k}`] = (stats.promptSource[`asset:${k}`] || 0) + 1;
  }

  const errorCount = issues.filter((i) => i.level === "error").length;
  const report = {
    projectId,
    packFile: path.resolve(packFile),
    valid: errorCount === 0,
    errorCount,
    warningCount: issues.filter((i) => i.level === "warning").length,
    stats,
    assetGraph,
    issues,
    composedAssetCount: composedAssets.length,
    dbAssetCount: dbAssets.length,
    storyboardCount: boards.length,
    codeIndexSize: Object.keys(codeIndex).length,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(errorCount === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
