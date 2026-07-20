import type { PreDesignPack, PreDesignShot, StoryboardPanelInput } from "./types";
import { enrichShotGenerationFromDesign } from "./modalityChainAudit";
import { parsePromptRefs } from "../compilers/vendorPromptAdapter";

function linesToText(shot: PreDesignShot): string {
  const lines = shot.narrative?.dialogue?.lines ?? [];
  return lines.map((l) => `${l.speaker ?? ""}：${l.text ?? ""}`).join(" ");
}

export function preDesignShotsToStoryboardTable(shots: PreDesignShot[]): string {
  const rows = ["| 镜 | 类型 | 场景 | 台词 | 时长 |", "| --- | --- | --- | --- | --- |"];
  shots.forEach((s, i) => {
    const idx = s.shotIndex ?? i + 1;
    const line = linesToText(s).replace(/\|/g, "\\|");
    rows.push(`| ${idx} | ${s.type ?? "CHAR-SCENE"} | ${s.sceneName ?? ""} | ${line} | ${s.duration ?? 3}s |`);
  });
  return rows.join("\n");
}

export function preDesignShotsToPanels(
  shots: PreDesignShot[],
  opts?: {
    enrichFromDesign?: boolean;
    visualLockTable?: Record<string, unknown>;
    codeToAssetId?: Record<string, number>;
  },
): StoryboardPanelInput[] {
  return shots.map((s, i) => {
    const shot = opts?.enrichFromDesign ? enrichShotGenerationFromDesign(s, { visualLockTable: opts.visualLockTable }) : s;
    const idx = shot.shotIndex ?? i + 1;
    const gen = shot.generation;
    const desc = shot.visualDescription ?? linesToText(shot);
    const chars = shot.charCodes?.join(", ") ?? "";
    let imagePrompt = gen?.imagePrompt?.trim() || "";
    const videoPrompt = gen?.videoPrompt?.trim();
    const sceneCode = (shot as { sceneCode?: string }).sceneCode;
    const crefCodes = parsePromptRefs(imagePrompt || "").crefs;
    const srefCodes = parsePromptRefs(imagePrompt || "").srefs;
    if (sceneCode && !srefCodes.length && imagePrompt && !/--sref\s+/i.test(imagePrompt)) {
      imagePrompt = `${imagePrompt} --sref ${sceneCode}`;
    }
    const allCharCodes = [...new Set([...(shot.charCodes ?? []), ...crefCodes])];
    const associateAssetsIds: number[] = [];
    for (const code of allCharCodes) {
      const id = opts?.codeToAssetId?.[code] ?? opts?.codeToAssetId?.[code.toUpperCase()];
      if (id) associateAssetsIds.push(id);
    }
    if (sceneCode) {
      const sid = opts?.codeToAssetId?.[sceneCode];
      if (sid) associateAssetsIds.push(sid);
    }
    const rawFx = gen?.fxPrompt?.trim();
    const fxPrompt = rawFx && !/^F[0-5]$/i.test(rawFx) ? rawFx : undefined;
    return {
      clientId: `sb-${idx}`,
      duration: shot.duration ?? 3,
      prompt: imagePrompt || [chars, shot.sceneName, sceneCode, desc].filter(Boolean).join("，").slice(0, 2000),
      videoDesc:
        videoPrompt ||
        `${shot.shotSize ?? "medium shot"} ${(shot as { camera?: string }).camera ?? "static"}, ${shot.duration ?? 3}s`,
      audioPrompt: gen?.audioPrompt?.trim(),
      fxPrompt,
      shouldGenerateImage: 1,
      associateAssetsIds: [...new Set(associateAssetsIds)],
      track: String(idx),
      state: "未生成",
      index: idx - 1,
    };
  });
}

export function applyPreDesignPack(
  pack: PreDesignPack,
  opts?: {
    enrichFromDesign?: boolean;
    visualLockTable?: Record<string, unknown>;
    codeToAssetId?: Record<string, number>;
  },
): {
  scriptPlan: string;
  storyboardTable: string;
  storyboard: StoryboardPanelInput[];
} {
  return {
    scriptPlan: pack.scriptPlan,
    storyboardTable: preDesignShotsToStoryboardTable(pack.shots),
    storyboard: preDesignShotsToPanels(pack.shots, opts),
  };
}

export function hasPreDesignShots(pack?: PreDesignPack): boolean {
  return Boolean(pack?.shots?.length);
}
