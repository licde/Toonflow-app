/**
 * Still → video first-frame contract — dirty identity/mouth still must not silently become I2V start.
 * Intent-aligned: seating+扳指 mid is NOT hand-eye dirty →SB; weak still → batch_still.
 */
import { detectPhantomDualFace } from "../compilers/stillIdentitySsot";
import { classifyStillIntent } from "../compilers/stillIntentPolicy";

export type StillFirstFrameGateResult = {
  ok: boolean;
  code?: "STILL-FIRSTFRAME-DIRTY" | "STILL-FIRSTFRAME-MISSING" | "STILL-FIRSTFRAME-STALE" | "STILL-FIRSTFRAME-WEAK";
  severity: "ok" | "WARN" | "BLOCK";
  message?: string;
  /** Reverse: SB change desc → stale → regen still (never regen alone) */
  primaryNextStep?: "chat_repair" | "regen_storyboard_hq" | "batch_still";
  reverseTrigger?: "still_firstframe_dirty" | "still_firstframe_stale" | "still_firstframe_weak" | "dirty_still_prompt";
  intentClass?: string;
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
  /** weak / missing still must never become video first_frame */
  stillQuality?: string | null;
  sheetLeak?: boolean | null;
  /** draft / non-hq still must not burn as first frame */
  qualityMode?: string | null;
}): StillFirstFrameGateResult {
  const path = String(input.stillFilePath ?? "").trim();
  if (input.requireStill && !path) {
    return {
      ok: false,
      code: "STILL-FIRSTFRAME-MISSING",
      severity: "BLOCK",
      message: "缺少静照首帧，请先出静照再生成视频",
      primaryNextStep: "batch_still",
      reverseTrigger: "still_firstframe_weak",
    };
  }

  const sq = String(input.stillQuality ?? "").trim();
  const qm = String(input.qualityMode ?? "").trim().toLowerCase();
  if (qm === "draft") {
    return {
      ok: false,
      code: "STILL-FIRSTFRAME-WEAK",
      severity: "BLOCK",
      message: "草稿静照不可作视频首帧；请 HQ 重出或人审通过后再烧",
      primaryNextStep: "batch_still",
      reverseTrigger: "still_firstframe_weak",
    };
  }
  if (sq === "weak" || sq === "missing" || input.sheetLeak) {
    return {
      ok: false,
      code: "STILL-FIRSTFRAME-WEAK",
      severity: "BLOCK",
      message: input.sheetLeak
        ? "静照为拼版/多格，禁止作视频首帧；请禁拼版重抽高质量单镜头后再烧"
        : "静照未过高质量（weak），禁止作视频首帧；请先 HQ 静照或人审通过后再烧",
      primaryNextStep: "batch_still",
      reverseTrigger: "still_firstframe_weak",
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
        reverseTrigger: "still_firstframe_stale",
      };
    }
  }

  // Same-kernel intent: seating/power mid + 扳指动作 must NOT false-dirty →SB
  // Literary VD only — do not let prompt 站位绑定 soup false-classify seating
  const literaryIntent = classifyStillIntent({
    visualDescription: desc || p,
  });
  const blob = `${desc}\n${p}`;
  const intent = classifyStillIntent({
    visualDescription: desc || p,
    promptBlob: blob,
  });
  if (intent.dirtyHandEye || literaryIntent.dirtyHandEye) {
    return {
      ok: false,
      code: "STILL-FIRSTFRAME-DIRTY",
      severity: "BLOCK",
      message:
        "静照手部特写与正脸/眼神同帧（真脏），禁止作视频首帧。须回 SB 改 VD 为一镜一拍或拆手/脸，再重出静照",
      primaryNextStep: "chat_repair",
      reverseTrigger: "dirty_still_prompt",
      intentClass: literaryIntent.intentClass || intent.intentClass,
    };
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
      intentClass: literaryIntent.intentClass || intent.intentClass,
    };
  }

  // Non-seating literary + seating contract soup in prompt → not burn-ready
  try {
    const { healStillLiteraryEgress } =
      require("../compilers/stillFirstFrameLiterarySsot") as typeof import("../compilers/stillFirstFrameLiterarySsot");
    const litSeating =
      literaryIntent.seating || literaryIntent.intentClass === "seating_power_mid";
    const healed = healStillLiteraryEgress({
      prompt: p,
      visualDescription: desc || p,
      hasSeatingOrKneel: litSeating,
    });
    if (
      !litSeating &&
      (literaryIntent.intentClass === "action_primary_mid" ||
        /动作主体[：:]|弯腰|捡/.test(desc || p)) &&
      healed.issues.some((i) => /seating_bind|seating_layout|grey_void/.test(i))
    ) {
      return {
        ok: false,
        code: "STILL-FIRSTFRAME-DIRTY",
        severity: "BLOCK",
        message:
          "静照提示词含座次绑定/灰棚诱导，与本镜动作描写冲突，禁止作视频首帧；请重出 HQ 单镜头场面后再烧",
        primaryNextStep: "regen_storyboard_hq",
        reverseTrigger: "still_firstframe_dirty",
        intentClass: literaryIntent.intentClass,
      };
    }
  } catch {
    /* optional */
  }

  // Debt-router homology: face-CU dual contact / sheet collage must not burn as first frame
  try {
    const { routeStillDebtAction } =
      require("../compilers/stillDebtActionRouter") as typeof import("../compilers/stillDebtActionRouter");
    const debt = routeStillDebtAction({
      visualDescription: desc || p,
      promptBlob: blob,
      sheetLeak: input.sheetLeak,
    });
    if (debt.kind === "lit_contact_xor" || debt.action === "split_shot") {
      return {
        ok: false,
        code: "STILL-FIRSTFRAME-DIRTY",
        severity: "BLOCK",
        message:
          "静照文学仍含双接触互斥债，禁止作视频首帧；请拆镜（颊触/口创）并重出 HQ 单拍后再烧",
        primaryNextStep: "chat_repair",
        reverseTrigger: "still_firstframe_dirty",
        intentClass: literaryIntent.intentClass || intent.intentClass,
      };
    }
    if (debt.kind === "sheet_layout_leak") {
      return {
        ok: false,
        code: "STILL-FIRSTFRAME-WEAK",
        severity: "BLOCK",
        message: "静照提示词含拼版/四视图布局泄漏，禁止作视频首帧；请禁拼版重抽后再烧",
        primaryNextStep: "regen_storyboard_hq",
        reverseTrigger: "still_firstframe_weak",
        intentClass: literaryIntent.intentClass || intent.intentClass,
      };
    }
  } catch {
    /* optional */
  }

  return { ok: true, severity: "ok", intentClass: literaryIntent.intentClass || intent.intentClass };
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
