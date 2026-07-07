import { createHash } from "crypto";
import type { DramaPack } from "./schema";
import type { PackExtensionsContext } from "./packExtensionsResolver";
import { resolveBaseModel } from "./characterAssetUtils";

export type DeriveDomain =
  | "faceAnchor"
  | "stageWardrobe"
  | "productionColor"
  | "productionMotion"
  | "productionPerformance"
  | "continuity"
  | "personality";

export type PackDomainHashes = Record<DeriveDomain, string>;

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function computePackDomainHashes(
  pack: DramaPack,
  extensions?: PackExtensionsContext,
): PackDomainHashes {
  const spec = pack.productionSpec ?? {};
  const charAssets = extensions?.characterAssets ?? {};

  const faceParts: string[] = [];
  for (const [code, entry] of Object.entries(charAssets)) {
    if (!code.startsWith("CHAR-")) continue;
    const bm = resolveBaseModel(entry as Record<string, unknown>);
    if (bm?.["锁定描述"]) faceParts.push(`${code}:${bm["锁定描述"]}`);
    const fv = (entry as Record<string, unknown>)["四视图"] as Record<string, string> | undefined;
    if (fv?.["完整提示词"]) faceParts.push(`${code}:fv:${fv["完整提示词"].slice(0, 200)}`);
  }

  const stageParts: string[] = [];
  for (const [code, entry] of Object.entries(charAssets)) {
    for (const key of Object.keys(entry as object)) {
      if (key.startsWith("分镜引用prompt_")) stageParts.push(`${code}:${key}:${(entry as Record<string, string>)[key]}`);
    }
  }

  return {
    faceAnchor: hashText(faceParts.sort().join("|")),
    stageWardrobe: hashText(stageParts.sort().join("|")),
    productionColor: hashText(
      JSON.stringify({
        color: spec.colorToneMapping,
        scene: spec.sceneColorLock ?? spec.sceneDesign,
      }),
    ),
    productionMotion: hashText(JSON.stringify({ tr: spec.transitionRules, cam: spec.cameraAnchor })),
    productionPerformance: hashText(
      JSON.stringify({ map: spec.emotionPerformanceMapping, base: spec.performanceBaseline }),
    ),
    continuity: hashText(JSON.stringify(extensions?.continuityTracking ?? {})),
    personality: hashText(
      Object.entries(charAssets)
        .map(([c, e]) => `${c}:${JSON.stringify((e as Record<string, unknown>)["L6-personality"] ?? "")}`)
        .join("|"),
    ),
  };
}

export function computePackContentHash(pack: DramaPack, extensions?: PackExtensionsContext): string {
  const domains = computePackDomainHashes(pack, extensions);
  const meta = `${pack.meta.lastUpdated ?? ""}:${pack.episodes.length}:${pack.episodes.reduce((n, e) => n + e.storyboard.length, 0)}`;
  return hashText(meta + Object.values(domains).join(":"));
}

export function extractLockFaceKeywords(lockDesc: string): string[] {
  const kws: string[] = [];
  if (/mole|泪痣/.test(lockDesc)) kws.push("mole");
  if (/asymmetr|不对称/.test(lockDesc)) kws.push("asymmetry");
  if (/jawline|下颌/.test(lockDesc)) kws.push("jawline");
  if (/pore|毛孔/.test(lockDesc)) kws.push("pores");
  if (/dark circle|黑眼圈/.test(lockDesc)) kws.push("dark circles");
  const words = lockDesc.match(/[a-zA-Z]{4,}/g) ?? [];
  return [...new Set([...kws, ...words.slice(0, 5).map((w) => w.toLowerCase())])];
}

export type StalePromptReport = {
  storyboardIndex: number;
  domain: DeriveDomain;
  missingKeywords: string[];
};

export function detectStaleFacePrompt(
  imagePrompt: string,
  lockDesc: string,
  shotIndex: number,
): StalePromptReport | null {
  const keywords = extractLockFaceKeywords(lockDesc);
  const missing = keywords.filter((k) => !imagePrompt.toLowerCase().includes(k.toLowerCase()));
  if (missing.length >= 2) {
    return { storyboardIndex: shotIndex, domain: "faceAnchor", missingKeywords: missing };
  }
  return null;
}

export function computeVersionTrackingHash(input: unknown): string {
  const vt = (input as Record<string, unknown> | undefined)?.versionTracking;
  if (!vt) return "";
  return hashText(JSON.stringify(vt));
}

export function domainsNeedingStoryboardRecompose(changed: DeriveDomain[]): boolean {
  const storyboardDomains: DeriveDomain[] = [
    "faceAnchor",
    "stageWardrobe",
    "productionColor",
    "productionMotion",
    "productionPerformance",
    "continuity",
    "personality",
  ];
  return changed.some((d) => storyboardDomains.includes(d));
}

export function diffDomainHashes(
  prev: PackDomainHashes | undefined,
  next: PackDomainHashes,
): DeriveDomain[] {
  if (!prev) return Object.keys(next) as DeriveDomain[];
  return (Object.keys(next) as DeriveDomain[]).filter((k) => prev[k] !== next[k]);
}
