/**
 * Local still pose heuristic — no VLM Key, no Comfy.
 * Reads still image bytes via sharp; never claims hq_ok / visualPass.
 */
import sharp from "sharp";
import type { LocalPoseSignals } from "./literaryPrimaryEffects";

export type LocalStillPoseHeuristicResult = LocalPoseSignals & {
  ok: boolean;
  reason?: string;
  sources: string[];
};

function stripDataUrl(b64: string): string {
  return String(b64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
}

/**
 * Detect hold-card / ground prop / upright; also void/gray studio for trunk scene gate.
 */
export async function analyzeLocalStillPose(input: {
  imageBase64?: string | null;
  imageBuffer?: Buffer | null;
  poseOccupancy?: string | null;
}): Promise<LocalStillPoseHeuristicResult> {
  const sources = ["localStillPoseHeuristic"];
  let buf: Buffer | null = input.imageBuffer ?? null;
  if (!buf) {
    const raw = stripDataUrl(String(input.imageBase64 ?? ""));
    if (!raw) return { ok: false, reason: "no_image", sources };
    try {
      buf = Buffer.from(raw, "base64");
    } catch {
      return { ok: false, reason: "bad_base64", sources };
    }
  }
  try {
    const { data, info } = await sharp(buf)
      .resize(64, 96, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const channels = info.channels || 3;

    const lumAt = (x: number, y: number) => {
      const i = (y * w + x) * channels;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      return (r + g + b) / 3;
    };

    const regionMean = (y0: number, y1: number, x0: number, x1: number) => {
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += lumAt(x, y);
          n++;
        }
      }
      return n ? sum / n : 0;
    };

    const regionStats = (y0: number, y1: number, x0: number, x1: number) => {
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = lumAt(x, y);
          sum += v;
          sumSq += v * v;
          n++;
        }
      }
      const mean = n ? sum / n : 0;
      const variance = n ? sumSq / n - mean * mean : 0;
      return { mean, variance };
    };

    const midUpper = regionMean(Math.floor(h * 0.22), Math.floor(h * 0.55), Math.floor(w * 0.25), Math.floor(w * 0.75));
    const lower = regionMean(Math.floor(h * 0.62), Math.floor(h * 0.92), Math.floor(w * 0.2), Math.floor(w * 0.8));
    const top = regionMean(0, Math.floor(h * 0.2), Math.floor(w * 0.3), Math.floor(w * 0.7));
    const global = regionMean(0, h, 0, w);

    // Background bands (corners + side strips) — hall should have mid-tone structure, not void/gray
    const tl = regionStats(0, Math.floor(h * 0.35), 0, Math.floor(w * 0.28));
    const tr = regionStats(0, Math.floor(h * 0.35), Math.floor(w * 0.72), w);
    const bl = regionStats(Math.floor(h * 0.65), h, 0, Math.floor(w * 0.28));
    const br = regionStats(Math.floor(h * 0.65), h, Math.floor(w * 0.72), w);
    const sideL = regionStats(Math.floor(h * 0.2), Math.floor(h * 0.7), 0, Math.floor(w * 0.18));
    const sideR = regionStats(Math.floor(h * 0.2), Math.floor(h * 0.7), Math.floor(w * 0.82), w);
    const bgMean = (tl.mean + tr.mean + bl.mean + br.mean + sideL.mean + sideR.mean) / 6;
    const bgVar = (tl.variance + tr.variance + bl.variance + br.variance + sideL.variance + sideR.variance) / 6;

    // Near-black / featureless periphery = scene not realized (even if softEnv hung)
    const voidBgSuspected = bgMean < 28 && bgVar < 180;
    // Flat mid/light gray periphery — align with matteNearWhite studio band (~#8c–#f5)
    const grayStudioSuspected =
      !voidBgSuspected &&
      bgMean > 95 &&
      bgMean < 245 &&
      bgVar < 280 &&
      Math.abs(tl.mean - tr.mean) < 22 &&
      Math.abs(bl.mean - br.mean) < 22;
    // SoftEnv hung but output still near-void / featureless dark = scene illegible for trunk
    const sceneIllegibleSuspected = voidBgSuspected || (bgMean < 42 && bgVar < 320);

    const holdCardSuspected =
      (midUpper > global + 22 && midUpper > lower + 8 && midUpper > 95) ||
      (midUpper > lower + 18 && midUpper > 100 && lower < global + 10);
    const groundPropSuspected = lower > midUpper + 8 && lower > global + 18 && lower > 95;
    const uprightTorsoSuspected = top > midUpper - 5 && !groundPropSuspected && midUpper > 100;
    const bendWanted = String(input.poseOccupancy ?? "") === "bend_pickup";
    // groundProp + bendWanted → prefer bend; do not let bend luminance look like kneel
    const kneelSquatSuspected =
      bendWanted &&
      !groundPropSuspected &&
      top < midUpper - 10 &&
      top < global - 2 &&
      midUpper > top + 12 &&
      lower > global;

    let primaryPoseGuess = "unknown";
    if (groundPropSuspected && bendWanted) primaryPoseGuess = "bend_pickup";
    // Hold-card mid-frame ≠ kneel — ladder maps this to stand_hold degrade, not 跪持
    else if (holdCardSuspected && !groundPropSuspected) primaryPoseGuess = "stand_hold";
    else if (kneelSquatSuspected) primaryPoseGuess = "kneel_hold";
    else if (uprightTorsoSuspected) primaryPoseGuess = "stand_hold";

    sources.push(
      `lum:mu=${midUpper.toFixed(0)},lo=${lower.toFixed(0)},top=${top.toFixed(0)},g=${global.toFixed(0)},bg=${bgMean.toFixed(0)},bgVar=${bgVar.toFixed(0)}`,
    );
    if (kneelSquatSuspected) sources.push("kneel_squat_suspected");
    if (holdCardSuspected && !groundPropSuspected) sources.push("hold_card_as_stand");
    if (groundPropSuspected && bendWanted) sources.push("bend_ground_priority");
    if (voidBgSuspected) sources.push("void_bg_suspected");
    if (grayStudioSuspected) sources.push("gray_studio_suspected");
    if (sceneIllegibleSuspected) sources.push("scene_illegible_suspected");
    return {
      ok: true,
      holdCardSuspected,
      groundPropSuspected,
      uprightTorsoSuspected,
      kneelSquatSuspected,
      primaryPoseGuess,
      grayStudioSuspected,
      voidBgSuspected,
      sceneIllegibleSuspected,
      sources,
    };
  } catch (e) {
    return { ok: false, reason: String((e as Error)?.message ?? e), sources };
  }
}
