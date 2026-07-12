import type { ProductionClosureCheck, ScriptBundle } from "../bundle/types";
import { dialogueLineCountMismatch, traceCoverageOk } from "../design/forwardTrace";
import { validateLinkageChains } from "../design/linkageValidator";
import { readFixtureJson } from "../utils/fixturesPath";

function loadChecklist(): { id: string; severity: string }[] {
  return readFixtureJson<{ checks?: { id: string; severity: string }[] }>("design_closure_checklist.json", { checks: [] }).checks ?? [];
}

function sev(id: string, def: string): string {
  return loadChecklist().find((c) => c.id === id)?.severity ?? def;
}

const CAMERA_TRANSITIONS = new Set(["切", "淡入", "淡出", "叠化", "cut", "fade", "dissolve"]);

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

export function runDesignClosureDryRun(bundle: ScriptBundle): ProductionClosureCheck[] {
  const checks: ProductionClosureCheck[] = [];
  const h = bundle.preDesignPack?.externalHashCheck;
  const brief = briefOf(bundle);
  const shots = shotsOf(bundle);

  checks.push({
    id: "DC-01",
    passed: !dialogueLineCountMismatch(bundle),
    message: dialogueLineCountMismatch(bundle) ? "台词镜覆盖率不足" : "R2 coverage OK",
    severity: sev("DC-01", "BLOCK"),
  });

  checks.push({
    id: "DC-02",
    passed: h?.match !== false,
    message: h?.match === false ? "linesHash mismatch" : "hash OK",
    severity: sev("DC-02", "BLOCK"),
  });

  const b5 = brief.infoLinkageChain ?? brief.B5 ?? [];
  const hasMarkers = shots.some((s) => (s.markers?.length ?? s.narrative?.markers?.length ?? 0) > 0);
  checks.push({
    id: "DC-03",
    passed: !b5.length || hasMarkers,
    message: !b5.length || hasMarkers ? "story markers OK" : "B5 无 SB.markers",
    severity: sev("DC-03", "BLOCK"),
  });

  const b4 = brief.emotionCurveOutline ?? brief.B4;
  const emotions = shots.map((s) => Number(s.emotion ?? s.narrative?.emotionIntensity ?? 0)).filter((n) => n > 0);
  const avDrift = b4?.length && emotions.length
    ? Math.max(...emotions.map((e) => Math.min(...b4.map((b) => Math.abs(e - b)))))
    : 0;
  checks.push({
    id: "DC-04",
    passed: !b4?.length || avDrift <= 2,
    message: avDrift <= 2 ? "av emotion OK" : `B4 偏差 ${avDrift}`,
    severity: sev("DC-04", "BLOCK"),
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
    passed: !sceneBroken,
    message: sceneBroken ? "B6 场景未映射 SB" : "scene OK",
    severity: sev("DC-06", "BLOCK"),
  });

  const fxAudit = bundle.fxFeasibilityAudit as { items?: unknown[] } | undefined;
  checks.push({
    id: "DC-07",
    passed: !b5.length || hasMarkers || (fxAudit?.items?.length ?? 0) > 0,
    message: "story→fx",
    severity: sev("DC-07", "WARN"),
  });

  const scriptChars = bundle.characters ?? [];
  const shotChars = new Set(shots.flatMap((s) => s.charCodes ?? []));
  const charBroken = scriptChars.length > 0 && shots.length > 0 && shotChars.size === 0;
  checks.push({
    id: "DC-08",
    passed: !charBroken,
    message: charBroken ? "charCodes 缺失" : "asset OK",
    severity: sev("DC-08", "BLOCK"),
  });

  const badCamera = shots.some((s) => {
    const t = s.narrative?.transitionType;
    return t && !CAMERA_TRANSITIONS.has(t);
  });
  checks.push({
    id: "DC-09",
    passed: !badCamera,
    message: badCamera ? "transition 非法" : "camera OK",
    severity: sev("DC-09", "WARN"),
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

  const linkage = validateLinkageChains(bundle);
  const broken = linkage.filter((l) => l.broken);
  checks.push({
    id: "DC-13",
    passed: broken.length === 0,
    message: broken.length ? `linkage ${broken.length} broken` : "linkage OK",
    severity: sev("DC-13", "BLOCK"),
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

  return checks;
}

export function designClosureBlocked(checks: ProductionClosureCheck[]): boolean {
  return checks.some((c) => !c.passed && c.severity === "BLOCK");
}
