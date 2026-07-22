/**
 * Emotion-norm SSOT — L1 core contract + L2 profile packs.
 * Switch norms via activeProfileId; do not rewrite dialogue text.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type EmotionPhase = "suppress" | "signal" | "burst" | "release" | "hook";

export type EmotionNormState = {
  activeProfileId: string;
  normVersion: string;
  structureStale?: boolean;
  updatedAt?: number;
};

export type IntensityBand = {
  min: number;
  max: number;
  clusterPolicy: string;
  shotSizeBias: string;
  speakMotion: string;
  reactMotion: string;
  soundIntent: string;
  burstQuotaPerScene?: number;
};

export type EmotionStrategy = {
  clusterPolicy: string;
  shotSizeBias: string;
  speakMotion: string;
  reactMotion: string;
  soundIntent: string;
  avStyle: string;
  colorMood: string;
  weapons: string[];
  profileId: string;
};

type EmotionDrivenDesign = {
  normVersion: string;
  emotionPhases: string[];
  authorRights: {
    machineMayPatch: string[];
    machineMustNotRewrite: string[];
  };
  intensityBands: IntensityBand[];
  dialogueCamPolicy: { speakMustStatic: boolean; reactMayPush: boolean };
  defaultProfileId: string;
};

type ProfileDef = {
  label?: string;
  avStyle?: string;
  colorMood?: string;
  paletteHints?: string[];
  weaponIds?: string[];
  shotSizeBias?: string;
  reactMotionDefault?: string;
  intensityOverrides?: Partial<IntensityBand> & Record<string, unknown>;
};

type ProfilesFixture = {
  version?: string;
  profiles: Record<string, ProfileDef>;
  matrixEmotionLogicMap?: Record<string, string>;
};

type StylePacksFixture = {
  packs: Record<
    string,
    {
      shotSizeBias?: string[];
      allowedMotions?: string[];
      transitionBias?: string[];
      dialogueCamPolicy?: string;
      audioMoodHints?: string[];
      fxIntentCeiling?: string;
    }
  >;
};

type WeaponLib = {
  weapons: Record<string, { id: string; profiles?: string[]; label?: string }>;
};

let _design: EmotionDrivenDesign | null = null;
let _profiles: ProfilesFixture | null = null;

export function loadEmotionDrivenDesign(): EmotionDrivenDesign {
  if (_design) return _design;
  _design = readFixtureJson<EmotionDrivenDesign>("emotion_driven_design.json", {
    normVersion: "1.0.0",
    emotionPhases: ["suppress", "signal", "burst", "release", "hook"],
    authorRights: {
      machineMayPatch: ["sidecar", "SB_structure", "EN_prompts", "intensity_defaults", "cluster_expand"],
      machineMustNotRewrite: ["scriptItem_dialogue_text", "plot_wording"],
    },
    intensityBands: [],
    dialogueCamPolicy: { speakMustStatic: true, reactMayPush: true },
    defaultProfileId: "generic",
  });
  return _design;
}

export function currentNormVersion(): string {
  return loadEmotionDrivenDesign().normVersion || "1.0.0";
}

export function loadEmotionNormProfiles(): ProfilesFixture {
  if (_profiles) return _profiles;
  _profiles = readFixtureJson<ProfilesFixture>("emotion_norm_profiles.json", {
    profiles: { generic: { avStyle: "generic", colorMood: "neutral", weaponIds: [] } },
    matrixEmotionLogicMap: {},
  });
  return _profiles;
}

export function loadStylePack(profileId: string) {
  const packs = readFixtureJson<StylePacksFixture>("av_emotion_style_packs.json", { packs: {} });
  return packs.packs[profileId] ?? packs.packs.generic ?? { allowedMotions: ["static"], shotSizeBias: ["中景"] };
}

export function loadWeaponLibrary(): WeaponLib {
  return readFixtureJson<WeaponLib>("viral_av_weapon_library.json", { weapons: {} });
}

export function loadDecompositionRegistry() {
  return readFixtureJson<{ dimensions?: { id: string; drivenBy: string }[] }>("decomposition_registry.json", {
    dimensions: [],
  });
}

export function resolveIntensityBand(intensity: number, profileId?: string): IntensityBand {
  const design = loadEmotionDrivenDesign();
  const n = Number.isFinite(intensity) ? intensity : 4;
  const band =
    design.intensityBands.find((b) => n >= b.min && n <= b.max) ??
    design.intensityBands[design.intensityBands.length - 1] ?? {
      min: 0,
      max: 10,
      clusterPolicy: "speak_only",
      shotSizeBias: "中景",
      speakMotion: "static",
      reactMotion: "static",
      soundIntent: "ambient",
    };
  const profiles = loadEmotionNormProfiles();
  const pid = profileId && profiles.profiles[profileId] ? profileId : design.defaultProfileId;
  const prof = profiles.profiles[pid];
  if (!prof) return { ...band };
  return {
    ...band,
    shotSizeBias: prof.shotSizeBias ?? band.shotSizeBias,
    reactMotion: prof.reactMotionDefault ?? band.reactMotion,
    ...(prof.intensityOverrides ?? {}),
  };
}

export function resolveEmotionStrategy(input: {
  intensity: number;
  profileId?: string;
  functions?: string[];
}): EmotionStrategy {
  const profiles = loadEmotionNormProfiles();
  const design = loadEmotionDrivenDesign();
  const pid =
    input.profileId && profiles.profiles[input.profileId]
      ? input.profileId
      : design.defaultProfileId;
  const prof = profiles.profiles[pid] ?? profiles.profiles.generic ?? {};
  const band = resolveIntensityBand(input.intensity, pid);
  let clusterPolicy = band.clusterPolicy;
  const formula = readFixtureJson<{
    defaultPolicyByFunctions?: Record<string, string>;
    longLinePolicy?: string;
  }>("dialogue_cluster_formula.json", {});
  for (const fn of input.functions ?? []) {
    const mapped = formula.defaultPolicyByFunctions?.[fn];
    if (mapped) {
      clusterPolicy = mapped;
      break;
    }
  }
  const weapons = (prof.weaponIds ?? []).filter(Boolean);
  return {
    clusterPolicy,
    shotSizeBias: band.shotSizeBias,
    speakMotion: band.speakMotion || "static",
    reactMotion: band.reactMotion,
    soundIntent: band.soundIntent,
    avStyle: prof.avStyle ?? pid,
    colorMood: prof.colorMood ?? "neutral",
    weapons,
    profileId: pid,
  };
}

export function getEmotionNormFromPlan(plan: Record<string, unknown> | null | undefined): EmotionNormState {
  const design = loadEmotionDrivenDesign();
  const planData = (plan?.planData as Record<string, unknown> | undefined) ?? undefined;
  const raw =
    (planData?.emotionNorm as EmotionNormState | undefined) ??
    (plan?._emotionNorm as EmotionNormState | undefined) ??
    null;
  return {
    activeProfileId: raw?.activeProfileId || design.defaultProfileId || "generic",
    normVersion: raw?.normVersion || design.normVersion || "1.0.0",
    structureStale: Boolean(raw?.structureStale),
    updatedAt: raw?.updatedAt,
  };
}

export function setEmotionNormOnPlan(
  plan: Record<string, unknown>,
  opts: { activeProfileId: string; markStale?: boolean },
): EmotionNormState {
  const prev = getEmotionNormFromPlan(plan);
  const changed = prev.activeProfileId !== opts.activeProfileId;
  const next: EmotionNormState = {
    activeProfileId: opts.activeProfileId,
    normVersion: currentNormVersion(),
    structureStale: opts.markStale !== false && changed ? true : prev.structureStale,
    updatedAt: Date.now(),
  };
  if (!plan.planData || typeof plan.planData !== "object") {
    plan.planData = {};
  }
  (plan.planData as Record<string, unknown>).emotionNorm = next;
  plan._emotionNorm = next;
  return next;
}

/** Map adaptation matrix 「情感逻辑」 choice → emotionNorm profile id. */
export function mapMatrixEmotionLogicToProfile(lockedChoices?: Record<string, string> | null): string | null {
  if (!lockedChoices) return null;
  const map = loadEmotionNormProfiles().matrixEmotionLogicMap ?? {};
  const logic =
    lockedChoices["情感逻辑"] ??
    lockedChoices.emotionLogic ??
    lockedChoices.emotion_logic ??
    "";
  if (!logic) return null;
  const key = String(logic).toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k) || logic.includes(k)) return v;
  }
  if (/甜/.test(logic)) return "sweet";
  if (/虐/.test(logic)) return "abuse_romance";
  if (/爽|战/.test(logic)) return "war_god";
  if (/悬/.test(logic)) return "suspense";
  return null;
}

export function machineMayRewriteDialogue(): boolean {
  return false;
}

export function assertDialogueUnchanged(before: string[], after: string[]): boolean {
  if (before.length !== after.length) return false;
  return before.every((t, i) => t === after[i]);
}

export function clearEmotionNormCache(): void {
  _design = null;
  _profiles = null;
}
