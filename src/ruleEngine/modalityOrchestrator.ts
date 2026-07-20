import type { EpisodePackage, EpisodeShot, ResolvedConfig } from "./types";
import { compileShot } from "./compilers/promptCompiler";
import { applyAgnesVendorPack } from "./vendor-packs/agnesai";
import { routeAudioStrategy } from "./audio/audioStrategyRouter";

/** 与 Chat modalityPromptAudit 同构（G85 roundtrip） */
export interface ModalityPromptAuditItem {
  shotIndex: number;
  modality: "IMG" | "VID" | "AUD" | "FX";
  ruleId: string;
  severity: "PASS" | "WARN" | "BLOCK";
  issue?: string;
}

export interface ModalityPromptAuditResult {
  rulePackVersion: string;
  items: ModalityPromptAuditItem[];
  perShot: Record<string, string>[];
  passRate: number;
  blockGenerate: boolean;
}

export function buildModalityPromptAudit(
  shots: EpisodeShot[],
  rulePackVersion = "2.0.1",
): ModalityPromptAuditResult {
  const items: ModalityPromptAuditItem[] = [];
  const perShot: Record<string, string>[] = [];

  for (const shot of shots) {
    const idx = (shot as EpisodeShot & { shotIndex?: number }).shotIndex ?? shot.index ?? 0;
    const row: Record<string, string> = { IMG: "PASS", VID: "PASS", AUD: "PASS", FX: "PASS" };
    const compiled = shot.generation?.compiled;

    if (!compiled?.image?.trim() && !(shot.generation as { imagePrompt?: string } | undefined)?.imagePrompt?.trim()) {
      row.IMG = "BLOCK";
      items.push({ shotIndex: idx, modality: "IMG", ruleId: "M1", severity: "BLOCK", issue: "imagePrompt 空" });
    }
    if (!compiled?.video?.trim() && !(shot.generation as { videoPrompt?: string } | undefined)?.videoPrompt?.trim()) {
      row.VID = "BLOCK";
      items.push({ shotIndex: idx, modality: "VID", ruleId: "M1", severity: "BLOCK", issue: "videoPrompt 空" });
    }
    const hasLines = (shot.narrative?.dialogue?.lines?.length ?? 0) > 0;
    const audio =
      compiled?.audio?.trim() ||
      (shot.generation as { audioPrompt?: string } | undefined)?.audioPrompt?.trim() ||
      "";
    if (hasLines && !audio) {
      row.AUD = "BLOCK";
      items.push({ shotIndex: idx, modality: "AUD", ruleId: "M1", severity: "BLOCK", issue: "audioPrompt 空" });
    }
    const fx =
      compiled?.fx?.trim() ||
      (shot as { visualEffect?: string }).visualEffect?.trim() ||
      (shot.generation as { fxPrompt?: string } | undefined)?.fxPrompt?.trim() ||
      "";
    // Empty FX: WARN (not auto-PASS). Explicit none/F0-empty still WARN for audit truth.
    if (!fx) {
      row.FX = "WARN";
      items.push({
        shotIndex: idx,
        modality: "FX",
        ruleId: "M-FX",
        severity: "WARN",
        issue: "fxPrompt 空",
      });
    }
    perShot.push(row);
  }

  const total = items.length || 1;
  const blocks = items.filter((i) => i.severity === "BLOCK").length;
  const passRate = Math.round(((total - blocks) / total) * 100);

  return {
    rulePackVersion,
    items,
    perShot,
    passRate: items.length ? passRate : 100,
    blockGenerate: blocks > 0,
  };
}

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

/** P2：touch 后产出 Chat 同构 audit（G85）；可选读取 forwardTrace preserveFields */
export function touchModalityWithAudit(
  pkg: EpisodePackage,
  config: ResolvedConfig,
  profile: string = "standard",
  opts?: { preserveFields?: string[] },
): { shots: EpisodeShot[]; modalityPromptAudit: ModalityPromptAuditResult; preservedFields?: string[] } {
  const shots = touchModality(pkg, config, profile);
  const modalityPromptAudit = buildModalityPromptAudit(shots);
  return { shots, modalityPromptAudit, preservedFields: opts?.preserveFields };
}
