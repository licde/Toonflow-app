/**
 * Design-phase quadruple gate: implPlan / SB fields / code closure / anti false-green export.
 */
import type { ScriptBundle } from "./types";
import { normalizeAssetCodes } from "../codes/assetCodeContract";
import { assertNonEmptyEpisode } from "./emptyEpisodeGate";
import { inferTierFromBundle } from "./closureSummary";
import {
  auditCastCoverage,
  fxDualTrackViolations,
  linkageAssetChainFalseGreen,
  modalityAuditFalseGreen,
  sceneColorLockHasChineseKeys,
  serverNarrativeSelfcheckFails,
  speakersMissingFromCd,
  undeclaredEmptyFxShotIndexes,
} from "./designExportHelpers";
import { orphanF1SceneRefs, sceneCardinalityIssues } from "./sceneCardinality";

export interface DesignGateFinding {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
}

export function runDesignPhaseGates(bundle: ScriptBundle): {
  ok: boolean;
  findings: DesignGateFinding[];
  allowFalseGreenExport: false;
} {
  const findings: DesignGateFinding[] = [];
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  const empty = assertNonEmptyEpisode({ preDesignShotCount: shots.length });
  if (!empty.ok) {
    findings.push({ id: "DG-EMPTY", severity: "BLOCK", message: empty.message ?? "无分镜" });
  }

  const impl =
    (bundle as { implementationPlan?: unknown }).implementationPlan ??
    (bundle.planData as { implementationPlan?: unknown } | undefined)?.implementationPlan;
  if (impl == null && !(bundle.designBrief as { B14?: unknown } | undefined)?.B14) {
    findings.push({
      id: "DG-IMPL-PLAN",
      severity: "WARN",
      message: "缺 implementationPlan / B14 — 设计期建议补齐",
      field: "implementationPlan",
    });
  }

  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const n = (s.narrative as Record<string, unknown>) ?? {};
    if (!s.duration && !n.duration) {
      findings.push({ id: "DG-SB-DURATION", severity: "BLOCK", message: `镜 ${i + 1} 缺 duration`, field: `shots[${i}].duration` });
    }
    if (!n.type && !s.type) {
      findings.push({ id: "DG-SB-TYPE", severity: "WARN", message: `镜 ${i + 1} 缺 narrative.type`, field: `shots[${i}].type` });
    }
  }

  // Code closure: crefs in image/video prompts must be normalizeable
  const blob = JSON.stringify(bundle.preDesignPack ?? {});
  const codes = normalizeAssetCodes([blob]);
  const bad = [...blob.matchAll(/\bROLE-[\w-]+/gi)].map((m) => m[0]);
  const cjkCode = [...blob.matchAll(/\b(?:CHAR|SCENE|PROP)-[\u4e00-\u9fff]+/g)].map((m) => m[0]);
  for (const b of [...bad, ...cjkCode]) {
    findings.push({ id: "DG-CODE-FORBIDDEN", severity: "BLOCK", message: `禁码形态 ${b}`, field: "charCodes" });
  }
  if (codes.length === 0 && /--cref|--sref/.test(blob)) {
    findings.push({ id: "DG-CODE-PARSE", severity: "WARN", message: "提示词含 cref/sref 但未能解析标准码" });
  }

  // Anti false-green: every shot must declare F0 (visualEffect/fxLevel/fxFeasibility) OR have fxPrompt prose
  const shotFxDeclared = (s: (typeof shots)[number]): boolean => {
    const n = (s.narrative as Record<string, unknown>) ?? {};
    const gen = (s.generation as Record<string, unknown>) ?? {};
    const prose = String(s.fxPrompt ?? n.fxPrompt ?? gen.fxPrompt ?? "").trim();
    if (prose && !/^F[0-5]$/i.test(prose)) return true;
    const levels = [
      s.visualEffect,
      (s as { fxLevel?: string }).fxLevel,
      (s as { fxFeasibility?: string }).fxFeasibility,
      gen.fxFeasibility,
      n.fxFeasibility,
      n.fxLevel,
    ];
    for (const lv of levels) {
      const t = String(lv ?? "").trim();
      if (/^F0\b/i.test(t) || /^F0\s*[:：]/i.test(t)) return true;
    }
    return false;
  };
  const allFxEmpty = shots.length > 0 && shots.every((s) => !shotFxDeclared(s));
  if (allFxEmpty && shots.length >= 3) {
    findings.push({
      id: "DG-FALSE-GREEN-FX",
      severity: "BLOCK",
      message: "全镜 FX 空 — 禁止假绿 PASS 导出（每镜须声明 F0 或写 fxPrompt 散文）",
      field: "fxPrompt",
    });
  }

  const dualViolations = fxDualTrackViolations(bundle);
  if (dualViolations.length > 0) {
    const sample = dualViolations
      .slice(0, 8)
      .map((v) => `${v.shotIndex}(${v.reason})`)
      .join("、");
    findings.push({
      id: "DG-FX-DUAL-TRACK",
      severity: "BLOCK",
      message: `FX 双轨违规 ${dualViolations.length} 镜：${sample} — 无特效声明 F0，有特效写散文 fxPrompt`,
      field: "fxFeasibility",
    });
  }

  for (const issue of sceneCardinalityIssues(bundle)) {
    findings.push({
      id: "DG-SCENE-CARDINALITY",
      severity: "BLOCK",
      message: issue.message,
      field: issue.field,
    });
  }
  for (const o of orphanF1SceneRefs(bundle)) {
    findings.push({
      id: "DG-SCENE-ORPHAN-FX",
      severity: "BLOCK",
      message: `【孤儿场】sceneRef=${o.sceneRef} fxIntent ${o.fxLevel} 无对应唯一 sceneName 映射镜 — 请删除该 plan 项，或 fxIntent→F0，或给接场独立 sceneName 并挂镜+散文。禁止只给其他场补 fxPrompt。path: ${o.path}`,
      field: o.path,
    });
  }

  const tier = inferTierFromBundle(bundle);

  for (const key of sceneColorLockHasChineseKeys(bundle)) {
    findings.push({
      id: "DG-SCENE-KEY",
      severity: "BLOCK",
      message: `sceneColorLock 禁止中文 key「${key}」— 请用 SCENE-* code`,
      field: `visualLockTable.sceneColorLock.${key}`,
    });
  }

  const narSelf = bundle.narrativeSelfcheck as { passed?: boolean; failedIds?: string[] } | undefined;
  const serverNarFails = serverNarrativeSelfcheckFails(bundle);
  if (serverNarFails.length > 0) {
    // Authority overwrite — Chat 假绿不能挡住真实 NAR
    (bundle as { narrativeSelfcheck?: Record<string, unknown> }).narrativeSelfcheck = {
      ...(narSelf ?? {}),
      passed: false,
      failedIds: [...new Set([...(narSelf?.failedIds ?? []), ...serverNarFails.map((f) => f.id)])],
      serverOverwritten: true,
      checkedAt: new Date().toISOString(),
    };
  }
  if (narSelf?.passed === true && serverNarFails.length > 0) {
    findings.push({
      id: "DG-NAR-SELFCHECK",
      severity: "BLOCK",
      message: `narrativeSelfcheck 自报 passed 但服务器检出 ${serverNarFails.map((f) => f.id).join(", ")}（已覆写 passed=false）`,
      field: "narrativeSelfcheck",
    });
  } else if (serverNarFails.length > 0) {
    // NAR-14/15：制作意图下升 BLOCK，逼 Chat 带 splitHint / reaction 后再导出
    for (const f of serverNarFails) {
      const elevate = f.id === "NAR-14" || f.id === "NAR-15" || tier === "T3";
      findings.push({
        id: f.id,
        severity: elevate ? "BLOCK" : "WARN",
        message: f.message,
        field: "dialoguePlan.lines",
      });
    }
  }

  if (linkageAssetChainFalseGreen(bundle)) {
    const miss = speakersMissingFromCd(bundle);
    findings.push({
      id: "DG-LINKAGE-FALSE-GREEN",
      severity: "BLOCK",
      message: `linkageAudit.资产=pass 但对白说话人未入 characterDesign：${miss.join("、")}`,
      field: "linkageAudit.chains",
    });
  }

  const cast = auditCastCoverage(bundle);
  if (cast.block) {
    findings.push({
      id: "DG-CD-COVERAGE",
      severity: "BLOCK",
      message: `characterDesign 配角入册缺口（DC-16）：${cast.labels.join("、")} — 须补真实 CD（code/name/L0.identity），禁止仅 L0.stub`,
      field: "characterDesign.assets",
    });
    findings.push({
      id: "DC-16",
      severity: "BLOCK",
      message: `说话人/上镜码未入 CD 或仅为 stub：${cast.labels.join("、")}`,
      field: "characterDesign.assets",
    });
  } else if (cast.genderWarn.length && (tier === "T2" || tier === "T3")) {
    findings.push({
      id: "DG-CD-GENDER",
      severity: "WARN",
      message: `说话人缺 L0.gender：${cast.genderWarn.join("、")}`,
      field: "characterDesign.assets",
    });
  }

  if (modalityAuditFalseGreen(bundle)) {
    const undeclared = undeclaredEmptyFxShotIndexes(bundle);
    findings.push({
      id: "DG-MODALITY-MISMATCH",
      severity: "BLOCK",
      message: `modalityPromptAudit.FX=pass 但镜 ${undeclared.slice(0, 8).join(",")} 空未声明 F0（混合假绿）`,
      field: "modalityPromptAudit.FX",
    });
  }

  const blocked = findings.some((f) => f.severity === "BLOCK");
  return { ok: !blocked, findings, allowFalseGreenExport: false };
}
