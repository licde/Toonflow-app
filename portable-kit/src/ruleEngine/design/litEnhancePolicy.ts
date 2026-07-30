/**
 * Literary enhance rollout — VisBeat-parity modes (off / shadow / canary / enforce).
 * Default enforce: design Exit hard-blocks lit debt (intelligent HQ).
 * Explicit shadow = observe-only; import soft-track never Exit-hard-blocks.
 */
import { loadLiteraryIntentDoctrine } from "../compilers/stillLiteraryIntentSsot";

export type LitEnhanceMode = "off" | "shadow" | "canary" | "enforce";

type RolloutCfg = {
  metaKey?: string;
  defaultMode?: LitEnhanceMode;
  modes?: LitEnhanceMode[];
  canaryPercentMetaKey?: string;
};

function loadRollout(): RolloutCfg {
  const doctrine = loadLiteraryIntentDoctrine() as {
    literaryDetailQuality?: { pillarsLitEnhanceV1?: string; rollout?: RolloutCfg };
  };
  return doctrine.literaryDetailQuality?.rollout ?? {
    metaKey: "pillarsLitEnhanceV1",
    defaultMode: "enforce",
    modes: ["off", "shadow", "canary", "enforce"],
    canaryPercentMetaKey: "pillarsLitEnhanceCanaryPercent",
  };
}

function normalizeMode(raw: unknown, fallback: LitEnhanceMode): LitEnhanceMode {
  const s = String(raw ?? "").toLowerCase();
  if (s === "off" || s === "shadow" || s === "canary" || s === "enforce") return s;
  return fallback;
}

/** Active import softFill demote only — sticky importOkNotExitPass ≠ forever soft design. */
export function isImportLitSoftTrack(meta?: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  // importOkNotExitPass alone is warehouse≠exit marker; design Exit / compose HQ must still hard-block
  return Boolean(meta.importTrack || meta.importSoftLit || meta.importHealDemote);
}

/** Resolve enhance mode from plan/meta (meta overrides doctrine default). */
export function resolveLitEnhanceMode(meta?: Record<string, unknown> | null): LitEnhanceMode {
  const rollout = loadRollout();
  const key = rollout.metaKey ?? "pillarsLitEnhanceV1";
  const fallback = normalizeMode(rollout.defaultMode, "enforce");
  const fromMeta = meta?.[key] ?? meta?.pillarsLitEnhanceV1;
  let mode = normalizeMode(fromMeta, fallback);

  if (mode === "canary") {
    const pctKey = rollout.canaryPercentMetaKey ?? "pillarsLitEnhanceCanaryPercent";
    const pct = Number(meta?.[pctKey] ?? 10);
    const bucket = Number(meta?.projectId ?? meta?.canaryBucket ?? 0) % 100;
    if (!(pct > 0 && bucket < pct)) mode = "shadow";
  }
  return mode;
}

/** Shadow/canary/enforce allow diagnose + enhance CTA; off disables. */
export function isLitEnhanceDiagnoseEnabled(meta?: Record<string, unknown> | null): boolean {
  return resolveLitEnhanceMode(meta) !== "off";
}

/**
 * Design Exit hard-block when enforce/canary (default enforce).
 * Explicit shadow = soft warn only; import soft-track never hard-blocks.
 */
export function isLitEnhanceDesignHardBlock(meta?: Record<string, unknown> | null): boolean {
  if (isImportLitSoftTrack(meta)) return false;
  const m = resolveLitEnhanceMode(meta);
  if (m === "off" || m === "shadow") return false;
  return m === "enforce" || m === "canary";
}

/** Apply soft-fill / auto enhance write allowed when not off. */
export function isLitEnhanceWriteEnabled(meta?: Record<string, unknown> | null): boolean {
  const m = resolveLitEnhanceMode(meta);
  return m === "shadow" || m === "canary" || m === "enforce";
}
