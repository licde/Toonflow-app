/**
 * Design/compose shared gates: multi-beat hand+eye, bare --cref/--sref codes, hand lip policy.
 * Dirty hand+eye SSOT = classifyStillIntent (stillIntentPolicy).
 */
import {
  classifyStillIntent,
  peelContinuityNoise as peelContinuityFromPolicy,
} from "../compilers/stillIntentPolicy";

export const HAND_CU_PATTERN =
  /手部特写|手部特|摩挲.{0,6}扳指|扳指特写|手持|指尖|手腕|袖口/;
/** Explicit hand-CU framing (not mere 摩挲扳指 / 指尖摩挲 action on a mid seating shot). */
const EXPLICIT_HAND_CU = /手部特写|手部特|扳指特写|指尖特写|手腕特写/;
const FACE_CUE =
  /正脸|正脸清晰|正脸可见|正脸朝向|眼神|凝视|面容|面部|冷厉|冰冷犀利|眉|瞳|脸型|微表情|锁定脸型/;
/** Clause-level strip for hand+eye heal (import/export auto). */
const FACE_CLAUSE =
  /[，,]?\s*(?:正脸(?:清晰|可见|朝向镜头)?|眼神[^，。；;\n]{0,12}|凝视[^，。；;\n]{0,8}|面容[^，。；;\n]{0,8}|面部[^，。；;\n]{0,8}|冰冷犀利|冷厉|眉[^，。；;\n]{0,6}|瞳[^，。；;\n]{0,6}|微表情[^，。；;\n]{0,24}|锁定脸型[^，。；;\n]{0,16}|脸型[^，。；;\n]{0,12}|权力位：[^，。；;\n]*正脸[^，。；;\n]*)/g;
const BARE_CREF = /--cref\s+(?:CHAR-[A-Z0-9-]+\s*)+(?![^\s]*\/|https?:)/i;
const BARE_SREF = /--sref\s+(?:SCENE-[A-Za-z0-9-]+\s*)+(?![^\s]*\/|https?:)/i;
const BARE_CREF_RE = /--cref\s+(?:CHAR-[A-Za-z0-9-]+\s*)+/gi;
const BARE_SREF_RE = /--sref\s+(?:SCENE-[A-Za-z0-9-]+\s*)+/gi;
const HAS_URL = /https?:\/\/|\/oss\/|\.(png|jpg|jpeg|webp)(\?|$)/i;

/** Re-export SSOT peel — neighbor continuity must not legislate this shot's framing. */
export function peelContinuityNoise(text: string): string {
  return peelContinuityFromPolicy(text);
}

/**
 * True dirty: explicit hand-CU framing + face cues in same literary beat.
 * Not dirty: mid seating / power with 摩挲扳指 action + recipe 正脸; continuity「扳指特写」noise.
 */
export function isHandEyeMultiBeat(text: string): boolean {
  return classifyStillIntent({ visualDescription: text, promptBlob: text }).dirtyHandEye;
}

export function hasBareCrefCode(text: string): boolean {
  const t = String(text ?? "");
  if (!/--cref/i.test(t)) return false;
  // Allow when any URL/path follows cref block
  if (HAS_URL.test(t) && /--cref[^\n]*(\/oss\/|https?:)/i.test(t)) return false;
  return BARE_CREF.test(t) || /--cref\s+CHAR-/i.test(t);
}

export function hasBareSrefCode(text: string): boolean {
  const t = String(text ?? "");
  if (!/--sref/i.test(t)) return false;
  if (HAS_URL.test(t) && /--sref[^\n]*(\/oss\/|https?:)/i.test(t)) return false;
  return BARE_SREF.test(t) || /--sref\s+SCENE-/i.test(t);
}

export function handShotNeedsNoLip(vd: string, lipSyncPolicy?: string | null): boolean {
  // Only explicit hand-CU framing — seating+摩挲扳指 is not a hand-CU lip violation
  if (!EXPLICIT_HAND_CU.test(String(vd ?? ""))) return false;
  const lip = String(lipSyncPolicy ?? "").toLowerCase();
  if (!lip || lip === "none" || lip === "off" || lip === "os" || lip === "vo") return false;
  return /subtle|natural|active|force|lip/.test(lip);
}

export function stripBareCrefSref(text: string): string {
  return String(text ?? "")
    .replace(BARE_CREF_RE, " ")
    .replace(BARE_SREF_RE, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Prefer hand-CU clauses; drop face cues. Aggressive if still multi-beat. */
export function stripFaceCuesFromHandShot(text: string): string {
  let t = String(text ?? "");
  if (!isHandEyeMultiBeat(t)) return t;
  t = t.replace(FACE_CLAUSE, "").replace(/[，,]{2,}/g, "，").replace(/^[,，\s]+|[,，\s]+$/g, "").trim();
  // Also drop full recipe sentences that inject face on hand CU
  t = t
    .replace(/权力位：[^。；;\n]*正脸[^。；;\n]*/g, "")
    .replace(/微表情[^。；;\n]{0,40}/g, "")
    .replace(/竖屏9:16[^。；;\n]*正脸[^。；;\n]*/g, "")
    .replace(/[。；;]{2,}/g, "。")
    .replace(/^[。；;\s]+|[。；;\s]+$/g, "")
    .trim();
  if (isHandEyeMultiBeat(t)) {
    const parts = t.split(/[，,；;。]/).map((p) => p.trim()).filter(Boolean);
    const handParts = parts.filter((p) => HAND_CU_PATTERN.test(p) && !FACE_CUE.test(p));
    const fallback = parts.filter((p) => HAND_CU_PATTERN.test(p));
    t = (handParts.length ? handParts : fallback).join("，") || t;
  }
  return t;
}

export function normalizeVdKey(vd: string): string {
  return String(vd ?? "")
    .replace(/\s+/g, "")
    .replace(/[，。、；：""''！？]/g, "")
    .slice(0, 80);
}

/** Consecutive identical VD (normalized) streak >= minRun → indices of offenders after first. */
export function findDupVdStreaks(
  shots: { shotIndex?: number; visualDescription?: string }[],
  minRun = 3,
): { shotIndex: number; vdKey: string; run: number }[] {
  const out: { shotIndex: number; vdKey: string; run: number }[] = [];
  let run = 0;
  let prev = "";
  for (const s of shots) {
    const key = normalizeVdKey(String(s.visualDescription ?? ""));
    if (!key || key.length < 6) {
      run = 0;
      prev = "";
      continue;
    }
    if (key === prev) {
      run++;
      if (run >= minRun - 1) {
        out.push({ shotIndex: Number(s.shotIndex) || 0, vdKey: key, run: run + 1 });
      }
    } else {
      prev = key;
      run = 1;
    }
  }
  return out;
}

export type DirtyStillFinding = {
  id: "DEX-DIRTY-STILL-PROMPT" | "DEX-DUP-VD" | "DEX-HAND-LIP";
  shotIndex?: number;
  message: string;
};

export function auditShotDirtyStillPrompt(shot: Record<string, unknown>): DirtyStillFinding[] {
  const findings: DirtyStillFinding[] = [];
  const idx = Number(shot.shotIndex) || undefined;
  const vd = String(shot.visualDescription ?? "");
  const gen = (shot.generation as { imagePrompt?: string } | undefined)?.imagePrompt ?? "";
  const blob = `${vd}\n${gen}`;
  if (isHandEyeMultiBeat(blob)) {
    findings.push({
      id: "DEX-DIRTY-STILL-PROMPT",
      shotIndex: idx,
      message: `镜${idx ?? "?"} 手部特写与眼神/正脸同帧（一镜多拍）`,
    });
  }
  if (hasBareCrefCode(blob)) {
    findings.push({
      id: "DEX-DIRTY-STILL-PROMPT",
      shotIndex: idx,
      message: `镜${idx ?? "?"} 裸 --cref CHAR-*（须定妆 URL/槽，禁止码当图）`,
    });
  }
  if (hasBareSrefCode(blob)) {
    findings.push({
      id: "DEX-DIRTY-STILL-PROMPT",
      shotIndex: idx,
      message: `镜${idx ?? "?"} 裸 --sref SCENE-*（须场景参考 URL/槽）`,
    });
  }
  const lip =
    (shot.shotDesign as { lipSyncPolicy?: string } | undefined)?.lipSyncPolicy ??
    (shot as { lipSyncPolicy?: string }).lipSyncPolicy;
  if (handShotNeedsNoLip(vd, lip)) {
    findings.push({
      id: "DEX-HAND-LIP",
      shotIndex: idx,
      message: `镜${idx ?? "?"} 手/道具特写不应 lipSync=${lip}（改 none/OS）`,
    });
  }
  return findings;
}

export type HealDirtyStillShotResult = {
  touched: boolean;
  ruleIds: ("DEX-DIRTY-STILL-PROMPT" | "DEX-HAND-LIP")[];
  details: string[];
};

/** Mutate one shot in place — high-conf import/export salvage. */
export function healDirtyStillShot(shot: Record<string, unknown>): HealDirtyStillShotResult {
  const ruleIds: HealDirtyStillShotResult["ruleIds"] = [];
  const details: string[] = [];
  let touched = false;
  const idx = shot.shotIndex ?? "?";

  let vd = String(shot.visualDescription ?? "");
  const gen = { ...((shot.generation as object) ?? {}) } as { imagePrompt?: string };
  let ip = String(gen.imagePrompt ?? "");

  const blob0 = `${vd}\n${ip}`;
  if (isHandEyeMultiBeat(blob0)) {
    const nvd = stripFaceCuesFromHandShot(vd);
    const nip = ip ? stripFaceCuesFromHandShot(ip) : ip;
    if (nvd !== vd || nip !== ip) {
      // Prefer keep literary hand clause; never invent twin shots
      shot.visualDescription = nvd || vd;
      if (ip) gen.imagePrompt = nip || ip;
      shot.generation = gen;
      vd = String(shot.visualDescription ?? "");
      ip = String(gen.imagePrompt ?? "");
      touched = true;
      ruleIds.push("DEX-DIRTY-STILL-PROMPT");
      details.push(`stripped face cues shot ${idx}`);
    }
  }

  // Hand CU: strip recipe face inject from composed prompt even if VD already clean
  if (HAND_CU_PATTERN.test(vd) && ip && FACE_CUE.test(ip)) {
    const nip = ip
      .replace(FACE_CLAUSE, "")
      .replace(/权力位：[^。；;\n]*正脸[^。；;\n]*/g, "")
      .replace(/微表情[^。；;\n]{0,40}/g, "")
      .replace(/竖屏9:16[^。；;\n]*正脸[^。；;\n]*/g, "")
      .replace(/必须出现：[^。；;\n]{0,80}/g, "")
      .replace(/[。；;]{2,}/g, "。")
      .replace(/^[。；;\s]+|[。；;\s]+$/g, "")
      .trim();
    if (nip !== ip) {
      gen.imagePrompt = nip || ip;
      shot.generation = gen;
      ip = String(gen.imagePrompt ?? "");
      touched = true;
      if (!ruleIds.includes("DEX-DIRTY-STILL-PROMPT")) ruleIds.push("DEX-DIRTY-STILL-PROMPT");
      details.push(`stripped recipe face from hand-CU prompt shot ${idx}`);
    }
  }

  if (hasBareCrefCode(`${vd}\n${ip}`) || hasBareSrefCode(`${vd}\n${ip}`)) {
    const nvd = stripBareCrefSref(vd);
    const nip = stripBareCrefSref(ip);
    if (nvd !== vd || nip !== ip) {
      shot.visualDescription = nvd;
      if (ip || nip) {
        gen.imagePrompt = nip;
        shot.generation = gen;
      }
      vd = nvd;
      ip = nip;
      touched = true;
      if (!ruleIds.includes("DEX-DIRTY-STILL-PROMPT")) ruleIds.push("DEX-DIRTY-STILL-PROMPT");
      details.push(`stripped bare cref/sref shot ${idx}`);
    }
  }

  const lip =
    (shot.shotDesign as { lipSyncPolicy?: string } | undefined)?.lipSyncPolicy ??
    (shot as { lipSyncPolicy?: string }).lipSyncPolicy;
  if (handShotNeedsNoLip(vd, lip)) {
    // Hand-CU lip→none only when NO on-camera dialogue (else NO-LIP-DIALOGUE)
    let onCam = false;
    try {
      const { hasOnCameraDialogue } =
        require("./onCameraDialogue") as typeof import("./onCameraDialogue");
      const narr = shot.narrative as { dialogue?: { lines?: unknown } } | undefined;
      onCam = hasOnCameraDialogue(narr?.dialogue?.lines);
    } catch {
      onCam = false;
    }
    if (!onCam) {
      shot.shotDesign = { ...((shot.shotDesign as object) ?? {}), lipSyncPolicy: "none" };
      touched = true;
      ruleIds.push("DEX-HAND-LIP");
      details.push(`hand-CU lip→none shot ${idx}`);
    } else {
      details.push(`skip hand-CU lip→none (on-camera dialogue) shot ${idx}`);
    }
  }

  return { touched, ruleIds, details };
}
