/**
 * Still layout control — template bottoms for two-stage composition lock.
 * poseProvider=template today; controlnet slot reserved.
 */
import fs from "fs";
import path from "path";
import { fixturePath, readFixtureJson } from "../utils/fixturesPath";
import type { DescPredicatePack } from "../compilers/extractDescPredicates";

export interface StillLayoutTemplateMatch {
  requireVerbs?: string[];
  forbidVerbs?: string[];
  minChars?: number;
}

export interface StillLayoutTemplateDef {
  id: string;
  file: string;
  match: StillLayoutTemplateMatch;
  stageAPrompt: string;
}

export interface StillLayoutControlConfig {
  version?: string;
  enabled?: boolean;
  twoStageEnabled?: boolean;
  skipTwoStageOnDraft?: boolean;
  countStageATowardBudget?: boolean;
  poseProvider?: "template" | "controlnet";
  templates?: StillLayoutTemplateDef[];
}

const FALLBACK: StillLayoutControlConfig = {
  version: "1.0.0",
  enabled: true,
  twoStageEnabled: true,
  skipTwoStageOnDraft: true,
  countStageATowardBudget: true,
  poseProvider: "template",
  templates: [],
};

export function loadStillLayoutControlConfig(): StillLayoutControlConfig {
  return {
    ...FALLBACK,
    ...readFixtureJson<StillLayoutControlConfig>("still_layout_control.json", FALLBACK),
  };
}

export function shouldRunTwoStageLayout(input: {
  qualityMode?: string | null;
  seatingHard?: boolean;
  config?: StillLayoutControlConfig;
}): boolean {
  const cfg = input.config ?? loadStillLayoutControlConfig();
  if (!cfg.enabled || cfg.twoStageEnabled === false) return false;
  if (input.qualityMode === "draft" && cfg.skipTwoStageOnDraft !== false) return false;
  return Boolean(input.seatingHard);
}

export function selectLayoutTemplate(input: {
  pack: DescPredicatePack;
  characterCount?: number;
  config?: StillLayoutControlConfig;
  preferId?: string | null;
  excludeId?: string | null;
}): StillLayoutTemplateDef | null {
  const cfg = input.config ?? loadStillLayoutControlConfig();
  const verbs = new Set(input.pack.predicates.map((p) => p.verb));
  const charCount =
    input.characterCount ??
    Math.max(1, new Set(input.pack.predicates.map((p) => p.who).filter(Boolean)).size);
  const templates = (cfg.templates ?? []).filter((t) => t.id !== input.excludeId);

  if (input.preferId) {
    const pref = templates.find((t) => t.id === input.preferId);
    if (pref) return pref;
  }

  for (const t of templates) {
    const m = t.match ?? {};
    if ((m.minChars ?? 0) > charCount) continue;
    if (m.requireVerbs?.length && !m.requireVerbs.every((v) => verbs.has(v))) continue;
    if (m.forbidVerbs?.some((v) => verbs.has(v))) continue;
    return t;
  }
  if (input.pack.hasSeatingOrKneel) {
    if (charCount >= 2) {
      return templates.find((t) => t.id === "high_sit_low_kneel_2p") ?? templates[0] ?? null;
    }
    if (verbs.has("跪")) return templates.find((t) => t.id === "single_kneel") ?? null;
    return templates.find((t) => t.id === "single_throne_sit") ?? templates[0] ?? null;
  }
  return null;
}

function stripToRawBase64(dataUrlOrB64: string): string {
  const m = String(dataUrlOrB64).match(/^data:[^;]+;base64,(.+)$/s);
  return m ? m[1] : String(dataUrlOrB64).replace(/^data:[^;]+;base64,/i, "");
}

/** Load template image as raw base64 PNG (SVG converted via sharp). Missing → null. */
export async function loadLayoutTemplateBase64(template: StillLayoutTemplateDef): Promise<string | null> {
  const p = fixturePath(template.file);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(p).toLowerCase();
  try {
    if (ext === ".svg" || ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
      const sharp = (await import("sharp")).default;
      const png = await sharp(p).resize(576, 1024, { fit: "fill" }).png().toBuffer();
      return png.toString("base64");
    }
    return fs.readFileSync(p).toString("base64");
  } catch {
    if (ext === ".svg") return null;
    return fs.readFileSync(p).toString("base64");
  }
}

export async function resolveLayoutForShot(input: {
  pack: DescPredicatePack;
  characterCount?: number;
  qualityMode?: string | null;
  config?: StillLayoutControlConfig;
  preferId?: string | null;
  excludeId?: string | null;
}): Promise<{
  twoStage: boolean;
  template: StillLayoutTemplateDef | null;
  layoutBase64: string | null;
  layoutSkipped?: "disabled" | "no_template" | "no_file" | "not_seating";
}> {
  const cfg = input.config ?? loadStillLayoutControlConfig();
  if (
    !shouldRunTwoStageLayout({
      qualityMode: input.qualityMode,
      seatingHard: input.pack.hasSeatingOrKneel,
      config: cfg,
    })
  ) {
    return {
      twoStage: false,
      template: null,
      layoutBase64: null,
      layoutSkipped: input.pack.hasSeatingOrKneel ? "disabled" : "not_seating",
    };
  }
  const template = selectLayoutTemplate({
    pack: input.pack,
    characterCount: input.characterCount,
    config: cfg,
    preferId: input.preferId,
    excludeId: input.excludeId,
  });
  if (!template) {
    return { twoStage: false, template: null, layoutBase64: null, layoutSkipped: "no_template" };
  }
  const layoutBase64 = await loadLayoutTemplateBase64(template);
  if (!layoutBase64) {
    return { twoStage: false, template, layoutBase64: null, layoutSkipped: "no_file" };
  }
  return { twoStage: true, template, layoutBase64: stripToRawBase64(layoutBase64) };
}
