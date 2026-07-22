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
}

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

/** SSOT Edit focus line — callers must not prepend another 【Edit焦点】. */
export function buildEditFocusPrompt(input: {
  literaryPrompt: string;
  fixHints: string[];
  config?: StillImageEditConfig;
  layoutPreserve?: boolean;
}): string {
  const cfg = input.config ?? loadStillImageEditConfig();
  const max = Math.max(1, cfg.maxFixHints ?? 6);
  let lit = String(input.literaryPrompt ?? "").trim().slice(0, 1200);
  // Strip duplicate focus lines if literary already included one (SSOT)
  lit = lit.replace(/\n?【Edit焦点】[^\n]*/g, "").trim();
  const hints = (input.fixHints ?? [])
    .map((h) => String(h ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
  const focus = input.layoutPreserve
    ? hints.length
      ? `【Edit焦点】保构图，仅修正：${hints.join("；")}。禁止改座次/站位；勿重写未点名情节。`
      : "【Edit焦点】保构图与座次，仅补身份/道具，禁止改布局。"
    : hints.length
      ? `【Edit焦点】仅修正：${hints.join("；")}。保持已正确部分与定妆身份，勿重写未点名的文学情节。`
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
} {
  const cfg = loadStillImageEditConfig();
  const layoutPreserve = Boolean(input.layoutPreserve) || input.strategy === "layout_preserve";
  const strategy = layoutPreserve
    ? "layout_preserve"
    : resolveEditStrategy({
        vendorHint: input.vendorHint,
        model: input.model,
        explicit: input.strategy,
        config: cfg,
      });
  const promptUsed = buildEditFocusPrompt({
    literaryPrompt: input.literaryPrompt,
    fixHints: input.fixHints,
    config: cfg,
    layoutPreserve,
  });
  let modelUsed = input.model;
  let referenceList: StillImageEditRef[];

  if (strategy === "focus_regen") {
    referenceList = mergeEditReferenceList({
      crefOrderedRefs: input.crefOrderedRefs,
      failedImageBase64: null,
      config: cfg,
    });
  } else if (strategy === "atlas_native") {
    modelUsed = mapAtlasEditModel(input.model, cfg);
    referenceList = mergeEditReferenceList({
      crefOrderedRefs: input.crefOrderedRefs,
      failedImageBase64: input.failedImageBase64,
      config: cfg,
      layoutPreserve,
    });
  } else {
    // agnes_i2i or layout_preserve — cref + failed still (layout_preserve puts failed first)
    referenceList = mergeEditReferenceList({
      crefOrderedRefs: input.crefOrderedRefs,
      failedImageBase64: input.failedImageBase64,
      config: cfg,
      layoutPreserve,
    });
  }

  return { strategy, modelUsed, promptUsed, referenceList };
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
