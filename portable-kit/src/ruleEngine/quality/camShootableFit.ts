/**
 * M10 Camera / shootable fit — dual track: auto_adapt vs must-split/edit.
 * Speaks with audioShotLinkage: speak+reaction / contrast → split; aggressive+on-cam → cam_heal.
 */
import type { ChainEgressFinding } from "./shotChainContract";
import { resolveAudioShotLinkage } from "./audioShotLinkage";

const AGGRESSIVE =
  /dolly|orbit|crane|whip\s*pan|急速|环绕|升降|推轨|甩镜|急推|急拉/i;
const ECU = /^(ECU|大特|极特|特写脸)/i;
const MULTI_CAM_INTENT =
  /(推近|急推).{0,12}(摇移|横摇|升降)|(摇移|横摇).{0,12}(升降|环绕)|(推近|急推).{0,12}(升降|环绕)/;

export function auditCamShootableFit(shot: Record<string, unknown>): {
  findings: ChainEgressFinding[];
  healHint?: "clamp_static" | "split";
} {
  const findings: ChainEgressFinding[] = [];
  const vd = String(shot.visualDescription ?? "");
  const cam = String(shot.camera ?? (shot.narrative as { camera?: string })?.camera ?? "");
  const size = String(shot.shotSize ?? (shot.narrative as { shotSize?: string })?.shotSize ?? "");
  const motion = `${cam} ${shot.videoDesc ?? ""}`;
  const link = resolveAudioShotLinkage(shot);

  if (link.mustSplit) {
    return {
      findings: [
        {
          id: "DEX-CAM-FIT",
          severity: "BLOCK",
          message: `镜 ${shot.shotIndex ?? "?"} ${link.reason}`,
          breakAt: link.breakAt === "split" ? "split" : "cam_split",
        },
      ],
      healHint: "split",
    };
  }

  if (MULTI_CAM_INTENT.test(vd) || MULTI_CAM_INTENT.test(motion)) {
    return {
      findings: [
        {
          id: "DEX-CAM-FIT",
          severity: "BLOCK",
          message: `镜 ${shot.shotIndex ?? "?"} 单镜含互斥运镜意图，须智能拆镜`,
          breakAt: "cam_split",
        },
      ],
      healHint: "split",
    };
  }

  if (ECU.test(size) && AGGRESSIVE.test(motion)) {
    findings.push({
      id: "DEX-CAM-FIT",
      severity: "BLOCK",
      message: `镜 ${shot.shotIndex ?? "?"} 特写不宜大场面运镜，须改景别/运镜或 VD`,
      breakAt: "design",
    });
    return { findings };
  }

  if (AGGRESSIVE.test(motion) || (link.preferStatic && AGGRESSIVE.test(motion))) {
    // Observable heal path — not BLOCK; callers may clamp camera=static
    findings.push({
      id: "CAM-SPEAK",
      severity: "WARN",
      message: `镜 ${shot.shotIndex ?? "?"} 猛推运镜可愈夹 static（${link.reason}）`,
      breakAt: "cam_heal",
    });
    return { findings, healHint: "clamp_static" };
  }
  return { findings };
}
