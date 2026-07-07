import { DramaPack, DramaPackCoreSchema } from "./schema";
import { normalizePackInput, type FixReport } from "./packNormalizer";
import { resolveArtStyleProfile, shouldApplySpecBlock } from "./artStyleProfiles";
import { findUnmappedSpecBlocks } from "./packFieldRegistry";
import { parseVisualId } from "./visualIdParser";
import { readPersonalitySwitch } from "./personaPolicy";
import { getImagePromptRuleForType } from "./imagePromptRuleParser";

export type ValidationIssue = {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
  /** 仅当 includePack=true 时返回；勿将解析结果覆盖源 JSON 文件 */
  pack?: DramaPack;
  summary?: {
    errorCount: number;
    warningCount: number;
    infoCount?: number;
    episodeCount: number;
    storyboardCount: number;
    preservedExtensionKeys: string[];
    packFormat?: string;
    normalized?: boolean;
    fixCount?: number;
  };
};

const KNOWN_ROOT_KEYS = new Set([
  "version",
  "meta",
  "plan",
  "productionSpec",
  "episodes",
  "narrative",
  "validation",
  "characterAssets",
  "continuityTracking",
  "versionTracking",
  "交付物清单",
  "交付报告",
]);

export function extractPackExtensionKeys(input: unknown): string[] {
  if (!input || typeof input !== "object") return [];
  return Object.keys(input as Record<string, unknown>).filter((k) => !KNOWN_ROOT_KEYS.has(k));
}

export function extractPackExtensions(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!KNOWN_ROOT_KEYS.has(k)) out[k] = v;
  }
  return out;
}

export type ValidateOptions = {
  /** 默认 false：不把 Zod 解析后的 pack 塞进结果，避免误覆盖源文件 */
  includePack?: boolean;
};

function visualIdStageKeys(pack: DramaPack): Set<string> {
  const keys = new Set<string>();
  for (const c of pack.plan.visualLock?.characters ?? []) {
    const base = c.name.split("（")[0].split("(")[0].trim();
    for (const s of c.stages ?? []) {
      keys.add(`${base}-${s.name}`);
      keys.add(`${c.name}-${s.name}`);
    }
  }
  return keys;
}

function isValidVisualId(visualId: string, stageKeys: Set<string>): boolean {
  const parsed = parseVisualId(visualId);
  if (parsed?.charCode && parsed.stage) return true;
  if (stageKeys.has(visualId)) return true;
  if (/\S+[-－]阶段/.test(visualId)) return true;
  return false;
}

function checkDialogueRules(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const stageKeys = visualIdStageKeys(pack);
  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      const d = shot.dialogue?.trim();
      if (!d) continue;
      const lines = d.split(/[\n；;]/).filter(Boolean);
      for (const line of lines) {
        const text = line.replace(/^[^：:]+[:：]/, "").trim();
        const len = [...text].length;
        const isMonologue = /独白|OS|内心/.test(line);
        const limit = isMonologue ? 12 : 15;
        if (len > limit) {
          issues.push({
            level: "warning",
            code: "DIALOGUE_LENGTH",
            path: `episodes[${ei}].storyboard[${si}]`,
            message: `台词「${text.slice(0, 20)}…」${len}字，超过${isMonologue ? "独白" : "对话"}${limit}字建议上限`,
          });
        }
      }
      if (shot.visualId && !isValidVisualId(shot.visualId, stageKeys)) {
        issues.push({
          level: "warning",
          code: "VISUAL_ID_FORMAT",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `visualId「${shot.visualId}」建议 V42 格式「CHAR-CODE-阶段_动作」或与 visualLock.stages 对齐`,
        });
      }
    }
  }
  return issues;
}

function checkAssetReferences(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const codes = new Set<string>();
  const lock = pack.plan.visualLock;
  for (const c of lock?.characters ?? []) codes.add(c.code);
  for (const s of lock?.scenes ?? []) codes.add(s.code);
  for (const p of lock?.props ?? []) codes.add(p.code);

  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      for (const code of shot.assetCodes ?? []) {
        if (!codes.has(code)) {
          issues.push({
            level: "error",
            code: "UNKNOWN_ASSET_CODE",
            path: `episodes[${ei}].storyboard[${si}]`,
            message: `资产锁定码「${code}」未在 visualLock 中定义`,
          });
        }
      }
    }
  }
  return issues;
}

function checkDuration(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [ei, ep] of pack.episodes.entries()) {
    let total = 0;
    for (const [si, shot] of ep.storyboard.entries()) {
      if (shot.duration > 15) {
        issues.push({
          level: "warning",
          code: "SHOT_DURATION",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `单镜时长 ${shot.duration}s 超过 15s，Production 流水线建议 ≤15s`,
        });
      }
      total += shot.duration;
    }
    if (ep.storyboard.length && total > 120) {
      issues.push({
        level: "warning",
        code: "EPISODE_DURATION",
        path: `episodes[${ei}]`,
        message: `第 ${ei + 1} 集分镜总时长 ${total}s 偏长，竖屏短剧建议 60–90s`,
      });
    }
  }
  return issues;
}

function checkShotTypeRules(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rules = pack.productionSpec?.shotTypeRules as Array<{ intensity?: number; recommended?: string[]; forbidden?: string[] }> | undefined;
  if (!rules?.length) return issues;

  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      const intensity = shot.emotionIntensity;
      const shotType = shot.shotType?.trim();
      if (!intensity || !shotType) continue;
      const rule = rules.find((r) => r.intensity === intensity);
      if (!rule) continue;
      if (rule.forbidden?.some((f) => shotType.includes(f))) {
        issues.push({
          level: "warning",
          code: "SHOT_TYPE_RULE",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `情绪强度 ${intensity} 时景别「${shotType}」在 shotTypeRules 禁止列表中`,
        });
      }
    }
  }
  return issues;
}

function checkPureShotConstraints(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const constraints = pack.productionSpec?.constraints as Record<string, string> | undefined;
  if (!constraints) return issues;

  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      const shotType = shot.type;
      if (!shotType || !constraints[shotType]) continue;
      const text = constraints[shotType];
      if (/必须包含/.test(text)) continue;
      const forbidden = text
        .replace(/^禁止[:：]\s*/, "")
        .split(/[,，]/)
        .map((w) => w.trim())
        .filter(Boolean);
      const prompt = (shot.imagePrompt || "").toLowerCase();
      for (const word of forbidden) {
        if (!word.trim() || /必须|引用|比例/.test(word)) continue;
        if (prompt.includes(word.toLowerCase())) {
          issues.push({
            level: "warning",
            code: "PURE_SHOT_CONSTRAINT",
            path: `episodes[${ei}].storyboard[${si}]`,
            message: `${shotType} 镜 imagePrompt 含禁止词「${word}」`,
          });
        }
      }
    }
  }
  return issues;
}

function checkImagePromptRulesCompliance(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const spec = pack.productionSpec as Record<string, unknown> | undefined;

  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      if (!shot.type) continue;
      const parsed = getImagePromptRuleForType(spec, shot.type);
      if (!parsed) continue;
      const prompt = (shot.imagePrompt || "").toLowerCase();
      for (const frag of parsed.mustInclude) {
        if (!prompt.includes(frag.toLowerCase())) {
          issues.push({
            level: "info",
            code: "IMAGE_PROMPT_RULE_MUST",
            path: `episodes[${ei}].storyboard[${si}]`,
            message: `${shot.type} 镜 imagePrompt 建议含「${frag}」（imagePromptRules 必须包含）`,
          });
        }
      }
      for (const code of shot.assetCodes ?? []) {
        const prefix = code.replace(/-.*$/, "").toUpperCase();
        if (parsed.requireCodePrefixes.length && !parsed.requireCodePrefixes.some((p) => prefix === p)) {
          /* shot type may not require all prefixes */
        }
      }
    }
  }
  return issues;
}

function checkPersonalitySwitch(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      const raw = shot as Record<string, unknown>;
      const ps = readPersonalitySwitch(raw);
      if (!ps) continue;
      const codes = shot.assetCodes ?? [];
      const progress = ps.progress || "";
      if (progress === "100%" && ps.to && !codes.includes(ps.to)) {
        issues.push({
          level: "error",
          code: "PERSONALITY_SWITCH_ASSET",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `人格切换完成时 assetCodes 应含 personalitySwitch.to=${ps.to}`,
        });
      } else if ((progress === "0%" || progress.startsWith("0")) && ps.from && !codes.includes(ps.from)) {
        issues.push({
          level: "error",
          code: "PERSONALITY_SWITCH_ASSET",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `人格切换起点时 assetCodes 应含 personalitySwitch.from=${ps.from}`,
        });
      }
      const l6 = String(raw["L6-trigger"] || "");
      if (/雪辞/.test(l6) && !(shot.assetCodes ?? []).some((c) => c === "CHAR-XC")) {
        issues.push({
          level: "warning",
          code: "L6_TRIGGER_PERSONA",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: "L6-trigger 含雪辞时建议 assetCodes 含 CHAR-XC",
        });
      }
      const parsed = parseVisualId(shot.visualId);
      if (parsed?.charCode && ps.to && parsed.charCode !== ps.to && ps.progress === "100%") {
        issues.push({
          level: "warning",
          code: "PERSONALITY_VISUAL_ID",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `人格切换完成时 visualId 角色码 ${parsed.charCode} 应与 personalitySwitch.to=${ps.to} 一致`,
        });
      }
    }
  }
  return issues;
}

function parseAvgShotRange(range: string): { min: number; max: number } | null {
  const m = range.match(/([\d.]+)\s*[-–]\s*([\d.]+)\s*s/);
  if (!m) return null;
  return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
}

function checkEditingRules(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const editingRules = pack.productionSpec?.editingRules as Record<string, { avgShot?: string }> | undefined;
  if (!editingRules) return issues;

  const toneToRule: Record<string, string> = {
    平静: "平静",
    紧张: "紧张",
    社死: "情绪爆发",
    雪辞出现: "情绪爆发",
  };

  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      const ruleKey = shot.colorTone ? toneToRule[shot.colorTone] || shot.colorTone : "";
      const rule = ruleKey ? editingRules[ruleKey] : undefined;
      if (!rule?.avgShot) continue;
      const range = parseAvgShotRange(rule.avgShot);
      if (!range) continue;
      if (shot.duration < range.min || shot.duration > range.max) {
        issues.push({
          level: "warning",
          code: "EDITING_RULE_DURATION",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `镜时长 ${shot.duration}s 超出 editingRules「${ruleKey}」建议 ${rule.avgShot}`,
        });
      }
    }
  }
  return issues;
}

function checkContinuityLock(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const continuityLock = pack.productionSpec?.continuityLock as Record<string, Record<string, string>> | undefined;
  if (!continuityLock) return issues;

  for (const [propName, rules] of Object.entries(continuityLock)) {
    const stateHint = rules["状态"] || rules["第1集结束"] || "";
    if (!stateHint) continue;
    const matchingShots = pack.episodes.flatMap((ep, ei) =>
      ep.storyboard.map((shot, si) => ({ shot, ei, si })).filter(({ shot }) => (shot.content || "").includes(propName)),
    );
    if (matchingShots.length > 1) {
      issues.push({
        level: "warning",
        code: "CONTINUITY_LOCK",
        message: `continuityLock「${propName}」在 ${matchingShots.length} 镜出现，请确认状态「${stateHint}」跨镜一致`,
      });
    }
  }
  return issues;
}

function checkShotTypeAssetCodes(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      if (!shot.type) continue;
      const codes = shot.assetCodes ?? [];
      if (shot.type === "PURE-SCENE" && !codes.some((c) => c.startsWith("SCENE-"))) {
        issues.push({
          level: "warning",
          code: "SHOT_TYPE_ASSET",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `${shot.type} 镜缺少 SCENE-* assetCode`,
        });
      }
      if (shot.type === "PURE-PROP" && !codes.some((c) => c.startsWith("PROP-"))) {
        issues.push({
          level: "warning",
          code: "SHOT_TYPE_ASSET",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `${shot.type} 镜缺少 PROP-* assetCode`,
        });
      }
      if ((shot.type === "CHAR-SCENE" || shot.type === "CHAR-PROP") && !codes.some((c) => c.startsWith("CHAR-"))) {
        issues.push({
          level: "warning",
          code: "SHOT_TYPE_ASSET",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `${shot.type} 镜缺少 CHAR-* assetCode`,
        });
      }
    }
  }
  return issues;
}

function checkOutputFormatRules(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rules = pack.productionSpec?.outputFormatRules as Record<string, unknown> | undefined;
  const required = (rules?.["必填字段"] as string[] | undefined) ?? [];
  const forbidden = (rules?.["禁止字段值"] as string[] | undefined) ?? ["null", "undefined", "N/A", "（无）", ""];

  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      const raw = shot as Record<string, unknown>;
      for (const field of required) {
        const val = raw[field];
        if (val === undefined || val === null || forbidden.includes(String(val))) {
          issues.push({
            level: "warning",
            code: "OUTPUT_FORMAT_REQUIRED",
            path: `episodes[${ei}].storyboard[${si}].${field}`,
            message: `outputFormatRules 必填字段「${field}」缺失或为空`,
          });
        }
      }
      if (shot.emotionIntensity != null && shot.emotionIntensity >= 4) {
        const perf = shot.performance as Record<string, unknown> | undefined;
        const micro = perf?.microExpression as Record<string, unknown> | undefined;
        if (!micro || Object.keys(micro).length === 0) {
          issues.push({
            level: "warning",
            code: "V25_MICRO_EXPRESSION",
            path: `episodes[${ei}].storyboard[${si}]`,
            message: "情绪强度≥4 时建议含 performance.microExpression（V25）",
          });
        }
      }
      const sceneName = raw.sceneName as string | undefined;
      if (!sceneName?.trim()) {
        issues.push({
          level: "warning",
          code: "V24_SCENE_NAME",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: "缺少 sceneName（V24）",
        });
      }
    }
  }
  return issues;
}

function checkExtendedProductionValidation(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [ei, ep] of pack.episodes.entries()) {
    for (const [si, shot] of ep.storyboard.entries()) {
      const raw = shot as Record<string, unknown>;
      const shotType = shot.shotType?.trim() || "";
      const intensity = shot.emotionIntensity;

      // V31: 强情绪台词不得使用全景/远景
      if (intensity != null && intensity >= 4 && /全景|远景/.test(shotType)) {
        issues.push({
          level: "warning",
          code: "V31_SHOT_TYPE_EMOTION",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `V31: 情绪强度 ${intensity} 时不建议使用全景/远景（当前「${shotType}」）`,
        });
      }

      // V33: 相邻镜情绪大幅变化（简化：同集内仅 warning 高强度差+同 cameraAngle）
      if (si > 0) {
        const prev = ep.storyboard[si - 1];
        const prevI = prev.emotionIntensity;
        if (prevI != null && intensity != null && Math.abs(intensity - prevI) >= 3) {
          if (shot.cameraAngle && shot.cameraAngle === prev.cameraAngle) {
            issues.push({
              level: "info",
              code: "V33_CAMERA_EMOTION",
              path: `episodes[${ei}].storyboard[${si}]`,
              message: "V33: 情绪大幅变化时建议切换机位",
            });
          }
        }
      }

      // V36: 情绪爆发台词应配 actionLead（由 dialogueActionSync 在 compose 时注入）
      const dialogue = shot.dialogue || "";
      if (/！|!/.test(dialogue) && intensity != null && intensity >= 4) {
        const perf = shot.performance as Record<string, unknown> | undefined;
        if (!perf?.bodyWeight && !perf?.shoulders && !perf?.hands) {
          issues.push({
            level: "info",
            code: "V36_DIALOGUE_ACTION",
            path: `episodes[${ei}].storyboard[${si}]`,
            message: "V36: 情绪爆发台词建议 performance 含动作先于台词",
          });
        }
      }

      // --cref 文档 token 警告
      if (/--cref|--sref/.test(shot.imagePrompt || "")) {
        issues.push({
          level: "info",
          code: "PROMPT_CREF_TOKEN",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: "imagePrompt 含 --cref/--sref 标记，merge 时会 strip；同脸请用 referenceList",
        });
      }

      // sceneGenerationRules: PURE-SCENE
      if (shot.type === "PURE-SCENE") {
        const rules = pack.productionSpec?.sceneGenerationRules as Record<string, { forbidden?: string[] }> | undefined;
        const indoor = rules?.["室内场景"];
        if (indoor?.forbidden?.some((f) => (shot.imagePrompt || "").toLowerCase().includes(f.toLowerCase()))) {
          issues.push({
            level: "warning",
            code: "SCENE_GENERATION_RULE",
            path: `episodes[${ei}].storyboard[${si}]`,
            message: "PURE-SCENE imagePrompt 可能违反 sceneGenerationRules 禁止项",
          });
        }
      }
    }

    // episodeOpenRules: 首镜 hook
    const first = ep.storyboard[0];
    if (first) {
      const openRules = pack.productionSpec?.episodeOpenRules as Record<string, { forbidden?: string }> | undefined;
      const hookRule = openRules?.["前3秒钩子"];
      if (hookRule?.forbidden && first.type === "PURE-SCENE" && !first.assetCodes?.some((c) => c.startsWith("CHAR-"))) {
        issues.push({
          level: "info",
          code: "EPISODE_OPEN_HOOK",
          path: `episodes[${ei}].storyboard[0]`,
          message: "episodeOpenRules: 首镜建议角色特写而非纯空镜",
        });
      }
    }
  }

  // V40: 相邻镜情绪强度变化不超过3级（简化检查）
  for (const [ei, ep] of pack.episodes.entries()) {
    for (let si = 1; si < ep.storyboard.length; si++) {
      const a = ep.storyboard[si - 1].emotionIntensity;
      const b = ep.storyboard[si].emotionIntensity;
      if (a != null && b != null && Math.abs(b - a) > 3) {
        issues.push({
          level: "info",
          code: "V40_EMOTION_JUMP",
          path: `episodes[${ei}].storyboard[${si}]`,
          message: `V40: 镜 ${si}→${si + 1} 情绪强度跳变 ${Math.abs(b - a)} 级（建议≤3或有缓冲镜）`,
        });
      }
    }
  }

  return issues;
}

function checkUnmappedSpecBlocks(pack: DramaPack): ValidationIssue[] {
  return findUnmappedSpecBlocks(pack).map((block) => ({
    level: "info" as const,
    code: "UNMAPPED_SPEC_BLOCK",
    message: `productionSpec.${block} 已存档但未映射到 Registry，见 docs/pack-field-manifest.md`,
  }));
}

function checkArtStyleProfileRules(pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const profile = resolveArtStyleProfile(pack.meta.artStyleHint);
  if (!shouldApplySpecBlock(profile, "characterAssetRules") && pack.productionSpec?.characterAssetRules) {
    issues.push({
      level: "info",
      code: "PROFILE_SKIP_CHARACTER_ASSET_RULES",
      message: `characterAssetRules 与 artStyleHint=${pack.meta.artStyleHint} 冲突，导入时已忽略`,
    });
  }
  return issues;
}

function checkRootValidationBlock(input: unknown, pack: DramaPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input || typeof input !== "object") return issues;
  const rootVal = (input as Record<string, unknown>).validation as Record<string, unknown> | undefined;
  const rhythm = rootVal?.rhythm as Record<string, unknown> | undefined;
  if (rhythm?.["总镜数"]) {
    const expected = parseInt(String(rhythm["总镜数"]), 10);
    const actual = pack.episodes.reduce((n, ep) => n + ep.storyboard.length, 0);
    if (!Number.isNaN(expected) && expected !== actual) {
      issues.push({
        level: "warning",
        code: "ROOT_VALIDATION_RHYTHM",
        message: `validation.rhythm.总镜数=${expected} 与 engine 统计 ${actual} 不一致`,
      });
    }
  }
  return issues;
}

function fixesToIssues(fixes: FixReport[]): ValidationIssue[] {
  return fixes.map((f) => ({
    level: f.level,
    code: f.code,
    message: f.message,
    path: f.path,
  }));
}

export function validateDramaPack(input: unknown, options: ValidateOptions = {}): ValidationResult {
  const extensionKeys = extractPackExtensionKeys(input);
  const { normalized, fixes, format } = normalizePackInput(input);
  const parsed = DramaPackCoreSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      valid: false,
      issues: [
        ...fixesToIssues(fixes),
        ...parsed.error.issues.map((e) => ({
        level: "error" as const,
        code: "SCHEMA",
        message: `${e.path.join(".")}: ${e.message}`,
        path: e.path.join("."),
      })),
      ],
      summary: {
        errorCount: parsed.error.issues.length,
        warningCount: fixes.filter((f) => f.level === "warning").length,
        infoCount: fixes.filter((f) => f.level === "info").length,
        episodeCount: 0,
        storyboardCount: 0,
        preservedExtensionKeys: extensionKeys,
        packFormat: format,
        normalized: true,
        fixCount: fixes.length,
      },
    };
  }
  const pack = parsed.data;
  const issues: ValidationIssue[] = [
    ...fixesToIssues(fixes),
    ...checkAssetReferences(pack),
    ...checkDialogueRules(pack),
    ...checkDuration(pack),
    ...checkShotTypeRules(pack),
    ...checkPureShotConstraints(pack),
    ...checkImagePromptRulesCompliance(pack),
    ...checkPersonalitySwitch(pack),
    ...checkEditingRules(pack),
    ...checkContinuityLock(pack),
    ...checkShotTypeAssetCodes(pack),
    ...checkOutputFormatRules(pack),
    ...checkArtStyleProfileRules(pack),
    ...checkExtendedProductionValidation(pack),
    ...checkUnmappedSpecBlocks(pack),
    ...checkRootValidationBlock(input, pack),
  ];
  if (pack.meta.episodeCount && pack.episodes.length !== pack.meta.episodeCount) {
    issues.push({
      level: "warning",
      code: "EPISODE_COUNT",
      message: `meta.episodeCount=${pack.meta.episodeCount} 与 episodes 实际 ${pack.episodes.length} 集不一致`,
    });
  }
  const hasErrors = issues.some((i) => i.level === "error");
  const storyboardCount = pack.episodes.reduce((n, ep) => n + (ep.storyboard?.length ?? 0), 0);
  return {
    valid: !hasErrors,
    issues,
    ...(options.includePack ? { pack } : {}),
    summary: {
      errorCount: issues.filter((i) => i.level === "error").length,
      warningCount: issues.filter((i) => i.level === "warning").length,
      infoCount: issues.filter((i) => i.level === "info").length,
      episodeCount: pack.episodes.length,
      storyboardCount,
      preservedExtensionKeys: extensionKeys,
      packFormat: format,
      normalized: true,
      fixCount: fixes.length,
    },
  };
}
