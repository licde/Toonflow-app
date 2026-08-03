/**
 * Wave-4 — screen-side SSOT for 180° axis continuity (keyword geometry, not CV solver).
 * left/right from spatialRelation / VD; adjacent reverse should flip side.
 */
export type ScreenSide = "left" | "right" | "center" | "unknown";

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

/**
 * Adjacent same-scene reverse / dialogue pair: sides should flip (A left → B right).
 * Same side ⇒ axis risk (soft finding, never hard-block).
 */
export function auditAxis180Pair(
  prev: Record<string, unknown> | null | undefined,
  cur: Record<string, unknown> | null | undefined,
): { ok: boolean; finding?: string; prevSide: ScreenSide; curSide: ScreenSide } {
  const prevSide = readShotScreenSide(prev);
  const curSide = readShotScreenSide(cur);
  if (!prev || !cur) return { ok: true, prevSide, curSide };
  const pScene = String(prev.sceneCode ?? prev.sceneName ?? "");
  const cScene = String(cur.sceneCode ?? cur.sceneName ?? "");
  if (pScene && cScene && pScene !== cScene) return { ok: true, prevSide, curSide };

  const text = `${String(cur.visualDescription ?? "")} ${String((cur.narrative as { spatialRelation?: string })?.spatialRelation ?? "")}`;
  const reverseLike = /过肩|OTS|对切|正反打|反打|对视/.test(text);
  if (!reverseLike && prevSide === "unknown" && curSide === "unknown") {
    return { ok: true, prevSide, curSide };
  }
  if (
    (prevSide === "left" || prevSide === "right") &&
    (curSide === "left" || curSide === "right") &&
    prevSide === curSide &&
    reverseLike
  ) {
    return {
      ok: false,
      finding: "axis180_same_side",
      prevSide,
      curSide,
    };
  }
  return { ok: true, prevSide, curSide };
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
