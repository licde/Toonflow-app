/**
 * Still ImageEdit SSOT — Agnes i2i-Edit / Atlas native edit / focus regen.
 * Agnes has no separate Edit REST; AgnesI2iEditAdapter = generations + failed still as condition.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type StillEditStrategy = "agnes_i2i" | "atlas_native" | "focus_regen" | "layout_preserve";

export interface StillImageEditRef {
  type: "image";
  base64: string;
  role?: "cref" | "failed_still" | "neighbor" | "other" | "layout";
}

export interface StillImageEditInput {
  failedImageBase64: string;
  fixHints: string[];
  literaryPrompt: string;
  crefOrderedRefs: StillImageEditRef[];
  model: string;
  vendorHint?: string | null;
  /** Override strategy */
  strategy?: StillEditStrategy;
  /** When true, strip SCENE-like refs and keep failed_still as layout anchor */
  layoutPreserve?: boolean;
  /**
   * Cast names in the SAME order as crefOrderedRefs (identity bind high→low).
   * Never pass unsorted storyboard character list.
   */
  castNames?: string[];
  highName?: string | null;
  lowName?: string | null;
  /** When true, refuse layout_preserve (cast overcrowd on failed still) */
  forbidLayoutPreserve?: boolean;
  /** Design framing — 智能适配同核 */
  shotSize?: string | null;
  visualDescription?: string | null;
  /** Only seating-hard may remap to 站位绑定 / 座次【布局锁】 */
  seatingHard?: boolean;
}

export type StillEditStructuralBlock = {
  block: boolean;
  trigger: string;
  nextStep: "split_shot" | "";
  message: string;
};

export interface StillImageEditResult {
  imageBase64: string;
  strategy: StillEditStrategy;
  modelUsed: string;
  promptUsed: string;
  referenceList: StillImageEditRef[];
}

export interface StillImageEditPort {
  edit(input: StillImageEditInput): Promise<StillImageEditResult>;
}

export interface StillImageEditConfig {
  version?: string;
  enabled?: boolean;
  defaultStrategy?: StillEditStrategy;
  parallelM?: { hq?: number; draft?: number; max?: number };
  refMerge?: {
    crefFirst?: boolean;
    failedStillLast?: boolean;
    maxCrefRefs?: number;
    includeFailedStill?: boolean;
  };
  maxFixHints?: number;
  disableStrengthenStackOnEdit?: boolean;
  vendorRoutes?: Record<string, StillEditStrategy>;
  atlasEditModelMap?: Record<string, string>;
}

const FALLBACK: StillImageEditConfig = {
  version: "1.0.0",
  enabled: true,
  defaultStrategy: "agnes_i2i",
  parallelM: { hq: 2, draft: 1, max: 3 },
  refMerge: {
    crefFirst: true,
    failedStillLast: true,
    maxCrefRefs: 4,
    includeFailedStill: true,
  },
  maxFixHints: 6,
  disableStrengthenStackOnEdit: true,
  vendorRoutes: {
    agnes: "agnes_i2i",
    agnesai: "agnes_i2i",
    atlas: "atlas_native",
    atlascloud: "atlas_native",
  },
  atlasEditModelMap: {
    "google/nano-banana-pro/text-to-image": "google/nano-banana-pro/edit",
    "google/nano-banana-2/text-to-image": "google/nano-banana-2/edit",
  },
};

export function loadStillImageEditConfig(): StillImageEditConfig {
  return { ...FALLBACK, ...readFixtureJson<StillImageEditConfig>("still_image_edit.json", FALLBACK) };
}

export function resolveEditStrategy(input: {
  vendorHint?: string | null;
  model?: string | null;
  explicit?: StillEditStrategy | null;
  config?: StillImageEditConfig;
}): StillEditStrategy {
  const cfg = input.config ?? loadStillImageEditConfig();
  if (input.explicit) return input.explicit;
  const vendor = String(input.vendorHint ?? "").toLowerCase().split(":")[0];
  if (vendor && cfg.vendorRoutes?.[vendor]) return cfg.vendorRoutes[vendor];
  const model = String(input.model ?? "").toLowerCase();
  if (/nano-banana|atlas/.test(model)) return "atlas_native";
  if (/agnes/.test(model) || /agnes/.test(vendor)) return "agnes_i2i";
  return cfg.defaultStrategy ?? "agnes_i2i";
}

export function resolveParallelM(input: {
  qualityMode?: string | null;
  config?: StillImageEditConfig;
}): number {
  const cfg = input.config ?? loadStillImageEditConfig();
  const max = Math.max(1, cfg.parallelM?.max ?? 3);
  const draft = Math.max(1, cfg.parallelM?.draft ?? 1);
  const hq = Math.max(1, cfg.parallelM?.hq ?? 2);
  const n = input.qualityMode === "draft" ? draft : hq;
  return Math.min(max, n);
}

export function mergeEditReferenceList(input: {
  crefOrderedRefs: StillImageEditRef[];
  failedImageBase64?: string | null;
  neighborRefs?: StillImageEditRef[];
  config?: StillImageEditConfig;
  /** layout_preserve: failed_still first as layout anchor, fewer crefs, no scene-tagged refs */
  layoutPreserve?: boolean;
}): StillImageEditRef[] {
  const cfg = input.config ?? loadStillImageEditConfig();
  const merge = cfg.refMerge ?? FALLBACK.refMerge!;
  const maxCref = input.layoutPreserve ? Math.min(2, Math.max(1, merge.maxCrefRefs ?? 4)) : Math.max(1, merge.maxCrefRefs ?? 4);
  const cref = (input.crefOrderedRefs ?? [])
    .filter((r) => r?.base64)
    .filter((r) => !(input.layoutPreserve && (r.role === "other" || r.role === "layout")))
    .slice(0, maxCref)
    .map((r) => ({ ...r, type: "image" as const, role: r.role ?? ("cref" as const) }));
  const out: StillImageEditRef[] = [];
  if (input.layoutPreserve && input.failedImageBase64?.trim()) {
    out.push({
      type: "image",
      base64: input.failedImageBase64,
      role: "failed_still",
    });
    out.push(...cref);
    return out;
  }
  if (merge.crefFirst !== false) out.push(...cref);
  for (const n of input.neighborRefs ?? []) {
    if (n?.base64) out.push({ ...n, type: "image", role: n.role ?? "neighbor" });
  }
  if (!merge.crefFirst) out.push(...cref);
  if (merge.includeFailedStill !== false && input.failedImageBase64?.trim()) {
    const failed: StillImageEditRef = {
      type: "image",
      base64: input.failedImageBase64,
      role: "failed_still",
    };
    if (merge.failedStillLast !== false) out.push(failed);
    else out.unshift(failed);
  }
  return out;
}

const FACING_ONLY_LOCUS = /^(?:侧脸|正面|正脸|背影|侧身|半侧)$/;

/** SSOT Edit focus line — callers must not prepend another 【Edit焦点】. */
export function buildEditFocusPrompt(input: {
  literaryPrompt: string;
  fixHints: string[];
  config?: StillImageEditConfig;
  layoutPreserve?: boolean;
  visualDescription?: string | null;
  castNames?: string[] | null;
}): string {
  const cfg = input.config ?? loadStillImageEditConfig();
  const max = Math.max(1, cfg.maxFixHints ?? 6);
  let lit = String(input.literaryPrompt ?? "").trim();
  lit = lit.replace(/\n?【Edit焦点】[^\n]*/g, "").trim();
  try {
    const { preserveLiteraryCoreForEdit } =
      require("../compilers/stillFirstFrameLiterarySsot") as typeof import("../compilers/stillFirstFrameLiterarySsot");
    lit = preserveLiteraryCoreForEdit({
      literaryPrompt: lit,
      visualDescription: input.visualDescription,
    });
  } catch {
    /* optional */
  }
  const hardMatch = lit.match(/场面硬约束[：:][^。\n]{0,500}/);
  const hard = hardMatch?.[0] ?? "";
  if (lit.length > 1800) {
    const vdCore = lit.split(/场面硬约束/)[0]?.trim() ?? lit.slice(0, 800);
    lit = [vdCore, hard].filter(Boolean).join("。").replace(/。。+/g, "。").trim();
    if (lit.length > 2000) lit = lit.slice(0, 2000);
  }

  const {
    STILL_SINGLE_FRAME_LOCK_EDIT_ZH,
    STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH,
    STILL_CONTACT_GEOM_HEAL_TEMPLATE,
    pickVdLiteraryPrimary,
    STILL_PRIMARY_LOOK_HEAL_TEMPLATE,
  } = (() => {
    try {
      return require("../compilers/stillFirstFrameLiterarySsot") as typeof import("../compilers/stillFirstFrameLiterarySsot");
    } catch {
      return {
        STILL_SINGLE_FRAME_LOCK_EDIT_ZH: "单镜头成片，禁四视图/拼版。",
        STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH: "四视图仅借身份，禁复刻多格拼版。",
        STILL_CONTACT_GEOM_HEAL_TEMPLATE: "接触几何：须与{LOCUS}贴合/划过，禁止悬空",
        pickVdLiteraryPrimary: () => "",
        STILL_PRIMARY_LOOK_HEAL_TEMPLATE: "本镜主look以「{NAME}」定妆为准",
      };
    }
  })();

  /** Collapse long collage/identity soup → Edit-slim one-liners */
  const slimHint = (h: string): string | null => {
    const t = String(h ?? "").trim();
    if (!t) return null;
    if (/角色参考若为四视图|严禁复刻多格|character sheet|定妆拼版|分栏头像墙|仅借脸型/.test(t)) {
      return STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH;
    }
    if (/单镜头成片|禁止四视图|turnaround sheet|禁四视图\/拼版|多宫格|拼图多格/.test(t) && (t.length > 20 || /画幅|拼版|turnaround/.test(t))) {
      return STILL_SINGLE_FRAME_LOCK_EDIT_ZH;
    }
    if (/背景弱化|灰棚|纯色摄影棚|background_readable/.test(t) && t.length > 36) {
      return "禁灰棚：浅景深保留室内可辨（木作/烛光）";
    }
    return t;
  };

  const seen = new Set<string>();
  const rawHints: string[] = [];
  for (const h0 of input.fixHints ?? []) {
    const h = slimHint(
      String(h0 ?? "")
        .trim()
        .replace(/抄书书/g, "抄书")
        .replace(/必须必须/g, "必须"),
    );
    if (!h) continue;
    if (/^场面硬约束/.test(h) && /场面硬约束/.test(lit)) continue;
    if (hard && h.includes(hard.slice(0, 16))) continue;
    if (/出镜人数|仅\d+人|禁止第\d+人/.test(h) && /出镜人数|仅\d+人/.test(lit)) continue;
    const key = h.replace(/\s+/g, "").slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    if (h.length >= 8 && lit.includes(h.slice(0, Math.min(24, h.length)))) continue;
    rawHints.push(h);
  }

  // Prefer pure VD for literary priority (full compose soup confuses locus extract)
  const vdRaw = String(input.visualDescription ?? "").trim();
  const vd = vdRaw || lit.split(/场面硬约束|背景弱化|【Edit焦点】|出镜人数/)[0] || lit;
  const priority: string[] = [];
  // 1) Contact geometry first — same loci SSOT as checklist/VLM
  try {
    const { extractDeclaredContactLoci } =
      require("../compilers/stillLiteraryDetailQuality") as typeof import("../compilers/stillLiteraryDetailQuality");
    for (const locus of extractDeclaredContactLoci(vd).slice(0, 2)) {
      if (!locus || FACING_ONLY_LOCUS.test(locus)) continue;
      if (rawHints.some((h) => h.includes(locus) && /贴合|划过|接触几何/.test(h))) continue;
      priority.push(STILL_CONTACT_GEOM_HEAL_TEMPLATE.replace(/\{LOCUS\}/g, locus));
    }
  } catch {
    const touch = vd.match(/(?:划过|贴[在着]?|压[在着]?|抵[在着]?)([\u4e00-\u9fff]{1,3})/);
    if (touch?.[1] && !FACING_ONLY_LOCUS.test(touch[1]!)) {
      const geom = STILL_CONTACT_GEOM_HEAL_TEMPLATE.replace(/\{LOCUS\}/g, touch[1]!);
      if (!rawHints.some((h) => h.includes(touch[1]!) && /贴合|划过|接触几何/.test(h))) {
        priority.push(geom);
      }
    }
  }
  // 2) Primary look (VD literary name)
  const primary = pickVdLiteraryPrimary(vd, input.castNames ?? null);
  if (primary.length >= 2 && !rawHints.some((h) => /主look/.test(h)) && !/主look/.test(lit)) {
    priority.push(STILL_PRIMARY_LOOK_HEAL_TEMPLATE.replace(/\{NAME\}/g, primary));
  }
  // 3) Grey-void when demote guidance already in prompt (VLM-less still needs Edit knife)
  if (
    /背景弱化|禁止灰棚|灰棚\/纯色/.test(lit) &&
    !rawHints.some((h) => /禁灰棚|灰棚|室内可辨/.test(h)) &&
    !priority.some((h) => /禁灰棚|灰棚/.test(h))
  ) {
    priority.push("禁灰棚：浅景深保留室内可辨（木作/烛光）");
  }

  const needSingle =
    !/单镜头成片|禁止四视图|禁止.*拼图|禁四视图/.test(lit) &&
    !rawHints.some((h) => /单镜头|四视图|拼图|拼版/.test(h));
  const collageOne =
    needSingle
      ? STILL_SINGLE_FRAME_LOCK_EDIT_ZH
      : (() => {
          const hit = rawHints.find((h) => /单镜头|四视图|拼版|仅借身份|禁复刻多格/.test(h));
          return hit ? slimHint(hit) : null;
        })();
  // Collage lock stays one slot after literary priority — never drowned by filler hints
  const otherLit = rawHints.filter((h) => !/单镜头|四视图|拼版|仅借身份|禁复刻多格|character sheet|分栏头像/.test(h));
  const orderedSrc = [
    ...priority,
    ...(collageOne ? [collageOne] : []),
    ...otherLit,
  ];

  const dedup: string[] = [];
  const seen2 = new Set<string>();
  for (const h of orderedSrc) {
    const t = String(h ?? "").trim();
    if (!t) continue;
    const k = t.replace(/\s+/g, "").slice(0, 40);
    if (seen2.has(k)) continue;
    seen2.add(k);
    dedup.push(t);
  }
  const ordered = dedup.slice(0, max);

  const focus = input.layoutPreserve
    ? ordered.length
      ? `【Edit焦点】保构图，仅修正：${ordered.join("；")}。禁止改座次/站位；勿重写未点名情节。`
      : "【Edit焦点】保构图与座次，仅补身份/道具，禁止改布局。"
    : ordered.length
      ? `【Edit焦点】仅修正：${ordered.join("；")}。保持已正确部分与定妆身份，勿重写未点名的文学情节。`
      : "【Edit焦点】按清单补全缺失文学保真项，保持定妆身份与已正确构图。";
  return `${lit}\n${focus}`.trim();
}

export function mapAtlasEditModel(model: string, config?: StillImageEditConfig): string {
  const cfg = config ?? loadStillImageEditConfig();
  const map = cfg.atlasEditModelMap ?? FALLBACK.atlasEditModelMap!;
  return map[model] ?? model.replace(/\/text-to-image$/, "/edit");
}

/** Pure adapter helpers — callers supply imageRunner that hits vendor. */
export function prepareStillImageEdit(input: StillImageEditInput): {
  strategy: StillEditStrategy;
  modelUsed: string;
  promptUsed: string;
  referenceList: StillImageEditRef[];
  structuralBlock?: StillEditStructuralBlock;
} {
  const cfg = loadStillImageEditConfig();
  let layoutPreserve = Boolean(input.layoutPreserve) || input.strategy === "layout_preserve";
  if (input.forbidLayoutPreserve && layoutPreserve) {
    layoutPreserve = false;
  }

  // 智能适配：CU×多人 / 人数契约泄漏 → 禁文学 Edit 洗绿，反推 split_shot
  let structuralBlock: StillEditStructuralBlock | undefined;
  try {
    const { diagnoseStructuralStillEditBlock } =
      require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
    const d = diagnoseStructuralStillEditBlock({
      literaryPrompt: input.literaryPrompt,
      shotSize: input.shotSize,
      castNames: input.castNames,
    });
    if (d.block) {
      structuralBlock = {
        block: true,
        trigger: d.trigger || "still_cu_cast",
        nextStep: "split_shot",
        message: d.message,
      };
    }
  } catch {
    /* optional */
  }

  const strategy: StillEditStrategy = structuralBlock
    ? "focus_regen"
    : layoutPreserve
      ? "layout_preserve"
      : input.forbidLayoutPreserve && input.strategy === "layout_preserve"
        ? "focus_regen"
        : resolveEditStrategy({
            vendorHint: input.vendorHint,
            model: input.model,
            explicit: input.strategy === "layout_preserve" && input.forbidLayoutPreserve ? "focus_regen" : input.strategy,
            config: cfg,
          });

  let literaryBase = String(input.literaryPrompt ?? "").trim();
  let castNames = (input.castNames ?? []).filter(Boolean);
  let crefRefs = [...(input.crefOrderedRefs ?? [])];
  let highName = input.highName ?? null;
  let lowName = input.lowName ?? null;

  // 引用资产按设计意图裁切（反应特写只绑主角 cref）
  try {
    const { adaptCrefsToFaceCuIntent, stripCastCardinalityLeakForFaceCu } =
      require("../compilers/stillRefSlotContract") as typeof import("../compilers/stillRefSlotContract");
    const crefsOnly = crefRefs.filter((r) => r.role === "cref" || !r.role);
    const adapted = adaptCrefsToFaceCuIntent({
      crefs: crefsOnly.map((r) => ({ base64: r.base64, name: (r as { name?: string }).name })),
      castNames,
      shotSize: input.shotSize,
      visualDescription: input.visualDescription || literaryBase,
      literaryPrompt: literaryBase,
    });
    if (adapted.adapted) {
      const keep = new Set(adapted.crefs.map((c) => c.base64));
      crefRefs = crefRefs.filter((r) => (r.role && r.role !== "cref" ? true : keep.has(r.base64)));
      // re-attach adapted cref order
      const adaptedCrefs = adapted.crefs.map((c) => ({
        type: "image" as const,
        base64: c.base64,
        role: "cref" as const,
      }));
      const nonCref = crefRefs.filter((r) => r.role && r.role !== "cref");
      crefRefs = [...nonCref, ...adaptedCrefs];
      castNames = adapted.castNames;
      highName = adapted.primaryName || highName;
      lowName = null;
      literaryBase = stripCastCardinalityLeakForFaceCu(literaryBase);
    }
  } catch {
    /* optional */
  }

  let promptUsed: string;
  if (structuralBlock) {
    // 不写【Edit焦点】文学清单；点名结构冲突 → 智能拆
    const cleaned = literaryBase.replace(/\n?【Edit焦点】[^\n]*/g, "").trim();
    promptUsed = `${cleaned}\n【结构冲突·须智能拆】${structuralBlock.message}`.trim();
  } else {
    promptUsed = buildEditFocusPrompt({
      literaryPrompt: literaryBase,
      fixHints: input.fixHints,
      config: cfg,
      layoutPreserve: strategy === "layout_preserve",
      visualDescription: input.visualDescription,
      castNames,
    });
  }
  let modelUsed = input.model;
  let referenceList: StillImageEditRef[];

  if (strategy === "focus_regen") {
    referenceList = mergeEditReferenceList({
      crefOrderedRefs: crefRefs,
      failedImageBase64: null,
      config: cfg,
    });
  } else if (strategy === "atlas_native") {
    modelUsed = mapAtlasEditModel(input.model, cfg);
    referenceList = mergeEditReferenceList({
      crefOrderedRefs: crefRefs,
      failedImageBase64: input.failedImageBase64,
      config: cfg,
      layoutPreserve: strategy === "layout_preserve",
    });
  } else {
    // agnes_i2i or layout_preserve — cref + failed still (layout_preserve puts failed first)
    referenceList = mergeEditReferenceList({
      crefOrderedRefs: crefRefs,
      failedImageBase64: input.failedImageBase64,
      config: cfg,
      layoutPreserve: strategy === "layout_preserve",
    });
  }

  // Remap ONLY when layout/failed is the composition anchor (ordinal 0).
  // Default Agnes (failed last) must NOT renumber 图1 away from first cref.
  const layoutAnchor = referenceList.find((r) => r.role === "layout");
  const failedFirst =
    strategy === "layout_preserve" && referenceList[0]?.role === "failed_still"
      ? referenceList[0]
      : undefined;
  if (layoutAnchor || failedFirst) {
    try {
      const {
        buildPhysicalSlots,
        remapPromptToPhysicalRefs,
        alignCrefMetaToBindOrder,
      } = require("../compilers/stillRefSlotContract") as typeof import("../compilers/stillRefSlotContract");
      const bindOrderedNames = castNames.filter(Boolean);
      const crefsRaw = referenceList.filter((r) => r.role === "cref");
      const crefsAligned = alignCrefMetaToBindOrder({
        crefs: crefsRaw.map((r) => ({ base64: r.base64 })),
        orderedNames: bindOrderedNames,
        highName,
        lowName,
      });
      // Drop unnamed extras from both prompt map and physical refs (prevents 图4=角色4)
      const keepCrefs = new Set(crefsAligned.map((c) => c.base64));
      referenceList = referenceList.filter(
        (r) => r.role !== "cref" || keepCrefs.has(r.base64),
      );
      const slots = buildPhysicalSlots({
        layoutBase64: layoutAnchor?.base64,
        failedStillBase64: failedFirst?.base64,
        preferLayout: Boolean(layoutAnchor?.base64),
        crefOrdered: crefsAligned,
      });
      promptUsed = remapPromptToPhysicalRefs(promptUsed, slots, {
        highName: highName ?? bindOrderedNames[0],
        lowName: lowName ?? bindOrderedNames[1],
        castNames: bindOrderedNames,
        seatingHard: input.seatingHard === true,
      });
    } catch {
      /* remap optional */
    }
  }

  return { strategy, modelUsed, promptUsed, referenceList, structuralBlock };
}

/**
 * Default port: prepares payload then invokes runner.
 * Tests can inject a stub runner; production wires Ai.Image.
 */
export function createStillImageEditPort(runner: (payload: {
  prompt: string;
  referenceList: StillImageEditRef[];
  model: string;
  strategy: StillEditStrategy;
}) => Promise<string>): StillImageEditPort {
  return {
    async edit(input) {
      const prep = prepareStillImageEdit(input);
      const imageBase64 = await runner({
        prompt: prep.promptUsed,
        referenceList: prep.referenceList,
        model: prep.modelUsed,
        strategy: prep.strategy,
      });
      return {
        imageBase64,
        strategy: prep.strategy,
        modelUsed: prep.modelUsed,
        promptUsed: prep.promptUsed,
        referenceList: prep.referenceList,
      };
    },
  };
}

/** Agnes adapter = prepare with agnes_i2i strategy */
export function AgnesI2iEditAdapter(): Pick<StillImageEditPort, "edit"> & {
  strategy: "agnes_i2i";
  prepare: typeof prepareStillImageEdit;
} {
  return {
    strategy: "agnes_i2i",
    prepare: (input) => prepareStillImageEdit({ ...input, strategy: "agnes_i2i" }),
    async edit(input) {
      throw new Error("AgnesI2iEditAdapter.edit requires createStillImageEditPort(runner)");
    },
  };
}

export function AtlasNativeEditAdapter(): { strategy: "atlas_native"; prepare: typeof prepareStillImageEdit } {
  return {
    strategy: "atlas_native",
    prepare: (input) => prepareStillImageEdit({ ...input, strategy: "atlas_native" }),
  };
}

export function FocusRegenAdapter(): { strategy: "focus_regen"; prepare: typeof prepareStillImageEdit } {
  return {
    strategy: "focus_regen",
    prepare: (input) => prepareStillImageEdit({ ...input, strategy: "focus_regen" }),
  };
}
