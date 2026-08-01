/**
 * Lit dual-contact XOR → intelligent split (颊触镜 + 口创镜).
 * Homology: import smart-expand (no hard-block) ≡ design expander; mark xorSplit for PROP continuity.
 * Prop seeds use contactEventPolicy vocab — never hardcode 休书.
 */
import { auditLiteraryDetailQuality, hasContactRoleXorSatisfaction } from "../compilers/stillLiteraryDetailQuality";
import {
  cheekContactSeedVd,
  isContactEventVd,
  matchContactEventVd,
  stripContactSweepClauses,
} from "../compilers/contactEventPolicy";
import { recomposeChildrenAfterSplit } from "./recomposeAfterSplit";
import { getEnhancementAutoMin } from "../compilers/stillLiteraryDetailQuality";

export type ExpandLitXorResult = {
  shots: Record<string, unknown>[];
  expandedCount: number;
  refused: number;
  confirmRequired: boolean;
  log: string[];
};

function cloneShot(s: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
}

function isFaceCu(shot: Record<string, unknown>, vd: string): boolean {
  const sz = String(
    shot.shotSize ?? (shot.narrative as { shotSize?: string } | undefined)?.shotSize ?? "",
  );
  return /特写|近景|CU|ecu|extreme\s*close/i.test(sz) || /侧脸|正脸|特写/.test(vd);
}

/** Detect dual-contact XOR debt that prefers split over soft XOR phrase. */
export function needsLitContactXorSplit(shot: Record<string, unknown>): boolean {
  if (shot._litXorSplitId || shot._stillBeatSplitId || shot._visualSplitId || shot.visBeatOverride) {
    return false;
  }
  const vd = String(shot.visualDescription ?? "").trim();
  if (vd.length < 8) return false;
  if (hasContactRoleXorSatisfaction(vd) && !isFaceCu(shot, vd)) return false;
  const a = auditLiteraryDetailQuality({
    visualDescription: vd,
    shotSize: String(shot.shotSize ?? (shot.narrative as { shotSize?: string } | undefined)?.shotSize ?? ""),
  });
  const xor = a.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR" && f.severity === "BLOCK");
  if (!xor) {
    const touch = isContactEventVd(vd) || /划过|贴[在着]?|压[在着]?/.test(vd);
    return isFaceCu(shot, vd) && touch && /咬|渗血|血珠|紧咬/.test(vd);
  }
  return isFaceCu(shot, vd) || xor;
}

function pickWho(vd: string): string {
  const m = vd.match(/([\u4e00-\u9fff]{2,4})(?:侧脸|正脸|特写|紧咬|持|手)/);
  return m?.[1] ?? "";
}

function buildCheekVd(parentVd: string, who: string): string {
  const match = matchContactEventVd(parentVd);
  let vd = parentVd
    .replace(/[，,]?\s*她?紧咬下唇[^。；;]*/g, "")
    .replace(/[，,]?\s*紧咬下唇[^。；;]*/g, "")
    .replace(/[，,]?\s*渗出血珠[^。；;]*/g, "")
    .replace(/[，,]?\s*咬唇[^。；;]*/g, "")
    .replace(/。。+/g, "。")
    .replace(/，+/g, "，")
    .trim();
  if (!/划过|贴|拂过|擦过|抵|压/.test(vd) && (match.isContactEvent || match.propAlias)) {
    vd = cheekContactSeedVd(who, match.isContactEvent ? match : matchContactEventVd(`${match.propAlias || "纸角"}划过面颊`));
  }
  if (!vd.endsWith("。")) vd += "。";
  if (!/纸未入口|互斥|仅颊触/.test(vd)) vd += "纸未入口；仅颊触非口含。";
  return vd.slice(0, 220);
}

function buildOralVd(parentVd: string, who: string): string {
  const match = matchContactEventVd(parentVd);
  let vd = stripContactSweepClauses(parentVd, match)
    .replace(/。。+/g, "。")
    .replace(/，+/g, "，")
    .trim();
  if (!/咬|渗血|血珠/.test(vd)) {
    vd = `${who ? who : "她"}紧咬下唇渗出血珠。`;
  }
  if (!/^特写|近景/.test(vd)) vd = `特写。${vd}`;
  if (!vd.endsWith("。")) vd += "。";
  if (!/无纸|纸不在口|未含纸|互斥/.test(vd)) vd += "口创镜头；纸不在口。";
  return vd.slice(0, 220);
}

/** Split one dual-contact shot → cheek touch + oral wound children. */
export function expandOneLitContactXorShot(shot: Record<string, unknown>): {
  children: Record<string, unknown>[];
  ok: boolean;
  confirmRequired: boolean;
  reason?: string;
  confidence: number;
} {
  if (!needsLitContactXorSplit(shot)) {
    return { children: [shot], ok: false, confirmRequired: false, reason: "no_xor_split", confidence: 0 };
  }
  const parentVd = String(shot.visualDescription ?? "").trim();
  const who = pickWho(parentVd);
  const parentMatch = matchContactEventVd(parentVd);
  const cheekVd = buildCheekVd(parentVd, who);
  const oralVd = buildOralVd(parentVd, who);
  if (cheekVd.length < 8 || oralVd.length < 8 || cheekVd === oralVd) {
    return { children: [shot], ok: false, confirmRequired: true, reason: "split_refuse", confidence: 0.4 };
  }
  const confidence = 0.88;
  const parentId = String(shot.clientId ?? shot.shotIndex ?? `litxor${Date.now()}`);
  const cheek = cloneShot(shot);
  const oral = cloneShot(shot);

  cheek.clientId = `${parentId}__lit_cheek`;
  cheek._litXorSplitId = parentId;
  cheek._stillBeatSplitId = parentId;
  // Continuity stash only — never compose from dual-contact parent body
  cheek._parentVisualDescription = cheekVd;
  cheek._intentGraphParentVd = parentVd;
  cheek.visualSplitRole = "action";
  cheek.beatRole = "action";
  cheek.shotSize = "特写";
  cheek.visualDescription = cheekVd;
  cheek.xorSplit = true;
  if (parentMatch.isContactEvent || parentMatch.propClassId) {
    cheek._contactEventPropClass = parentMatch.propClassId;
    cheek._contactEventPropAlias = parentMatch.propAlias;
    cheek._contactEventMustProp = true;
  }
  cheek.duration = Math.max(2, Number(shot.duration) || 3);
  {
    const gen = { ...((cheek.generation as Record<string, unknown>) ?? {}) };
    delete gen.fxPrompt;
    delete gen.imagePrompt;
    delete gen.videoPrompt;
    delete gen.videoDesc;
    delete gen.compiled;
    delete cheek.fxPrompt;
    cheek.fxFeasibility = "F0";
    cheek.generation = { ...gen, fxFeasibility: "F0" };
  }
  cheek.burnParentForbidden = false;
  cheek.filePath = undefined;
  cheek.stillQuality = undefined;
  cheek.promptState = "stale";
  cheek.videoPass = false;
  cheek.videoStale = true;
  cheek.narrative = {
    ...((cheek.narrative as object) ?? {}),
    shotSize: "特写",
    dialogue: { lines: [] },
  };

  oral.clientId = `${parentId}__lit_oral`;
  oral._litXorSplitId = parentId;
  oral._stillBeatSplitId = parentId;
  oral._parentVisualDescription = oralVd;
  oral._intentGraphParentVd = parentVd;
  oral.visualSplitRole = "reaction";
  oral.beatRole = "reaction";
  oral.shotSize = "特写";
  oral.visualDescription = oralVd;
  oral.xorSplit = true;
  oral.duration = Math.max(2, Number(shot.duration) || 2);
  {
    const gen = { ...((oral.generation as Record<string, unknown>) ?? {}) };
    delete gen.fxPrompt;
    delete gen.imagePrompt;
    delete gen.videoPrompt;
    delete gen.videoDesc;
    delete gen.compiled;
    delete oral.fxPrompt;
    oral.fxFeasibility = "F0";
    oral.generation = { ...gen, fxFeasibility: "F0" };
  }
  oral.burnParentForbidden = true;
  oral.filePath = undefined;
  oral.stillQuality = undefined;
  oral.promptState = "stale";
  oral.videoPass = false;
  oral.videoStale = true;
  oral.narrative = {
    ...((oral.narrative as object) ?? {}),
    shotSize: "特写",
    dialogue: { lines: [] },
  };

  try {
    const { inheritContinuityAlongEdges } =
      require("./splitContinuityInherit") as typeof import("./splitContinuityInherit");
    inheritContinuityAlongEdges({
      shots: [cheek, oral],
      edges: [
        { kind: "xor_mutex", fromShotKey: cheek.clientId as string, toShotKey: oral.clientId as string },
        { kind: "prop_cont", fromShotKey: parentId, toShotKey: cheek.clientId as string },
        { kind: "look_cont", fromShotKey: parentId, toShotKey: cheek.clientId as string },
        { kind: "look_cont", fromShotKey: parentId, toShotKey: oral.clientId as string },
      ],
    });
    // Parent look/codes from original shot
    if (shot.charCodes) {
      cheek.charCodes = shot.charCodes;
      oral.charCodes = shot.charCodes;
    }
    if (shot.sceneCode) {
      cheek.sceneCode = shot.sceneCode;
      oral.sceneCode = shot.sceneCode;
    }
  } catch {
    /* optional */
  }

  return { children: [cheek, oral], ok: true, confirmRequired: false, reason: "lit_xor_split", confidence };
}

export function expandLitContactXor(
  shots: Record<string, unknown>[],
  opts?: { maxExpand?: number; forceExpand?: boolean; chatStrict?: boolean; recompose?: boolean },
): ExpandLitXorResult {
  const maxExpand = opts?.maxExpand ?? 40;
  const autoMin = getEnhancementAutoMin();
  const log: string[] = [];
  const out: Record<string, unknown>[] = [];
  let expandedCount = 0;
  let refused = 0;
  let confirmRequired = false;

  for (const shot of shots) {
    if (!needsLitContactXorSplit(shot)) {
      out.push(shot);
      continue;
    }
    if (expandedCount >= maxExpand) {
      log.push("lit_xor_budget_cap");
      out.push(shot);
      continue;
    }
    const one = expandOneLitContactXorShot(shot);
    const allowAuto = opts?.forceExpand || (!opts?.chatStrict && one.confidence >= autoMin);
    if (!one.ok || one.children.length < 2 || !allowAuto) {
      refused++;
      if (one.confirmRequired || !allowAuto) confirmRequired = true;
      out.push({
        ...shot,
        litXorConfirmRequired: true,
        litXorConfidence: one.confidence,
      });
      log.push(`lit_xor_confirm:shot${shot.shotIndex ?? "?"}:conf=${one.confidence}:${one.reason}`);
      continue;
    }
    out.push(...one.children);
    expandedCount++;
    log.push(`lit_xor_split:shot${shot.shotIndex ?? "?"}->${one.children.length}`);
  }

  let final = out;
  if (expandedCount > 0 && opts?.recompose !== false) {
    try {
      final = recomposeChildrenAfterSplit(out).shots;
    } catch {
      /* optional */
    }
  }
  final = final.map((s, i) => ({ ...s, shotIndex: Number(s.shotIndex) || i + 1 }));

  return { shots: final, expandedCount, refused, confirmRequired, log };
}
