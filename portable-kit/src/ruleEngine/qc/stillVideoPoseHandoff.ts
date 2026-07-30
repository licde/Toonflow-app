/**
 * Still pose anchor ↔ video Motion start-state handoff (pre-burn).
 * Prevents "首帧已贴合 + Motion 仍进入" incoherence for all contactEvent classes.
 */
import {
  isContactEventVd,
  matchContactEventVd,
  type ContactStartState,
  inferContactStartStateFromStill,
} from "../compilers/contactEventPolicy";

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
  /** Design-declared start state when present */
  contactStartState?: ContactStartState | null;
}): {
  ok: boolean;
  severity: "ok" | "WARN" | "BLOCK";
  code?: "STILL-VIDEO-POSE-MISMATCH";
  message?: string;
  stillPoseAnchor?: StillPoseAnchor;
  primaryNextStep?: "regen_storyboard_hq" | "human_review" | "chat_repair";
} {
  const vd = String(input.visualDescription ?? "").trim();
  if (!isContactEventVd(vd)) return { ok: true, severity: "ok" };

  const declared = input.contactStartState ?? null;
  const metaAnchor = input.stillMeta?.stillPoseAnchor as StillPoseAnchor | undefined;
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
  const stillAtLocus = anchor.state === "at_locus" || anchor.state === "held_mid";

  if (stillAtLocus && vdImpliesEnter && declared !== "entering") {
    return {
      ok: false,
      severity: "WARN",
      code: "STILL-VIDEO-POSE-MISMATCH",
      message:
        "静帧姿态已与接触部位贴合，但设计/运动仍描述「进入」；须重编译 Motion（at_locus 模板）或改 VD",
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
