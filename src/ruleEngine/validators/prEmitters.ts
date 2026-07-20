/**
 * PR-10 / PR-11 / PR-12 detectors → reverse triggers pr_os / pr_prop / pr_spatial.
 */
import type { PrCheckItem } from "./prValidator";
import { flattenDialogueText } from "../design/dialogueCoverage";
import {
  isAllowedTransition,
  isAllowedMotion,
  extractMotionFromPrompt,
  loadCameraMotionWhitelist,
} from "../qualityGate/cameraWhitelist";

type Shot = Record<string, unknown>;

function narr(shot: Shot): Record<string, unknown> {
  return (shot.narrative as Record<string, unknown>) ?? {};
}

function shotDesign(shot: Shot): Record<string, unknown> {
  return (shot.shotDesign as Record<string, unknown>) ?? {};
}

function compositionSpatial(shot: Shot): string {
  const n = narr(shot);
  const fromNarr = n.composition as { foreground?: string; background?: string } | undefined;
  const fromDesign = shotDesign(shot).composition as { foreground?: string; background?: string } | undefined;
  const c = fromNarr ?? fromDesign;
  if (c?.foreground && c?.background) return `fg:${c.foreground}; bg:${c.background}`;
  return "";
}

function resolveSpatial(shot: Shot): string {
  const n = narr(shot);
  const direct = String(n.spatialRelation ?? shot.spatialRelation ?? "").trim();
  if (direct) return direct;
  return compositionSpatial(shot);
}

function countCharCodes(shot: Shot): number {
  const n = narr(shot);
  const codes = new Set<string>();
  for (const p of [shot.charCodes, n.charCodes, n.assetCodes]) {
    if (!Array.isArray(p)) continue;
    for (const c of p) {
      if (typeof c === "string" && /^CHAR-/i.test(c)) codes.add(c.toUpperCase());
    }
  }
  if (codes.size > 0) return codes.size;
  // Legacy: non-empty charCodes without CHAR- prefix still count as identity slots
  for (const p of [shot.charCodes, n.charCodes]) {
    if (Array.isArray(p) && p.length > 0) return p.length;
  }
  return 0;
}

function resolvePerformance(shot: Shot): unknown {
  const n = narr(shot);
  return n.performance ?? shotDesign(shot).performance ?? "";
}

function resolveVideoPrompt(shot: Shot): string {
  const gen = (shot.generation as { videoPrompt?: string } | undefined) ?? {};
  return String(shot.videoPrompt ?? gen.videoPrompt ?? "");
}

/** PR-10: OS / voice consistency — dialogue type vs visible speaker */
export function emitPr10OsVoice(shot: Shot): PrCheckItem | null {
  const n = narr(shot);
  const dialogue = (n.dialogue as { type?: string; lines?: unknown }) ?? {};
  const type = String(dialogue.type ?? n.type ?? "");
  const lines = dialogue.lines;
  const flatLines = flattenDialogueText(lines);
  const hasLines = flatLines.trim().length > 0 || (typeof lines === "string" ? !!lines.trim() : Array.isArray(lines) && lines.length > 0);
  const idx = shot.shotIndex as number | undefined;
  if (!hasLines) return null;
  const performance = resolvePerformance(shot);
  const isOs = /os|画外|off.?screen|voice.?over/i.test(type) || /os|画外/.test(String(performance));
  const hasVisible = countCharCodes(shot) > 0;
  const lipHaystack = `${String(performance)} ${resolveVideoPrompt(shot)}`;
  if (isOs && hasVisible && /口型|lip.?sync|speaking/i.test(lipHaystack)) {
    return {
      ruleId: "PR-10",
      severity: "BLOCK",
      message: `镜 ${idx ?? "?"} OS/画外音不得要求可见角色口型`,
      shotIndex: idx,
    };
  }
  if (!isOs && hasLines && !hasVisible && !/旁白|narrat/i.test(flatLines)) {
    return {
      ruleId: "PR-10",
      severity: "WARN",
      message: `镜 ${idx ?? "?"} 对白镜缺可见说话人（可能应标 OS）`,
      shotIndex: idx,
    };
  }
  return null;
}

/** PR-11: prop state continuity */
export function emitPr11PropState(shot: Shot, prev?: Shot): PrCheckItem | null {
  const n = narr(shot);
  const props = (shot.propCodes ?? n.propCodes ?? n.props) as unknown;
  const propState = String(n.propState ?? shot.propState ?? "");
  const idx = shot.shotIndex as number | undefined;
  if (!props && !propState) return null;
  if (Array.isArray(props) && props.length && !propState && prev) {
    const prevState = String(narr(prev).propState ?? prev.propState ?? "");
    if (prevState && /破|碎|燃|染|湿/.test(prevState)) {
      return {
        ruleId: "PR-11",
        severity: "BLOCK",
        message: `镜 ${idx ?? "?"} 道具状态未继承上一镜「${prevState}」`,
        shotIndex: idx,
      };
    }
  }
  if (/消失|凭空|suddenly gone/i.test(propState) && !/magic|法术|切镜/.test(String(n.notes ?? ""))) {
    return {
      ruleId: "PR-11",
      severity: "WARN",
      message: `镜 ${idx ?? "?"} 道具状态突变缺动机`,
      shotIndex: idx,
    };
  }
  return null;
}

/** PR-12: spatial relation */
export function emitPr12Spatial(shot: Shot): PrCheckItem | null {
  const n = narr(shot);
  const spatial = resolveSpatial(shot);
  const type = String(n.type ?? shot.type ?? "");
  const idx = shot.shotIndex as number | undefined;
  const multiChar = countCharCodes(shot) >= 2;
  if (multiChar && !spatial.trim() && /CHAR-SCENE|双人|对峙|拥抱/.test(type + String(n.shotSize ?? ""))) {
    return {
      ruleId: "PR-12",
      severity: "BLOCK",
      message: `镜 ${idx ?? "?"} 多角色镜缺 spatialRelation`,
      shotIndex: idx,
    };
  }
  if (spatial && /左右互斥|穿模|重叠错误/.test(spatial)) {
    return {
      ruleId: "PR-12",
      severity: "BLOCK",
      message: `镜 ${idx ?? "?"} 空间关系矛盾：${spatial}`,
      shotIndex: idx,
    };
  }
  return null;
}

/** PR-CAM-01: transition + motion must be on camera_motion_whitelist SSOT. */
export function emitPrCam01(shot: Shot): PrCheckItem | null {
  const n = narr(shot);
  const idx = shot.shotIndex as number | undefined;
  const tt = String(n.transitionType ?? "").trim();
  const wl = loadCameraMotionWhitelist();
  if (tt && !isAllowedTransition(tt, wl)) {
    return {
      ruleId: "PR-CAM-01",
      severity: "BLOCK",
      message: `镜 ${idx ?? "?"} 转场非法: ${tt}（应落到白名单如「${wl.defaultTransition}」）`,
      shotIndex: idx,
    };
  }
  const video = resolveVideoPrompt(shot);
  const motion = extractMotionFromPrompt(video) ?? String(shot.camera ?? shot.motion ?? n.camera ?? "").trim();
  if (motion && !isAllowedMotion(motion, wl)) {
    return {
      ruleId: "PR-CAM-01",
      severity: "BLOCK",
      message: `镜 ${idx ?? "?"} 运镜非法: ${motion}（建议 ${wl.defaultMotion}）`,
      shotIndex: idx,
    };
  }
  return null;
}

export function runPrEmitters(shots: Shot[]): PrCheckItem[] {
  const items: PrCheckItem[] = [];
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const prev = i > 0 ? shots[i - 1] : undefined;
    for (const fn of [
      () => emitPr10OsVoice(shot),
      () => emitPr11PropState(shot, prev),
      () => emitPr12Spatial(shot),
      () => emitPrCam01(shot),
    ]) {
      const hit = fn();
      if (hit) items.push(hit);
    }
  }
  return items;
}

export function prRuleToReverseTrigger(ruleId: string): string {
  if (ruleId === "PR-10") return "pr_os_voice";
  if (ruleId === "PR-11") return "pr_prop_state";
  if (ruleId === "PR-12") return "pr_spatial";
  if (ruleId === "PR-09") return "pr_lip_duration";
  if (ruleId === "PR-CAM-01") return "pr_cam_motion";
  return ruleId.toLowerCase().replace(/-/g, "_");
}
