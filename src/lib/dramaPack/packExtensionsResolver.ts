import type { DramaPackStoryboardShot } from "./schema";
import { lookupLockDescription, lookupWearHints, normalizeCharacterAssetEntry } from "./characterAssetUtils";
import { mapVisualIdToWardrobeStage } from "./tieredAssetPolicy";
import { parseVisualId } from "./visualIdParser";

export type CharacterAssetEntry = Record<string, unknown> & {
  name?: string;
  四视图?: { 完整提示词?: string; 规范?: string };
};

export type PackExtensionsContext = {
  characterAssets?: Record<string, CharacterAssetEntry>;
  continuityTracking?: Record<string, Record<string, string>>;
};

const STAGE_PROMPT_PREFIX = "分镜引用prompt_";

function promptContains(text: string, fragment: string): boolean {
  if (!fragment.trim()) return true;
  return text.toLowerCase().includes(fragment.toLowerCase());
}

function mergeFragment(existing: string, fragment: string): string {
  if (!fragment.trim()) return existing;
  if (promptContains(existing, fragment)) return existing;
  return existing ? `${fragment}, ${existing}` : fragment;
}

/** 扁平化 v2/v3 continuityTracking：道具.咖啡杯.镜7 → 咖啡杯.镜7 */
export function flattenContinuityTracking(raw: unknown): Record<string, Record<string, string>> {
  if (!raw || typeof raw !== "object") return {};
  const flat: Record<string, Record<string, string>> = {};

  const absorb = (subject: string, entries: Record<string, unknown>) => {
    const shotMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(entries)) {
      if (typeof v === "string" && /^镜\d+/.test(k)) shotMap[k] = v;
    }
    if (Object.keys(shotMap).length) {
      flat[subject] = { ...(flat[subject] ?? {}), ...shotMap };
    }
  };

  for (const [, groupVal] of Object.entries(raw as Record<string, unknown>)) {
    if (!groupVal || typeof groupVal !== "object") continue;
    for (const [subject, subjectVal] of Object.entries(groupVal as Record<string, unknown>)) {
      if (!subjectVal || typeof subjectVal !== "object") continue;
      absorb(subject, subjectVal as Record<string, unknown>);
    }
  }

  for (const [subject, subjectVal] of Object.entries(raw as Record<string, unknown>)) {
    if (!subjectVal || typeof subjectVal !== "object") continue;
    absorb(subject, subjectVal as Record<string, unknown>);
  }

  return flat;
}

/** 从 pack 根对象或 packExtensions 提取扩展上下文 */
export function parsePackExtensions(input?: unknown): PackExtensionsContext {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const characterAssets =
    (raw.characterAssets as PackExtensionsContext["characterAssets"]) ??
    (raw.packExtensions as Record<string, unknown> | undefined)?.characterAssets;
  const continuityRaw =
    raw.continuityTracking ??
    (raw.packExtensions as Record<string, unknown> | undefined)?.continuityTracking;
  const continuityTracking = continuityRaw ? flattenContinuityTracking(continuityRaw) : undefined;

  if (characterAssets || continuityTracking) {
    return { characterAssets: characterAssets as PackExtensionsContext["characterAssets"], continuityTracking };
  }

  const ext = raw.packExtensions as PackExtensionsContext | undefined;
  if (ext) {
    return {
      characterAssets: ext.characterAssets,
      continuityTracking: ext.continuityTracking ? flattenContinuityTracking(ext.continuityTracking) : undefined,
    };
  }
  return {};
}

export function resolveCharCodeFromVisualId(
  visualId: string | undefined,
  assetCodes: string[],
  characterAssets: Record<string, CharacterAssetEntry>,
): string | undefined {
  const fromAssets = assetCodes.find((c) => c.startsWith("CHAR-") && characterAssets[c]);
  if (fromAssets) return fromAssets;

  if (!visualId) return undefined;

  const parsed = parseVisualId(visualId);
  if (parsed?.charCode && characterAssets[parsed.charCode]) return parsed.charCode;

  for (const [code, entry] of Object.entries(characterAssets)) {
    const name = entry.name || "";
    const base = name.split("（")[0].split("(")[0].trim();
    if (base && (visualId.startsWith(base) || visualId.includes(base))) return code;
    if (/雪辞/.test(visualId) && /雪辞/.test(name)) return code;
  }
  return assetCodes.find((c) => c.startsWith("CHAR-"));
}

function resolveStageName(visualId: string | undefined, charCode: string, entry: CharacterAssetEntry): string {
  if (!visualId) return "";

  const parsed = parseVisualId(visualId);
  if (parsed?.charCode === charCode && parsed.stage) {
    const wardrobe = mapVisualIdToWardrobeStage(visualId, charCode);
    return wardrobe || parsed.stage;
  }

  const dash = visualId.lastIndexOf("-");
  if (dash >= 0) {
    const suffix = visualId.slice(dash + 1);
    const wardrobe = mapVisualIdToWardrobeStage(visualId, charCode);
    if (wardrobe && wardrobe !== suffix) return wardrobe;
    return suffix;
  }

  for (const key of Object.keys(entry)) {
    if (key.startsWith(STAGE_PROMPT_PREFIX)) {
      return key.slice(STAGE_PROMPT_PREFIX.length);
    }
  }
  if (charCode === "CHAR-LZH") return "白天";
  if (charCode === "CHAR-XC") return "夜晚";
  return "";
}

/** visualId + characterAssets → 阶段分镜引用 prompt */
export function lookupCharacterStagePrompt(
  extensions: PackExtensionsContext | undefined,
  visualId: string | undefined,
  assetCodes: string[] = [],
): string {
  const characterAssets = extensions?.characterAssets;
  if (!characterAssets || !visualId) return "";

  const charCode = resolveCharCodeFromVisualId(visualId, assetCodes, characterAssets);
  if (!charCode) return "";

  const entry = characterAssets[charCode];
  if (!entry) return "";

  const stageName = resolveStageName(visualId, charCode, entry);
  if (!stageName) return "";

  const direct = entry[`${STAGE_PROMPT_PREFIX}${stageName}`] as string | undefined;
  if (direct?.trim()) return direct.trim();

  // 别名：震惊/慌乱/社死 等情绪 stage 回落到「日常」
  const fallbackStages = ["日常", "白天", "夜晚", "潜入", "落魄"];
  for (const fb of fallbackStages) {
    const p = entry[`${STAGE_PROMPT_PREFIX}${fb}`] as string | undefined;
    if (p?.trim()) return p.trim();
  }
  return "";
}

/** 四视图完整提示词 → 基础角色资产 */
export function lookupTurnaroundPrompt(
  extensions: PackExtensionsContext | undefined,
  charCode: string,
): string {
  const entry = extensions?.characterAssets?.[charCode];
  const prompt = entry?.四视图?.完整提示词;
  return prompt?.trim() || "";
}

/** 解析 continuityTracking 镜号键 → 1-based 镜号列表 */
export function parseShotNumbers(key: string): number[] {
  const m = key.match(/镜(\d+)(?:-(\d+))?/);
  if (!m) return [];
  const start = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : start;
  const nums: number[] = [];
  for (let i = start; i <= end; i++) nums.push(i);
  return nums;
}

/** 按 1-based 镜号收集连续性 hint（英文，供 imagePrompt merge） */
export function buildContinuityHints(extensions: PackExtensionsContext | undefined, shotIndex: number): string[] {
  const tracking = extensions?.continuityTracking;
  if (!tracking) return [];

  const shotNum = shotIndex + 1;
  const hints: string[] = [];

  for (const [subject, shots] of Object.entries(tracking)) {
    for (const [shotKey, state] of Object.entries(shots)) {
      if (!parseShotNumbers(shotKey).includes(shotNum)) continue;
      const en = continuityStateToEnglish(subject, state);
      if (en) hints.push(en);
    }
  }
  return hints;
}

function continuityStateToEnglish(subject: string, state: string): string {
  const s = state.toLowerCase();
  if (/咖啡/.test(subject)) {
    if (/空杯|残余1cm/.test(state)) return "empty coffee mug, 1cm residue at bottom";
    if (/洒出|泼洒|倾斜45/.test(state)) return "coffee spilling, mug tilted 45 degrees, liquid mid-air";
    if (/满杯/.test(state)) return "full coffee mug, liquid 1cm below rim, right hand holding handle";
  }
  if (/黑眼圈/.test(subject)) {
    const m = state.match(/(\d)\/5/);
    if (m) return `dark circles intensity ${m[1]}/5`;
  }
  if (/领带/.test(subject) && /歪左15/.test(state)) {
    return "loose blue striped tie tilted 15 degrees left";
  }
  if (/耳钉/.test(subject)) return "minimalist silver stud earrings 3mm";
  if (/发型/.test(subject) && /高马尾/.test(state)) return "high ponytail level with earlobes";
  if (/发型/.test(subject) && /披发/.test(state)) return "loose wavy hair, left side tucked behind ear";
  return `${subject}: ${state}`.slice(0, 120);
}

type SystemUIEntry = { method?: string; sound?: string; duration?: number };

/** PROP-SYS 系统 UI 镜：从 systemUIAppearance 补 sound */
export function resolveSystemUISound(
  systemUIAppearance: Record<string, SystemUIEntry> | undefined,
  shot: Pick<DramaPackStoryboardShot, "type" | "assetCodes" | "content" | "sound">,
  sceneCode?: string,
): string {
  if (shot.sound?.trim()) return shot.sound.trim();
  if (!systemUIAppearance || shot.type !== "PURE-PROP") return "";
  if (!(shot.assetCodes ?? []).some((c) => c.startsWith("PROP-SYS"))) return "";

  const content = shot.content || "";
  if (/紧急|警告|惩罚|失败|倒计时|加粗红字/.test(content) && systemUIAppearance["紧急任务"]) {
    const e = systemUIAppearance["紧急任务"];
    return [e.sound, e.duration != null ? `${e.duration}s` : ""].filter(Boolean).join(" ");
  }
  if (/家中|沙发|home/i.test(content) || sceneCode === "SCENE-HOME") {
    const h = systemUIAppearance["家中"];
    return h?.sound ? [h.sound, h.duration != null ? `${h.duration}s` : ""].filter(Boolean).join(" ") : "";
  }
  const office = systemUIAppearance["工位"];
  return office?.sound ? [office.sound, office.duration != null ? `${office.duration}s` : ""].filter(Boolean).join(" ") : "";
}

/** 将 characterAssets 阶段 prompt 与 continuity hint merge 进 imagePrompt */
export function mergePackExtensionHints(
  imagePrompt: string,
  extensions: PackExtensionsContext | undefined,
  shot: DramaPackStoryboardShot,
  shotIndex: number,
): string {
  let result = imagePrompt;

  const stagePrompt = lookupCharacterStagePrompt(extensions, shot.visualId, shot.assetCodes);
  if (stagePrompt) {
    const core = stagePrompt.replace(/\s*--ar.*$/i, "").replace(/\s*--cref.*$/i, "").replace(/\s*--sref.*$/i, "");
    const fragments = core.split(",").map((f) => f.trim()).filter(Boolean);
    for (const frag of fragments) {
      if (frag.length > 12 && !promptContains(result, frag.slice(0, 10))) {
        result = mergeFragment(result, frag);
      }
    }
  }

  for (const hint of buildContinuityHints(extensions, shotIndex)) {
    result = mergeFragment(result, hint);
  }

  const charCode = (shot.assetCodes ?? []).find((c) => c.startsWith("CHAR-"));
  if (charCode && extensions?.characterAssets?.[charCode]) {
    for (const w of lookupWearHints(extensions.characterAssets[charCode] as Record<string, unknown>)) {
      result = mergeFragment(result, w);
    }
  }

  return result.replace(/\s+/g, " ").trim();
}

/** normalize characterAssets entries on parse */
export function normalizeExtensionsCharacterAssets(
  assets: Record<string, CharacterAssetEntry> | undefined,
): Record<string, CharacterAssetEntry> | undefined {
  if (!assets) return assets;
  const out: Record<string, CharacterAssetEntry> = {};
  for (const [k, v] of Object.entries(assets)) {
    out[k] = normalizeCharacterAssetEntry({ ...v }) as CharacterAssetEntry;
  }
  return out;
}

export { lookupLockDescription };
