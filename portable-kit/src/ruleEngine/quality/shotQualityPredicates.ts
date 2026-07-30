/**
 * Shot quality predicates — single kernel for designExit / chatAudit / heal / diagnose.
 */
import { checkQp02VisualDescription, checkCut01Adjacent, checkCamXshot, type VisualFinding } from "../bundle/visualQualityAudit";
import { exprHighIntensityThreshold } from "./loadSvqDoctrine";

export type ShotQualityFinding = {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  shotIndex?: number;
  evidence?: Record<string, unknown>;
};

const FACE_WORDS =
  /正脸|侧脸|特写脸|面部|面容|脸庞|面孔|close[- ]?up\s*face|face\s*close|looking\s*at\s*camera|对视|凝视镜头/i;
const EMPTY_SHOT_MARK =
  /空镜|无人物|无人出镜|空景|empty\s*shot|no\s*character|无角色出镜|纯景物/i;
const NAME_LIKE =
  /[\u4e00-\u9fff]{2,4}(?=（|）|\(|\)|，|。|、|咬|刺|望|跪|坐|站|走|跑|哭|笑|说|道|看|握|举)/;

export function hasFaceCue(text: string): boolean {
  return FACE_WORDS.test(text);
}

export function hasEmptyShotMark(text: string): boolean {
  return EMPTY_SHOT_MARK.test(text);
}

export function extractMentionedNames(text: string, knownNames: string[]): string[] {
  const hits = new Set<string>();
  for (const n of knownNames) {
    const name = String(n ?? "").trim();
    if (name.length >= 2 && text.includes(name)) hits.add(name);
  }
  // fallback loose: only if knownNames empty skip invent
  if (!knownNames.length) return [];
  return [...hits];
}

export function checkCastOnDesc(input: {
  visualDescription?: string;
  charCodes?: string[] | null;
  knownNames?: string[];
  nameToCodes?: Record<string, string[]>;
  shotIndex?: number;
}): ShotQualityFinding | null {
  const vd = String(input.visualDescription ?? "").trim();
  if (!vd) return null;
  const known = input.knownNames ?? [];
  const mentioned = extractMentionedNames(vd, known);
  if (!mentioned.length) return null;
  const codes = (input.charCodes ?? []).map(String).filter(Boolean);
  const map = input.nameToCodes ?? {};
  const missing: string[] = [];
  for (const name of mentioned) {
    const expect = map[name] ?? [];
    const ok =
      codes.some((c) => expect.includes(c)) ||
      (expect.length === 0 && codes.length > 0 && mentioned.length === 1);
    // If we have a name map entry, require intersection; if no map but codes empty → fail
    if (expect.length) {
      if (!codes.some((c) => expect.includes(c))) missing.push(name);
    } else if (!codes.length) {
      missing.push(name);
    }
  }
  if (!missing.length) return null;
  return {
    id: "DEX-CAST-ON-DESC",
    severity: "BLOCK",
    message: `镜 ${input.shotIndex ?? "?"} 描写点名「${missing.join("、")}」未进 charCodes`,
    shotIndex: input.shotIndex,
    evidence: { missing, mentioned, charCodes: codes },
  };
}

export function checkEmptyShotConsistency(input: {
  visualDescription?: string;
  charCodes?: string[] | null;
  knownNames?: string[];
  shotIndex?: number;
}): ShotQualityFinding | null {
  const vd = String(input.visualDescription ?? "").trim();
  if (!vd) return null;
  const empty = hasEmptyShotMark(vd);
  const names = extractMentionedNames(vd, input.knownNames ?? []);
  const face = hasFaceCue(vd);
  const codes = (input.charCodes ?? []).filter(Boolean);
  if (empty && (names.length || face || codes.length)) {
    return {
      id: "DEX-EMPTY-SHOT-CONSISTENCY",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} 空镜声明与人名/出脸/charCodes 冲突`,
      shotIndex: input.shotIndex,
      evidence: { empty: true, names, face, charCodes: codes },
    };
  }
  return null;
}

export function checkSpeakPerformance(input: {
  hasDialogue?: boolean;
  emotionIntensity?: number | string | null;
  microExpression?: { eyes?: string; mouthDetail?: string } | null;
  lipSyncPolicy?: string | null;
  shotIndex?: number;
}): ShotQualityFinding | null {
  const hasDlg = Boolean(input.hasDialogue);
  const n = Number(input.emotionIntensity);
  const intensity = Number.isFinite(n) ? n : 0;
  const thr = exprHighIntensityThreshold();
  const needHard = hasDlg && intensity >= thr;
  if (!needHard) return null;
  const micro = input.microExpression;
  const hasMicro = Boolean(micro?.mouthDetail || micro?.eyes);
  const lip = String(input.lipSyncPolicy ?? "").trim();
  if (hasMicro && lip) return null;
  return {
    id: "DEX-EXPR-SPEAK",
    severity: "BLOCK",
    message: `镜 ${input.shotIndex ?? "?"} 高强度对白缺 performance/lipSyncPolicy`,
    shotIndex: input.shotIndex,
    evidence: { intensity, thr, hasMicro, lip },
  };
}

export function checkQp02(input: { visualDescription?: string; shotIndex?: number }): ShotQualityFinding | null {
  const f = checkQp02VisualDescription(input);
  if (!f) return null;
  return {
    id: f.severity === "BLOCK" ? "DEX-QP-02" : "QP-02",
    severity: f.severity,
    message: f.message,
    shotIndex: f.shotIndex ?? input.shotIndex,
    evidence: f.evidence,
  };
}

export function checkCutCamFindings(
  shots: Array<{
    shotIndex?: number;
    sceneName?: string;
    colorTemp?: string;
    propState?: string;
    transitionType?: string;
    motion?: string;
    rhythmZone?: string;
  }>,
): ShotQualityFinding[] {
  const cut = checkCut01Adjacent(shots).map((f) => ({
    ...f,
    id: f.id === "CUT-01" ? "DEX-CUT-01" : f.id === "CAM-XSHOT" ? "DEX-CAM-XSHOT" : f.id,
  }));
  return cut as ShotQualityFinding[];
}

export function stripEmptyShotConflictClauses(vd: string): string {
  const parts = String(vd)
    .split(/[。；;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const kept = parts.filter((p) => !(hasEmptyShotMark(p) && (hasFaceCue(p) || NAME_LIKE.test(p))));
  // Also strip standalone empty marks when remaining text has face/name
  const joined = kept.join("。");
  if ((hasFaceCue(joined) || NAME_LIKE.test(joined)) && hasEmptyShotMark(joined)) {
    return joined
      .replace(EMPTY_SHOT_MARK, "")
      .replace(/[，,]\s*[，,]/g, "，")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return joined || vd;
}

export type { VisualFinding };
