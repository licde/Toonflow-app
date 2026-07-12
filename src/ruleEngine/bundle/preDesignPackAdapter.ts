import type { PreDesignPack, PreDesignShot, StoryboardPanelInput } from "./types";

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

export function preDesignShotsToPanels(shots: PreDesignShot[]): StoryboardPanelInput[] {
  return shots.map((s, i) => {
    const idx = s.shotIndex ?? i + 1;
    const desc = s.visualDescription ?? linesToText(s);
    const chars = s.charCodes?.join(", ") ?? "";
    return {
      clientId: `sb-${idx}`,
      duration: s.duration ?? 3,
      prompt: [chars, s.sceneName, desc].filter(Boolean).join("，").slice(0, 500),
      videoDesc: `${s.shotSize ?? "medium shot"} static, ${s.duration ?? 3}s`,
      shouldGenerateImage: 1,
      associateAssetsIds: [],
      track: String(idx),
      state: "未生成",
      index: idx - 1,
    };
  });
}

export function applyPreDesignPack(pack: PreDesignPack): {
  scriptPlan: string;
  storyboardTable: string;
  storyboard: StoryboardPanelInput[];
} {
  return {
    scriptPlan: pack.scriptPlan,
    storyboardTable: preDesignShotsToStoryboardTable(pack.shots),
    storyboard: preDesignShotsToPanels(pack.shots),
  };
}

export function hasPreDesignShots(pack?: PreDesignPack): boolean {
  return Boolean(pack?.shots?.length);
}
