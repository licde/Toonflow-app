import type { DramaPack } from "./schema";
import type { PackExtensionsContext } from "./packExtensionsResolver";
import type { CodeIndex } from "./promptComposer";
import type { DramaPackStoryboardShot } from "./schema";
import type { ArtStyleProfile } from "./artStyleProfiles";
import { resolveArtStyleProfile } from "./artStyleProfiles";

type ColorToneEntry = { colorTemp?: number | string; tone?: string; saturation?: number };
type CameraAnchorEntry = { name?: string; height?: string; anchor?: string };

/** 单集 compose 共享上下文：预索引 + anchor 缓存，避免 28 镜重复查表 */
export type ComposeContext = {
  pack: DramaPack;
  index: CodeIndex;
  extensions?: PackExtensionsContext;
  artStyle: string;
  profile: ArtStyleProfile;
  colorToneMap: Map<string, ColorToneEntry>;
  cameraAnchorMap: Map<string, CameraAnchorEntry>;
  anchorTranslationCache: Map<string, string>;
};

export function createComposeContext(
  pack: DramaPack,
  index: CodeIndex,
  artStyle: string,
  extensions?: PackExtensionsContext,
): ComposeContext {
  const spec = pack.productionSpec ?? {};
  const colorToneMap = new Map<string, ColorToneEntry>();
  const colorMapping = spec.colorToneMapping as Record<string, ColorToneEntry> | undefined;
  if (colorMapping) {
    for (const [k, v] of Object.entries(colorMapping)) colorToneMap.set(k, v);
  }

  const cameraAnchorMap = new Map<string, CameraAnchorEntry>();
  const cameraAnchor = spec.cameraAnchor as Record<string, CameraAnchorEntry> | undefined;
  if (cameraAnchor) {
    for (const [k, v] of Object.entries(cameraAnchor)) cameraAnchorMap.set(k, v);
  }

  return {
    pack,
    index,
    extensions,
    artStyle,
    profile: resolveArtStyleProfile(pack.meta.artStyleHint || artStyle),
    colorToneMap,
    cameraAnchorMap,
    anchorTranslationCache: new Map(),
  };
}

export type RuleShotContext = {
  ctx: ComposeContext;
  shot: DramaPackStoryboardShot;
  shotIndex: number;
  prevIntensity?: number;
  mode: "merge" | "rebuild";
};
