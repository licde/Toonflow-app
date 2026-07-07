import { normalizeDramaPack as normalizeProductionSpecLayer } from "./productionSpecAdapter";
import {
  isAllowedStageName,
  isEmotionStageName,
} from "./tieredAssetPolicy";
import { lookupLockFace, normalizeCharacterAssetEntry, resolveBaseModel } from "./characterAssetUtils";

type RawRecord = Record<string, unknown>;

export type PackFormat = "author-v3" | "canonical-v1.2";

export type FixReport = {
  level: "info" | "warning";
  code: string;
  path: string;
  message: string;
};

export type NormalizeResult = {
  normalized: unknown;
  fixes: FixReport[];
  format: PackFormat;
};

const SCENE_CATALOG: Record<string, { name: string; desc: string; prompt: string }> = {
  "SCENE-OFFICE": {
    name: "办公室工位区",
    desc: "开放式工位，自然光，现代办公",
    prompt: "open office cubicles, desk with files, coffee cup, natural light, modern corporate",
  },
  "SCENE-TEA": {
    name: "茶水间",
    desc: "茶水间，暖黄顶灯，饮水机",
    prompt: "small office tea room, marble table, water cooler, warm yellow light",
  },
  "SCENE-CEO": {
    name: "总裁办公室",
    desc: "落地窗总裁办公室，城市夜景",
    prompt: "spacious CEO office, floor-to-ceiling window, dark wood desk, night city view",
  },
  "SCENE-HOME": {
    name: "温如珏的家",
    desc: "一室一厅小公寓，暖黄台灯",
    prompt: "small messy apartment, sofa with blanket, warm yellow lamp, cozy clutter",
  },
  "SCENE-HOSPITAL": {
    name: "病房",
    desc: "VIP病房，昏暗，监测仪绿光",
    prompt: "dark VIP hospital room, heart monitor green light, bedside cabinet",
  },
};

const PROP_CATALOG: Record<string, { name: string; desc: string; prompt: string }> = {
  "PROP-SYS": {
    name: "系统面板",
    desc: "半透明蓝色光屏，科幻UI",
    prompt: "semi-transparent blue holographic panel, glowing data lines, sci-fi UI",
  },
  "PROP-CUP": {
    name: "咖啡杯",
    desc: "白色陶瓷杯",
    prompt: "white ceramic coffee mug, faded text on side",
  },
  "PROP-PHONE": {
    name: "兰芷蘅的手机",
    desc: "黑色直板手机，屏幕有裂痕",
    prompt: "black smartphone with slight crack on screen",
  },
};

function pushFix(fixes: FixReport[], fix: FixReport): void {
  fixes.push(fix);
}

function objectToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) return value.map(String).join("\n");
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${k}：${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("\n");
}

function characterBibleToText(bible: unknown): string {
  if (typeof bible === "string") return bible;
  if (!bible || typeof bible !== "object") return "";
  const lines: string[] = [];
  for (const [code, entry] of Object.entries(bible as Record<string, RawRecord>)) {
    lines.push(`【${code}】`);
    const framework = entry["核心认知框架"] as Record<string, string> | undefined;
    if (framework) {
      for (const [k, v] of Object.entries(framework)) lines.push(`- ${k}：${v}`);
    }
    const principles = entry["行为决策原则"];
    if (Array.isArray(principles)) principles.forEach((p) => lines.push(`- ${p}`));
    const traits = entry["不可替换行为特征"];
    if (Array.isArray(traits)) traits.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function parseDurationFromTime(time: string | undefined): number | null {
  if (!time?.trim()) return null;
  const range = time.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*s?/i);
  if (range) return Math.max(0.5, parseFloat(range[2]) - parseFloat(range[1]));
  const single = time.match(/(\d+(?:\.\d+)?)\s*s/i);
  if (single) return parseFloat(single[1]);
  return null;
}

function hasVisualLockItems(plan: unknown): boolean {
  if (!plan || typeof plan !== "object") return false;
  const lock = (plan as RawRecord).visualLock as RawRecord | undefined;
  if (!lock) return false;
  return (
    ((lock.characters as unknown[] | undefined)?.length ?? 0) +
      ((lock.scenes as unknown[] | undefined)?.length ?? 0) +
      ((lock.props as unknown[] | undefined)?.length ?? 0) >
    0
  );
}

export function detectPackFormat(raw: RawRecord): PackFormat {
  if (raw.meta && typeof raw.meta === "object" && (raw.meta as RawRecord).packFormat === "canonical-v1.2") {
    return "canonical-v1.2";
  }
  if (hasVisualLockItems(raw.plan)) {
    const episodes = (raw.episodes as RawRecord[] | undefined) ?? [];
    const hasAuthorShots = episodes.some((ep) =>
      ((ep.storyboard as RawRecord[] | undefined) ?? []).some(
        (s) => s["镜号"] != null || (s.sceneName && s.duration == null),
      ),
    );
    if (!hasAuthorShots) return "canonical-v1.2";
  }
  const episodes = (raw.episodes as RawRecord[] | undefined) ?? [];
  const authorSignals = episodes.some((ep) => {
    const board = (ep.storyboard as RawRecord[] | undefined) ?? [];
    return board.some((s) => s["镜号"] != null || s.sceneName != null || (s.time && s.duration == null));
  });
  if (authorSignals || raw.narrative || (raw.characterAssets && !hasVisualLockItems(raw.plan))) {
    return "author-v3";
  }
  return "canonical-v1.2";
}

function collectAssetCodes(episodes: RawRecord[]): { scenes: Set<string>; props: Set<string> } {
  const scenes = new Set<string>();
  const props = new Set<string>();
  for (const ep of episodes) {
    for (const shot of (ep.storyboard as RawRecord[] | undefined) ?? []) {
      for (const code of (shot.assetCodes as string[] | undefined) ?? []) {
        if (code.startsWith("SCENE-")) scenes.add(code);
        if (code.startsWith("PROP-")) props.add(code);
      }
    }
  }
  return { scenes, props };
}

function stagesFromCharacterAsset(
  code: string,
  entry: RawRecord,
  narrative: RawRecord | undefined,
): Array<{ name: string; episodeRange?: string; visualMark?: string }> {
  const stages: Array<{ name: string; episodeRange?: string; visualMark?: string }> = [];
  const l4 = entry["L4-outerwear"] as Record<string, string> | undefined;
  const l4Keys = new Set(l4 ? Object.keys(l4) : []);
  const stagePromptKeys = new Set<string>();
  for (const key of Object.keys(entry)) {
    if (key.startsWith("分镜引用prompt_")) stagePromptKeys.add(key.replace("分镜引用prompt_", ""));
  }

  if (l4) {
    for (const [name, mark] of Object.entries(l4)) {
      if (isEmotionStageName(name)) continue;
      stages.push({ name, visualMark: mark });
    }
  }
  const evolution = (narrative?.visualEvolution as Record<string, RawRecord[] | undefined> | undefined)?.[code];
  if (evolution?.length) {
    for (const ev of evolution) {
      const stageName = (ev["阶段"] as string) || "";
      if (!stageName) continue;
      if (!isAllowedStageName(code, stageName, l4Keys, stagePromptKeys)) continue;
      if (stages.some((s) => s.name === stageName)) continue;
      stages.push({
        name: stageName,
        episodeRange: ev["集数范围"] as string | undefined,
        visualMark: ev["画面标记"] as string | undefined,
      });
    }
  }
  for (const key of Object.keys(entry)) {
    if (!key.startsWith("分镜引用prompt_")) continue;
    const stageName = key.replace("分镜引用prompt_", "");
    if (isEmotionStageName(stageName)) continue;
    if (stages.some((s) => s.name === stageName)) continue;
    const prompt = entry[key] as string;
    stages.push({
      name: stageName,
      visualMark: prompt.replace(/^CHAR-\w+,\s*/i, "").split(",").slice(0, 3).join(", "),
    });
  }
  return stages;
}

function visualLockFromCharacterAssets(
  characterAssets: RawRecord,
  narrative: RawRecord | undefined,
  sceneCodes: Set<string>,
  propCodes: Set<string>,
  spec: RawRecord | undefined,
  metaTone: string | undefined,
  fixes: FixReport[],
): RawRecord {
  const characters: RawRecord[] = [];
  for (const [code, raw] of Object.entries(characterAssets)) {
    if (!code.startsWith("CHAR-")) continue;
    const entry = raw as RawRecord;
    normalizeCharacterAssetEntry(entry);
    const name = (entry.name as string) || code;
    const baseModel = resolveBaseModel(entry);
    const fourView = (entry["四视图"] as RawRecord | undefined)?.["完整提示词"] as string | undefined;
    const dailyPrompt = entry["分镜引用prompt_日常"] as string | undefined;
    const lockFace = lookupLockFace(entry);
    let prompt = fourView || dailyPrompt || (baseModel?.["锁定描述"] as string) || "";
    if (fourView && fourView.length > 500) {
      prompt = fourView.replace(/,?\s*four-view character sheet.*$/i, "").slice(0, 480);
      if (!/back view|rear view/i.test(prompt)) {
        prompt = `${prompt}, back view, rear view, four-view character sheet`;
      }
    }
    characters.push({
      code,
      name,
      desc: (baseModel?.["面容特征"] as string) || name,
      prompt,
      lockFace,
      stages: stagesFromCharacterAsset(code, entry, narrative),
    });
    pushFix(fixes, {
      level: "info",
      code: "AUTO_VISUAL_LOCK_CHAR",
      path: `plan.visualLock.characters.${code}`,
      message: `从 characterAssets 合成角色资产 ${code}`,
    });
  }

  const scenes: RawRecord[] = [];
  const sceneLocks = (spec?.sceneColorLock as Array<{ scene?: string; tone?: string; baseTemp?: number }> | undefined) ?? [];
  for (const code of sceneCodes) {
    const catalog = SCENE_CATALOG[code];
    const lock = sceneLocks.find((s) => s.scene === code);
    const tone = lock?.tone || "";
    const temp = lock?.baseTemp != null ? `color temperature ${lock.baseTemp}K` : "";
    scenes.push({
      code,
      name: catalog?.name || code.replace(/^SCENE-/, ""),
      desc: catalog?.desc || tone || code,
      prompt: [catalog?.prompt, tone ? `${tone} tone` : "", temp].filter(Boolean).join(", "),
    });
    pushFix(fixes, {
      level: "info",
      code: "AUTO_VISUAL_LOCK_SCENE",
      path: `plan.visualLock.scenes.${code}`,
      message: `从 assetCodes/sceneColorLock 合成场景 ${code}`,
    });
  }

  const props: RawRecord[] = [];
  for (const code of propCodes) {
    const catalog = PROP_CATALOG[code];
    props.push({
      code,
      name: catalog?.name || code.replace(/^PROP-/, ""),
      desc: catalog?.desc || code,
      prompt: catalog?.prompt || code,
    });
    pushFix(fixes, {
      level: "info",
      code: "AUTO_VISUAL_LOCK_PROP",
      path: `plan.visualLock.props.${code}`,
      message: `从 assetCodes 合成道具 ${code}`,
    });
  }

  const colorMapping = spec?.colorToneMapping as Record<string, { tone?: string }> | undefined;
  const tones = Object.values(colorMapping ?? {})
    .map((m) => m.tone)
    .filter(Boolean);

  return {
    characters,
    scenes,
    props,
    globalStyle: {
      tone: metaTone || tones[0] || "",
      lighting: tones.join("；") || undefined,
    },
  };
}

function inferVisualId(shot: RawRecord, characterAssets: RawRecord | undefined): string {
  if (typeof shot.visualId === "string" && shot.visualId.trim()) return shot.visualId.trim();
  const charCode = ((shot.assetCodes as string[] | undefined) ?? []).find((c) => c.startsWith("CHAR-"));
  if (!charCode) return (shot.sceneName as string) || "";
  const entry = characterAssets?.[charCode] as RawRecord | undefined;
  const name = (entry?.name as string) || charCode;
  const baseName = name.split("（")[0].split("(")[0].trim();
  const sceneName = String(shot.sceneName || "").toUpperCase();

  if (charCode === "CHAR-XC" || /雪辞|XC|CEO_03/.test(sceneName)) return "雪辞-夜晚";
  if (charCode === "CHAR-LZH" || /兰|LZH|CEO_02/.test(sceneName)) return "兰芷蘅-白天";
  if (charCode === "CHAR-WRJ") {
    if (/潜入|HOSPITAL|HOOD/.test(sceneName)) return "温如珏-潜入";
    if (/落魄/.test(sceneName)) return "温如珏-落魄";
    if (/社死|石化|绝望|震惊|慌乱|紧张|困惑/.test(sceneName)) return `温如珏-${sceneName.match(/(社死|石化|绝望|震惊|慌乱|紧张|困惑)/)?.[1] || "日常"}`;
    return "温如珏-日常";
  }
  return `${baseName}-日常`;
}

function syncProductionSpecAliases(_spec: RawRecord, _fixes: FixReport[]): void {
  /* imagePromptRules 与 constraints 双轨：前者 must-include inject，后者仅 strip 禁止词 */
}

function synthesizePlan(raw: RawRecord, fixes: FixReport[]): void {
  const narrative = raw.narrative as RawRecord | undefined;
  const existingPlan = (raw.plan as RawRecord | undefined) ?? {};
  const episodes = (raw.episodes as RawRecord[] | undefined) ?? [];
  const characterAssets = raw.characterAssets as RawRecord | undefined;
  const spec = raw.productionSpec as RawRecord | undefined;

  const plan: RawRecord = { ...existingPlan };

  if (!plan.storySkeleton && narrative?.storySkeleton) {
    plan.storySkeleton = narrative.storySkeleton;
    pushFix(fixes, { level: "info", code: "AUTO_PLAN_FIELD", path: "plan.storySkeleton", message: "从 narrative.storySkeleton 填充" });
  }
  if (!plan.adaptationMatrix && narrative?.adaptationMatrix) {
    plan.adaptationMatrix = objectToText(narrative.adaptationMatrix);
    pushFix(fixes, { level: "info", code: "AUTO_PLAN_FIELD", path: "plan.adaptationMatrix", message: "从 narrative.adaptationMatrix 填充" });
  }
  if (!plan.characterBible && narrative?.characterBible) {
    plan.characterBible = characterBibleToText(narrative.characterBible);
    pushFix(fixes, { level: "info", code: "AUTO_PLAN_FIELD", path: "plan.characterBible", message: "从 narrative.characterBible 填充" });
  }

  if (!hasVisualLockItems(plan) && characterAssets) {
    const { scenes, props } = collectAssetCodes(episodes);
    const metaTone = (raw.meta as RawRecord | undefined)?.tone as string | undefined;
    plan.visualLock = visualLockFromCharacterAssets(
      characterAssets,
      narrative,
      scenes,
      props,
      spec,
      metaTone,
      fixes,
    );
  }

  raw.plan = plan;
}

function normalizeEpisodes(raw: RawRecord, fixes: FixReport[]): void {
  const characterAssets = raw.characterAssets as RawRecord | undefined;
  const episodes = (raw.episodes as RawRecord[] | undefined) ?? [];

  for (const [ei, ep] of episodes.entries()) {
    if (Array.isArray(ep.directorNotes)) {
      ep.directorNotes = (ep.directorNotes as string[]).join("\n");
      pushFix(fixes, {
        level: "info",
        code: "AUTO_DIRECTOR_NOTES",
        path: `episodes[${ei}].directorNotes`,
        message: "directorNotes 数组已合并为字符串",
      });
    }

    const storyboard = (ep.storyboard as RawRecord[] | undefined) ?? [];
    for (const [si, shot] of storyboard.entries()) {
      const path = `episodes[${ei}].storyboard[${si}]`;

      if (shot.duration == null || shot.duration === "") {
        const derived = parseDurationFromTime(shot.time as string | undefined);
        shot.duration = derived ?? 3;
        pushFix(fixes, {
          level: "info",
          code: "AUTO_DURATION",
          path: `${path}.duration`,
          message: `从 time「${shot.time || ""}」推导 duration=${shot.duration}`,
        });
      } else if (typeof shot.duration === "string") {
        shot.duration = parseFloat(shot.duration as string) || 3;
        pushFix(fixes, {
          level: "info",
          code: "AUTO_DURATION_COERCE",
          path: `${path}.duration`,
          message: `duration 字符串已转为数字 ${shot.duration}`,
        });
      }

      if (!shot.content && shot.sceneName) {
        shot.content = String(shot.sceneName).replace(/_/g, " ");
        pushFix(fixes, {
          level: "info",
          code: "AUTO_CONTENT",
          path: `${path}.content`,
          message: "从 sceneName 生成 content",
        });
      }

      if (!shot.visualId) {
        const visualId = inferVisualId(shot, characterAssets);
        if (visualId) {
          shot.visualId = visualId;
          pushFix(fixes, {
            level: "info",
            code: "AUTO_VISUAL_ID",
            path: `${path}.visualId`,
            message: `推断 visualId=${visualId}`,
          });
        }
      }
    }
  }
}

function normalizeOutputFormatFields(raw: RawRecord, fixes: FixReport[]): void {
  const rules = (raw.productionSpec as RawRecord | undefined)?.outputFormatRules as RawRecord | undefined;
  const forbidden = (rules?.["禁止字段值"] as string[] | undefined) ?? ["null", "undefined", "N/A", "（无）", ""];
  const episodes = (raw.episodes as RawRecord[] | undefined) ?? [];
  for (const [ei, ep] of episodes.entries()) {
    for (const [si, shot] of ((ep.storyboard as RawRecord[] | undefined) ?? []).entries()) {
      for (const [k, v] of Object.entries(shot)) {
        if (
          k === "assetCodes" ||
          k === "performance" ||
          k === "visualFocus" ||
          k === "microExpression" ||
          k === "personalitySwitch"
        )
          continue;
        if (Array.isArray(v)) continue;
        if (v === null || v === undefined || forbidden.includes(String(v))) {
          if (k === "performance" && typeof v === "object") continue;
          shot[k] = "—";
          pushFix(fixes, {
            level: "info",
            code: "AUTO_EMPTY_PLACEHOLDER",
            path: `episodes[${ei}].storyboard[${si}].${k}`,
            message: `空值已替换为 —`,
          });
        }
      }
    }
  }
}

function normalizeCharacterAssetsBlock(raw: RawRecord, fixes: FixReport[]): void {
  const assets = raw.characterAssets as RawRecord | undefined;
  if (!assets) return;
  for (const [code, entry] of Object.entries(assets)) {
    if (!entry || typeof entry !== "object") continue;
    normalizeCharacterAssetEntry(entry as RawRecord);
    if ((entry as RawRecord)["L0-baseModel"] && !(entry as RawRecord).baseModel) {
      pushFix(fixes, {
        level: "info",
        code: "AUTO_L0_BASEMODEL_ALIAS",
        path: `characterAssets.${code}`,
        message: "L0-baseModel 已映射为 baseModel",
      });
    }
  }
}

function syncMetaEpisodeCount(raw: RawRecord, fixes: FixReport[]): void {
  const meta = (raw.meta as RawRecord | undefined) ?? {};
  const episodes = (raw.episodes as RawRecord[] | undefined) ?? [];
  if (meta.episodeCount != null && meta.episodeCount !== episodes.length) {
    pushFix(fixes, {
      level: "warning",
      code: "EPISODE_COUNT_SYNC",
      path: "meta.episodeCount",
      message: `meta.episodeCount=${meta.episodeCount} 与 episodes 实际 ${episodes.length} 集不一致（导入时以 episodes 为准）`,
    });
  }
  if (!meta.packFormat) {
    meta.packFormat = detectPackFormat(raw);
  }
  raw.meta = meta;
}

/** 作者格式 v3 → 标准字段（不跑 productionSpec 层） */
export function normalizeAuthorPackV3(input: unknown, fixes: FixReport[] = []): RawRecord {
  const raw = structuredClone(input) as RawRecord;

  normalizeCharacterAssetsBlock(raw, fixes);
  syncProductionSpecAliases((raw.productionSpec as RawRecord) ?? {}, fixes);
  synthesizePlan(raw, fixes);
  normalizeEpisodes(raw, fixes);
  normalizeOutputFormatFields(raw, fixes);
  syncMetaEpisodeCount(raw, fixes);

  return raw;
}

/** 完整归一化：作者格式 + productionSpec 层 */
export function normalizePackInput(input: unknown): NormalizeResult {
  const fixes: FixReport[] = [];
  if (!input || typeof input !== "object") {
    return { normalized: input, fixes, format: "canonical-v1.2" };
  }

  const raw = input as RawRecord;
  const format = detectPackFormat(raw);

  let working: RawRecord;
  if (format === "author-v3") {
    working = normalizeAuthorPackV3(raw, fixes);
  } else {
    working = structuredClone(raw) as RawRecord;
    if (raw.productionSpec) syncProductionSpecAliases(working.productionSpec as RawRecord, fixes);
  }

  const normalized = normalizeProductionSpecLayer(working) as RawRecord;
  if (format === "canonical-v1.2") {
    normalizeEpisodes(normalized, fixes);
  } else {
    const meta = (normalized.meta as RawRecord | undefined) ?? {};
    meta.packFormat = "canonical-v1.2";
    meta.normalizedFrom = "author-v3";
    normalized.meta = meta;
  }

  return { normalized, fixes, format };
}
