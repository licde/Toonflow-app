/**
 * Server-side integrity re-audit — Chat self-reported PASS is not trusted.
 */
import type { ScriptBundle } from "./types";
import { buildModalityPromptAudit } from "../modalityOrchestrator";
import { collectReferencedCodes, resolveSceneCodeByName } from "./assetClosureGate";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import { parsePromptRefs } from "../compilers/vendorPromptAdapter";

export interface IntegrityGap {
  id: string;
  severity: "BLOCK" | "WARN" | "INFO";
  message: string;
  field?: string;
}

type ShotLike = {
  shotIndex?: number;
  index?: number;
  charCodes?: string[];
  sceneName?: string;
  narrative?: { dialogue?: { lines?: unknown[] } };
  generation?: {
    imagePrompt?: string;
    videoPrompt?: string;
    audioPrompt?: string;
    fxPrompt?: string;
    compiled?: { image?: string; video?: string; audio?: string; fx?: string };
  };
  visualEffect?: string;
};

function shotGen(s: ShotLike) {
  return s.generation ?? {};
}

export function auditBundleIntegrity(bundle: ScriptBundle): IntegrityGap[] {
  const gaps: IntegrityGap[] = [];
  const shots = (bundle.preDesignPack?.shots ?? []) as ShotLike[];

  // Rebuild modality truth from authored prompts (map into EpisodeShot-like for audit)
  const forAudit = shots.map((s, i) => {
    const g = shotGen(s);
    return {
      index: s.shotIndex ?? s.index ?? i + 1,
      shotIndex: s.shotIndex ?? i + 1,
      narrative: s.narrative,
      visualEffect: s.visualEffect ?? g.fxPrompt,
      generation: {
        imagePrompt: g.imagePrompt,
        videoPrompt: g.videoPrompt,
        audioPrompt: g.audioPrompt,
        fxPrompt: g.fxPrompt,
        compiled: {
          image: g.imagePrompt ?? g.compiled?.image,
          video: g.videoPrompt ?? g.compiled?.video,
          audio: g.audioPrompt ?? g.compiled?.audio,
          fx: g.fxPrompt ?? g.compiled?.fx,
        },
      },
    };
  });
  const modality = buildModalityPromptAudit(forAudit as never);
  for (const item of modality.items) {
    if (item.severity === "BLOCK" || item.severity === "WARN") {
      gaps.push({
        id: `MOD-${item.modality}-${item.ruleId}`,
        severity: item.severity === "BLOCK" ? "BLOCK" : "WARN",
        message: item.issue ?? `${item.modality} ${item.severity}`,
        field: `shots[${item.shotIndex}]`,
      });
    }
  }

  // Empty FX without explicit none — WARN (engine now also emits)
  for (const s of shots) {
    const g = shotGen(s);
    const fx = (g.fxPrompt ?? "").trim();
    const idx = s.shotIndex ?? s.index;
    if (!fx && !(s.visualEffect ?? "").trim()) {
      gaps.push({
        id: "INT-FX-EMPTY",
        severity: "WARN",
        message: `shot ${idx} fxPrompt empty`,
        field: "generation.fxPrompt",
      });
    }
  }

  // Orphan char codes vs CD/VLT
  const cd = new Set(
    ((bundle.characterDesign as { assets?: { code?: string }[] })?.assets ?? [])
      .map((a) => normalizeAssetCode(a.code ?? "") ?? "")
      .filter(Boolean),
  );
  const vltChars = new Set(
    Object.keys(
      (bundle.visualLockTable as { characterAssets?: Record<string, unknown> })?.characterAssets ?? {},
    )
      .map((k) => normalizeAssetCode(k) ?? "")
      .filter(Boolean),
  );
  for (const code of collectReferencedCodes(bundle)) {
    if (code.startsWith("CHAR-") && !cd.has(code) && !vltChars.has(code)) {
      gaps.push({
        id: "INT-CHAR-ORPHAN",
        severity: "WARN",
        message: `referenced ${code} missing from characterDesign/visualLock (import may stub o_assets)`,
        field: "charCodes",
      });
    }
  }

  // infoId referential integrity
  const plan = (bundle.planData as { narrativeBrief?: Record<string, unknown> })?.narrativeBrief ?? {};
  const defined = new Set(
    ((plan.infoDeliveryPlan as { infoId?: string }[]) ?? []).map((x) => x.infoId).filter(Boolean) as string[],
  );
  const beats =
    (
      bundle.preDesignPack as {
        episodeBeat?: { sceneCausalBeats?: { scene?: string; infoIds?: string[] }[] };
      }
    )?.episodeBeat?.sceneCausalBeats ?? [];
  for (const b of beats) {
    for (const id of b.infoIds ?? []) {
      if (!defined.has(id)) {
        gaps.push({
          id: "INT-INFO-ORPHAN",
          severity: "WARN",
          message: `infoId ${id} used in ${b.scene} but not in infoDeliveryPlan`,
          field: "infoIds",
        });
      }
    }
  }

  // implementationPlan coverage vs sceneMeta (top-level or under narrativeBrief)
  const sceneMeta = (
    (plan.sceneMeta as { sceneRef?: number }[]) ??
    ((bundle.planData as { sceneMeta?: { sceneRef?: number }[] })?.sceneMeta ?? [])
  ).map((s) => s.sceneRef);
  const impl = new Set(
    ((plan.implementationPlan as { sceneRef?: number }[]) ?? []).map((s) => s.sceneRef).filter((n) => n != null),
  );
  for (const ref of sceneMeta) {
    if (ref != null && !impl.has(ref)) {
      gaps.push({
        id: "INT-IMPL-GAP",
        severity: "WARN",
        message: `sceneRef ${ref} in sceneMeta but missing implementationPlan`,
        field: "implementationPlan",
      });
    }
  }

  // sceneName without resolvable SCENE
  for (const s of shots) {
    if (s.sceneName && !resolveSceneCodeByName(bundle, s.sceneName)) {
      gaps.push({
        id: "INT-SCENE-UNMAPPED",
        severity: "INFO",
        message: `sceneName "${s.sceneName}" not in visualLockTable.sceneColorLock`,
        field: "sceneName",
      });
    }
  }

  // lines ↔ audio consistency
  for (const s of shots) {
    const lines = s.narrative?.dialogue?.lines?.length ?? 0;
    const aud = (shotGen(s).audioPrompt ?? "").trim();
    const idx = s.shotIndex ?? s.index;
    if (lines > 0 && !aud) {
      gaps.push({
        id: "INT-AUD-LINES",
        severity: "WARN",
        message: `shot ${idx} has dialogue lines but empty audioPrompt`,
        field: "audioPrompt",
      });
    }
  }

  // Prefer ignoring Chat self-report blockGenerate when we have BLOCK gaps
  const self = bundle.modalityPromptAudit as { passRate?: number; blockGenerate?: boolean } | undefined;
  if (self?.passRate === 100 && gaps.some((g) => g.id.startsWith("INT-FX") || g.id.startsWith("MOD-FX"))) {
    gaps.push({
      id: "INT-FALSE-GREEN",
      severity: "WARN",
      message: "Chat modalityPromptAudit passRate=100 but server found FX/modality gaps",
      field: "modalityPromptAudit",
    });
  }

  void parsePromptRefs; // keep import used for future speaker extraction
  return gaps;
}

export function integrityBlocksImport(gaps: IntegrityGap[]): boolean {
  return gaps.some((g) => g.severity === "BLOCK");
}
