import type { ProductionClosureCheck, ScriptBundle } from "../bundle/types";
import { traceCoverageOk } from "../design/forwardTrace";
import { readFixtureJson } from "../utils/fixturesPath";
import { dc01Adapter } from "../precheckLoop/adapters/dc01";
import { dc13Adapter } from "../precheckLoop/adapters/dc13";
import type { PrecheckScope } from "../precheckLoop/types";
import { isAllowedTransition, loadCameraMotionWhitelist } from "../qualityGate/cameraWhitelist";
import { auditCastCoverage } from "./designExportHelpers";

function loadChecklist(): { id: string; severity: string }[] {
  return readFixtureJson<{ checks?: { id: string; severity: string }[] }>("design_closure_checklist.json", { checks: [] }).checks ?? [];
}

function sev(id: string, def: string): string {
  return loadChecklist().find((c) => c.id === id)?.severity ?? def;
}

type Brief = {
  emotionCurveOutline?: number[];
  B4?: number[];
  infoLinkageChain?: unknown[];
  B5?: unknown[];
  assetHints?: { scenes?: string[]; characters?: string[] };
  B6?: { scenes?: string[] };
  B7?: string;
  B8?: string;
  B9?: string;
  audioMood?: string;
};

type Shot = {
  sceneName?: string;
  emotion?: number;
  charCodes?: string[];
  markers?: unknown[];
  narrative?: {
    sceneName?: string;
    emotionIntensity?: number;
    transitionType?: string;
    rhythmZone?: string;
    markers?: unknown[];
    dialogue?: { lines?: unknown[] };
  };
};

function briefOf(bundle: ScriptBundle): Brief {
  return (bundle.designBrief ?? {}) as Brief;
}

function shotsOf(bundle: ScriptBundle): Shot[] {
  return (bundle.preDesignPack?.shots ?? []) as Shot[];
}

export function runDesignClosureDryRun(
  bundle: ScriptBundle,
  opts?: { scope?: PrecheckScope },
): ProductionClosureCheck[] {
  const checks: ProductionClosureCheck[] = [];
  const h = bundle.preDesignPack?.externalHashCheck;
  const brief = briefOf(bundle);
  const shots = shotsOf(bundle);
  const filtered =
    opts?.scope?.mode === "filtered" || opts?.scope?.storyboardIds != null;

  const dc01 = dc01Adapter.diagnose({ bundle, scope: opts?.scope });
  checks.push({
    id: "DC-01",
    passed: dc01.passed,
    message: dc01.message,
    severity: dc01.passed ? sev("DC-01", "BLOCK") : dc01.severity,
    detail: dc01.evidence,
  });

  checks.push({
    id: "DC-02",
    passed: h?.match !== false,
    message: h?.match === false ? "linesHash mismatch" : "hash OK",
    severity: sev("DC-02", "BLOCK"),
  });

  const b5 = brief.infoLinkageChain ?? brief.B5 ?? [];
  const hasMarkers = shots.some((s) => (s.markers?.length ?? s.narrative?.markers?.length ?? 0) > 0);
  const dc03Broken = b5.length > 0 && !hasMarkers;
  checks.push({
    id: "DC-03",
    passed: !dc03Broken || filtered,
    message: !dc03Broken
      ? "story markers OK"
      : filtered
        ? "B5 无 SB.markers（局部触达未 BLOCK）"
        : "B5 无 SB.markers",
    severity: filtered && dc03Broken ? "WARN" : sev("DC-03", "BLOCK"),
    detail: dc03Broken ? { shotScope: filtered ? "filtered" : "full", b5Count: b5.length } : undefined,
  });

  const b4 = brief.emotionCurveOutline ?? brief.B4;
  const emotions = shots.map((s) => Number(s.emotion ?? s.narrative?.emotionIntensity ?? 0)).filter((n) => n > 0);
  const avDrift = b4?.length && emotions.length
    ? Math.max(...emotions.map((e) => Math.min(...b4.map((b) => Math.abs(e - b)))))
    : 0;
  const dc04Broken = Boolean(b4?.length && avDrift > 2);
  checks.push({
    id: "DC-04",
    passed: !dc04Broken || filtered,
    message: !dc04Broken ? "av emotion OK" : filtered ? `B4 偏差 ${avDrift}（局部触达未 BLOCK）` : `B4 偏差 ${avDrift}`,
    severity: filtered && dc04Broken ? "WARN" : sev("DC-04", "BLOCK"),
  });

  const cont = bundle.continuity;
  checks.push({
    id: "DC-05",
    passed: !!(brief.B7 || brief.B8 || cont?.prevEpisodeSummary || cont?.characterState),
    message: "continuity",
    severity: sev("DC-05", "WARN"),
  });

  const scenes = brief.assetHints?.scenes ?? brief.B6?.scenes ?? bundle.scenes ?? [];
  const sbScenes = new Set(shots.map((s) => s.sceneName ?? s.narrative?.sceneName).filter(Boolean));
  const sceneBroken = scenes.length > 0 && shots.length > 0 && sbScenes.size === 0;
  checks.push({
    id: "DC-06",
    passed: !sceneBroken || filtered,
    message: !sceneBroken ? "scene OK" : filtered ? "B6 场景未映射（局部触达未 BLOCK）" : "B6 场景未映射 SB",
    severity: filtered && sceneBroken ? "WARN" : sev("DC-06", "BLOCK"),
  });

  const fxAudit = bundle.fxFeasibilityAudit as { items?: unknown[] } | undefined;
  checks.push({
    id: "DC-07",
    passed: !b5.length || hasMarkers || (fxAudit?.items?.length ?? 0) > 0 || filtered,
    message: filtered && dc03Broken ? "story→fx（局部触达 WARN）" : "story→fx",
    severity: sev("DC-07", "WARN"),
  });

  const scriptChars = bundle.characters ?? [];
  const shotChars = new Set(shots.flatMap((s) => s.charCodes ?? []));
  const charBroken = scriptChars.length > 0 && shots.length > 0 && shotChars.size === 0;
  checks.push({
    id: "DC-08",
    passed: !charBroken || filtered,
    message: !charBroken ? "asset OK" : filtered ? "charCodes 缺失（局部触达未 BLOCK）" : "charCodes 缺失",
    severity: filtered && charBroken ? "WARN" : sev("DC-08", "BLOCK"),
  });

  const wl = loadCameraMotionWhitelist();
  const badCameraShots = shots.filter((s) => {
    const t = s.narrative?.transitionType;
    return Boolean(t && !isAllowedTransition(String(t), wl));
  });
  const badCamera = badCameraShots.length > 0;
  checks.push({
    id: "DC-09",
    passed: !badCamera,
    message: badCamera
      ? `transition 非法: ${badCameraShots.map((s) => s.narrative?.transitionType).join(",")}`
      : "camera OK",
    severity: badCamera ? "BLOCK" : sev("DC-09", "WARN"),
    detail: badCamera
      ? { allowed: wl.transitions, defaultTransition: wl.defaultTransition }
      : undefined,
  });

  const b9 = brief.B9 ?? brief.audioMood;
  const t3Aud = bundle.modalityPromptAudit;
  checks.push({
    id: "DC-10",
    passed: !b9 || !!t3Aud || bundle.bundleType === "script",
    message: "av→modality",
    severity: sev("DC-10", "WARN"),
  });

  const d = bundle.debutIntroPack as { characters?: unknown[]; scenes?: unknown[] } | undefined;
  checks.push({
    id: "DC-11",
    passed: !d || ((d.characters?.length ?? 0) > 0 && (d.scenes?.length ?? 0) > 0),
    message: "debutIntroPack",
    severity: sev("DC-11", "WARN"),
  });

  checks.push({
    id: "DC-12",
    passed: !bundle.modalityPromptAudit || !!(bundle as ScriptBundle & { flowData?: unknown }).flowData,
    message: "compile draft",
    severity: sev("DC-12", "INFO"),
  });

  const dc13 = dc13Adapter.diagnose({ bundle, scope: opts?.scope });
  checks.push({
    id: "DC-13",
    passed: dc13.passed,
    message: dc13.message,
    severity: dc13.passed ? sev("DC-13", "BLOCK") : dc13.severity,
    detail: dc13.evidence,
  });

  checks.push({
    id: "DC-14",
    passed: traceCoverageOk(bundle) || !bundle.forwardTrace,
    message: traceCoverageOk(bundle) ? "forwardTrace OK" : "forwardTrace 覆盖不足",
    severity: sev("DC-14", "WARN"),
  });

  const plan = bundle.planData as { adaptationMatrix?: unknown; W2?: unknown } | undefined;
  checks.push({
    id: "DC-15",
    passed: !plan?.adaptationMatrix || !!plan?.W2,
    message: "adaptation chain",
    severity: sev("DC-15", "WARN"),
  });

  const cast = auditCastCoverage(bundle);
  const dc16Broken = cast.block;
  checks.push({
    id: "DC-16",
    passed: !dc16Broken || filtered,
    message: !dc16Broken
      ? "cast CD coverage OK"
      : filtered
        ? `配角入册缺口（局部触达未 BLOCK）: ${cast.labels.join("、")}`
        : `配角未入册或仅 stub/缺 L0.identity: ${cast.labels.join("、")}`,
    severity: filtered && dc16Broken ? "WARN" : sev("DC-16", "BLOCK"),
    detail: dc16Broken
      ? {
          missingSpeakers: cast.missingSpeakers,
          missingCodes: cast.missingCodes,
          stubOrIncomplete: cast.stubOrIncomplete,
        }
      : undefined,
  });

  return checks;
}

export function designClosureBlocked(checks: ProductionClosureCheck[]): boolean {
  return checks.some((c) => !c.passed && c.severity === "BLOCK");
}
