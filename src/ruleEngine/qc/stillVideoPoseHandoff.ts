/**
 * Still pose anchor ↔ video Motion start-state handoff (pre-burn).
 * Prevents "首帧已贴合 + Motion 仍进入" incoherence for all contactEvent classes.
 * Also warns when realization plate (kneel/stand) contradicts Motion bend verbs.
 */
import {
  isContactEventVd,
  matchContactEventVd,
  type ContactStartState,
  inferContactStartStateFromStill,
} from "../compilers/contactEventPolicy";
import { motionContradictsRealization } from "../compilers/realizationAdapt";

export type StillPoseAnchor = {
  prop?: string;
  locus?: string;
  state: ContactStartState;
  source?: "still_meta" | "human_rejudge" | "vlm" | "inferred";
};

export function assertStillVideoPoseHandoff(input: {
  visualDescription?: string | null;
  stillMeta?: Record<string, unknown> | null;
  stillPrompt?: string | null;
  /** Burned / compiled video prompt — G3: gate must read Motion, not only VD */
  videoPrompt?: string | null;
  /** Design-declared start state when present */
  contactStartState?: ContactStartState | null;
}): {
  ok: boolean;
  severity: "ok" | "WARN" | "BLOCK";
  code?: "STILL-VIDEO-POSE-MISMATCH" | "REALIZATION-MOTION-MISMATCH";
  message?: string;
  stillPoseAnchor?: StillPoseAnchor;
  primaryNextStep?: "regen_storyboard_hq" | "human_review" | "chat_repair" | "burn";
} {
  const vd = String(input.visualDescription ?? "").trim();
  const meta = input.stillMeta ?? {};
  const motionBlob = String(input.videoPrompt ?? "");
  const motionSection = motionBlob.match(/\[Motion\]([\s\S]*?)(?=\[Camera\]|$)/i)?.[1] ?? motionBlob;

  const realizationOcc = String(meta.realizationOccupancy ?? "");
  const realizationDegraded = meta.realizationDegraded === true;
  const adaptPack = meta.realizationAdaptPack as
    | import("../compilers/realizationAdapt").RealizationAdaptPack
    | undefined;

  if (
    motionContradictsRealization({
      motionBlob: motionSection,
      realizationOccupancy: realizationOcc as import("../compilers/designIntentProfile").PoseOccupancy,
      realizationDegraded,
      adaptPack: adaptPack ?? null,
    })
  ) {
    return {
      ok: true,
      severity: "WARN",
      code: "REALIZATION-MOTION-MISMATCH",
      message: `姿态债：首帧${realizationOcc || "跪持/站持"}与 Motion 弯腰动词不一致；须重编译 plate-first Motion`,
      primaryNextStep: "burn",
    };
  }

  if (!isContactEventVd(vd)) return { ok: true, severity: "ok" };

  const declared = input.contactStartState ?? null;
  const metaAnchor = meta.stillPoseAnchor as StillPoseAnchor | undefined;
  const inferred = inferContactStartStateFromStill({
    stillPrompt: input.stillPrompt,
    stillMeta: input.stillMeta,
    visualDescription: vd,
  });
  const anchor: StillPoseAnchor = metaAnchor ?? {
    ...inferred,
    source: metaAnchor?.source ?? "inferred",
  };

  const vdImpliesEnter =
    /自.*侧进入|进入贴合|甩至|递向|从.*侧/.test(vd) && !/已贴|贴合停|持稳|微划/.test(vd);
  const motionImpliesEnter =
    /自.*侧进入|进入贴合|甩至|递向|从.*侧/.test(motionBlob) && !/已贴|贴合停|持稳|微划/.test(motionBlob);
  const stillAtLocus = anchor.state === "at_locus" || anchor.state === "held_mid";

  if (stillAtLocus && (vdImpliesEnter || motionImpliesEnter) && declared !== "entering") {
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-VIDEO-POSE-MISMATCH",
      message: motionImpliesEnter
        ? "静帧已贴合，但 Motion/videoPrompt 仍写「进入」；须重编译 at_locus Motion（G3 BLOCK）"
        : "静帧姿态已与接触部位贴合，但设计/运动仍描述「进入」；须重编译 Motion（at_locus 模板）或改 VD（V5-D BLOCK）",
      stillPoseAnchor: anchor,
      primaryNextStep: "chat_repair",
    };
  }

  if (declared && declared !== anchor.state && declared !== "released") {
    const severe = declared === "entering" && stillAtLocus;
    return {
      ok: !severe,
      severity: severe ? "BLOCK" : "WARN",
      code: "STILL-VIDEO-POSE-MISMATCH",
      message: `contactStartState=${declared} 与静帧推断 ${anchor.state} 不一致`,
      stillPoseAnchor: anchor,
      primaryNextStep: severe ? "regen_storyboard_hq" : "human_review",
    };
  }

  return { ok: true, severity: "ok", stillPoseAnchor: anchor };
}
