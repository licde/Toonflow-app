/**
 * Visual quality (QP-02) + adjacent-shot continuity (CUT-01) audits.
 */
import type { ScriptBundle } from "../bundle/types";
import { readFixtureJson } from "../utils/fixturesPath";

export type Qp02VisualPolicy = {
  minChars?: number;
  weakLengthHint?: number;
  abstractBanPattern?: string;
  concretePattern?: string;
};

let cachedPolicy: Qp02VisualPolicy | null = null;

export function loadQp02VisualPolicy(): Qp02VisualPolicy {
  if (cachedPolicy) return cachedPolicy;
  cachedPolicy = readFixtureJson<Qp02VisualPolicy>("qp02_visual_policy.json", {
    minChars: 8,
    weakLengthHint: 24,
  });
  return cachedPolicy;
}

export function qp02MinChars(): number {
  return loadQp02VisualPolicy().minChars ?? 8;
}

function abstractBanRe(): RegExp {
  const p = loadQp02VisualPolicy().abstractBanPattern;
  return new RegExp(
    p ||
      "很美|美丽|好看|氛围感|高级感|绝美|震撼|精彩|感人|漂亮|wonderful|beautiful|amazing|cinematic masterpiece",
    "i",
  );
}

function concreteRe(): RegExp {
  const p = loadQp02VisualPolicy().concretePattern;
  return new RegExp(
    p || "手|眼|门|窗|灯|桌|椅|剑|杯|衣|发|光|影|雨|雪|石|墙|台|阶|烛|扇|泪|血|烟|雾|袖|指|膝|肩|廊|院|匾|香|烛火|玉|扳指",
  );
}

export interface VisualFinding {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  shotIndex?: number;
  evidence?: Record<string, unknown>;
}

export function checkQp02VisualDescription(input: {
  visualDescription?: string;
  shotIndex?: number;
}): VisualFinding | null {
  const vd = String(input.visualDescription ?? "").trim();
  const minChars = qp02MinChars();
  if (!vd) {
    return {
      id: "QP-02",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} 画面描述为空`,
      shotIndex: input.shotIndex,
      evidence: { reason: "empty" },
    };
  }
  if (vd.length < minChars) {
    return {
      id: "QP-02",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} 画面描述过短`,
      shotIndex: input.shotIndex,
      evidence: { reason: "too_short", len: vd.length, minChars },
    };
  }
  const abstractHit = abstractBanRe().test(vd);
  const concreteCount = (vd.match(new RegExp(concreteRe().source, "g")) ?? []).length;
  if (abstractHit && concreteCount < 1) {
    return {
      id: "QP-02",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} 画面描述空泛（抽象词且无具体物象）`,
      shotIndex: input.shotIndex,
      evidence: { reason: "abstract", sample: vd.slice(0, 40) },
    };
  }
  const weakLen = loadQp02VisualPolicy().weakLengthHint ?? 24;
  if (abstractHit && concreteCount < 2 && vd.length < weakLen) {
    return {
      id: "QP-02",
      severity: "WARN",
      message: `镜 ${input.shotIndex ?? "?"} 画面偏空泛，建议补具体动作/物件`,
      shotIndex: input.shotIndex,
      evidence: { reason: "weak", concreteCount },
    };
  }
  return null;
}

function motionFamily(raw: string): "static" | "slow" | "push" | "track" | "other" {
  const n = String(raw ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!n || /^(static|固定|静止)/.test(n)) return "static";
  if (/slow\s*(pan|zoom)|subtle\s*drift|gentle/.test(n)) return "slow";
  if (/push|zoom/.test(n)) return "push";
  if (/track|dolly|follow/.test(n)) return "track";
  return "other";
}

/** QM-CAM-XSHOT: abrupt adjacent motion / transition / rhythm jumps. */
export function checkCamXshot(shots: {
  shotIndex?: number;
  motion?: string;
  transitionType?: string;
  rhythmZone?: string;
}[]): VisualFinding[] {
  const out: VisualFinding[] = [];
  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1];
    const b = shots[i];
    const idx = b.shotIndex ?? i + 1;
    const fa = motionFamily(a.motion ?? "");
    const fb = motionFamily(b.motion ?? "");
    const tt = String(b.transitionType ?? "").trim();
    const softCut = !tt || tt === "切" || /^cut$/i.test(tt);
    if (fa !== fb && softCut && (fa === "static" || fa === "slow") && (fb === "push" || fb === "track" || fb === "other")) {
      out.push({
        id: "CAM-XSHOT",
        severity: "WARN",
        message: `镜 ${idx} 运镜突变 ${a.motion || fa}→${b.motion || fb} 且硬切`,
        shotIndex: idx,
        evidence: { from: a.motion, to: b.motion, transitionType: tt || "切" },
      });
    }
    if (/快切|whip|crash/i.test(tt) && /slow\s*(pan|zoom)|static/i.test(String(b.motion ?? ""))) {
      out.push({
        id: "CAM-XSHOT",
        severity: "WARN",
        message: `镜 ${idx} 转场「${tt}」与运镜「${b.motion}」节奏矛盾`,
        shotIndex: idx,
        evidence: { transitionType: tt, motion: b.motion },
      });
    }
    const ra = String(a.rhythmZone ?? "").trim();
    const rb = String(b.rhythmZone ?? "").trim();
    if (ra && rb && ra !== rb && softCut && /impact|hook|peak/i.test(rb) && /hold|calm|body/i.test(ra)) {
      out.push({
        id: "CAM-XSHOT",
        severity: "WARN",
        message: `镜 ${idx} 节奏区 ${ra}→${rb} 突变且硬切`,
        shotIndex: idx,
        evidence: { from: ra, to: rb },
      });
    }
  }
  return out;
}

export function checkCut01Adjacent(shots: {
  shotIndex?: number;
  sceneName?: string;
  colorTemp?: string;
  propState?: string;
  transitionType?: string;
  motion?: string;
  rhythmZone?: string;
}[]): VisualFinding[] {
  const out: VisualFinding[] = [];
  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1];
    const b = shots[i];
    const idx = b.shotIndex ?? i + 1;
    if (a.sceneName && b.sceneName && a.sceneName !== b.sceneName) {
      const t = String(b.transitionType ?? "").trim();
      if (!t || t === "切" || /^cut$/i.test(t)) {
        out.push({
          id: "CUT-01",
          severity: "WARN",
          message: `镜 ${idx} 场景从「${a.sceneName}」跳到「${b.sceneName}」且转场为硬切`,
          shotIndex: idx,
          evidence: { from: a.sceneName, to: b.sceneName, transitionType: t || "切" },
        });
      }
    }
    if (a.colorTemp && b.colorTemp && a.colorTemp !== b.colorTemp) {
      out.push({
        id: "CUT-01",
        severity: "WARN",
        message: `镜 ${idx} 色温跳变 ${a.colorTemp}→${b.colorTemp}`,
        shotIndex: idx,
        evidence: { from: a.colorTemp, to: b.colorTemp, qp: "QP-13" },
      });
    }
    if (a.propState && b.propState && a.propState !== b.propState && !String(b.propState).includes("→")) {
      out.push({
        id: "CUT-01",
        severity: "WARN",
        message: `镜 ${idx} 道具状态瞬移 ${a.propState}→${b.propState}`,
        shotIndex: idx,
        evidence: { from: a.propState, to: b.propState },
      });
    }
  }
  out.push(...checkCamXshot(shots));
  return out;
}

export function auditVisualQuality(bundle: ScriptBundle): VisualFinding[] {
  const shots = bundle.preDesignPack?.shots ?? [];
  const out: VisualFinding[] = [];
  const adj: {
    shotIndex?: number;
    sceneName?: string;
    colorTemp?: string;
    propState?: string;
    transitionType?: string;
    motion?: string;
    rhythmZone?: string;
  }[] = [];

  for (const s of shots) {
    const shot = s as {
      shotIndex?: number;
      visualDescription?: string;
      sceneName?: string;
      videoPrompt?: string;
      camera?: string;
      motion?: string;
      narrative?: {
        sceneName?: string;
        transitionType?: string;
        propState?: string;
        colorTemp?: string;
        rhythmZone?: string;
      };
      colorTemp?: string;
      generation?: { videoPrompt?: string };
    };
    const idx = shot.shotIndex;
    const qp = checkQp02VisualDescription({
      visualDescription: shot.visualDescription,
      shotIndex: idx,
    });
    if (qp) out.push(qp);
    const vp = String(shot.videoPrompt ?? shot.generation?.videoPrompt ?? "");
    const motionMatch = vp.match(/\b(static|slow\s+pan|slow\s+zoom|gentle\s+push|subtle\s+drift|tracking|whip\s+pan)\b/i);
    adj.push({
      shotIndex: idx,
      sceneName: shot.sceneName ?? shot.narrative?.sceneName,
      colorTemp: shot.colorTemp ?? shot.narrative?.colorTemp,
      propState: shot.narrative?.propState,
      transitionType: shot.narrative?.transitionType,
      motion: shot.motion ?? shot.camera ?? motionMatch?.[1],
      rhythmZone: shot.narrative?.rhythmZone,
    });
  }
  out.push(...checkCut01Adjacent(adj));
  return out;
}
