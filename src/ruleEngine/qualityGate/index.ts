/**
 * qualityGate — single kernel for export / preflight / promptGen / burn stages.
 */
import type { ScriptBundle } from "../bundle/types";
import { flattenDialogueText } from "../design/dialogueCoverage";
import {
  checkLangAud01,
  checkLangVid01,
  checkFxGrade,
  checkCamSpeak,
  checkCamVariety,
  type GateFinding,
} from "../validators/langAudFxCam";
import {
  isAllowedTransition,
  isAllowedMotion,
  loadCameraMotionWhitelist,
  promptMotionWhitelistViolation,
  extractMotionFromPrompt,
} from "./cameraWhitelist";
import { auditVisualQuality } from "../bundle/visualQualityAudit";
import { auditScriptViralGaps } from "../bundle/scriptViralAudit";
import { auditRetentionGaps } from "../bundle/retentionAudit";
import { auditNarrativeDriveGaps } from "../bundle/narrativeDriveAudit";
import { runPrValidator } from "../validators/prValidator";
import { dialogueCoverageReport } from "../design/dialogueCoverage";
import { readFixtureJson } from "../utils/fixturesPath";
import { needsNar14Split } from "../nar14ClauseSplit";

export type QualityStage = "export" | "preflight" | "promptGen" | "burn" | "post" | "design";

export interface QualityMatrixEntry {
  id: string;
  domain: string;
  stages: QualityStage[];
  severityByStage: Partial<Record<QualityStage, "BLOCK" | "WARN" | "INFO">>;
  handler: string;
  repairHintId?: string;
  softPatch?: boolean;
  /** When tier=T3 and bundle is ep1, elevate emitted severity to this. */
  t3Ep1Elevate?: "BLOCK" | "WARN";
}

export interface QualityGateOptions {
  stage: QualityStage;
  tier?: "T1" | "T2" | "T3";
  scope?: { mode?: "full" | "filtered"; storyboardIds?: number[] };
  /** Single-shot prompt burn path */
  promptOverride?: { videoPrompt?: string; audioPrompt?: string; dialogueLines?: string; shotIndex?: number };
  vendor?: string;
}

export interface QualityIssue {
  id: string;
  severity: "BLOCK" | "WARN" | "INFO";
  message: string;
  shotIndex?: number;
  domain?: string;
  repairHintId?: string;
  evidence?: Record<string, unknown>;
  softPatch?: boolean;
}

export interface QualityGateResult {
  ok: boolean;
  blocked: boolean;
  stage: QualityStage;
  issues: QualityIssue[];
  blocks: QualityIssue[];
  warns: QualityIssue[];
}

function loadMatrix(): QualityMatrixEntry[] {
  return (
    readFixtureJson<{ entries?: QualityMatrixEntry[] }>("quality_matrix.json", { entries: [] }).entries ?? []
  );
}

function severityFor(entry: QualityMatrixEntry | undefined, stage: QualityStage, fallback: "BLOCK" | "WARN" | "INFO"): "BLOCK" | "WARN" | "INFO" {
  return entry?.severityByStage?.[stage] ?? fallback;
}

function shotDialogueFlat(shot: Record<string, unknown>): string {
  const n = (shot.narrative as { dialogue?: { lines?: unknown } })?.dialogue;
  return flattenDialogueText(n?.lines);
}

function collectShots(bundle: ScriptBundle): Record<string, unknown>[] {
  return (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

function isEp1Bundle(bundle: ScriptBundle): boolean {
  const plan = bundle.planData as Record<string, unknown> | undefined;
  const ep = Number(plan?.episodeIndex ?? plan?.epIndex ?? (bundle as { episodeIndex?: number }).episodeIndex ?? 0);
  if (ep === 1) return true;
  const viral = plan?.viralAdaptation as { retentionPlan?: { ep1?: unknown; epN?: unknown } } | undefined;
  return Boolean(viral?.retentionPlan?.ep1) && !viral?.retentionPlan?.epN;
}

function checkDensityAvBeat(bundle: ScriptBundle): QualityIssue[] {
  const out: QualityIssue[] = [];
  const spec = readFixtureJson<{
    avBeatRule?: string;
    densityBudget?: Record<string, unknown>;
  }>("narrative_drive_spec.json", {});
  const plan = bundle.planData as Record<string, unknown> | undefined;
  const brief = (plan?.narrativeBrief ?? plan?.storyKernel) as Record<string, unknown> | undefined;
  const density = brief?.densityBudget ?? plan?.densityBudget;
  if (spec.densityBudget && !density) {
    out.push({
      id: "NAR-DENSITY",
      severity: "WARN",
      message: "缺 densityBudget（应对齐 narrative_drive_spec.densityBudget）",
      evidence: { expectedKeys: Object.keys(spec.densityBudget) },
    });
  }
  const scenes = (plan?.sceneMeta ?? brief?.sceneMeta ?? []) as { avCausality?: unknown; densityScore?: unknown }[];
  if (Array.isArray(scenes) && scenes.length > 0) {
    const missingAv = scenes.filter((s) => !s?.avCausality).length;
    if (missingAv > 0 && spec.avBeatRule) {
      out.push({
        id: "NAR-DENSITY",
        severity: "WARN",
        message: `${missingAv}/${scenes.length} 场缺 avCausality（${spec.avBeatRule}）`,
        evidence: { missingAv, avBeatRule: spec.avBeatRule },
      });
    }
  }
  return out;
}

export function qualityGate(bundle: ScriptBundle, opts: QualityGateOptions): QualityGateResult {
  const stage = opts.stage;
  const matrix = loadMatrix();
  const byId = new Map(matrix.map((e) => [e.id, e]));
  const active = new Set(matrix.filter((e) => e.stages.includes(stage)).map((e) => e.id));
  const issues: QualityIssue[] = [];
  const filtered = opts.scope?.mode === "filtered" || opts.scope?.storyboardIds != null;
  const wl = loadCameraMotionWhitelist();
  const ep1T3 = opts.tier === "T3" && isEp1Bundle(bundle);

  const push = (issue: QualityIssue) => {
    if (!active.has(issue.id) && !issue.id.startsWith("CHAT-")) {
      // still allow handler-emitted ids present in matrix only
      if (!byId.has(issue.id)) return;
    }
    const entry = byId.get(issue.id);
    if (entry && !entry.stages.includes(stage)) return;
    let sev = severityFor(entry, stage, issue.severity);
    // FX: never elevate empty/F0 WARN to BLOCK — only F4/F5 checker BLOCKs hard
    if (issue.id === "FX-GRADE-01" && issue.severity !== "BLOCK") {
      sev = issue.severity;
    }
    if (ep1T3 && entry?.t3Ep1Elevate && issue.id !== "FX-GRADE-01") {
      sev = entry.t3Ep1Elevate;
    }
    issues.push({
      ...issue,
      severity: sev,
      repairHintId: issue.repairHintId ?? entry?.repairHintId,
      softPatch: issue.softPatch ?? entry?.softPatch,
      domain: issue.domain ?? entry?.domain,
    });
  };

  // --- promptGen / burn single override path ---
  if (opts.promptOverride && (stage === "promptGen" || stage === "burn")) {
    const o = opts.promptOverride;
    const langV = checkLangVid01({
      dialogueLines: o.dialogueLines,
      videoPrompt: o.videoPrompt,
      shotIndex: o.shotIndex,
    });
    if (langV) push({ id: langV.ruleId, severity: langV.severity, message: langV.message, shotIndex: langV.shotIndex, evidence: langV.evidence });
    const langA = checkLangAud01({
      dialogueLines: o.dialogueLines,
      audioPrompt: o.audioPrompt,
      shotIndex: o.shotIndex,
    });
    if (langA) push({ id: langA.ruleId, severity: langA.severity, message: langA.message, shotIndex: langA.shotIndex, evidence: langA.evidence });
    const motionBad = promptMotionWhitelistViolation(o.videoPrompt ?? "");
    if (motionBad) {
      push({
        id: "PR-CAM-01",
        severity: "BLOCK",
        message: `运镜不在白名单或禁止: ${motionBad}`,
        shotIndex: o.shotIndex,
        evidence: { motion: motionBad },
        softPatch: true,
      });
    }
    const speak = checkCamSpeak({
      hasDialogue: Boolean(o.dialogueLines?.trim()),
      videoPrompt: o.videoPrompt,
      shotIndex: o.shotIndex,
    });
    if (speak) push({ id: speak.ruleId, severity: speak.severity, message: speak.message, shotIndex: speak.shotIndex });
  }

  const shots = collectShots(bundle);
  const fxAuditItems = (
    (bundle as { fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string }[] } }).fxFeasibilityAudit
      ?.items ?? []
  ) as { shotIndex?: number; level?: string }[];

  // LANG + FX + CAM-SPEAK per shot
  if (stage === "export" || stage === "preflight" || stage === "burn") {
    for (const s of shots) {
      const idx = s.shotIndex as number | undefined;
      const dial = shotDialogueFlat(s);
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      const audio = String((s.generation as { audioPrompt?: string })?.audioPrompt ?? "");
      const fx = String(
        (s.generation as { fxPrompt?: string })?.fxPrompt ??
          (s as { fxPrompt?: string }).fxPrompt ??
          "",
      );
      const auditLv = fxAuditItems.find((it) => it.shotIndex === idx)?.level;
      const localFeas = String(
        (s as { fxFeasibility?: string }).fxFeasibility ??
          (s.generation as { fxFeasibility?: string })?.fxFeasibility ??
          "",
      );
      // Ignore stale audit F1+ when shot has no FX materials (post lip-split index drift)
      const ve = String((s as { visualEffect?: string }).visualEffect ?? "").trim();
      const auditUsable =
        auditLv &&
        (!/^F[1-5]$/i.test(String(auditLv)) || Boolean(fx.trim()) || Boolean(ve));
      const fxFeas =
        String(localFeas || (auditUsable ? auditLv : "") || "")
          .toUpperCase()
          .replace(/^FX:/, "")
          .trim() || undefined;
      for (const f of [
        checkLangVid01({ dialogueLines: dial, videoPrompt: video, shotIndex: idx }),
        checkLangAud01({ dialogueLines: dial, audioPrompt: audio, shotIndex: idx }),
        checkFxGrade({
          fxPrompt: fx,
          fxFeasibility: fxFeas,
          shotIndex: idx,
          warnUndeclared: stage === "export" || stage === "preflight",
          requireFxProse: stage === "burn" || stage === "export",
        }),
        checkCamSpeak({ hasDialogue: Boolean(dial.trim()), videoPrompt: video, cameraMotion: extractMotionFromPrompt(video), shotIndex: idx }),
      ] as (GateFinding | null)[]) {
        if (f) push({ id: f.ruleId, severity: f.severity, message: f.message, shotIndex: f.shotIndex, evidence: f.evidence });
      }
      const tt = String((s.narrative as { transitionType?: string })?.transitionType ?? "").trim();
      if (tt && !isAllowedTransition(tt, wl)) {
        push({
          id: "DC-09",
          severity: "BLOCK",
          message: `镜 ${idx ?? "?"} transition 非法: ${tt}`,
          shotIndex: idx,
          evidence: { transitionType: tt },
          softPatch: true,
        });
      }
      const motion = extractMotionFromPrompt(video) ?? String(s.camera ?? s.motion ?? "");
      if (motion && !isAllowedMotion(motion, wl)) {
        push({
          id: "PR-CAM-01",
          severity: "BLOCK",
          message: `镜 ${idx ?? "?"} 运镜非法: ${motion}`,
          shotIndex: idx,
          evidence: { motion },
          softPatch: true,
        });
      }
    }
    const variety = checkCamVariety({
      cameraMotions: shots.map((s) => extractMotionFromPrompt(String(s.videoPrompt ?? "")) ?? "static"),
    });
    if (variety) push({ id: variety.ruleId, severity: variety.severity, message: variety.message });
  }

  // Visual QP-02 / CUT-01
  if (stage === "export" || stage === "preflight") {
    for (const v of auditVisualQuality(bundle)) {
      if (filtered && v.id === "QP-02" && v.severity === "BLOCK") {
        // keep but do not escalate beyond matrix; still emit
      }
      push({
        id: v.id,
        severity: v.severity,
        message: v.message,
        shotIndex: v.shotIndex,
        evidence: v.evidence,
      });
    }
  }

  // Dialogue coverage (DC-01) — respect filtered soft policy via report only on full
  if ((stage === "export" || stage === "preflight") && !filtered) {
    const report = dialogueCoverageReport({
      script: bundle.script ?? "",
      shots,
      planData: bundle.planData,
    });
    if (!report.ok) {
      push({
        id: "DC-01",
        severity: "BLOCK",
        message: `分镜台词与剧本对不上：还缺 ${report.missingCount} 条${
          report.missingKeys[0] ? `（如「${String(report.missingKeys[0]).slice(0, 40)}」）` : ""
        }`,
        evidence: { missingKeys: report.missingKeys.slice(0, 10), missingCount: report.missingCount, repairReasons: ["unique_missing_line"] },
        softPatch: true,
      });
    }
  }

  // PR-09 lip duration (BLOCK only) + PR-CAM via existing validator
  if (stage === "export" || stage === "preflight") {
    const pr = runPrValidator(bundle);
    for (const item of pr.items) {
      if (item.ruleId === "PR-09" && item.severity === "BLOCK") {
        push({
          id: "LIP-01",
          severity: "BLOCK",
          message: item.message,
          shotIndex: item.shotIndex,
          // needsSplit/lipOver are must-Confirm; silent raise is DFW/canSilentRaise path — never softPatch LIP BLOCK
          softPatch: false,
        });
      } else if (item.ruleId === "PR-CAM-01") {
        push({
          id: "PR-CAM-01",
          severity: item.severity as "BLOCK" | "WARN",
          message: item.message,
          shotIndex: item.shotIndex,
          softPatch: true,
        });
      }
    }
  }

  // VIR / RET / NAR (+ density/avBeat); T3+ep1 elevates via matrix.t3Ep1Elevate
  if (stage === "export" || stage === "preflight" || stage === "burn") {
    if (stage === "export" || stage === "preflight") {
      // D17: keep true rule ids (no fold VIR-02→VIR-01)
      for (const g of [...auditScriptViralGaps(bundle), ...auditRetentionGaps(bundle)]) {
        if (
          g.id === "VIR-01" ||
          g.id === "VIR-00" ||
          g.id === "VIR-02" ||
          g.id === "RET-01" ||
          g.id === "RET-02"
        ) {
          push({
            id: g.id,
            severity: (g.severity as "BLOCK" | "WARN") ?? "WARN",
            message: g.message,
            shotIndex: g.shotIndex,
            evidence: { sourceId: g.id },
          });
        }
      }
      for (const g of auditNarrativeDriveGaps(bundle)) {
        if (g.id === "NAR-01" || g.id === "NAR-06" || g.id === "NAR-10") {
          push({
            id: g.id,
            severity: (g.severity as "BLOCK" | "WARN") ?? "WARN",
            message: g.message,
            evidence: { sourceId: g.id, field: g.field },
          });
        }
      }
      for (const d of checkDensityAvBeat(bundle)) {
        push(d);
      }
      // VIR-04 rhythm on shots
      for (const g of auditScriptViralGaps(bundle)) {
        if (g.id === "VIR-04") {
          push({
            id: "VIR-04",
            severity: (g.severity as "BLOCK" | "WARN") ?? "WARN",
            message: g.message,
          });
        }
      }
      // False-green: Chat modalityPromptAudit.FX=pass but any shot undeclared empty FX
      {
        const audit = (bundle as { modalityPromptAudit?: Record<string, unknown> }).modalityPromptAudit;
        const fxPass =
          audit &&
          (audit.FX === "pass" ||
            (audit as { modalities?: { FX?: string } }).modalities?.FX === "pass" ||
            Number((audit as { passRate?: number }).passRate) === 100);
        if (fxPass && shots.length >= 1) {
          const undeclaredIdx: number[] = [];
          for (const s of shots) {
            const idx = s.shotIndex as number | undefined;
            const fx = String((s.generation as { fxPrompt?: string })?.fxPrompt ?? "").trim();
            const feas = String(
              (s as { fxFeasibility?: string }).fxFeasibility ??
                (s.generation as { fxFeasibility?: string })?.fxFeasibility ??
                fxAuditItems.find((it) => it.shotIndex === idx)?.level ??
                "",
            ).trim();
            if (!fx && !feas) undeclaredIdx.push(idx ?? 0);
          }
          if (undeclaredIdx.length > 0) {
            push({
              id: "FX-FALSE-GREEN",
              severity: "BLOCK",
              message: `modalityPromptAudit 宣称 FX pass 但镜 ${undeclaredIdx.slice(0, 8).join(",")} 空未声明 F0（假绿）`,
              evidence: { shotCount: shots.length, undeclared: undeclaredIdx },
            });
          }
        }
      }
    }

    // NAR-14/15：导出 + 烧片 BLOCK（分句超预算无 splitHint / emotion_hit 无 reaction）
    const narSeen = new Set<string>();
    for (const g of auditNarrativeDriveGaps(bundle)) {
      if (g.id === "NAR-14" || g.id === "NAR-15") {
        const k = `${g.id}:${g.message}`;
        if (narSeen.has(k)) continue;
        narSeen.add(k);
        push({
          id: g.id,
          severity: "BLOCK",
          message: g.message,
          evidence: { field: g.field },
        });
      }
    }
    for (const s of shots) {
      const idx = s.shotIndex as number | undefined;
      for (const line of (s.narrative as { dialogue?: { lines?: { text?: string; splitHint?: string; functions?: string[]; reactionAction?: string; lineId?: string }[] } })
        ?.dialogue?.lines ?? []) {
        const text = String(line.text ?? "").trim();
        if (needsNar14Split(text, { splitHint: line.splitHint })) {
          const msg = `镜 ${idx ?? "?"} 长台词缺 splitHint，须标点拆句或拆镜后重导出`;
          const k = `NAR-14:${line.lineId ?? ""}:${msg}`;
          if (!narSeen.has(k) && !narSeen.has(`NAR-14:${msg}`)) {
            narSeen.add(k);
            push({
              id: "NAR-14",
              severity: "BLOCK",
              message: msg,
              shotIndex: idx,
              evidence: { textPreview: text.slice(0, 24), lineId: line.lineId },
            });
          }
        }
        if (line.functions?.includes("emotion_hit") && !String(line.reactionAction ?? "").trim()) {
          const msg = `镜 ${idx ?? "?"} emotion_hit 缺 reactionAction`;
          const k = `NAR-15:${line.lineId ?? ""}:${msg}`;
          if (!narSeen.has(k)) {
            narSeen.add(k);
            push({
              id: "NAR-15",
              severity: "BLOCK",
              message: msg,
              shotIndex: idx,
            });
          }
        }
      }
    }
  }

  const blocks = issues.filter((i) => i.severity === "BLOCK");
  const warns = issues.filter((i) => i.severity === "WARN");
  return {
    ok: blocks.length === 0,
    blocked: blocks.length > 0,
    stage,
    issues,
    blocks,
    warns,
  };
}

export function loadQualityMatrix(): QualityMatrixEntry[] {
  return loadMatrix();
}
