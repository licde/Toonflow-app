/**
 * ShotModalityIntent — literary-led modality contract SSOT.
 * VD / doctrine declared slots beat composition heuristics; heuristics only fill undeclared slots.
 */
import { classifyStillIntent, type StillIntentClass } from "./stillIntentPolicy";
import {
  resolveStillBgPolicy,
  type SoftEnvContinuity,
  type StillBgPolicyResult,
} from "./stillBgPolicy";
import { matchContactEventVd, type ContactEventMatch } from "./contactEventPolicy";

export type BgMode = "keep_plate" | "soft_env" | "atmosphere_only";

export type ShotModalityIntent = {
  stillClass: StillIntentClass | string;
  videoClassHint?: string;
  roleScope: {
    femaleLead?: string;
    secondaryRole?: string;
    propOwner?: string;
    scopeMode: "single_subject" | "lead_plus_support" | "ensemble";
  };
  primaryVisualObjective: "contact_geom" | "prop_readable" | "identity_first" | "scene_keep" | "empty_scene" | "action_primary";
  secondaryCharacterBudget: "none" | "hands_only" | "upper_body" | "ensemble" | "skirt_blur";
  bgMode: BgMode;
  /** Drop establishing SCENE dominance (face CU / seating) */
  excludeSceneEstablishing: boolean;
  /** Keep one soft env plate when workflow has SCENE link */
  keepSoftEnvRef: boolean;
  /** Continuity: must survive via own slot or bake into identity */
  softEnvContinuity: SoftEnvContinuity;
  /** Workflow / package has SCENE linked */
  hasSceneLink: boolean;
  sceneRefPolicy: "keep" | "soft_env" | "drop";
  contact?: ContactEventMatch | null;
  atmosphere?: string;
  lipMode?: "dialogue_lip" | "ambient" | "os_or_ambient" | "none";
  recipeMode?: string;
  reasons: string[];
  bgPolicy: StillBgPolicyResult;
};

export type ShotModalityIntentInput = {
  visualDescription?: string | null;
  shotSize?: string | null;
  characterNames?: string[] | null;
  /** Explicit establishing from design */
  sceneEstablishingHint?: boolean | null;
  /** SCENE node / sref / sceneCode present on shot */
  hasSceneLink?: boolean | null;
  /** Persist stillIntentClass if already classified */
  stillIntentClass?: string | null;
  dialogueLines?: string[] | null;
  /** shotDesign.cameraAnchor.bgBlur */
  bgBlur?: boolean | null;
};

/** Infer SCENE-* from prompt / sref tokens (canvas parity with storyboard link). */
export function inferSceneCodeFromText(text?: string | null): string | null {
  const s = String(text ?? "");
  const m = s.match(/--sref\s+(SCENE-[A-Za-z0-9]+)/i) || s.match(/\b(SCENE-[A-Za-z0-9]+)\b/i);
  return m?.[1]?.toUpperCase() ?? null;
}

/** Unified hasSceneLink for canvas / batch / compose (code, assets, or sref tokens). */
export function inferHasSceneLink(input: {
  sceneCode?: string | null;
  sceneName?: string | null;
  sceneAssets?: Array<{ code?: string | null; name?: string | null }> | null;
  promptText?: string | null;
}): boolean {
  if (String(input.sceneCode ?? "").trim()) return true;
  if (String(input.sceneName ?? "").trim()) return true;
  if ((input.sceneAssets ?? []).some((s) => String(s?.code ?? "").trim() || String(s?.name ?? "").trim())) {
    return true;
  }
  const blob = String(input.promptText ?? "");
  return /--sref\s+SCENE-/i.test(blob) || /\bSCENE-[A-Za-z0-9]+\b/i.test(blob);
}

/**
 * Derive modality intent. Literary establishing / atmosphere / contact from VD beat heuristics.
 */
export function deriveShotModalityIntent(input: ShotModalityIntentInput): ShotModalityIntent {
  const reasons: string[] = [];
  const vd = String(input.visualDescription ?? "");
  const hasSceneLink = Boolean(input.hasSceneLink);
  const stillCls = classifyStillIntent({
    visualDescription: vd,
    shotSize: input.shotSize,
    characterNames: input.characterNames ?? undefined,
  });
  const stillClass =
    input.stillIntentClass && input.stillIntentClass !== "unknown"
      ? input.stillIntentClass
      : stillCls.intentClass;
  if (input.stillIntentClass && input.stillIntentClass !== "unknown") {
    reasons.push(`persist:${input.stillIntentClass}`);
  } else {
    reasons.push(...stillCls.reasons.map((r) => `still:${r}`));
  }

  const names = (input.characterNames ?? []).map((s) => String(s).trim()).filter(Boolean);
  let femaleLead = names[0];
  try {
    const { pickVdLiteraryPrimary } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    const lit = pickVdLiteraryPrimary(vd, names);
    if (lit) femaleLead = lit;
  } catch {
    /* names[0] */
  }
  const secondaryRole =
    names.length >= 2 ? names.find((n) => n !== femaleLead) ?? names[1] : undefined;

  const bgPolicy = resolveStillBgPolicy({
    description: vd,
    characterNames: input.characterNames,
    shotSize: input.shotSize,
    sceneEstablishingHint: input.sceneEstablishingHint,
    hasSceneLink,
    bgBlur: input.bgBlur,
  });

  const bgMode = bgPolicy.bgMode;
  const excludeSceneEstablishing = bgPolicy.excludeScene;
  const keepSoftEnvRef = bgPolicy.keepSoftEnvRef;
  const softEnvContinuity = bgPolicy.softEnvContinuity;
  const sceneRefPolicy: ShotModalityIntent["sceneRefPolicy"] =
    bgMode === "keep_plate" ? "keep" : keepSoftEnvRef ? "soft_env" : "drop";
  reasons.push(`bg:${bgMode}`);
  if (softEnvContinuity === "must") reasons.push("softEnvContinuity:must");

  const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(vd)?.[0];
  if (atm) reasons.push(`atmosphere:${atm}`);

  let contact: ContactEventMatch | null = null;
  try {
    contact = matchContactEventVd(vd);
    if (contact?.isContactEvent) reasons.push(`contact:${contact.propClassId ?? "hit"}`);
  } catch {
    contact = null;
  }

  const hasDial = (input.dialogueLines ?? []).some((t) => String(t ?? "").trim());
  let lipMode: ShotModalityIntent["lipMode"] = "none";
  if (/（\s*OS\s*）|\bOS\b|画外|旁白/.test(vd)) lipMode = "os_or_ambient";
  else if (hasDial) lipMode = "dialogue_lip";
  else lipMode = "ambient";

  const actionPrimaryBeat =
    !contact?.isContactEvent &&
    /弯腰|捡起|捡|捏紧|指节|俯身/.test(vd) &&
    !/特写|ecu|\bcu\b/i.test(String(input.shotSize ?? ""));

  let designProfile: import("./designIntentProfile").DesignIntentProfile | null = null;
  try {
    const { deriveDesignIntentProfile } =
      require("./designIntentProfile") as typeof import("./designIntentProfile");
    designProfile = deriveDesignIntentProfile({
      visualDescription: vd,
      shotSize: input.shotSize,
      characterNames: input.characterNames,
    });
    reasons.push(...designProfile.reasons.map((r) => `dip:${r}`));
  } catch {
    designProfile = null;
  }

  let bgFragmentSkirt = Boolean(designProfile?.classes.includes("bg_fragment"));
  if (!bgFragmentSkirt) {
    try {
      const { resolveBgFragment } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      bgFragmentSkirt = Boolean(
        resolveBgFragment({
          visualDescription: vd,
          background: undefined,
        }).stripFullSecondary,
      );
    } catch {
      /* optional */
    }
  }

  const primaryVisualObjective: ShotModalityIntent["primaryVisualObjective"] =
    designProfile?.primaryObjective ??
    (contact?.isContactEvent
      ? "contact_geom"
      : stillClass === "hand_cu_explicit" || stillClass === "prop_cu"
        ? "prop_readable"
        : actionPrimaryBeat
          ? "action_primary"
          : bgMode === "keep_plate"
            ? "scene_keep"
            : stillClass === "empty_or_os"
              ? "empty_scene"
              : "identity_first");
  const secondaryCharacterBudget: ShotModalityIntent["secondaryCharacterBudget"] =
    designProfile?.secondaryBudget === "skirt_blur"
      ? "skirt_blur"
      : bgFragmentSkirt || (names.length <= 1 && /裙摆|衣角|袖缘/.test(vd))
        ? names.length <= 1 && !/裙摆|衣角|袖缘/.test(vd)
          ? "none"
          : "skirt_blur"
        : names.length <= 1
          ? "none"
          : primaryVisualObjective === "contact_geom" ||
              primaryVisualObjective === "action_primary" ||
              /特写|近景|ecu|\bcu\b/i.test(String(input.shotSize ?? ""))
            ? "hands_only"
            : names.length === 2
              ? "upper_body"
              : "ensemble";
  const roleScope: ShotModalityIntent["roleScope"] = {
    femaleLead,
    secondaryRole,
    propOwner: contact?.isContactEvent ? secondaryRole ?? femaleLead : femaleLead,
    scopeMode:
      secondaryCharacterBudget === "skirt_blur" || names.length <= 1
        ? "single_subject"
        : names.length === 2
          ? "lead_plus_support"
          : "ensemble",
  };
  reasons.push(`objective:${primaryVisualObjective}`);
  reasons.push(`secondaryBudget:${secondaryCharacterBudget}`);

  return {
    stillClass,
    roleScope,
    primaryVisualObjective,
    secondaryCharacterBudget,
    bgMode,
    excludeSceneEstablishing,
    keepSoftEnvRef,
    softEnvContinuity,
    hasSceneLink,
    sceneRefPolicy,
    contact,
    atmosphere: atm ?? undefined,
    lipMode,
    recipeMode: stillCls.recipeMode,
    reasons,
    bgPolicy,
  };
}

/** Compose/reference opts derived from modality intent (single source). */
export function modalityRefOpts(intent: ShotModalityIntent): {
  excludeScene: boolean;
  softEnvRef: boolean;
  omitSrefToken: boolean;
  secondaryCharacterBudget?: ShotModalityIntent["secondaryCharacterBudget"];
} {
  return {
    excludeScene: intent.excludeSceneEstablishing,
    softEnvRef: intent.keepSoftEnvRef,
    omitSrefToken: intent.bgPolicy.omitSrefToken,
    secondaryCharacterBudget: intent.secondaryCharacterBudget,
  };
}
