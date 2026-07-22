/**
 * Still → video first-frame contract — dirty identity/mouth still must not silently become I2V start.
 * Identity dirty → SB fix visualDescription first, then regen (forbid regen-only fake loop).
 */
import { detectPhantomDualFace } from "../compilers/stillIdentitySsot";

export type StillFirstFrameGateResult = {
  ok: boolean;
  code?: "STILL-FIRSTFRAME-DIRTY" | "STILL-FIRSTFRAME-MISSING" | "STILL-FIRSTFRAME-STALE";
  severity: "ok" | "WARN" | "BLOCK";
  message?: string;
  /** Reverse: SB change desc → stale → regen still (never regen alone) */
  primaryNextStep?: "chat_repair" | "regen_storyboard_hq" | "batch_still";
  reverseTrigger?: "still_firstframe_dirty";
};

/** Detect phantom dual-face / OS-glue / recipe pollution in still prompt used as first frame. */
export function assertStillFirstFrameContract(input: {
  stillPrompt?: string | null;
  stillFilePath?: string | null;
  /** When true, missing still blocks video that needs startImage */
  requireStill?: boolean;
  /** literary desc hash vs meta.literaryDescHash — stale still cannot burn */
  literaryDesc?: string | null;
  literaryDescHashAtCompose?: string | null;
}): StillFirstFrameGateResult {
  const path = String(input.stillFilePath ?? "").trim();
  if (input.requireStill && !path) {
    return {
      ok: false,
      code: "STILL-FIRSTFRAME-MISSING",
      severity: "BLOCK",
      message: "缺少静照首帧，请先出静照再生成视频",
      primaryNextStep: "batch_still",
    };
  }

  const p = String(input.stillPrompt ?? "");
  if (!p.trim() && !input.literaryDesc) {
    return { ok: true, severity: "ok" };
  }

  const desc = String(input.literaryDesc ?? "").trim();
  if (desc && input.literaryDescHashAtCompose) {
    const nowHash = hashLiteraryDesc(desc);
    if (nowHash !== input.literaryDescHashAtCompose) {
      return {
        ok: false,
        code: "STILL-FIRSTFRAME-STALE",
        severity: "BLOCK",
        message: "画面描写已变更，旧静照作废；请改 visualDescription 后重出 HQ 静照再烧视频",
        primaryNextStep: "chat_repair",
        reverseTrigger: "still_firstframe_dirty",
      };
    }
  }

  const phantomDual = detectPhantomDualFace(p);
  const mouthConflict =
    /咬帕|咬唇|刺入/.test(p) && /嘴部自然微张|目光交汇，嘴部/.test(p);

  if (phantomDual || mouthConflict) {
    return {
      ok: false,
      code: "STILL-FIRSTFRAME-DIRTY",
      severity: "BLOCK",
      message: phantomDual
        ? "静照含假双人/不同脸/OS假名，禁止作视频首帧。须先回 SB 改 visualDescription（单拍裸名），再重出静照；禁止只 regen"
        : "静照嘴型指令与描写冲突，禁止作视频首帧；须先改画面描写再重出静照",
      primaryNextStep: "chat_repair",
      reverseTrigger: "still_firstframe_dirty",
    };
  }

  return { ok: true, severity: "ok" };
}

export function hashLiteraryDesc(text: string): string {
  const s = String(text ?? "").replace(/\s+/g, "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
