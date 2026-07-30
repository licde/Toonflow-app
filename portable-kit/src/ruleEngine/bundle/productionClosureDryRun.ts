import type { ProductionClosureCheck, ScriptBundle } from "./types";
import { readFixtureJson } from "../utils/fixturesPath";
import { loadVideoAudioPolicy, loadFxFeasibilityMatrix, normalizeFxLevel } from "../fixtures/policyFixtures";



interface ChecklistItem {

  id: string;

  field: string;

  rule: string;

  severity: string;

}



function resolveBundleAudioPolicy(bundle: ScriptBundle): string {
  const raw = bundle.videoAudioPolicy;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "defaultPolicy" in raw) {
    return String((raw as { defaultPolicy?: string }).defaultPolicy ?? "native");
  }
  return loadVideoAudioPolicy().defaultPolicy ?? "native";
}

function isFxLevel(item: { level?: string; feasibility?: string }, level: string): boolean {
  return normalizeFxLevel(item) === level;
}

type ShotRow = {
  shotIndex?: number;

  duration?: number;

  type?: string;

  videoMode?: string;

  shouldGenerateImage?: number;

  referenceImage?: string | null;

  storyboardImageId?: string | number;

  generate_audio?: boolean;

  charCodes?: string[];

  narrative?: { dialogue?: { lines?: unknown[] } };

};



type ModalityAuditItem = {

  shotIndex?: number;

  modality?: string;

  ruleId?: string;

  severity?: string;

  issue?: string;

};



type ModalityPromptAudit = {

  items?: ModalityAuditItem[];

  perShot?: Record<string, string>[];

  blockGenerate?: boolean;

};



function loadChecklist(): ChecklistItem[] {
  return readFixtureJson<{ checks?: ChecklistItem[] }>("production_closure_checklist.json", { checks: [] }).checks ?? [];
}

const T2_SUBSET: string[] = readFixtureJson<{ t2Subset?: string[] }>("production_closure_checklist.json", {}).t2Subset
  ?? ["PC-01", "PC-02", "PC-03", "PC-04", "PC-05"];



function severityFor(id: string, defaultSev: string): string {

  return loadChecklist().find((c) => c.id === id)?.severity ?? defaultSev;

}



function getShots(bundle: ScriptBundle): ShotRow[] {

  return (bundle.preDesignPack?.shots ?? []) as ShotRow[];

}



function getModalityAudit(bundle: ScriptBundle): ModalityPromptAudit | undefined {

  return bundle.modalityPromptAudit as ModalityPromptAudit | undefined;

}



function isAgnesVendor(bundle: ScriptBundle): boolean {

  const v = (bundle as ScriptBundle & { defaultVendor?: string }).defaultVendor ?? "agnesai";

  return /agnes/i.test(v);

}



function hasModalityBlock(audit: ModalityPromptAudit | undefined, modality: string): boolean {

  return (audit?.items ?? []).some((i) => i.modality === modality && i.severity === "BLOCK");

}



function auditIdentity(bundle: ScriptBundle): ProductionClosureCheck {

  const audit = bundle.identityAudit as { perShot?: { slots?: Record<string, { match?: boolean }> }[] } | undefined;

  if (!audit?.perShot?.length) {

    return { id: "PC-01", passed: true, message: "无 identityAudit（T1 可省略）", severity: "INFO" };

  }

  const fail = audit.perShot.some((p) => {

    const slots = p.slots ?? {};

    return Object.values(slots).some((s) => s.match === false);

  });

  return {

    id: "PC-01",

    passed: !fail,

    message: fail ? "identityAudit 存在 gender/voice 冲突" : "identityAudit PASS",

    severity: severityFor("PC-01", "BLOCK"),

  };

}



function auditFx(bundle: ScriptBundle): ProductionClosureCheck {
  const audit = bundle.fxFeasibilityAudit as { items?: { feasibility?: string; level?: string; postProductionOnly?: boolean }[] } | undefined;
  const matrix = loadFxFeasibilityMatrix();
  if (!audit?.items?.length) {
    return { id: "PC-02", passed: true, message: matrix.version ? "无 fxFeasibilityAudit" : "无 fxFeasibilityAudit", severity: "INFO" };
  }

  const f5 = audit.items.filter((i) => isFxLevel(i, "F5"));

  return {

    id: "PC-02",

    passed: f5.length === 0,

    message: f5.length ? `存在 ${f5.length} 个未处理 F5 特效` : "fxFeasibility PASS",

    severity: severityFor("PC-02", "BLOCK"),

  };

}



function auditPR(bundle: ScriptBundle): ProductionClosureCheck {

  const pr = bundle.productionReasonableness as {

    items?: { ruleId?: string; severity?: string }[];

    blockCount?: number;

  } | undefined;

  const legacy = bundle as ScriptBundle & { reasonablenessAudit?: typeof pr };

  const audit = pr ?? legacy.reasonablenessAudit;

  if (!audit?.items?.length) {

    return { id: "PC-03", passed: true, message: "无 productionReasonableness", severity: "INFO" };

  }

  const blocks = audit.items.filter((i) => i.severity === "BLOCK");

  const blockCount = audit.blockCount ?? blocks.length;

  return {

    id: "PC-03",

    passed: blockCount === 0,

    message: blockCount ? `PR BLOCK 共 ${blockCount} 项` : "PR reasonableness PASS",

    severity: severityFor("PC-03", "BLOCK"),

  };

}



function auditGraph(bundle: ScriptBundle): ProductionClosureCheck {

  const g = bundle.narrativeCausalityGraph as { broken?: unknown[]; reverseHints?: unknown[] } | undefined;

  if (!g) return { id: "PC-04", passed: true, message: "无 narrativeGraph", severity: "INFO" };

  const broken = g.broken ?? [];

  const ok = broken.length === 0 || (g.reverseHints?.length ?? 0) >= broken.length;

  return {

    id: "PC-04",

    passed: ok,

    message: ok ? "narrativeGraph OK" : "broken 边缺少 reverseHints",

    severity: severityFor("PC-04", "BLOCK"),

  };

}



function auditDebut(bundle: ScriptBundle): ProductionClosureCheck {

  const d = bundle.debutIntroPack as { characters?: unknown[]; scenes?: unknown[]; props?: unknown[] } | undefined;

  if (!d) return { id: "PC-05", passed: true, message: "无 debutIntroPack", severity: "INFO" };

  const hasMain = (d.characters?.length ?? 0) > 0 && (d.scenes?.length ?? 0) > 0;

  const prBlock = (bundle.productionReasonableness as { items?: { ruleId?: string; severity?: string }[] })?.items?.some(

    (i) => i.ruleId === "PR-16" && i.severity === "BLOCK",

  );

  if (prBlock) {

    return {

      id: "PC-05",

      passed: false,

      message: "PR-16 首次出场缺 establishing",

      severity: severityFor("PC-05", "WARN"),

    };

  }

  return {

    id: "PC-05",

    passed: hasMain,

    message: hasMain ? "debutIntroPack 齐全" : "debutIntroPack 缺主角色或主场景",

    severity: severityFor("PC-05", "WARN"),

  };

}



function auditModality(bundle: ScriptBundle): ProductionClosureCheck {

  const audit = getModalityAudit(bundle);

  if (!audit?.perShot?.length && !audit?.items?.length) {

    return { id: "PC-06", passed: true, message: "无 modalityPromptAudit（T1/T2 可省略）", severity: "INFO" };

  }

  const perShotFail = (audit.perShot ?? []).some((row) => Object.values(row).some((v) => v === "BLOCK" || v === "FAIL"));

  const itemFail = (audit.items ?? []).some((i) => i.severity === "BLOCK");

  const fail = perShotFail || itemFail;

  return {

    id: "PC-06",

    passed: !fail,

    message: fail ? "modalityPromptAudit 存在 BLOCK/FAIL" : "modalityPromptAudit PASS",

    severity: severityFor("PC-06", "BLOCK"),

  };

}



function auditHash(bundle: ScriptBundle): ProductionClosureCheck {

  const h = bundle.preDesignPack?.externalHashCheck;

  if (!h) return { id: "PC-07", passed: true, message: "无 externalHashCheck", severity: "INFO" };

  return {

    id: "PC-07",

    passed: h.match !== false,

    message: h.match === false ? "externalHashCheck.match=false" : "hash OK",

    severity: severityFor("PC-07", "BLOCK"),

  };

}



function auditLinkage(bundle: ScriptBundle): ProductionClosureCheck {

  const la = bundle.linkageAudit as { chains?: { broken?: boolean; chain?: string }[] } | undefined;

  if (!la?.chains?.length) {

    return { id: "PC-08", passed: true, message: "无 linkageAudit", severity: "INFO" };

  }

  const broken = la.chains.filter((c) => c.broken);

  return {

    id: "PC-08",

    passed: broken.length === 0,

    message: broken.length ? `linkageAudit ${broken.length} 链断裂` : "linkageAudit PASS",

    severity: severityFor("PC-08", "BLOCK"),

  };

}



/** PC-09 · VID 首帧/时长/运镜（Agnes singleImage） */

function auditVid(bundle: ScriptBundle): ProductionClosureCheck {

  const shots = getShots(bundle);

  const audit = getModalityAudit(bundle);

  if (!shots.length && !hasModalityBlock(audit, "VID")) {

    return { id: "PC-09", passed: true, message: "无 VID 检查项", severity: "INFO" };

  }

  if (hasModalityBlock(audit, "VID")) {

    return {

      id: "PC-09",

      passed: false,

      message: "VID modalityPromptAudit BLOCK（首帧/运镜/时长）",

      severity: severityFor("PC-09", "BLOCK"),

    };

  }

  if (isAgnesVendor(bundle)) {

    for (const shot of shots) {

      const singleImage = shot.videoMode === "singleImage" || shot.shouldGenerateImage === 1;

      if (singleImage && !shot.referenceImage && shot.storyboardImageId == null) {

        return {

          id: "PC-09",

          passed: false,

          message: `镜 ${shot.shotIndex ?? "?"} Agnes singleImage 缺首位帧`,

          severity: severityFor("PC-09", "BLOCK"),

        };

      }

      const dur = Number(shot.duration);

      if (dur && (dur < 1 || dur > 30)) {

        return {

          id: "PC-09",

          passed: false,

          message: `镜 ${shot.shotIndex ?? "?"} duration ${dur}s 超出 1-30`,

          severity: severityFor("PC-09", "BLOCK"),

        };

      }

    }

  }

  return { id: "PC-09", passed: true, message: "VID 首帧/时长 PASS", severity: severityFor("PC-09", "BLOCK") };

}



/** PC-10 · AUD native/TTS + voiceProfile */

function auditAud(bundle: ScriptBundle): ProductionClosureCheck {

  const shots = getShots(bundle);

  const audit = getModalityAudit(bundle);

  const policy = resolveBundleAudioPolicy(bundle);

  if (hasModalityBlock(audit, "AUD")) {

    return {

      id: "PC-10",

      passed: false,

      message: "AUD modalityPromptAudit BLOCK（voice/lines/native）",

      severity: severityFor("PC-10", "BLOCK"),

    };

  }

  for (const shot of shots) {

    const lines = shot.narrative?.dialogue?.lines ?? [];

    if (lines.length && policy === "native" && shot.generate_audio === false) {

      return {

        id: "PC-10",

        passed: false,

        message: `镜 ${shot.shotIndex ?? "?"} 台词镜 generate_audio=false 与 native 策略冲突`,

        severity: severityFor("PC-10", "BLOCK"),

      };

    }

  }

  if (!shots.length && !audit?.items?.length) {

    return { id: "PC-10", passed: true, message: "无 AUD 检查项", severity: "INFO" };

  }

  return { id: "PC-10", passed: true, message: "AUD native/voice PASS", severity: severityFor("PC-10", "BLOCK") };

}



/** PC-11 · IMG cref/identity/PURE */

function auditImg(bundle: ScriptBundle): ProductionClosureCheck {

  const audit = getModalityAudit(bundle);

  if (hasModalityBlock(audit, "IMG")) {

    return {

      id: "PC-11",

      passed: false,

      message: "IMG modalityPromptAudit BLOCK（cref/identity/PURE）",

      severity: severityFor("PC-11", "BLOCK"),

    };

  }

  const perShot = audit?.perShot ?? [];

  const imgBlock = perShot.some((row) => row.IMG === "BLOCK" || row.IMG === "FAIL");

  if (imgBlock) {

    return {

      id: "PC-11",

      passed: false,

      message: "IMG perShot BLOCK",

      severity: severityFor("PC-11", "BLOCK"),

    };

  }

  if (!audit?.items?.length && !perShot.length) {

    return { id: "PC-11", passed: true, message: "无 IMG 检查项", severity: "INFO" };

  }

  return { id: "PC-11", passed: true, message: "IMG cref/identity PASS", severity: severityFor("PC-11", "BLOCK") };

}



/** PC-12 · FX F5/F4 postProductionOnly */

function auditFxModality(bundle: ScriptBundle): ProductionClosureCheck {

  const audit = bundle.fxFeasibilityAudit as {

    items?: { feasibility?: string; postProductionOnly?: boolean; degradeHint?: string }[];

  } | undefined;

  if (!audit?.items?.length) {

    return { id: "PC-12", passed: true, message: "无 FX 专项检查", severity: "INFO" };

  }

  const f5 = audit.items.filter((i) => isFxLevel(i, "F5") && !i.degradeHint);

  if (f5.length) {

    return {

      id: "PC-12",

      passed: false,

      message: `存在 ${f5.length} 个 F5 未降级/无 degradeHint`,

      severity: severityFor("PC-12", "BLOCK"),

    };

  }

  const f4missing = audit.items.filter((i) => isFxLevel(i, "F4") && !i.postProductionOnly);

  if (f4missing.length) {

    return {

      id: "PC-12",

      passed: false,

      message: `存在 ${f4missing.length} 个 F4 未标注 postProductionOnly`,

      severity: severityFor("PC-12", "BLOCK"),

    };

  }

  return { id: "PC-12", passed: true, message: "FX F4/F5 PASS", severity: severityFor("PC-12", "BLOCK") };

}



/** PC-13 · T3 四 slot 齐全 */

function auditModalitySlots(bundle: ScriptBundle): ProductionClosureCheck {

  const audit = getModalityAudit(bundle);

  const perShot = audit?.perShot ?? [];

  if (!perShot.length) {

    const hasT3Items = (audit?.items ?? []).some((i) => i.modality && ["IMG", "VID", "AUD", "FX"].includes(i.modality));

    if (!hasT3Items) {

      return { id: "PC-13", passed: true, message: "无 T3 四 slot 检查（T1/T2）", severity: "INFO" };

    }

    const modalities = new Set((audit?.items ?? []).map((i) => i.modality).filter(Boolean));

    const required = ["IMG", "VID", "AUD", "FX"];

    const missing = required.filter((m) => !modalities.has(m));

    if (missing.length) {

      return {

        id: "PC-13",

        passed: false,

        message: `T3 缺模态 slot: ${missing.join(", ")}`,

        severity: severityFor("PC-13", "BLOCK"),

      };

    }

    return { id: "PC-13", passed: true, message: "T3 四 slot 齐全", severity: severityFor("PC-13", "BLOCK") };

  }

  const required = ["IMG", "VID", "AUD", "FX"];

  for (const row of perShot) {

    const missing = required.filter((m) => !row[m]);

    if (missing.length) {

      return {

        id: "PC-13",

        passed: false,

        message: `perShot 缺模态: ${missing.join(", ")}`,

        severity: severityFor("PC-13", "BLOCK"),

      };

    }

  }

  return { id: "PC-13", passed: true, message: "T3 四 slot 齐全", severity: severityFor("PC-13", "BLOCK") };

}



/** PC-14 · identityAudit 跨 IMG/VID/AUD（与 PC-01 合流强化） */

function auditCrossModalIdentity(bundle: ScriptBundle): ProductionClosureCheck {

  const audit = bundle.identityAudit as {

    perShot?: { slots?: Record<string, { match?: boolean }> }[];

  } | undefined;

  if (!audit?.perShot?.length) {

    return { id: "PC-14", passed: true, message: "无跨模态 identity（T1 可省略）", severity: "INFO" };

  }

  const modalities = ["IMG", "VID", "AUD"];

  const fail = audit.perShot.some((p) => {

    const slots = p.slots ?? {};

    return modalities.some((m) => slots[m]?.match === false);

  });

  return {

    id: "PC-14",

    passed: !fail,

    message: fail ? "跨模态 identity IMG/VID/AUD 不一致" : "跨模态 identity PASS",

    severity: severityFor("PC-14", "BLOCK"),

  };

}



/** Chat T3 export 与 import dryRun 共用（G64/G71/G73-G85） */

export function runProductionClosureDryRun(bundle: ScriptBundle): ProductionClosureCheck[] {
  return runProductionClosureDryRunForTier(bundle, "T3");
}

export function runProductionClosureDryRunForTier(bundle: ScriptBundle, tier: "T2" | "T3"): ProductionClosureCheck[] {
  const all = [
    auditIdentity(bundle),
    auditFx(bundle),
    auditPR(bundle),
    auditGraph(bundle),
    auditDebut(bundle),
    auditModality(bundle),
    auditHash(bundle),
    auditLinkage(bundle),
    auditVid(bundle),
    auditAud(bundle),
    auditImg(bundle),
    auditFxModality(bundle),
    auditModalitySlots(bundle),
    auditCrossModalIdentity(bundle),
  ];
  return tier === "T2" ? all.filter((c) => T2_SUBSET.includes(c.id)) : all;
}



export function productionClosureBlocked(checks: ProductionClosureCheck[]): boolean {

  return checks.some((c) => !c.passed && c.severity === "BLOCK");

}



export function productionClosureExportAllowed(bundle: ScriptBundle): { allowed: boolean; checks: ProductionClosureCheck[] } {

  const checks = runProductionClosureDryRun(bundle);

  return { allowed: !productionClosureBlocked(checks), checks };

}

