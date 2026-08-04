/**
 * Wave-4/7 — screen-side SSOT for 180° axis continuity (keyword + eyeline soft, not CV solver).
 * left/right from spatialRelation / VD; adjacent reverse should flip side / oppose eyeline.
 */
export type ScreenSide = "left" | "right" | "center" | "unknown";

export type EyelineDir = "left" | "right" | "center" | "unknown";

export function parseScreenSide(text?: string | null): ScreenSide {
  const s = String(text ?? "");
  if (!s.trim()) return "unknown";
  const left = /左侧|画面左|左前景|左后方|左站|偏左|screenLeft|left[-\s]?side/i.test(s);
  const right = /右侧|画面右|右前景|右后方|右站|偏右|screenRight|right[-\s]?side/i.test(s);
  if (left && !right) return "left";
  if (right && !left) return "right";
  if (/居中|画面中|正中|center/i.test(s)) return "center";
  if (left && right) return "center";
  return "unknown";
}

/** Soft eyeline / gaze direction from VD / spatial (keyword only). */
export function parseEyelineDir(text?: string | null): EyelineDir {
  const s = String(text ?? "");
  if (!s.trim()) return "unknown";
  const left = /看向左|望向左|视线朝左|朝左看|gazeLeft|look(?:ing)?\s*left/i.test(s);
  const right = /看向右|望向右|视线朝右|朝右看|gazeRight|look(?:ing)?\s*right/i.test(s);
  if (left && !right) return "left";
  if (right && !left) return "right";
  if (/对视|互看|看向镜头|看镜头|直视/.test(s)) return "center";
  // Fallback: screen side often matches subject placement
  const side = parseScreenSide(s);
  if (side === "left" || side === "right" || side === "center") return side;
  return "unknown";
}

export function readShotEyeline(shot: Record<string, unknown> | null | undefined): EyelineDir {
  if (!shot) return "unknown";
  const narr = (shot.narrative as Record<string, unknown> | undefined) ?? {};
  const declared = String(narr.eyelineDir ?? shot.eyelineDir ?? "").toLowerCase();
  if (declared === "left" || declared === "right" || declared === "center") return declared;
  const spatial = String(narr.spatialRelation ?? shot.spatialRelation ?? "");
  const vd = String(shot.visualDescription ?? "");
  return parseEyelineDir(`${spatial} ${vd}`);
}

export function readShotScreenSide(shot: Record<string, unknown> | null | undefined): ScreenSide {
  if (!shot) return "unknown";
  const narr = (shot.narrative as Record<string, unknown> | undefined) ?? {};
  const declared = String(narr.screenSide ?? shot.screenSide ?? "").toLowerCase();
  if (declared === "left" || declared === "right" || declared === "center") return declared;
  const spatial = String(narr.spatialRelation ?? shot.spatialRelation ?? "");
  const vd = String(shot.visualDescription ?? "");
  return parseScreenSide(`${spatial} ${vd}`);
}

/** Stamp narrative.screenSide from spatial text (idempotent). */
export function ensureScreenSideOnShot(shot: Record<string, unknown>): {
  side: ScreenSide;
  changed: boolean;
} {
  const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
  const prev = String(narr.screenSide ?? "");
  const side = readShotScreenSide(shot);
  if (side === "unknown") return { side, changed: false };
  if (prev === side) return { side, changed: false };
  narr.screenSide = side;
  shot.narrative = narr;
  return { side, changed: true };
}

/** Wave-8: stamp narrative.eyelineDir from VD/spatial (idempotent). */
export function ensureEyelineDirOnShot(shot: Record<string, unknown>): {
  dir: EyelineDir;
  changed: boolean;
} {
  const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
  const prev = String(narr.eyelineDir ?? "");
  const dir = readShotEyeline(shot);
  if (dir === "unknown") return { dir, changed: false };
  if (prev === dir) return { dir, changed: false };
  narr.eyelineDir = dir;
  shot.narrative = narr;
  return { dir, changed: true };
}

/**
 * Adjacent same-scene reverse / dialogue pair: sides should flip (A left → B right).
 * Wave-7: also soft-check opposing eyelines on reverse pairs.
 * Wave-12: when keyword side unknown, fall back to face-box center side (soft, not CV).
 * Same side / same eyeline ⇒ axis risk (soft finding, never hard-block).
 */
export function auditAxis180Pair(
  prev: Record<string, unknown> | null | undefined,
  cur: Record<string, unknown> | null | undefined,
): {
  ok: boolean;
  finding?: string;
  prevSide: ScreenSide;
  curSide: ScreenSide;
  prevEyeline?: EyelineDir;
  curEyeline?: EyelineDir;
  sideSource?: "keyword" | "face_box_soft" | "mixed";
} {
  let prevSide = readShotScreenSide(prev);
  let curSide = readShotScreenSide(cur);
  const prevEyeline = readShotEyeline(prev);
  const curEyeline = readShotEyeline(cur);
  let sideSource: "keyword" | "face_box_soft" | "mixed" = "keyword";

  // Wave-12: fill unknown sides from face box soft geometry
  try {
    const { screenSideFromFaceBox, readFaceBoxForAxisSoft } =
      require("./faceBoxAxisSoft") as typeof import("./faceBoxAxisSoft");
    const pb = screenSideFromFaceBox(readFaceBoxForAxisSoft(prev));
    const cb = screenSideFromFaceBox(readFaceBoxForAxisSoft(cur));
    let usedBox = false;
    if (prevSide === "unknown" && pb !== "unknown") {
      prevSide = pb;
      usedBox = true;
    }
    if (curSide === "unknown" && cb !== "unknown") {
      curSide = cb;
      usedBox = true;
    }
    if (usedBox) sideSource = prevSide !== readShotScreenSide(prev) || curSide !== readShotScreenSide(cur) ? "mixed" : "face_box_soft";
    // If both keyword unknown and both box known → pure face_box_soft
    if (
      readShotScreenSide(prev) === "unknown" &&
      readShotScreenSide(cur) === "unknown" &&
      pb !== "unknown" &&
      cb !== "unknown"
    ) {
      sideSource = "face_box_soft";
    }
  } catch {
    /* optional */
  }

  if (!prev || !cur) return { ok: true, prevSide, curSide, prevEyeline, curEyeline, sideSource };
  const pScene = String(prev.sceneCode ?? prev.sceneName ?? "");
  const cScene = String(cur.sceneCode ?? cur.sceneName ?? "");
  if (pScene && cScene && pScene !== cScene) {
    return { ok: true, prevSide, curSide, prevEyeline, curEyeline, sideSource };
  }

  const text = `${String(cur.visualDescription ?? "")} ${String((cur.narrative as { spatialRelation?: string })?.spatialRelation ?? "")}`;
  const prevText = `${String(prev.visualDescription ?? "")} ${String((prev.narrative as { spatialRelation?: string })?.spatialRelation ?? "")}`;
  const reverseLike =
    /过肩|OTS|对切|正反打|反打|对视/.test(text) || /过肩|OTS|对切|正反打|反打|对视/.test(prevText);
  if (!reverseLike && prevSide === "unknown" && curSide === "unknown") {
    return { ok: true, prevSide, curSide, prevEyeline, curEyeline, sideSource };
  }
  if (
    (prevSide === "left" || prevSide === "right") &&
    (curSide === "left" || curSide === "right") &&
    prevSide === curSide &&
    reverseLike
  ) {
    return {
      ok: false,
      finding: sideSource === "face_box_soft" ? "axis180_same_side_face_box" : "axis180_same_side",
      prevSide,
      curSide,
      prevEyeline,
      curEyeline,
      sideSource,
    };
  }
  // Wave-7 soft: reverse pair with declared eyelines both same L/R → axis risk
  if (
    reverseLike &&
    (prevEyeline === "left" || prevEyeline === "right") &&
    (curEyeline === "left" || curEyeline === "right") &&
    prevEyeline === curEyeline
  ) {
    return {
      ok: false,
      finding: "axis180_same_eyeline",
      prevSide,
      curSide,
      prevEyeline,
      curEyeline,
      sideSource,
    };
  }
  return { ok: true, prevSide, curSide, prevEyeline, curEyeline, sideSource };
}

/**
 * Wave-14 — episode/scene axis chain: audit all adjacent pairs.
 * Soft only; never hard-block. Emits pair findings + optional chain rollup.
 */
export function auditAxis180Chain(
  shots: Array<Record<string, unknown> | null | undefined>,
): {
  ok: boolean;
  pairFindings: Array<{
    fromIndex: number;
    toIndex: number;
    finding: string;
    sideSource?: string;
  }>;
  /** ≥2 same-side (or face_box) failures in one scene → chain risk */
  chainFinding?: "axis180_chain_same_side";
  sceneFailCounts: Record<string, number>;
} {
  const pairFindings: Array<{
    fromIndex: number;
    toIndex: number;
    finding: string;
    sideSource?: string;
  }> = [];
  const sceneFailCounts: Record<string, number> = {};
  for (let i = 0; i < shots.length - 1; i++) {
    const a = shots[i];
    const b = shots[i + 1];
    if (!a || !b) continue;
    const axis = auditAxis180Pair(a, b);
    if (!axis.ok && axis.finding) {
      pairFindings.push({
        fromIndex: i,
        toIndex: i + 1,
        finding: axis.finding,
        sideSource: axis.sideSource,
      });
      if (
        axis.finding === "axis180_same_side" ||
        axis.finding === "axis180_same_side_face_box"
      ) {
        const scene = String(b.sceneCode ?? b.sceneName ?? a.sceneCode ?? a.sceneName ?? "_");
        sceneFailCounts[scene] = (sceneFailCounts[scene] ?? 0) + 1;
      }
    }
  }
  let chainFinding: "axis180_chain_same_side" | undefined;
  for (const n of Object.values(sceneFailCounts)) {
    if (n >= 2) {
      chainFinding = "axis180_chain_same_side";
      break;
    }
  }
  return {
    ok: pairFindings.length === 0,
    pairFindings,
    chainFinding,
    sceneFailCounts,
  };
}

/** Suggest flipped spatialRelation keyword for soft heal. */
export function flipSpatialSideKeyword(spatial: string): string {
  const s = String(spatial ?? "");
  if (/左/.test(s) && !/右/.test(s)) return s.replace(/左/g, "右");
  if (/右/.test(s) && !/左/.test(s)) return s.replace(/右/g, "左");
  if (/left/i.test(s) && !/right/i.test(s)) return s.replace(/left/gi, "right");
  if (/right/i.test(s) && !/left/i.test(s)) return s.replace(/right/gi, "left");
  return s;
}

/** Flip eyeline keyword in VD for soft heal. */
export function flipEyelineKeyword(text: string): string {
  const s = String(text ?? "");
  if (/看向左|望向左|朝左看/.test(s)) {
    return s
      .replace(/看向左/g, "看向右")
      .replace(/望向左/g, "望向右")
      .replace(/朝左看/g, "朝右看");
  }
  if (/看向右|望向右|朝右看/.test(s)) {
    return s
      .replace(/看向右/g, "看向左")
      .replace(/望向右/g, "望向左")
      .replace(/朝右看/g, "朝左看");
  }
  return s;
}
