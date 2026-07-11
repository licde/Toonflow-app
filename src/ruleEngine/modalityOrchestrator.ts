import type { EpisodePackage, EpisodeShot, ResolvedConfig } from "./types";
import { compileShot } from "./compilers/promptCompiler";
import { applyAgnesVendorPack } from "./vendor-packs/agnesai";
import { routeAudioStrategy } from "./audio/audioStrategyRouter";

export function touchModality(pkg: EpisodePackage, config: ResolvedConfig, profile: string = "standard"): EpisodeShot[] {
  const vendorNative = /agnes/i.test(config.videoVendor);
  return pkg.shots.map((shot) => {
    let compiled = compileShot(shot, config);
    compiled = applyAgnesVendorPack(compiled, config);
    const audioRoute = routeAudioStrategy(compiled, { ttsDubbing: config.ttsDubbing, vendorSupportsNative: vendorNative });
    if (compiled.generation.compiled) {
      compiled.generation.compiled.audio = `${compiled.generation.compiled.audio} [${audioRoute.path}]`;
    }
    if (profile === "dry-run") return compiled;
    return compiled;
  });
}
