import type { ResolvedConfig } from "../types";
import { compileShot } from "../compilers/promptCompiler";

export const AGNES_VENDOR_PACK = {
  id: "agnesai",
  imageTemplate: "tag-stack-zh",
  videoTemplate: "motion-from-frame",
  requiresFirstFrame: true,
  singleImage: true,
};

export function applyAgnesVendorPack(shot: ReturnType<typeof compileShot>, config: ResolvedConfig) {
  if (!/agnes/i.test(config.videoVendor)) return shot;
  const compiled = shot.generation.compiled;
  if (!compiled) return shot;
  return {
    ...shot,
    generation: {
      ...shot.generation,
      compiled: {
        ...compiled,
        video: `${compiled.video}, motion-from-frame, singleImage reference`,
        image: `${compiled.image}, tag-stack-zh`,
      },
    },
  };
}
