/**
 * TouchKernel — vendor handoff: OSS parity, AR SSOT, strip tokens.
 * resolveMediaUrl is the SSOT contract name for picker + bottom-bar URL resolve
 * (FE imageListCache.resolveUrls / resolveUrlSync implement the same semantics).
 */
import { applyProjectAspectRatio, touchPromptForVendor } from "../compilers/vendorPromptAdapter";
import {
  sharedMediaPreflight,
  mediaPreflightBlocked,
  requirePublicOssUrl,
  type MediaTouchCheck,
} from "../compilers/mediaTouchParity";
import type { TouchPreflightResult } from "./types";

export function touchForVendor(
  prompt: string,
  projectVideoRatio?: string | null,
  opts?: { pureProp?: boolean },
): TouchPreflightResult {
  const touched = applyProjectAspectRatio(prompt, projectVideoRatio, opts);
  return {
    ok: true,
    vendorPrompt: touched.vendorPrompt,
    crefs: touched.crefs,
    srefs: touched.srefs,
    aspectRatio: touched.aspectRatio,
  };
}

export function preflightTouchMedia(paths: (string | null | undefined)[], opts?: {
  forceAudio?: boolean;
  nativeAudio?: boolean;
  requireAtLeastOne?: boolean;
}): { ok: boolean; checks: MediaTouchCheck[] } {
  const checks = sharedMediaPreflight({
    paths,
    forceAudio: opts?.forceAudio,
    nativeAudio: opts?.nativeAudio,
    requireAtLeastOne: opts?.requireAtLeastOne,
  });
  return { ok: !mediaPreflightBlocked(checks), checks };
}

/** Media ref for unified picker / bottom-bar URL resolution contract. */
export type MediaUrlRef = { id: number; sources: string; fallbackPath?: string };

/**
 * resolveMediaUrl — TouchKernel SSOT for public display URL.
 * Prefers resolver map (from workbench/getFileUrl batch), else fallbackPath,
 * else empty (caller must BLOCK oss_ref_missing / show placeholder).
 * FE: imageListCache.resolveUrlSync implements the same contract.
 */
export function resolveMediaUrl(
  ref: MediaUrlRef,
  urlMap: Record<string, string> = {},
): string {
  const key = `${ref.id ?? ""}:${ref.sources ?? ""}`;
  if (urlMap[key]) return urlMap[key];
  const path = (ref.fallbackPath ?? "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return path;
  /* relative /oss path — requirePublicOssUrl may still fail vendor touch */
  return path;
}

/** Batch resolve — same keying as FE resolveUrls. */
export function resolveMediaUrls(
  refs: MediaUrlRef[],
  urlMap: Record<string, string> = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ref of refs) {
    const key = `${ref.id ?? ""}:${ref.sources ?? ""}`;
    out[key] = resolveMediaUrl(ref, urlMap);
  }
  return out;
}

export { requirePublicOssUrl, touchPromptForVendor };
