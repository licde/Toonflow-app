/**
 * L2 ingest heal — provenance-only, confidence-gated, revalidate after apply.
 */
import { createHash } from "crypto";
import { ensureShotPerformanceDefaults } from "../emotion/defaultPerformance";
import { healMinConfidence, exprHighIntensityThreshold, loadSvqDoctrine } from "./loadSvqDoctrine";
import { L2_CONFLICT_ORDER, type ShotQualityProvenance } from "./healOwnership";
import {
  checkCastOnDesc,
  checkEmptyShotConsistency,
  checkSpeakPerformance,
  extractMentionedNames,
  stripEmptyShotConflictClauses,
  type ShotQualityFinding,
} from "./shotQualityPredicates";
import { hasOnCameraDialogue } from "../design/onCameraDialogue";
import { matchDescNamesToCasting } from "./matchDescNamesToCasting";

export type HealDiff = {
  field: string;
  from?: unknown;
  to?: unknown;
  reasonCode: string;
  confidence: number;
  source: string;
  shotIndex?: number;
};

export type HealShotQualityResult = {
  healed: number;
  diffs: HealDiff[];
  unsalvageable: ShotQualityFinding[];
  residual: ShotQualityFinding[];
  proposedOnly: boolean;
  fingerprint: string;
};

type CdAsset = { code?: string; name?: string; stillUrl?: string | null };
type ShotLike = {
  shotIndex?: number;
  visualDescription?: string;
  charCodes?: string[];
  duration?: number;
  narrative?: { dialogue?: { lines?: unknown[] }; emotionIntensity?: number };
  emotionIntensity?: number;
  shotDesign?: {
    performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
    lipSyncPolicy?: string;
  };
  reason?: Record<string, unknown> | string;
};

function cdIndex(assets: CdAsset[] | undefined): {
  knownNames: string[];
  nameToCodes: Record<string, string[]>;
} {
  const knownNames: string[] = [];
  const nameToCodes: Record<string, string[]> = {};
  for (const a of assets ?? []) {
    const name = String(a.name ?? "").replace(/（OS）|\(OS\)/g, "").trim();
    const code = String(a.code ?? "").trim();
    if (!name || !code) continue;
    knownNames.push(name);
    (nameToCodes[name] ??= []).push(code);
  }
  return { knownNames, nameToCodes };
}

function matchCodesForNames(
  names: string[],
  nameToCodes: Record<string, string[]>,
): { codes: string[]; confidence: number; ambiguous: boolean } {
  const codes: string[] = [];
  let ambiguous = false;
  let hits = 0;
  for (const n of names) {
    const list = nameToCodes[n] ?? [];
    if (list.length > 1) ambiguous = true;
    if (list.length === 1) {
      codes.push(list[0]);
      hits++;
    } else if (list.length === 0) {
      /* no map */
    }
  }
  const confidence = names.length ? hits / names.length : 0;
  return { codes: [...new Set(codes)], confidence, ambiguous };
}

function shotFingerprint(shot: ShotLike, diffs: HealDiff[]): string {
  const base = JSON.stringify({
    i: shot.shotIndex,
    vd: shot.visualDescription,
    cc: shot.charCodes,
    d: diffs.map((x) => [x.field, x.reasonCode, x.to]),
  });
  return createHash("sha1").update(base).digest("hex").slice(0, 16);
}

function readPrevFingerprint(shot: ShotLike): string | undefined {
  try {
    const r = typeof shot.reason === "string" ? JSON.parse(shot.reason) : shot.reason;
    return (r as { shotQualityHeals?: { fingerprint?: string } })?.shotQualityHeals?.fingerprint;
  } catch {
    return undefined;
  }
}

function writeProvenance(shot: ShotLike, prov: ShotQualityProvenance): void {
  let prev: Record<string, unknown> = {};
  try {
    prev = typeof shot.reason === "string" ? JSON.parse(shot.reason || "{}") : { ...(shot.reason ?? {}) };
  } catch {
    prev = {};
  }
  prev.shotQualityHeals = prov;
  shot.reason = prev;
}

export function healShotQuality(input: {
  shots: ShotLike[];
  characterAssets?: CdAsset[];
  /** When true, do not mutate — only propose diffs */
  proposeOnly?: boolean;
  chatStrict?: boolean;
}): HealShotQualityResult {
  const doctrine = loadSvqDoctrine();
  const minConf = healMinConfidence();
  const proposeOnly = Boolean(input.proposeOnly || input.chatStrict);
  const { knownNames, nameToCodes } = cdIndex(input.characterAssets);
  const diffs: HealDiff[] = [];
  const unsalvageable: ShotQualityFinding[] = [];
  const residual: ShotQualityFinding[] = [];
  let healed = 0;
  const order = doctrine.heal.conflictOrder?.length ? doctrine.heal.conflictOrder : [...L2_CONFLICT_ORDER];

  for (const shot of input.shots ?? []) {
    const idx = Number(shot.shotIndex) || undefined;
    const localDiffs: HealDiff[] = [];

    const runCast = () => {
      const vd = String(shot.visualDescription ?? "");
      const matched = matchDescNamesToCasting({
        visualDescription: vd,
        knownNames,
        nameToCodes,
      });
      // Unique CD hits → append charCodes
      if (matched.bound.length) {
        const from = [...(shot.charCodes ?? [])];
        const add = matched.bound.map((b) => b.code).filter((c) => !from.includes(c));
        if (add.length) {
          const to = [...from, ...add];
          const conf = matched.bound.every((b) => b.confidence >= minConf) ? 1 : 0.5;
          if (conf >= minConf) {
            const diff: HealDiff = {
              field: "charCodes",
              from,
              to,
              reasonCode: "cast_on_desc",
              confidence: conf,
              source: "matchDescNamesToCasting",
              shotIndex: idx,
            };
            localDiffs.push(diff);
            if (!proposeOnly) shot.charCodes = to;
          }
        }
      }
      if (matched.ambiguous.length) {
        unsalvageable.push({
          id: "DEX-CAST-ON-DESC",
          severity: "BLOCK",
          message: `镜 ${idx ?? "?"} 描写点名歧义「${matched.ambiguous.map((a) => a.name).join("、")}」拒绑`,
          shotIndex: idx,
          evidence: { ambiguous: matched.ambiguous },
        });
      }
      // Casting-first: never invent CHAR-ORPH / CD stubs from VD free NER (proposeOnly included).
      // True cast gaps → speakersMissingFromCd / auditCastCoverage (must-edit CD).
      const finding = checkCastOnDesc({
        visualDescription: vd,
        charCodes: shot.charCodes,
        knownNames,
        nameToCodes,
        shotIndex: idx,
      });
      if (finding && !matched.bound.length) {
        const mentioned = extractMentionedNames(vd, knownNames);
        const match = matchCodesForNames(mentioned, nameToCodes);
        if (match.ambiguous || match.confidence < minConf || !match.codes.length) {
          unsalvageable.push({
            ...finding,
            evidence: { ...(finding.evidence ?? {}), ambiguous: match.ambiguous, confidence: match.confidence },
          });
        }
      }
    };

    const runEmpty = () => {
      const vd = String(shot.visualDescription ?? "");
      const finding = checkEmptyShotConsistency({
        visualDescription: vd,
        charCodes: shot.charCodes,
        knownNames,
        shotIndex: idx,
      });
      if (!finding) return;
      const stripped = stripEmptyShotConflictClauses(vd);
      if (stripped === vd) {
        unsalvageable.push(finding);
        return;
      }
      const diff: HealDiff = {
        field: "visualDescription",
        from: vd,
        to: stripped,
        reasonCode: "empty_shot_strip",
        confidence: 0.9,
        source: "stripEmptyShotConflictClauses",
        shotIndex: idx,
      };
      localDiffs.push(diff);
      if (!proposeOnly) shot.visualDescription = stripped;
    };

    const runPerf = () => {
      const lines = shot.narrative?.dialogue?.lines ?? [];
      const hasDialogue = hasOnCameraDialogue(lines);
      const intensity = Number(shot.emotionIntensity ?? shot.narrative?.emotionIntensity ?? 0);
      const thr = exprHighIntensityThreshold();
      // High intensity: never auto-default (must-edit)
      if (hasDialogue && intensity >= thr) {
        const f = checkSpeakPerformance({
          hasDialogue,
          emotionIntensity: intensity,
          microExpression: shot.shotDesign?.performance?.microExpression,
          lipSyncPolicy: shot.shotDesign?.lipSyncPolicy,
          shotIndex: idx,
        });
        if (f) residual.push(f);
        return;
      }
      if (proposeOnly) return;
      const before = JSON.stringify(shot.shotDesign?.performance ?? null);
      const applied = ensureShotPerformanceDefaults(shot as never);
      if (applied) {
        localDiffs.push({
          field: "shotDesign.performance.microExpression",
          from: before,
          to: shot.shotDesign?.performance?.microExpression,
          reasonCode: "performance_defaults",
          confidence: 0.8,
          source: "ensureShotPerformanceDefaults",
          shotIndex: idx,
        });
      }
    };

    for (const step of order) {
      if (step === "cast_on_desc") runCast();
      else if (step === "empty_shot") runEmpty();
      else if (step === "performance_defaults") runPerf();
    }

    // Revalidate after apply
    const afterCast = checkCastOnDesc({
      visualDescription: shot.visualDescription,
      charCodes: shot.charCodes,
      knownNames,
      nameToCodes,
      shotIndex: idx,
    });
    if (afterCast) residual.push(afterCast);
    const afterEmpty = checkEmptyShotConsistency({
      visualDescription: shot.visualDescription,
      charCodes: shot.charCodes,
      knownNames,
      shotIndex: idx,
    });
    if (afterEmpty) residual.push(afterEmpty);

    const fp = shotFingerprint(shot, localDiffs);
    const prevFp = readPrevFingerprint(shot);
    if (prevFp && prevFp === fp && localDiffs.length) {
      // idempotent — skip recount
      continue;
    }

    if (localDiffs.length) {
      const validated = localDiffs.filter((d) => {
        if (d.reasonCode === "cast_on_desc" && afterCast) return false;
        if (d.reasonCode === "empty_shot_strip" && afterEmpty) return false;
        return true;
      });
      if (validated.length && !proposeOnly) {
        writeProvenance(shot, { layer: "L2", heals: validated, fingerprint: fp });
        healed += 1;
      } else if (validated.length && proposeOnly) {
        healed += 0;
      } else if (localDiffs.length && !validated.length) {
        // applied but revalidate failed — treat as residual
        for (const d of localDiffs) {
          residual.push({
            id: "DEX-CAST-ON-DESC",
            severity: "BLOCK",
            message: `修后回验失败: ${d.reasonCode}`,
            shotIndex: idx,
            evidence: { diff: d },
          });
        }
      }
      diffs.push(...(proposeOnly ? localDiffs : validated.length ? validated : localDiffs));
    }
  }

  return {
    healed,
    diffs,
    unsalvageable,
    residual,
    proposedOnly: proposeOnly,
    fingerprint: createHash("sha1").update(JSON.stringify(diffs)).digest("hex").slice(0, 12),
  };
}
