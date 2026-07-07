/** characterAssets 字段工具：L0-baseModel 别名等 */

type RawRecord = Record<string, unknown>;

export function resolveBaseModel(entry: RawRecord | undefined): RawRecord | undefined {
  if (!entry) return undefined;
  return (entry["L0-baseModel"] as RawRecord | undefined) ?? (entry.baseModel as RawRecord | undefined);
}

export function normalizeCharacterAssetEntry(entry: RawRecord): RawRecord {
  const bm = resolveBaseModel(entry);
  if (bm && !entry.baseModel) entry.baseModel = bm;
  if (bm && !entry["L0-baseModel"]) entry["L0-baseModel"] = bm;
  return entry;
}

export function lookupLockDescription(entry: RawRecord | undefined): string {
  const bm = resolveBaseModel(entry);
  return (bm?.["锁定描述"] as string) || "";
}

export function lookupLockFaceEnglish(entry: RawRecord | undefined): string {
  const desc = lookupLockDescription(entry);
  if (/\b(male|female|jaw|mole|face|round)\b/i.test(desc)) return desc.slice(0, 200);
  return lookupLockFace(entry);
}

/** T1 stage prompt 剥离脸相关描述，脸锚仅由 lock face + T0 ref 承担 */
export function stripFaceTokensFromWardrobePrompt(prompt: string): string {
  return prompt
    .replace(/\b(round soft )?jawline\b[^,;.]*/gi, "")
    .replace(/\btear mole\b[^,;.]*/gi, "")
    .replace(/\basymmetr(y|ic)\b[^,;.]*/gi, "")
    .replace(/\bdark circles?\b[^,;.]*/gi, "")
    .replace(/\bno visible hair\b[^,;.]*/gi, "")
    .replace(/\bhairline\b[^,;.]*/gi, "")
    .replace(/\bfacial structure\b[^,;.]*/gi, "")
    .replace(/\bface shape\b[^,;.]*/gi, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function lookupLockFace(entry: RawRecord | undefined): string {
  const bm = resolveBaseModel(entry);
  return (bm?.["面容特征"] as string) || lookupLockDescription(entry).slice(0, 80);
}

/** L6-personality → 精简 videoDesc 行为 hint（每镜最多 2 条） */
export function pickPersonalityHints(entry: RawRecord | undefined, colorTone?: string): string[] {
  const l6 = entry?.["L6-personality"] as RawRecord | undefined;
  if (!l6) return [];

  const hints: string[] = [];
  const habits = l6["行为习惯"] as Record<string, string[] | string> | undefined;
  if (/社死|紧张|慌乱/.test(colorTone || "") && habits?.["紧张时"]) {
    const arr = habits["紧张时"];
    if (Array.isArray(arr)) hints.push(...arr.slice(0, 1));
  }
  const nlang = l6["非语言表达"] as Record<string, Record<string, string>> | undefined;
  if (nlang?.["眼神类型"]?.["闪躲"]) hints.push(nlang["眼神类型"]["闪躲"]);

  const visual = l6["视觉质感"] as Record<string, string> | undefined;
  if (visual?.["常驻微表情"]) hints.push(visual["常驻微表情"]);

  return hints.slice(0, 2);
}

/** L5 磨损痕迹 → continuity hint */
export function lookupWearHints(entry: RawRecord | undefined): string[] {
  const l5 = entry?.["L5-accessories"] as Record<string, unknown> | undefined;
  const wear = l5?.["磨损痕迹"];
  if (typeof wear === "string" && wear.trim()) {
    return wear.split(/[,，]/).map((s) => s.trim()).filter(Boolean).slice(0, 2);
  }
  return [];
}

export function lookupStagePrompt(entry: RawRecord | undefined, stageName: string): string {
  if (!entry || !stageName) return "";
  return (entry[`分镜引用prompt_${stageName}`] as string) || "";
}

export function lookupGender(entry: RawRecord | undefined): "male" | "female" | undefined {
  if (!entry) return undefined;
  const g = entry.gender as string | undefined;
  if (g) {
    const lower = g.toLowerCase();
    if (lower === "male" || g === "男") return "male";
    if (lower === "female" || g === "女") return "female";
  }
  const lock = lookupLockDescription(entry).toLowerCase();
  if (/\bmale\b/.test(lock) || lock.includes("男性")) return "male";
  if (/\bfemale\b/.test(lock) || lock.includes("女性")) return "female";
  return undefined;
}

export function enrichRoleDescribe(entry: RawRecord | undefined, baseDesc: string): string {
  const gender = lookupGender(entry);
  const lockFace = lookupLockFace(entry);
  const lockDesc = lookupLockDescription(entry);
  const parts: string[] = [];
  if (gender === "male") parts.push("男性", "male");
  else if (gender === "female") parts.push("女性", "female");
  if (lockFace) parts.push(lockFace);
  if (baseDesc && !parts.includes(baseDesc)) parts.push(baseDesc);
  if (lockDesc && gender === "male" && !baseDesc.toLowerCase().includes("male")) {
    parts.push(lockDesc.slice(0, 120));
  }
  return parts.filter(Boolean).join("，");
}
