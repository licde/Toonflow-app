/**
 * Produce poseEvidence from VD / egress / optional caller signals (no VLM required).
 * Feeds ACTION_MISFIRE / SPATIAL_LAYOUT untilClear.
 */
export type PoseEvidence = {
  primaryPose?: string;
  secondaryPose?: string;
  faceCuOnly?: boolean;
  source: "heuristic_vd" | "heuristic_egress" | "caller" | "unknown";
};

export function producePoseEvidence(input: {
  visualDescription?: string | null;
  promptUsed?: string | null;
  /** Optional caller override */
  signals?: {
    uprightAtTableSuspected?: boolean;
    kneelSuspected?: boolean;
    bendPickupSuspected?: boolean | null;
    faceCuOnly?: boolean;
  };
}): PoseEvidence {
  if (input.signals?.uprightAtTableSuspected) {
    return { primaryPose: "lean_table", source: "caller", faceCuOnly: input.signals.faceCuOnly };
  }
  if (input.signals?.kneelSuspected) {
    return { primaryPose: "kneel_hold", source: "caller", faceCuOnly: input.signals.faceCuOnly };
  }
  if (input.signals?.bendPickupSuspected === true) {
    return { primaryPose: "bend_pickup", source: "caller", faceCuOnly: input.signals.faceCuOnly };
  }

  const vd = String(input.visualDescription ?? "");
  const prompt = String(input.promptUsed ?? "");
  const blob = `${vd}\n${prompt}`;

  // Target occupancy from literary VD
  const wantsBend = /弯腰|捡起|俯身捡|捡纸/.test(vd);
  // Egress/prompt suggests wrong occupancy vs literary
  if (wantsBend && /伏案|靠桌|倚案/.test(prompt) && !/弯腰|捡起/.test(prompt)) {
    return { primaryPose: "lean_table", source: "heuristic_egress" };
  }
  if (wantsBend && /跪坐|跪地|屈膝跪/.test(prompt) && !/弯腰|捡起/.test(prompt)) {
    return { primaryPose: "kneel_hold", source: "heuristic_egress" };
  }
  if (/伏案|靠桌|倚案/.test(blob) && !wantsBend) {
    return { primaryPose: "desk_lean", source: "heuristic_vd" };
  }
  if (/跪坐|跪地/.test(vd) && !wantsBend) {
    return { primaryPose: "kneel_hold", source: "heuristic_vd" };
  }
  if (wantsBend) {
    return { primaryPose: "bend_pickup", source: "heuristic_vd" };
  }
  if (/站立持|立持|立于/.test(vd)) {
    return { primaryPose: "stand_hold", source: "heuristic_vd" };
  }
  return { primaryPose: "unknown", source: "unknown", faceCuOnly: input.signals?.faceCuOnly };
}

/** Map poseEvidence to stillMeta-friendly shape for untilClear ctx */
export function poseEvidenceForUntilClear(ev: PoseEvidence): {
  primaryPose?: string;
  secondaryPose?: string;
  faceCuOnly?: boolean;
} {
  return {
    primaryPose: ev.primaryPose === "unknown" ? undefined : ev.primaryPose,
    secondaryPose: ev.secondaryPose,
    faceCuOnly: ev.faceCuOnly,
  };
}
