/**
 * Flatten CD / VLT prop / scene locks into visual briefs for seed + polish.
 * SSOT field names follow CD_character_design.md short keys.
 */

export type CdAssetLike = {
  code?: string;
  name?: string;
  L0?: {
    visual?: string;
    identity?: string;
    age?: string;
    gender?: string;
    stub?: boolean;
  };
  L1?: { face?: string; skin?: string; expression?: string; silhouette?: string };
  L2?: { hair?: string; bodyType?: string };
  L3?: { costume?: string; accessories?: string };
  L4?: { posture?: string; gesture?: string };
  L5?: { speed?: string; timbre?: string; accent?: string };
  L6?: {
    arcVisual?: string;
    stateVariants?: { name?: string; visual?: string }[] | Record<string, string>;
  };
};

export type PropLockLike = {
  name?: string;
  significance?: string;
  material?: string;
  form?: string;
  appearanceSchedule?: number[];
};

export type SceneLockLike = {
  name?: string;
  colorTemp?: string;
  dominantHue?: string;
  anchorElements?: string[];
  /** Raw string lock value when VLT stores prose instead of structured fields */
  raw?: string;
};

export type AssetTier = "lead" | "support" | "extra";

export interface FlattenResult {
  brief: string;
  describe: string;
  weak: boolean;
  keywords: string[];
}

/** Deterministic CD → visual brief (no LLM). Prefer L0.visual when rich enough. */
export function flattenCharacterVisualBrief(asset: CdAssetLike): FlattenResult {
  const name = (asset.name ?? asset.code ?? "").trim();
  const visual = asset.L0?.visual?.trim();
  if (visual && visual.length >= 24) {
    return { brief: visual.slice(0, 2000), describe: visual.slice(0, 500), weak: false, keywords: [visual.slice(0, 40)] };
  }

  const parts: string[] = [];
  const keywords: string[] = [];
  const push = (label: string, v?: string) => {
    const t = (v ?? "").trim();
    if (!t) return;
    parts.push(`${label}${t}`);
    keywords.push(t);
  };

  if (name) parts.push(name);
  push("", asset.L0?.identity);
  if (asset.L0?.age) parts.push(`${asset.L0.age}岁`);
  push("", asset.L0?.gender);
  push("脸型:", asset.L1?.face);
  push("肤色:", asset.L1?.skin);
  push("表情习惯:", asset.L1?.expression);
  push("剪影:", asset.L1?.silhouette);
  push("发型:", asset.L2?.hair);
  push("体态:", asset.L2?.bodyType);
  push("服装:", asset.L3?.costume);
  push("配饰:", asset.L3?.accessories);
  push("姿态:", asset.L4?.posture);
  push("手势:", asset.L4?.gesture);
  if (asset.L6?.arcVisual?.trim()) parts.push(`弧光视觉:${asset.L6.arcVisual.trim()}`);

  const brief = parts.filter(Boolean).join("，").slice(0, 2000);
  const hasFaceOrHair = Boolean(asset.L1?.face || asset.L2?.hair || asset.L3?.costume);
  const weak = !brief || brief === name || !hasFaceOrHair;
  return {
    brief: brief || `角色设定 ${name}`,
    describe: (brief || name).slice(0, 500),
    weak,
    keywords,
  };
}

export function flattenPropBrief(prop: PropLockLike, code?: string): FlattenResult {
  const name = (prop.name ?? code ?? "道具").trim();
  const parts = [
    name,
    prop.significance ? `叙事意义:${prop.significance}` : "",
    prop.material ? `材质:${prop.material}` : "",
    prop.form ? `形制:${prop.form}` : "",
  ].filter(Boolean);
  const brief = parts.join("，").slice(0, 2000);
  // Significance alone is still thin for still gen — need material/form or polish
  const weak = (!prop.material && !prop.form) || brief === name || brief.length < 28;
  return {
    brief: brief || `道具 ${name}`,
    describe: brief.slice(0, 500),
    weak,
    keywords: [name, prop.significance, prop.material, prop.form].filter(Boolean) as string[],
  };
}

export function flattenSceneBrief(scene: SceneLockLike, displayName: string): FlattenResult {
  const name = (scene.name ?? displayName).trim();
  const raw = (scene.raw ?? "").trim();
  const parts = [
    name,
    raw || "",
    scene.colorTemp ? (raw.includes(scene.colorTemp) ? "" : `色温${scene.colorTemp}`) : "",
    scene.dominantHue ? `主色${scene.dominantHue}` : "",
    scene.anchorElements?.length ? `锚点:${scene.anchorElements.join("、")}` : "",
    "PURE-SCENE: empty environment plate, no people, no characters, no faces, no hands",
  ].filter(Boolean);
  const brief = parts.join("，").slice(0, 2000);
  const weak = !raw && !scene.colorTemp && !scene.dominantHue && !(scene.anchorElements?.length);
  return {
    brief,
    describe: (raw || [name, scene.colorTemp, scene.dominantHue].filter(Boolean).join("，") || name).slice(0, 500),
    weak: weak || brief.startsWith(name) && brief.length < name.length + 20,
    keywords: [name, raw, scene.colorTemp, scene.dominantHue].filter(Boolean) as string[],
  };
}

export function resolveAssetTier(opts: {
  code?: string;
  name?: string;
  leadCodes?: string[];
  leadNames?: string[];
}): AssetTier {
  const code = (opts.code ?? "").toUpperCase();
  const name = opts.name ?? "";
  if (opts.leadCodes?.some((c) => c.toUpperCase() === code)) return "lead";
  if (opts.leadNames?.some((n) => n === name)) return "lead";
  if (/女主|男主|protagonist|lead/i.test(name)) return "lead";
  return "support";
}

export function humanizationClause(tier: AssetTier, arcVisual?: string): string {
  if (tier !== "lead") {
    return "配角：保留可识别剪影与服装差异即可，避免与主角撞脸撞发型。";
  }
  const arc = arcVisual?.trim() ? `情绪弧光体现在神态：${arcVisual.trim()}。` : "";
  return [
    "主角精修：五官略非对称、有年龄感与微表情习惯，禁止网红模板脸。",
    "体态与气质一致，皮肤质感自然。",
    arc,
  ]
    .filter(Boolean)
    .join("");
}

export interface AssetPolishContextInput {
  type: "role" | "scene" | "tool";
  name: string;
  describe: string;
  artStyle?: string;
  styleHint?: string;
  storyHint?: string;
  intro?: string;
  tier?: AssetTier;
  arcVisual?: string;
  label: string;
}

/** User message for art_* polish manuals. */
export function buildAssetPolishUserMessage(ctx: AssetPolishContextInput): string {
  const lines = [
    `**基础参数：**`,
    `- 画风风格: ${ctx.artStyle || "未指定"}`,
    ctx.styleHint ? `- 视觉风格约束: ${ctx.styleHint}` : "",
    ctx.storyHint || ctx.intro
      ? `- 故事语境: ${(ctx.storyHint || ctx.intro || "").slice(0, 200)}`
      : "",
    ``,
    `**${ctx.label}设定：**`,
    `- ${ctx.label}名称:${ctx.name}`,
    `- ${ctx.label}描述:${ctx.describe}`,
  ];
  if (ctx.type === "role") {
    lines.push(`- 角色档位:${ctx.tier ?? "support"}`);
    lines.push(`- 拟人化要求:${humanizationClause(ctx.tier ?? "support", ctx.arcVisual)}`);
  }
  if (ctx.type === "tool") {
    lines.push(`- 输出须含：材质、形制、标志性细节、禁止事项（勿加人脸）。`);
  }
  if (ctx.type === "scene") {
    lines.push(`- 输出须含：空间结构、光色、锚点道具位；必须空镜无人。`);
  }
  return lines.filter((l) => l !== undefined).join("\n");
}

/** Soft checklist — returns missing field labels for one retry hint. */
export function polishOutputChecklist(
  type: "role" | "scene" | "tool",
  text: string,
): string[] {
  const t = text || "";
  const missing: string[] = [];
  if (type === "role") {
    if (!/(脸|面|眉|眼|鼻|唇)/.test(t)) missing.push("脸型/五官");
    if (!/(发|髻|冠)/.test(t)) missing.push("发型");
    if (!/(衣|裙|袍|装|褂|袖)/.test(t)) missing.push("服装");
  } else if (type === "tool") {
    if (!/(材质|玉|金|木|绢|纸|金属|竹)/.test(t)) missing.push("材质");
    if (t.length < 40) missing.push("形制细节");
  } else if (type === "scene") {
    if (!/(光|色温|月|烛|影)/.test(t)) missing.push("光色");
    if (!/no people|PURE-SCENE|无人|空镜/i.test(t)) missing.push("空镜约束");
  }
  return missing;
}

/** B6 / VLT coverage warnings (non-blocking audit). */
export function auditAssetDesignCoverage(bundle: {
  designBrief?: { B6?: { characters?: string[]; scenes?: string[]; props?: string[] } };
  visualLockTable?: {
    characterAssets?: Record<string, string>;
    sceneColorLock?: Record<string, unknown>;
    anchorProps?: Record<string, { name?: string }>;
  };
  characterDesign?: { assets?: { name?: string; code?: string }[] };
}): string[] {
  const warns: string[] = [];
  const b6 = bundle.designBrief?.B6;
  if (!b6) return warns;
  const cdNames = new Set((bundle.characterDesign?.assets ?? []).map((a) => a.name).filter(Boolean));
  for (const n of b6.characters ?? []) {
    if (n && !cdNames.has(n)) warns.push(`B6_char_missing_cd:${n}`);
  }
  const propNames = new Set(
    Object.values(bundle.visualLockTable?.anchorProps ?? {}).map((p) => p.name).filter(Boolean),
  );
  for (const n of b6.props ?? []) {
    if (n && !propNames.has(n)) warns.push(`B6_prop_missing_vlt:${n}`);
  }
  const sceneKeys = Object.keys(bundle.visualLockTable?.sceneColorLock ?? {});
  const sceneNames = new Set(
    sceneKeys.map((k) => {
      const v = bundle.visualLockTable?.sceneColorLock?.[k];
      if (v && typeof v === "object" && (v as { name?: string }).name) return (v as { name: string }).name;
      if (/[\u4e00-\u9fff]/.test(k)) return k;
      return "";
    }),
  );
  for (const n of b6.scenes ?? []) {
    if (n && !sceneNames.has(n) && !sceneKeys.includes(n)) warns.push(`B6_scene_missing_vlt:${n}`);
  }
  return warns;
}
