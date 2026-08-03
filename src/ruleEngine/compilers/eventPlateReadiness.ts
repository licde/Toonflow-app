/**
 * eventPlateReadiness — generic pre-vendor gate for event/prop/soft-env plates.
 * Driven by objectiveClass + propClassId (vocab), never shot-specific names.
 *
 * Policies:
 * - contact_geom | prop_readable ⇒ require prop soft plate (asset or synthesized)
 * - sceneWeight soft/keep ⇒ prefer soft SCENE plate when linked
 * - identity on event objectives ⇒ face-bias crop to demote handheld soup
 */
import sharp from "sharp";
import type { GenerationContract } from "../design/deriveGenerationContract";
import { matchContactEventVd, propClassAliases } from "./contactEventPolicy";
import { getPropFormDoctrine, resolveGlyphTextFromVd } from "./propFormDoctrine";

export type EventPlateObjective =
  | "contact_geom"
  | "prop_readable"
  | "identity_first"
  | "scene_keep"
  | "empty_scene"
  | string;

export function objectiveNeedsPropPlate(objectiveClass?: string | null): boolean {
  const o = String(objectiveClass ?? "");
  return o === "contact_geom" || o === "prop_readable" || o === "action_primary";
}

export function objectiveNeedsSoftEnvPlate(input: {
  sceneWeight?: string | null;
  keepSoftEnvRef?: boolean | null;
}): boolean {
  return Boolean(input.keepSoftEnvRef) || input.sceneWeight === "soft" || input.sceneWeight === "keep";
}

/** softEnv continuity must when SCENE linked + keepSoftEnvRef (from bg policy). */
export function resolveSoftEnvContinuity(input: {
  keepSoftEnvRef?: boolean | null;
  hasSceneLink?: boolean | null;
  softEnvContinuity?: "must" | "optional" | "none" | null;
}): "must" | "optional" | "none" {
  if (input.softEnvContinuity === "must" || input.softEnvContinuity === "optional" || input.softEnvContinuity === "none") {
    return input.softEnvContinuity;
  }
  if (input.keepSoftEnvRef && input.hasSceneLink) return "must";
  if (input.keepSoftEnvRef) return "optional";
  return "none";
}

export type EventPlateGateDecision = {
  allowVendor: boolean;
  propRequired: boolean;
  propPlateMissing: boolean;
  softEnvRequired: boolean;
  softEnvMissing: boolean;
  softEnvContinuity?: "must" | "optional" | "none";
  softEnvBakedIntoIdentity?: boolean;
  code?: string;
  userMessage?: string;
  ctaLabel?: string;
  primaryNextStep?: "batch_still" | "chat_repair" | "retry_shot";
  missingSlots: string[];
  /** Structure fill applied (synth plate) — still allow vendor */
  synthesizedProp?: boolean;
  synthesizedSoftHint?: boolean;
  debtKind?: string;
  deliveryTier?: "draft" | "preview" | "burn" | string;
};

export function decideEventPlateGate(input: {
  contract?: GenerationContract | null;
  keepSoftEnvRef?: boolean | null;
  hasSceneLink?: boolean | null;
  softEnvContinuity?: "must" | "optional" | "none" | null;
  propPlatePresent?: boolean | null;
  softEnvPlatePresent?: boolean | null;
  softEnvBakedIntoIdentity?: boolean | null;
  /** When true, missing prop may be filled by synthesizePropSoftPlate before decide */
  allowSynthesizeProp?: boolean;
  synthesizedPropApplied?: boolean;
  /** Synth was attempted (ok or fail) — missing prop becomes soft debt, not 400 */
  synthAttempted?: boolean;
}): EventPlateGateDecision {
  const obj = input.contract?.objectiveClass;
  const propRequired = objectiveNeedsPropPlate(obj);
  const softEnvContinuity = resolveSoftEnvContinuity({
    keepSoftEnvRef: input.keepSoftEnvRef,
    hasSceneLink: input.hasSceneLink,
    softEnvContinuity: input.softEnvContinuity,
  });
  const softEnvRequired = softEnvContinuity === "must" || softEnvContinuity === "optional";
  const baked = Boolean(input.softEnvBakedIntoIdentity);
  const propPlateMissing = propRequired && !input.propPlatePresent && !input.synthesizedPropApplied;
  const softEnvMissing =
    softEnvRequired && !input.softEnvPlatePresent && !baked;
  const missingSlots: string[] = [];
  if (propPlateMissing) missingSlots.push("propSoftPlate");
  if (softEnvMissing) missingSlots.push("softEnvPlate");

  if (propPlateMissing && !input.allowSynthesizeProp) {
    return {
      allowVendor: false,
      propRequired,
      propPlateMissing: true,
      softEnvRequired,
      softEnvMissing,
      softEnvContinuity,
      softEnvBakedIntoIdentity: baked,
      code: "DEX-PROP-PLATE-MISSING",
      userMessage:
        "本镜为接触/道具事件，但缺少道具参考板（PROP soft plate）。仅有定妆+场景时模型会发明持物，禁止开生成。请挂道具资产板或允许结构合成软板。",
      ctaLabel: "挂道具板后再生成",
      primaryNextStep: "batch_still",
      missingSlots,
    };
  }

  // Caller forgot to synth before decide → hard (programming contract).
  if (propPlateMissing && input.allowSynthesizeProp && !input.synthesizedPropApplied && !input.synthAttempted) {
    return {
      allowVendor: false,
      propRequired,
      propPlateMissing: true,
      softEnvRequired,
      softEnvMissing,
      softEnvContinuity,
      softEnvBakedIntoIdentity: baked,
      code: "DEX-PROP-PLATE-MISSING",
      userMessage: "接触/道具事件缺道具板；请先合成结构软板或挂真实 PROP 资产。",
      ctaLabel: "合成道具软板",
      primaryNextStep: "retry_shot",
      missingSlots,
    };
  }

  // Synth attempted but still missing → honest soft allow (never 400 brick Generate).
  if (propPlateMissing && input.synthAttempted) {
    return {
      allowVendor: true,
      propRequired,
      propPlateMissing: true,
      softEnvRequired,
      softEnvMissing,
      softEnvContinuity,
      softEnvBakedIntoIdentity: baked,
      code: "DEX-PROP-PLATE-MISSING",
      userMessage:
        "接触/持握/动作镜缺道具参考板（合成未成功）。已允许试拍（draft），不挡生成；烧片前请挂 PROP 板或继续修复。",
      ctaLabel: "补道具板/继续修复",
      primaryNextStep: "batch_still",
      missingSlots,
      debtKind: "prop_plate",
      deliveryTier: "draft",
    };
  }

  // Continuity must but no plate/bake: honest debt — NEVER brick Generate (400).
  // Caller must still attempt FE salvage + bake; missing pixels → soft warn only.
  if (softEnvContinuity === "must" && softEnvMissing) {
    return {
      allowVendor: true,
      propRequired,
      propPlateMissing: false,
      softEnvRequired: true,
      softEnvMissing: true,
      softEnvContinuity,
      softEnvBakedIntoIdentity: false,
      code: "SOFT-ENV-PLATE-MISSING",
      userMessage:
        "软环境为连贯性必须，但 SCENE 像素未进参考/烘焙未成功；成图易灰棚。已允许生成，请确认画布已挂场景板后重试。",
      ctaLabel: "确认场景板后重试",
      primaryNextStep: "retry_shot",
      missingSlots,
    };
  }

  return {
    allowVendor: true,
    propRequired,
    propPlateMissing: false,
    softEnvRequired,
    softEnvMissing,
    softEnvContinuity,
    softEnvBakedIntoIdentity: baked,
    synthesizedProp: Boolean(input.synthesizedPropApplied),
    missingSlots,
    code: softEnvMissing ? "SOFT-ENV-PLATE-MISSING" : undefined,
    userMessage: softEnvMissing
      ? "已保留软环境文案，但未挂上 SCENE 软板；成图易灰棚，建议补场景板。"
      : undefined,
    ctaLabel: softEnvMissing ? "补场景软板" : undefined,
  };
}

/** Resolve glyph / label text from contract + VD (vocab aliases, not hardcoded shot names). */
export function resolvePropPlateLabel(input: {
  contract?: GenerationContract | null;
  visualDescription?: string | null;
}): { propClassId: string | null; canonical: string; glyphText: string; softPlateHint: string; plateMode?: string } {
  const vd = String(input.visualDescription ?? "");
  const m = (() => {
    try {
      return matchContactEventVd(vd);
    } catch {
      return null;
    }
  })();
  let propClassId = m?.propClassId ?? null;
  let plateMode: string | undefined;
  let glyphFromProfile = "";
  try {
    const { deriveDesignIntentProfile } =
      require("./designIntentProfile") as typeof import("./designIntentProfile");
    const dip = deriveDesignIntentProfile({ visualDescription: vd });
    if (!propClassId) propClassId = dip.propClassId;
    plateMode = dip.plateMode;
    glyphFromProfile = dip.glyphText;
  } catch {
    /* optional */
  }
  const aliases = propClassAliases(propClassId);
  const canonical =
    m?.propCanonical ||
    m?.propAlias ||
    glyphFromProfile ||
    aliases.find((a) => a.length >= 2 && !/角$/.test(a)) ||
    aliases[0] ||
    "道具";
  const glyphText =
    resolveGlyphTextFromVd({
      visualDescription: vd,
      propClassId,
      propAlias: m?.propAlias,
      propCanonical: m?.propCanonical,
    }) ||
    glyphFromProfile ||
    (aliases.find((a) => a.length >= 1 && a.length <= 4 && !/角$/.test(a)) ?? canonical.slice(0, 2));
  const doctrine = getPropFormDoctrine(propClassId);
  return {
    propClassId,
    canonical,
    glyphText,
    softPlateHint: doctrine?.softPlateHint ?? "generic",
    plateMode,
  };
}

/**
 * Synthesize a minimal PROP soft plate (SVG→JPEG) for structure whitelist.
 * plateMode: readable_doc | cheek_sweep | object_inset | fragment_sil
 * Never emit English labels on the plate (vendor copies them as stickers).
 */
export async function synthesizePropSoftPlate(input: {
  propClassId?: string | null;
  canonical?: string | null;
  glyphText?: string | null;
  softPlateHint?: string | null;
  plateMode?: string | null;
  /** Sealed occupancy — bend_pickup uses ground-pickup geometry, not centered display card */
  poseOccupancy?: string | null;
}): Promise<{ base64: string; kind: string; label: string; plateMode: string }> {
  const cls = String(input.propClassId ?? "generic");
  const hint = String(input.softPlateHint || getPropFormDoctrine(cls)?.softPlateHint || "generic");
  const mode =
    String(input.plateMode ?? "").trim() ||
    (cls === "paper_doc" || hint === "thin_sheets" ? "readable_doc" : "object_inset");
  const label = String(input.glyphText || input.canonical || "物").slice(0, 4);
  const chars = [...label];
  const w = 512;
  const h = 512;
  const bendPickup = String(input.poseOccupancy ?? "") === "bend_pickup";
  let svg = "";
  // bend_pickup always wins: ground-pickup geometry before cheek/readable_doc display card
  // Also treat object_inset paper as bend ground sheet (callers force mode when sealed)
  const forceGroundSheet =
    bendPickup ||
    (mode === "object_inset" && (cls === "paper_doc" || hint === "thin_sheets"));
  if (forceGroundSheet && (cls === "paper_doc" || hint === "thin_sheets" || mode === "readable_doc" || mode === "object_inset" || !mode || mode === "none")) {
    // Ground pickup: lean + floor sheet; ink title on paper is legal visualization (not chest sticker)
    const c0 = escapeXml(chars[0] || "纸");
    const c1 = escapeXml(chars[1] || chars[0] || "片");
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="hall" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#3a2e24"/><stop offset="100%" stop-color="#12100e"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#hall)"/>
  <ellipse cx="256" cy="470" rx="220" ry="28" fill="#1a1612" opacity="0.7"/>
  <g opacity="0.95">
    <ellipse cx="188" cy="95" rx="52" ry="60" fill="#d4b49a"/>
    <path d="M145 145 Q185 210 215 300 Q235 370 248 430" fill="#5a6a88" stroke="#3a4a62" stroke-width="2"/>
    <path d="M210 175 Q310 250 355 400" stroke="#4a5a78" stroke-width="36" fill="none" stroke-linecap="round"/>
    <path d="M110 260 Q170 350 235 420" stroke="#c4a890" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M140 280 Q195 365 255 425" stroke="#d4b8a0" stroke-width="13" fill="none" stroke-linecap="round"/>
  </g>
  <g transform="rotate(-18 300 420)">
    <polygon points="210,390 380,372 365,470 200,480" fill="#e8dcc6" stroke="#5a4a32" stroke-width="3"/>
    <path d="M235 420 L350 410" stroke="#c4b498" stroke-width="1.5" fill="none" opacity="0.4"/>
    <path d="M250 435 L330 425" stroke="#a89878" stroke-width="1" fill="none" opacity="0.35"/>
    <text x="290" y="430" text-anchor="middle" font-size="22" font-family="serif" fill="#1a1208" opacity="0.85">${c0}</text>
    <text x="290" y="452" text-anchor="middle" font-size="22" font-family="serif" fill="#1a1208" opacity="0.85">${c1}</text>
  </g>
</svg>`;
  } else if (mode === "cheek_sweep" && (cls === "paper_doc" || hint === "thin_sheets")) {
    const c0 = escapeXml(chars[0] || "纸");
    const c1 = escapeXml(chars[1] || chars[0] || "片");
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="env" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2c241c"/><stop offset="100%" stop-color="#15110e"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#env)"/>
  <ellipse cx="168" cy="260" rx="118" ry="150" fill="#d4b49a"/>
  <g transform="rotate(-28 300 240)">
    <polygon points="220,200 420,175 405,320 210,340" fill="#e9dfc8" stroke="#6a5538" stroke-width="2"/>
    <text x="320" y="250" text-anchor="middle" font-size="28" font-family="serif" fill="#1a1208" opacity="0.9">${c0}</text>
    <text x="320" y="285" text-anchor="middle" font-size="28" font-family="serif" fill="#1a1208" opacity="0.9">${c1}</text>
  </g>
  <path d="M200 245 Q230 255 250 270" stroke="#b08070" stroke-width="3" fill="none" opacity="0.55"/>
</svg>`;
  } else if (mode === "readable_doc" || ((cls === "paper_doc" || hint === "thin_sheets") && mode !== "cheek_sweep")) {
    const c0 = escapeXml(chars[0] || "纸");
    const c1 = escapeXml(chars[1] || "");
    const c2 = escapeXml(chars[2] || "");
    const c3 = escapeXml(chars[3] || "");
    // Hold/pickup readable sheet — palm-scale footprint (not full-canvas giant book)
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#1a1612"/>
  <polygon points="170,140 370,130 355,360 160,350" fill="#e8dcc6" stroke="#5a4a32" stroke-width="2"/>
  <path d="M185 175 L340 168" stroke="#c4b498" stroke-width="1" fill="none" opacity="0.5"/>
  <text x="256" y="230" text-anchor="middle" font-size="48" font-family="serif" fill="#1a1208">${c0}</text>
  <text x="256" y="285" text-anchor="middle" font-size="48" font-family="serif" fill="#1a1208">${c1}</text>
  <text x="256" y="330" text-anchor="middle" font-size="32" font-family="serif" fill="#1a1208" opacity="0.85">${c2}${c3}</text>
</svg>`;
  } else if (cls === "cloth" || hint === "cloth_fold" || mode === "object_inset" && hint === "cloth_fold") {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#1e1a18"/>
  <path d="M80 200 Q256 80 432 200 L400 400 Q256 460 112 400 Z" fill="#c4b8a8" stroke="#6a5a4a" stroke-width="3"/>
  <text x="256" y="280" text-anchor="middle" font-size="40" fill="#3a3028">${escapeXml(label)}</text>
</svg>`;
  } else if (cls === "blade" || hint === "blade_edge") {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#12141a"/>
  <rect x="120" y="230" width="280" height="28" rx="4" fill="#c8d0dc" stroke="#8890a0"/>
  <polygon points="400,244 460,244 400,258" fill="#e8eef8"/>
</svg>`;
  } else if (cls === "digit_prop" || hint === "digit_ring") {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#1a1814"/>
  <circle cx="256" cy="240" r="72" fill="none" stroke="#c9a227" stroke-width="18"/>
  <circle cx="256" cy="240" r="36" fill="#2a4a3a" stroke="#c9a227" stroke-width="4"/>
</svg>`;
  } else if (mode === "fragment_sil") {
    // Visible skirt/hem folds (not empty black) — shallow DOF fragment, not full hall
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="dof" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#3a322c"/><stop offset="100%" stop-color="#1a1612"/>
    </radialGradient>
    <linearGradient id="hem" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c9b8a0"/><stop offset="55%" stop-color="#a89078"/><stop offset="100%" stop-color="#7a6858"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#dof)"/>
  <path d="M40 280 Q160 120 260 260 Q320 340 380 220 L460 300 Q340 480 200 500 Q80 460 40 320 Z" fill="url(#hem)" opacity="0.92"/>
  <path d="M90 340 Q200 260 300 380" stroke="#6a5848" stroke-width="3" fill="none" opacity="0.55"/>
  <path d="M140 400 Q250 320 360 420" stroke="#5a4a3a" stroke-width="2.5" fill="none" opacity="0.45"/>
  <ellipse cx="420" cy="460" rx="160" ry="36" fill="#2a2420" opacity="0.4"/>
  <text x="256" y="48" text-anchor="middle" font-size="18" fill="#8a7a6a" opacity="0.55">${escapeXml(label || "裙摆")}</text>
</svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#222"/>
  <rect x="120" y="120" width="272" height="272" rx="16" fill="#888" stroke="#ccc"/>
  <text x="256" y="280" text-anchor="middle" font-size="36" fill="#111">${escapeXml(label)}</text>
</svg>`;
  }
  const { default: sharp } = await import("sharp");
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
  return {
    base64: buf.toString("base64"),
    kind: hint === "thin_sheets" ? "thin_sheets" : cls || hint || "generic",
    label,
    plateMode: mode === "readable_doc" || mode === "cheek_sweep" || mode === "object_inset" || mode === "fragment_sil" ? mode : "readable_doc",
  };
}

/** Synth warm/candle atmosphere plate when no SCENE asset — anti white-studio. */
export async function synthesizeAtmospherePlate(input: {
  atmosphere?: string | null;
}): Promise<{ base64: string; kind: string } | null> {
  const atm = String(input.atmosphere ?? "暖光").slice(0, 4);
  const w = 512;
  const h = 512;
  const warm = /烛|暖|灯/.test(atm);
  const cool = /月|冷|夜/.test(atm);
  const c0 = warm ? "#3a2818" : cool ? "#12182a" : "#1e1a18";
  const c1 = warm ? "#8a5a28" : cool ? "#2a3a58" : "#3a3028";
  const glow = warm ? "#f0c060" : cool ? "#a8c8f0" : "#d0c0a0";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="g" cx="30%" cy="70%" r="70%">
      <stop offset="0%" stop-color="${glow}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${c1}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${c0}"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="40" y="60" width="28" height="320" fill="#2a2018" opacity="0.45"/>
  <rect x="420" y="100" width="22" height="280" fill="#2a2018" opacity="0.35"/>
  <ellipse cx="140" cy="380" rx="36" ry="48" fill="${glow}" opacity="0.7"/>
  <ellipse cx="140" cy="360" rx="10" ry="18" fill="#fff6d0" opacity="0.85"/>
</svg>`;
  try {
    const { default: sharp } = await import("sharp");
    const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
    return { base64: buf.toString("base64"), kind: `atm:${atm}` };
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Prop soft lookup codes from contract/modality — NEVER shot-name literals (休书→PROP-PAPER).
 * Returns PROP-* codes and short class aliases for asset name match.
 */
export function resolvePropSoftCodes(input: {
  contract?: GenerationContract | null;
  visualDescription?: string | null;
  explicitCodes?: string[] | null;
}): string[] {
  const vd = String(input.visualDescription ?? "");
  // SingleShotClosed: oral beats never legislate prop plates (even with explicitCodes)
  try {
    const { isOralMicroNotActionPrimary } =
      require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
    if (isOralMicroNotActionPrimary(vd)) return [];
  } catch {
    /* optional */
  }
  const explicit = (input.explicitCodes ?? []).map((c) => String(c).trim()).filter(Boolean);
  if (explicit.length) return [...new Set(explicit)];
  let propClassId = (input.contract as { propClassId?: string } | null | undefined)?.propClassId ?? null;
  if (!propClassId) {
    try {
      const m = matchContactEventVd(vd);
      propClassId = m?.propClassId ?? null;
    } catch {
      propClassId = null;
    }
  }
  if (!propClassId && !objectiveNeedsPropPlate(input.contract?.objectiveClass)) return [];
  const aliases = propClassAliases(propClassId);
  const codes = aliases.filter((a) => /^PROP-/i.test(a));
  // Short generic class tokens for name match (exclude long literary / sample names ≥3 rare chars as sole key)
  const nameHints = aliases
    .filter((a) => !/^PROP-/i.test(a) && a.length >= 1 && a.length <= 3)
    .filter((a) => /纸|信|笺|帕|巾|剑|刀|簪|环|玉|指|休书|婚书/.test(a));
  // Always include class-level material tokens for paper_doc etc. (warehouse names may be 休书/婚书)
  if (propClassId === "paper_doc" || /休书|婚书|信笺/.test(vd)) {
    nameHints.push("纸", "信", "笺", "休书", "婚书");
  }
  if (propClassId === "cloth") nameHints.push("帕", "巾");
  if (propClassId === "blade") nameHints.push("剑", "刀");
  if (propClassId === "digit_prop") nameHints.push("扳指", "玉");
  return [...new Set([...codes, ...nameHints])];
}

/**
 * Punch near-white / light-gray / mid-gray studio sheet bg to alpha so SCENE shows around the subject.
 * Turnaround plates are usually white or flat gray panels — opaque paste locks studio into vendor output.
 */
export async function matteNearWhiteToAlpha(
  imageBase64: string,
  opts?: { whiteThreshold?: number; softThreshold?: number; grayStudio?: boolean },
): Promise<{ base64: string; matted: boolean; reason?: string }> {
  const raw = String(imageBase64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (!raw) return { base64: "", matted: false, reason: "empty" };
  try {
    const hard = Math.min(255, Math.max(200, Number(opts?.whiteThreshold ?? 235)));
    const soft = Math.min(hard - 1, Math.max(160, Number(opts?.softThreshold ?? 200)));
    const punchGrayStudio = opts?.grayStudio !== false;
    const { data, info } = await sharp(Buffer.from(raw, "base64"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    let punched = 0;
    for (let i = 0; i < data.length; i += ch) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const mn = Math.min(r, g, b);
      const mx = Math.max(r, g, b);
      const chroma = mx - mn;
      // Near-white / light gray (low chroma)
      if (mn >= hard && chroma <= 28) {
        data[i + 3] = 0;
        punched += 1;
      } else if (mn >= soft && chroma <= 36) {
        const t = (mn - soft) / Math.max(1, hard - soft);
        data[i + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - t))));
        punched += 1;
      } else if (punchGrayStudio && chroma <= 22 && mn >= 140 && mx <= 245) {
        // Mid/light flat studio gray (#8c–#f5) common on 四视图 panels (incl. ~#e0)
        data[i + 3] = 0;
        punched += 1;
      }
    }
    if (!punched) return { base64: raw, matted: false, reason: "no_white" };
    const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toBuffer();
    return { base64: out.toString("base64"), matted: true, reason: `punched_${punched}` };
  } catch (e) {
    return {
      base64: raw,
      matted: false,
      reason: e instanceof Error ? e.message : "matte_fail",
    };
  }
}

/**
 * Bake soft SCENE under identity (shallow DOF).
 * Face is a smaller matted subject so temple/wood/candle rim stays readable — opaque full-bleed
 * face paste previously hid SCENE and locked turnaround white studio into the vendor ref.
 */
export async function bakeSoftEnvIntoIdentity(input: {
  identityBase64: string;
  sceneBase64: string;
}): Promise<{ base64: string; baked: boolean; reason?: string }> {
  const idRaw = String(input.identityBase64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  const scRaw = String(input.sceneBase64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (!idRaw || !scRaw) return { base64: idRaw, baked: false, reason: "missing_input" };
  try {
    const idBuf = Buffer.from(idRaw, "base64");
    const scBuf = Buffer.from(scRaw, "base64");
    // Prefer landscape-ish bake canvas so side env is visible on CU
    const idMeta = await sharp(idBuf).metadata();
    const w = Math.max(512, Math.min(1024, idMeta.width ?? 640));
    const h = Math.max(512, Math.min(1024, Math.round(w * 1.15)));
    // SCENE readable (mild blur) — not crushed to mud
    const sceneLayer = await sharp(scBuf)
      .resize(w, h, { fit: "cover" })
      .blur(5)
      .modulate({ brightness: 0.88, saturation: 0.95 })
      .jpeg({ quality: 90 })
      .toBuffer();
    // Upper-body bias then punch white sheet bg
    const faceCrop = await cropIdentityPlateToFaceBias(idRaw, { topRatio: 0.62 });
    const matted = await matteNearWhiteToAlpha(faceCrop.base64 || idRaw);
    const faceSrc = Buffer.from(matted.base64 || faceCrop.base64 || idRaw, "base64");
    // Smaller subject footprint — leave ≥45% canvas for softEnv rim
    const faceH = Math.floor(h * 0.58);
    const faceW = Math.floor(w * 0.46);
    const faceLayer = await sharp(faceSrc)
      .resize(faceW, faceH, { fit: "cover" })
      .png()
      .toBuffer();
    const left = Math.floor((w - faceW) / 2);
    const top = Math.floor(h * 0.14);
    const out = await sharp(sceneLayer)
      .composite([{ input: faceLayer, left, top }])
      .jpeg({ quality: 92 })
      .toBuffer();
    return {
      base64: out.toString("base64"),
      baked: true,
      reason: matted.matted ? "soft_env_bake_matted" : "soft_env_bake_shallow",
    };
  } catch (e) {
    return {
      base64: idRaw,
      baked: false,
      reason: e instanceof Error ? e.message : "bake_fail",
    };
  }
}

/** Strip --sref SCENE-* when softEnv is baked or absent as independent slot (avoid orphan text sref). */
export function stripOrphanSceneSref(
  prompt: string,
  opts?: { softEnvIndependentSlot?: boolean; softEnvBakedIntoIdentity?: boolean },
): string {
  if (opts?.softEnvIndependentSlot) return String(prompt ?? "");
  let p = String(prompt ?? "");
  if (opts?.softEnvBakedIntoIdentity || opts?.softEnvIndependentSlot === false) {
    p = p
      .replace(/,?\s*--sref\s+SCENE-[A-Za-z0-9]+/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+,/g, ",")
      .trim();
  }
  return p;
}

/**
 * Further crop an identity plate toward upper face / upper-body.
 * Event + softEnv / costume need → topRatio ~0.72; face-only ECU → ~0.55.
 */
export function resolveIdentityCropTopRatio(input: {
  objectiveClass?: string | null;
  keepSoftEnvRef?: boolean | null;
  softEnvContinuity?: string | null;
  preferCostume?: boolean | null;
  /** bend_pickup / action_primary must keep upper-body (≥0.72), never face-only soup */
  poseOccupancy?: string | null;
  primaryObjective?: string | null;
}): number {
  const obj = String(input.objectiveClass ?? "");
  const eventObj =
    obj === "contact_geom" ||
    obj === "prop_readable" ||
    obj === "action_primary";
  const bend =
    String(input.poseOccupancy ?? "") === "bend_pickup" ||
    String(input.primaryObjective ?? "") === "action_primary";
  const soft =
    input.keepSoftEnvRef === true ||
    input.softEnvContinuity === "must" ||
    input.softEnvContinuity === "optional";
  if (bend || input.preferCostume === true || eventObj || soft) {
    return 0.72;
  }
  return 0.55;
}

/**
 * Mild blur softEnv plate for faceCu soft_env — atmosphere rim, not sharp establishing.
 * Scene Must: skip/weak blur so hall structure is not mudded away vs identity gray.
 */
export async function softenSoftEnvPlateForAtmosphere(
  imageBase64: string,
  opts?: { sigma?: number; sceneMust?: boolean; softEnvContinuity?: string | null },
): Promise<{ base64: string; softened: boolean; reason?: string }> {
  const raw = String(imageBase64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (!raw) return { base64: "", softened: false, reason: "empty" };
  const sceneMust =
    opts?.sceneMust === true ||
    opts?.softEnvContinuity === "must";
  try {
    if (sceneMust && opts?.sigma == null) {
      // Keep hall readable for Seedream — only tiny soften
      const out = await sharp(Buffer.from(raw, "base64"))
        .blur(0.55)
        .jpeg({ quality: 92 })
        .toBuffer();
      return { base64: out.toString("base64"), softened: true, reason: "softenv_blur_scene_must_0.55" };
    }
    const sigma = Math.min(2.5, Math.max(0.6, Number(opts?.sigma ?? 1.2)));
    const out = await sharp(Buffer.from(raw, "base64"))
      .blur(sigma)
      .jpeg({ quality: 88 })
      .toBuffer();
    return { base64: out.toString("base64"), softened: true, reason: `softenv_blur_${sigma}` };
  } catch (e) {
    return {
      base64: raw,
      softened: false,
      reason: e instanceof Error ? e.message : "softenv_blur_fail",
    };
  }
}

/**
 * Further crop an identity plate toward upper face (demote handheld soup on event shots).
 * Keeps top ~55% (face) or ~72% (upper-body/costume) of plate.
 * preferActionBody: skip top face-band of sheet cell — take mid upper-body band.
 */
export async function cropIdentityPlateToFaceBias(
  imageBase64: string,
  opts?: { topRatio?: number; preferActionBody?: boolean },
): Promise<{ base64: string; cropped: boolean; reason?: string }> {
  const raw = String(imageBase64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (!raw) return { base64: "", cropped: false, reason: "empty" };
  try {
    const buf = Buffer.from(raw, "base64");
    const img = sharp(buf);
    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w < 64 || h < 96) return { base64: raw, cropped: false, reason: "too_small" };
    if (opts?.preferActionBody) {
      // Skip top ~28% (sheet face-band / head CU), keep next ~68% (torso / reach zone)
      const topSkip = Math.floor(h * 0.28);
      const cropH = Math.max(64, Math.floor(h * 0.68));
      const top = Math.min(topSkip, Math.max(0, h - cropH));
      const out = await sharp(buf)
        .extract({ left: 0, top, width: w, height: Math.min(cropH, h - top) })
        .jpeg({ quality: 92 })
        .toBuffer();
      return { base64: out.toString("base64"), cropped: true, reason: "action_body_skip_face_band" };
    }
    // Allow upper-body bias (~0.72) for IP-Adapter costume; face-only soup uses ~0.55
    const ratio = Math.min(0.85, Math.max(0.5, Number(opts?.topRatio ?? 0.55)));
    const cropH = Math.max(64, Math.floor(h * ratio));
    const out = await sharp(buf)
      .extract({ left: 0, top: 0, width: w, height: cropH })
      .jpeg({ quality: 92 })
      .toBuffer();
    return { base64: out.toString("base64"), cropped: true, reason: `face_bias_top${Math.round(ratio * 100)}` };
  } catch (e) {
    return {
      base64: raw,
      cropped: false,
      reason: e instanceof Error ? e.message : "face_crop_fail",
    };
  }
}

/**
 * Bend propSoft: prefer SCENE floor crop (photographic) over cartoon SVG.
 * Reject near-black / void crops — they poison Seedream into dropping hall softEnv.
 */
export async function composeBendPropSoftFromScene(input?: {
  sceneBase64?: string | null;
}): Promise<{ base64: string; kind: string; reason: string; fromScene: boolean } | null> {
  const scene = String(input?.sceneBase64 ?? "")
    .replace(/^data:image\/\w+;base64,/, "")
    .trim();
  if (!scene) return null;
  try {
    const buf = Buffer.from(scene, "base64");
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w < 96 || h < 96) return null;
    // Lower-center floor zone (paper often rests there on hall plates)
    const top = Math.floor(h * 0.42);
    const cropH = Math.max(64, h - top);
    const left = Math.floor(w * 0.12);
    const cropW = Math.max(64, Math.floor(w * 0.76));
    const floor = await sharp(buf)
      .extract({ left, top, width: Math.min(cropW, w - left), height: Math.min(cropH, h - top) })
      .resize(512, 512, { fit: "cover", position: "bottom" })
      .jpeg({ quality: 90 })
      .toBuffer();
    // Reject void/near-black floor — caller must fall back to SVG bend prop
    const { data, info } = await sharp(floor)
      .resize(32, 32, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = info.channels || 3;
    let sum = 0;
    let bright = 0;
    const n = Math.floor(data.length / ch);
    for (let i = 0; i < data.length; i += ch) {
      const lum = ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
      sum += lum;
      if (lum > 90) bright++;
    }
    const mean = n ? sum / n : 0;
    const brightRatio = n ? bright / n : 0;
    if (mean < 38 || brightRatio < 0.02) {
      return null;
    }
    // Pose cue only (arms) — no cream paper ellipse (second-sheet look on floor)
    const cueSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <path d="M120 80 Q180 160 210 280 Q230 360 250 430" stroke="#c4a890" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.28"/>
  <path d="M200 200 Q280 280 330 400" stroke="#8a9ab0" stroke-width="20" fill="none" stroke-linecap="round" opacity="0.22"/>
</svg>`);
    const cue = await sharp(cueSvg).png().toBuffer();
    const out = await sharp(floor)
      .composite([{ input: cue, blend: "over" }])
      .jpeg({ quality: 90 })
      .toBuffer();
    return {
      base64: out.toString("base64"),
      kind: "bend_floor_from_scene",
      reason: `scene_floor_crop_pose_cue_no_paper:mean=${mean.toFixed(0)}`,
      fromScene: true,
    };
  } catch {
    return null;
  }
}

/**
 * Bend identity: REAL face/upper crop on dark pad — NO global matte (punches face highlights → 花脸).
 * Optional corner-flood RGB neutralize of studio gray only; softEnv stays independent slot.
 * Hall Must: never ship empty dark pad as sole identity without face bytes.
 */
export async function composeBendIdentityPlate(input?: {
  faceSourceBase64?: string | null;
}): Promise<{ base64: string; kind: string; reason: string; usedFace: boolean }> {
  const src = String(input?.faceSourceBase64 ?? "")
    .replace(/^data:image\/\w+;base64,/, "")
    .trim();
  if (!src) {
    return { base64: "", kind: "bend_identity_face", reason: "no_face_source", usedFace: false };
  }
  try {
    const face = await cropIdentityPlateToFaceBias(src, { topRatio: 0.58 });
    const plate = face.base64 || src;
    // Corner-connected studio gray → warm dark RGB (not alpha punch through face)
    const cleaned = await neutralizeCornerStudioGrayRgb(plate);
    const side = 640;
    const dark = { r: 28, g: 22, b: 18 };
    const resized = await sharp(Buffer.from(cleaned.base64 || plate, "base64"))
      .resize(side, side, { fit: "inside", withoutEnlargement: false })
      .jpeg({ quality: 92 })
      .toBuffer();
    const rm = await sharp(resized).metadata();
    const rw = rm.width ?? side;
    const rh = rm.height ?? side;
    if (rw < 32 || rh < 32) {
      // Too empty / failed resize — return face crop directly, never empty dark pad as image0
      return {
        base64: cleaned.base64 || plate,
        kind: "bend_identity_face",
        reason: "real_face_raw_no_empty_pad",
        usedFace: true,
      };
    }
    const left = Math.max(0, Math.floor((side - rw) / 2));
    const top = Math.max(0, Math.floor((side - rh) / 2));
    // Only pad when subject occupies meaningful area (avoid hall Must dominated by empty dark)
    const fillRatio = (rw * rh) / (side * side);
    if (fillRatio < 0.12) {
      return {
        base64: cleaned.base64 || plate,
        kind: "bend_identity_face",
        reason: "real_face_crop_skip_sparse_pad",
        usedFace: true,
      };
    }
    const out = await sharp({
      create: { width: side, height: side, channels: 3, background: dark },
    })
      .composite([{ input: resized, left, top }])
      .jpeg({ quality: 92 })
      .toBuffer();
    const cleanTag = cleaned.changed ? `corner_gray_rgb:${cleaned.reason}` : "rgb_dark_pad";
    return {
      base64: out.toString("base64"),
      kind: "bend_identity_face",
      reason: face.cropped
        ? `real_face_anti_stand_sheet:${cleanTag}`
        : `real_face_anti_studio:${cleanTag}`,
      usedFace: true,
    };
  } catch (e) {
    return {
      base64: src,
      kind: "bend_identity_face",
      reason: e instanceof Error ? `face_fail:${e.message.slice(0, 40)}` : "face_fail",
      usedFace: false,
    };
  }
}

/**
 * Flood-fill from image corners: replace flat studio gray with warm dark RGB.
 * Does NOT punch alpha on face highlights (avoids 花脸 when flattened).
 */
export async function neutralizeCornerStudioGrayRgb(
  imageBase64: string,
): Promise<{ base64: string; changed: boolean; reason?: string }> {
  const raw = String(imageBase64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (!raw) return { base64: "", changed: false, reason: "empty" };
  try {
    const { data, info } = await sharp(Buffer.from(raw, "base64"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const ch = info.channels;
    const dark = { r: 28, g: 22, b: 18 };
    const isStudio = (i: number) => {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const mn = Math.min(r, g, b);
      const mx = Math.max(r, g, b);
      const chroma = mx - mn;
      // Near-white / flat gray studio only
      return chroma <= 28 && mn >= 160;
    };
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];
    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const idx = y * w + x;
      if (visited[idx]) return;
      const pi = idx * ch;
      if (!isStudio(pi)) return;
      visited[idx] = 1;
      queue.push(idx);
    };
    // Seed from four corners + edge midpoints
    push(0, 0);
    push(w - 1, 0);
    push(0, h - 1);
    push(w - 1, h - 1);
    push(Math.floor(w / 2), 0);
    push(Math.floor(w / 2), h - 1);
    push(0, Math.floor(h / 2));
    push(w - 1, Math.floor(h / 2));
    let filled = 0;
    while (queue.length) {
      const idx = queue.pop()!;
      const x = idx % w;
      const y = Math.floor(idx / w);
      const pi = idx * ch;
      data[pi] = dark.r;
      data[pi + 1] = dark.g;
      data[pi + 2] = dark.b;
      data[pi + 3] = 255;
      filled += 1;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
    if (!filled) return { base64: raw, changed: false, reason: "no_corner_studio" };
    const out = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .jpeg({ quality: 92 })
      .toBuffer();
    return { base64: out.toString("base64"), changed: true, reason: `filled_${filled}` };
  } catch (e) {
    return {
      base64: raw,
      changed: false,
      reason: e instanceof Error ? e.message : "corner_fail",
    };
  }
}

/**
 * @deprecated Doctrine: softEnv is independent slot — do not bake into identity.
 * Kept as no-op so stale callers cannot re-enable collage.
 */
export async function ensureBendIdentityCarriesSoftEnv(input: {
  identityBase64: string;
  sceneBase64?: string | null;
}): Promise<{ base64: string; applied: boolean; reason: string }> {
  const id = String(input.identityBase64 ?? "")
    .replace(/^data:image\/\w+;base64,/, "")
    .trim();
  return { base64: id, applied: false, reason: "doctrine_independent_softEnv_no_bake" };
}

/** Classify FE reference URL/index for canvas path (generic keywords). */
export function classifyFeReferenceRole(
  url: string,
  index: number,
  opts?: { preferCharFirst?: boolean; softEnvNeeded?: boolean; total?: number },
): "scene" | "prop" | "char" | "unknown" {
  const urlStr = String(url ?? "");
  // Char/定妆 wins over scene keywords in filename (e.g. SCENE_CHAR sheet misnames)
  if (/char|role|turnaround|sheet|定妆|cref|identity|CHAR-|三视图|四视图|人物立绘/i.test(urlStr)) {
    // Explicit SCENE- asset code still wins when softEnv needed and not a turnaround sheet
    if (
      opts?.softEnvNeeded &&
      /SCENE-/i.test(urlStr) &&
      !/turnaround|sheet|定妆|三视图|四视图|CHAR-/i.test(urlStr)
    ) {
      return "scene";
    }
    return "char";
  }
  if (/scene|bg|背景|殿|厅|altar|temple|神庙|香案|SCENE-|室内|烛|祠|堂|sref/i.test(urlStr)) return "scene";
  if (/prop|道具|PROP-|纸|信|文书|帕|剑|扳指|巾|刀|玉佩/i.test(urlStr)) return "prop";
  // Canvas often mounts SCENE then CHAR: when softEnv needed, index0 without char cues → prefer scene
  if (
    opts?.softEnvNeeded &&
    (opts.total ?? 0) >= 2 &&
    index === 0 &&
    !/char|role|sheet|定妆|cref|CHAR-|turnaround|三视图|四视图/i.test(urlStr)
  ) {
    return "scene";
  }
  if (opts?.preferCharFirst !== false && index === 0) return "char";
  // softEnvNeeded: only last untagged slot → scene (mid slots stay unknown — avoid propSoft→scene poison)
  if (opts?.softEnvNeeded === true) {
    if (index > 0 && index === (opts.total ?? 0) - 1) return "scene";
    return "unknown";
  }
  // Legacy canvas: untagged index>0 treated as scene
  if (index > 0) return "scene";
  return "unknown";
}

/** Near-black / void plate — reject as propSoft mid-slot (poisons hall softEnv). */
export async function isNearBlackVoidPlate(
  imageBase64: string,
  opts?: { meanMax?: number; chromaMax?: number },
): Promise<{ void: boolean; mean?: number; reason?: string }> {
  const raw = String(imageBase64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (!raw) return { void: true, reason: "empty" };
  try {
    const { data, info } = await sharp(Buffer.from(raw, "base64"))
      .resize(64, 64, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    let sum = 0;
    let chromaSum = 0;
    const n = Math.floor(data.length / ch);
    for (let i = 0; i < data.length; i += ch) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      sum += (r + g + b) / 3;
      chromaSum += Math.max(r, g, b) - Math.min(r, g, b);
    }
    const mean = sum / Math.max(1, n);
    const chroma = chromaSum / Math.max(1, n);
    const meanMax = opts?.meanMax ?? 28;
    const chromaMax = opts?.chromaMax ?? 18;
    if (mean <= meanMax && chroma <= chromaMax) {
      return { void: true, mean, reason: `near_black_mean_${mean.toFixed(1)}` };
    }
    return { void: false, mean, reason: "ok" };
  } catch (e) {
    return { void: false, reason: e instanceof Error ? e.message : "probe_fail" };
  }
}

/**
 * Reject modern-attire / gray-studio plates as identity[0] cref.
 * URL/remark cues win; pixel gray periphery is secondary latch.
 */
export async function probeIdentityPlateContamination(input: {
  imageBase64?: string | null;
  urlOrRemark?: string | null;
  /** When period costume expected (古装 bend/hall), reject modern cues harder */
  periodCostumeExpected?: boolean;
}): Promise<{
  contaminated: boolean;
  modernAttireSuspected: boolean;
  grayStudioSuspected: boolean;
  reason: string;
}> {
  const meta = String(input.urlOrRemark ?? "");
  const modernMeta = /西装|校服|现代|西服|衬衫|blazer|suit|shirt|office|白领|职场/i.test(meta);
  const periodMeta = /古装|汉服|襦裙|CHAR-|袍|发冠|发簪/i.test(meta);
  let grayStudioSuspected = false;
  // Modern cues win even if filename also says 定妆
  let modernAttireSuspected = modernMeta && !(/古装|汉服|襦裙|袍/.test(meta) && !modernMeta);
  const raw = String(input.imageBase64 ?? "")
    .replace(/^data:image\/\w+;base64,/, "")
    .trim();
  if (raw) {
    try {
      const { data, info } = await sharp(Buffer.from(raw, "base64"))
        .resize(48, 64, { fit: "fill" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;
      const ch = info.channels || 3;
      const lum = (x: number, y: number) => {
        const i = (y * w + x) * ch;
        return ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
      };
      const meanRegion = (x0: number, y0: number, x1: number, y1: number) => {
        let s = 0;
        let n = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            s += lum(x, y);
            n++;
          }
        }
        return n ? s / n : 0;
      };
      const tl = meanRegion(0, 0, Math.floor(w * 0.25), Math.floor(h * 0.3));
      const tr = meanRegion(Math.floor(w * 0.75), 0, w, Math.floor(h * 0.3));
      const bl = meanRegion(0, Math.floor(h * 0.7), Math.floor(w * 0.25), h);
      const br = meanRegion(Math.floor(w * 0.75), Math.floor(h * 0.7), w, h);
      const bg = (tl + tr + bl + br) / 4;
      const bgSpread = Math.max(tl, tr, bl, br) - Math.min(tl, tr, bl, br);
      grayStudioSuspected = bg > 120 && bg < 240 && bgSpread < 28;
      // Dark navy mid-torso + gray periphery → modern suit sheet cue
      const mid = meanRegion(Math.floor(w * 0.3), Math.floor(h * 0.35), Math.floor(w * 0.7), Math.floor(h * 0.7));
      if (
        input.periodCostumeExpected !== false &&
        grayStudioSuspected &&
        mid > 35 &&
        mid < 95 &&
        bg > mid + 40
      ) {
        modernAttireSuspected = true;
      }
    } catch {
      /* meta-only */
    }
  }
  const contaminated = modernAttireSuspected || (grayStudioSuspected && input.periodCostumeExpected !== false);
  return {
    contaminated,
    modernAttireSuspected,
    grayStudioSuspected,
    reason: contaminated
      ? modernAttireSuspected
        ? "modern_attire_cref"
        : "gray_studio_cref"
      : "ok",
  };
}

/**
 * Salvage a softEnv plate from FE refs when URL classify missed SCENE
 * (OSS urls without scene keywords). Prefer non-turnaround / non-face-sheet plates.
 */
export async function salvageSoftEnvFromFeRefs(input: {
  plates: Array<{ base64: string; roleHint?: string; url?: string }>;
  softEnvNeeded: boolean;
}): Promise<{ softEnvB64?: string; fromIndex?: number }> {
  if (!input.softEnvNeeded || !input.plates.length) return {};
  for (let i = 0; i < input.plates.length; i++) {
    const p = input.plates[i]!;
    const url = String(p.url ?? "");
    if (/char|role|sheet|定妆|cref|CHAR-|三视图|四视图/i.test(url)) continue;
    if (p.roleHint === "char") continue;
    try {
      const raw = String(p.base64 ?? "").replace(/^data:image\/\w+;base64,/, "");
      if (!raw) continue;
      const meta = await sharp(Buffer.from(raw, "base64")).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      // Wide aspect often scene / establishing plate (turnaround sheets also wide — skip extreme strips)
      if (w >= 64 && h >= 64) {
        const ar = w / Math.max(1, h);
        if (ar >= 1.15 && ar < 2.8) {
          return { softEnvB64: raw, fromIndex: i };
        }
      }
    } catch {
      /* continue */
    }
  }
  // Last resort: first plate classified/hinted as scene
  for (let i = 0; i < input.plates.length; i++) {
    const p = input.plates[i]!;
    if (p.roleHint !== "scene") continue;
    const raw = String(p.base64 ?? "").replace(/^data:image\/\w+;base64,/, "");
    if (raw) return { softEnvB64: raw, fromIndex: i };
  }
  // Final: index 0 when ≥2 and softEnv needed (canvas SCENE-first layout)
  if (input.plates.length >= 2) {
    const p = input.plates[0]!;
    if (p.roleHint !== "char") {
      const raw = String(p.base64 ?? "").replace(/^data:image\/\w+;base64,/, "");
      if (raw) return { softEnvB64: raw, fromIndex: 0 };
    }
  }
  return {};
}

export type EventRefRole = "identity" | "propSoft" | "softEnv";

/** Infer roles without mistaking softEnv at index1 for propSoft. */
export function inferEventRefRoles(input: {
  count: number;
  propPresent?: boolean;
  softEnvPresent?: boolean;
  softEnvBakedIntoIdentity?: boolean;
  keepSoftEnvRef?: boolean;
  propRequired?: boolean;
}): EventRefRole[] {
  const n = Math.max(0, Number(input.count) || 0);
  if (n <= 0) return [];
  const roles: EventRefRole[] = ["identity"];
  if (n === 1) return roles;
  const wantProp = Boolean(input.propRequired || input.propPresent);
  const wantSoft =
    Boolean(input.softEnvPresent) ||
    (Boolean(input.keepSoftEnvRef) && !input.softEnvBakedIntoIdentity);
  if (n === 2) {
    if (wantProp && input.propPresent) roles.push("propSoft");
    else if (wantSoft) roles.push("softEnv");
    else if (wantProp) roles.push("propSoft");
    else roles.push("softEnv");
    return roles;
  }
  // n >= 3
  if (wantProp) roles.push("propSoft");
  if (wantSoft || input.keepSoftEnvRef) roles.push("softEnv");
  while (roles.length < n) roles.push(wantSoft ? "softEnv" : "propSoft");
  return roles.slice(0, n);
}

  // Cap event refs. softEnv continuity=must → softEnv-first (doctrine); else identity-first.
export function applyEventRefSlotBudget(input: {
  refs: Array<{ type: "image"; base64: string; role?: EventRefRole }>;
  propRequired: boolean;
  maxSlots?: number;
  /** When true (continuity must), order softEnv→identity→propSoft; cap2 never drops softEnv. */
  softEnvFirst?: boolean;
}): {
  refs: Array<{ type: "image"; base64: string; role: EventRefRole }>;
  roles: EventRefRole[];
  droppedSoftEnv: boolean;
  softEnvBase64?: string;
} {
  const softEnvFirst = Boolean(input.softEnvFirst);
  try {
    const { getDoctrineRefSlotOrder, getDoctrineRefSlotOrderIdentityFirst } =
      require("./designIntentProfile") as typeof import("./designIntentProfile");
    const expected = softEnvFirst ? getDoctrineRefSlotOrder() : getDoctrineRefSlotOrderIdentityFirst();
    if (softEnvFirst && expected[0] !== "softEnv") {
      console.warn("[applyEventRefSlotBudget] doctrine softEnv-first drift", expected);
    }
  } catch {
    /* optional */
  }
  const max = Math.max(1, Number(input.maxSlots ?? 3));
  const byRole = {
    identity: input.refs.find((r) => r.role === "identity") ?? input.refs[0],
    propSoft: input.refs.find((r) => r.role === "propSoft"),
    softEnv: input.refs.find((r) => r.role === "softEnv"),
  };
  const softEnvBase64 = byRole.softEnv?.base64;
  const ordered: Array<{ type: "image"; base64: string; role: EventRefRole }> = [];

  const pushRole = (role: EventRefRole) => {
    const plate = byRole[role];
    if (plate?.base64 && ordered.length < max) {
      ordered.push({ type: "image", base64: plate.base64, role });
      return true;
    }
    return false;
  };

  let droppedSoftEnv = false;
  if (softEnvFirst) {
    // softEnv Must: never drop hall under cap2 — prefer softEnv+identity over prop
    if (byRole.softEnv?.base64) {
      pushRole("softEnv");
    }
    pushRole("identity");
    if (input.propRequired && byRole.propSoft?.base64) {
      if (!pushRole("propSoft") && ordered.length >= max) {
        /* prop deferred — softEnv kept */
      }
    }
    if (byRole.softEnv?.base64 && !ordered.some((r) => r.role === "softEnv")) {
      droppedSoftEnv = true;
    }
  } else {
    pushRole("identity");
    if (input.propRequired && byRole.propSoft?.base64) {
      pushRole("propSoft");
    }
    if (byRole.softEnv?.base64) {
      if (!pushRole("softEnv")) droppedSoftEnv = true;
    }
  }

  // If no roles tagged, fall back to positional
  if (!input.refs.some((r) => r.role) && input.refs.length) {
    const positional: Array<{ type: "image"; base64: string; role: EventRefRole }> = [];
    if (softEnvFirst && input.refs.length >= 2) {
      const softB64 = input.refs[input.refs.length - 1]!.base64;
      positional.push({ type: "image", base64: softB64, role: "softEnv" });
      if (input.refs[0]) positional.push({ type: "image", base64: input.refs[0].base64, role: "identity" });
      if (input.propRequired && input.refs[1] && input.refs.length >= 3 && positional.length < max) {
        positional.push({ type: "image", base64: input.refs[1].base64, role: "propSoft" });
      }
      return {
        refs: positional.slice(0, max),
        roles: positional.slice(0, max).map((r) => r.role),
        droppedSoftEnv: false,
        softEnvBase64: softB64,
      };
    }
    if (input.refs[0]) positional.push({ type: "image", base64: input.refs[0].base64, role: "identity" });
    if (input.propRequired && input.refs[1]) {
      positional.push({ type: "image", base64: input.refs[1].base64, role: "propSoft" });
    }
    const softIdx = input.refs.length >= 3 ? input.refs.length - 1 : input.propRequired ? -1 : 1;
    let softB64: string | undefined;
    if (softIdx >= 0 && input.refs[softIdx]) softB64 = input.refs[softIdx]!.base64;
    if (softB64 && positional.length < max) {
      positional.push({ type: "image", base64: softB64, role: "softEnv" });
    } else if (softB64 && positional.length >= max) {
      droppedSoftEnv = true;
    }
    return {
      refs: positional.slice(0, max),
      roles: positional.slice(0, max).map((r) => r.role),
      droppedSoftEnv,
      softEnvBase64: softB64,
    };
  }
  return {
    refs: ordered.slice(0, max),
    roles: ordered.slice(0, max).map((r) => r.role),
    droppedSoftEnv,
    softEnvBase64,
  };
}

/**
 * Apply budget. SoftEnv continuity policy (common framework):
 * - Prefer independent softEnv slot (maxSlots≥3). NEVER force pixel-bake by default.
 * - Pixel bake (composite SCENE under face) is opt-in only (`allowPixelBake`) — Seedream
 *   copies collage edges as neck-tubes / face patches / white-studio drift.
 * - When softEnv must drop under cap2: honest drop + prompt debt, not Frankenstein bake.
 */
export async function applyContinuityAwareRefBudget(input: {
  refs: Array<{ type: "image"; base64: string; role?: EventRefRole }>;
  propRequired: boolean;
  maxSlots?: number;
  softEnvContinuity?: "must" | "optional" | "none" | null;
  /** Opt-in only. Default false — pixel collage bake increases anatomical drift. */
  allowPixelBake?: boolean;
  /**
   * action_primary + softEnv must: keep softEnv+identity+propSoft at 3 slots;
   * never squeeze-drop prop when prop bytes exist.
   */
  forceThreeSlotProp?: boolean;
}): Promise<{
  refs: Array<{ type: "image"; base64: string; role: EventRefRole }>;
  roles: EventRefRole[];
  droppedSoftEnv: boolean;
  softEnvBakedIntoIdentity: boolean;
  bakeFailed: boolean;
  bakeReason?: string;
  /** True when prop was required but absent/void after budget */
  droppedPropSoft?: boolean;
}> {
  const max = Math.max(1, Number(input.maxSlots ?? 3));
  const continuity = input.softEnvContinuity ?? "none";
  const allowBake = input.allowPixelBake === true;
  const softEnvFirst = continuity === "must";
  const forceThree = Boolean(input.forceThreeSlotProp) && max >= 3;
  // Reject near-black propSoft mid-slot (poisons hall)
  let refsIn = input.refs;
  let propRequired = input.propRequired || forceThree;
  let droppedPropSoft = false;
  const propIdx = refsIn.findIndex((r) => r.role === "propSoft");
  if (propIdx >= 0 && refsIn[propIdx]?.base64) {
    try {
      const voidProp = await isNearBlackVoidPlate(refsIn[propIdx]!.base64!);
      if (voidProp.void) {
        refsIn = refsIn.filter((_, i) => i !== propIdx);
        droppedPropSoft = true;
        if (!forceThree) propRequired = softEnvFirst ? false : propRequired;
      }
    } catch {
      /* keep */
    }
  }
  // Prefer independent softEnv slot when caller allows ≥3
  if (max >= 3) {
    const full = applyEventRefSlotBudget({
      refs: refsIn,
      propRequired,
      maxSlots: 3,
      softEnvFirst,
    });
    if (forceThree) {
      // Never squeeze: keep up to 3; honest if prop missing
      const hasProp = full.roles.includes("propSoft");
      return {
        refs: full.refs.slice(0, 3),
        roles: full.roles.slice(0, 3),
        droppedSoftEnv: full.droppedSoftEnv,
        softEnvBakedIntoIdentity: false,
        bakeFailed: false,
        bakeReason: hasProp
          ? softEnvFirst
            ? "force_three_softEnv_first"
            : "force_three_slot"
          : "force_three_prop_missing",
        droppedPropSoft: !hasProp || droppedPropSoft,
      };
    }
    if (!full.droppedSoftEnv && full.roles.includes("softEnv")) {
      return {
        refs: full.refs.slice(0, 3),
        roles: full.roles.slice(0, 3),
        droppedSoftEnv: false,
        softEnvBakedIntoIdentity: false,
        bakeFailed: false,
        droppedPropSoft: propRequired && !full.roles.includes("propSoft") ? true : droppedPropSoft,
      };
    }
    // softEnv must but missing from refs — return honest without invent
    if (softEnvFirst && full.softEnvBase64 == null && !full.roles.includes("softEnv")) {
      return {
        refs: full.refs.slice(0, 3),
        roles: full.roles.slice(0, 3),
        droppedSoftEnv: false,
        softEnvBakedIntoIdentity: false,
        bakeFailed: false,
        bakeReason: "softEnv_must_but_no_plate_bytes",
        droppedPropSoft: propRequired && !full.roles.includes("propSoft") ? true : droppedPropSoft,
      };
    }
  }
  // Squeeze to ≤2 — softEnv must: softEnv+identity (drop prop), never drop hall
  const tight = applyEventRefSlotBudget({
    refs: refsIn,
    propRequired: softEnvFirst ? false : propRequired,
    maxSlots: Math.min(2, max),
    softEnvFirst,
  });
  if (tight.droppedSoftEnv && continuity === "must" && tight.softEnvBase64 && tight.refs[0]?.base64) {
    if (!allowBake) {
      // Last resort without bake: force softEnv into 2-slot over prop
      const forced = applyEventRefSlotBudget({
        refs: refsIn,
        propRequired: false,
        maxSlots: 2,
        softEnvFirst: true,
      });
      if (forced.roles.includes("softEnv")) {
        return {
          refs: forced.refs,
          roles: forced.roles,
          droppedSoftEnv: false,
          softEnvBakedIntoIdentity: false,
          bakeFailed: false,
          bakeReason: "cap2_softEnv_over_prop",
          droppedPropSoft: true,
        };
      }
      return {
        refs: tight.refs,
        roles: tight.roles,
        droppedSoftEnv: true,
        softEnvBakedIntoIdentity: false,
        bakeFailed: false,
        bakeReason: "pixel_bake_disabled_prefer_independent_or_honest_drop",
        droppedPropSoft: propRequired && !tight.roles.includes("propSoft"),
      };
    }
    const baked = await bakeSoftEnvIntoIdentity({
      identityBase64: tight.refs[0].base64,
      sceneBase64: tight.softEnvBase64,
    });
    if (baked.baked && baked.base64) {
      const next = [...tight.refs];
      next[0] = { type: "image", base64: baked.base64, role: "identity" };
      return {
        refs: next,
        roles: next.map((r) => r.role),
        droppedSoftEnv: false,
        softEnvBakedIntoIdentity: true,
        bakeFailed: false,
        bakeReason: baked.reason,
        droppedPropSoft: true,
      };
    }
    return {
      refs: tight.refs,
      roles: tight.roles,
      droppedSoftEnv: true,
      softEnvBakedIntoIdentity: false,
      bakeFailed: true,
      bakeReason: baked.reason,
      droppedPropSoft: true,
    };
  }
  return {
    refs: tight.refs,
    roles: tight.roles,
    droppedSoftEnv: tight.droppedSoftEnv,
    softEnvBakedIntoIdentity: false,
    bakeFailed: false,
    droppedPropSoft: propRequired && !tight.roles.includes("propSoft") ? true : droppedPropSoft,
  };
}

/** Egress 图N binding for event shots (generic slots, no shot names). */
export function buildEventRefOrdinalBinding(input: {
  roles: EventRefRole[];
  propRequired?: boolean;
  thinSheets?: boolean;
  softEnvBakedIntoIdentity?: boolean;
  /** bend_pickup → ground prop soft; cheek contact → thinSheets sweep */
  poseOccupancy?: string | null;
  plateMode?: string | null;
  /** When true, later propSoft slots bind as skirt/hem fragment (not SCENE) */
  fragmentPlateHung?: boolean;
}): string {
  const bend =
    String(input.poseOccupancy ?? "") === "bend_pickup" ||
    String(input.plateMode ?? "") === "object_inset";
  const cheek =
    !bend &&
    (input.thinSheets === true || String(input.plateMode ?? "") === "cheek_sweep");
  const parts: string[] = [];
  let propSoftSeen = 0;
  for (let i = 0; i < input.roles.length; i++) {
    const n = i + 1;
    const role = input.roles[i];
    if (role === "identity") {
      parts.push(
        input.softEnvBakedIntoIdentity
          ? `图${n}=身份脸+软环境烘焙（浅景深殿内氛围，禁止手持物抢本镜事件，禁止灰棚）`
          : bend
            ? `图${n}=身份真脸定妆（锁古装角色脸型/发饰，忽略其灰棚/白棚底，禁止全身立姿四视图抢弯腰占位，禁止手持卡片）`
            : `图${n}=身份脸（仅定妆脸型/服装，忽略其灰棚底，禁止手持物抢本镜事件）`,
      );
    } else if (role === "propSoft") {
      propSoftSeen += 1;
      const asFragment =
        input.fragmentPlateHung === true &&
        (propSoftSeen > 1 || String(input.plateMode ?? "") === "fragment_sil");
      parts.push(
        asFragment
          ? `图${n}=裙摆/衣角碎片浅景深（非整殿 SCENE，禁止建立镜头抢戏）`
          : bend
            ? `图${n}=本镜触地单纸软板（地面唯一一张休书/薄纸于主手近地捡拾；纸面墨迹题名可辨；禁止第二张散落纸、禁止胸前标牌/手提袋/浮空贴纸、禁止举卡展示）`
            : cheek
              ? `图${n}=事件道具几何软板（匿名颊廓+展开薄纸角划过触肤，禁止手持卡片/书本卷棒/挡脸举物）`
              : `图${n}=本镜事件道具软板（薄件入画于触点，禁止手持卡片挡脸，勿仅写清晰入画）`,
      );
    } else if (role === "softEnv") {
      parts.push(
        bend
          ? `图${n}=主场景殿内（木作/烛火须入画可辨）；道具纸仅取触地单纸槽；禁止场景另绘第二张纸/散落纸；禁止复制图1灰棚/白棚为成图背景；禁止建立镜头抢动作中景`
          : input.fragmentPlateHung
            ? `图${n}=裙摆/衣角碎片氛围（浅景深虚化，禁止整殿建立镜头抢戏）`
            : `图${n}=主场景软环境（须入画可辨）；禁止复制图1灰棚/白棚为成图背景；禁止建立镜头抢戏`,
      );
    }
  }
  if (!parts.length && input.propRequired) {
    return bend
      ? "参考顺序：身份上身→触地道具→裙摆碎片（若有）"
      : "参考顺序：身份脸→事件道具→软环境（若有）";
  }
  return parts.length ? `参考绑定：${parts.join("；")}` : "";
}

/** Assert event props present before vendor. */
export function assertEventRefContract(input: {
  roles: EventRefRole[];
  propRequired: boolean;
  softEnvRequired?: boolean;
}): { ok: boolean; code?: string; message?: string; missing: string[] } {
  const missing: string[] = [];
  if (input.propRequired && !input.roles.includes("propSoft")) missing.push("propSoft");
  if (input.softEnvRequired && !input.roles.includes("softEnv")) missing.push("softEnv");
  if (missing.includes("propSoft")) {
    return {
      ok: false,
      code: "DEX-PROP-PLATE-MISSING",
      message: "接触/道具事件缺道具参考槽（propSoft）；禁止仅定妆+场景开生成",
      missing,
    };
  }
  return { ok: true, missing };
}
