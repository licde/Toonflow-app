/**
 * Realization ladder — 降方案不降意图.
 * Intent poseOccupancy stays bend_pickup; realizationOccupancy may soft-degrade
 * only on positive counter-evidence (kneel / stand / hold-card). No fail-closed degrade.
 */
import type { PoseOccupancy } from "./designIntentProfile";

export const REALIZATION_LADDER_BEND: PoseOccupancy[] = [
  "bend_pickup",
  "kneel_hold",
  "stand_hold",
];

export type RealizationState = {
  /** Intent seal occupancy — never erased */
  intentOccupancy: PoseOccupancy;
  /** Actual adopted occupancy this take */
  realizationOccupancy: PoseOccupancy;
  realizationDegraded: boolean;
  realizationReason: string;
  ladder: PoseOccupancy[];
};

export type LocalPoseForRealization = {
  primaryPoseGuess?: string | null;
  holdCardSuspected?: boolean | null;
  groundPropSuspected?: boolean | null;
  kneelSquatSuspected?: boolean | null;
  uprightTorsoSuspected?: boolean | null;
  /** Gray / white studio background suspected */
  grayStudioSuspected?: boolean | null;
  /** Near-black / illegible scene periphery */
  voidBgSuspected?: boolean | null;
  sceneIllegibleSuspected?: boolean | null;
  /** Modern school/suit attire suspected */
  modernAttireSuspected?: boolean | null;
};

/**
 * Resolve realization from local pose evidence without clearing intent.
 * bend ok / no counter-evidence → no degrade;
 * kneel/squat → kneel_hold; upright+paper / hold-card → stand_hold.
 */
export function resolveRealizationState(input: {
  intentOccupancy?: PoseOccupancy | null;
  visualDescription?: string | null;
  localSignals?: LocalPoseForRealization | null;
  localHeuristicOk?: boolean | null;
}): RealizationState {
  const vd = String(input.visualDescription ?? "");
  const intent: PoseOccupancy =
    input.intentOccupancy && input.intentOccupancy !== "other"
      ? input.intentOccupancy
      : /弯腰|捡起|捡拾|俯身/.test(vd)
        ? "bend_pickup"
        : "other";
  const ladder =
    intent === "bend_pickup" ? [...REALIZATION_LADDER_BEND] : ([intent] as PoseOccupancy[]);
  const sig = input.localSignals ?? {};
  const guess = String(sig.primaryPoseGuess ?? "");
  const holdCardNoGround =
    sig.holdCardSuspected === true && sig.groundPropSuspected !== true;

  if (intent !== "bend_pickup") {
    return {
      intentOccupancy: intent,
      realizationOccupancy: intent,
      realizationDegraded: false,
      realizationReason: "intent_non_bend",
      ladder,
    };
  }

  // Explicit bend pixel/heuristic evidence
  const bendOk =
    guess === "bend_pickup" &&
    sig.kneelSquatSuspected !== true &&
    !holdCardNoGround &&
    (input.localHeuristicOk === true || input.localHeuristicOk == null);

  if (bendOk) {
    return {
      intentOccupancy: intent,
      realizationOccupancy: "bend_pickup",
      realizationDegraded: false,
      realizationReason: "pose_ground_ok",
      ladder,
    };
  }

  // Positive counter-evidence only — kneel / squat
  if (sig.kneelSquatSuspected === true || guess === "kneel_hold") {
    return {
      intentOccupancy: intent,
      realizationOccupancy: "kneel_hold",
      realizationDegraded: true,
      realizationReason: "degrade_bend_to_kneel_hold",
      ladder,
    };
  }

  // Positive counter-evidence — stand / upright / hold-card without ground prop
  if (guess === "stand_hold" || sig.uprightTorsoSuspected === true || holdCardNoGround) {
    return {
      intentOccupancy: intent,
      realizationOccupancy: "stand_hold",
      realizationDegraded: true,
      realizationReason: holdCardNoGround
        ? "degrade_bend_to_stand_hold_card"
        : "degrade_bend_to_stand_hold_paper",
      ladder,
    };
  }

  // No positive counter-evidence: trust VD/egress intent (achievable bend → no degrade)
  return {
    intentOccupancy: intent,
    realizationOccupancy: "bend_pickup",
    realizationDegraded: false,
    realizationReason: "intent_egress_trusted",
    ladder,
  };
}

/** Trunk burn blockers — identity/scene/paper; not pose. */
export function trunkBurnBlockers(input: {
  localSignals?: LocalPoseForRealization | null;
  propInFrameOk?: boolean | null;
  softEnvHung?: boolean | null;
  droppedSoftEnv?: boolean | null;
  wantsScene?: boolean | null;
}): string[] {
  const blockers: string[] = [];
  const sig = input.localSignals ?? {};
  if (sig.modernAttireSuspected === true) blockers.push("modern_attire");
  if (sig.grayStudioSuspected === true) blockers.push("gray_studio");
  if (sig.voidBgSuspected === true || sig.sceneIllegibleSuspected === true) {
    blockers.push("scene_illegible");
  }
  if (input.propInFrameOk === false) blockers.push("prop_missing");
  if (input.wantsScene && (input.droppedSoftEnv === true || input.softEnvHung === false)) {
    blockers.push("softEnv_missing");
  }
  return blockers;
}

export function realizationDegradedUserNote(r: RealizationState): string {
  if (!r.realizationDegraded) return "";
  const map: Record<string, string> = {
    kneel_hold: "跪持",
    stand_hold: "站姿持纸",
    desk_lean: "伏案",
    bend_pickup: "弯腰捡拾",
    other: "其它占位",
  };
  const from = map[r.intentOccupancy] ?? r.intentOccupancy;
  const to = map[r.realizationOccupancy] ?? r.realizationOccupancy;
  return `实现已降级：${from}→${to}；设计意图仍为弯腰捡拾`;
}
