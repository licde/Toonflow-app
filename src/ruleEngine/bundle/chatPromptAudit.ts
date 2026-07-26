import type { ScriptBundle, PreDesignShot, ShotGeneration } from "./types";
import { dialogueCoverageReport, formatDialogueCoverageMessage, expandShotDialogueLines } from "../design/dialogueCoverage";
import { checkQp02VisualDescription } from "./visualQualityAudit";
import {
  checkCastOnDesc,
  checkEmptyShotConsistency,
  checkSpeakPerformance,
} from "../quality/shotQualityPredicates";
import { hasOnCameraDialogue } from "../design/onCameraDialogue";
import { resolveLipSyncPolicyFromShot } from "../quality/resolveLipSyncPolicy";

export interface ChatPromptGap {
  id: string;
  shotIndex?: number;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
}

function getShots(bundle: ScriptBundle): PreDesignShot[] {
  return bundle.preDesignPack?.shots ?? [];
}

function getGeneration(shot: PreDesignShot, bundle: ScriptBundle, idx: number): ShotGeneration | undefined {
  if (shot.generation) return shot.generation;
  const panel = bundle.flowData?.storyboard?.[idx];
  if (panel) {
    return { imagePrompt: panel.prompt, videoPrompt: panel.videoDesc };
  }
  return undefined;
}

function shotHasDialogue(shot: PreDesignShot): boolean {
  return expandShotDialogueLines([shot]).keys.length > 0;
}

export function auditChatPromptGaps(
  bundle: ScriptBundle,
  tier: "T1" | "T2" | "T3" = "T3",
  opts?: { nonBlocking?: boolean },
): ChatPromptGap[] {
  const demote = opts?.nonBlocking ?? false;
  const sev = (s: "BLOCK" | "WARN"): "BLOCK" | "WARN" => (demote && s === "BLOCK" ? "WARN" : s);
  const gaps: ChatPromptGap[] = [];
  const shots = getShots(bundle);

  const coverage = dialogueCoverageReport({
    script: bundle.script ?? "",
    shots,
    planData: bundle.planData,
  });
  if (!coverage.ok) {
    const msg = formatDialogueCoverageMessage(coverage);
    if (coverage.missingCount > 0) {
      gaps.push({
        id: "CHAT-DLG-01",
        severity: sev("BLOCK"),
        message: msg.includes("乱入") && coverage.extraCount > 0
          ? msg.split("；")[0]!
          : msg,
        field: "dialogue",
      });
    }
    if (coverage.extraCount > 0) {
      gaps.push({
        id: "DC-01-EXTRA",
        severity: sev("BLOCK"),
        message:
          coverage.missingCount > 0
            ? msg.split("；").find((p) => p.includes("乱入")) ?? msg
            : msg,
        field: "dialogue",
      });
    }
    if (coverage.missingCount === 0 && coverage.extraCount === 0) {
      gaps.push({
        id: "CHAT-DLG-01",
        severity: sev("BLOCK"),
        message: msg,
        field: "dialogue",
      });
    }
  }

  shots.forEach((s, i) => {
    const idx = s.shotIndex ?? i + 1;
    const qp = checkQp02VisualDescription({
      visualDescription: s.visualDescription,
      shotIndex: idx,
    });
    if (qp && qp.severity === "BLOCK") {
      // Same core as export QP-02; keep CHAT-SB-01 alias when empty for legacy scanners
      gaps.push({
        id: qp.evidence?.reason === "empty" ? "CHAT-SB-01" : "QP-02",
        shotIndex: idx,
        severity: "BLOCK",
        message: qp.message,
        field: "visualDescription",
      });
      if (qp.evidence?.reason === "empty") {
        gaps.push({
          id: "QP-02",
          shotIndex: idx,
          severity: "BLOCK",
          message: qp.message,
          field: "visualDescription",
        });
      }
    }
  });

  {
    const assets = (bundle.characterDesign as { assets?: { code?: string; name?: string }[] } | undefined)?.assets ?? [];
    const knownNames: string[] = [];
    const nameToCodes: Record<string, string[]> = {};
    for (const a of assets) {
      const name = String(a.name ?? "").replace(/（OS）|\(OS\)/g, "").trim();
      const code = String(a.code ?? "").trim();
      if (!name || !code) continue;
      knownNames.push(name);
      (nameToCodes[name] ??= []).push(code);
    }
    shots.forEach((s, i) => {
      const idx = s.shotIndex ?? i + 1;
      const cast = checkCastOnDesc({
        visualDescription: s.visualDescription,
        charCodes: s.charCodes,
        knownNames,
        nameToCodes,
        shotIndex: idx,
      });
      if (cast) {
        gaps.push({ id: cast.id, shotIndex: idx, severity: sev(cast.severity), message: cast.message, field: "charCodes" });
      }
      const empty = checkEmptyShotConsistency({
        visualDescription: s.visualDescription,
        charCodes: s.charCodes,
        knownNames,
        shotIndex: idx,
      });
      if (empty) {
        gaps.push({ id: empty.id, shotIndex: idx, severity: sev(empty.severity), message: empty.message, field: "visualDescription" });
      }
      const lines = s.narrative?.dialogue?.lines ?? [];
      const expr = checkSpeakPerformance({
        hasDialogue: hasOnCameraDialogue(lines),
        emotionIntensity: (s as { emotionIntensity?: number }).emotionIntensity,
        microExpression: s.shotDesign?.performance?.microExpression,
        lipSyncPolicy: resolveLipSyncPolicyFromShot(s as unknown as Record<string, unknown>),
        shotIndex: idx,
      });
      if (expr) {
        gaps.push({ id: expr.id, shotIndex: idx, severity: sev(expr.severity), message: expr.message, field: "shotDesign.performance" });
      }
    });

    // DEX-ASSET-CREF: same kernel as designExit — per-shot imaged bind (not bare plan/assets presence)
    {
      const {
        collectCharacterAssets,
        buildImagedMaps,
        shotAssetCrefSatisfied,
      } = require("../design/assetCrefBind") as typeof import("../design/assetCrefBind");
      const planView = {
        planData: bundle.planData ?? {},
        characterDesign: bundle.characterDesign,
        preDesignPack: bundle.preDesignPack,
      } as Record<string, unknown>;
      const assetsList = collectCharacterAssets(planView);
      const { imagedByCode, imagedByName, codesPresent } = buildImagedMaps(assetsList);
      const crefPlan = Array.isArray((bundle.planData as { assetCrefPlan?: unknown } | undefined)?.assetCrefPlan)
        ? ((bundle.planData as { assetCrefPlan: import("../design/assetCrefBind").AssetCrefPlanEntry[] }).assetCrefPlan)
        : [];
      for (const s of shots) {
        const idx = s.shotIndex ?? 0;
        // Inspect/design preview: stub bind OK (same as SB); compose still requires imaged
        if (
          !shotAssetCrefSatisfied(s as Record<string, unknown>, imagedByCode, imagedByName, crefPlan, {
            allowStubBind: true,
            codesPresent,
          })
        ) {
          const codes = (s.charCodes ?? []).filter((c) => /^CHAR-/i.test(String(c)));
          const hasCodesNoImg = codes.length > 0;
          gaps.push({
            id: "DEX-ASSET-CREF",
            shotIndex: idx,
            severity: sev("BLOCK"),
            message: hasCodesNoImg
              ? "已绑 CHAR 仍无法设计闭合（缺册/歧义）；缺定妆图可 stub 延期→AS"
              : "出脸/CHAR 须本镜定妆绑定或设计期 stub+assetCrefPlan（深链 asset_cref）",
            field: hasCodesNoImg ? "characterDesign.assets" : "assetCrefPlan",
          });
        }
      }
    }
  }

  if (tier === "T2" || tier === "T3") {
    const cd = bundle.characterDesign as { assets?: unknown[] } | undefined;
    if (!cd?.assets?.length) {
      gaps.push({ id: "CHAT-CD-01", severity: sev("BLOCK"), message: "缺 characterDesign.assets", field: "characterDesign" });
    }
    if (!bundle.visualLockTable || !Object.keys(bundle.visualLockTable).length) {
      gaps.push({ id: "CHAT-BP-01", severity: sev("BLOCK"), message: "缺 visualLockTable", field: "visualLockTable" });
    }
  }

  if (tier === "T3") {
    shots.forEach((s, i) => {
      const idx = s.shotIndex ?? i + 1;
      const gen = getGeneration(s, bundle, i);
      if (!gen?.imagePrompt?.trim()) {
        gaps.push({ id: "CHAT-IMG-01", shotIndex: idx, severity: sev("BLOCK"), message: "缺 imagePrompt", field: "imagePrompt" });
      }
      if (!gen?.videoPrompt?.trim()) {
        gaps.push({ id: "CHAT-VID-01", shotIndex: idx, severity: sev("BLOCK"), message: "缺 videoPrompt", field: "videoPrompt" });
      }
      if (shotHasDialogue(s) && !gen?.audioPrompt?.trim()) {
        gaps.push({
          id: "CHAT-AUD-01",
          shotIndex: idx,
          severity: sev("BLOCK"),
          message: "台词镜缺 audioPrompt（须 seed 或手补）",
          field: "audioPrompt",
        });
      }
      const fx = (s as PreDesignShot & { visualEffect?: string }).visualEffect;
      if (fx?.trim() && !gen?.fxPrompt?.trim()) {
        gaps.push({ id: "CHAT-FX-01", shotIndex: idx, severity: "WARN", message: "特效镜缺 fxPrompt", field: "fxPrompt" });
      }
      // NO-LIP-DIALOGUE: on-camera only; empty policy is not silent
      if (hasOnCameraDialogue(s.narrative?.dialogue?.lines)) {
        const pol = resolveLipSyncPolicyFromShot(s as unknown as Record<string, unknown>).toLowerCase();
        const vp = String(gen?.videoPrompt ?? "");
        if (/^(none|silent)$/.test(pol) || /no\s*lip[- ]*sync/i.test(vp)) {
          gaps.push({
            id: "NO-LIP-DIALOGUE",
            shotIndex: idx,
            severity: sev("BLOCK"),
            message: "有出镜对白禁止 no lip sync（深链 no_lip_dialogue）",
            field: "lipSyncPolicy",
          });
        }
      }
      // SFX unbacked literal
      const vp = String(gen?.videoPrompt ?? "");
      const cue = String((s as { audioCue?: string }).audioCue ?? "").trim();
      if (/sfx\s*:\s*</i.test(vp) && !cue) {
        gaps.push({
          id: "SFX-UNBACKED",
          shotIndex: idx,
          severity: "BLOCK",
          message: "字面 sfx:<> 无 audioCue 真源；设计出口须补 audioCue（不编造音效）",
          field: "audioCue",
        });
      }
    });
  }

  return gaps;
}

export function chatPromptBlocked(gaps: ChatPromptGap[]): boolean {
  return gaps.some((g) => g.severity === "BLOCK");
}
