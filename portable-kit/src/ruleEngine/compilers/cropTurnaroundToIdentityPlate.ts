/**
 * Storyboard cref: crop turnaround/四视图 sheet → single identity plate.
 * Full sheets cause vendors to emit multi-panel collage despite text bans.
 *
 * Policy: 四视图可作身份 cref ≠ 成图可出多宫格.
 */
import sharp from "sharp";

export type CropTurnaroundOpts = {
  /**
   * When true (marked turnaround asset or FE character-sheet refs), also crop
   * near-square 2×2 grids to the top-left front plate. Keep false for blind
   * aspect passes so legitimate square cinematic frames are not halved.
   */
  assumeSheet?: boolean;
  /**
   * 3-view strips (front/side/back) often sit ~2.0–2.8 aspect — treat as sheet
   * when assumeSheet (character cref), crop left ~1/3 front plate.
   */
  threeViewStrip?: boolean;
};

export type CropTurnaroundResult = {
  base64: string;
  cropped: boolean;
  reason?: string;
  aspectBefore?: number;
};

/**
 * Crop left/top identity panel from a character turnaround sheet.
 * - aspect ≥ 3 (classic 4:1 four-up): left 1/4
 * - aspect ≥ 2.05 (3-view strip): left 1/3
 * - aspect ≥ 1.55 (large front + sides): left ~38–48%
 * - assumeSheet + aspect 0.9–1.55 (2×2 grid): top-left quadrant
 * - else: pass through
 */
export async function cropTurnaroundSheetToIdentityPlate(
  imageBase64: string,
  opts?: CropTurnaroundOpts,
): Promise<CropTurnaroundResult> {
  const raw = String(imageBase64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  if (!raw) return { base64: "", cropped: false, reason: "empty" };

  try {
    const buf = Buffer.from(raw, "base64");
    const img = sharp(buf);
    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w < 64 || h < 64) {
      return { base64: raw, cropped: false, reason: "too_small", aspectBefore: w / Math.max(1, h) };
    }
    const aspect = w / h;
    let left = 0;
    let top = 0;
    let cropW = 0;
    let cropH = h;
    let reason = "";

    if (aspect >= 3) {
      cropW = Math.max(1, Math.floor(w / 4));
      reason = "four_up_left_quarter";
    } else if (aspect >= 2.05 && opts?.assumeSheet) {
      // 正/侧/背三视图横条（定妆常见）→ 左侧正面格；仅角色 sheet，勿裁场景横图
      cropW = Math.max(1, Math.floor(w / 3));
      reason = "three_view_left_third";
    } else if (aspect >= 1.55) {
      cropW = Math.max(1, Math.floor(w * (opts?.assumeSheet ? 0.38 : 0.48)));
      reason = opts?.assumeSheet ? "hero_left_front_plate" : "hero_left_half";
    } else if (opts?.assumeSheet && aspect >= 0.9 && aspect < 1.55) {
      // Classic 2×2 定妆格（正/侧/背/头）→ 仅留左上正面单帧
      cropW = Math.max(1, Math.floor(w / 2));
      cropH = Math.max(1, Math.floor(h / 2));
      reason = "grid_2x2_top_left";
    } else {
      return { base64: raw, cropped: false, reason: "not_wide_sheet", aspectBefore: aspect };
    }

    const out = await sharp(buf)
      .extract({ left, top, width: cropW, height: cropH })
      .jpeg({ quality: 92 })
      .toBuffer();
    return {
      base64: out.toString("base64"),
      cropped: true,
      reason,
      aspectBefore: aspect,
    };
  } catch (e) {
    return {
      base64: raw,
      cropped: false,
      reason: e instanceof Error ? e.message : "crop_fail",
    };
  }
}

/** True when aspect still looks like multi-panel sheet (should not go to vendor raw). */
export function aspectLooksLikeTurnaroundSheet(aspect: number): boolean {
  if (!Number.isFinite(aspect) || aspect <= 0) return false;
  return aspect >= 1.55 || (aspect >= 0.9 && aspect < 1.55);
}

/**
 * Append short identity-only locks after literary body (never prepend).
 * Prepending drowned VD and produced generic multi-cast scenes.
 */
export function appendSheetIdentityLocks(vendorPrompt: string): string {
  const {
    STILL_SINGLE_FRAME_LOCK_EDIT_ZH,
    STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH,
  } = require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
  const p = String(vendorPrompt ?? "").trim();
  if (/仅借身份|禁复刻多格|单镜头成片/.test(p.slice(-160))) {
    return p;
  }
  return `${p}。${STILL_SHEET_AS_IDENTITY_ONLY_EDIT_ZH}${STILL_SINGLE_FRAME_LOCK_EDIT_ZH}`;
}

/** @deprecated Use appendSheetIdentityLocks — prepend hurts literary primacy. */
export function prependSheetIdentityLocks(vendorPrompt: string): string {
  return appendSheetIdentityLocks(vendorPrompt);
}
