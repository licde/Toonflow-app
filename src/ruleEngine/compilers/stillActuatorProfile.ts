/**
 * StillActuatorProfile — common-framework executor selection (not shot-specific).
 * High-difficulty contact + softEnv continuity → controllable backend (Comfy).
 * Low difficulty → Seedream multi-ref.
 * Key/VLM is orthogonal and never selects the actuator.
 */
export type StillActuatorId = "seedream_multiref" | "comfy_contact_softenv";

export type PropPlateGrade = "asset" | "fe" | "synthetic_geometry" | "missing";

export type StillActuatorDecision = {
  actuatorId: StillActuatorId;
  reason: string;
  /** True when comfy preferred but unavailable — caller must echo degraded */
  preferComfy: boolean;
};

export function selectStillActuatorProfile(input: {
  objectiveClass?: string | null;
  softEnvContinuity?: "must" | "optional" | "none" | string | null;
  keepSoftEnvRef?: boolean | null;
  /** When false, never prefer Comfy (default HQ = Seedream). */
  allowComfyAccel?: boolean | null;
  visualDescription?: string | null;
}): StillActuatorDecision {
  try {
    const { isOralMicroNotActionPrimary } =
      require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
    if (isOralMicroNotActionPrimary(input.visualDescription)) {
      return {
        actuatorId: "seedream_multiref",
        preferComfy: false,
        reason: "oral_ecu_mouth_seedream_no_comfy_contact",
      };
    }
  } catch {
    /* optional */
  }
  const obj = String(input.objectiveClass ?? "");
  const continuity =
    input.softEnvContinuity === "must" ||
    input.softEnvContinuity === "optional" ||
    input.softEnvContinuity === "none"
      ? input.softEnvContinuity
      : input.keepSoftEnvRef
        ? "must"
        : "none";
  // action_primary / identity_first: Seedream is default HQ — never require Comfy
  if (obj === "action_primary" || obj === "identity_first" || obj === "scene_keep" || obj === "empty_scene") {
    return {
      actuatorId: "seedream_multiref",
      preferComfy: false,
      reason: `objective_${obj || "default"}_seedream_hq`,
    };
  }
  const contactLike = obj === "contact_geom" || obj === "prop_readable";
  const softMust = continuity === "must";
  const allowComfy = input.allowComfyAccel !== false;
  if (contactLike && softMust && allowComfy) {
    return {
      actuatorId: "comfy_contact_softenv",
      preferComfy: true,
      reason: "contact_or_prop_readable+softEnv_must_optional_comfy",
    };
  }
  return {
    actuatorId: "seedream_multiref",
    preferComfy: false,
    reason: contactLike ? `contact_softEnv_${continuity}_seedream` : `objective_${obj || "default"}`,
  };
}

/**
 * Compress literary egress for controllable samplers — keep short pos/neg, SSOT stays in DB.
 * Generic: no shot-name hardcoding.
 */
export function compressStillEgressForActuator(input: {
  prompt: string;
  objectiveClass?: string | null;
  propClassId?: string | null;
  maxPosChars?: number;
  maxNegChars?: number;
  /** Sealed occupancy — never hard-prepend bend for all action_primary */
  poseOccupancy?: string | null;
  primaryIntentSeal?: { poseOccupancy?: string } | null;
  stillPhase?: string | null;
}): { positive: string; negative: string; strippedChars: number } {
  const raw = String(input.prompt ?? "").trim();
  const maxPos = Math.max(120, Number(input.maxPosChars ?? 480));
  const maxNeg = Math.max(80, Number(input.maxNegChars ?? 360));
  const parts = raw
    .split(/[。；;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const negRe =
    /禁止|勿|不要|禁|灰棚|白棚|卷棒|纸卷|书本|册页|卷轴|抵颏|口含|四视图|拼版|手持卡片|捧书/;
  const neg: string[] = [];
  const pos: string[] = [];
  for (const p of parts) {
    if (negRe.test(p)) neg.push(p.replace(/^禁止/, "").trim());
    else pos.push(p);
  }
  // Drop Midjourney-style tokens from sampler body
  const clean = (s: string) =>
    s
      .replace(/--(?:cref|sref|ar)\s+\S+/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  let positive = clean(pos.join("。"));
  // Drop Agnes template crumbs + orphan CU soup on MS/bend
  positive = positive.replace(/,?\s*tag-stack-zh\b/gi, " ").replace(/\s{2,}/g, " ").trim();
  if (/中景|弯腰|捡起|捡拾|俯身|\bMS\b/i.test(`${positive} ${raw}`)) {
    positive = positive
      .replace(/(?:^|[。；，,\s])特写。/g, (m) => m.replace(/特写。/, ""))
      .replace(/^特写[，,。\s]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  // Drop 禁止 clauses that leaked into positive leads
  positive = positive
    .split(/[。；]/)
    .map((s) => s.trim())
    .filter((s) => s && !/禁止|勿|不要/.test(s))
    .join("。");
  let budget = 4;
  try {
    const { getEgressNegBudget } =
      require("./designIntentProfile") as typeof import("./designIntentProfile");
    budget = getEgressNegBudget();
  } catch {
    /* keep */
  }
  const coreNeg = [
    "灰棚白棚",
    "手持卡片挡脸",
    "牛仔夹克等现代衣装",
    "完整次角正脸抢戏",
  ];
  const fromPrompt = neg.map((n) => n.replace(/^禁止/, "").trim()).filter(Boolean);
  const occEarly =
    String(input.poseOccupancy ?? input.primaryIntentSeal?.poseOccupancy ?? "").trim() || null;
  const bendOccEarly = occEarly === "bend_pickup" || /弯腰|捡起|捡拾|俯身/.test(raw);
  let carve: string[] = [];
  if (bendOccEarly) {
    try {
      const { bendNegCarveOut } = require("./stillSealGate") as typeof import("./stillSealGate");
      carve = bendNegCarveOut();
    } catch {
      carve = ["手持卡片挡脸", "跪坐替代弯腰", "蹲跪触地", "盘坐捡纸", "灰棚白棚", "胸前展示卡"];
    }
  }
  // Carve-out negatives always kept for bend; rest fill remaining budget
  const restBudget = Math.max(0, budget - carve.length);
  const negUnique = [
    ...new Set([...carve, ...coreNeg, ...fromPrompt.slice(0, 4)]),
  ].slice(0, carve.length + restBudget);
  let negative = clean(negUnique.join("，"));
  const before = raw.length;
  if (positive.length > maxPos) positive = positive.slice(0, maxPos);
  if (negative.length > maxNeg) negative = negative.slice(0, maxNeg);
  const occ = occEarly;
  const bendOcc = bendOccEarly || /弯腰|捡起|捡拾|俯身/.test(positive);
  // Strip cheek soup from positive before compress leads
  if (bendOcc) {
    try {
      const { assertEgressObeysPrimarySeal } =
        require("./stillSealGate") as typeof import("./stillSealGate");
      const mini = {
        poseOccupancy: (occ === "bend_pickup" ? "bend_pickup" : "bend_pickup") as const,
        gripLocus: [] as import("./designIntentProfile").GripLocusAtom[],
        primarySpatialStems: [] as string[],
        primaryObjective: "action_primary" as const,
        propInHand: true,
        sealHash: "compress",
      };
      positive = assertEgressObeysPrimarySeal({ prompt: positive, seal: mini }).prompt;
    } catch {
      /* optional */
    }
  }
  // bend sealed: never cheek-compress lead even if objective mis-labeled contact_geom
  if (input.objectiveClass === "contact_geom" && !bendOcc) {
    positive = `颊触薄纸角划过触肤瞬间，软环境轮廓保留。${positive}`.slice(0, maxPos);
  } else if (input.objectiveClass === "action_primary" || (bendOcc && input.objectiveClass === "contact_geom")) {
    let occLead = "占位：按文学主姿态入画，道具在主手。";
    try {
      const { occupancyCompressLead } =
        require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
      occLead = occupancyCompressLead(occ as import("./designIntentProfile").PoseOccupancy | null, {
        stillPhase: input.stillPhase ?? null,
      });
    } catch {
      /* keep generic */
    }
    // Prefer sealed occupancy already in positive — only prepend if missing L0 stem
    const hasOcc = /占位：|弯腰|跪坐|伏案|站立持/.test(positive);
    positive = (hasOcc ? positive : `${occLead}${positive}`).slice(0, maxPos);
  } else if (input.objectiveClass === "prop_readable") {
    positive = `本镜道具薄件入画可读，定妆衣装保留。${positive}`.slice(0, maxPos);
  }
  // Gate through seal when present
  try {
    if (input.primaryIntentSeal?.poseOccupancy) {
      const { gatePromptThroughPrimarySeal } =
        require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
      const mini = {
        poseOccupancy: input.primaryIntentSeal.poseOccupancy,
        gripLocus: [] as import("./designIntentProfile").GripLocusAtom[],
        primarySpatialStems: [] as string[],
        primaryObjective: "action_primary" as const,
        propInHand: true,
        sealHash: "compress",
      };
      const gated = gatePromptThroughPrimarySeal({
        prompt: positive,
        seal: mini as import("./primaryIntentSeal").PrimaryIntentCarrierSet,
      });
      positive = gated.prompt.slice(0, maxPos);
    }
  } catch {
    /* optional */
  }
  positive = positive.replace(/\b(cheek contact|bend pick|holding card|grey studio)[^.。]*/gi, "").trim();
  negative = negative.replace(/\b(holding|grey|white seamless|denim|collage)[^.。,]*/gi, "").trim();
  return { positive, negative, strippedChars: Math.max(0, before - positive.length - negative.length) };
}

/**
 * Seedream / degrade path: collapse ban soup into short ZH prompt (SSOT stays in DB).
 * Generic — no shot-name hardcoding.
 */
export function compressStillEgressForSeedream(input: {
  prompt: string;
  objectiveClass?: string | null;
  propClassId?: string | null;
  maxChars?: number;
  poseOccupancy?: string | null;
  primaryIntentSeal?: { poseOccupancy?: string } | null;
  /** Sample Must stems that must survive compress */
  extraMustSurvive?: string[] | null;
  /** Hall softEnv hung / must — scene-first lead, never skirt-only */
  keepSoftEnvRef?: boolean | null;
  softEnvHung?: boolean | null;
  bgSceneMust?: boolean | null;
  stillPhase?: string | null;
}): { prompt: string; strippedChars: number } {
  const raw = String(input.prompt ?? "").trim();
  let defaultMax = 720;
  try {
    const { resolveVendorCapability } =
      require("../design/shootableArchitecture") as typeof import("../design/shootableArchitecture");
    defaultMax = resolveVendorCapability("seedream_multiref").maxPromptChars ?? 720;
  } catch {
    /* keep */
  }
  const max = Math.max(200, Number(input.maxChars ?? defaultMax));
  const occ =
    String(input.poseOccupancy ?? input.primaryIntentSeal?.poseOccupancy ?? "").trim() || null;
  const { positive, negative } = compressStillEgressForActuator({
    prompt: raw,
    objectiveClass: input.objectiveClass,
    propClassId: input.propClassId,
    maxPosChars: Math.floor(max * 0.65),
    maxNegChars: Math.floor(max * 0.35),
    poseOccupancy: occ,
    primaryIntentSeal: input.primaryIntentSeal,
    stillPhase: input.stillPhase,
  });
  const hardNegParts = [
    "手持卡片挡脸",
    "牛仔夹克等现代衣装",
    "灰棚白棚",
    "书本卷轴卷棒抵颏",
  ];
  try {
    const { isOralMicroNotActionPrimary, oralEcuMouthNegatives } =
      require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
    if (isOralMicroNotActionPrimary(raw) || /唇部|咬唇|lip_bite|渗血/.test(raw)) {
      hardNegParts.push(...oralEcuMouthNegatives().split(/[；;，,]/).map((s) => s.trim()).filter(Boolean));
    }
  } catch {
    /* optional */
  }
  let budget = 4;
  try {
    const { getEgressNegBudget } =
      require("./designIntentProfile") as typeof import("./designIntentProfile");
    budget = getEgressNegBudget();
  } catch {
    /* keep */
  }
  const negMerged = [...new Set([...hardNegParts, ...negative.split(/[，,]/).map((s) => s.trim()).filter(Boolean)])]
    .slice(0, budget)
    .join("，");
  let geomLead = "";
  const bendOccSeed =
    occ === "bend_pickup" ||
    String(input.primaryIntentSeal?.poseOccupancy ?? "") === "bend_pickup" ||
    /弯腰|捡起|捡拾|俯身/.test(positive);
  const sceneFirst =
    input.keepSoftEnvRef === true ||
    input.softEnvHung === true ||
    input.bgSceneMust === true ||
    /主场景|禁止灰棚|殿内|软环境/.test(positive);
  if (input.objectiveClass === "contact_geom" && !bendOccSeed) {
    geomLead = "颊触薄纸角划过触肤瞬间，道具入画于触点，定妆上身衣装保留。";
  } else if (input.objectiveClass === "prop_readable" && !bendOccSeed) {
    geomLead = "本镜道具薄件入画于触点，定妆衣装保留。";
  } else if (
    /唇部|咬唇|lip_bite|渗血|口鼻/.test(positive) &&
    !bendOccSeed
  ) {
    geomLead = "唇部/口鼻局部特写占画幅主区，咬唇渗血可读；禁止半身持纸。";
  } else if (
    input.objectiveClass === "action_primary" ||
    bendOccSeed
  ) {
    try {
      const { occupancyCompressLead } =
        require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
      const lead = occupancyCompressLead(
        (bendOccSeed ? "bend_pickup" : occ) as import("./designIntentProfile").PoseOccupancy | null,
        { stillPhase: input.stillPhase ?? null },
      );
      geomLead = sceneFirst
        ? `${lead.replace(/。$/, "")}；背景：主场景殿内浅景深可辨，禁止灰棚白棚；裙摆虚化为加强项。`
        : `${lead.replace(/。$/, "")}；背景仅裙摆碎片虚化。`;
    } catch {
      geomLead = sceneFirst
        ? "占位：按文学主姿态入画，道具在主手；背景：主场景殿内浅景深可辨，禁止灰棚白棚。"
        : "占位：按文学主姿态入画，道具在主手；背景仅裙摆碎片虚化。";
    }
  }
  // Avoid double occupancy lead when positive already has it
  if (geomLead && /占位：/.test(positive)) {
    geomLead = geomLead.replace(/占位：[^。；]+[。；]?/, "").trim();
  }
  let prompt = `${geomLead}${positive}。负向：${negMerged}`
    .replace(/\b(cheek contact|bend pick|holding card|force_compose|delta_hash)[^.。]*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (bendOccSeed) {
    prompt = prompt
      .replace(/蹲身(拾起|捡起|捡拾|捡)/g, "弯腰$1")
      .replace(/跪坐(持|捧|捡|拾)/g, "弯腰捡拾")
      .replace(/盘坐(捡|拾|持)/g, "弯腰捡拾");
  }
  // Scene-first: strip hostile skirt-only bg if softEnv must
  if (sceneFirst) {
    prompt = prompt
      .replace(/背景仅裙摆碎片虚化[。；]?/g, "")
      .replace(/；{2,}/g, "；")
      .trim();
  }
  prompt = protectEgressHeadAfterCompress(prompt, max, {
    bend: bendOccSeed,
    occupancyLead: geomLead || undefined,
    extraMustSurvive: input.extraMustSurvive,
    stillPhase: input.stillPhase,
  });
  try {
    const { guardStillPromptFoundations } =
      require("./stillPromptFoundationGuard") as typeof import("./stillPromptFoundationGuard");
    const guarded = guardStillPromptFoundations({
      prompt,
      originalPrompt: raw,
      visualDescription: raw.slice(0, 200),
      primaryIntentSeal: input.primaryIntentSeal as
        | import("./primaryIntentSeal").PrimaryIntentCarrierSet
        | undefined,
    });
    prompt = protectEgressHeadAfterCompress(guarded.prompt, max, {
      bend: bendOccSeed,
      occupancyLead: geomLead || undefined,
      extraMustSurvive: input.extraMustSurvive,
      stillPhase: input.stillPhase,
    });
  } catch {
    /* optional */
  }
  return { prompt, strippedChars: Math.max(0, raw.length - prompt.length) };
}

/**
 * P2 compress 护头：截断时优先丢负向尾，保留占位/弯腰 L0 起笔；不 throw。
 */
export function protectEgressHeadAfterCompress(
  prompt: string,
  max: number,
  opts?: { bend?: boolean; occupancyLead?: string; extraMustSurvive?: string[] | null },
): string {
  let next = String(prompt ?? "").trim();
  if (!next) return next;
  if (next.length > max) {
    const negAt = next.indexOf("。负向：");
    if (negAt > 40 && negAt < max) {
      // Keep full positive head; truncate negative budget
      next = next.slice(0, max);
    } else {
      // Drop from end — never rotate head away
      next = next.slice(0, max);
    }
  }
  const needBend = Boolean(opts?.bend) || /弯腰|捡拾|捡起/.test(opts?.occupancyLead ?? "");
  if (needBend) {
    // Scrub squat/kneel leak that Seedream latches onto instead of bend_pickup
    next = next
      .replace(/蹲身(拾起|捡起|捡拾|捡)/g, "弯腰$1")
      .replace(/跪坐(持|捧|捡|拾)/g, "弯腰捡拾")
      .replace(/盘坐(捡|拾|持)/g, "弯腰捡拾");
    // Strip hostile cheek head that may have been restored by foundation guard
    next = next
      .replace(/^接触几何：[^。；]{0,80}[。；]?/, "")
      .replace(/^须与.{0,6}贴合\/划过[^。；]{0,40}[。；]?/, "")
      .trim();
    const head = next.slice(0, 36);
    const hasOccHead = /占位：|弯腰|捡拾|跪坐|伏案/.test(head);
    if (!hasOccHead) {
      let lead = String(opts?.occupancyLead ?? "").trim();
      const existing =
        next.match(/占位：[^。；]{2,48}/)?.[0] ??
        next.match(/弯腰捡拾[^。；]{0,24}/)?.[0] ??
        "";
      if (existing) {
        lead = existing;
        next = next.replace(existing, "").replace(/^[。；\s]+/, "");
      } else if (!lead || !/弯腰|捡拾|占位/.test(lead)) {
        try {
          const { occupancyCompressLead } =
            require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
          lead = occupancyCompressLead("bend_pickup", {
            stillPhase: (opts as { stillPhase?: string } | undefined)?.stillPhase ?? null,
          });
        } catch {
          lead = "占位：弯腰捡拾，道具在主手。";
        }
      }
      lead = lead.replace(/。$/, "");
      next = `${lead}。${next}`.replace(/。{2,}/g, "。").trim();
    }
    // L1 mustSurvive: knuckles + ground paper (bend) — skip grip when approaching
    const phaseOpt = String((opts as { stillPhase?: string } | undefined)?.stillPhase ?? "");
    const approachingOpt = phaseOpt === "approaching" || phaseOpt === "mid_contact";
    const mustSurvive: string[] = [];
    if (!approachingOpt && !/指节|捏紧/.test(next)) mustSurvive.push("握持：指尖捏紧指节泛白");
    if (/弯腰|捡拾|捡起|触地/.test(next)) {
      if (approachingOpt) {
        if (!/伸向|接近|尚未捏紧/.test(next.slice(0, 160))) {
          mustSurvive.push("主手伸向纸缘（尚未捏紧）");
        }
      } else if (!/薄纸|近地触地|主手触地|休书薄纸/.test(next.slice(0, 160))) {
        mustSurvive.push("休书薄纸主手近地触地");
      }
    } else if (!/休书|字形|题名|字迹/.test(next) && /休书|婚书|信笺/.test(String(opts?.occupancyLead ?? "") + next)) {
      mustSurvive.push("休书题名可辨");
    }
    for (const stem of opts?.extraMustSurvive ?? []) {
      const s = String(stem ?? "").trim();
      if (s && !next.includes(s.slice(0, Math.min(8, s.length)))) mustSurvive.push(s);
    }
    if (mustSurvive.length) {
      const inject = mustSurvive.join("，");
      const negAt = next.indexOf("。负向：");
      if (negAt > 20) {
        next = `${next.slice(0, negAt)}，${inject}${next.slice(negAt)}`;
      } else {
        next = `${next}，${inject}`;
      }
    }
    if (next.length > max) next = next.slice(0, max);
  }
  return next;
}

export function resolvePropPlateGrade(input: {
  propSource?: string | null;
  synthesizedPropPlate?: boolean | null;
  propPlateMissing?: boolean | null;
}): PropPlateGrade {
  if (input.propPlateMissing) return "missing";
  const src = String(input.propSource ?? "");
  if (src === "asset") return "asset";
  if (src === "fe") return "fe";
  if (input.synthesizedPropPlate || src === "synth") return "synthetic_geometry";
  if (src) return "asset";
  return "missing";
}
